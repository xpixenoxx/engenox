# M0 — Implementation Plan + Tickets

> The foundation milestone: **the foundation that doesn't ship behavior** (`25` §3). M0 builds the contract spine, the IaC cell skeleton, the CI gate chain, the golden-path exemplars, and the installs of the enforcement environment (E01–E16) into the running repo. No product behavior ships here — the first behavior lands at M1. This directory holds the M0 plan (this README) + the M0 tickets (T01–T15).

---

## M0 objective

Build the *foundation* the rest of M1–M9 authors inside: the contract package that makes cross-language type-drift impossible, the IaC cell that provisions the truth-spine substrate (CNPG, per ADR-0003 — the most consequential M0 decision), the CI gate chain that makes the invariants physical from day one, the golden-path exemplars the AI *copies* rather than *invents*, and the running enforcement (skills, subagents, MCP, watchdog) that turns the E01–E16 plans into daily discipline.

**Independently deployable as** (`25` §3): a `dev` cell on a single region the founder can `kubectl get` and see healthy; a contract package a service can `import`.

**Gates closed at M0:** the *contract-compat CI gate* fires for the first time; the *Maintainability half* closes (the contract spine is the only cross-language type source, `24` §9 invariant 2; `28` §4 Phase 1). No readiness dimension fully closes at M0 (the Security/AI-Intelligence/Scalability/Production-Readiness closures are M1–M8).

**Cannot proceed to M1 until:** the contract compiles + the codegen succeeds across three languages + the dev cell is up (`25` §3).

## Scope (from the frozen docs)

In scope (`25` §3 M0 + `28` §4 Phase 1):
- `pkg/contracts/` v1 (entity + event + service + policy Protobuf) + codegen to TS/Go/Python.
- `infra/tofu/modules/cell` (CNPG + GKE + Valkey + Redpanda interim + KMS) — **ADR-0003 M0-critical**.
- `infra/kustomize/base` + `envs/dev` overlay + the Argo CD app-of-apps root + empty wellness/readiness probes.
- The CI gate-chain skeleton (`17` §4 — contract-compat first, then per-language lint/test, then forbidden-import, then Trivy + secret-scan).
- The polyglot workspace (nx.json + pnpm-workspace.yaml + pyproject.toml + go.work + mise.toml).
- **One golden-path exemplar per pattern** (`28` §4): TS/Hono, Go, Python/FastAPI, Temporal workflow, a contract proto (folded into T02), a Cedar policy, an RLS policy.
- The enforcement-environment *installs* (E14 skills/subagents → T08; E15 MCP → T09; E16 watchdog → T07).

Pre-completed by the enforcement environment (E01–E16 — not re-done in M0):
- `docs/` freeze (the blueprint 00–27) + `adr/` scaffold (`adr/README.md` + ADR-0001 + ADR-0003). ✅ (E05)
- The enforcement plans (E01–E16). ✅

Out of scope (deferred per JIT, `28` §6 Challenge F):
- M1's truth-spine schema + the *real* RLS baseline (the `tenants`/`assertions`/etc. schema + the RLS policies on every scoping-required table). M0 ships an RLS *exemplar* (T15) — a trivial reference pattern — not M1's schema.
- M2's gateway + the *real* Cedar policy set + the cross-family Critic binding. M0 ships a Cedar *exemplar* (T14) — a trivial reference policy + the <2ms p99 benchmark harness — not M2's gateway binding.
- M3's Temporal deployment + the dial. M0 ships a Temporal *exemplar* (T13) — workflow + activity definitions + an idempotency test — not the deployed Temporal spine.
- All product behavior (the closed loop). M0 ships the foundation; behavior starts at M1.

## The M0 tickets

**Foundation (Tier 1 — the contract spine, the IaC substrate, the enforcement gates):**

| ID | Slug | One-line | Tier | Depends on | Complexity |
|---|---|---|---|---|---|
| T01 | `T01-repo-workspace-bootstrap` | nx + pnpm + uv + go.work + mise + .gitignore + root configs | 1 | — | M (1 day) |
| T02 | `T02-contract-spine-buf-codegen` | pkg/contracts Buf + first protos (entity/event/service/policy v1) + codegen to TS/Go/Python | 1 | T01 | L (1.5 days) |
| T03 | `T03-dependency-direction-lint` | nx enforce-module-boundaries + Go depguard + Python import-linter + contract-graph unidirectional assertion | 1 | T01, T02 | M (1 day) |
| T04 | `T04-iac-cell-template-cnpg` | infra/tofu/modules/cell: CNPG Cluster CR (not AlloyDB) + AGE/pgvector bootstrap + backup/PITR + Valkey + Redpanda + KMS (ADR-0003) | 1 | T01 | L (2 days) |
| T05 | `T05-kustomize-argocd-dev-overlay` | infra/kustomize/base + dev/primary overlay + Argo CD app-of-apps + empty wellness/readiness probes | 2 | T04 | M (1 day) |
| T06 | `T06-ci-gate-chain-skeleton` | .github/workflows: contract gate first, then per-language lint/test, then forbidden-import, then Trivy + secret-scan | 1 | T01, T02, T03 | L (1.5 days) |
| T07 | `T07-stack-drift-watchdog-ci` | the watchdog CI job (E16 category 1–5 patterns) | 1 | T06 | M (1 day) |
| T08 | `T08-skills-subagents-install` | .claude/skills + .claude/agents (E14 install — the flow skills + the adversarial Specialists + the watchdog subagent) | 1 | — | M (1 day) |
| T09 | `T09-mcp-config-install` | .mcp.json: context7 + buf, scoped authority, credentials in env/Vault (E15 install) | 1 | T01, T02 | S (0.5 day) |

**Golden-path exemplars (Tier 2, except the policy exemplars at Tier 1):**

| ID | Slug | One-line | Tier | Depends on | Complexity |
|---|---|---|---|---|---|
| T10 | `T10-exemplar-ts-hono-service` | the first TS/Hono service (control-plane-shaped, trivial) | 2 | T02, T03, T06 | M (1 day) |
| T11 | `T11-exemplar-go-service` | the first Go service (perception-shaped, trivial) | 2 | T02, T03, T06 | M (1 day) |
| T12 | `T12-exemplar-python-fastapi-service` | the first Python/FastAPI service (measurement-shaped, trivial) | 2 | T02, T03, T06 | M (1 day) |
| T13 | `T13-exemplar-temporal-workflow` | a Temporal workflow + activity definition + idempotency test (no Temporal server deploy) | 2 | T02, T03, T06 | M (1 day) |
| T14 | `T14-exemplar-cedar-policy` | libs/cedar skeleton + one trivial policy + the <2ms p99 benchmark harness | 1 | T01, T03 | M (1 day) |
| T15 | `T15-exemplar-rls-policy` | a trivial Atlas migration + one RLS policy + the canary-row test against the M0 CNPG cluster | 1 | T04, T06 | M (1 day) |

**Estimated M0 total:** ~16 days of founder+AI work (sum of the ticket complexities, with the parallel exemplar tickets overlapping). The critical path is T01 → T02 → T03 → T06 → (T07 ‖ T10–T13) and T01 → T04 → (T05 ‖ T15), so wall-clock is closer to ~8–10 days with parallelism + the checkpoint cadence.

## The dependency graph (critical path)

```
T01 (workspace) ─┬─→ T02 (contracts) ──→ T03 (dep-direction lint) ──→ T06 (CI gate chain) ──┬─→ T07 (watchdog)
                 │                                                                            ├─→ T10 (TS exemplar)
                 │                                                                            ├─→ T11 (Go exemplar)
                 │                                                                            ├─→ T12 (Python exemplar)
                 │                                                                            └─→ T13 (Temporal exemplar)
                 │
                 ├─→ T04 (cell template, CNPG) ──→ T05 (kustomize/argocd) ──→ T15 (RLS exemplar)
                 │                              └─→ (T15 also needs T06)
                 │
                 ├─→ T09 (MCP — context7 + buf)   [needs T01 + T02]
                 │
                 └─→ T08 (skills + subagents)     [parallel; independent of the workspace]

T14 (Cedar exemplar) ── needs T01 + T03 (the Go workspace + the dep lint)
```

**Critical path:** T01 → T02 → T03 → T06 → T07 (the watchdog must land before the exemplars ship under it). The exemplars (T10–T13) ride on T06; T15 rides on T04+T06; T14 rides on T01+T03; T05 rides on T04; T08 + T09 are parallel off T01.

## The sequencing recommendation

1. **T01** (workspace) — the root; everything depends on it. **This is the first ticket (E18).**
2. **T02** (contracts) — the spine; second, because `buf generate` is the contract gate's subject.
3. **T03** (dep-direction lint) — the architecture made physical; third, because the lint + the contract gate together are the M0 enforcement core.
4. **T06** (CI gate chain) — fourth, so the exemplars (T10–T13) ship *under* the gate, not before it.
5. **T04** (cell template) in parallel with T02/T03 (infra is fairly independent of contracts once the workspace exists).
6. **T07** (watchdog) after T06 — the watchdog is a CI job.
7. **T08, T09** (skills/subagents, MCP) parallel, after T01 (T09 after T02).
8. **T14** (Cedar exemplar) after T03.
9. **T10–T13** (service + Temporal exemplars) after T06 — these prove the foundation works.
10. **T05** (kustomize/argocd) after T04.
11. **T15** (RLS exemplar) after T04 + T06 — the canary-row test runs against the live M0 cluster.

The first ticket (E18) is **T01**. After T01 is implemented + reviewed + checkpointed, the execution stops per the founder's directive ("Do not begin the next ticket automatically") and resumes on the founder's signal.

## The JIT discipline (applied)

- **Only M0 is ticketed here.** M1+ tickets are written *just-in-time* as M0 closes (`28` §6 Challenge F; the founder's directive "Only generate M0. Do not generate tickets for later milestones."). A ticket older than one milestone is a stale ticket.
- **The exemplars are reference patterns, not real M1/M2/M3 work.** T14 (Cedar) is a trivial policy + the benchmark harness, not M2's gateway binding. T15 (RLS) is a trivial schema + policy + canary-row test, not M1's `tenants`/`assertions`/etc. baseline. T13 (Temporal) is a workflow + activity definition + idempotency test, not M3's deployed Temporal spine. The exemplar is the *pattern the AI copies*; the real thing lands at its milestone.
- **The `25` §6 no-build-nothing-unrequired discipline holds.** M0 builds the foundation; it does not build behavior, it does not build M1's schema, it does not build M2's gateway. A ticket that "would be nice" is not in M0.

## The candor floor for M0

- M0's gate (the contract-compat CI gate fires) is reported as *the gate fires*, not "M0 is done." M0 is done when all 15 tickets close their per-ticket DoD + the dev cell is up + `buf generate` succeeds across three languages (`25` §3).
- The ADR-0003 consequence — the infra/SRE hire is non-deferrable at M1 — is named in T04, not buried. T04's DoD includes the hire-plan touchstone (the one-page hiring plan ahead of M1, founder-funding-conditional per `28` §7), recorded as a closure-work pointer, not as M0 work.
- A ticket that slips its acceptance is reported as slipped, not "substantially done" (`DEFINITION_OF_DONE.md`, E09).

## The cited authorities (what the implementation reads)

Each ticket cites the frozen doc + section it implements (`// 24 §2` etc.) + the ADRs it follows (`ADR-0003` for T04/T15, `ADR-0001` for the stack pins, `ADR-0006` where a model is referenced). The implementation reads those citations *before* coding (`AI_USAGE_RULES.md` §A plan-mode first). The citations are stable (`24` §7) — the docs are numbered + section-edited in place; an ADR supercedes by reference, never by rewrite.

---

*End of the M0 plan. The 15 tickets follow (T01–T15). The first ticket to implement (E18) is T01.*
