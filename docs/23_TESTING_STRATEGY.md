# 23 — Testing Strategy

> **Status: FROZEN.** The pyramid + the closed-loop-specific test surfaces: the unit / integration / e2e base (Vitest + Go test + pytest + Playwright), the **closed-loop invariant tests** that encode the architecture's invariants as executable assertions — RLS canary-row, idempotency re-execution, the dial property tests, the verifier-reject path, the foreign-change-quarantine path, the budget-exhausted `PlanNotGuess`, the golden-probe regression suite (frozen fixtures over pipeline behavior, not surface outputs so it doesn't rot), the three-sinks reconciliation test, the R2 restore test, the warm-canary-vs-LLM-path eval divergence, the chaos practice, and the test gate-enforcement (CI-blocked, per `17` §4). Authored against `_FOUNDATION_CRITIQUES.md` (the QA critique — idempotency + restore-test + RLS-introspection P0/P1), `09_BACKEND_ARCHITECTURE.md`, `12_AGENT_ARCHITECTURE.md`, `17_DEPLOYMENT.md`, and `22_CODING_STANDARDS.md`. **The closed loop's invariants are not trusted by inspection; they are tested by executable assertions that failing-vote the build.**

---

## 1. The single rule

**Every non-negotiable invariant in the blueprint has a test that fails the build if the invariant breaks.** The QA critique's P0 was "an external-side-effect activity without a passing idempotency test is CI-blocked"; the rule generalizes: RLS without a canary-row test is CI-blocked; a dial-escalation without the three-axis property test is CI-blocked; an LLM seam without a verifier-reject test is CI-blocked; a regression suite that rots when Gemini changes is a *design* failure (the golden-probe fixtures assert on pipeline behavior, not surface outputs). The tests are the architecture's executable form; `17` §4's gate chain is the enforcement.

This section defines the pyramid, the invariant tests (tied to the docs they protect), the eval surfaces, the chaos practice, and the gate posture.

---

## 2. The test pyramid

```
                    ┌──────────┐
                    │   E2E    │  Playwright (the <10-minute journey, the 1-click PR,
                    │ (few)    │  the candor report render) — `10` §9
                    └────┬─────┘
                  ┌──────┴──────┐
                  │ Integration │  Vitest (TS) / go test (Go) / pytest (Python) —
                  │  (many)     │  closed-loop dry-run against fixtures + the contract stubs
                  └──────┬──────┘
                ┌────────┴────────┐
                │     Unit        │  per-function, typed, behavior-not-implementation
                │  (legion)       │
                └─────────────────┘
                ┌─────────────────┐
                │  Property / fuzz │  the invariants-as-properties (the dial, the idempotency,
                │   (selective)    │  the verifier-reject, the budget gate)
                └─────────────────┘
```

- **The pyramid is steep** — the legion of unit tests + the many integration tests is the floor; the e2e is the apex. The closed-loop's complexity + the bi-temporal model's invariants mean the *unit* layer carries the load (a test for `assertion_view`'s `as_of` slice is a unit test, not an integration test); the e2e is reserved for the journey, not for exercising the closed loop's every branch.
- **Property/fuzz tests** are selectively used where the invariant is a property (the dial, the idempotency key, the verifier-reject), not where it's an example (the journey).

---

## 3. The closed-loop invariant tests (the architecture as executable assertions)

Each invariant below is a test (or test cluster), a CI-blocked gate, tied to the doc section it protects.

### (a) RLS + cross-tenant isolation (`15` §3)
- **Schema introspection:** every scoping-required table has an RLS policy (CI assertion against `pg_policies`).
- **Canary-row:** `canary_a` inserts a known row into every tenant-scoped table; `canary_b` queries every table; asserts zero rows from `canary_a` visible.
- **The SUPERUSER lint:** no SUPERUSER/BYPASSRLS role granted to the app pool.
- **The cache-namespace fuzz:** random `(session_tenant, requested_key_tenant)` pairs rejected on mismatch.

### (b) Idempotency (`09` §2, `15` §5e)
- **Re-execution test:** every external-side-effect activity (PR-creation, webhook-out, CMS-edit, dial-change, escalation-grant) is re-executed with the same `IdempotencyKey`; the second execution asserts no duplicate side-effect (one PR, one webhook sent, one alert). **A PR-creating activity without this test is CI-blocked.**
- **The lease test:** a Temporal-activity retry (the worker died mid-activity) with the same key produces exactly-once.

### (c) The dial property tests (`12` §5, §7)
- **Escalation requires all 3 axes:** property-test generates random ledger states across the three axes; the escalation decision is granted only when all three pass; a single failing axis denies + the missing axes are listed.
- **Demotion-on-alert:** N alerts in the window → drop one level; 1 confirmed regret → drop one level; a property test across alert/regret histories asserts the dial-level transitions.
- **The default is `propose`:** a fresh tenant's dial is `propose` across every surface; no escalation-on-create.
- **The deadlock auto-demotion:** at `≥execute-with-approval`, a Planner/Critic deadlock auto-demotes to `propose` for the cycle (the no-LLM-tiebreaker rule, `12` §9).

### (d) The verifier-reject path (`11` §2c)
- **Ungroundable outputs are rejected + bounded re-attempt (≤2) + `null` on persistence:** a fixture seam call returning a `subject_id` that doesn't dereference is rejected by the verifier; the re-attempt with a tightened prompt is exercised; the persistent-ungroundability returns `null`; the caller degrades to the symbolic path.
- **The Draft verifier-reject:** >K ungrounded claims rejects the whole draft + re-rewrite.
- **The Adjudicate-constrained-choice:** an Adjudicate seam emitting a `ConflictType` not in the Reconciler-enumerated set is rejected.

### (e) The foreign-change quarantine (`12` §8)
- `EWMA/CUSUM` flags a measurement window as `period-invalid` → `InterventionSaga` quarantines the outcome (no regret recorded, no auto-demote, the causal scorer downweights or excludes); a property test across the `(foreign_change_status, lift_signal)` matrix asserts the quarantine / downweight behavior.
- `confirmed-bump + negative lift` → recorded but downweighted (the partialling-out via the SCM's surface-dynamics model).

### (f) The budget-exhausted `PlanNotGuess` (`11` §2d)
- The gateway's per-tenant token budget counter hitting zero with a request in-flight → the gateway returns HTTP 429 + the `PlanNotGuess` payload + the caller degrades to the symbolic-only path. The test sets the budget to a known low value + asserts the structured error.
- **The weighted-fair test:** a low-budget tenant's small call is served before a high-budget whale's next call (the deficit-round-robin behavior).

### (g) The golden-probe regression suite (`11` §7, `21` §5)
- **Frozen fixtures over golden probe scenarios.** The assertions are over the **pipeline behavior**, not the surface outputs (so the suite doesn't rot when Gemini changes its answer shape): "given these `AnswerEvent`s, the Diagnose emits a `KnowledgeConflict` of type `BrandTruthMismatch` with these load-bearing surfaces; the Critic's surviving objections are these; the ScoreAndPlan emits an `ActionRecord` with predicted-uplift in `[…]`."
- A surface-shape change (Gemini's output format bumps) may require a fixture refresh, but the *assertions* over pipeline behavior don't. **The anti-rot design** is that the fixtures' "expected" is the *behavioral transformation* of the inputs, not the inputs themselves.
- The fixtures refresh quarterly + on detected surface-shape changes (EWMA/CUSUM, `12` §8).

### (h) The three-sinks reconciliation (`08` §5, `14` §3)
- A nightly integration test samples N `event_id`s from Postgres, fetches each from ClickHouse/FalkorDB/Qdrant, asserts content + integrity tags + provenance agree; drift triggers a targeted replay.
- The **byte-count checksum** per tenant per day catches dropped events when content but not count agrees.
- A dropped-event fixture (assertion in Postgres, missing in ClickHouse) is the canary of the reconciliation.

### (i) The R2 restore test (`08` §4, `15`)
- The quarterly restore job (the systematic, not-hoped-for verification): restore last week's corpus from R2 Object-Lock, replay the signatures, verify against the Postgres manifest. **The audit promise is unverified until restored;** this test is the verification.
- An integration variant runs in stage on every release (a smaller restore scope) + a quarterly full restore in prod.

### (j) The warm-canary eval-divergence (`11` §6)
- The daily canary (5% of traffic through the symbolic-rules-only path) is eval'd against the LLM-path on the same inputs; the **divergence rate is a metric**; a threshold breach alerts (the fallback is drifting).
- A regression test asserts the canary's quality floor (a fixture set where the symbolic path is known-correct; the canary must match on these or the symbolic rules regressed).

### (k) The diff-review-blocker (`15` §5b)
- The rule-based (non-LLM) blocker's own test cases: a PR touching `package.json` is blocked; a PR touching `**/config/*.ts` is blocked; a PR touching `content/blog/*.md` within the allow-list passes the structural scan; a PR touching a path outside the intervention's target_surface scope is blocked. The deny-list's non-overridability is asserted.

### (l) The contract-compat (`09` §4, `14` §5)
- The Buf/Schem-Registry compatibility check: a producer PR with a `BACKWARD`/`FULL`-incompatible change is CI-blocked; the FORWARD check for `WebhookOut` payload is asserted.

### (m) The cedar policy gate (`09` §6)
- Policy decision caching keyed on `(subject, action, resource_class, blast_radius_band)` returns in <2ms p99 (the Performance critique); a benchmark in CI asserts the p99.
- The demote-on-alert Cedar policy fires (the dial property tests overlap, §c).

### (n) The conformal coverage + the estimator
- The synthetic-control / DML / causal-forest estimator's coverage test on the held-out trajectory: the conformal intervals contain the realized lift at the nominal rate (the calibration that gates the dial escalation, `12` §5); a coverage drift triggers the alert (the AI-Intelligence readiness closure, `00_FINAL`).

---

## 4. The eval surfaces (the LLM-specific testing, `11` §7)

- **DSPy/TextGrad-style prompt search** against the held-out trajectories; the search is the eval-experiment pipeline (Langfuse + Phoenix).
- **The PRM-approval-rate-by-plan-class metric:** the preference-model's approval rate by intervention type — the readiness gate for the autonomy-dial escalation (the dial ledger's human-approval-rate axis).
- **The conformal-coverage-by-segment metric:** the calibration by segment; a drift is a regression.
- **Argilla human-review annotation** on the sampled slice; the consented human panel (`13` §6) is the ground-truth that judged-evals calibrate against. **LLM-as-judge is only coarse triage on the long tail** (`11` §7 the AI-Intelligence-Skeptical invariant) — never the ground truth that promotes interventions or trains the PRM.
- **The model card per seam** refreshes quarterly: per-model, per-task quality + cost + latency + re-grounding-pass-rate.

---

## 5. The frontend tests (`10` §9)

- **Vitest** for unit (design-system components, the typed-resolver fanout, the optimistic-update logic).
- **Playwright** for e2e: the <10-minute journey, the 1-click PR flow, the candor report render, the dial-escalation UX with the three-axis ledger explainer.
- **Storybook + axe** for the design-system's per-primitive a11y + state coverage (`20` §7).
- **RSC streaming test harness** — a custom test asserting the panel render-order + the loading states; the Suspense boundary behavior.
- **Visual regression** (Chromatic/Percy) on the Storybook stories.

---

## 6. The chaos practice + the failure-mode rehearsals

- **A monthly chaos exercise** in a stage environment (or a canary subset, never a full prod):
  - **The LLM-provider outage:** drop the provider endpoint; assert the warm-canary scales to 100% of traffic within seconds (`11` §6); the product stays usable.
  - **The Postgres-primary loss:** kill the primary; assert the sync-replica promotes within the RTO; the cross-region replica is the DR target (`16` §6).
  - **The Redpanda partition loss:** simulate; assert exactly-once on restoration (`14` §9); no double-writes to the sinks.
  - **The Temporal worker crash mid-activity:** assert the activity replays idempotently from the persisted history (`09` §2, `22` §4); the side-effect fires once.
  - **The GPU cell saturation:** a privacy-tier tenant's call volume exceeds the cell; assert the queue + the cost gate handle it (`11` §2d).
- **The regret-rollback rehearsal:** a staged regret (a measurement outcome that flips negative) triggers the pre-staged rollback-hash + the dial demotion + the alert — exercised in stage monthly.
- The chaos exercise is **a documented runbook + a calendar slot + a write-up**; the find of an unable-to-recover mode is an architecture-doc update + an ADR (`21` §9).

---

## 7. The test-gate posture (CI-blocked, not advisory)

- The invariant tests in §3 are **CI gates per `17` §4** — a PR cannot merge with one failing. They are not "tests we hope to run"; they are the architecture's enforcement.
- The integration suite runs **on every PR** (the closed-loop dry-run + the invariants); the e2e runs on PR + the staging-promotion; the nightly the heavier reconciliation + the consistency checks; the quarterly the restore + the chaos.
- A flaky test is a priority bug; a flaky test counts the same as a failing test for the merge decision until it's stabilized (a flaky test as a known-failure is a documented-as-flaky + a tracking issue — never a silent ignore).

---

## 8. The readiness closures tied to tests

The readiness scores' underlying closures (`00_FINAL` §gates) are *tests*:

- **Scalability closure:** the load test (the closed loop sustains the M×N×K probe fan-out at the 1000-tenant cohort without error-budget breach) passes.
- **Security closure:** the canary-row + the cache-fuzz + the diff-review-blocker + the SBOM + the break-glass two-person test all pass.
- **AI-Intelligence closure:** the conformal-coverage-by-segment metric clears the nominal coverage; the warm-canary divergence stays under threshold; the dial-escalation three-axis tests pass on real trajectory data.
- **SRE/Production-Readiness closure:** the cell-pair DR rehearsal succeeds (the cutover + the rollback runbook execute cleanly).
- The Engineering Readiness Report (`_ENGINEERING_READINESS_REPORT.md`) cites the test that closes each closure. The score is not asserted; it is *demonstrated by a passing test.*

---

## 9. The test-strategy invariants

1. **Every non-negotiable invariant in the blueprint has a CI-blocked test that fails the build if the invariant breaks.** The 14 invariant-test clusters in §3 are the floor.
2. **The pyramid is steep: legion unit + many integration + few e2e; property/fuzz used where the invariant is a property.**
3. **The golden-probe regression suite asserts over pipeline behavior, not surface outputs** — so it doesn't rot when Gemini changes; the fixtures refresh quarterly + on detected surface-shape changes.
4. **The three-sinks reconciliation nightly; the R2 restore quarterly; the warm-canary eval-divergence daily** — the systematic, not-hoped-for verifications.
5. **The LLM-as-judge is coarse triage only;** the consented human panel + Argilla are the ground truth. The eval pipeline (DSPy/TextGrad-style prompt search) is owned separately from the production inference.
6. **The chaos practice is monthly, documented, runbook'd;** a find of an unable-to-recover mode is a doc update + an ADR.
7. **A flaky test is a priority bug, not a silent ignore;** the merge decision treats it as failing until stabilized.
8. **The readiness scores are demonstrated by passing tests, not asserted**; the test is the closure of the readiness gate.

---

*End of testing strategy. Next: `24_PROJECT_STRUCTURE.md` — the polyglot monorepo layout (the domain-bounded module boundaries, the `pkg/contracts/` contract spine, the per-language workspaces, the `infra/` cell template, the `docs/` source-of-truth, the `adr/` decision records), the naming conventions, and the dependency-rule lint.*
