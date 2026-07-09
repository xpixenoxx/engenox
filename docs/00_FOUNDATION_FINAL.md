# 00 — Foundation: Final Synthesis & Engineering Readiness

> **Status: FROZEN.** This is the chief-architect's merged output of the three recovered intelligence proposals, the regenerated 15-layer 2026 technology evaluation, and the 8 specialist adversarial critiques. Documents 01–27 are authored against this. The 7 readiness scores are HONEST (the founder explicitly demanded gaps named, not inflated). Any score below 9.5/10 carries a precise closure statement.

## 0. Final architecture in one paragraph

Engenox is a **two-spine** intelligence — a typed, bi-temporal knowledge graph (Postgres+AGE → FalkorDB) as the spine of *truth*, and a counterfactual uplift estimator on a signed, integrity-tagged Causal Intervention-Outcome corpus as the spine of *action* — with frontier-agent deliberation reduced to a **bounded proposing layer** (six stateless, schema-constrained LLM seams: Extract, Draft, Adjudicate, Embed, Abduce, Critique) that can never commit. A Temporal durable-workflow loop (`perceive → decide → act → measure → tag-and-append → refresh-models`) runs per tenant under weighted-fair scheduling, executes actions **in the customer's infra** (PRs into their Git/CMS, never our deploy), and grades itself on one north-star metric: **high-confidence causal pairs added per period**. Every corpus row carries two integrity tags — *identification strategy* (RCT-eligible / quasi-experimental / observational) and *foreign-change status* (clean / suspected-bump / confirmed-bump / period-invalid) — that gate its weight on the estimator. The moat is not code; it is the **calibrated, consented, time-accumulated corpus** on an **aligned coordinate system** (KG schema + intervention feature space) that a clone cannot buy or backfill — banked as six time-and-consent assets (CIO corpus, consented human-query panel, Brand-Truth primary-source position, aligned coordinate system, calibrated core, autonomy trust).

---

## 1. The resolved 2026 stack (one coherent table)

| # | Layer | Pick | Key alternative | 2026 status |
|---|---|---|---|---|
| 1 | Frontend | Next.js 15 App Router + React 19 + TS + Tailwind v4 + Radix + TanStack Query | TanStack Start / SvelteKit | ✅ (⚠️-verify Next 16) |
| 2 | Backend (polyglot) | Tiers: **TS/Hono** (control+API+gateway) · **Go** (probe fleet, Temporal workers) · **Python/FastAPI** (causal/ML core) | All-Go / all-Python / Bun-everywhere | ✅ |
| 3 | RDBMS + multi-tenant | Postgres 16 + RLS-by-tenant + pgvector + Apache AGE; Citus on graduation | CockroachDB / Yugabyte | ✅ (⚠️-verify Citus on PG17) |
| 4 | Time-series/OLAP | ClickHouse (→ mirror to R2 Object-Lock WORM) | DuckDB/Druid/Snowflake | ✅ |
| 5 | Graph (two-tier) | AGE (operational) → FalkorDB (analytical graduation) | Neo4j Enterprise / Memgraph | ✅ (⚠️-verify FalkorDB) |
| 6 | Vector (two-tier) | pgvector (working-set) → Qdrant / Turbopuffer (graduation) | Pinecone / Weaviate / Milvus | ✅ (⚠️-verify Turbopuffer GA) |
| 7 | Streaming | Redpanda (default) / Warpstream (zero-ops, ⚠️-verify) | Apache Kafka / NATS | ✅ |
| 8 | Workflow | Temporal (Postgres-backend) → Temporal Cloud | Restate / Inngest / Step Functions | ✅ (⚠️-verify Cloud GA) |
| 9 | LLM runtime/gateway | Custom thin gateway on LiteLLM routing; constrained decoding (Outlines/XGrammar/GBNF); cross-family Critic; **no agent framework as spine** | LangGraph/Portkey/OpenRouter | ✅ |
| 10 | Inference + providers | API-first (Anthropic/OpenAI/Google/Perplexity); self-host **sglang** (vLLM fallback) on GPU cells for privacy/whale tier | TGI / TensorRT-LLM / Modal | ✅ (⚠️-verify GPU supply) |
| 11 | Caching/storage/CDN | Cloudflare R2 (Object-Lock WORM, free egress) + Workers/KV edge + **Valkey** (hot cache) + OpenSearch/Quickwit (verbatim FTS) | S3/Aurora-Storage/Elasticsearch | ✅ (⚠️-verify Quickwit) |
| 12 | Auth/Authz/Secrets | WorkOS (OIDC/SSO) + **Cedar** policy engine (autonomy dial + blast-radius) + Vault/HCP Radar + per-tenant envelope encryption (HSM-backed KEK) | Clerk/Auth0/OPA | ✅ (⚠️-verify Cedar-vs-OPA fit) |
| 13 | Observability | OpenTelemetry → Grafana (Mimir/Loki/Tempo) or Honeycomb; **Langfuse** + Arize Phoenix for LLM-eval | Datadog / LangSmith | ✅ (⚠️-verify Phoenix) |
| 14 | Cloud/Deploy/IaC | **ONE cloud: GCP** (AlloyDB, GKE Autopilot, BigQuery-Index, Confidential VMs) + **Cloudflare** edge; OpenTofu + Argo CD + GitHub Actions | AWS-primary / multi-cloud / Pulumi | ✅ (⚠️-verify OpenTofu registry) |
| 15 | DX/Monorepo | Polyglot monorepo (Nx → Bazel on graduation) + pnpm + uv + Go modules + **Buf** (contract codegen) + Biome/ruff/golangci-lint | Polyrepo / Pants / Turborepo | ✅ (⚠️-verify Biome lint coverage) |

The ⚠️-verify flags are *maturity-confirmation* items (point releases Jan→Jul 2026); none of them change a recommendation. Confirm at the start of code-phase, which the STOP CONDITION defers anyway.

## 2. The 8 cross-cutting architectural invariants (every engineer signs these)

1. **Contract spine.** Canonical schemas in Buf/JSON-Schema; codegen to TS/Go/Python. No hand-written cross-language types. Strict backward+forward-compat (add-only).
2. **Postgres is the truth-tx tier.** Everything else (FalkorDB, Qdrant, ClickHouse, R2 archive) is a read replica / analytics mirror / archive fed by CDC with `event_id` idempotency.
3. **Temporal owns the closed loop; the LLM gateway owns nothing durable.** No workflow state in an agent framework or a Redis hash.
4. **The event bus is the spine's tap, not the spine.** Redpanda carries assertion events to read-paths + WORM R2; the *commitment* to a fact is the Postgres write.
5. **The LLM is six bounded seams behind a custom gateway with mandatory constrained decoding + re-grounding.** No agent framework as spine; no LLM writes a typed commit.
6. **One cloud + edge partner; OpenTofu + containers preserve portability.** GCP primary + Cloudflare edge; AWS only for regulated-tenant graduation. Multi-region cells, not multi-cloud.
7. **Cost is a first-class architectural input.** Free-egress / pay-per-use / self-hostable picks; whales fund themselves via dedicated cells.
8. **Every commit-to-state is reproducible from a signed graph node.** WORM R2 + Postgres provenance + OTel span-links = auditable trail from `ActionRecord` back to the signed measurement.

## 3. The hardening punchlist (consolidated from 8 critiques, priority-ordered)

### P0 — block any autonomous-tier enablement until done
- **RLS-in-transaction invariant.** Every table has a `tenant_id` RLS policy (CI introspects `pg_policies` and fails if any missing); the worker pool sets `app.tenant_id` *inside the same transaction* as the query; no SUPERUSER role in the app pool ever.
- **Per-tenant crypto lifecycle spec.** DEK in locked-LRU with TTL, KEK never leaves HSM, plaintext corpus columns never enter logs (redaction-CI), two-key rolled rotation.
- **PR allow-list-glob + rule-based diff review.** The Action layer fails-closed if a PR diff touches anything outside the per-tenant allow-list; a deterministic (non-LLM) diff-review subagent blocks scripts/external-URLs/redirects/dep-changes.
- **Autonomy dial as a property-tested pure function with automatic demotion.** Escalation on (calibration coverage, approval rate, overlap support); *demotion* automatic on N degradation alerts in a window — downgrade is the default, never something to remember.
- **Temporal DR drill.** Rehearse "cluster restored to t-1" (history archival + replay) before any tenant crosses `execute-with-approval`.

### P1 — fold in before the MVP closes the loop publicly
- Three-sinks reconciliation job (Postgres ↔ ClickHouse ↔ FalkorDB sync asserted nightly by sampling on `event_id`).
- The `assertion_view` library as the *only* allowed bi-temporal query path (lint-bans hand-written `valid_time @>` queries).
- Warm-canary symbolic-rules + causal-scorer path runs on a fraction of traffic every day — known-working, not hoped-working.
- "CI straddles zero OR overlap-support < threshold → return a probe plan, not a guess" productized as a behavior, with the CI framed in-UI as a *feature* (the honesty differentiator).
- Fast-partial-probe onboarding (90-second preliminary result; full probe in background); activation metric = surfaced results < 90s.
- Every external-side-effect Temporal activity carries a typed `IdempotencyKey` with a passing idempotency integration test or it is CI-blocked.
- Probe-fleet ethical-probe posture (per-surface rate caps + jitter + residential-diversity at the heavy tier + a published crawl-rate disclosure).

### P2 — bank before Growth/Agency tier opens
- Cell abstraction spec (tenant cell = regional Postgres + ClickHouse + Object-Lock R2 + Temporal namespace) enabling multi-region data-residency.
- Three-graduation trigger+runbook doc (Citus at ~300 tenants / 800GB; FalkorDB at ~1M assertion nodes; Qdrant at ~10M vectors) with rehearsed cutover + dual-write + rollback.
- GPU quota filed early; 3-price-point infra model (baseline / spike / constrained); whale tier priced at cost-plus-margin.
- SOC 2 TypeII audit-log-started-now (audit log + access-review + change-management); data-residency option for EU (regional cell, not just RLS).
- Published "AI Visibility Index" as demand-gen + moat + public-side calibration signal.

---

## 4. Engineering Readiness — 7 honest scores

The founder demanded: any score below 9.5/10 must explain what raises it. These scores judge the **blueprint's readiness to start development**, not the (unbuilt) product. Inflating scores would betray the founder's explicit instruction.

| Dimension | Score | Justification |
|---|---|---|
| **Architecture** | **9.5** | The two-spine + six-bounded-LLM-seams + Temporal closed-loop + the integrity-tag-gated corpus is conceptually first-rate and survives 8 adversarial critiques with no landmines. The warm-canary symbolic fallback + the cell abstraction resolve the only structural concerns (frontier-outage graceful degradation, regional isolation). |
| **Scalability** | **9.0** ⚠️ | Sound graduation paths (AGE→FalkorDB, pgvector→Qdrant, PG→Citus) but three concurrent graduations-under-load + Temporal-in-anger + GPU economics are operator-risks not yet evidenced. **To reach 9.5:** ship the cell-abstraction spec; the three-graduation trigger+runbook doc; the Temporal DR drill before autonomy; the 3-price-point GPU infra model filed before Growth tier opens. |
| **Security** | **9.0** ⚠️ | Two-spine discipline + symbolic policy gate + WORM audit are top-tier *by design*, but RLS-pipeline rigor + the per-tenant crypto lifecycle + the PR allow-list + plugin sandbox + SOC2-adjacent audit log are the precise places "good design" becomes "fatal incident." **To reach 9.5:** the RLS-in-transaction invariant + a published envelope-encryption lifecycle spec + redaction-CI + the PR allow-list-glob/diff-review gate + an audit-log-started-now → these are invariants, not features. |
| **Maintainability** | **9.5** | Polyglot monorepo + Buf contract-codegen + the `assertion_view` bi-temporal query library + strict add-only contract-compat gate + the graduated tooling (Nx→Bazel). The polyglot cost is the only risk and it is contained by the contract spine. |
| **AI Intelligence** | **9.0** ⚠️ | The intelligence core is conceptually first-rate and the honesty discipline is exactly right, but causal-identification is shaky by construction (selection-biased panel, foreign-change, positivity-violating federated transfer) and the intervention feature space is hand-engineered (learn-the-wrong-thing-everywhere risk). **To reach 9.5:** the "CI-straddles-zero / low-overlap → probe plan not guess" productized; the learned-intervention-embedding track + shift monitor; within-tenant-first with cross-tenant-deferred-until-200-comparable; the warm-canary symbolic fallback; human-panel-as-ground-truth over LLM-judge. |
| **Competitive Moat** | **9.5** | The six time-and-consent assets (CIO corpus, panel, Brand-Truth primary-source, aligned coordinate system, calibrated core, autonomy trust) are genuinely un-copyable and the repo-native-vs-pixel-native differentiation against the Profound-funded unicorn is real and defensible. Closing on the name + ship-the-loop + the published Index locks the moat commercially. |
| **Production Readiness** | **8.5** ⚠️ | This is the composite gap — the blueprint is complete, but the *productization* (one locked ICP, the action-vs-lift UX contract, the hands-on-the-wheel autonomy UI at Co-pilot default, CI-as-differentiator framing) plus the operational P0/P1 punchlist must close before code ships end-to-end. **To reach 9.5:** lock one MVP ICP (technical-brand founder); ship-the-loop MVP scope (PR + measurement end-to-end, not audit-only); fast-partial-probe onboarding; the autonomy-dial UI; the published AI Visibility Index; the P0 punchlist fully in CI before any `execute-with-approval`. |

### Honest reading of the scores
**Architecture, Maintainability, Competitive Moat at 9.5** — the structural bets are ready. **Scalability, Security, AI Intelligence at 9.0** — each has a named, bounded gap that is *engineering work*, not redesign; closable in the MVP phase. **Production Readiness at 8.5** — the lowest score, and correctly so: it measures the *productization + operational discipline* still owed before code runs end-to-end against a real customer repo, not the architecture itself. The four ⚠️ dimensions each carry a precise closure list above; none requires re-opening the architecture.

### Final verdict
**Development may begin** — the STOP CONDITION is satisfied for the *foundation*. The below-9.5 dimensions are tracked as **gates on specific milestones**, not gates on starting:
- Scalability & Security gates → must close their P0 list **before any tenant crosses the `execute-with-approval` autonomy dial level** (the PR-touches-repo moment).
- AI Intelligence gates → must close before the **causal estimator is exposed as a customer-facing lift number** (the moment a customer can act on a CI).
- Production Readiness gates → must close before **public self-serve onboarding** (the moment anyone can sign up without a guided pilot).

This sequencing lets development start on the architectural foundation now while the gating discipline lands on the milestones where it materially protects customers.

---

*End of final foundation. Authoring of the 27 blueprint documents (01–27) proceeds against `00_FOUNDATION_INTELLIGENCE_CORE.md` + `00_FOUNDATION_FINAL.md` + `_FOUNDATION_TECH.md` + `_FOUNDATION_CRITIQUES.md`, each document written to disk and frozen on completion.*
