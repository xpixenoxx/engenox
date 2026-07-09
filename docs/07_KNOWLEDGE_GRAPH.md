# 07 — Knowledge Graph Architecture

> **Status: FROZEN.** The implementation of the truth spine's typed bi-temporal graph: the two-tier store (operational Apache AGE → analytical FalkorDB), the bi-temporal storage mechanics, the supersession + anti-fact memory model, the community-summarized GraphRAG that the proposing layer pulls, the memory router that sizes the subgraph, and the RLS-by-tenant isolation that holds the trust floor. Authored against `00_FOUNDATION_INTELLIGENCE_CORE.md`, `06_DOMAIN_MODEL.md`, `08_DATABASE_ARCHITECTURE.md` (forward-ref).

---

## 1. The two-tier graph (why two stores)

The truth spine's queries bifurcate, and the two workloads have different dominant constraints — one store per workload:

| Query class | Examples | Constraint | Store |
|---|---|---|---|
| **Operational / transactional** | "What does ChatGPT believe about {Brand} this week, and which conflicts exist against the SOT?" · "Load the live Brand Card." · "Get the in-flight ActionRecord." | Shallow, multi-hop, ACID-strong, shares the assert-write's transaction | **Apache AGE on the Postgres cluster** (same RLS, same tx) |
| **Analytical / working-set** | GraphRAG community-summary pulls for a thinking cycle · deeply-traversed counterfactual challenge walks · the explanation-rendering provenance fanout across the full assertion history | Read-heavy, multi-hop, low-latency, analytical | **FalkorDB** (graduated when AGE can't keep up) |

**Operational tier — AGE:** every Perception write lands here first under the same Postgres transaction as the assertion's provenance, so the typed assertion and its graph edges are ACID-atomic. Operational reads ("current brand-truth + recent conflicts for this tenant") are shallow and frequent; AGE's openCypher over Postgres with RLS predicate pushdown serves them.

**Analytical tier — FalkorDB:** fed by Debezium CDC from Postgres (the assertion-event bus, see `14_EVENT_ARCHITECTURE.md`); holds the *full* bi-temporal assertion history for deep multi-hop analytical reads the proposing layer and the explanation renderer make. Per-tenant logical namespaces (a shard map) provide isolation since FalkorDB's native multi-tenancy is thinner than Neo4j's (per the infra critique). The graduation from AGE-only to AGE+FalkorDB is scheduled, not improvised (trigger: ~1M assertion nodes OR p99 multi-hop >200ms).

Why not Neo4j Enterprise: its Enterprise Edition (RLS, HA, clustering) is six-figure-expensive at scale and license-lock-in-y. FalkorDB (open-source, Redis-compatible, claims order-of-magnitude faster multi-hop at lower memory than Neo4j) is the 2026 credible challenger. Memgraph is the close fallback (in-memory, GDPR-friendly). Neo4j is the *reserve* if FalkorDB stumbles.

---

## 2. Bi-temporal storage mechanics (the "what was true, when" model)

Every assertion is an `AssertedNode` with two time axes (per `06_DOMAIN_MODEL.md`):

- **`valid_time`** — the interval during which the assertion was true *in the world* (e.g., a `Product.name` true from 2024-03-01 until the brand renamed it 2025-09-15).
- **`tx_time`** — the interval during which Engenox asserted it *internally* (when we wrote it, and when we superseded it).

This separation enables two classes of query that a single-axis store cannot answer:

1. **State-as-of any past T**: *"What did ChatGPT believe about {Brand} on June 1 — before Intervention I landed June 5?"* — a time-sliced Cypher query `WHERE valid_time @> DATE '2023-06-01'`. This is the causal pairing's forensic foundation (the "pre-state" of every corpus row).
2. **Provenance-when queries**: *"When did Engenox first claim this?"* — `WHERE tx_time @> '...'`, the audit trail.

### Storage representation (Postgres + AGE)

The bi-temporal node is materialized in Postgres as:

```
assertion_id (uuid, deterministic hash) | tenant_id | entity_id | predicate | object | 
valid_time_lower | valid_time_upper | tx_time_lower | tx_time_upper | 
provenance_ref | superseded_by | anti_fact_for
```

with a GIST index on `(tenant_id, entity_id, valid_time)` for the time-slice and an openCypher projection in AGE that traverses `Assertion → superseded_by → Assertion` for the living-fact resolution.

### The `assertion_view` library (the only allowed query path)

Hand-written `WHERE valid_time @>` queries are a landmine — engineers will write the wrong window and surface stale/dead facts. The Data-Engineer critique makes this a P1 invariant: **a single, typed, well-tested `assertion_view` library in the shared contract package** with these primitives:

- `living_facts(entity_id, as_of = now())` — the currently-true assertions, supersession-resolved.
- `facts_at(entity_id, valid_at)` — time-sliced state-as-of.
- `conflicts_for(entity_id, as_of)` — the `KnowledgeConflict` set between perception and truth.
- `provenance_tree(assertion_id)` — the full audit fanout back to `AnswerEvent`/`SourceDoc`.
- `trajectory(entity_id, from, to)` — the supersession-DAG traversal (the change history).

**Lint bans hand-written bi-temporal predicates** at the contract-package level; every consumer uses `assertion_view`. A test fixture constructs a supersession-with-anti-fact scenario and asserts the view returns the living fact, not the dead one. This single discipline is what makes the bi-temporal model *operationally* safe rather than academically correct.

---

## 3. The supersession + anti-fact memory model

Corrections are **supersession**, never overwrite. When a brand corrects a field:
- The old assertion's `tx_time_upper` is set to the correction's `tx_time_lower` (it stops being the asserted truth *going forward*, but is retained as history).
- The new assertion is written with `superseded_by = null` (the new living fact).
- The old assertion's `superseded_by` points to the new.
- The `assertion_view.living_facts()` returns only the entity's currently-true assertions.

**Anti-facts (ghost-busting).** Some corrections are *negations* — a prior assertion was not just outdated but *wrong* (a wrong competitor-distorted claim that surfaces believe). Writing only the corrected fact doesn't prevent the wrong one from being re-asserted by a future Extract or re-surfacing via a stale community summary. So the architecture writes an explicit **anti-fact**: an assertion of the form `ASSERTS_NOT(subject, predicate, object, was_originally_asserted_in: prior_assertion_id)`. The Extract seam and the symbolic verifier consult anti-facts before accepting any candidate assertion — a fact re-extracted that matches an anti-fact is rejected (not re-asserted) and flagged as a `CompetitorDistortion` conflict to investigate.

This is the би-temporal discipline's defensive layer: corrections are append-only, *and* revoked facts are actively prevented from resurrection — not just marked inactive.

---

## 4. GraphRAG: the proposing layer's read pattern

The proposing layer (Planner/Critic/Specialist) does not reason over a raw KG dump — that would blow the context budget and lose the signal in the noise. Instead it pulls a **community-summarized subgraph** via GraphRAG:

1. **Community detection** (Leiden/Louvain offline, run nightly per tenant) partitions the tenant's KG into communities: the brand-entity cluster, each competitor cluster, the schema-gap cluster, the citation-authority cluster, etc.
2. **Community summaries** are LLM-generated (the Draft seam, constrained) atomically-described capsules: *"This community describes {Product P} as a {Category}; surfaces cite it via {SourceDoc D1, D2}; competitor C is mentioned on the {Q} query with stance negative in 6 of 8 samples."* These are cached (see §6).
3. **Thinking-cycle pull** = the memory router first loads the *community summaries* relevant to the cycle's goal (cheap, dense), then descends to the underlying nodes *only for the communities the Planner determines it needs* (lazy expansion). This is what bounds the subgraph to the model's effective context length.

The Planner can never assert a fact it cannot dereference to a KG node — every cited claim carries a node pointer the Critic re-checks (the hallucination guard). Community summaries are *annotations* on the graph, not replacements for it; the verifier always re-grounds against the actual nodes.

---

## 5. The memory router (sizing the subgraph vs the context budget)

The router decides *how much* subgraph to pull and *how deep* to traverse, trading GraphRAG depth against the model's effective context length — accounting for **mid-context degradation** (the lost-in-the-middle effect — models pay less attention to the middle of long contexts):

- It pulls community summaries first (dense, cheap) — these occupy the *high-attention* beginning of the context.
- Critical-path facts (the load-bearing conflict, the candidate intervention's predicted-uplift provenance) are pulled *with high salience* and placed at the *high-attention end* of the context.
- The middle of the context holds supporting context (comparators, recent measurements) where degradation is least costly.
- A budget ledger in tokens + probe-cost is maintained per cycle; if the budget is strained, the router prunes the supporting context before the critical path.

This addresses Open Question #7 (the agent deliberation layer's mid-context degradation risk): the router's job is to *engineer the high-attention positions* for the load-bearing facts, not just to fit everything in.

---

## 6. Caching and the GraphRAG community-summary materialization

- **Community summaries** are materialized nightly into a `community_summary` table (Postgres) + cached in Valkey (the hot cache, see `11`-equivalent infra) keyed by `(tenant_id, community_id, summary_version)`.
- **Working-set subgraph pulls** for the thinking cycle are cached per `(tenant_id, goal_signature, KG_version)`; invalidated when the tenant's KG advances (a new assertion or supersession bumps the version).
- **The memory router's chosen-positional layout** is computed per-cycle, not cached (it depends on the model's effective context, which varies by model-id) — but the underlying subgraph the router pulls *is* cached.
- **Cache invalidation** is principled: a `KG_version` per tenant (monotonic, bumped on every assertion write) gates every cache read; stale reads are rejected, not served.

---

## 7. Multi-tenant isolation in the graph store

The Security critique's P0 RLS discipline applies and is the single most important property of the truth spine:

- **Postgres + AGE (operational tier):** `tenant_id` on every assertion row; RLS policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)`; the worker pool sets `app.tenant_id` *inside the same transaction* as the query (RLS evaluates at the query, not the session, when set in-transaction); CI introspects `pg_policies` and fails if any table lacks a policy; no SUPERUSER role in the app pool ever; a periodic canary-row tenancy test asserts no cross-tenant query can read another tenant's data.
- **FalkorDB (analytical tier):** per-tenant logical namespaces (a `(tenant_id → namespace)` shard map); the analytical-service API passes the namespace from the authenticated session; a reconciliation job nightly asserts the analytical-tier tenant isolation by sampling. Postgres RLS does *not* traverse CDC — FalkorDB owns its own tenant filter, and the security audit verifies it.

---

## 8. The graduation (AGE → AGE + FalkorDB)

Graduation is **scheduled, not improvised**:

- **Trigger:** ~1M assertion nodes OR p99 multi-hop > 200ms in the analytical workload (measured continuously).
- **Mechanism:** FalkorDB is stood up alongside AGE; Debezium CDC backfills the full assertion history; a dual-write window where both stores serve analytical reads (with FalkorDB as shadow, validated against AGE for correctness); when the validation passes for N consecutive cycles, analytical-read traffic flips to FalkorDB; AGE handles operational only thereafter.
- **Rollback:** the dual-write window preserves the rollback path — analytical traffic can flip back to AGE on any regression.
- **Operational tier stays on AGE** permanently (it is the ACID-atomic write path; FalkorDB's role is analytical only).

The graduation runbook is a tracked artifact (per the Infrastructure critique P2) with a rehearsed cutover, not an emergency migration.

---

## 9. The non-negotiable invariants (the graph layer)

1. **AGE holds the truth-tx tier; FalkorDB is an analytical mirror.** The commitment to a fact is the AGE write, not the FalkorDB projection. Anything read from FalkorDB is a derived, eventually-consistent projection.
2. **`assertion_view` is the only allowed bi-temporal query path.** Lint-bans hand-written predicates; the library carries the time-slice, supersession-resolution, anti-fact-aware primitives.
3. **Supersession is append-only; corrections write new assertions.** Never overwrite; never delete (until retention-disciplined after ~90 days for verbatim samples; typed assertions retained indefinitely).
4. **Anti-facts prevent resurrection.** Extract + verifier consult anti-facts before accepting any candidate assertion that matches a revoked prior.
5. **Provenance to a re-derivable tree.** Every node → `AnswerEvent`/`SourceDoc`/probe/model-id.
6. **`KG_version` per tenant gates every cache.** Stale reads rejected, not served.
7. **The Planner can never assert a fact it cannot dereference to a KG node.** Every cited claim carries a node pointer the Critic re-checks (hallucination guard).
8. **RLS-by-tenant in AGE; per-tenant namespaces in FalkorDB.** Verified by CI, by the canary-row test, and by the nightly reconciliation job.

---

*End of knowledge graph. Next: `08_DATABASE_ARCHITECTURE.md` — the physical data plane: Postgres (the truth-tx tier + AGE + pgvector), ClickHouse (analytics + corpus mirror), R2 Object-Lock (WORM audit), the three-sinks reconciliation, and the migration/graduation runbooks.*
