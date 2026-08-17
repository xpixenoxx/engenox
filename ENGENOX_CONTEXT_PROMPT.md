# ENGENOX — FULL CONTEXT PROMPT FOR NEW LAPTOP

> **Copy this entire file to your new laptop. Paste into Claude Code at session start. This restores 100% context.**

---

## 🎯 PROJECT IN ONE SENTENCE

**Engenox = AI Visibility OS** — perceives brand AI presence → diagnoses conflict → proposes intervention → opens PR (human merges) → measures outcome → writes corpus row → renders candor. Two-spine intelligence: bi-temporal KG (Postgres+AGE → FalkorDB) + counterfactual uplift estimator on signed CIO corpus. LLMs reduced to 6 stateless, schema-constrained proposing seams. Moat = calibrated, consented, time-accumulated corpus (6 assets a clone can't copy).

---

## 📍 WHERE WE ARE (August 17, 2026)

**Repo:** `xpixenoxx/engenox` (pushed to GitHub ✅)
**Branch:** `main` at commit `7072501`
**Stack:** Frozen per `docs/29_STACK_VERIFICATION.md` — **verified 2026 choices enforced**
**Execution:** ADR-0007 ACCEPTED — **launch-first thin-column-then-thicken** (not disposable MVP)
**Next Work:** Thin M0 spine — T04 dev cell + T06 CI + T14/T15 exemplars on long-term OS codebase

---

## 🧱 FROZEN BLUEPRINT (DO NOT RE-LITIGATE)

| Doc | Purpose | Key Section |
|-----|---------|-------------|
| `docs/00_FOUNDATION_FINAL.md` | 7 readiness scores (9.5/9.5/9.5/9.0/9.0/9.0/8.5) + 8 cross-cutting invariants | All |
| `docs/01_*` → `docs/27_*` | 27 blueprint docs (Vision → Future Roadmap) | Each has §N "non-negotiable invariants" |
| `docs/28_EXECUTION_STRATEGY.md` | Enforcement-first + contract-spine-first + gate-driven milestones + adversarial AI review | All |
| `docs/29_STACK_VERIFICATION.md` | 2026 stack audit (evidence base) | §3 = stack table, §4 = LLM roster |
| `adr/0001`–`0007` | Post-freeze changes (ADRs supercede frozen docs) | See §3 below |

**Rule:** Cite doc + section (`// 11 §2c`). Never edit frozen docs — file ADR instead.

---

## ⚙️ VERIFIED 2026 STACK (FROM `docs/29`)

| Layer | Choice | NOT |
|-------|--------|-----|
| Frontend | **Next.js 16** App Router + React 19.2 + TS + Tailwind v4 + Radix + TanStack Query 5 | Next.js 15-pages, Redux, CSS-modules |
| Backend | **Hono 4** (TS control+API) · **Go 1.24+** (probes, workers) · **Python 3.12/3.13 + FastAPI** (causal/ML) | Express, NestJS, all-one-language |
| RDBMS | **Self-managed Postgres (CNPG on GKE) + AGE + pgvector + RLS-by-tenant** | AlloyDB (no AGE — ADR-0003), Mongo, Prisma-as-source |
| Migrations | **Atlas** (Ariga; schema-as-code, expand/contract-native) | sqitch, raw SQL, Prisma migrate |
| OLAP | **ClickHouse** → WORM mirror in R2 Object-Lock | Snowflake-as-primary, Druid |
| Graph | **AGE** (operational, in-Postgres-tx) → **FalkorDB** (analytical graduation) | Neo4j-as-primary, Dgraph |
| Vector | **pgvector** (working-set) → **Qdrant / Turbopuffer** (graduation) | Pinecone, Weaviate |
| Streaming | **Redpanda** (MVP) → **AutoMQ** (graduation, S3-backed) | WarpStream (Confluent→IBM — ADR-0004) |
| Workflow | **Temporal** (self-hosted Postgres-backend) → **Temporal Cloud** (multi-region GA) | Inngest, Step Functions, LangGraph-as-spine |
| LLM Gateway | **Custom thin gateway on LiteLLM** + constrained decoding (Outlines/XGrammar/GBNF) + cross-family Critic | LangGraph, AutoGen, CrewAI as spine, direct provider calls |
| Inference | API-first (Anthropic/OpenAI/Google); **sglang** (vLLM fallback) for privacy | TGI, one-provider-lock-in |
| Cache/KV/Edge | **Memorystore Valkey 9.0** · **Cloudflare R2** (Object-Lock WORM, free egress) + Workers/KV | Redis-7-OSS-only, S3-with-egress-fees |
| FTS (MVP) | **Postgres `pg_bigm` / `pg_trgm`** (verbatim tier deferred — ADR-0005) | Quickwit (Datadog — ADR-0005), Elasticsearch |
| Auth/Authz | **WorkOS** (OIDC/SSO, edge JWT) + **Cedar** (two-pass policy gate, <2ms p99) + **Vault** | Clerk, Auth0, OPA-for-dial-gate |
| Crypto | HSM-backed KEK → per-tenant envelope DEK (quarterly rotation) · **dual-canonical two-fence** | Single KMS key, plaintext-at-rest, single canonical store |
| Observability | **OpenTelemetry** → Grafana (Mimir/Loki/Tempo); **Langfuse** + Arize Phoenix for LLM-eval | Datadog-as-primary, LangSmith, no-tracing |
| LLM-eval GT | **Argilla** human review + consented panel (NOT LLM-as-judge-as-GT) | LLM-as-judge for promotion/training |
| Cloud/IaC/CD | **GCP + Cloudflare** · **OpenTofu** + **Argo CD** + GitHub Actions · **CNPG** for Postgres | Multi-cloud-by-default, Pulumi, kubectl-apply-in-prod |
| DX/Monorepo | **Nx** (→ Bazel) + **pnpm** + **uv** + **go.work** · **Buf** (only cross-lang type source) · **Biome** (replaces ESLint+Prettier) · **Ruff** · **golangci-lint** + depguard | Polyrepo, Turborepo, Pants, hand-written cross-lang types |

### 2026 Cross-Family LLM Roster (`docs/29` §4)

| Role | Model | Invariant |
|------|-------|-----------|
| Extract/Draft/Embed (high-vol) | **Claude Haiku 4.5** | — |
| Planner (Adjudicate, ScoreAndPlan) | **Claude Opus 4.8 (1M ctx)** | — |
| Critic (cross-family adversary) | **GPT-5-class** AND **Gemini 3-class** | Critic ≠ Planner family |
| Abduce (falsifiable hypotheses) | **Claude Opus 4.8** primary; **Claude Fable 5** opt-in (per-tenant, cost-watched) | — |
| Specialist (schema.org/canonical/robots) | **Claude Sonnet 5** | — |
| LLM-as-judge | **Claude Haiku 4.5** | Coarse triage ONLY; never ground truth |

**API-drift note (M2):** On Opus 4.8 / Sonnet 5 / Fable 5 → use `thinking: {type: "adaptive"}`. Old `{type: "enabled", budget_tokens: N}` **rejected with 400**.

---

## 🔄 THE 4 ADRS FROM STACK AUDIT

| ADR | Swap | When |
|-----|------|------|
| `adr/0001-2026-stack-confirmed.md` | Audit record-of-reference | Phase 0 (E05) |
| `adr/0002-nextjs-16-not-15.md` | Next.js 15 → 16 | M6 |
| `adr/0003-self-managed-postgres-cnpg-not-alloydb.md` | AlloyDB → CNPG + AGE | **M0 (cell template) + M1** |
| `adr/0004-automq-not-warpstream-as-graduation-target.md` | WarpStream → AutoMQ | Phase-2 graduation |
| `adr/0005-fts-tier-deferred-re-evaluate.md` | Quickwit → Postgres FTS for MVP | Phase-2 |
| `adr/0006-cross-family-model-roster-2026.md` | 2026 model roster + seam assignments | M2 |
| `adr/0007-launch-first-walking-skeleton.md` | **Execution sequencing: thin-column-then-thicken** (all 12 invariants + 25 §4 gate sequence + 26 MVP scope preserved) | **Immediately** |

⚠️ **ADR-0003 most consequential:** Makes infra/SRE hire non-deferrable at M1 (founder-funding-conditional per `28` §7). Fallback: contract SRE for 3 months covering CNPG HA/backup/PITR.

---

## 🛡️ CONTRACT-SPINE-FIRST RULE (#1 ANTI-REWORK)

**`pkg/contracts/` = ONLY cross-language type source.** Generated from Buf Protobuf/JSON-Schema by `buf generate`; published as `@engenox/contracts` (TS), Go module, Python package. Output (`pkg/contracts/generated/`) is **git-ignored**; codegen runs in CI.

```
New entity/event/service/policy → add .proto under pkg/contracts/proto/engenox/{entity,event,service,policy}/v1/
→ buf generate → import generated type
```

**Dependency-direction lint** (`nx-enforce-module-boundaries`, `depguard`, `import-linter`) blocks forbidden imports as CI failure. Arrows enforced, not advisory (`24` §4).

**No service imports another's internal package.** KG queries via `libs/kg`'s `assertion_view` only. `control-plane` calls others **only via gRPC client from `contracts/proto/service/`**. `gateway` is leaf-only; only module importing LiteLLM/provider SDK.

**Before any service code (M1+):** `pkg/contracts/` must exist, `buf generate` green, dependency-direction lint green.

---

## 📦 POLYGLOT MODULE BOUNDARIES (`24` §2 + §3)

```
engenox/
├── docs/                    # FROZEN blueprint (00–29)
├── adr/                     # Post-STOP-CONDITION change log (ADR-0001…)
├── pkg/contracts/           # Buf: proto/ + buf.gen.yaml + generated/ (git-ignored)
├── infra/                   # tofu/modules/cell + kustomize/overlays + argocd + policies
├── services/                # control-plane(TS/Hono) · perception(Go) · decision(TS) · action(Go) · measurement(Python) · gateway(TS/Go) · temporal · workers
├── libs/                    # kg · verifier · cedar · crypto · otel · fixtures
├── web/                     # Next.js 16 App Router + RSC
├── design-system/           # tokens/primitives/patterns + .storybook
├── e2e/                     # Playwright harness (<10-minute journey)
├── datasets/                # golden-probe fixtures + consented-panel fixture slice
├── scripts/                 # bring-up · migration · chaos · restore-test runners
├── tools/                   # Buf-plugin wrappers · lint runners
└── .github/workflows/       # CI gate chain
```

**No `utils.ts` / `helpers.go` / `misc.py`.** Module = domain-bounded vertical slice owning types, persistence, external boundary, workflows, tests (`22` §6, `24` §3).

**Naming:** lower-kebab files; kebab modules; PascalCase types matching `06` domain vocabulary; camelCase (TS) / snake_case (Python + Go) functions; co-located tests; **versioned namespaces `v1`** (strict add-only; `v2` = major migration, `14` §5 + `18` §8).

**`assertion_view` library (`libs/kg`) = ONLY allowed bi-temporal query path.** Lint bans hand-written `valid_time @>` queries (`13` §3).

---

## 💻 CODING CONVENTIONS (`22` CONDENSED)

- **Typed everywhere:** TS `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; no `any`/unrefined `unknown`/`as` casts. Python `mypy`/`pyright` strict + `pydantic frozen`. Go concrete types + protobuf-generated + `context.Context`. **`Result<T, E>` over `throw`** (TS: `neverthrow`); no swallowed errors; Go explicit error return + `fmt.Errorf("…: %w", err)`; Python `EngenoxError` vs `EngenoxInvariantError`, no `except Exception: pass`.
- **Immutability-first:** TS `readonly` + `immer`; Go pass-by-value for Temporal payloads + `go vet copylocks`; Python `@dataclass(frozen=True)` + `pydantic(frozen=True)`. Deps pinned; Renovate PRs **not** auto-merged; major bumps require ADR.
- **Comments explain why, not what.** Doc-pointer comments: `// 11 §2c` (doc + section — stable). Typed TODOs: `TODO(ADR-NN, owner)`. **No magic numbers** — `DIAL_DEMOTION_ALERT_THRESHOLD = 2  // 12 §5`.
- **Legitimate escape hatches only:** DB driver rows refined at repository boundary; gateway raw JSON refined by verifier before spine (`22` §3).
- **"Code reads like surrounding code."** Match comment density, naming, idiom, test-style. Novelty in architecture encouraged; novelty in micro-style rejected (`21` §6).

---

## ✅ CI GATE CHAIN (MUST PASS — `17` §4 + `23`)

Every PR blocked until **ALL** pass:

1. **Buf contract-compat** (BACKWARD/FULL-incompatible fails)
2. **RLS-introspection** (CI introspects `pg_policies`, fails if scoping-required table lacks `tenant_id` policy)
3. **Canary-row RLS test**
4. **Idempotency re-execution** (every external-side-effect activity re-executed with same key → no duplicate; PR-creating activity without this test = CI-blocked)
5. **Diff-review-blocker** (rule-based non-LLM: `package.json`/scripts/external-URLs/redirects/dep-changes/off-scope files blocked; deny-list non-overridable)
6. **Dial property tests** (escalation requires 3 axes; demotion-on-alert; default `propose`; deadlock auto-demotion)
7. **Golden-probe regression** (pipeline behavior, not surface outputs)
8. **Per-language tests** (Vitest / Go test / pytest)
9. **Trivy SBOM** + **secret-scan**
10. **Biome** / **Ruff** / **golangci-lint**
11. **Dependency-direction lint**

**Cedar <2ms p99 benchmark** = CI test (`23` §3m). **Conformal-coverage-by-segment** = CI test (`23` §3n). **Warm-canary divergence** = daily job (`11` §6 + `23` §3j).

**Lints are CI-blocked, not advisory** (`23` §5).

---

## 🤖 AI USAGE DISCIPLINE (`docs/enforcement/AI_USAGE_RULES.md` + `REVIEW_STANDARDS.md`)

**Plan-mode before ANY non-trivial implementation.** No service, workflow, schema written without reviewed plan.

**Adversarial review tiered by blast radius (`28` §6 Challenge B):**

| Tier | Scope | Reviewers |
|------|-------|-----------|
| **Tier-1 (full panel)** | `pkg/contracts/`, `services/action/`, `services/gateway/`, `libs/verifier/`, `libs/cedar/`, `libs/crypto/`, `libs/kg/`, any RLS/migration/Cedar/diff-review code | Security lens, contract-compat lens, stack-drift lens, + domain lens (candor-floor for `web/`, RLS for `libs/kg/`) |
| **Tier-2 (single adversary + watchdog)** | `services/perception\|measurement\|decision\|control-plane/`, `web/`, `design-system/` | — |
| **Tier-3 (lint + spot-check)** | docs, storybook, fixtures, test-data, CI config | Stack-drift watchdog still runs |

**Author NEVER reviews own work** — same separation as cross-family Critic (`11` §2).

**Stack-drift watchdog** blocks on every PR:
- `express`, `jest`, `eslint`, `prettier`, `next` Pages Router, `redux`, `prisma` (as source-of-truth), `mongoose`, hand-written cross-lang types (should be in `pkg/contracts/`), `redis`-OSS-only (Valkey is choice), `warmpstream` (Redpanda/AutoMQ is choice), agent framework as spine (`langgraph`/`autogen`/`crewai`), provider SDK outside `gateway`, client-supplied `tenant_id` (`app.tenant_id` from JWT, `15` §3), mutation without `IdempotencyKey`, lift number without CI, contrarian block omitted, destructive `ALTER` in same PR as expand.

**NEVER:**
- Auto-merge in MVP (dial = `propose`; customer merges own PR, `26` §6)
- LLM tiebreaker for Planner/Critic deadlock (escalates to human, `12` §9)
- LLM-as-judge as ground truth for promoting interventions or training PRM (`11` §7, `26` §6)
- Render lift without CI; omit contrarian block; accept client `tenant_id` (`26` §6 non-goals)
- Edit frozen doc (swap = ADR)

---

## 📋 CHECKPOINT & RECOVERY (`docs/enforcement/CHECKPOINT_WORKFLOW.md`)

- `docs/_RECOVERY.md` = tracker. After **every completed artifact**: write to disk immediately, mark ✅, continue.
- If interrupted mid-artifact → **complete partial file, don't replace**. If between artifacts → resume from first ⬜.
- Enforcement environment (E01–E16) complete; **E18–E20 ✅**; **ADR-0007 ACCEPTED** authorizes launch-first execution.
- Every artifact FROZEN on completion; later change = ADR, not edit.

---

## ✅ DEFINITION OF DONE (`docs/enforcement/DEFINITION_OF_DONE.md`)

Unit = Done when **ALL** true (`21` §8):
- CI gates pass
- Doc invariants encoded (relevant §N invariants = tests or lints)
- Failing-mode tested
- Rollback identified (deploy-rollback vs data-rollback separate, `17` §8)
- Observability added (span or metric, not afterthought)
- Doc updated (or ADR filed)
- Candor preserved (human-gate held; honesty floor intact)
- **No score inflated.** Candor floor DoD = service DoD: a gate, not a vibe.

---

## 🏃 HOW TO RUN (PLACEHOLDERS — FILLED AS M0 LANDS)

```bash
mise install              # pin toolchain (TS/Go/Python/Buf/Atlas/OpenTofu/Argo CD/biome versions per mise.toml)
buf generate              # regenerate contracts (must be green before any service code)
nx affected               # run only changed-services' tests; cross-service invariant tests on every PR
pnpm dev / go run / uv run # per-workspace dev entrypoints (defined at M0)
```

**First bring-up target:** `mise install && buf generate && nx run-many -t test` exits 0, in <3 minutes, on clean machine (`21` §4).

---

## 🕯️ CANDOR FLOOR — ENGINEERING PROCESS MODELS PRODUCT

Product's commercial differentiator = **candor** (CI never omitted; contrarian block renders; Provenance Audit Hover works; dial denies unearned escalation with ledger-explainer — `26` §4).

**Engineering models the product:**
- Weekly written review names what's blocked and what's slipping
- Gate status is honest
- `29_STACK_VERIFICATION.md` audit names 4 swaps rather than papering over
- Readiness scores (9.5/9.5/9.5/9.0/9.0/9.0/8.5) were not inflated
- **Build candor floor into process, or it won't be in product.**

---

## 📍 CURRENT STATE ON NEW LAPTOP

**Repo cloned at:** `~/engenox` (or wherever)
**Branches:** `main` only (others not pushed yet)
**Toolchain:** Run `mise install` first
**Contracts:** Run `buf generate` before any service work
**Infra:** `docker compose -f docker-compose.dev.yml up -d` starts full local stack
**Tests:** `nx run-many -t test` should pass in <3 min

**Next tickets (from `docs/tickets/M0/` — thin M0 spine):**
- T04: Dev cell bring-up (OpenTofu + CNPG + AGE)
- T06: CI pipeline (Buf compat + RLS introspection + idempotency + diff-review + dial props)
- T14: Perception exemplar (probe → assertion → KG write)
- T15: Measurement exemplar (CIO corpus row write + uplift estimate)

**All infrastructure code already in repo:** `infra/`, `docker-compose.dev.yml`, all service Dockerfiles, init scripts, Grafana stack configs.

---

## 🔑 SECRETS YOU NEED ON NEW LAPTOP (NOT IN GIT)

```bash
# Create these from your backup or regenerate:
cp /backup/.env* .                    # .env, .env.local, .env.*.local
# SSH keys for GitHub:
# ~/.ssh/id_ed25519 / ~/.ssh/id_ed25519.pub
# GPG key for commit signing (if used)
# GitHub token (gh auth login)
# GCP credentials (gcloud auth application-default login)
# WorkOS credentials (for auth)
# Vault token (if using local Vault)
```

---

## ⚠️ IMMEDIATE ACTION ON NEW LAPTOP

```bash
cd ~/engenox

# 1. Verify git state
git status                    # should be clean
git log --oneline -3         # should show 7072501 as HEAD

# 2. Install toolchain
mise install

# 3. Regenerate contracts (CRITICAL - do before ANY service code)
buf generate

# 4. Install deps
pnpm install
cd services/measurement && uv sync && cd ../..

# 5. Start local infra
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps    # all should be healthy

# 6. Verify
nx run-many -t test      # must exit 0 in <3 min

# 7. Rotate the exposed PAT (from old remote URL)
# GitHub → Settings → Developer settings → PAT → revoke old → create new
# gh auth login
```

---

## 🎯 IF YOU NEED TO RESUME WORK

**Read these in order:**
1. `docs/_RECOVERY.md` — artifact tracker (shows what's ✅/⬜)
2. `adr/0007-launch-first-walking-skeleton.md` — execution authorization
3. `docs/tickets/M0/` — thin M0 spine tickets (T04, T06, T14, T15)
4. `docs/28_EXECUTION_STRATEGY.md` §4 — gate-driven milestone sequencing
5. `docs/29_STACK_VERIFICATION.md` §3 — stack table (source of truth)

**Then pick next ⬜ ticket from `docs/_RECOVERY.md` and run plan-mode.**

---

## 📝 QUICK REFERENCE — KEY FILES TO KNOW

| File | Why It Matters |
|------|----------------|
| `CLAUDE.md` | This operating manual (pinned at repo root) |
| `docs/00_FOUNDATION_FINAL.md` | 7 scores + 8 invariants (architecture-of-record) |
| `docs/29_STACK_VERIFICATION.md` | Verified 2026 stack + LLM roster |
| `adr/0003-*.md` | Why CNPG not AlloyDB (AGE requirement) |
| `adr/0007-*.md` | Launch-first thin-column execution |
| `pkg/contracts/buf.gen.yaml` | Codegen config (source of cross-lang types) |
| `infra/tofu/modules/cell/main.tf` | Cell template (M0 target) |
| `docker-compose.dev.yml` | Full local dev stack |
| `docs/enforcement/AI_USAGE_RULES.md` | AI discipline (plan-mode, adversarial review tiers) |
| `docs/enforcement/STACK_DRIFT_WATCHDOG.md` | Forbidden patterns (CI-blocked) |
| `docs/_RECOVERY.md` | Artifact completion tracker |

---

**END OF CONTEXT PROMPT**

> Paste this into Claude Code on new laptop → full context restored.
> **Source of truth:** Frozen docs (`docs/00`–`29`) + ADRs (`adr/0001`–`0007`) + this `CLAUDE.md`.
> On conflict: frozen doc wins → edit this file to match.