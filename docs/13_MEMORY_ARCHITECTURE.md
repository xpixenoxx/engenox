# 13 — Memory Architecture

> **Status: FROZEN.** The retrieval-layer memory: stratified by commitment role across five tiers (hot working-set → operational KG → analytical KG → episodic trajectory → the CIO corpus), the bi-temporal supersession/anti-fact model that forbids destructive updates, the memory router that sizes GraphRAG pulls against the mid-context degradation threshold, the three forgetting regimes (principled-forgetting verbatim samples, superseded-but-never-deleted assertions, append-only-immortal corpus), and the consented human-query panel's build sequence. Authored against `00_FOUNDATION_INTELLIGENCE_CORE.md` (how it remembers + the 6 moats), `07_KNOWLEDGE_GRAPH.md`, `08_DATABASE_ARCHITECTURE.md`, and `11_AI_ARCHITECTURE.md`. **Memory is the spine's persistence; an LLM re-derives from it per call. It is not agent scratchpad.**

---

## 1. The single rule

**Memory is stratified by commitment role, and nothing the LLM produces persists as memory until a symbolic verifier re-grounds it against the KG.** The agent is stateless per call; memory lives in five tiers, each owning a different retention horizon + a different write authority. The agent never reads memory "as a conversation"; it reads *typed views* — `assertion_view`, `trajectory_view`, `working_set`, `community_summary` — produced by the memory router per cycle.

This section defines the tiers, the router, the forgetting regimes, and the consented panel.

---

## 2. The five memory tiers

| Tier | Store | Holds | Retention | Write authority |
|---|---|---|---|---|
| **Hot working-set** | Valkey (`scratch:{tenant}:{cycle}`) | The KG subgraph + Brand Card + recent trajectory pulled for *this* cycle | TTL = cycle window | The memory router (read-through from lower tiers) |
| **Operational KG** | Postgres + Apache AGE | Typed `assertions` + `entities` + `conflicts` — the truth spine's long-term memory | Supersession-only (no delete) | The Extract/Adjudicate seams, verifier-grounded |
| **Analytical KG** | FalkorDB (graduated from AGE, 08 §7) | Multi-hop analytical reads over the full assertion graph (the Planner's subgraph pull) | CDC-replicated from Postgres; read-only | Debezium → Redpanda (derived) |
| **Episodic trajectory** | Postgres (`interventions`/`action_records`/`outcomes`) + ClickHouse (telemetry) | What we tried, what we predicted, what happened — the closed loop's history | Append-mostly + supersession on status | The Decision + Measurement layers (typed) |
| **CIO corpus** | Postgres (canonical) + R2 Object-Lock (immutable) + ClickHouse (analytical mirror) | Signed integrity-tagged `(intervention, context, outcome, counterfactual)` rows — the standardization asset | **Append-only, immortal** | Measurement + tag-integrity, signed |

**Nothing else is memory.** Langfuse spans are observability, not memory. Valkey rate-limit counters are control-plane state, not memory. The agent's prompt is ephemeral. This is the closed set.

### Tier separation enforces the spine
- The **operational KG** is the only tier an LLM seam can *write* (and even then, only verifier-grounded). It is the truth-spine's persistence.
- The **episodic trajectory + corpus** are the action-spine's persistence — written by symbolic (non-LLM) activities: the Measurement layer's estimator, the Action layer's manifest signer, the tag-integrity job.
- The **hot working-set** is a cache; losing it is a re-pull, never a re-creation.
- The **analytical KG** is a derived read replica; its idempotency is the `event_id` reconciliation (08 §5).

---

## 3. The memory router (sized against mid-context degradation)

2026 research (per the intelligence core, 05 §10) is unambiguous: models degrade *in the middle* of long contexts — effective attention collapses past ~60–70% of the advertised window, and the load-bearing fact placed in the middle is forgotten. The router does not trust the model's max context; it sizes against the **effective-attention budget**:

```
WorkingSet = memory.pull(tenant_id, cycle_id, focus: FocusQuery):
  1. resolve the focus → a KG seed set (the cycle's AnswerEvents + their entity refs + the Brand Card)
  2. community_summary layer: pull the GraphRAG community summaries for the seed entities (cached, KG_version-gated)
  3. working-set subgraph: expand 1–2 hops from the seed into typed (entity, assertion, conflict) nodes,
     capped at N nodes by the budget (N := f(model, effective_attention_budget))
  4. recent trajectory: append the last M InterventionSaga outcomes for this (tenant, surface, intervention_type) segment
  5. order: Brand Card + the live conflict FIRST (load-bearing, front-loaded),
     community summaries MIDDLE, supporting evidence + trajectory LAST
  6. budget guard: assert total_tokens(WorkingSet) ≤ budget; if over, drop the deepest supporting layer, never the Brand Card or the conflict
  return WorkingSet
```

**The order is the defense.** Because mid-context is where attention collapses, the *least* load-bearing content goes there (supporting evidence, trajectory), and the most load-bearing (Brand Card, the conflict under diagnosis) goes at the front. This is a mechanical mitigation, not a prompt trick.

### The KG_version gate
Community summaries are LLM-summarized cluster snapshots of the operational KG. A summary written against KG version *v* is **invalid** if the KG has bumped to version *v+1* (a supersession occurred in the summarized community). The cache key is `(tenant, community_id, KG_version)`; a version miss triggers a rebuild (an Abduce/Draft-style summarized pull) on the next cycle, never serves a stale one. Stale-memory poisoning is not possible by construction.

### The retrieval API surface
- `memory.pull(tenant, cycle, focus) → WorkingSet` — the read path; the Decision layer's only ingress.
- `memory.remember(tenant_id, assertion) → event_id` — the write path; goes through `assertion_view` (07 §2), which enforces bi-temporality + supersession + the verifier-grounding check. **There is no other write path.**
- `memory.community_summary(tenant, community_id, kg_version) → Summary` — cached or rebuilt.
- `memory.trajectory(tenant, surface, intervention_type, M) → [TrajectoryRow]` — the episodic read; typed, no prose.

---

## 4. The bi-temporal supersession / anti-fact model (no destructive updates)

Memory is **bi-temporal** (07 §1): every assertion carries `valid_time` (when the fact was true in the world) and `tx_time` (when we wrote it). Both are TSTZRANGEs; `assertion_view` is the only read path, parameterized by an `as_of` parameter (the "when" of the query).

**Supersession:** when a fact changes, the old assertion row is **not deleted**; it is marked `superseded_by = <new assertion_id>`, and the new row carries `valid_time` starting where the old one ended. The old row is still queryable at `as_of = <old time>` — the brand's state *last month* is reconstructable exactly.

**Anti-fact (ghost-busting):** when a fact was *wrong* (not just outdated — wrong, e.g., a SI surface assertion later overturned by a confirmatory probe with stronger sampling), the old row gets an `anti_fact_for = <old assertion_id>` link to a new row that asserts the negation over the same `valid_time`. The wrong fact is not erased — it's *marked refuted*, and the corpus retains the refutation as a high-integrity ("we were wrong, here's why") row. This is the memory model of a scientific lab notebook, not a database CRUD table.

**Why this matters for the spine:**
- The causal scorer reads `assertion_view` at a *specific* `as_of` — the probe timestamp — so the estimator's input reflects what was known *then*, not what's true *now*. Lookahead bias is impossible.
- The auditor (the Provenance Audit Hover, 10 §6) can show the *history* of a claim — every supersession, every anti-fact — because nothing was destroyed.
- A cloned Postgres without the per-tenant KEK (08 §4) is unintelligible; a cloned R2 without the signature key is unverifiable. The bi-temporal model survives both.

---

## 5. The three forgetting regimes

Not everything is remembered forever; not everything is forgotten. Three regimes, by tier:

### (a) Principled forgetting — verbatim probe samples
Raw verbatim probe answers (the literal "ChatGPT said X at time T") live in R2 Object-Lock per the tenant's retention (1–7 years configurable; indefinite for the regulated tier). In ClickHouse, raw samples **downsample to distributions at ~90 days** (08 §3): the precise answer text is retained in R2 for audit + the synthetic-control donor pool, but the analytical tier keeps only sufficient statistics (counts, mean, variance, the per-sample counts that feed the multi-sample belief). This is "principled forgetting" — the analytical signal is retained; the raw bytes that would balloon ClickHouse are archived, not destroyed. The raw is always recoverable from R2 by `event_id`.

### (b) Superseded-but-never-deleted — the operational KG
An assertion that's no longer true (`competitor P published a price drop on D1`) is **superseded**, not deleted. The supersession is queryable; the old row is retained for the bi-temporal `as_of` read. The operational KG **grows monotonically** — which is fine, because Postgres + AGE scale to the graduation triggers (08 §7), and the graduation to FalkorDB carries the full assertion history forward (CDC backfill). Memory here is *cumulative*, not pruned.

### (c) Immortal — the CIO corpus
The corpus is **append-only and immutable** (08 §4). Every `(intervention, context, outcome, counterfactual, ID-strategy, foreign-change-status, consent)` row, once signed and written to R2 Object-Lock in Compliance mode, **cannot be overwritten or deleted** until its retention elapses (indefinite / legal-hold for corpus rows). The corpus is the standardization asset — the *one* thing that survives architecture turnover (08 §4). Forgetting it is the one forbidden destructive operation in the system.

### The regret row is not forgetting
A regretted intervention (12 §7) is **not** deleted from the corpus — it's tagged `regret: true` and kept as a high-integrity counterexample. The causal scorer *learns from* regret, so it must *remember* regret. Deleting a regretted row would be the worst kind of forgetting: forgetting the lesson.

---

## 6. The consented human-query panel (the second moat's build sequence)

After the CIO corpus, the **consented human-query panel** is the second time-and-consent moat (05 §6). It is a panel of real, consented humans whom Engenox may query with curated buyer queries — the only identification-strategy-eligible ground truth for the closed loop that does not depend on scraping a platform that may revoke access.

### Why consented beats scraped
- **Identification-strategy-eligible.** A consented panelist assigned (control/treatment) to a query is an RCT-able unit; the corpus rows they generate carry `id_strategy = RCT-eligible` — the highest weight in the estimator (06). Scraped answers are observational at best.
- **No platform ToS risk.** No scraping arms race; no terms-of-service exposure; no `robots.txt` cat-and-mouse. The panel is a contracted, compensated relationship.
- **No scraping rot.** Scrapers break when the surface changes; a consented panelist reads the same way regardless of UI changes (they see the live surface, we record their answer).
- **The catch:** a panel is slow + expensive + non-representative-by-default. So the *build sequence* matters.

### The build sequence (the only non-trivial part)
A panel is not seedable from nothing; the build sequence earns it:
1. **Pre-revenue (founder's network):** the founder's own professional network — technical-brand founders matching the ICP (04). Opt-in, unpaid, N≈50. Used for: golden-probe scenarios (the eval fixtures, 11 §7) + the first `id_strategy=RCT-eligible` rows. No commercial claim made on these.
2. **Concierge-pilot clients opt-in:** Gates-C/D concierge clients (02) are invited to add their own team members as panelists (the client's marketing team queries the surfaces we're tracking for them). Opt-in, included in the concierge price. N≈200 per active concierge client. Used for: segment-matched trajectory rows + the PRM training slice.
3. **Paid panel (transactional):** a compensated panel sourced via a vetted platform (Prolific-class, ⚠️-verify the 2026 panel-sourcing vendor for AI-panel-quality specifically — Prolific's quality has degraded; a specialist vendor may exist). Per-query micropayment. Used for: cross-tenant standardization rows where the surface matters more than the brand (the "what does ChatGPT say about <category> queries" baseline). N≈5k by Horizon 1 close.
4. **Representative panel (Horizon 2+):** a statistically representative panel sourced + maintained per a documented sampling frame; the AI-Intelligence readiness closure (00_FINAL §gates) before any "representative benchmark" claim is made.

### The consent ledger (non-negotiable)
```
panel_consent {
  panelist_id, tenant_id (the panelist may belong to a tenant or be unaffiliated),
  consented_at, consent_scope: [Surface], consent_revocable: true,
  revoked_at | null, compensation_terms, age_verification, jurisdiction
}
```
- **Revocable.** A panelist may revoke; subsequent rows are not collected; existing rows are retained (the corpus is immortal) but **search/retrieval is gated by the revocation** (a revoked panelist's rows stop feeding the scorer's active training; they are kept for historical reproducibility only).
- **Jurisdiction-aware.** EU panelists flow through the privacy-tier self-hosted path (no egress, 11 §5 Tier B); their rows are never in a US-cell training run.
- **No panelist writes a spine directly.** Their answer → the Extract seam (grounded against the tenant's SHACL shapes) → the KG as a typed assertion with `ProvenanceRef → panelist_id`. The panelist is a *probe*, not a commit-author. The same spine rule applies to humans: they propose (via the panel), the symbolic verifier + the Action gate commit.

### The panel never becomes the product's ground truth alone
The corpus is the ground truth; the panel *feeds* the corpus high-integrity rows. The consented panel + the CIO corpus together are the time-and-consent moat — and they are **separate assets**: a competitor who copies the dashboard cannot copy either (the panel is a contractual relationship; the corpus is years of signed outcomes).

---

## 7. RLS + the cross-tenant standardization boundary

Memory is tenant-isolated by construction (07 §5, 08 §2): every KG read, every trajectory pull, every working-set assembly is `tenant_id`-scoped; the RLS-equivalent in Valkey + the RLS policy in Postgres are the floor. **But the corpus is partially cross-tenant** — and the boundary is precise:

- **Raw corpus rows are per-tenant** (Postgres RLS, R2 per-tenant prefix); a tenant's rows never flow to another tenant's scoring.
- **Cross-tenant flows are only de-identified, cohort-aggregated sufficient statistics** — the `corpus_analytics` mirror in ClickHouse (08 §3): counts + sums + uplift TE per `(intervention_type, entity_type, surface, context_signature)`, *never* row-level data. Interventions comparable across tenants (06 standardization) feed the lift predictor *without* exposing any tenant's specifics.
- **The Consent + Privacy controls** (15) govern which tenants opt into cross-tenant pooling. A privacy-tier tenant can opt out of pooled estimation and run on their own segment-only data (smaller N, wider CI, but zero egress).

The standardization asset is the *aggregated* corpus; the per-tenant corpus is the *commitment*. Both exist; the boundary between them is typed.

---

## 8. The memory invariants

1. **Five tiers only; the agent is stateless per call.** Hot / operational KG / analytical KG / episodic trajectory / CIO corpus. Nothing else is memory.
2. **`assertion_view` is the only read path; `memory.remember` is the only write path** (verifier-grounded, bi-temporal).
3. **No destructive updates.** Supersession, not delete; anti-fact, not erase; regret is tagged, not removed.
4. **The router sizes pulls against the *effective-attention* budget, not the max window; load-bearing content is front-loaded** against mid-context degradation.
5. **Community summaries are KG_version-gated;** a stale summary is rebuilt, never served.
6. **Three forgetting regimes in force:** principled-forgetting verbatim samples (raw → R2, downsample in ClickHouse @90d), superseded-but-never-deleted KG, immortal corpus.
7. **The consented panel is a build sequence (founder-network → concierge opt-in → paid → representative), consent-ledger-tracked, revocable, jurisdiction-aware; the panel proposes (probes), the spine commits.**
8. **Cross-tenant memory flows are only de-identified cohort aggregates; raw rows are per-tenant.** The standardization asset is aggregated; the commitment is per-tenant.

---

*End of memory architecture. Next: `14_EVENT_ARCHITECTURE.md` — the Redpanda assertion-event bus, the CDC fan-out, the schema registry, the SSE/streaming contract to the frontend, and the webhook-out discipline.*
