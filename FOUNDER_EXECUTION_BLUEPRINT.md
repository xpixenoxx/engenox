# ENGENOX FOUNDER EXECUTION BLUEPRINT
## From Repository Truth → MVP Launch

**Generated:** 2026-07-16  
**Method:** Direct repository audit + build verification (zero trust in prior reports)  
**Status:** Authoritative execution plan until MVP launch

---

## PART 1 — CURRENT STATE (REPOSITORY TRUTH)

### 1.1 What Exists Today (Verified by Build)

| Component | Status | Evidence |
|-----------|--------|----------|
| **Enforcement Environment (E01–E21)** | ✅ Complete | `docs/_RECOVERY.md` E01–E21 all ✅; ADR-0007 ACCEPTED; CI gate chain wired (`.github/workflows/*.yaml`) |
| **Contract Spine (A0 / E22)** | ✅ Complete | `pkg/contracts/` — 22 exports, byte-reproducible `buf generate`, 13 Vitest tests pass, `tsc --noEmit` clean, `go build ./...` clean, `mypy --strict` clean, Python round-trip gate passes |
| **Libs Spine (A1 / E23)** | ✅ Complete | `libs/{kg,cedar,crypto,verifier}/` — 57 tests pass; KG=InMemoryAssertionStore + RLS policies; Cedar=real `@cedar-policy/cedar-wasm@4.11.2` two-pass gate (<2ms p99); Crypto=Ed25519 stdlib only; Verifier=5 pure re-grounding functions |
| **Dev Cell Template (A2 / E24 / T04)** | ✅ Code Complete | `infra/tofu/modules/cell/` — 7 provisions (GKE, GCS PITR, KMS KEK, Valkey 9.0, CNPG Cluster+AGE+pgvector, ScheduledBackup, Redpanda interim); `tofu fmt/validate` pass; **UNDEPLOYED** (requires Founder GCP ADC) |
| **CI Gate Chain (T06 / E25)** | ✅ Complete | 8 workflows in `needs:` chain: `contract-gate` → parallel lint/test/dep-dir/security/watchdog → `gate-status` aggregator (single required check); all green locally |
| **M1-thin Truth Spine (E26)** | ✅ Complete | Atlas schema (7 bi-temporal tables + RLS + canary-row test); Atlas expand-only migration; RLS introspection gate; needs live Postgres (dev cell) for CI |
| **M2-thin Gateway (E27)** | ✅ Complete | 6 seams: Extract (constrained decoding + verifier), Draft, Adjudicate, Embed (FALLBACK), Abduce (FALLBACK), Critique (cross-family); TokenBudgetStore (in-memory); ConnectRPC clients generated for TS+Go |
| **M3-thin Runtime Spine (E28)** | ✅ Complete | ConnectRPC wired end-to-end: Perception→Gateway.Extract (Go); Decision→Gateway.Adjudicate/Draft/Critique (TS); ControlPlane starts AtlasCycle (Temporal); Temporal activities call real gRPC clients |
| **M3-thin Dial Mechanism (E29)** | ✅ Complete | DialLedger (append-only, in-memory), ThreeAxisEvaluator (interface + hardcoded 3-cleared stub), DemoteOnAlert (N=3 alerts OR 1 regret → auto-demote), DialGateEvaluator (orchestrates Cedar + axes + demote), DiffReview parity (Go+TS identical rules), Property tests (escalation requires 3 axes, demote-on-alert fires, safety valve), Security tests (tenant isolation, deny-list non-overridable, IdempotencyKey, RLS, dual-canonical signature) |
| **M3-thin Checkpoint (E30)** | ✅ Committed (1a67785) | All code gates GREEN; **M3-VAL-01 (live Temporal validation) PENDING → MVP RELEASE CANDIDATE BLOCKED** |
| **M4-thin Measurement (E31–E35)** | ✅ Complete | SCM + DML estimators, placeholder conformal (asymptotic normal, candor-floor metadata), EWMA/CUSUM foreign-change detector, QuarantineGuard (auto-quarantine + human override + integrity tags), signed corpus writer (Ed25519 + Postgres schema), Full pipeline REST endpoint (`/measurements/pipeline`), Temporal activity `runMeasurementPipeline`, 82 tests pass, CI step wired |
| **M5-thin Perception Fleet (E36–E38)** | ✅ Complete | Probe scheduler (M×N×K fan-out), 5 SurfaceWorkers (ChatGPT, Perplexity, Gemini, Grok, Claude — ALL synthetic), 7 Connectors (Ahrefs, Semrush, GSC, GA4, CDN, Git, CMS — fixture data), ConsentLedger (founder cohort 3×5 surfaces), RefreshHook (EWMA/CUSUM → Measurement FC detect), KG client (ConnectRPC to Perception.Assert); 30 Go tests pass |

### 1.2 What Genuinely Works (Runnable, Tested)

| System | Verification |
|--------|--------------|
| Contract codegen (TS/Go/Python) | `buf generate` byte-reproducible; all 3 languages compile + type-check |
| Dependency-direction lint | `depcruiser`, `golangci-lint depguard`, `import-linter` — all clean on repo; fixture tests prove rules fire |
| CI gate chain | `pnpm lint` + `pnpm test` = 117 Vitest + 30 Go + 82 Py = 229 tests pass locally |
| Cedar gate (<2ms p99) | `libs/cedar/ts` benchmark test passes on real wasm engine |
| KG assertion view (in-memory) | 13 tests: append candor-gate rejects missing id/tenant/validTime/txTime/provenance; as-of reads respect half-open window; no cross-tenant leakage |
| Conformal candor floor | Every CI response carries `candor_floor: "THIN M4 PLACEHOLDER"` or `method: "placeholder-asymptotic"` |
| Dial mechanism logic | Property tests prove: escalation DENIED if <3 axes; demote ALWAYS allowed; denials recorded in ledger |
| Diff-review parity | Go + TS identical rule set; CI blocker parity verified by property tests |
| WORM signature (Ed25519) | `libs/crypto` deterministic canonicalize (sorted keys, bigint-as-decimal, no whitespace); re-serialized clone re-verifies cross-process |

### 1.3 What Is Mocked / Fixture-Backed / Stubbed / In-Memory

| Component | What's Thin | Thickening Target |
|-----------|-------------|-------------------|
| **Perception Workers (5 surfaces)** | `ChatGPTWorker.Probe()` returns `fmt.Sprintf("ChatGPT response for tenant %s query '%s' sample %d", ...)` — **zero real API calls** | Real HTTP calls to OpenAI/Anthropic/Google/xAI APIs via provider SDKs |
| **Connectors (7)** | Ahrefs/Semrush/GSC/GA4/CDN/Git/CMS all return deterministic fixture maps — **no real SDKs** | Real provider SDKs + OAuth token management |
| **Consent Ledger** | In-memory map with founder cohort fixture (3 tenants × 5 surfaces) | Persistent Postgres + GPG-signed consent records |
| **KG Store** | `InMemoryAssertionStore` (map-based) | Postgres + AGE (`libs/kg` RLS policies ready) |
| **Gateway Embed/Abduce** | Return `SeamStatus.FALLBACK` with metadata note | Real embedding model (OpenAI text-embedding-3-small) + Abduce hypothesis generation |
| **Gateway TokenBudgetStore** | In-memory per-tenant map | Valkey 9.0 (dev cell provisioned) |
| **Dial Ledger** | `InMemoryDialLedger` | Postgres + R2 Object-Lock WORM mirror |
| **ThreeAxisEvaluator** | Hardcoded `AxesCleared=3` (all cleared) | ClickHouse corpus reads: calibration coverage ≥80%, human approval rate ≥70%, pooled overlap ≥0.6 |
| **DemoteOnAlert** | In-memory counter | Persistent alert log (ClickHouse) + regret events from Measurement |
| **R2 Object-Lock Mirror** | Deferred per ADR-0007 §31+37 | `infra/tofu/modules/r2/` implementation |
| **ClickHouse OLAP** | Deferred per ADR-0007 | `infra/tofu/modules/clickhouse/` implementation |
| **Measurement Conformal** | Asymptotic normal approx (z=1.96) + 2× width if n_cal < 30 | Real split-conformal / CV+ on calibration set |
| **Action Service GitHub PR** | Stub returns synthetic URL | Real GitHub App (ghinstallation v2) + Octokit PR creation |
| **Temporal Worker Entry Point** | `services/temporal/src/worker.ts` exists but **no `cmd/*` entry point built** | Go + TS worker binaries with proper deployment config |

### 1.4 What Has Never Been Executed / Validated

| Gap | Blocker |
|-----|---------|
| **Live Temporal server** | Dev cell not deployed → no Postgres for Temporal backend → no Temporal cluster |
| **AtlasCycle end-to-end execution** | Requires live Temporal + all 6 services running + Gateway with LLM keys |
| **Temporal replay (kill worker mid-workflow)** | M3-VAL-01 release gate — **cannot pass without above** |
| **CIO corpus row written to Postgres + signed** | Requires live Postgres (dev cell) + Measurement service running |
| **Dial mechanism with real persistence** | Requires Postgres (dev cell) + R2 mirror (deferred) |
| **Real LLM calls via Gateway** | Requires LLM API keys (OpenAI, Anthropic, Google, xAI) injected as secrets |
| **Real provider API calls (Ahrefs, Semrush, etc.)** | Requires OAuth credentials per provider |
| **Web ↔ Backend integration** | Zero Server Actions, zero TanStack Query mutations, zero fetch calls in dashboard |
| **WorkOS auth flow end-to-end** | Session endpoint returns `user: null`; no protected routes enforced |
| **E2E journey (dev cell apply)** | **Founder-only action**: `gcloud auth application-default login` + `tofu apply` |

### 1.5 What Is Production-Ready (Hard Evidence)

| Artifact | Why |
|----------|-----|
| Contract spine (`@engenox/contracts`) | Single cross-language type source; dependency-direction lint enforced; byte-reproducible codegen; candor-floor tests survive serialization |
| Libs spine (`kg`, `cedar`, `crypto`, `verifier`) | Pure in-process candor gates; all invariants tested as REJECT cases; no external deps except Cedar wasm (pinned) |
| CI gate chain | 8 workflows, `gate-status` aggregator, all green locally; Trivy SBOM + Gitleaks + stack-drift watchdog |
| Terraform dev cell module | Validated `fmt`/`init`/`validate`; 7 provisions match ADR-0003; no AlloyDB/ WarpStream/ Redis-OSS in code |
| Atlas schema + RLS | 7 bi-temporal tables; canary-row regression test (3 tenants + leak payloads); introspection gate fails CI if any scoping table lacks policy |

---

## PART 2 — MVP DEFINITION (FROM REPOSITORY TRUTH)

### 2.1 The MVP Is Finished ONLY When a Founder Can:

1. **Open Engenox** — `web` loads at `localhost:3000`
2. **Sign in** — WorkOS OAuth completes, session persists, `useAuth()` returns real user
3. **Create a company** — Onboarding flow creates tenant + brand card in KG
4. **Configure brand** — BrandCard editor (org, product, queries, competitors) saves to KG
5. **Configure buyer queries** — Query builder creates `BuyerQuery` entities linked to surfaces
6. **Connect required providers** — OAuth flows for Ahrefs, Semrush, GSC, GA4 (minimum); token stored encrypted
7. **Run a real AI visibility scan** — "Scan Now" triggers AtlasCycle via ControlPlane
8. **Query real AI systems** — Perception probes 5 surfaces (ChatGPT, Perplexity, Gemini, Grok, Claude) via real API calls
9. **Store results** — AnswerEvents → Gateway.Extract → SurfaceAssertions written to KG (Postgres+AGE)
10. **Generate real evidence** — Conflicts detected (MISSING/WRONG/STALE/AMBIGUOUS/COMPETITOR_DISTORTION)
11. **Generate interventions** — Decision service runs Adjudicate→Draft→Critique per conflict; proposes `FIX_BRAND_CARD_FIELD` / `INJECT_JSON_LD` / etc.
12. **Review recommendations** — Interventions page shows proposed PRs with diff preview, candor floor (CI always shown), dial level
13. **Run measurement** — After PR merged, Measurement pipeline runs SCM+DML→Conformal→FC→Quarantine→Signed corpus row
14. **View reports** — Report page shows lift with CI, integrity tags, foreign-change status, quarantine decision
15. **Repeat the workflow** — New scan see updated corpus; dial mechanism tracks calibration/approval/overlap

**MVP = Concierge Cohort Ready (Gates C per ADR-0007 §32+36)**
- Self-serve onboarding NOT required
- Founder manually provisions tenant + config for 3-5 pilot brands
- Walking skeleton executes full loop with real AI calls + real measurement

---

## PART 3 — REMAINING EXECUTION PHASES (PRACTICAL, NOT MILESTONES)

```
Phase 0  →  Dev Cell Deploy (Founder action)
Phase 1  →  Infra Bring-Up (Postgres + Temporal + Valkey + Redpanda)
Phase 2  →  Service Bring-Up (Gateway → Perception → Decision → Action → Measurement → ControlPlane → Temporal Worker)
Phase 3  →  Live AtlasCycle Execution + M3-VAL-01 (Release Gate)
Phase 4  →  M6 Web↔Backend Integration (Server Actions + TanStack Query + Real Data)
Phase 5  →  Concierge Cohort Onboarding (3-5 pilot brands)
Phase 6  →  Launch Candidate Validation
Phase 7  →  MVP Launch
```

### Phase Dependency Graph

```
Phase 0 (Founder)
    ↓
Phase 1 (Infra) ───────┐
    ↓                  │
Phase 2 (Services) ←───┘ (all services need infra)
    ↓
Phase 3 (AtlasCycle + M3-VAL-01) ← CRITICAL PATH
    ↓
Phase 4 (Web Integration) ──┐
    ↓                        │
Phase 5 (Cohort) ───────────┘ (can overlap with Phase 4 polish)
    ↓
Phase 6 (Validation)
    ↓
Phase 7 (Launch)
```

---

## PART 4 — EVERY EXECUTION PHASE IN DETAIL

---

### PHASE 0 — DEV CELL DEPLOY (FOUNDER ACTION ONLY)

**Goal:** Deploy the ADR-0003 dev cell to Founder's GCP project  
**Reason:** Unlocks ALL downstream phases — no live Postgres/Temporal/Valkey without this  
**Repository Components:** `infra/tofu/modules/cell/`, `infra/tofu/envs/dev/primary/`  
**Tasks:**

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| F0.1 | Authenticate to GCP | Founder credentials | ADC on disk | — | None | `gcloud auth application-default print-access-token` works | Prerequisite for all infra | ADC exists |
| F0.2 | Phase 1 apply (Google resources) | `infra/tofu/envs/dev/primary/` | GKE cluster, GCS bucket, KMS keyring+KEK, Valkey instance, Redpanda VM | `main.tf`, `providers.tf`, `variables.tf` | F0.1 | `tofu plan` shows 8 resources; `tofu apply` succeeds | Live GCP resources visible in console | All google_* resources created |
| F0.3 | Install CNPG operator | GKE cluster from F0.2 | CNPG CRD + controller running | `scripts/install-cnpg.sh` (create) | F0.2 | `kubectl get crd clusters.postgresql.cnpg.io` exists | Postgres operator ready | CNPG operator pods Running |
| F0.4 | Phase 2 apply (K8s manifests) | kubeconfig from F0.2 | CNPG Cluster, ScheduledBackup, kubernetes_manifest resources | `main.tf` (module.cell), `kubernetes_manifest` blocks | F0.2, F0.3 | `kubectl get cluster -n postgresql` shows Ready; `pg_hba` scram-sha-256 | Live Postgres + AGE + pgvector + RLS | `psql -h <lb> -c "CREATE EXTENSION age; CREATE EXTENSION vector;"` succeeds |

**Parallel Work:** None (Founder serial)  
**Founder-Visible Outcome:** `psql` connects to Cloud SQL Primary; `redis-cli -h <valkey>` pings; GKE nodes healthy  
**Runtime Verification:** `tools/check-age-compat.sh`, `tools/check-cell-plan.sh`  
**Estimated Effort:** 2-4 hours Founder time (depends on GCP quota/project state)  
**Risk Level:** **CRITICAL** — Single point of failure; nothing proceeds without this  
**Can Move After MVP:** No — this IS the M0 deployment event

---

### PHASE 1 — INFRA BRING-UP (ENGINEER, PARALLELIZABLE AFTER PHASE 0)

**Goal:** All substrate services running and healthy  
**Reason:** Every backend service needs Postgres, Temporal, Valkey, Redpanda  
**Repository Components:** `infra/tofu/modules/`, K8s manifests, service configs  

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P1.1 | Deploy Temporal server | Dev cell Postgres | Temporal cluster (1 frontend, 1 history, 1 matching, 1 worker) | `infra/kustomize/overlays/dev/temporal/` (create) | Phase 0 complete | `temporal cluster health` → SERVING; UI at :8233 | Temporal dashboard visible | Temporal cluster HEALTHY |
| P1.2 | Deploy Redpanda | Dev cell VM | Redpanda broker (3 nodes) | `infra/kustomize/overlays/dev/redpanda/` (create) | Phase 0 complete | `rpk cluster health` → OK | Message bus available | Topic `atlas-cycle-events` creatable |
| P1.3 | Verify Valkey 9.0 | Dev cell Memorystore | Valkey endpoint + TLS cert | — | Phase 0 complete | `redis-cli -h <host> -p 6379 --tls --cacert <ca> ping` → PONG | Cache/KV ready | TLS auth works |
| P1.4 | Run Atlas migration | Live Postgres | 7 tables + RLS policies created | `libs/kg/migrations/atlas/0001_initial_schema.sql`, `atlas.hcl` | P1.1 (Postgres ready) | `atlas migrate apply --url <db>` → 1 migration applied; `rls_introspection.py` passes | Schema live | Canary-row test inserts 3 tenants, cross-tenant SELECT returns 0 rows |
| P1.5 | Seed consent fixture | Live Postgres | 3 tenants × 5 surfaces = 15 consent records (RCT_ELIGIBLE) | `datasets/fixtures/consent_founder_cohort.sql` (create) | P1.4 | `SELECT count(*) FROM consents WHERE status='GRANTED'` = 15 | Founder cohort ready for probes | Consent ledger validates probes |

**Parallel Work:** P1.1, P1.2, P1.3 can run simultaneously after Phase 0  
**Founder-Visible Outcome:** `kubectl get pods -A` all Running; Temporal UI shows cluster; Valkey pings; Atlas schema applied  
**Runtime Verification:** `rls_canary_test.py` + `rls_introspection.py` in CI mode against live DB  
**Estimated Effort:** 4-8 hours (mostly waiting for K8s resources)  
**Risk Level:** MEDIUM — K8s resource quotas, CNPG operator version compatibility  
**Can Move After MVP:** No — required for all backend services

---

### PHASE 2 — SERVICE BRING-UP (ENGINEER, DEPENDENCY ORDER)

**Goal:** All 6 backend services + Temporal worker running, healthy, discoverable  
**Reason:** AtlasCycle needs every service callable via gRPC/ConnectRPC  
**Repository Components:** All `services/*/cmd/` or `src/` entry points  

**Dependency Order (must deploy sequentially):**

```
1. Gateway (port 8080) ── needs: Valkey (budget), LLM API keys (secrets)
2. Perception (port 9090) ── needs: Gateway URL, KG (Postgres), Consent (Postgres), Connectors (fixtures OK for now)
3. Decision (port 8082) ── needs: Gateway URL, KG (Postgres)
4. Action (port 9091) ── needs: Gateway URL, Temporal, GitHub App creds, Cedar policies, Dial Ledger (Postgres)
5. Measurement (port 8000) ── needs: Postgres (corpus), ClickHouse (deferred → Postgres OK for thin)
6. Control Plane (port 8081) ── needs: Temporal, all service URLs
7. Temporal Worker ── needs: Temporal, all service clients registered
```

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P2.1 | Deploy Gateway | Phase 1 infra + LLM keys in Vault | Gateway pod Running, `/health` 200, 6 seams registered | `services/gateway/` + K8s Deployment | P1.1, P1.3, Vault secrets | `curl localhost:8080/v1/extract` returns 400 (validates schema) | LLM gateway live | All 6 endpoints respond with SeamStatus (OK or FALLBACK) |
| P2.2 | Deploy Perception | Phase 1 + Gateway URL | Perception pod Running, `ProbeSurface` gRPC works | `services/perception/cmd/main.go` + K8s Deployment | P1.1, P1.3, P1.4, P2.1 | `grpcurl -d '{"tenant_id":"test","surface":1}' localhost:9090 enganox.service.v1.PerceptionService/ProbeSurface` → AnswerEvents | Probe fleet callable | Scheduler fan-out logs M×N×K |
| P2.3 | Deploy Decision | Phase 1 + Gateway URL | Decision pod Running, `ProposeInterventions` gRPC works | `services/decision/src/server/decisionService.ts` + K8s Deployment | P1.1, P1.4, P2.1 | `grpcurl` call with conflictIds → interventions with critiquePassed | Decision engine callable | Adjudicate→Draft→Critique chain executes |
| P2.4 | Deploy Action | Phase 1 + Gateway + Temporal + GitHub App | Action pod Running, `ProposeIntervention` gRPC works | `services/action/main.go` + K8s Deployment | P1.1, P1.4, P2.1, GitHub App installed | `grpcurl` call → proposalId + dial=PROPOSE + ledger entry | Intervention gate live | Cedar gate evaluates; diff-review runs; dial ledger appended |
| P2.5 | Deploy Measurement | Phase 1 + Postgres | Measurement pod Running, `/v1/measurements/pipeline` works | `services/measurement/src/engenox/measurement/main.py` + K8s Deployment | P1.1, P1.4 | `curl -X POST /v1/measurements/pipeline -d @payload.json` → outcomeId + corpusWritten=false (thin) | Measurement pipeline callable | SCM+DML+FC+Quarantine execute; corpus row returned |
| P2.6 | Deploy Control Plane | Phase 1 + Temporal + all service URLs | Control Plane pod Running, `StartAtlasCycle` works | `services/control-plane/src/index.ts` + K8s Deployment | P1.1, P2.1-P2.5 | `grpcurl` StartAtlasCycle → workflowId + runId | Orchestration entrypoint live | Workflow starts in Temporal |
| P2.7 | Build + Run Temporal Worker | All service clients compiled | Worker process Running, polls `atlas-cycle` queue | `services/temporal/src/worker.ts` → compile to binary OR `ts-node` | P1.1, P2.1-P2.6 | Temporal UI shows Worker connected; Activities registered | AtlasCycle executable | Activities execute when workflow started |

**Parallel Work:** P2.1-P2.5 can be built in parallel; deployment must respect dependency order. P2.6 after P2.1-P2.5. P2.7 after P2.6.  
**Founder-Visible Outcome:** `kubectl get pods` all 7 services Running; `grpcurl` health checks pass; Temporal UI shows `atlasCycle` workflow type registered  
**Runtime Verification:** Each service `/health` endpoint + gRPC reflection + one real RPC call  
**Estimated Effort:** 8-16 hours (container builds, K8s deploy, secret injection, debugging connectivity)  
**Risk Level:** HIGH — Distributed system bring-up; network policies, DNS, secret injection, version skew  
**Can Move After MVP:** No — required for walking skeleton

---

### PHASE 3 — LIVE ATLASCYCLE EXECUTION + M3-VAL-01 (RELEASE GATE)

**Goal:** Execute full AtlasCycle end-to-end; verify Temporal replay durability; CIO corpus row written with signature  
**Reason:** **MVP RELEASE CANDIDATE BLOCKED until this passes** (per `docs/_RECOVERY.md:110`)  
**Repository Components:** All services + Temporal worker + Control Plane + Measurement + Action  

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P3.1 | Start AtlasCycle via Control Plane | All services healthy | Workflow runId | `services/control-plane/src/index.ts:startAtlasCycleHandler` | Phase 2 complete | Temporal UI shows workflow Running | First real cycle executing | Workflow starts without error |
| P3.2 | Verify Perception Phase | Workflow running | ConflictIds from 5 surfaces | `services/temporal/src/activities/atlasCycleActivities.ts:runPerceptionPhase` | P3.1 | Temporal UI: Perception activity completes; `probeResp.assertions` non-empty | Real AI surface data flowing | 5 ProbeSurface gRPC calls → Gateway.Extract → KG assertions |
| P3.3 | Verify Decision Phase | Perception done | InterventionIds with critiquePassed | `runDecisionPhase` | P3.2 | Temporal UI: Decision activity completes; interventions have adjudicate/draft/critique | Conflicts → interventions | Adjudicate→Draft→Critique chain per conflict |
| P3.4 | Verify Action Phase | Decision done | ProposalIds (dial=PROPOSE) | `runActionPhase` (stub) | P3.3 | Temporal UI: Action activity completes; DialLedger has entry | Intervention proposals created | DialGateEvaluator logs allow+deny; diff-review runs |
| P3.5 | Verify Measurement Phase | Action done | OutcomeIds | `runMeasurementPhase` | P3.4 | Temporal UI: Measurement activity completes | Lift measurement started | SCM+DML pipeline runs |
| P3.6 | **Kill Worker Mid-Cycle → Verify Replay** | Workflow Running | Workflow recovers + completes | `services/temporal/__tests__/replay.test.ts` | P3.1-P3.5 | `pnpm test:temporal` → replay test passes | **M3-VAL-01 PASSES** | Temporal replay completes workflow from last checkpoint |
| P3.7 | Verify CIO Corpus Row + Signature | Measurement done | Corpus row in Postgres + Ed25519 sig | `services/measurement/src/engenox/measurement/corpus/writer.py` | P3.5 | `SELECT * FROM cio_corpus WHERE outcome_id=...` → row with signature; `libs/crypto` verify passes | **Signed corpus asset exists** | Integrity tags include FC status, quarantine status, candor floor |

**Parallel Work:** P3.1-P3.5 are sequential (workflow phases); P3.6-P3.7 after P3.5 completes  
**Founder-Visible Outcome:** Temporal UI shows completed workflow; `psql` shows corpus row with signature; replay test passes in CI  
**Runtime Verification:** **M3-VAL-01 = ALL OF: P3.1-P3.7 PASS** — this unblocks release candidate  
**Estimated Effort:** 4-8 hours (debugging distributed trace, fixing timeout/serialization issues)  
**Risk Level:** **CRITICAL** — This is the release gate; any failure blocks MVP  
**Can Move After MVP:** No — M3-VAL-01 is a hard release criterion

---

### PHASE 4 — M6 WEB↔BACKEND INTEGRATION (ENGINEER)

**Goal:** Dashboard pages fetch real data, mutations execute Server Actions, TanStack Query manages server state  
**Reason:** Currently 7/7 dashboard pages are static mocks with `onChange={() => {}}`  
**Repository Components:** `web/src/app/(dashboard)/**/*.tsx`, `web/src/lib/api/`, `web/src/components/`  

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P4.1 | API client layer | Service URLs + auth token | `web/src/lib/api/client.ts` with fetch wrappers + TanStack Query hooks | New file | Phase 3 (services live) | `pnpm typecheck` clean | Typed API boundary | All service endpoints have typed hooks |
| P4.2 | Server Actions for mutations | API client | `web/src/lib/actions/*.ts` (createCompany, saveBrandCard, addQuery, connectProvider, runScan, approveIntervention) | New files | P4.1, WorkOS session | Actions return typed results or errors | Mutations work without API routes | `useActionState` hooks in components |
| P4.3 | Dashboard page → real data | P4.1 | `/dashboard/page.tsx` fetches perception summary via `useQuery` | Modify existing | P4.1 | Page loads real `conflictIds` from KG | Real scan status visible | No mock data; loading/error states |
| P4.4 | Perception page → real data | P4.1 | `/dashboard/perception/page.tsx` shows live surfaces, queries, last probe times | Modify existing | P4.1, P4.2 (runScan action) | "Scan Now" triggers ControlPlane.StartAtlasCycle | Founder can trigger real scan | Scan button → workflow starts → status polls |
| P4.5 | Brand Card page → real CRUD | P4.1, P4.2 | `/dashboard/brand-card/page.tsx` loads/saves BrandCard from KG | Modify existing | P4.1, P4.2 | Form fields populate from KG; save → KG write | Brand config persists | All fields (org, product, queries, competitors) editable |
| P4.6 | Interventions page → real data | P4.1 | `/dashboard/interventions/page.tsx` lists proposals from Action service | Modify existing | P4.1 | Shows conflictId, interventionType, dial, diff preview | Review real proposals | Approve/Reject buttons call Action service |
| P4.7 | Report page → real data | P4.1 | `/dashboard/report/page.tsx` reads CIO corpus + lift CI | Modify existing | P4.1, Phase 3 corpus exists | Renders lift with CI, integrity tags, quarantine status | Evidence visible | Candor floor rendered (CI always shown) |
| P4.8 | Settings page → real mutations | P4.1, P4.2 | `/dashboard/settings/page.tsx` tabs functional (brand, queries, consent, dial, integrations) | Modify existing | P4.1, P4.2, provider OAuth configs | OAuth flows for Ahrefs/Semrush/GSC/GA4 initiate | Provider connections manageable | Tokens stored encrypted (libs/crypto) |
| P4.9 | Auth protection + WorkOS session | `auth-provider.tsx` | Real session validation; protected routes redirect to login | Modify existing | WorkOS credentials | `/dashboard/*` redirects unauthenticated → `/login` | Secure access | Session cookie validated via WorkOS JWKS |
| P4.10 | TanStack Query config + error boundaries | P4.1 | Global query client, retry/toast/error UI | `web/src/lib/queryClient.tsx` (create) | P4.1 | Network errors show toast; retry works | Polished DX | Loading skeletons, empty states, error toasts |

**Parallel Work:** P4.1 blocks P4.2-P4.10; P4.3-P4.8 can be done in parallel after P4.1-P4.2  
**Founder-Visible Outcome:** Every dashboard page shows live data; "Scan Now" runs real AtlasCycle; interventions actionable; brand config persists  
**Runtime Verification:** Playwright smoke test: login → dashboard → brand card edit → save → perception scan → interventions list → report  
**Estimated Effort:** 16-24 hours (major frontend integration work)  
**Risk Level:** HIGH — Many moving parts; auth + Server Actions + TanStack Query + real backend = integration surface  
**Can Move After MVP:** **Yes — Phase 4 polish can continue post-launch for concierge cohort**; Minimum for launch: P4.1, P4.2, P4.4 (run scan), P4.6 (view proposals), P4.9 (auth)

---

### PHASE 5 — CONCIERGE COHORT ONBOARDING (FOUNDER + ENGINEER)

**Goal:** 3-5 pilot brands configured, scanned, measured, reported  
**Reason:** MVP = Concierge Cohort Ready (ADR-0007 Gates C)  
**Repository Components:** Operational (no code changes unless bugs found)  

| Task ID | Purpose | Input | Output | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|--------------|--------------|---------------|-----|
| P5.1 | Recruit 3-5 pilot brands | Founder network | Signed LOIs + brand assets | Phase 4 min viable | LOIs collected | Revenue pipeline | 3+ brands committed |
| P5.2 | Provision tenants + brand cards | Pilot brand data | Tenant rows in KG + BrandCard entities | Phase 4 P4.5 | `SELECT * FROM brand_cards WHERE tenant_id IN (...)` | Founder sees real brands in dashboard | 3+ brands configured |
| P5.3 | Connect provider accounts | Pilot OAuth credentials | Ahrefs/Semrush/GSC/GA4 tokens stored | Phase 4 P4.8 | Connectors return real data (not fixtures) | Real SEO/analytics data in KG | All 4 providers connected per brand |
| P5.4 | Run first scans | Configured tenants | AtlasCycle executions per tenant | Phase 3 M3-VAL-01 passed | Temporal UI: 3+ completed workflows | First real AI visibility data | Scans complete without error |
| P5.5 | Review + approve interventions | Scan conflicts | Proposals reviewed, some approved → PRs created | Phase 4 P4.6 | GitHub PRs exist with dial=PROPOSE | Founder sees intervention quality | ≥1 PR merged per brand |
| P5.6 | Measure outcomes | Merged PRs | Measurement pipeline runs, corpus rows written | Phase 3 P3.7 | `cio_corpus` rows with lift CI | First evidence of lift | ≥1 corpus row per brand |
| P5.7 | Deliver report + feedback | Corpus rows | PDF/HTML report + founder debrief | Phase 4 P4.7 | Report renders real lift + candor floor | **MVP value demonstrated** | Pilot brand confirms value |

**Parallel Work:** P5.2-P5.3 per brand in parallel; P5.4-P5.6 sequential per brand  
**Founder-Visible Outcome:** 3+ pilot brands with scans → interventions → measurements → reports  
**Runtime Verification:** Each brand completes P5.2→P5.6 without engineer intervention  
**Estimated Effort:** 2-4 weeks (calendar time; founder-driven)  
**Risk Level:** MEDIUM — Depends on pilot availability, provider OAuth approvals  
**Can Move After MVP:** This IS the MVP definition (Concierge Cohort Ready)

---

### PHASE 6 — LAUNCH CANDIDATE VALIDATION

**Goal:** All release criteria met; no P0 bugs; observability dashboards green  
**Reason:** Final gate before public self-serve (Gates D)  
**Repository Components:** CI gates, observability, runbooks  

| Task ID | Purpose | Input | Output | Verification | DoD |
|---------|---------|-------|--------|--------------|-----|
| P6.1 | Full CI gate chain green on main | All code merged | `gate-status` = success | GitHub Actions: all 8 workflows green | Branch protection passes |
| P6.2 | Load test AtlasCycle | 5 concurrent workflows | p99 latency < 10 min | `scripts/load-test-atlas.sh` (create) | No OOM, no Temporal timeouts |
| P6.3 | Chaos test: kill services mid-cycle | Running workflows | All recover via Temporal replay | `scripts/chaos-kill-service.sh` (create) | Zero data loss; corpus rows consistent |
| P6.4 | Security scan clean | Deployed infra | Trivy 0 HIGH/CRITICAL; Gitleaks 0 secrets | `.github/workflows/security-scan.yaml` | CI gate passes |
| P6.5 | Observability dashboards | Grafana + Tempo + Mimir | Dashboards: AtlasCycle latency, error rate, dial decisions, corpus growth | `infra/kustomize/grafana/dashboards/` (create) | Founder can see system health at a glance |
| P6.6 | Runbook documented | Incident scenarios | `docs/runbooks/*.md` | Founder can follow runbook for top 5 scenarios | Runbooks exist + tested |

**Parallel Work:** All can run in parallel after Phase 5  
**Founder-Visible Outcome:** Green CI, load test report, chaos test report, dashboards live  
**Runtime Verification:** All automated gates pass without human intervention  
**Estimated Effort:** 8-16 hours  
**Risk Level:** LOW (validation only)  
**Can Move After MVP:** P6.2-P6.6 can follow launch; P6.1 is mandatory

---

### PHASE 7 — MVP LAUNCH

**Goal:** Concierge cohort active; system stable; founder can demo end-to-end  
**Reason:** Definition of Done achieved  

| Task ID | Purpose | Verification |
|---------|---------|--------------|
| P7.1 | Final deploy to production namespace | `kubectl -n prod get pods` all Running |
| P7.2 | DNS + TLS configured | `https://engenox.com` loads dashboard |
| P7.3 | Founder records demo video | Video shows: login → brand → scan → intervene → measure → report |
| P7.4 | Pilot brands confirmed active | 3+ brands in dashboard with corpus rows |
| P7.5 | Launch announcement drafted | Ready to send |

**DoD:** All Phase 5 complete + Phase 6 green + P7.1-P7.3 done

---

## PART 5 — TASK BREAKDOWN (EXECUTABLE UNITS)

> **Format:** `TASK-ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD`

### Phase 0 Tasks (Founder)

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| F0.1 | GCP ADC Setup | Founder Google account | `gcloud auth application-default login` succeeds | — | None | `gcloud auth application-default print-access-token` | Unlocks all infra | ADC file exists |
| F0.2 | Phase 1 Terraform Apply | ADC + `infra/tofu/envs/dev/primary/` | GKE, GCS, KMS, Valkey, Redpanda VM | `main.tf`, `providers.tf`, `variables.tf`, `versions.tf` | F0.1 | `tofu apply` exit 0; resources in GCP console | Live GCP resources | 8 google_* resources created |
| F0.3 | CNPG Operator Install | GKE cluster from F0.2 | CNPG CRD + controller | `scripts/install-cnpg.sh` (new) | F0.2 | `kubectl get crd clusters.postgresql.cnpg.io` | Postgres operator ready | Operator pods Running |
| F0.4 | Phase 2 Terraform Apply | kubeconfig + CNPG ready | CNPG Cluster, ScheduledBackup, K8s manifests | `main.tf` (module.cell kubernetes_manifest blocks) | F0.2, F0.3 | `kubectl get cluster -n postgresql` Ready; `psql` connects | Live Postgres+AGE+vector+RLS | Extensions created; RLS policies exist |

### Phase 1 Tasks (Engineer)

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P1.1 | Temporal Server Deploy | Dev cell Postgres | Temporal cluster | `infra/kustomize/overlays/dev/temporal/` (new Kustomize) | Phase 0 | `temporal cluster health` SERVING; UI :8233 | Temporal observable | 4 services Running |
| P1.2 | Redpanda Deploy | Dev cell VM | Redpanda 3-node cluster | `infra/kustomize/overlays/dev/redpanda/` (new) | Phase 0 | `rpk cluster health` OK; topic creatable | Message bus | `rpk topic create atlas-cycle-events` |
| P1.3 | Valkey Verify | Dev cell Memorystore | TLS endpoint + cert | — | Phase 0 | `redis-cli --tls ping` PONG | Cache/KV ready | Auth + TLS works |
| P1.4 | Atlas Migration Apply | Live Postgres | 7 tables + RLS + indexes | `libs/kg/migrations/atlas/0001_initial_schema.sql`, `atlas.hcl` | P1.1 (Postgres) | `atlas migrate apply` 1 applied; `rls_introspection.py` passes | Schema live | Canary-row test: 3 tenants, 0 cross-tenant leaks |
| P1.5 | Seed Founder Consent | Live Postgres | 15 consent records (GRANTED, RCT_ELIGIBLE) | `datasets/fixtures/consent_founder_cohort.sql` (new) | P1.4 | `SELECT COUNT(*) FROM consents WHERE status='GRANTED'` = 15 | Cohort ready | Consent ledger validates probes |

### Phase 2 Tasks (Engineer - Service Bring-Up)

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P2.1 | Gateway Deploy | Valkey + LLM keys (Vault) | Gateway pod :8080 | `services/gateway/` Dockerfile + K8s Deployment | P1.1, P1.3 | `curl /health` 200; 6 endpoints respond | LLM gateway live | All 6 seams return SeamStatus |
| P2.2 | Perception Deploy | Postgres + Gateway URL | Perception pod :9090 | `services/perception/cmd/main.go` Dockerfile + K8s Deployment | P1.3, P1.4, P2.1 | `grpcurl ProbeSurface` → AnswerEvents | Probe fleet callable | Scheduler logs M×N×K fan-out |
| P2.3 | Decision Deploy | Postgres + Gateway URL | Decision pod :8082 | `services/decision/` Dockerfile + K8s Deployment | P1.4, P2.1 | `grpcurl ProposeInterventions` → interventions with critique | Decision engine live | Adjudicate→Draft→Critique chain |
| P2.4 | Action Deploy | Temporal + Gateway + GitHub App + Postgres | Action pod :9091 | `services/action/main.go` Dockerfile + K8s Deployment | P1.1, P1.4, P2.1, GitHub App | `grpcurl ProposeIntervention` → proposalId + dial=PROPOSE | Intervention gate live | Cedar+diff-review+dial ledger |
| P2.5 | Measurement Deploy | Postgres | Measurement pod :8000 | `services/measurement/` Dockerfile + K8s Deployment | P1.4 | `POST /v1/measurements/pipeline` → outcomeId | Measurement pipeline live | SCM+DML+FC+Quarantine execute |
| P2.6 | Control Plane Deploy | Temporal + all service URLs | Control Plane pod :8081 | `services/control-plane/` Dockerfile + K8s Deployment | P1.1, P2.1-P2.5 | `grpcurl StartAtlasCycle` → workflowId | Orchestration entrypoint | Workflow starts in Temporal |
| P2.7 | Temporal Worker Build+Run | All service clients | Worker process on `atlas-cycle` queue | `services/temporal/src/worker.ts` → compile/ts-node | P1.1, P2.1-P2.6 | Temporal UI: Worker connected, activities registered | AtlasCycle executable | Activities execute when workflow starts |

### Phase 3 Tasks (Engineer - M3-VAL-01)

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P3.1 | Start AtlasCycle | All services healthy | Workflow runId | ControlPlane.StartAtlasCycle | Phase 2 | Temporal UI: workflow Running | First real cycle | Workflow starts |
| P3.2 | Verify Perception Phase | Workflow running | ConflictIds from 5 surfaces | `runPerceptionPhase` activity | P3.1 | Activity completes; assertions non-empty | Real AI data flowing | 5 ProbeSurface → Gateway.Extract → KG |
| P3.3 | Verify Decision Phase | Perception done | InterventionIds + critiquePassed | `runDecisionPhase` | P3.2 | Activity completes; critiquePassed=true | Conflicts→interventions |  interventions |
| P3.4 | Verify Action Phase | Decision done | ProposalIds (dial=PROPOSE) | `runActionPhase` | P3.3 | Activity completes; DialLedger entry | Proposals created | DialGateEvaluator logs |
| P3.5 | Verify Measurement Phase | Action done | OutcomeIds | `runMeasurementPhase` | P3.4 | Activity completes | Measurement started | Pipeline runs |
| P3.6 | **Kill Worker → Replay** | Workflow Running | Workflow recovers + completes | `replay.test.ts` | P3.1-P3.5 | `pnpm test:temporal` passes | **M3-VAL-01 PASSES** | Replay completes workflow |
| P3.7 | Verify CIO Corpus + Sig | Measurement done | Corpus row + Ed25519 sig | `corpus/writer.py` | P3.5 | `psql` row exists; `libs/crypto` verify passes | Signed corpus asset | Integrity tags complete |

### Phase 4 Tasks (Engineer - Web Integration)

| Task ID | Purpose | Input | Output | Files | Dependencies | Verification | Founder Value | DoD |
|---------|---------|-------|--------|-------|--------------|--------------|---------------|-----|
| P4.1 | API Client Layer | Service URLs | Typed fetch + TanStack Query hooks | `web/src/lib/api/client.ts` (new) | Phase 3 | `pnpm typecheck` clean | Typed boundary | All endpoints have hooks |
| P4.2 | Server Actions | API client | Mutation actions | `web/src/lib/actions/*.ts` (new) | P4.1, P4.9 | Actions return typed results | Mutations work | `useActionState` in components |
| P4.3 | Dashboard Real Data | P4.1 | Page fetches perception summary | `web/src/app/(dashboard)/dashboard/page.tsx` | P4.1 | Real conflictIds load | Real scan status | No mock data |
| P4.4 | Perception Page + Scan | P4.1, P4.2 | Scan button triggers AtlasCycle | `web/src/app/(dashboard)/perception/page.tsx` | P4.1, P4.2 | "Scan Now" → workflow starts | Founder triggers scan | Polling shows phase progress |
| P4.5 | Brand Card CRUD | P4.1, P4.2 | Load/save BrandCard from KG | `web/src/app/(dashboard)/brand-card/page.tsx` | P4.1, P4.2 | Form populates; save persists | Brand config persists | All fields editable |
| P4.6 | Interventions Real Data | P4.1 | List proposals from Action | `web/src/app/(dashboard)/interventions/page.tsx` | P4.1 | Shows conflictId, type, dial, diff | Review proposals | Approve/Reject buttons work |
| P4.7 | Report Real Data | P4.1 | Read corpus + render lift CI | `web/src/app/(dashboard)/report/page.tsx` | P4.1, Phase 3 | Renders lift + CI + tags | Evidence visible | Candor floor rendered |
| P4.8 | Settings Functional | P4.1, P4.2, OAuth | Tabs mutate real config | `web/src/app/(dashboard)/settings/page.tsx` | P4.1, P4.2 | OAuth flows initiate | Providers connectable | Tokens encrypted |
| P4.9 | Auth Protection | WorkOS creds | Real session validation | `web/src/components/auth/auth-provider.tsx`, `web/src/middleware.ts` (new) | WorkOS | `/dashboard` redirects unauthed | Secure access | Session validated via JWKS |
| P4.10 | Query Client + DX | P4.1 | Global client, errors, loading | `web/src/lib/queryClient.tsx` (new) | P4.1 | Toasts on error; skeletons | Polished DX | Loading/empty/error states |

### Phase 5 Tasks (Founder + Engineer - Concierge Cohort)

| Task ID | Purpose | Input | Output | Dependencies | Verification | DoD |
|---------|---------|-------|--------|--------------|--------------|-----|
| P5.1 | Recruit Pilots | Founder network | 3+ LOIs | Phase 4 min | LOIs signed | 3+ brands |
| P5.2 | Provision Tenants | Pilot data | KG rows | P4.5 | `SELECT * FROM brand_cards` | 3+ brands in dashboard |
| P5.3 | Connect Providers | Pilot OAuth | Real connector data | P4.8 | Connectors return non-fixture | 4 providers/brand |
| P5.4 | Run Scans | Configured tenants | Completed workflows | Phase 3 (M3-VAL-01) | Temporal UI: completed | Scans error-free |
| P5.5 | Approve Interventions | Scan conflicts | PRs created | P4.6 | GitHub PRs exist | ≥1 PR merged/brand |
| P5.6 | Measure Outcomes | Merged PRs | Corpus rows | P3.7 | `cio_corpus` rows | ≥1 corpus row/brand |
| P5.7 | Deliver Reports | Corpus rows | Report + feedback | P4.7 | Brand confirms value | MVP demonstrated |

---

## PART 6 — EXTERNAL SERVICES (WHEN REQUIRED)

| Service | Purpose | When Required | Blocks MVP? | Blocks Current Phase? | Can Continue Locally? | Credentials Required |
|---------|---------|---------------|-------------|----------------------|----------------------|---------------------|
| **GCP** | Dev cell substrate (GKE, GCS, KMS, Valkey, Compute) | **Phase 0** | **YES** | **YES (Phase 0)** | No | Founder: `gcloud auth application-default login`; billing enabled project |
| **OpenAI API** | Gateway: Extract (GPT-5), Draft (Sonnet 5), Critic (GPT-5) | **Phase 2 (P2.1)** | **YES** | **YES (P2.1)** | No — Gateway returns FALLBACK without keys | `OPENAI_API_KEY` in Vault → Gateway env |
| **Anthropic API** | Gateway: Extract (Opus 4.8), Planner (Opus 4.8) | **Phase 2 (P2.1)** | **YES** | **YES (P2.1)** | No | `ANTHROPIC_API_KEY` in Vault |
| **Google AI (Gemini)** | Gateway: Critic (Gemini 3-class), Embed (text-embedding-004) | **Phase 2 (P2.1)** | **YES** | **YES (P2.1)** | No | `GOOGLE_AI_API_KEY` or Vertex credentials |
| **xAI (Grok)** | Gateway: Critic (optional cross-family) | **Phase 2 (P2.1)** | NO (fallback works) | NO | Yes (returns FALLBACK) | `XAI_API_KEY` |
| **GitHub App** | Action Service: PR creation (only external side-effect) | **Phase 2 (P2.4)** | **YES** | **YES (P2.4)** | No — stub returns synthetic URL | App ID, Private Key (PKCS#1/PKCS#8), Installation ID |
| **WorkOS** | Web: Auth (OIDC/SSO, session management) | **Phase 4 (P4.9)** | **YES** | **YES (P4.9)** | Partial — mock session works for UI dev | `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI` |
| **Ahrefs API** | Perception: Backlink/keyword data (Connector) | **Phase 5 (P5.3)** | NO (fixtures work for scan) | NO | Yes — fixtures returned | Ahrefs API token (OAuth) |
| **Semrush API** | Perception: Keyword/traffic data (Connector) | **Phase 5 (P5.3)** | NO | NO | Yes | Semrush API key |
| **Google Search Console** | Perception: Search performance (Connector) | **Phase 5 (P5.3)** | NO | NO | Yes | GSC OAuth2 credentials |
| **Google Analytics 4** | Perception: Traffic data (Connector) | **Phase 5 (P5.3)** | NO | NO | Yes | GA4 Measurement Protocol secret |
| **CDN/Log Provider** | Perception: Edge logs (Connector) | **Phase 5 (P5.3)** | NO | NO | Yes | Provider-specific |
| **Git Provider (GitHub/GitLab)** | Perception: Repo content (Connector) | **Phase 5 (P5.3)** | NO | NO | Yes | Git OAuth token |
| **CMS API** | Perception: Page content (Connector) | **Phase 5 (P5.3)** | NO | NO | Yes | CMS API key |
| **Vault/HSM** | Crypto: KEK for envelope encryption (dual-canonical) | **Phase 1 (P1.4)** for KEK; **Phase 2** for signing keys | YES (production) | NO (ephemeral keys work for dev) | Yes — `ACTION_SIGNING_KEY` env var | GCP KMS keyring + KEK (created in Phase 0) |
| **Cloudflare R2** | WORM mirror (dual-canonical fence 2) | **Thickening (post-MVP)** | NO | NO | Yes — deferred per ADR-0007 | R2 API token + bucket with Object Lock |
| **ClickHouse** | OLAP sink (3-sinks reconciliation) | **Thickening (post-MVP)** | NO | NO | Yes — deferred | ClickHouse Cloud or self-hosted |

**Key Insight:** Only **GCP, OpenAI, Anthropic, Google AI, GitHub App, WorkOS** are **MVP-blocking**. All provider connectors (Ahrefs, Semrush, GSC, GA4, CDN, Git, CMS) can run on fixtures during MVP — real credentials only needed for concierge cohort (Phase 5). R2, ClickHouse, Vault HSM are explicitly deferred per ADR-0007 Thinning Rules.

---

## PART 7 — UI EXECUTION (WHAT REMAINS FOR PRODUCTION POLISH)

### 7.1 Current UI State (Verified)

| Area | Status | Evidence |
|------|--------|----------|
| Design System | ✅ Builds (`tsdown` OK); 27 primitives + 8 patterns | `design-system/dist/` exists; `web` consumes via `transpilePackages` |
| Dashboard Pages | ✅ Exist (7 pages) | `web/src/app/(dashboard)/*/page.tsx` all present |
| Navigation | ✅ Sidebar + mobile drawer | `layout.tsx` |
| Auth UI | ✅ Login page + callback + provider | `web/src/app/(auth)/login/page.tsx`, `auth-provider.tsx` |
| Landing Page | ✅ Exists | `web/src/app/page.tsx` |
| Legal Pages | ✅ Terms/Privacy/Security | `web/src/app/terms/`, `privacy/`, `security/` |

### 7.2 Visual Polish (Not Blocking MVP)

| Item | Current | Target | Effort |
|------|---------|--------|--------|
| Dark mode | Tailwind `dark:` classes exist; no toggle | Toggle in settings + system preference | 2h |
| Loading skeletons | None (spinner only) | Per-component skeletons matching layout | 4h |
| Empty states | Basic text | Illustrated empty states (design-system `EmptyStates` pattern) | 2h |
| Toast/notification | Basic `toaster.tsx` | Rich toasts: success/error/progress with actions | 3h |
| Typography scale | Design-system tokens defined | Consistent application across all pages | 2h |
| Color contrast (AA) | Not audited | Audit + fix violations | 4h |

### 7.3 Interaction (Blocking for Phase 4)

| Item | Current | Required for MVP | Effort |
|------|---------|------------------|--------|
| Server Actions | **None** — all `onChange={() => {}}` | All mutations (save brand, run scan, approve intervention, connect provider) | 16h (P4.2) |
| TanStack Query | Not configured | Data fetching + caching + invalidation | 4h (P4.1, P4.10) |
| Optimistic updates | None | Brand card save, intervention approve | 4h |
| Form validation | None (uncontrolled inputs) | Zod schemas matching contracts | 8h |
| Real-time phase polling | None | AtlasCycle status live updates (Server-Sent Events or polling) | 6h |

### 7.4 Animation (Not Blocking)

| Item | Current | Target | Effort |
|------|---------|--------|--------|
| Page transitions | None | Framer Motion layout animations | 4h |
| Sidebar | CSS transform | Spring animation | 1h |
| Data updates | None | Animate count changes (lift numbers) | 2h |

### 7.5 Accessibility (Blocking for Launch)

| Item | Current | Required | Effort |
|------|---------|----------|--------|
| Keyboard navigation | Partial (native elements) | Full: focus management, skip links, ARIA labels | 6h |
| Screen reader | Not tested | Test with NVDA/VoiceOver; fix labels | 4h |
| Color contrast | Not audited | WCAG AA | 4h (see Visual Polish) |
| Focus indicators | Default browser | Visible custom focus rings | 2h |

### 7.6 Responsiveness (Mostly Done)

| Breakpoint | Status |
|------------|--------|
| Mobile (<640px) | Sidebar drawer works; tables stack |
| Tablet (640-1024px) | Sidebar collapsible; grids 2-col |
| Desktop (>1024px) | Full sidebar; grids 3-4 col |

**Gap:** Some dashboard tables need horizontal scroll or column hiding on mobile (2h)

### 7.7 Performance (Not Blocking MVP)

| Metric | Current | Target | Effort |
|--------|---------|--------|--------|
| Bundle size | Not measured | <200KB JS gzipped | Analyze + code-split |
| LCP | Not measured | <2.5s | Image optimization, font display |
| TTI | Not measured | <3.5s | Reduce main-thread work |

### 7.8 Backend Wiring (THE BLOCKER — Phase 4)

| Page | Current | Required | Tasks |
|------|---------|----------|-------|
| Dashboard | Mock `perceptionData` | Real KG query via TanStack Query | P4.1, P4.3 |
| Perception | Mock `surfaces[]`, `queries[]` | Real connectors + probes + scan trigger | P4.1, P4.2, P4.4 |
| Brand Card | Hardcoded entity + `onChange={() => {}}` | Real CRUD via Server Actions | P4.2, P4.5 |
| Interventions | Mock `proposals[]` + no-op buttons | Real proposals + approve/reject actions | P4.2, P4.6 |
| Report | Mock `report` object | Real corpus query + lift CI rendering | P4.1, P4.7 |
| Competitors | Mock `competitors[]` + no-op clicks | Real KG competitors + detail view | P4.1 (low priority) |
| Settings | All tabs no-op | Real mutations per tab | P4.2, P4.8 |

---

## PART 8 — CUSTOMER JOURNEY MAP

```
Landing
  ↓ (WorkOS OAuth)
Login
  ↓ (First visit → onboarding)
Onboarding (Company + Brand)
  ↓ (Creates tenant + BrandCard in KG)
Brand Configuration
  ↓ (Org, Product, BuyerQueries, Competitors)
Queries & Surfaces
  ↓ (Selects 5 surfaces + adds queries)
Provider Connections
  ↓ (OAuth: Ahrefs, Semrush, GSC, GA4)
AI Visibility Scan ←─────────────────────┐
  ↓ (ControlPlane.StartAtlasCycle)       │
Perception Phase (5 surfaces × queries)  │
  ↓ (Gateway.Extract → KG assertions)    │
Decision Phase (Conflicts → Interventions)│
  ↓ (Adjudicate→Draft→Critique)          │
Action Phase (Dial Gate → PR)            │
  ↓ (Cedar + DiffReview + DialLedger)    │
Measurement Phase (SCM+DML+FC+Quarantine) │
  ↓ (Signed CIO Corpus Row)              │
Report (Lift + CI + Integrity Tags)      │
  ↓                                       │
Repeat Scan ─────────────────────────────┘
```

### Screen-by-Screen Status

| Screen | Current Status | Missing Backend | Missing API | Missing DB | Ready? |
|--------|----------------|-----------------|-------------|------------|--------|
| Landing | ✅ Static | — | — | — | ✅ |
| Login | ✅ WorkOS callback | WorkOS JWKS validation | `/api/auth/session` returns real user | — | ⚠️ |
| Onboarding | ❌ Not built | CreateTenant + CreateBrandCard mutations | Server Actions | `tenants`, `brand_cards` tables | ❌ |
| Brand Config | ✅ UI (mock) | Save BrandCard | Server Action | `brand_cards` (KG) | ❌ |
| Queries | ✅ UI (mock) | Add/Edit BuyerQueries | Server Action | `buyer_queries` (KG) | ❌ |
| Providers | ✅ UI (mock) | OAuth flows + token storage | Server Action | `provider_connections` (encrypted) | ❌ |
| Scan Trigger | ✅ UI (mock button) | `StartAtlasCycle` gRPC | Server Action → ControlPlane | — | ❌ |
| Perception Results | ✅ UI (mock) | Read SurfaceAssertions + Conflicts | TanStack Query hook | `surface_assertions`, `conflicts` | ❌ |
| Interventions | ✅ UI (mock) | Read Proposals + Approve/Reject | Server Actions | `interventions`, `dial_ledger` | ❌ |
| Measurement | ❌ UI (mock report) | Read CIO Corpus | TanStack Query hook | `cio_corpus` | ❌ |
| Report | ✅ UI (mock) | Real corpus + lift CI | TanStack Query hook | `cio_corpus` | ❌ |
| Settings | ✅ UI (mock all tabs) | Real mutations per tab | Server Actions | Various | ❌ |

---

## PART 9 — CRITICAL PATH (DEPENDENCY GRAPH)

```
F0.1 (Founder ADC)
    ↓
F0.2 (Terraform Phase 1: Google resources)
    ↓
F0.3 (CNPG Operator) ←─┐
    ↓                  │
F0.4 (Terraform Phase 2: K8s manifests) ──┤
    ↓                                       │
P1.1 (Temporal) ←──────────────────────────┤  [ALL PARALLEL AFTER F0.4]
P1.2 (Redpanda) ←──────────────────────────┤
P1.3 (Valkey verify) ←─────────────────────┤
P1.4 (Atlas Migration) ←───────────────────┤
P1.5 (Seed Consent) ←──────────────────────┘
    ↓
P2.1 (Gateway) ← needs: P1.3 (Valkey), P1.4 (Postgres), LLM keys
    ↓
P2.2 (Perception) ← needs: P2.1 (Gateway), P1.4 (Postgres KG)
    ↓
P2.3 (Decision) ← needs: P2.1 (Gateway), P1.4 (Postgres KG)
    ↓
P2.4 (Action) ← needs: P1.1 (Temporal), P2.1 (Gateway), GitHub App, P1.4 (Postgres dial ledger)
    ↓
P2.5 (Measurement) ← needs: P1.4 (Postgres corpus)
    ↓
P2.6 (Control Plane) ← needs: P1.1 (Temporal), P2.1-P2.5 URLs
    ↓
P2.7 (Temporal Worker) ← needs: P2.6, all service clients
    ↓
P3.1-P3.5 (AtlasCycle Phases) ← SEQUENTIAL workflow execution
    ↓
P3.6 (Kill Worker → Replay) ← **M3-VAL-01 RELEASE GATE**
    ↓
P3.7 (CIO Corpus + Sig)
    ↓
P4.1 (API Client) ← can start after P2.1 (Gateway URL known)
    ↓
P4.2 (Server Actions) ← needs P4.1, P4.9 (Auth)
    ↓
P4.3-P4.8 (Dashboard Pages) ← PARALLEL after P4.1, P4.2
    ↓
P4.9 (Auth Protection) ← needs WorkOS creds
    ↓
P4.10 (Query Client + DX)
    ↓
P5.1-P5.7 (Concierge Cohort) ← **MVP DEFINITION**
```

### Parallelizable Work Streams

| Stream | Tasks | Can Start After |
|--------|-------|-----------------|
| **Infra** | P1.1, P1.2, P1.3 | F0.4 |
| **Service Build** | P2.1-P2.5 Docker builds | F0.4 (can build before deploy) |
| **Web API Layer** | P4.1 | P2.1 (Gateway URL) |
| **Web Auth** | P4.9 | WorkOS credentials |
| **Concierge Prep** | P5.1 (recruiting) | Anytime (founder-driven) |

### Critical Path Duration (Best Case)

| Phase | Sequential Hours | Calendar Days |
|-------|------------------|---------------|
| Phase 0 (Founder) | 4 | 1 |
| Phase 1 (Infra) | 8 | 1-2 |
| Phase 2 (Services) | 16 | 2-3 |
| Phase 3 (AtlasCycle + M3-VAL-01) | 8 | 1-2 |
| Phase 4 (Web Integration - Min Viable) | 24 | 3-4 |
| **Total to "Scan Works End-to-End"** | **60 hrs** | **8-12 days** |
| Phase 5 (Cohort) | Founder-driven | 2-4 weeks |
| Phase 6-7 (Launch) | 16 | 2-3 days |

---

## PART 10 — THINGS TO REMOVE / DEFER / STOP

### 10.1 Over-Engineering to Remove Immediately

| Item | Location | Why Remove | Migration |
|------|----------|------------|-----------|
| **Redpanda in dev cell** | `infra/tofu/modules/cell/main.tf` (provisioned but disabled) | Interim bus per ADR-0004; not load-bearing until M3; adds VM cost + complexity | Remove from dev cell; keep as graduation target only |
| **ClickHouse module** | `infra/tofu/modules/clickhouse/` (placeholder) | Explicitly deferred per ADR-0007; zero code uses it | Delete directory |
| **R2 module** | `infra/tofu/modules/r2/` (placeholder) | Explicitly deferred per ADR-0007 §37; WORM mirror thickens later | Delete directory |
| **HSM/KEK envelope encryption** | `libs/crypto` (currently Ed25519 only); `services/action/main.go` loads ephemeral key | ADR-0007 Thinning Rule: "WORM signature lands day 1; envelope encryption thickens later" | Keep Ed25519 signing; delete Vault/HSM wiring for now |
| **Valkey CMEK** | Terraform: `google_memorystore_instance` doesn't yet expose CMEK field | WATCHDOG cat-5 flagged; not available in provider | Defer to M1 apply drill; note in README |
| **`libs/seam` package** | Never created (correctly) | Would invert dependency (libs→services forbidden) | Good — don't create |

### 10.2 Implementation Drift to Correct

| Drift | Location | Fix |
|-------|----------|-----|
| Web uses Next.js 15, not 16 | `web/package.json`: `"next": "^15.0.0"` | ADR-0002 requires Next.js 16 at M6; update now or document deferral |
| Design-system TS errors (50+) | `design-system/src/primitives/` | `transpilePackages` bypasses type-check; either fix or isolate in separate build |
| `web/src/app/api/auth/session/route.ts` returns `user: null` | Line 21-24 | Implement real JWT validation via WorkOS JWKS |
| Measurement conformal = placeholder | `services/measurement/.../conformal.py` | Candor floor preserved — **do not "fix" until thickening**; add more explicit `candor_floor` metadata |
| ThreeAxisEvaluator hardcoded 3-cleared | `services/action/internal/ledger/ledger.go` | Correct per ADR-0007 Thinning Rule — mechanism preserved, content thinned |

### 10.3 Tasks to Move AFTER MVP

| Task | Current Phase | Move To | Reason |
|------|---------------|---------|--------|
| R2 Object-Lock WORM mirror | Deferred | Post-MVP thickening | ADR-0007 §37 |
| ClickHouse OLAP + 3-sinks reconciliation | Deferred | Post-MVP | ADR-0007 |
| HSM KEK → DEK envelope encryption | Deferred | Post-MVP | ADR-0007 |
| Valkey CMEK | Deferred | M1 apply drill | Provider limitation |
| Provider connectors (Ahrefs, Semrush, GSC, GA4, CDN, Git, CMS) real SDKs | M5-thin (fixtures) | Phase 5 (cohort) / Post-MVP | Fixtures sufficient for scan mechanics |
| Cross-family Critic: GPT-5 + Gemini 3 simultaneously | M2-thin (one Critic family) | M2-thicken | Single cross-family pair sufficient for MVP |
| Fable 5 for Abduce (high-stakes) | Deferred | Per-tenant opt-in | Cost-watched; not MVP |
| Self-serve onboarding (company creation, invite team, billing) | Not started | Gates D (post-MVP) | MVP = Concierge Cohort |
| WorkOS Organizations/Teams sync | Not started | Post-MVP | Single-tenant per company for MVP |
| Dark mode toggle | Not started | Post-MVP polish | Not blocking |
| Advanced animations (Framer Motion) | Not started | Post-MVP polish | Not blocking |
| Load/chaos testing automation | Phase 6 | Post-launch hardening | Phase 6 validation only |

---

## PART 11 — EXECUTION RULES (PERMANENT)

1. **NEVER declare completion without runtime verification.** Every task DoD includes a verification command that must execute successfully in the target environment.
2. **NEVER introduce new architecture unless repository requires it.** The frozen blueprint (docs 00-27) + ADRs are the architecture. Implementation follows — it does not lead.
3. **NEVER weaken acceptance criteria.** If a gate fails, fix the implementation — don't lower the gate.
4. **NEVER create hidden technical debt.** Every thinning decision must be documented in the recovery tracker with `VALIDLY_DEFERRED` or `CANDOR_FLAGGED` tag. No silent TODOs.
5. **EVERY phase must produce founder-visible progress.** No "refactoring" phases. Every phase ends with something the founder can see/click/measure.
6. **EVERY phase must be runnable.** No "design" phases that produce only diagrams. Code or infra that executes.
7. **EVERY phase must be demoable.** At phase end, Founder can run a command or click a button and observe the outcome.
8. **EVERY phase must end with executable verification.** A script, test, or CLI command that returns exit code 0 iff the phase is truly complete.
9. **FOUNDER ACTIONS ARE EXPLICIT.** Tasks requiring Founder credentials (GCP ADC, OAuth approvals, GitHub App install) are marked `FOUNDER` and cannot be delegated.
10. **CANDOR FLOOR IS NON-NEGOTIABLE.** Every lift number renders with CI. Every intervention shows dial level. Every corpus row carries integrity tags. No exceptions.

---

## PART 12 — MASTER EXECUTION PLAN

```
TODAY (2026-07-16)
│
├─► F0.1  Founders: gcloud auth application-default login          [~15 min]
├─► F0.2  Founders: cd infra/tofu/envs/dev/primary && tofu init && tofu apply (phase 1)  [~30-60 min]
├─► F0.3  Engineer: Install CNPG operator on new GKE               [~15 min]
├─► F0.4  Founders: tofu apply (phase 2: K8s manifests)            [~10-20 min]
│
├─► P1.1-P1.5  Engineer: Temporal + Redpanda + Valkey + Atlas + Consent  [Parallel, ~4-8 hrs]
│
├─► P2.1  Gateway (needs LLM keys in Vault)                        [~2 hrs]
├─► P2.2  Perception                                               [~1 hr]
├─► P2.3  Decision                                                 [~1 hr]
├─► P2.4  Action (needs GitHub App installed)                      [~2 hrs]
├─► P2.5  Measurement                                              [~1 hr]
├─► P2.6  Control Plane                                            [~1 hr]
├─► P2.7  Temporal Worker (build + run)                            [~2 hrs]
│
├─► P3.1-P3.5  Engineer: Execute AtlasCycle, verify each phase     [~2-4 hrs]
├─► P3.6  **M3-VAL-01: Kill worker → verify replay**               [~1 hr]
├─► P3.7  Verify CIO corpus row + Ed25519 signature                [~30 min]
│           │
│           ▼ **MVP RELEASE CANDIDATE UNBLOCKED**
│
├─► P4.1  API Client + TanStack Query                              [~2 hrs]
├─► P4.2  Server Actions (mutations)                               [~4 hrs]
├─► P4.9  WorkOS Auth Protection                                   [~3 hrs]
├─► P4.4  Perception Page + Scan Button                            [~3 hrs]
├─► P4.6  Interventions Page (approve/reject)                      [~3 hrs]
├─► P4.3, P4.5, P4.7, P4.8, P4.10  Parallel polish                 [~8 hrs]
│
├─► P5.1-P5.7  Founder: Concierge Cohort (3-5 brands)              [2-4 weeks calendar]
│
├─► P6.1-P6.6  Launch Validation                                   [~1 day]
│
└─► P7.1-P7.5  MVP LAUNCH
```

### Phase Milestones with Founder-Visible Outcomes

| Milestone | Target Date | Founder Sees | Verification |
|-----------|-------------|--------------|--------------|
| **Dev Cell Live** | Day 1 | GCP Console: GKE, Postgres, Valkey, KMS | `psql` connects; `redis-cli` pings |
| **Infra Ready** | Day 2 | Temporal UI :8233; Redpanda topic; Atlas tables | `temporal cluster health`; `rls_introspection.py` |
| **Services Up** | Day 4 | `kubectl get pods` all 7 Running; gRPC health checks | `grpcurl` each service |
| **AtlasCycle Walks** | Day 5 | Temporal UI: workflow COMPLETED; 4 phases green | P3.1-P3.5 complete |
| **M3-VAL-01 PASSES** | Day 5-6 | Replay test passes in CI; Corpus row in `psql` | `pnpm test:temporal` exit 0 |
| **Scan from Dashboard** | Day 9-10 | Click "Scan Now" → watches phases → sees interventions | Playwright E2E passes |
| **Concierge Cohort Active** | Week 3-5 | 3+ brands in dashboard with scans + reports | P5.7 complete |
| **LAUNCH** | Week 5-6 | Public URL + demo video | P7.1-P7.5 |

---

## PART 13 — FINAL CTO VERDICT

### 1. Is the architecture still correct?

**YES.** The frozen blueprint (docs 00-27) + 4 ADRs + ADR-0007 execution ordering remain sound. The two-spine architecture (bi-temporal KG + CIO corpus) with six bounded LLM seams + Temporal-owned loop + Cedar-gated Action boundary is the right architecture. The thin-column-then-thicken strategy (ADR-0007) correctly preserves all 12 architectural invariants while deferring scale/content/cadence.

**Evidence:** Every gate mechanism (Cedar, diff-review, dial, idempotency, RLS, candor floor) is implemented and tested. The contract spine is the single cross-language type source. Dependency direction is enforced. Gateway is leaf-only. Temporal owns the loop state. No agent framework as spine.

### 2. Would you change the execution order?

**MINOR ADJUSTMENT:** Move **P4.9 (WorkOS Auth Protection)** earlier — to **parallel with P2.1** or immediately after. Currently it's in Phase 4, but auth is needed for any real web↔backend integration. Doing it earlier unblocks P4.1-P4.8 development against real sessions.

**REASON:** The auth provider stub returns `user: null`; all dashboard pages currently work because they don't actually fetch data. Once P4.1 connects to real APIs, auth becomes a hard dependency.

**Otherwise:** The Phase 0→1→2→3→4→5→6→7 order is correct. The critical path (Dev Cell → Temporal → AtlasCycle → M3-VAL-01) cannot be reordered.

### 3. What should stop immediately?

| Item | Reason |
|------|--------|
| **Any new milestone planning** | ADR-0007 authorizes thin-column-then-thicken; no more milestone docs |
| **Design system TypeScript error fixes** | 50+ errors in primitives; web builds via `transpilePackages` bypass. Fix only when blocking a real component. |
| **R2 / ClickHouse / HSM infrastructure code** | Explicitly deferred per ADR-0007. Delete placeholder modules. |
| **Provider connector real SDKs** | Fixtures work for scan mechanics. Real OAuth only for Phase 5 cohort. |
| **Conformal calibrator "fixes"** | Placeholder is honest (candor floor metadata present). Real implementation = thickening pass. |
| **ThreeAxisEvaluator "real" implementation** | Hardcoded 3-cleared IS the M3-thin mechanism per ADR-0007 Thinning Rule. |

### 4. What should begin immediately?

1. **F0.1-F0.4 (Founder Dev Cell Deploy)** — **Single blocker for everything**
2. **P1.1-P1.5 (Infra Bring-Up)** — Can start the moment F0.4 completes
3. **P4.9 (WorkOS Auth)** — Start in parallel with P2.1; unblocks all web integration
4. **P5.1 (Pilot Recruitment)** — Founder can start today; 2-4 week lead time

### 5. Single Highest-Risk Item

**M3-VAL-01 (Live Temporal Validation / AtlasCycle Replay)**

- **Why:** Hard release gate. Requires: Dev Cell deployed + Temporal running + All 6 services healthy + Worker process + Full workflow execution + Kill/Recovery test.
- **Failure modes:** Temporal connectivity, gRPC timeouts, activity serialization, idempotency key collisions, signature verification, Postgres lock contention.
- **Mitigation:** Run Phase 2 service bring-up with integration smoke tests (gRPC call each service) BEFORE attempting full AtlasCycle. Invest in observability (OTel traces across all services) early.

### 6. Single Biggest Opportunity to Accelerate Launch

**Parallelize Phase 2 Service Deployment with Phase 4 Web Integration Prep**

- While services are being containerized/deployed (P2.1-P2.7), **simultaneously** build:
  - P4.1 (API Client + TanStack Query hooks) — only needs service URLs (known from K8s service names)
  - P4.9 (WorkOS Auth) — independent of backend
  - P4.2 (Server Actions scaffolding) — can mock responses initially
  - P5.1 (Pilot Recruitment) — Founder-driven, zero engineering cost

This overlaps ~16 hours of service bring-up with ~16 hours of web prep, saving **2-3 calendar days**.

### 7. If You Owned Engenox, Would You Execute This Exact Roadmap?

**YES — with the two adjustments above (P4.9 earlier; parallelize Phase 2+4).**

**Why:**
- The enforcement environment is genuinely excellent (best I've seen in a pre-launch codebase)
- The thin-column implementation is honest — every gate mechanism exists and is tested; only content/scale/cadence are thinned
- The contract spine + dependency-direction lint prevents the type-drift that kills polyglot projects
- M3-VAL-01 is a genuine release criterion, not theater — Temporal replay durability is the architectural differentiator
- Concierge Cohort MVP scope is achievable and commercially meaningful

**The only existential risk is Founder Dev Cell Deploy (F0.1-F0.4).** Everything else is engineering execution on a verified foundation. If the Founder deploys the dev cell this week, **MVP launch in 6-8 weeks is realistic**. If dev cell stalls, everything stalls.

---

## APPENDIX: VERIFICATION COMMANDS REFERENCE

```bash
# Phase 0
gcloud auth application-default print-access-token
cd infra/tofu/envs/dev/primary && tofu init && tofu apply

# Phase 1
kubectl get pods -A
temporal cluster health
rpk cluster health
redis-cli -h <valkey> -p 6379 --tls --cacert <ca> ping
atlas migrate apply --url "postgres://..."
python -m pytest libs/kg/test/rls_introspection.py -v

# Phase 2 (per service)
kubectl get pods -n engels
grpcurl -plaintext localhost:9090 enganox.service.v1.PerceptionService/ProbeSurface
grpcurl -plaintext localhost:8082 enganox.service.v1.DecisionService/ProposeInterventions
grpcurl -plaintext localhost:9091 enganox.service.v1.ActionService/ProposeIntervention
curl localhost:8000/health
grpcurl -plaintext localhost:8081 enganox.service.v1.ControlPlaneService/StartAtlasCycle

# Phase 3
# Via ControlPlane gRPC or Temporal UI
pnpm --filter @engenox/temporal test:replay  # M3-VAL-01

# Phase 4
pnpm --filter @engenox/web typecheck
pnpm --filter @engenox/web test:e2e  # Playwright

# All Phases
pnpm lint && pnpm test  # Full CI gate chain locally
```

---

**END OF BLUEPRINT**

*This document is the single execution authority until MVP launch. Update only via ADR or explicit phase completion checkpoint in `docs/_RECOVERY.md`.*