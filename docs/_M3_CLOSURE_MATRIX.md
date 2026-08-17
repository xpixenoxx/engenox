# M3 Closure Matrix — Internal Execution Control

**Source of truth:** `docs/25_IMPLEMENTATION_PLAN.md` §3 (M3 deliverables), `docs/26_MVP_SCOPE.md` §2.3, `docs/12_AGENT_ARCHITECTURE.md` §3-7, `docs/15_SECURITY_ARCHITECTURE.md` §5, `docs/09_BACKEND_ARCHITECTURE.md` §2-6, ADR-0007 §27-32.

**Legend:**
- 🟢 **VERIFIED_COMPLETE** — Implementation body + tests + gates pass
- 🟡 **PARTIAL** — Correct signatures + real gRPC wiring, but activity bodies are stubs
- 🔴 **STUB_SYNTHETIC** — Mechanism exists in type/flow but returns hardcoded success/fake IDs
- ⚫ **MISSING** — Required by MVP M3, no implementation
- ⚪ **VALIDLY_DEFERRED** — Explicitly deferred by MVP scope or accepted ADR
- 🟣 **BLOCKED_BY_FOUNDER** — Requires founder-only creds/action

---

| # | M3 Requirement | Authoritative Ref | MVP Depth Required | Current Evidence | Classification | Blocks M3? | Closure Work |
|---|---|---|---|---|---|---|---|
| 1 | Temporal AtlasCycle workflow | 25 §3 M3, ADR-0007 #4 | Typed plan DAG via activities; Perception→Decision→Action→Measurement phases | `services/temporal/src/workflows/atlasCycle.ts` — real gRPC calls to perception/decision/action/measurement activities | 🟢 VERIFIED_COMPLETE | No | — |
| 2 | Temporal InterventionSaga workflow | 25 §3 M3, ADR-0007 #4 | Allow-list → diff-review → Cedar 2-pass → dial@propose → GitHub PR (idempotent) | `workflows/interventionSaga.ts` — correct flow, calls actionActivities | 🟡 PARTIAL | **Yes** (activities are stubs) | Implement real action activities |
| 3 | Decision Planner/Critic orchestration | 25 §3 M3, 12 §2-3 | Adjudicate→Draft→Critique per conflict; typed plan DAG; cross-family Critic | `services/decision/src/server/decisionService.ts` — real gateway-client calls | 🟢 VERIFIED_COMPLETE | No | — |
| 4 | Gateway six seams (Extract/Draft/Adjudicate/Embed/Abduce/Critique) | 25 §3 M2, 26 §2.2, 11 §3 | Constrained decoding + verifier re-grounding + FALLBACK status + cross-family Critic | `services/gateway/src/seams/*.ts` — all 6 implemented | 🟢 VERIFIED_COMPLETE | No | — |
| 5 | **Action service boundary** (Go, GitHub-App + Vault) | 25 §3 M3, 15 §5e, 09 §6 | ONLY external side-effect boundary; holds GitHub credential; no LLM commits | `services/action/.keep` ONLY | ⚫ MISSING | **YES** | Create `services/action/` Go service |
| 6 | Per-tenant allow-list-glob evaluation | 25 §3 M3, 15 §5a, 12 §3 | Structural floor: allow-list tenant-scoped, deny-list non-overridable, defaults empty | `actionActivities.ts:23` — `allowed: true` hardcoded | 🔴 STUB_SYNTHETIC | **YES** | Real glob matching in Action svc |
| 7 | Rule-based diff-review blocker (NO LLM) | 25 §3 M3, 15 §5b, 09 §6 | P0 gate: no external URLs, no redirect chains, no package.json/scripts, scope to target_surface | `actionActivities.ts:38-66` — rules exist but run on JSON.stringify(params), not actual diff | 🔴 STUB_SYNTHETIC | **YES** | Real diff parsing + rule engine |
| 8 | Blast-radius bands + Cedar two-pass gate | 25 §3 M3, 15 §5c, 12 §3-4, 09 §6 | Cedar 2-pass: structural + isAuthorized; (dial, blast_radius) → permit/deny; <2ms p99 | `actionActivities.ts:75-95` — stub returns `authorized: true` + fake audit trail | 🔴 STUB_SYNTHETIC | **YES** | Wire real Cedar from libs/cedar |
| 9 | Autonomy dial ledger + three-axis escalation | 25 §3 M3, 26 §4, 12 §5, 15 §6 | Three axes: calibration coverage, human-approval rate, pooled overlap; escalation DENIES if <3 axes; ledger records REFUSED not erased | `libs/cedar` has `InMemoryDialLedger` + policy; `actionActivities.ts:74` hardcodes `DialDecision.PROPOSE` | 🟡 PARTIAL (lib exists, not wired) | **YES** | Wire ledger writes; evaluate 3 axes |
| 10 | Signed intervention manifest (Action layer) | 25 §3 M3, 15 §5d, 06 §2.4 | Manifest: patch + inverse patch + policy chain + Critic verdict + CI; signed per-tenant key | Not implemented | ⚫ MISSING | **YES** | Generate + sign in Action svc |
| 11 | Pre-staged rollback hash (R2 Object-Lock) | 25 §3 M3, 15 §5d, 12 §7 | Signed-inverse diff computed and stored BEFORE PR merges; mechanical rollback | Not implemented | ⚫ MISSING | **YES** | Compute + store in Action svc |
| 12 | Action service gRPC contract (ProposeIntervention) | 25 §3 M3, action.proto | `ProposeIntervention` → PR URL + dialDecision + cedarAudit + diffReview | Contract exists in `pkg/contracts/proto/.../action.proto` | 🟢 VERIFIED_COMPLETE | No | — |
| 13 | IdempotencyKey on every external activity | CLAUDE.md §8, 09 §2, 25 §3 | Typed IdempotencyKey derived from (tenant,cycle,intervention,activity); CI-blocked if missing | Signatures present in activities; implementations ignore/都在使用 | 🟡 PARTIAL | **YES** | Enforce in Action svc + tests |
| 14 | Demote-on-alert (Cedar + dial ledger) | 25 §3 M3, 12 §7, 15 §6 | N alerts OR 1 regret in window → auto-demote; ledger records `auto_demoted` | Not implemented | ⚫ MISSING | **YES** | Implement in Cedar policy + ledger |
| 15 | Temporal replay/durability/DR proof at MVP depth | 25 §3 M3, 09 §2, ADR-0007 | Workflow state survives worker crash; activities retry with IdempotencyKey; no data loss | Worker starts; no replay test | ⚫ MISSING | **YES** | Add replay test + durability verification |
| 16 | M3 property tests (diff-review parity, Cedar <2ms, escalation-3-axes) | 23 §3m, 23 §3n, CLAUDE.md §8 | CI tests: diff-review parity w/ CI blocker; Cedar p99<2ms; escalation requires 3 axes | Cedar benchmark exists in libs/cedar; no diff-review parity test; no escalation test | 🟡 PARTIAL | **YES** | Add missing property tests |
| 17 | M3 integration tests (AtlasCycle dry-run) | 25 §3 M3 | Deterministic fixtures → typed plan DAG + Critic verdict + propose PR preview + rollback-hash | No integration test file | ⚫ MISSING | **YES** | Create integration test |
| 18 | M3 boundary tests (gateway-leaf-only, no-cross-service-internal) | 24 §4, CLAUDE.md §7 | Lint gates enforce boundaries | Gates exist (E23 verified) | 🟢 VERIFIED_COMPLETE | No | — |
| 19 | M3 security tests (RLS, Cedar, diff-review) | 23 §3, 15 §3-5 | Canary-row, Cedar authz, diff-review blocker | M1/M2 security tests exist; M3-specific missing | 🟡 PARTIAL | **YES** | Add M3 security tests |
| 20 | GitHub App credential in Vault (not in code) | 15 §5e, 08 §4 | Per-tenant install credential, envelope-encrypted, never in env var | Not implemented | ⚫ MISSING | **YES** | Implement in Action svc |

---

## Blocking Cluster Summary

**Primary Blockers (must close for M3):**
- #5 Action service missing entirely → blocks #6, #7, #8, #10, #11, #13, #14, #20
- #6 Allow-list glob hardcoded → fails MVP structural floor
- #7 Diff-review runs on params not diff → fails P0 gate
- #8 Cedar stubAlwaysAllow + fake audit → fails Security closure autonomous-action half
- #9 Dial ledger not wired + 3-axis not evaluated → fails MVP autonomy mechanism
- #10/11 Manifest + rollback-hash missing → fails Action spine invariants
- #13 IdempotencyKey not enforced → fails CI watchdog
- #14 Demote-on-alert missing → fails autonomous-action gate
- #15 No Temporal replay evidence → fails independent deployability
- #16/17/19 Missing M3-specific tests → fails Definition of Done

**Verified Complete (preserve):**
- #1, #3, #4, #12, #18

**Validly Deferred (NOT M3):**
- Full GitHub App installation flow (M4+ thickening)
- R2 Object-Lock WORM mirror for manifest (thickening; signature writes day 1 per ADR-0007 invariant 11)
- FalkorDB graduation, Debezium→Redpanda, full AGE/pgvector (ADR-0007 thinning)
- `execute-with-approval`/`guarded`/`autonomous` dial levels (P2.1 per 26 §3)

---

## Execution Order (Dependency-Aware)

1. **Create `services/action/` Go service** — implements ActionService gRPC, holds GitHub App cred, Cedar gate, diff-review, allow-list, manifest, rollback-hash, dial ledger
2. **Regenerate contracts** — `buf generate` (Action service types)
3. **Wire `actionActivities.ts` + `interventionSagaActivities.ts` → Action service gRPC client**
4. **Implement three-axis escalation + dial ledger writes** in Action service
5. **Add signed manifest + pre-staged rollback-hash** in Action service
6. **Add Temporal replay/durability test** (kill worker mid-workflow, verify recovery)
7. **Add M3 property tests** (diff-review parity, Cedar <2ms, escalation-3-axes)
8. **Add M3 integration test** (AtlasCycle dry-run against fixtures)
9. **Add M3 security tests** (RLS not applicable here; Cedar authz, diff-review blocker)
10. **Run full gate chain** — verify all green

---

*This matrix is the execution control mechanism. Do not classify from filenames, TODOs, or test names alone — inspect implementation bodies. A test passing against a fake gate proves the fake gate works; it does not prove the required gate exists.*