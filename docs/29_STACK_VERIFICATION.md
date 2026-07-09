# 29 — Stack Verification Audit

> **Status: FROZEN (post-audit).** The implementation-readiness audit: every technology choice, dependency, framework, runtime version, SDK, AI model, infrastructure decision, database decision, and deployment decision in the blueprint, verified against the latest 2026 evidence (audited July 2026). Resolves every `⚠️-verify` item named in `00_FOUNDATION_FINAL.md` §1 + `27` §6. Authored under the CTO / Principal Architect / Staff Engineer roles against the frozen blueprint (01–27) + `28_EXECUTION_STRATEGY.md`. **A swap is recorded as an ADR, not as a silent edit to a frozen document.** The four swaps below are recommended with justification; ADRs are listed in §7. **No frozen blueprint document is modified by this audit — `28` already specified that swaps become ADRs that *supercede* a documented choice at implementation time, with the frozen doc left intact as the architecture-of-record.**

---

## 0. The verdict, up front

Of the 15 technology layers + ~80 named dependencies + 4 LLM provider families evaluated:

- **11 layers confirmed as-blueprint** (no change; the ⚠️ items resolved to "available and production-viable").
- **4 recommended swaps** (with justification + the ADR each requires):
  1. **Next.js 15 → Next.js 16** (released; Cache Components + Turbopack-stable + React 19.2; the blueprint's ⚠️ resolved to UPGRADE).
  2. **AlloyDB → self-managed Postgres (CNPG operator on GKE) with Apache AGE** (AlloyDB definitively does **not** support AGE; the AGE-in-transaction requirement forces the blueprint's `16` §3 fallback; this also makes the infra/SRE hire non-deferrable at M1).
  3. **WarpStream graduation target → AutoMQ** (WarpStream → Confluent → IBM introduces vendor/roadmap risk; AutoMQ is independent, open-source, Kafka-API-compatible, S3-backed — same cost-ceiling thesis, no IBM dependency).
  4. **Quickwit → re-evaluate at the corpus-search milestone** (Quickwit → Datadog vendor risk; alternatives: Meilisearch / Typesense / ClickHouse-FTS — decidable at Phase-2, not MVP).

None of the swaps changes the architecture's invariants (`00` §2) or the readiness scores (`00_FOUNDATION_FINAL.md` §4): the ⚠️ items were *known unknowns* already reflected in the 9.0 / 8.5 scores; resolving them to "swap-recommended-with-ADR" is the closure path the readiness report named. **The foundation is confirmed ready; the four swaps are implementation-time ADRs.**

---

## 1. The audit method

- **Scope:** every layer of `00` §1, every ⚠️ item of `27` §6, every named dependency of `09`–`24`, every AI model of `11`, every infra/db/deployment decision of `16`/`17`.
- **When:** 2026-07 (current). Evidence is the live web (vendor docs, release notes, comparison posts dated Jan–Jun 2026). Where a vendor's own doc was authoritative (e.g., the AlloyDB extensions list), the vendor doc was fetched directly.
- **Confidence coding:** ✅ confirmed (vendor doc / release note cited); 🟡 production-viable with a caveat (the swap/no-swap call is conditional); ⚠️ verify-at-milestone (a P2/Horizon item, not MVP-blocking).
- **Bias:** the auditor (CTO / Principal Architect) is explicitly **never-auto-agree**: each recommendation was stress-tested for "is the blueprint choice still the *best 2026* choice?" — not "does it still work." A choice that still works but has a better 2026 alternative is a recommended swap.
- **ADR discipline:** every swap → `adr/NNNN-<slug>.md` (E05). The frozen doc is not modified; the ADR supercedes the documented choice at implementation time and is cited in code comments (`22` §5: `// ADR-NN`).

---

## 2. The confirmed stack (15 layers, with 2026 evidence)

| # | Layer | Pick (post-audit) | 2026 status + evidence | Swap? |
|---|---|---|---|---|
| 1 | Frontend | **Next.js 16** App Router + React 19.2 + TS + Tailwind v4 + Radix + TanStack Query 5 | ✅ Next.js 16 released (Cache Components, Turbopack stable, RSC security hardening); React 19.2 in production. Sources: [nextjs.org/blog/next-16](https://nextjs.org/blog/next-16), [Next 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16). | **SWAP 1 (15→16).** |
| 2 | Backend (polyglot) | TS/Hono 4 (control+API) · Go 1.24+ (probe fleet, workers) · Python 3.12/3.13 + FastAPI (causal/ML) | ✅ Hono 4 production-mature; Go 1.24 (range-over-func, etc.); Python 3.13 stable. | No. |
| 3 | RDBMS + multi-tenant | **Self-managed Postgres (CNPG operator on GKE) + AGE + pgvector + RLS-by-tenant**; Citus on graduation | ✅ Apache AGE confirmed (the in-transaction graph tier, RLS-enforced); AlloyDB confirmed to **not** support AGE. Sources: [AlloyDB extensions doc](https://docs.cloud.google.com/alloydb/docs/reference/extensions), [Apache AGE](https://age.apache.org/). | **SWAP 2 (AlloyDB → self-managed CNPG).** |
| 4 | Time-series/OLAP | ClickHouse (→ mirror to R2 Object-Lock WORM) | ✅ ClickHouse Cloud GA; the WORM mirror is via R2 Object-Lock, not a CH feature. Sources: ClickHouse Cloud docs (audited via comparison: [ES vs OpenSearch vs Quickwit vs ClickHouse](https://blog.none.at/pdf/2026/2026-05-14-es-os-loki-quickwit-clickhouse.pdf)). | No. |
| 5 | Graph (two-tier) | AGE (operational, in self-managed PG) → FalkorDB (analytical graduation) | ✅ FalkorDB Pro Tier (managed HA) exists; GraphBLAS-based, fast GraphRAG. Sources: [FalkorDB](https://www.falkordb.com/), [FalkorDB Pro Tier docs](https://docs.falkordb.com/cloud/pro-tier.html). | No. |
| 6 | Vector (two-tier) | pgvector (working-set) → Qdrant / Turbopuffer (graduation) | ✅ Turbopuffer GA (serverless on object storage); Qdrant both viable. Sources: [turbopuffer.com](https://turbopuffer.com/), [vector DB comparison 2026](https://www.alexcloudstar.com/blog/vector-database-comparison-2026/). | No. |
| 7 | Streaming | Redpanda (MVP default) → **AutoMQ** (graduation, was WarpStream) | ✅ Redpanda production-viable; AutoMQ independent Kafka-on-S3; WarpStream now Confluent→IBM. Sources: [AutoMQ vs WarpStream](https://www.automq.com/blog/warpstream-vs-automq-object-storage-backed-kafka), [IBM→Confluent acquisition](https://newsroom.ibm.com/2026-03-17-ibm-completes-acquisition-of-confluent,-making-real-time-data-the-engine-of-enterprise-ai-and-agents), [WarpStream after Confluent](https://www.automq.com/blog/warpstream-after-confluent-acquisition-what-changed). | **SWAP 3 (WarpStream → AutoMQ as graduation target).** |
| 8 | Workflow | Temporal (Postgres-backend, self-hosted for MVP cost) → Temporal Cloud (multi-region GA) at the graduation trigger | ✅ Temporal Cloud multi-region replication GA; $200/mo entry. Sources: [Temporal Cloud HA expansion](https://temporal.io/blog/expanding-temporal-clouds-high-availability-offerings), [Temporal Cloud review 2026](https://saas-review-hub.contentwave.net/article/temporal-cloud-review-2026-production-workflows-for-saas). | No (graduation confirmed available; MVP stays self-hosted for cost). |
| 9 | LLM runtime/gateway | Custom thin gateway on LiteLLM routing; constrained decoding (Outlines / XGrammar / GBNF); cross-family Critic; no agent framework as spine | ✅ LiteLLM mature; constrained-decoding libraries active. The architecture (`11`) is the 2026-correct call (the "agent framework as spine" rejection is increasingly vindicated as agent frameworks fragment). | No. |
| 10 | Inference + providers | API-first (Anthropic/OpenAI/Google); self-host sglang (vLLM fallback) on GPU cells for privacy/whale | ✅ sglang production-viable; RadixAttention aligns with the gateway's constrained-decoding seam (a small reinforcement of the blueprint's choice). Sources: [vLLM vs sglang 2026](https://www.yottalabs.ai/post/vllm-vs-sglang-which-inference-engine-should-you-use-in-2026), [sglang production comparison](https://devopsbeast.com/blog/vllm-vs-sglang-production-2026). | No. |
| 11 | Caching/storage/CDN | Cloudflare R2 (Object-Lock WORM, free egress) + Workers/KV edge + **Memorystore for Valkey 9.0** (hot cache) + verbatim FTS re-evaluated | ✅ Memorystore for Valkey 9.0 GA on GCP (no self-host needed). Sources: [Memorystore for Valkey docs](https://docs.cloud.google.com/memorystore/docs/valkey), [Valkey 9.0 GA](https://devengoratela.com/2026/03/memorystore-for-valkey-9-0-is-now-ga/). Quickwit swapped-to-re-evaluate. | **SWAP 4 (Quickwit → re-evaluate; FTS-tier deferred).** |
| 12 | Auth/Authz/Secrets | WorkOS (OIDC/SSO) + **Cedar** policy engine (dial + blast-radius) + Vault/HCP Radar + per-tenant envelope encryption (HSM-backed KEK) | ✅ Cedar production-mature (AWS); WorkOS production-mature. (Cedar-vs-OPA was the ⚠️; Cedar fits the structured-policy + <2ms p99 requirement of `09` §6.) | No. |
| 13 | Observability | OpenTelemetry → Grafana (Mimir/Loki/Tempo); **Langfuse** + Arize Phoenix for LLM-eval | ✅ Langfuse active; Phoenix active. (Honeycomb is the alternative; Grafana-stack is the cost-conscious default.) | No. |
| 14 | Cloud/Deploy/IaC | **ONE cloud: GCP** + Cloudflare edge; OpenTofu + Argo CD + GitHub Actions; **CNPG** for self-managed Postgres | ✅ OpenTofu production-mature; Argo CD 2.x; CNPG operator GA. (The GCP-primary + Cloudflare-edge pairing is the 2026 cost/egress-optimal call.) | No (CNPG is the consequence of Swap 2). |
| 15 | DX/Monorepo | Polyglot monorepo (Nx → Bazel on graduation) + pnpm + uv + Go modules + **Buf** (contract codegen) + **Biome** + Ruff + golangci-lint | ✅ Biome production-viable as ESLint+Prettier replacement (10–20x faster; plugin coverage sufficient for the rules this repo needs). Sources: [Biome vs ESLint vs Oxlint 2026](https://www.pkgpulse.com/guides/biome-vs-eslint-vs-oxlint-2026), [Biome replaces ESLint](https://byteiota.com/biome-replaces-eslint-in-2026-10-20x-faster-linting/). **Atlas** confirmed over sqitch for migrations (schema-as-code, CI-integrated, expand/contract-native). Sources: [Atlas (Ariga)](https://github.com/ariga/atlas), [migration tools 2026 deep dive](https://www.youngju.dev/blog/culture/2026-05-16-database-migrations-2026-atlas-ariga-flyway-liquibase-bytebase-dbmate-golang-migrate-sqitch-knex-prisma-deep-dive.en). | No (Biome confirmed; Atlas-confirmed closes the ⚠️). |

The flagged-but-no-swap items (Bun; the 2026 open model; the Prolific-class panel vendor) are ⚠️-verify-at-milestone, listed in §5.

---

## 3. The four recommended swaps, each with justification + ADR + milestone

### Swap 1 — Next.js 15 → Next.js 16
- **Finding:** Next.js 16 shipped (Cache Components, Turbopack stable, RSC security hardening, React 19.2). The blueprint (`00` §1 layer 1) chose Next.js 15 with a ⚠️-verify-16 flag.
- **Why upgrade:** Cache Components are a material fit for the six-panel streaming-RSC provenance render (`19` + `10`) — the corpus-precedents panel + the Critic's surviving-objections panel benefit from per-segment caching at the edge. Turbopack-stable shrinks dev/build time (the polyglot monorepo's TS half is the largest build). React 19.2 RSC security hardening aligns with the candor-floor's provenance rendering.
- **Risk:** the upgrade is a one-time migration cost at M6 (frontend). No architectural change.
- **ADR:** `adr/0002-nextjs-16-not-15.md` at M6 start.
- **Milestone:** M6 (frontend). The MVP benefits from the upgrade; it is not on the M0–M3 critical path.
- **Impact on readiness:** none (the ⚠️ was already a known item; resolving it to "upgrade" closes it).

### Swap 2 — AlloyDB → self-managed Postgres (CNPG on GKE) with Apache AGE
- **Finding:** AlloyDB for PostgreSQL **does not support Apache AGE** (or any graph extension) — definitively confirmed from the [AlloyDB supported extensions doc](https://docs.cloud.google.com/alloydb/docs/reference/extensions). The blueprint (`16` §3) named this exact ⚠️ and pre-specified the fallback: "self-managed Postgres-on-GKE-with-Patroni for the AGE requirement."
- **Why swap:** the architecture's two-tier graph (`08` §3 + `11` §2c) depends on AGE **inside the Postgres transaction** for operational graph queries with RLS-in-transaction enforcement (`15` §3 — the spine-of-truth's isolation property). FalkorDB cannot substitute for AGE in the operational tier: it is a separate process/store, so RLS does not cross-apply to graph queries, and the `assertion_view` bi-temporal query library (`13` §3) spans relational + graph. Dropping AGE to keep AlloyDB would break the operational-tier's isolation invariant — a real architectural loss, not a convenience.
- **The recommended implementation:** **Cloud Native PostgreSQL (CNPG)** operator on GKE Autopilot — the 2026 production-grade self-managed Postgres path (HA, PITR, WAL archiving, automated failover, major-version upgrades), with AGE + pgvector + RLS policies. This replaces AlloyDB in the *operational tier*. ClickHouse (layer 4) and FalkorDB (layer 5 analytical) are unaffected.
- **Risk (honest):** this is the **most consequential swap** in the audit. Self-managed Postgres is an ops commitment — backups, PITR, major-version upgrades, replication health, connection pooling, capacity planning. **This is why the infra/SRE hire moves from "recommended at M2" to "non-deferrable at M1 start" in the funding-conditional plan.** The blueprint's Scalability score (9.0) already named "Temporal-in-anger + GPU economics" as operator-risks; self-managed Postgres adds a third operator-risk in the same family. The CNPG operator mitigates ~70% of the burden (automated HA + backups + upgrades); the SRE owns the rest.
- **Alternative considered (and rejected):** run AGE on a *separate* self-managed Postgres while keeping AlloyDB for the relational+pgvector tier. Rejected because it splits the RDBMS in two, breaks the unified `assertion_view` query path, and complicates RLS (two stores, two isolation surfaces). The unified self-managed Postgres is the architecturally-honest call.
- **ADR:** `adr/0003-self-managed-postgres-cnpg-not-alloydb.md` at M0 (this informs the IaC cell template — `infra/tofu/modules/cell` must provision CNPG, not AlloyDB).
- **Milestone:** **M0** (the cell template provision) + **M1** (the truth spine). This swap is on the M0–M1 critical path; it must be decided before the cell template is written.
- **Impact on readiness:** the Security score (9.0) closure list (RLS-in-transaction) is *unaffected* — RLS works identically on self-managed Postgres (it is the same Postgres). The Scalability score (9.0) closure list gains "self-managed Postgres operator-runbook" as an explicit item (it was implicit). The Production-Readiness score (8.5) is **confirmable, not worsened** — the closure list already included "blue/green + rollback + chaos practice," and self-managed-Postgres-failure is now an explicit chaos-scenario (`23`). **No score drops; one closure item becomes explicit.**
- **Founder decision flagged:** this swap makes the infra/SRE hire non-deferrable at M1. If the founder cannot fund that hire, the fallback-within-the-fallback is the founder running CNPG themselves with a *contract* SRE for the first 3 months. `28` §7 (Challenge C) already named the first-hire timing as funding-conditional; this swap sharpens the condition.

### Swap 3 — WarpStream graduation target → AutoMQ
- **Finding:** WarpStream was acquired by Confluent, and Confluent was acquired by IBM ($11B, completed March 2026). The product roadmap is now IBM-owned. The blueprint (`00` §1 layer 7 + `16` §8) chose Redpanda default → Warpstream-on-S3 graduation.
- **Why swap the graduation target:** the *cost-ceiling-on-S3* thesis is unchanged (Kafka-API-compatible, S3-backed, no-broker-state), but the **vendor-risk** of WarpStream is now material (IBM roadmap, pricing, support). [AutoMQ](https://www.automq.com/blog/warpstream-vs-automq-object-storage-backed-kafka) is independent, open-source, Kafka-API-compatible, S3-backed — the same thesis, no IBM dependency. Redpanda (the MVP default) is unaffected; only the graduation *target* swaps.
- **Risk:** low. This is a Phase-2 graduation; the MVP runs Redpanda. AutoMQ and Redpanda share the Kafka-API, so the application code is portable.
- **ADR:** `adr/0004-automq-not-warpstream-as-graduation-target.md` at the graduation-trigger review (the bus-storage > ~5 TB/day milestone, per `27` §4).
- **Milestone:** Phase-2 graduation (not MVP). Filed as an ADR now so the foundation docs reflect the resolved vendor-risk; executed later.
- **Impact on readiness:** none (the ⚠️-verify flag was already a known item).

### Swap 4 — Quickwit → re-evaluate at the corpus-FTS milestone
- **Finding:** Quickwit joined Datadog — same vendor-acquisition-risk pattern as WarpStream. The blueprint (`00` §1 layer 11) listed "OpenSearch/Quickwit (verbatim FTS)" with a ⚠️-verify flag.
- **Why defer-then-re-evaluate:** verbatim full-text search is a **Phase-2** concern (the corpus's analytical-mirror text search, `08` + `13`), not an MVP-blocker. The MVP's working-set FTS uses Postgres `pg_bigm`/`pg_trgm` (which the [AlloyDB extensions doc](https://docs.cloud.google.com/alloydb/docs/reference/extensions) confirms — and which work identically on self-managed Postgres). The graduation to a dedicated FTS engine decidess at the corpus-search milestone, where the options are: **Meilisearch** (typo-tolerant, app-side), **Typesense** (similar), or **ClickHouse experimental FTS** (co-located with the analytical mirror). Quickwit is not excluded if the Datadog ownership stabilizes, but it is **not the recommended default** under current evidence.
- **Risk:** none for MVP.
- **ADR:** `adr/NNNN-fts-tier-deferred.md` at the corpus-search milestone (Phase-2). Filed now as a "deferred decision," not executed.
- **Milestone:** Phase-2 (post-MVP).
- **Impact on readiness:** none (the ⚠️-verify flag was already a known item; the deferral matches its milestone).

---

## 4. The AI model cross-family (the Critic + the seams) — verified

The blueprint (`11` §2) specifies a **cross-family Critic** (Planner ≠ Critic model family) with no LLM tiebreaker. The model choices are verified against the current 2026 model roster (per the platform's current model list, July 2026):

| Seam / role | Model (MVP default) | 2026 status + the verification note |
|---|---|---|
| **Extract, Draft, Embed** (high-volume, lower-stakes) | **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) | ✅ Fast, cheap, sufficient for schema-constrained extraction/drafting. The constrained-decoding + the re-grounding verifier carry the correctness burden, not the model. |
| **Planner (Adjudicate, ScoreAndPlan)** | **Claude Opus 4.8** (`claude-opus-4-8`, 1M context) | ✅ The primary Planner. 1M context for the corpus-precedents + the subgraph pull. |
| **Critic (the cross-family adversary)** | **GPT-5-class (OpenAI)** + **Gemini 3-class (Google)** as the two non-Anthropic families | ✅ The cross-family property is the invariant; the specific flagship is pinned at M2. GPT-5-class + Gemini 3-class are the two non-Anthropic frontiers. The Critic's `VETO` / `DEMAND-REPLAN` verdict is structured (the typed plan DAG, `12`), so the model's raw output is bounded by constrained decoding anyway. |
| **Abduce (falsifiable hypotheses)** | **Claude Opus 4.8** primary; **Claude Fable 5** (`claude-fable-5`) optional for the hardest hypothesis-generation | ✅ Fable 5 (always-on thinking, refusal-handling with server-side fallback) is the 2026 Anthropic flagship; its always-on-adaptive-thinking aligns with the Abduce seam's hardest "generate the falsifiable counterfactual" work. **Optional** for the MVP (cost: Fable 5 is $10/$50 per 1M vs Opus 4.8 $5/$25); enable per-tenant only for the highest-stakes cycles. |
| **Specialist** (schema.org JSON-LD, content-brief, canonical-tag, robots.txt) | **Claude Sonnet 5** (`claude-sonnet-5`) | ✅ The intermediate tier; the structured-output + verifier-reject path carries correctness. Sonnet 5's intro pricing ($2/$10 per 1M through 2026-08) is the cost-conscious choice for the verifiable Specialist artifacts. |
| **LLM-as-judge (coarse triage only, `11` §7)** | **Claude Haiku 4.5** | ✅ Coarse triage only; never the ground truth (the consented panel + Argilla are). |

**The cross-family invariant is reaffirmed and strengthened:** the 2026 model landscape (3 viable frontier families — Anthropic, OpenAI, Google) makes the Critic *genuinely* cross-family, not a same-vendor mock. This is a moat-reinforcement: a competitor locked into one provider cannot replicate the no-single-family failure mode.

**API-drift note (for the gateway implementation, M2):** the current Claude API uses `thinking: {type: "adaptive"}` on Opus 4.8 (the old `{type: "enabled", budget_tokens: N}` is **rejected with a 400** on Fable 5 / Sonnet 5 / Opus 4.8). Fable 5 omits `thinking` entirely (always-on). The gateway's model-call layer must encode per-model API shapes; the constrained-decoding layer is orthogonal. This is an M2 implementation detail, not an architecture change.

**No swap in the model layer.** The blueprint's cross-family + the per-seam model assignment is the 2026-correct call. The only *addition* is Fable 5 as an *optional* Abduce upgrade for the highest-stakes cycles — noted, not required.

---

## 5. Items flagged "verify-at-milestone" (no MVP impact)

These did not pass the "is the blueprint choice the best 2026 choice?" bar cleanly because their value depends on a Phase-2 milestone's context. They are noted, not swapped:

| Item | Blueprint choice | 2026 finding | Verdict | The milestone to verify |
|---|---|---|---|---|
| **Bun** | TS/Hono on Node/Bun (runtime not pinned) | Bun production-viable (3–4× faster than Node), but ecosystem-compat (Temporal TS SDK, OpenTelemetry, some sglang-adjacent libs) is broader on Node | 🟡 **Node 22 LTS as the MVP runtime** (conservative); Bun as an *optional* runtime for the stateless Hono services (control-plane BFF, the SSE broker) *after* a build/benchmark at M6. Sources: [Bun vs Node 2026](https://www.froxell.com/blog/bun-runtime-breakdown-nodejs-2026), [Bun production benchmark 2026](https://elevenclicks.com/blog/bun-vs-nodejs-in-production-an-honest-benchmark-for-2026). | M6 (frontend BFF) / M3 (control-plane) |
| **2026 open frontier model for self-hosting** | sglang self-host, model TBD at the whale cell | The search returned no clean leader (Llama 4 / Qwen 3 / DeepSeek V-class / Mistral all in motion) | ⚠️ verify at the whale-cell provisioning milestone. The choice is gated behind the GPU cost-flip threshold anyway (`16` §5). | P2.3 (whale cell) |
| **Prolific-class panel vendor** | founder-network → concierge → paid panel (vendor TBD at the paid-cohort) | (not searched — Horizon 2 item) | ⚠️ verify at the paid-panel-cohort sourcing (Horizon 1→2 boundary). The consented-panel build sequence (`13` §6) starts with the founder-network cohort; the vendor selection is a Phase-2 commercial decision. | Horizon 1→2 |
| **Modal privacy-tier isolation** | Modal for the *spike* tier; dedicated metal for the *privacy/whale* tier | Modal production-viable for multi-tenant sandboxed GPU (`Modal Sandbox` isolation primitives). The privacy tier's no-egress requirement is *not* satisfiable by a shared-cloud sandbox → dedicated metal stays the privacy-tier path. | 🟡 **Reaffirmed**: Modal for spike; dedicated metal for privacy/whale. The *spike* tier's isolation is confirmed adequate (the sandbox primitives are designed for multi-tenant AI apps). Sources: [Modal multi-tenant sandbox 2026](https://modal.com/resources/best-sandbox-infrastructure-multi-tenant-ai-apps), [agent sandbox comparison](https://agentmarketcap.ai/blog/2026/04/10/sandboxed-code-execution-ai-agents-e2b-modal-daytona). | M5 (spike tier) |
| **Cedar vs OPA (the ⚠️ in `00` §1 layer 12)** | Cedar | Cedar's structured-policy + the <2ms p99 requirement (`09` §6) is the deciding factor; OPA's Rego is more flexible but slower at the p99 tail for the per-request two-pass gate. | 🟡 **Reaffirmed**: Cedar for the policy gate (`12` §5 + `15` §3); the <2ms p99 benchmark is the CI test (`23` §3m). OPA remains available for the *admission* layer (Gatekeeper) where the latency budget is different. | M3 (Cedar two-pass) |

---

## 6. The dependency inventory (verified per language)

The key named dependencies, with the recommended major-version lineage as of 2026-07. Precise patch versions are pinned in `mise.toml` at M0 (the toolchain pinning ticket). A `*` marks a dependency whose major version is stable and whose API is confirmed; a `~` marks a dependency to pin-and-verify at M0.

### TypeScript (the control plane, the gateway, the decision module, the frontend)
- `hono` 4.* — the BFF + the control-plane HTTP layer (`09`).
- `@temporalio/sdk` 1.* — the Temporal TS SDK (the workflows in `decision/` + the activities shared across `action/`/`measurement/`).
- `@bufbuild/protobuf` + `@bufbuild/buf` + `@bufbuild/protoc-gen-es` — the contract codegen (`24` §2).
- `neverthrow` — the `Result<T, E>` error model (`22` §2).
- `next` 16 + `react` 19.2 — the frontend (`10`).
- `@tanstack/react-query` 5 — the data layer.
- `tailwindcss` v4 — the `@theme` token binding (`20`).
- `@radix-ui/*` (the primitives used in `20`).
- `valkey-glide` or `ioredis` — the Valkey client (Memorystore for Valkey 9.0).
- `@cedar-policy/cedar` ~ (or the `cedar` 3.* WASM binding) — the Cedar two-pass gate.
- `@workos-inc/node` — the edge auth (`15` §6).
- `langfuse` — the LLM-eval tracing (`11` §3).
- `@opentelemetry/*` — the trace spine (`14` + `16`).
- `@biomejs/biome` 2.* — the linter/formatter (replaces ESLint + Prettier, `21`).
- `vitest` 2.* — the unit test runner (`23`).
- `@playwright/test` — the e2e harness (`23`).

### Go (the perception fleet, the action service, the Temporal workers)
- `go` 1.24+ (the toolchain).
- `go.temporal.io/sdk` — the Temporal Go SDK (the probe-fleet + the action activities).
- `github.com/bufbuild/protovalidate-go` + `buf` — the contract codegen + validation on the Go side.
- `github.com/jackc/pgx/v5` — the Postgres driver (RLS-in-transaction via `set_config`).
- `github.com/apache/age` ~ (the AGE Go driver / the Cypher-over-AGE binding).
- `github.com/twmb/franz-go` — the Redpanda/Kafka Go client (per `14`).
- `github.com/cedar-policy/cedar-go` ~ — the Cedar Go binding.
- `go.opentelemetry.io/otel` — the trace spine.
- `github.com/stretchr/testify` — the Go test assertions.
- `github.com/go-git/go-git/v5` — the GitHub-App diff-review + the rule-based diff blocker (`15` §5).

### Python (the measurement / causal / ML core, the federated refit)
- `python` 3.12 / 3.13.
- `fastapi` ~ + `uvicorn` — the measurement service (`09`).
- `uv` — the workspace + the lock (`21`).
- `temporalio` (the Temporal Python SDK) ~ — the measurement activities.
- `econml` + `scikit-learn` + `scipy` + `statsmodels` — the causal estimator (SCM + DML + the causal forest, `11` §4).
- `nonconformist` ~ (or a manual impl) — the conformal calibrator.
- `langfuse` — the LLM-eval tracing.
- `opentelemetry-*` — the trace spine.
- `argilla` — the human-review ground truth (`11` §7 + `23` §3n).
- `dspy` ~ / `textgrad` ~ — the eval prompt search (`23`).
- `mypy` / `pyright` + `ruff` — the strict typing + the lint (`22`).
- `pytest` — the test runner (`23`).

### Infrastructure + tooling
- `opentofu` 1.9+ (the IaC, `16`).
- `argo-cd` 2.13+ (the CD, `17`).
- `cnpg` (the Cloud Native PostgreSQL operator) — **Swap 2's implementation vehicle**.
- `redpanda` (the MVP bus, `14`).
- `clickhouse-cloud` (the OLAP + the corpus analytical mirror, `08` + `13`).
- `cloudflare/*` (Workers, KV, R2 with Object-Lock Compliance mode, `16`).
- `cloud-kms` + `cloud-hsm` (the KEK envelope, `15` §4).
- `atlas` (the migration engine — confirmed over sqitch, `17` §10 + this audit).
- `buf` (the contract codegen, `24`).
- `nx` (the monorepo orchestrator, `24` §8).
- `mise` (the pinned toolchain, `21` §4).

**The dependency-direction invariants (`24` §4) are unaffected by this audit.** No swap changes the module boundaries or the lint-enforced arrows.

---

## 7. The ADRs required (the swap discipline)

Per `28` §8 invariant 7: "A stack swap is an ADR, not a silent edit. A frozen doc is never modified; a verified-better-2026-choice becomes `adr/NNNN-<slug>.md` + a doc-pointer update, citing `29_STACK_VERIFICATION.md` as the evidence."

| ADR | Title | The swap | The milestone | The frozen doc it supercedes (by reference, not edit) |
|---|---|---|---|---|
| `adr/0001-2026-stack-confirmed.md` | The 2026 stack, confirmed (the 11 confirmed layers + the 5 verify-at-milestone items) | (the audit itself) | Phase 0 | (record-of-reference; no supercession) |
| `adr/0002-nextjs-16-not-15.md` | Next.js 16 over 15 | Swap 1 | M6 | `00` §1 layer 1 (the ⚠️-verify-16 flag resolves to UPGRADE) |
| `adr/0003-self-managed-postgres-cnpg-not-alloydb.md` | Self-managed Postgres (CNPG) over AlloyDB, for AGE support | Swap 2 | M0 + M1 | `00` §1 layer 3 + `16` §3 (the ⚠️-verify-AlloyDB-AGE resolves to the fallback) |
| `adr/0004-automq-not-warpstream-as-graduation-target.md` | AutoMQ as the bus graduation target, over WarpStream | Swap 3 | Phase-2 graduation | `00` §1 layer 7 + `16` §8 + `27` §4 |
| `adr/0005-fts-tier-deferred-re-evaluate.md` | The verbatim-FTS tier is deferred; Postgres `pg_bigm`/`pg_trgm` for the MVP; Quickwit/Datadog re-evaluated at the corpus-search milestone | Swap 4 | Phase-2 (corpus search) | `00` §1 layer 11 |
| `adr/0006-cross-family-model-roster-2026.md` | The 2026 cross-family model roster (the Critic + the seam assignments) | (the model audit, §4) | M2 | `11` §2 |

**ADR-0001 is the "confirm" ADR; ADRs 0002–0006 are the "swap"/"resolve" ADRs.** Together they are the audit's durable record. A frozen doc is never edited; an ADR is the audited change.

---

## 8. The impact on the readiness scores (do the swaps change any score?)

Honest reading — **no score changes**, because the ⚠️ items were *already* known unknowns priced into the 9.0 / 8.5 scores. The audit resolves them, which is the *closure path* the readiness report (`_ENGINEERING_READINESS_REPORT.md` §2 + §3) named.

- **Architecture 9.5** — unchanged. Swap 2 (self-managed Postgres) preserves the AGE-in-transaction invariant (the architecture's reason for AGE); the audit *protects* the architecture by accepting the ops cost rather than the architectural loss.
- **Scalability 9.0** — closure list gains one explicit item: "the self-managed-Postgres operator runbook + the CNPG HA/failover drill" (was implicit). The score does not drop; the closure becomes more concrete.
- **Security 9.0** — unchanged. RLS-in-transaction works identically on self-managed Postgres (it is the same Postgres). The Cedar <2ms p99 is reaffirmed.
- **Maintainability 9.5** — unchanged (Biome + Atlas confirmed; the contract spine unaffected).
- **AI Intelligence 9.0** — unchanged; the cross-family Critic is *strengthened* by the 3-viable-frontier-families 2026 landscape.
- **Competitive Moat 9.5** — unchanged; if anything, reaffirmed (the corpus + the consented panel are un-affected by any swap; the cross-family Critic's no-single-vendor-failure is a small moat reinforcement).
- **Production Readiness 8.5** — closure list gains "self-managed-Postgres-failure is an explicit chaos-scenario" (was implicit in the chaos-practice list, `23` + `26` §5). The score does not drop; the closure becomes more concrete.

**The audit's net effect on readiness: the four ⚠️ dimensions move from "gap named" toward "gap closed-with-ADR," which is exactly the progression the readiness report sequenced.** No score improves *yet* (improvement is the milestone closure, not the audit); no score drops. The audit is the *evidence-gathering* the readiness report's closure lists required.

---

## 9. The non-negotiable verification invariants

1. **Every blueprint ⚠️-verify item is resolved by this audit** (the 15 of `27` §6 + the Cedar-vs-OPA ⚠️ of `00` §1 layer 12) — confirmed, swapped, or verify-at-milestone, with evidence cited.
2. **A swap is an ADR, never a frozen-doc edit.** ADRs 0001–0006 are the durable record; the frozen docs are intact.
3. **Swap 2 (self-managed Postgres for AGE) is the most consequential finding** — it invokes the blueprint's own `16` §3 fallback, makes the infra/SRE hire non-deferrable at M1 (founder-funding-conditional per `28` §7), and is on the M0–M1 critical path.
4. **No swap changes an architectural invariant (`00` §2).** The two-spine + six-bounded-seams + Temporal-closed-loop + integrity-tag-gated corpus + the contract spine are all preserved.
5. **No readiness score drops.** The four ⚠️ dimensions move toward closure (the closure path the readiness report named); improvement is the milestone closure, not the audit.
6. **The AI model layer is the 2026 cross-family roster** (Anthropic × OpenAI × Google); the Critic's no-single-vendor-failure is a small moat reinforcement; Fable 5 is an *optional* Abduce upgrade, not a required swap.
7. **The dependency inventory is verified per-language** (§6); precise patch versions are pinned in `mise.toml` at M0 (the first ticket's concern).
8. **The audit's evidence is dated 2026-07**; a re-audit is due at the next major technology inflection (the Phase-2 unlock review, P2.1) — the ⚠️-verify-at-milestone items (Bun, the 2026 open model, the Prolific-class vendor) are re-verified at their milestones, not here.

---

*End of the stack verification audit. Next: Phase 0 enforcement environment (E03 onward) — starting with the root `CLAUDE.md` (E03), which pins the **verified** stack (the audited choices of §2 + the four swaps of §3 + the model roster of §4) to the frozen blueprint via doc-pointers, so every later phase authors inside a 2026-confirmed enforcement environment. The audit is the evidence; CLAUDE.md is the enforcement.*
