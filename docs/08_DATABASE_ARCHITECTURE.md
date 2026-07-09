# 08 — Database Architecture

> **Status: FROZEN.** The physical data plane for the truth spine and the action spine: Postgres (the truth-tx tier + Apache AGE for the operational graph + pgvector for the working-set embeddings), ClickHouse (the analytical/OLAP tier + the corpus analytical mirror), Cloudflare R2 Object-Lock (the WORM immutable audit copy + raw verbatim evidence), and the migration/graduation runbooks (Postgres → Citus; pgvector → Qdrant/Turbopuffer; AGE → FalkorDB). Each store's role, schema-invariant, idempotency contract, and the three-sinks reconciliation that prevents drift. Authored against `00_FOUNDATION_FINAL.md` and `07_KNOWLEDGE_GRAPH.md`.

---

## 1. The four-plane data model

Engenox's data plane separates by *commitment role*, not by access pattern — each plane owns a different kind of truth:

| Plane | Store | Role | Mutability | Isolation |
|---|---|---|---|---|
| **Truth-tx** | Postgres 16 (+ AGE, pgvector) | Authoritative assertions, Brand Card, ActionRecord status, the operational graph | Append-mostly + supersession | RLS by `tenant_id` |
| **Analytics** | ClickHouse | Probe telemetry, multi-sample rollups, lift trajectories, the corpus analytical mirror | Append-mostly (ReplacingMergeTree) | per-tenant partition |
| **WORM audit** | Cloudflare R2 Object-Lock | The immutable signed-corpus copy + raw verbatim answer/page snapshots | Write-once, retention-locked | per-tenant prefix |
| **Hot cache** | Valkey | Session, rate-limit, working scratchpad, probe idempotency keys, community summaries | TTL'd | key-namespaced by tenant |

**Nothing is a source of truth except Postgres.** Everything else is a read replica, an analytics mirror, or an immutable archive fed by CDC with `event_id` idempotency.

---

## 2. Postgres — the truth-tx tier

### Schema-invariants (every table)
- `tenant_id UUID NOT NULL` on every row (RLS key).
- `entity_id UUID` (deterministic hash of `(tenant_id, type, natural_keys)`) on every entity-bearing row.
- `valid_time TSTZRANGE` and `tx_time TSTZRANGE` on every assertion-type row.
- `event_id UUID` (deterministic hash of `(tenant_id, entity_id, fact_id, valid_time, tx_time)`) on every CDC-emitting row — the idempotency key downstream.
- `superseded_by UUID` and `anti_fact_for UUID` on assertions (the supersession + anti-fact model, see `07`).
- GIST index on `(tenant_id, entity_id, valid_time)` for time-slice queries; btree on `(tenant_id, tx_time)` for audit.

### Tables (high-level, full DDL deferred to code-phase per STOP CONDITION)
- `tenants`, `users`, `tenant_memberships` (auth + tenancy; the `tenant_id` is the root of every RLS policy).
- `assertions` (the bi-temporal typed-assertion table — the spine; one row per `(entity, predicate, object, valid_time)`).
- `entities` (the brand+surface entities; `entity_type` discriminator).
- `interventions`, `action_records`, `outcomes` (the action spine; the corpus row's provenance back-pointers live here).
- `conflicts` (the `KnowledgeConflict` nodes).
- `probes`, `answer_events`, `mentions`, `source_docs` (the Perception layer's metadata; the verbatim answers themselves live in R2, only the manifest row in Postgres).
- `brand_card` (the editable Brand-Truth SOT — the user-facing layer over `entities`+`assertions`).
- `autonomy_dial_ledger` (the per-tenant per-surface calibration/approval/overlap history that gates dial escalation — see `12_AGENT_ARCHITECTURE.md`).
- `intervention_features` (the embeddings that make interventions comparable — the standardization asset; pgvector column).
- `community_summaries` (the GraphRAG cache, see `07`).
- `job_state` (Temporal's backend — co-located on the cluster until the Cloud graduation).

### RLS — the single highest-severity discipline
Every table has an RLS policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. **The setting is done inside the same transaction as the query** so RLS evaluates correctly; the worker pool re-runs `set_config('app.tenant_id', $1, true)` at every transaction start; no SUPERUSER role in the app pool; CI introspects `pg_policies` and fails the build if any table lacks a policy; a canary-row tenancy test inserts a known row per tenant and asserts no cross-tenant query sees it. See `15_SECURITY_ARCHITECTURE.md` for the full crypto-key hierarchy (per-tenant DEK envelope-encrypted, KEK HSM-backed).

### Citus graduation
Single-node Postgres scales to ~300 tenants / ~800GB before sharding pain; Citus shards by `tenant_id` with co-located joins (multi-tenant queries go to ClickHouse, not cross-shard). Graduation trigger + runbook per Infrastructure critique P2.

### Replication
- Primary + 2 replicas (sync for the truth-tx tier; the cross-region replica is the DR target).
- Debezium logical-decoding → Redpanda → (ClickHouse, FalkorDB, Qdrant, R2 manifest).
- PITR (point-in-time recovery) via WAL archiving to R2.

---

## 3. ClickHouse — the analytical/corpus-mirror tier

### Role
All probe telemetry, multi-sample rollups, lift-trajectory time series, EWMA/CUSUM degradation-control charts, foreign-change-tagged window aggregates, and the **CIO corpus's analytical mirror** (sufficient statistics for the causal estimator). Not a source of truth — a derived projection of Postgres + the per-sample telemetry.

### Schema shape (MergeTree family)
- `probe_samples` (per `(tenant, probe, query, surface, sample_idx)` row; the granular telemetry) — MergeTree, partitioned by `toYYYYMM(captured_at)`, ordered by `(tenant_id, surface, query)`.
- `surface_assertions` (the multi-sample aggregated weekly belief) — ReplacingMergeTree with `version = aggregation_version`, ordered by `(tenant_id, entity_id, surface, week)`.
- `measurement_windows` (the lagged outcome telemetry for the corpus) — ordered by `(tenant_id, intervention_id, window_id)`.
- `corpus_analytics` (the aggregate sufficient-statistics mirror — counts, sums, uplift TI per `(intervention_type, entity_type, surface, context_signature)` — the estimator's batch-read table) — ordered by the cluster key.
- `foreign_change_events` (the EWMA/CUSUM residual anomalies that flag platform bumps) — ordered by `(surface, ts)`.

### Ingest (the Kafka-engine table pattern)
Verbatim probe samples arrive via Redpanda; a ClickHouse `Kafka` engine table consumes with batched flushes (per the Performance critique — avoid MergeTree part-merge thrash); `materialized views` downsample verbatim samples to distributions after ~90 days (the "principled forgetting" — the raw sample goes to R2 Object-Lock before the ClickHouse row downgrades to a distribution).

### The corpus's two lives
- **Postgres** holds the *canonical signed* corpus row (the authority — the immutable provenance pointer + the integrity tags).
- **ClickHouse** holds the *analytical mirror* (the sufficient statistics the estimator reads in batch). The two are reconciled nightly by sampling on `event_id` (the three-sinks reconciliation, see §5).

### Why ClickHouse over Postgres for this
10–100x scan throughput for the closed loop's continuous self-query; MergeTree's ordered-partition reads make the EWMA/CUSUM scans cheap; columnar compression fits multi-billion-row telemetry. Postgres under this load would drown.

---

## 4. R2 Object-Lock — the WORM audit tier

### Role
The immutable, tamper-evident copy of (a) the signed CIO corpus rows, (b) every raw verbatim probe answer, (c) every crawled page snapshot, (d) the signed manifests of executed interventions, (e) the audit log. This is the corpus-as-asset's *survives-architecture-turnover* property — the institutional memory.

### Configuration (must be set at bucket creation — retrofit is painful)
- **Object-Lock in Compliance mode** — once written, an object cannot be overwritten or deleted until its retention period elapses (per-row retention varies: corpus rows = indefinite/legal-hold; verbatim samples = per-tenant-configurable 1–7 years; audit log = regulatory minimum).
- **Versioning enabled** (mandatory for Object-Lock).
- **Per-tenant prefix** (`s3://engenox-corpus/{tenant_id}/...`) for isolation + per-tenant retention overrides.
- **Free egress** — R2's defining economic advantage; the closed loop re-reads archived samples continuously (the synthetic-control donor pool, the coverage diagnostic), so egress costs would dominate on S3 but are near-zero on R2.

### The corpus row's signed object
Every corpus row appends to `s3://engenox-corpus/{tenant_id}/corpus/{event_id}.json` containing the full `(intervention, context, outcome, counterfactual, ID-strategy, foreign-change-status, consent)` tuple + the signer-of-record signature + the manifest of the executed intervention. The Postgres corpus row carries only a pointer to this object (the `corpus_object_url` + the `signature`). **A clone of the Postgres database without the per-tenant KEK is unintelligible; a clone of R2 without the SigV4 + the per-tenant signature key is unverifiable.**

### Restore test (QA critique P1)
A quarterly job restores last week's corpus from R2 Object-Lock, replays the signatures, and verifies against the Postgres manifest. The audit promise is unverified until restored — this test is the verification.

---

## 5. The three-sinks reconciliation (Data-Engineer P1)

CDC fans Postgres out to three sinks (ClickHouse, FalkorDB, Qdrant). Each sink has its own idempotency model, so the corpus can drift silently. The reconciliation discipline:

1. **The assertion envelope carries `event_id`** (deterministic hash) and **every sink is `INSERT … ON CONFLICT (event_id) DO NOTHING`** — exactly-once at each sink.
2. **A nightly reconciliation job** samples N assertions from Postgres, fetches each from ClickHouse/FalkorDB/Qdrant, and asserts they agree (the assertion content + the integrity tags + the provenance). Any drift triggers an alert + a targeted replay from the Redpanda topic.
3. **A byte-count checksum** per tenant per day (the count of `event_id`s in Postgres vs each sink) catches dropped events even when content agrees.
4. **The corpus is dual-canonical**: Postgres (the tx authority) + R2 Object-Lock (the immutable authority). The other sinks are derived mirrors; if ClickHouse burns down, it's rebuildable from R2 + Redpanda replay.

---

## 6. Valkey — the hot cache tier

### Role
Session, rate-limit counters, the per-tenant working scratchpad hot-subset, probe idempotency keys, and the GraphRAG community-summary cache. Valkey (the Linux-Foundation Redis-SSPL fork — the 2026 OSS choice that avoids the Redis license risk) on a small node.

### Keys
- `rate:{tenant}:{surface}:{minute}` — token-bucket counters (weighted-fair probe throttling).
- `scratch:{tenant}:{cycle}` — the working-set subgraph pulled by the memory router (TTL'd to the cycle window).
- `idem:{tenant}:{activity}:{idempotency_key}` — the Temporal external-side-effect idempotency keys (see `12`).
- `summary:{tenant}:{community_id}:{version}` — the GraphRAG community-summary cache, gated by `KG_version`.

### RLS-equivalence
Keys are namespaced by `tenant_id`; the cache-service API rejects any key access whose `tenant_id` doesn't match the authenticated session.

---

## 7. Migration & graduation runbooks (the three concurrent graduations the Infra critique warns of)

Every graduation is scheduled with a trigger, a duel-write window, a validation, a cutover, and a rollback:

| Graduation | Trigger | Duel-write window | Cutover | Rollback |
|---|---|---|---|---|
| **PG → Citus** | ~300 tenants / ~800GB | Citus stands up; CDC backfills; reads shadow against Citus | Cross-tenant reads move to Citus when N cycles validate | Flip back to single-PG; Citus kept as replica until stable |
| **pgvector → Qdrant/Turbopuffer** | ~10M vectors OR HNSW build > 30% of write path | Qdrant/Turbopuffer stands up; index rebuilt from Postgres; reads shadowed | Working-set retrievals move to Qdrant; pgvector retained for the very-hot path during the duel-write | Flip back to pgvector (re-index cost is the implicit rollback tax) |
| **AGE → AGE + FalkorDB** | ~1M assertion nodes OR p99 multi-hop >200ms | FalkorDB stands up; Debezium backfills full assertion history; analytical reads shadowed | Analytical reads flip to FalkorDB; AGE operational-only | Flip back to AGE; FalkorDB kept as analytical shadow |

The discipline: *only one graduation runs at a time per cohort; each has a rehearsed cutover; the duel-write window is the safety net.*

---

## 8. The non-negotiable invariants (the database layer)

1. **Postgres is the truth-tx tier; everything else is derived.** No sink writes a commitment.
2. **RLS-by-`tenant_id` on every table; set in-transaction; CI-introspected; canary-row tested; no SUPERUSER app pool.**
3. **Bi-temporality (`valid_time`, `tx_time`) on every assertion; `assertion_view` is the only query path.**
4. **`event_id` idempotency at every sink; nightly three-sinks reconciliation.**
5. **The corpus is dual-canonical: Postgres (authority) + R2 Object-Lock (immutable).**
6. **R2 Object-Lock in Compliance mode + versioning + per-tenant retention; restore-tested quarterly.**
7. **Verbatim samples downsample to distributions at ~90 days in ClickHouse; the raw is retained in R2 per the regulated tier's retention.**
8. **Citus/pgvector/FalkorDB graduations are scheduled with triggers + duel-write + rollback; never improvised.**

---

*End of database architecture. Next: `09_BACKEND_ARCHITECTURE.md` — the polyglot-but-layered backend service topology, the Temporal workflow spine, the six bounded LLM seams, and the cross-service contract discipline.*
