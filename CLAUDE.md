 # CLAUDE.md — Engenox (pre-launch codename; the "Citera" rename is a pre-launch action per `01` §2 + `27` §6)

> The single highest-leverage file in the repo. Pinned at repo root so Claude Code reads it at session start. This file pins the **verified 2026 stack** (per `docs/29_STACK_VERIFICATION.md`) to the **frozen blueprint** (docs 00–29). It does not re-derive the architecture; it points to it. It does not negotiate the stack; it enforces it. **If a frozen doc and this file ever seem to conflict, the frozen doc is authoritative and this file is edited to match — the doc is the architecture-of-record, this file is the operating manual.**

---

## 0. The project in one paragraph

Engenox is the world's first **AI Visibility Operating System** — a closed loop that *perceives* a brand's AI presence → *diagnoses* the conflict → *proposes* an intervention → *opens a PR* (NOT auto-merge in the MVP) → *measures* the outcome → *writes the corpus row* → *renders the candor*. The architecture is a **two-spine intelligence**: a typed bi-temporal knowledge graph (Postgres+AGE → FalkorDB) as the spine of *truth*, and a counterfactual uplift estimator on a signed, integrity-tagged Causal Intervention-Outcome (CIO) corpus as the spine of *action*, with frontier LLMs reduced to a bounded **proposing layer** (six stateless, schema-constrained seams) that can never commit. The moat is the **calibrated, consented, time-accumulated corpus** — six time-and-consent assets a clone cannot copy. The product is built by a solo founder (the agency "Pixenox Solutions") acting as 15 roles, with an AI author, until the first hires.

---


## 1. The frozen blueprint — do NOT re-litigate

The architecture is **FROZEN** in `docs/`:

- `docs/00_FOUNDATION_FINAL.md` — the foundation synthesis + the **7 readiness scores** (Architecture/Maintainability/Moat 9.5; Scalability/Security/AI-Intelligence 9.0; Production-Readiness 8.5) + the **8 cross-cutting invariants** every engineer signs.
- `docs/01_*` … `docs/27_*` — the 27 blueprint documents (Vision → Future Roadmap), each FROZEN with a §N "non-negotiable invariants" section.
- `docs/_ENGINEERING_READINESS_REPORT.md` — the 7-score report + the milestone-gate sequencing.
- `docs/28_EXECUTION_STRATEGY.md` — the execution layer (enforcement-first + contract-spine-first + gate-driven milestones + adversarial AI review + just-in-time ticketing).
- `docs/29_STACK_VERIFICATION.md` — the 2026 stack audit (the evidence base for the choices below).

**Rules:**
- Never re-derive architecture in a doc, a comment, or a standup. Cite the doc + section (`// 11 §2c` is the convention from `22` §5).
- A frozen doc is **never edited**. A verified-better-2026-choice is an **ADR** in `adr/NNNN-<slug>.md` that *supercedes* the documented choice at implementation time. The 4 ADRs from the audit are listed in §3 below.
- No application code until every enforcement-environment artifact (E03–E16) + the M0 plan (E17) are in place; the **single first M0 ticket** (E18) is the only product code authorized before the environment is reviewed. **The enforcement environment (E01–E16) + the M0 plan (E17) are complete; E18–E20 are ✅ in `docs/_RECOVERY.md`. `adr/0007-launch-first-walking-skeleton.md` (ACCEPTED) authorizes the launch-first thin-column-then-thicken execution** — the next work is the thin-M0 spine (T04 dev cell + T06 CI + T14/T15 exemplars), built on the long-term OS codebase (NOT disposable MVP code).

---

## 2. The verified 2026 stack (from `docs/29_STACK_VERIFICATION.md`)

**This is the stack. Reach for any of these — never for the 2020 defaults their training prior suggests.**

| Layer | Pick (verified July 2026) | Reach for this, NOT |
|---|---|---|
| Frontend | **Next.js 16** App Router + React 19.2 + TS + Tailwind v4 + Radix + TanStack Query 5 | Next.js 15-pages / 2020-Express / Redux / CSS-modules |
| Backend | **Hono 4** (TS control+API) · **Go 1.24+** (probe fleet, workers) · **Python 3.12/3.13 + FastAPI** (causal/ML) | Express / NestJS / all-one-language |
| RDBMS | **Self-managed Postgres (CNPG operator on GKE) + Apache AGE + pgvector + RLS-by-tenant** | AlloyDB (no AGE support — ADR-0003) / Mongo / Prisma-as-source-of-truth |
| Migrations | **Atlas** (Ariga; schema-as-code, expand/contract-native, CI-integrated) | sqitch / raw SQL / Prisma migrate |
| OLAP | **ClickHouse** (→ WORM mirror in R2 Object-Lock) | Snowflake-as-primary / Druid |
| Graph | **AGE** (operational, in-Postgres-transaction) → **FalkorDB** (analytical graduation) | Neo4j-as-primary / Dgraph |
| Vector | **pgvector** (working-set) → **Qdrant / Turbopuffer** (graduation) | Pinecone-as-primary / Weaviate |
| Streaming | **Redpanda** (MVP) → **AutoMQ** (graduation, S3-backed Kafka-API) | WarpStream (now Confluent→IBM — ADR-0004) / Kafka-with-ZK |
| Workflow | **Temporal** (self-hosted Postgres-backend for MVP cost) → **Temporal Cloud** (multi-region GA) at the graduation trigger | Inngest / Step Functions / LangGraph-as-spine / a hand-rolled queue |
| LLM gateway | **Custom thin gateway on LiteLLM** + **constrained decoding** (Outlines / XGrammar / GBNF) + **cross-family Critic** | LangGraph / AutoGen / CrewAI as the spine / calling providers directly |
| Inference | API-first (Anthropic/OpenAI/Google); **sglang** (vLLM fallback) for privacy/whale self-hosting | TGI / one-provider-lock-in |
| Cache / KV / edge | **Memorystore for Valkey 9.0** (GCP-native, GA) · **Cloudflare R2** (Object-Lock WORM, free egress) + Workers/KV | Redis-7-OSS-only / S3-with-egress-fees / Elasticsearch |
| FTS (MVP) | **Postgres `pg_bigm` / `pg_trgm`** (the verbatim tier is deferred — ADR-0005) | Quickwit (now Datadog — ADR-0005) / Elasticsearch |
| Auth/Authz | **WorkOS** (OIDC/SSO, edge JWT) + **Cedar** (the two-pass policy gate, <2ms p99) + **Vault** | Clerk / Auth0 / OPA-for-the-dial-gate |
| Crypto | HSM-backed **KEK** → per-tenant envelope-encrypted **DEK** (quarterly rotation) · **dual-canonical two-fence** (DB clone w/o KEK unintelligible; R2 clone w/o sig unverifiable) | a single KMS key / plaintext-at-rest / a single canonical store |
| Observability | **OpenTelemetry** → Grafana (Mimir/Loki/Tempo); **Langfuse** + Arize Phoenix for LLM-eval | Datadog-as-primary / LangSmith / no-tracing |
| LLM-eval ground truth | **Argilla** human review + the **consented panel** (NOT LLM-as-judge-as-ground-truth) | LLM-as-judge for promotion / training |
| Cloud/IaC/CD | **GCP primary + Cloudflare edge** · **OpenTofu** (IaC) + **Argo CD** (CD) + GitHub Actions · **CNPG** for self-managed Postgres · cell abstraction | multi-cloud-by-default / Pulumi / kubectl-apply-in-prod / a single monolithic deploy |
| DX / monorepo | **Nx** (→ Bazel on graduation) + **pnpm** + **uv** + **go.work** · **Buf** (the only cross-language type source, codegen) · **Biome** (replaces ESLint+Prettier) · **Ruff** · **golangci-lint** + depguard | Polyrepo / Turborepo / Pants / ESLint+Prettier / hand-written cross-language types |

### The 2026 cross-family LLM roster (`docs/29` §4)
- **Extract / Draft / Embed (high-volume):** Claude Haiku 4.5.
- **Planner (Adjudicate, ScoreAndPlan):** Claude Opus 4.8 (1M context).
- **Critic (cross-family adversary):** GPT-5-class (OpenAI) **and** Gemini 3-class (Google) — the cross-family property is the invariant; the Critic is never the same family as the Planner.
- **Abduce (falsifiable hypotheses):** Claude Opus 4.8 primary; **Claude Fable 5 optional** for the highest-stakes cycles (per-tenant opt-in; cost-watched).
- **Specialist (schema.org / content-brief / canonical-tag / robots.txt):** Claude Sonnet 5.
- **LLM-as-judge:** Claude Haiku 4.5 — coarse triage **only**; never the ground truth.

**API-drift note (M2):** on Opus 4.8 / Sonnet 5 / Fable 5, use `thinking: {type: "adaptive"}`. The old `{type: "enabled", budget_tokens: N}` is **rejected with a 400** on these models. Fable 5 omits `thinking` (always-on). The gateway encodes per-model shapes; the constrained-decoding layer is orthogonal.

---

## 3. The four ADRs from the stack audit (the documented supercessions)

| ADR | The swap | When |
|---|---|---|
| `adr/0001-2026-stack-confirmed.md` | The audit itself (record-of-reference) | Phase 0 (E05) |
| `adr/0002-nextjs-16-not-15.md` | Next.js 15 → 16 | M6 |
| `adr/0003-self-managed-postgres-cnpg-not-alloydb.md` | AlloyDB → self-managed Postgres (CNPG) **with AGE** (AlloyDB does not support AGE; the AGE-in-transaction invariant forces the fallback) | **M0 (the cell template) + M1** |
| `adr/0004-automq-not-warpstream-as-graduation-target.md` | WarpStream → AutoMQ as the bus graduation target (WarpStream now Confluent→IBM) | Phase-2 graduation |
| `adr/0005-fts-tier-deferred-re-evaluate.md` | Quickwit/Datadog → Postgres FTS for the MVP; the FTS tier re-evaluated at the corpus-search milestone | Phase-2 |
| `adr/0006-cross-family-model-roster-2026.md` | The 2026 cross-family model roster (the Critic + the seam assignments) | M2 |
| `adr/0007-launch-first-walking-skeleton.md` | **Execution-sequencing** (NOT a stack swap) — `28` §4 + the M0 README stage-complete-serial ordering → **thin-column-then-thicken**; all 12 architectural invariants + the `25` §4 gate sequence + `26` MVP scope preserved | **immediately** |

**Swap 2 is the most consequential:** it makes the infra/SRE hire non-deferrable at M1 (founder-funding-conditional per `28` §7). If you (the founder) cannot fund that hire, the fallback is a contract SRE for the first 3 months covering CNPG HA/backup/PITR. Flag this whenever M1 is discussed.

---

## 4. The contract-spine-first rule (the #1 anti-rework discipline)

**The contract package `pkg/contracts/` is the ONLY cross-language type source.** Generated from Buf Protobuf/JSON-Schema by `buf generate`; published as `@engenox/contracts` (TS), the Go module, the Python package. The output (`pkg/contracts/generated/`) is git-ignored; the codegen runs in CI; **never hand-write a cross-language type.**

- A new entity / event / service / policy type → add a `.proto` under `pkg/contracts/proto/engenox/{entity,event,service,policy}/v1/` → run `buf generate` → import the generated type.
- The dependency-direction lint (`nx-enforce-module-boundaries`, `depguard`, `import-linter`) blocks a forbidden import as a CI failure. The arrows are enforced, not advisory (`24` §4).
- **No service imports another service's internal package.** `decision` reads `perception`'s assertions from the KG via `libs/kg`'s `assertion_view` — never from a function call across modules. `control-plane` calls `perception`/`decision`/`action`/`measurement` **only via the gRPC client generated from `contracts/proto/service/`**.
- `gateway` is leaf-only; `gateway` is the only module that imports LiteLLM/the provider SDK.

**Before any service code is written (M1+), `pkg/contracts/` must exist, `buf generate` must run, and the dependency-direction lint must be green.** This is the foundation's first-ditch defense against AI type-drift.

---

## 5. The polyglot module boundaries (`24` §2 + §3)

```
engenox/
├── docs/                    # the FROZEN blueprint (00–29)
├── adr/                     # the post-STOP-CONDITION change log (ADR-0001…)
├── pkg/contracts/           # Buf: proto/ + buf.gen.yaml + generated/ (git-ignored)
├── infra/                   # tofu/modules/cell + kustomize/overlays + argocd + policies
├── services/                # control-plane(TS/Hono) · perception(Go) · decision(TS) · action(Go) · measurement(Python) · gateway(TS/Go) · temporal · workers
├── libs/                    # kg · verifier · cedar · crypto · otel · fixtures
├── web/                     # Next.js 16 App Router + RSC
├── design-system/           # tokens/primitives/patterns + .storybook
├── e2e/                     # Playwright harness (the <10-minute journey)
├── datasets/                # golden-probe fixtures + the consented-panel fixture slice
├── scripts/                 # bring-up · migration · chaos · restore-test runners
├── tools/                   # Buf-plugin wrappers · lint runners
└── .github/workflows/       # the CI gate chain
```

- **No `utils.ts` / `helpers.go` / `misc.py`.** A module is a domain-bounded vertical slice owning its types, persistence, external boundary, workflows, tests (`22` §6, `24` §3).
- Naming: lower-kebab files; kebab modules; PascalCase types matching the `06` domain vocabulary; camelCase (TS) / snake_case (Python + Go) functions; co-located tests per language convention; **versioned namespaces `v1`** (strict add-only; a `v2` is a major-version migration, `14` §5 + `18` §8).
- The `assertion_view` library (`libs/kg`) is the **only** allowed bi-temporal query path; lint bans hand-written `valid_time @>` queries (`13` §3).

---

## 6. The coding conventions (`22`, condensed)

- **Typed everywhere.** TS `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; no `any` / unrefined `unknown` / `as` casts. Python `mypy`/`pyright` strict + `pydantic frozen`. Go concrete types + protobuf-generated + `context.Context`. **`Result<T, E>` over `throw`** (TS: `neverthrow`); no `catch {}` swallowed errors; Go explicit error return + `fmt.Errorf("…: %w", err)`; Python `EngenoxError` vs `EngenoxInvariantError`, no `except Exception: pass`.
- **Immutability-first.** TS `readonly` + `immer`; Go pass-by-value for Temporal payloads + `go vet copylocks`; Python `@dataclass(frozen=True)` + `pydantic(frozen=True)`. Deps pinned; Renovate PRs **not** auto-merged; major bumps require an ADR.
- **Comments explain why, not what.** Doc-pointer comments: `// 11 §2c` (the doc + the section — stable because the docs are numbered + section-edited in place). Typed TODOs: `TODO(ADR-NN, owner)`. **No magic numbers** — `DIAL_DEMOTION_ALERT_THRESHOLD = 2  // 12 §5` with the doc-ref.
- **Legitimate escape hatches** (the only `as`/`unknown` allowed): DB driver rows refined at the repository boundary; gateway raw JSON refined by the verifier before it touches a spine (`22` §3).
- **"Code reads like the surrounding code."** Match comment density, naming, idiom, test-style. Novelty in architecture is encouraged; novelty in micro-style is rejected (`21` §6).

---

## 7. The CI gate chain that must pass (`17` §4 + `23`)

Every PR is blocked until: Buf **contract-compat** (BACKWARD/FULL-incompatible fails) · **RLS-introspection** (CI introspects `pg_policies`, fails if any scoping-required table lacks a `tenant_id` policy) · **canary-row** RLS test · **idempotency** re-execution (every external-side-effect activity re-executed with the same key asserts no duplicate; a PR-creating activity without this test is CI-blocked) · **diff-review-blocker** (the rule-based non-LLM blocker: `package.json`/scripts/external-URLs/redirects/dep-changes/off-scope files blocked; deny-list non-overridable) · **dial property tests** (escalation requires 3 axes; demotion-on-alert; default `propose`; deadlock auto-demotion) · **golden-probe** regression (over pipeline behavior, not surface outputs) · per-language tests (Vitest / Go test / pytest) · **Trivy** SBOM · **secret-scan** · **Biome** / **Ruff** / **golangci-lint** · the **dependency-direction lint**. Lints are **CI-blocked, not advisory** (`23` §5).

The **Cedar <2ms p99 benchmark** is a CI test (`23` §3m). The **conformal-coverage-by-segment** metric is a CI test (`23` §3n). The **warm-canary divergence** is a daily job (`11` §6 + `23` §3j).

---

## 8. The AI usage discipline (`docs/enforcement/AI_USAGE_RULES.md` + `docs/enforcement/REVIEW_STANDARDS.md`)

**Plan-mode before any non-trivial implementation.** No service, no workflow, no schema gets written without a reviewed plan. The plan is cheap; the wrong code is expensive.

**Adversarial review is tiered by blast radius (`28` §6 Challenge B):**
- **Tier-1 (full adversarial panel):** any PR touching `pkg/contracts/`, `services/action/`, `services/gateway/`, `libs/verifier/`, `libs/cedar/`, `libs/crypto/`, `libs/kg/`, or any RLS/migration/Cedar/diff-review code. Panels: security lens, contract-compat lens, stack-drift lens, + the domain lens (candor-floor for `web/`, RLS for `libs/kg/`).
- **Tier-2 (single adversarial reviewer + the watchdog):** `services/perception|measurement|decision|control-plane/`, `web/`, `design-system/`.
- **Tier-3 (lint + spot-check):** docs, storybook, fixtures, test-data, CI config. The stack-drift watchdog still runs.

**The author never reviews its own work** — the same separation as the cross-family Critic (`11` §2).

**The stack-drift watchdog** (`docs/enforcement/STACK_DRIFT_WATCHDOG.md`) blocks, on every PR, the forbidden patterns:

- `express`, `jest`, `eslint`, `prettier`, `next` Pages Router, `redux`, `prisma` (as source-of-truth), `mongoose`, hand-written cross-language types (a type that should be in `pkg/contracts/`), `redis`-OSS-only where Valkey is the choice, `warmpstream` where Redpanda/AutoMQ is the choice, an agent framework (`langgraph`/`autogen`/`crewai`) used as the spine, a provider SDK imported outside `gateway`, `tenant_id` accepted from a client request (`app.tenant_id` is from the JWT, `15` §3), a mutation without an `IdempotencyKey`, a lift-number rendered without its CI, the contrarian block omitted, a destructive `ALTER` in the same PR as an expand.

**Never do:**
- Auto-merge in the MVP (the dial is `propose`; the customer merges their own PR, `26` §6).
- Use an LLM tiebreaker for a Planner/Critic deadlock (it escalates to a human, `12` §9).
- Use LLM-as-judge as ground truth for promoting interventions or training the PRM (`11` §7, `26` §6).
- Render a lift number without its CI; omit the contrarian block; accept a client-supplied `tenant_id` (`26` §6 non-goals).
- Edit a frozen doc. A swap is an ADR.

---

## 9. The checkpoint & recovery discipline (`docs/enforcement/CHECKPOINT_WORKFLOW.md`)

The blueprint phase survived rate-limit interruptions on this discipline; it continues for the code phase.

- `docs/_RECOVERY.md` is the tracker. After **every completed artifact**, write it to disk immediately, mark it ✅ in the tracker, continue.
- If interrupted mid-artifact, **complete the partial file — do not replace it.** If interrupted between artifacts, resume from the first ⬜.
- The enforcement environment (E01–E16) is complete; **E18–E20 are ✅**; **ADR-0007 (ACCEPTED) authorizes the launch-first execution** — the next work is the thin-M0 spine per `adr/0007-launch-first-walking-skeleton.md`. `docs/_RECOVERY.md` tracks the artifacts (E01–E21; ADR-0007 at E21).
- Every artifact is FROZEN on completion; a later change is an ADR, not an edit.

---

## 10. The Definition of Done (`docs/enforcement/DEFINITION_OF_DONE.md`, condensed)

A unit of work is Done when **all** are true (`21` §8): the CI gates pass · the doc invariants are encoded (the relevant §N invariants are tests or lints) · the failing-mode is tested · the rollback is identified (deploy-rollback vs data-rollback are separate, `17` §8) · the observability is added (a span or a metric, not an afterthought) · the doc is updated (or an ADR filed) · the candor is preserved (the human-gate held; the honesty floor intact). **No score is inflated.** The DoD for the candor floor is the same as the DoD for a service: a gate, not a vibe.

---

## 11. How to run things (placeholders — filled as M0 lands)

(The M0 tickets under `docs/tickets/M0/` define these. Until then:)

- `mise install` — pin the toolchain (TS/Go/Python/Buf/Atlas/OpenTofu/Argo CD/biome versions per `mise.toml`, pinned at M0).
- `buf generate` — regenerate the contracts (must be green before any service code).
- `nx affected` — run only the changed-services' tests; the cross-service invariant tests run on every PR.
- `pnpm dev` / `go run` / `uv run` — the per-workspace dev entrypoints (defined at M0).
- The first bring-up target: `mise install && buf generate && nx run-many -t test` exits 0, in <3 minutes, on a clean machine (`21` §4).

---

## 12. The candor floor — applied to the engineering process itself

The product's commercial differentiator is **candor** (the CI is never omitted; the contrarian block renders; the Provenance Audit Hover works; the dial denies an unearned escalation with the ledger-explainer — `26` §4). **The engineering process models the product.** The weekly written review names what's blocked and what's slipping. The gate status is honest. The `29_STACK_VERIFICATION.md` audit names the four swaps rather than papering them over. The readiness scores (9.5 / 9.5 / 9.5 / 9.0 / 9.0 / 9.0 / 8.5) were not inflated. **Build the candor floor into the process, or it will not be in the product.**

---

*End of `CLAUDE.md`. This file points to the frozen blueprint + the verified stack; it is the operating manual. On any conflict, the frozen doc is authoritative. The enforcement environment continues at `docs/enforcement/`.*
