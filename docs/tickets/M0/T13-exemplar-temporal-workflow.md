# T13 — Golden-path exemplar: Temporal workflow

> **Tier:** 2 (an exemplar — the workflow reference the AI author copies) | **Status:** pending | **Milestone:** M0
> **Cites:** `28` §4 (golden-path exemplars) · `22_CODING_STANDARDS.md` · `CODING_STANDARDS.md` (E07) · `19_WORKFLOW_ORCHESTRATION.md` (Temporal) · `25` §3 (Temporal self-hosted Postgres-backend for MVP cost — MP) · `CLAUDE.md` §2 (Temporal — workflow) · `ADR-0001` (Temporal self-hosted → Cloud at graduation) · T02/T03/T06

## Objective

Ship the **Temporal-workflow golden-path exemplar** — one reviewed reference workflow (`services/temporal/workflows/<Name>.ts` — the M0 trivial workflow shipping `assert.v1`) that encodes every Temporal pattern the AI author copies: contract-typed signals + queries + activities, the `Result<T,E>`-at-the-activity-boundary idiom, idempotency keys on every side-effecting activity (the `IdempotencyKey` invariant, `17` §4 + the DoD idempotency test), the deterministic-workflow rule (no `Date.now()`/`Math.random()` in the workflow file — `29` §provenance), the compensation structure (every side-effecting activity is paired with its compensation), the payload immutability (pass-by-value Temporal payloads + `go vet copylocks`-equivalent for TS), `tsc --strict` green, and a passing workflow-test (the Temporal mocha/vitest harness). This is the workflow skeleton every M1+ workflow copies — the diagnostic-loop, the propose-loop, the measure-loop.

## Dependencies

- **Tickets:** T02 (the contracts — the workflow + the activities take contract-typed payloads), T03 (the dep-direction lint — `services/temporal/` imports contracts, not siblings), T06 (the CI gates — workflow + activity tests run in the chain).
- **External:** the Temporal TypeScript SDK (pinned per T01's mise — verify the current SDK shape via context7 per T09, big 2025-26 SDK changes), Temporal self-hosted (the Postgres-backend for MVP), vitest (the workflow test harness).

## Files

- `services/temporal/workflows/assert_workflow.ts` — the exemplar workflow: takes an `AssertWorkflowInput` (a contract type from T02), runs one activity, emits one signal + one query, returns an `AssertWorkflowOutput`. Deterministic (no `Date.now()`/`Math.random()` — the workflow file's "no nondeterminism" rule from `19`). The workflow orchestrates; it doesn't do I/O.
- `services/temporal/activities/assert_activity.ts` — the exemplar activity: takes `AssertActivityInput`, calls an external side effect (a stub — e.g., "write to the KG"), returns `Result<AssertActivityOutput, ActivityError>`. The activity carries the `IdempotencyKey` (the re-execution-of-the-same-key-must-not-duplicate invariant, `17` §4) + a paired compensation activity (`compensate_assert_activity.ts`).
- `services/temporal/activities/compensate_assert_activity.ts` — the compensation for `assert_activity` — `19` §compensation: every side-effecting activity paired with its compensation. The exemplar's stub compensation is the template the real compensations copy.
- `services/temporal/worker.ts` — the worker registration: `Worker.create({ workflowsPath, activities, taskQueue: 'engenox.assert.v1' })` (verify the current Temporal SDK shape via context7 per T09 — the Worker API drifted in 2025-26).
- `services/temporal/test/assert_workflow.test.ts` — the golden-path workflow test (the Temporal `TestWorkflowEnvironment`): a green path — the activity runs, the signal emits, the query returns — under the test environment (no real Temporal server needed); an idempotency test (re-send the same `IdempotencyKey` → no duplicate); a compensation test (force the activity to fail → the compensation runs).
- `services/temporal/tsconfig.json` — the golden-path TS config (copy of T10's, + the Temporal SDK's required ` decorators`/`experimentalDecorators` if the current SDK needs them — verify).
- `services/temporal/package.json` — declares the dep on `@temporalio/worker`/`@temporalio/workflow`/`@temporalio/activity`/`@engenox/contracts`; the `@temporalio/testing` dev-dep for the workflow test; no sibling-service deps.
- `services/temporal/README.md` — the "how to copy this exemplar" doc: the file-by-file walkthrough, the patterns to copy (deterministic workflow, contract-typed payloads, `Result`-at-activity-boundary, idempotency key, compensation pair, the workflow-test harness), the patterns NOT to copy (no `Date.now()` in a workflow, no I/O in a workflow, no mutable payload, no activity without an idempotency key).

## Acceptance criteria

- [ ] `tsc --noEmit` is green under the Temporal TS config (strict + the SDK's required flags).
- [ ] The workflow file has **no `Date.now()` or `Math.random()`** (determinism — grep-asserted; the workflow's `Workflow.sleep` / `Workflow.now` are the only time sources).
- [ ] The activity boundary returns `Result<…, …>` (neverthrow) — the workflow handles the `Err` (e.g., retries per the retry policy + compensates on terminal failure), never throws across the activity boundary.
- [ ] Every side-effecting activity has an `IdempotencyKey` in its input + the activity's logic deduplicates on it (the re-execution-must-not-duplicate invariant — `17` §4 + the DoD idempotency test).
- [ ] Every side-effecting activity has a paired compensation activity (`compensate_*`) — `19` §compensation.
- [ ] The workflow + activity payloads are contract types (from `@engenox/contracts`) — never hand-rolled `any`-typed payloads.
- [ ] The workflow emits a contract-typed signal + answers a contract-typed query (the workflow's public API is the contract).
- [ ] The exemplar passes T03's dep-direction lint (no sibling-service import).
- [ ] The exemplar runs green through the T06 CI chain — the workflow-test runs in CI.
- [ ] The `taskQueue` is version-named (`engenox.assert.v1`) — the workflow version follows the contract version.
- [ ] The README walks the copy-pattern — the teaching surface.

## Tests

- **Determinism test:** grep-asserts no `Date.now(`/`Math.random(`/`new Date()` in `workflows/assert_workflow.ts` (the workflow file is the test target — the activity can use wall-clock; the workflow cannot).
- **Golden-path workflow test:** `assert_workflow.test.ts` under `TestWorkflowEnvironment` — a green path runs the activity + emits the signal + answers the query + returns the output.
- **Idempotency test:** re-send the same `IdempotencyKey` → the activity runs once (or returns the cached result), no duplicate side effect (assert the side-effect happens exactly once — the DoD idempotency test, `17` §4).
- **Compensation test:** force the activity to fail terminally → the compensation activity runs (assert the compensation is invoked with the right input).
- **Typecheck green:** `tsc --noEmit` clean under the Temporal config.
- **Lint green:** Biome passes with zero suppressions.
- **Contract-gate green:** the exemplar's CI run through T06's `contract-gate` is green.
- **No-I/O test:** gdb-assert no `fetch(`/`http`/`pg`/`redis`-client calls in `workflows/assert_workflow.ts` (I/O is in the activity, not the workflow — `19`).

## Definition of Done

- [ ] Every acceptance criterion closed; the determinism/golden-path/idempotency/compensation/typecheck/lint/contract-gate/no-I/O tests green.
- [ ] Coding standard met: the exemplar is `CODING_STANDARDS.md` (E07) embodied for Temporal: deterministic workflow, contract-typed payloads, `Result` at the boundary, idempotency-key + compensation, payload immutability.
- [ ] Review passed at Tier 2 (single adversarial reviewer + the watchdog): Correctness (the workflow runs; the idempotency + compensation are right), Architecture-alignment (the exemplar matches `19` + `CLAUDE.md` §2), Stack-drift (the Temporal SDK's current shape per context7 — the 2025-26 SDK changes are real; a stale SDK pattern is a watchdog category-2 hit), Security (the payloads are contract-typed; no `any`), Candor-floor (the stub is labeled a stub).
- [ ] The AI author can copy this exemplar for M1+ workflows (the propose-loop, the measure-loop, the diagnostic-loop copy this skeleton).
- [ ] Stack-drift watchdog green: no `Date.now()` in the workflow, no hand-rolled payload type, no activity without an idempotency key, no `:latest` Temporal SDK pin.
- [ ] Docs updated: the `services/temporal/README.md` (the copy-pattern doc); `CLAUDE.md` §11 points to this exemplar as the Temporal golden path; `19_WORKFLOW_ORCHESTRATION.md` cross-references the exemplar.
- [ ] Checkpoint written; commit-ready (`feat(exemplar): T13 — the Temporal golden-path exemplar (deterministic, idempotent, compensated)` with `Refs: 19, CLAUDE.md §2, ADR-0001`).

## Estimated complexity

**L — ~2 days.** The risk is the Temporal SDK's drift — the 2025-26 SDK changes (the `Worker.create` API, the `TestWorkflowEnvironment`, the native-context-api) are non-trivial; a stale SDK pattern is both a watchdog hit + a broken build. The mitigation: context7 (T09) is the authoritative source — fetch the current SDK before writing. The idempotency + compensation + determinism patterns are reproducible once the SDK shape is right.

## Notes for the implementer

- **The 2025-26 Temporal SDK drift is the headline risk.** The TS SDK changed meaningfully (the interceptor API, the `Workflow`/`Activity` import paths, the time-skipping test environment). A pre-2025 pattern will not compile against the current SDK. **Verify via context7 before writing a line.** This is the canonical case the context7 install (T09) exists for.
- **The workflow must be deterministic.** `Workflow.now()`, `Workflow.sleep()`, `randomUUID()` (the SDK's deterministic one) are the only time/uuid/random sources inside a workflow file — never `Date.now()` or `Math.random()`. The watchdog scans for this; the determinism test asserts it; `19` §non-determinism is the spec. A non-deterministic workflow breaks replay (Temporal's replay guarantee).
- **Idempotency is the workflow invariant.** Every side-effecting activity takes an `IdempotencyKey` in its contract-typed input + deduplicates. The re-execution-with-the-same-key-must-not-duplicate is `17` §4 + a CI test (the DoD idempotency gate). The exemplar encodes the pattern; M1+ real activities (`pr-activity`, `kg-write-activity`, `corpus-row-activity`) copy the idempotency-key check verbatim.
- **Every side-effecting activity is paired with a compensation.** `19` §compensation. The exemplar's `assert_activity` is paired with `compensate_assert_activity`; the workflow's `Err`-handling path (in the `catch` of the `Result`) runs the compensation. The compensation is a contract-typed activity — its input is the side-effect's " undo-input."
- **Workflow ≠ I/O.** The workflow orchestrates; it does not call `fetch`/`pg`/`redis` directly — those are activities. The no-I/O test asserts this (`19` §workflow-orchestrates-activity-acts).
- **The `taskQueue` is `engenox.assert.v1`.** The version follows the contract version — a `v2` workflow is a new task queue + a migration (`19` §version). Do not version-bump the workflow without the contract `v2` (T02's strict-add-only).
- **The workflow test uses the time-skipping `TestWorkflowEnvironment`.** No real Temporal server needed at M0; the test environment ships with the SDK. The test asserts the workflow + activity progress + the idempotency + the compensation, all in-process.
- **Payload immutability.** The TS payloads are `readonly` (the immutability-first rule, E07 §6); Temporal serializes pass-by-value; a mutable payload passed across the workflow/activity boundary is a defect the reviewer (Correctness lens) catches.
- **The exemplar is Tier 2 but the workflows are the loop.** The closed-loop's measure-via-intervention is a Temporal workflow; the patterns the exemplar encodes propagate to the whole loop. Review the pattern-correctness lenses as if Tier-1.
