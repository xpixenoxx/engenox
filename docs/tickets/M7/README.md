# M7 Ticket Index — Closed Loop End-to-End in Stage + Concierge Pilot (Gates C-D)

> **M7 Scope (per `25_IMPLEMENTATION_PLAN.md` §3 M7):** The closed loop running end-to-end in the stage cell on the consented-panel cohort; warm-canary symbolic-fallback path baselined; first concierge pilot tenants onboarded; CIO corpus dual-canonical (Postgres + R2 Object-Lock) with three-sinks reconciliation; dial at Co-pilot for pilot tenants. Independently deployable as: a real pilot the founder can invite 3–5 tenants into.
>
> **Gates closed:** Gate C (concierge cohort) — AI-Intelligence closure (requires M4+M5+M6) is the hard prereq; Gate D stage-closure starts here, completes in M8.
>
> **Pre-reqs:** `.\scripts\local-up.ps1` stack healthy; Atlas migrations applied (`.\scripts\atlas-migrate-local.ps1`); consent fixtures seeded (`.\scripts\seed-consent-local.ps1`); all M0–M6 services build + tests green.

---

## Tickets

| ID | Title | Description | Depends On |
|---|---|---|---|
| **T01** | Stage cell deploy — extend dev cell for stage workload | Extend `infra/tofu/modules/cell` with stage overlay (`infra/tofu/envs/stage/primary`): second CNPG cluster (separate from dev), dedicated Temporal namespace, dedicated Redpanda topic prefix, R2 bucket with Object-Lock Compliance mode (WORM), Cloudflare Workers for edge auth proxy. Apply to founder's GCP project (phase-1 `google_*` + phase-2 `kubernetes_manifest` like T04). Output secret-refs to Vault/SecretManager. | M6 complete (E43), T04 (dev cell) |
| **T02** | AtlasCycle end-to-end in stage — Perception → Decision → Action → Measurement | Deploy all 7 services (Perception, Gateway, Decision, Action, Measurement, Temporal worker, Control-plane, Web) to stage cell. Wire real ConnectRPC + gRPC calls. Seed fixture tenant + conflict + consent. Execute AtlasCycle via control-plane → verify: Perception probes → Gateway seams → Decision synthesis → Action PR (dial=propose) → Measurement pipeline writes signed CIOCorpusRow to Postgres. Duration <10 min. | T01 |
| **T03** | Warm-canary divergence baseline (5% traffic) | Implement warm-canary router in Control-plane: 5% of AtlasCycle executions route to `SymbolicFallbackWorkflow` (rules-only: no LLM seams, deterministic ConflictType + schema.org Draft + no Critique). Emit `WarmCanaryMetrics` (lift diff, CI overlap, latency delta) to ClickHouse. Run 48h soak; divergence threshold <5% lift delta (per `11` §6). Gate: `warm-canary-divergence` job in CI. | T02 |
| **T04** | Concierge pilot onboarding — 3–5 founder-network tenants | Build onboarding flow in Web: `/onboarding/concierge` (invite-only, WorkOS magic-link + consent panel pre-filled with RCT_ELIGIBLE). Seed `TenantConfigStore` with pilot config (dial=Co-pilot, canary-cohort=true, measurement-window=7d). Provision per-tenant R2 prefix + ClickHouse partition. Document pilot SLA (dial never escalates above Co-pilot; human approves every PR). | T02, E41 (web onboarding) |
| **T05** | Three-sinks reconciliation — Postgres CIO row ↔ ClickHouse dedup ↔ R2 object | Nightly reconciliation job (Temporal activity `reconcileThreeSinks`): 1) Scan Postgres `cio_corpus` rows (last 24h) → 2) Upsert to ClickHouse `cio_corpus_analytics` (dedup on `corpus_id` + `tenant_id`) → 3) Verify R2 Object-Lock object exists at `s3://engenox-corpus/{tenant_id}/{corpus_id}.json` with matching Ed25519 signature. Emit `ReconciliationReport` (missing/extra/mismatch counts) to Grafana alert. CI gate: `reconciliation-test` with fixture data. | T01 (R2 bucket), E31 (corpus writer), E34 (measurement pipeline) |
| **T06** | R2 Object-Lock WORM mirror + restore test | Provision R2 bucket `engenox-corpus` with Object-Lock Compliance mode (retention 7 years). Measurement service `CorpusWriter` writes signed JSON to R2 **synchronously** after Postgres commit (dual-canonical write). Implement `CorpusRestoreTest` (Temporal activity): pick random corpus_id → fetch from R2 → verify signature → assert bit-identical to Postgres row. Run nightly. Gate: `r2-restore-test` in CI. | T01, E31, E33 (quarantine guard) |
| **T07** | M7 CI/E2E gates — stage deployment + pilot journey | Extend `.github/workflows/ci-orchestrator.yaml`: add `stage-deploy` job (tofu apply stage env), `atlascycle-e2e-stage` job (run T02 journey against stage), `warm-canary-baseline` job, `concierge-pilot-smoke` job. `e2e.yaml` adds pilot journey test (invite → onboard → conflict → PR → measure → report). Gate-status aggregation includes all new jobs. | T01–T06 |

---

## Acceptance Checklist (per ticket)

- [ ] `tofu fmt -check` / `tofu validate` clean
- [ ] `mise exec -- pnpm lint` + `mise exec -- pnpm test` green
- [ ] `buf generate` byte-reproducible
- [ ] Contract-compat: `buf breaking --against main` (no new breaking changes without ADR)
- [ ] RLS canary + introspection gates pass (when DB URL set)
- [ ] Dep-direction lint clean
- [ ] Security scan (Trivy) clean
- [ ] Stack-drift watchdog clean
- [ ] Gate-status aggregates all jobs → single required check
- [ ] Candor flags documented in ticket closure (no silent deferrals)

---

## M7 Closure Definition

| Gate | Evidence | Status |
|---|---|---|
| **Gate C (Concierge Cohort)** | 3–5 pilot tenants onboarded; AtlasCycle completes on each; dial=Co-pilot; PRs opened (not merged); Candor Report renders lift+CI+contrarian | ⬜ |
| **Warm-canary baseline** | 48h soak complete; divergence <5% lift delta; metrics in ClickHouse/Grafana | ⬜ |
| **Three-sinks reconciliation** | Nightly job green 7 consecutive days; zero mismatches on fixtures | ⬜ |
| **R2 WORM restore** | `CorpusRestoreTest` passes 7 consecutive nights | ⬜ |
| **M7 CI gates** | All jobs green on `main`; `gate-status` requires all success | ⬜ |

> **Next (M8):** Scalability closure (1000-tenant load test) + Production-Readiness closure (cell-pair DR rehearsal + chaos practice + SOC2-adjacent audit log) → M9 public self-serve.