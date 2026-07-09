# T14 — Golden-path exemplar: Cedar policy + the <2ms p99 benchmark harness

> **Tier:** 1 (the dial gate is load-bearing — a tampered Cedar policy admits an unearned escalation, a moatbreach) | **Status:** pending | **Milestone:** M0
> **Cites:** `28` §4 (golden-path exemplars) · `12_DIAL_GOVERNANCE.md` (the dial — Cedar is the two-pass policy gate) · `CLAUDE.md` §2 (Cedar — the two-pass policy gate, <2ms p99) + §7 (the Cedar <2ms p99 benchmark is a CI test, `23` §3m) · `CODING_STANDARDS.md` (E07) · `ADR-0001` (Cedar) · T01/T03/T06

## Objective

Ship the **Cedar golden-path exemplar** — one reviewed reference policy (the canonical "default `propose`; escalation requires 3 axes" mini-policy from `12` §5) + the **<2ms p99 benchmark harness** that becomes a CI gate (the `23` §3m gate). The exemplar encodes the Cedar policy patterns the AI author copies at M2+ (the real dial gate, the PR-creation gate, the demotion-on-alert gate); the benchmark proves the <2ms p99 invariant holds on a real CPU + becomes the gate that catches a Cedar-policy regression to >2ms. This is the gate that physically enforces "the dial never auto-escalates" (`26` §6 non-goals + the dial-property tests, `23` §3).

## Dependencies

- **Tickets:** T01 (the workspace — the Cedar CLI/JD-engine pin in mise; the `libs/cedar/` skeleton exists from E13), T03 (the dep-direction lint — `libs/cedar/` is a leaf, not a service), T06 (the CI gates — the benchmark runs in the `security-scan`/`dial-property` workflow).
- **External:** the Cedar engine (the Rust/JS implementation — verify the current package + the `cedar` CLI shape via context7 per T09; the 2025-26 Cedar releases changed the validator + the evidence API), a benchmark harness (mitata/benchmark for TS, or the Go `testing.B` — pick the TS-side cedar-encoder per `libs/cedar/`), the contract schema (the dial's input is a contract-typed `DialRequest` from T02).

## Files

- `libs/cedar/policies/dial.cedar` — the exemplar policy: the canonical mini-policy from `12` §5 — `permit` (default `propose` is the lowest dial level, no escalation required); `forbid` (an escalation `> propose` when the 3 axes — fiduciary-vector + evidence-fit + downstream-cost — are not all satisfied). Trivial + correct; the reference the real dial policies copy.
- `libs/cedar/schema/dial.cedarschema` — the Cedar schema for the dial (the `DialRequest` entity + the `escalation` action + the principal/authorization-context). The schema is the contract — it imports the shapes from the `buf`-generated contract where possible (Cedar's schema is JSON/YAML; the contract types are mirrored here, with a pointer back to the contract package to keep them in sync — the AI author updates contracts first, schema second).
- `libs/cedar/evaluator.ts` — the policy evaluator: `evaluate(req: DialRequest): Result<DialVerdict, CedarError>` — loads the policy + schema, calls the Cedar engine, returns the verdict `{allow: bool, level: DialLevel, reasons: string[], holdForHumanReview: bool}`. The `holdForHumanReview` is the candor-floor surface — the gate refuses + escalates rather than silently refusing.
- `libs/cedar/benchmark/p99.ts` — the **<2ms p99 benchmark harness**: runs the evaluator over N (e.g., 10,000) randomly-generated `DialRequest`s, measures per-call latency, computes p50/p99/p999, asserts `<2ms` p99 (CI gate). Uses a fixed seed (determinism — the benchmark is reproducible, not flaky).
- `libs/cedar/benchmark/fixtures.ts` — the fixture `DialRequest`s: a mixed workload — the green-path `propose` calls (the common case, must be fast), the escalation calls (the 3-axes-satisfied path), the refused-escalation calls (the 3-axes-not-satisfied path). The mix is the "real" distribution the dial sees.
- `libs/cedar/test/dial.test.ts` — the property tests (the dial-property tests from `23` §3): escalation requires 3 axes; demotion-on-alert; default `propose` for unknown contexts; deadlock auto-demotion. These are the tests that prove the **semantics** of the policy (separate from the benchmark's "is it fast?" claim).
- `libs/cedar/test/regression.test.ts` — the policy-regression test: a golden set of `(DialRequest, expected_verdict)` pairs; the policy change that flips a verdict fails the test (the dial is a verified-semantics gate, not a free-form HiQL).
- `libs/cedar/tsconfig.json` + `package.json` — the golden-path TS config (copy of T10's); declares the dep on the Cedar engine (the verified npm package from `29` §6) + the `@engenox/contracts` (T02's `DialLevel` + `BlastRadiusBand`).
- `libs/cedar/README.md` — the "how to copy this exemplar" doc: the policy patterns (default-deny-ish "permit the minimum"; the 3-axes escalation; the `holdForHumanReview` candor floor), the benchmark harness pattern (the seed, the mix, the <2ms assertion), the <2ms invariant + the tuning escalation").

## Acceptance criteria

- [ ] `tsc --noEmit` is green under the `libs/cedar/` config (strict + the Cedar engine types).
- [ ] The exemplar policy is **correct** — the dial-property tests pass (escalation requires 3 axes; demotion-on-alert; default `propose` for unknown; deadlock auto-demotion per `23` §3 + `12` §5).
- [ ] The **<2ms p99 benchmark** passes — p99 < 2ms on the fixture workload, computed deterministically (fixed seed; the test is reproducible, not flaky; CI is the gate per `23` §3m).
- [ ] The evaluator returns `Result<DialVerdict, CedarError>` — the verdict carries `holdForHumanReview` (the candor-floor surface: the gate refuses + escalates, never silently refuses).
- [ ] The Cedar schema mirrors the contract types (the `DialLevel` enum + the `BlastRadiusBand` from T02's contract) — no hand-rolled duplication of the contract's enum (the schema is a derived form; the contract is the source of truth).
- [ ] The policy + schema parse under the current Cedar engine (verify via context7 per T09 — the 2025-26 Cedar release changed the schema validation + the policy syntax in places).
- [ ] The benchmark is a CI gate — wired into the T06 chain (`security-scan`-side or a dedicated `dial-property` workflow); a p99 regression >2ms fails the gate (cindor floor in CI).
- [ ] The exemplar passes T03's dep-direction lint (`libs/cedar/` is a leaf; no service imports).
- [ ] The benchmark harness is deterministic — the same seed yields the same latency distribution (determinism is required for CI reproducibility — the `29` §provenance invariant; flaky CI is a candor-floor defect).
- [ ] The README walks the copy-pattern — the teaching surface for the dial + the benchmark.

## Tests

- **Property tests:** `dial.test.ts` — escalation requires 3 axes; demotion-on-alert; default `propose`; deadlock auto-demotion (the `23` §3 dial-property tests).
- **Regression test:** `regression.test.ts` — the golden `(request, verdict)` pairs; a policy change that flips a verdict fails.
- **Benchmark gate:** `p99.ts` — p50/p99/p999 measured on the fixture workload; `<2ms` p99 asserted; the test is deterministic (fixed seed).
- **Acceptance test:** a `DialRequest` with all 3 axes satisfied → `allow` + `level >= Co-pilot`; a `DialRequest` with 2 axes → `forbid` + `holdForHumanReview: true`.
- **Lurker test:** a `DialRequest` that should be `propose` (no escalation) → `allow` + `level == Propose` (the common case is the fast path).
- **Typecheck + lint green:** `tsc --noEmit` clean; Biome passes; `nx affected --target=test` runs the `libs/cedar/` tests.
- **Contract-gate green:** the exemplar's CI run through T06's `contract-gate` is green (the `DialLevel` + `BlastRadiusBand` contracts compile).

## Definition of Done

- [ ] Every acceptance criterion closed; the property tests + the regression + the <2ms p99 benchmark + the acceptance tests green.
- [ ] Coding standard met: the exemplar is `CODING_STANDARDS.md` (E07) embodied for Cedar: `Result` at the boundary, the contract-typed `DialLevel`/`BlastRadiusBand`, the deterministic benchmark, the candor-floor `holdForHumanReview`.
- [ ] Review passed at Tier 1 (the dial gate is load-bearing — full adversarial panel): Security (the policy is tight — no escalation path that admits an unearned escalation; the <2ms p99 prevents a Cedar timeout fallback to a permissive default), Correctness (the property tests prove the semantics; the benchmark proves the latency), Stack-drift (the Cedar engine version is the pinned one; the policy syntax matches the 2025-26 release per context7), Candor-floor (the `holdForHumanReview` surface; the benchmark is a gate not a vibe), Dial/CI-honesty (the <2ms is the gate; the property tests are the gate; the policy is the reference not an opinion), Architecture-alignment (matches `12` §5 + `CLAUDE.md` §7).
- [ ] The benchmark is wired as a CI gate (T06) — p99 >2ms fails the PR.
- [ ] Stack-drift watchdog green: no `:latest` Cedar package pin; no hand-rolled enum duplicating the contract; no `Date.now()` in the benchmark (the seed is fixed), no `any` in the evaluator, no `JSON.parse` on the Cedar output (the engine's typed result is the boundary).
- [ ] Docs updated: the `libs/cedar/README.md` (the copy-pattern doc); `CLAUDE.md` §11 points to this exemplar as the Cedar golden path; `12_DIAL_GOVERNANCE.md` cross-references the exemplar + the <2ms gate.
- [ ] Checkpoint written; commit-ready (`feat(exemplar): T14 — the Cedar golden-path exemplar (the dial mini-policy + the <2ms p99 benchmark harness)` with `Refs: 12 §5, CLAUDE.md §7, ADR-0001, 23 §3m`).

## Estimated complexity

**L — ~1.5 days.** The risk is the <2ms p99 — Cedar is fast, but the in-process engine + the schema validation + the verdict construction must all be sub-2ms at p99 on the real CI runner. The mitigation: the engine is in-process (no IPC), the policy is tiny (the mini-policy), the schema is minimal; pre-compile the policy once at harness init (not per-call). The second risk is the Cedar SDK drift (the 2025-26 release — verify via context7 per T09).

## Notes for the implementer

- **The <2ms p99 is a CI gate, not a goal.** A p99 above 2ms fails the PR (the `23` §3m gate). A Cedar timeout fallback to a permissive default is a moatbreach (the gate would silently admit an escalation). The <2ms is what makes Cedar suitable for the dial gate at all (`12` §5 + `CLAUDE.md` §7). The benchmark harness is the gate's instrument.
- **Cedar's 2025-26 SDK drift is the headline risk.** The `cedar` npm package + the validator + the evidence API + the schema syntax changed. A pre-2025 policy/schema may not parse against the current engine. **Verify via context7 before writing.** Pin the engine version in T01's mise.
- **The policy is `permit` the minimum + `forbid` the rest.** The Cedar idiom is "default-deny-ish" — `permit` the lowest dial level (`propose` is the default per `12` §5), `forbid` anything above `propose` unless the 3 axes are satisfied. The mini-policy is the canonical "default `propose`; escalation requires 3 axes" — do not add a permissive path here.
- **`holdForHumanReview` is the candor-floor surface.** A `forbid` returns the verdict with `holdForHumanReview: true` — the dial refuses + escalates to a human reviewer (the candor floor: refusing is honest, never silent). A silent refusal (`holdForHumanReview: false` on a `forbid`) is a candor-floor defect the reviewer (Candor-floor lens) catches.
- **The Cedar schema mirrors the contract, does not duplicate.** The `DialLevel` enum in `dial.cedarschema` mirrors the `DialLevel` in `pkg/contracts/proto/engenox/policy/v1/dial.proto` (T02). The contract is the source of truth; the schema is a derived form; the AI author updates the contract first, regenerates, then mirrors into the schema. A drift between the two is a contract-spine violation (watchdog category 3 — loosely). The reviewer (Contract-spine lens) checks the mirror.
- **The benchmark is deterministic.** The fixture workload is generated from a fixed seed; the same seed → the same latency distribution → the same p99. A flaky benchmark (random seed) is a CI defect (the candor floor: a gate is a gate, not a coin flip). The `29` §provenance invariant — reproducibility — applies here.
- **Pre-compile the policy once.** Cedar's policy-compile is the slow part; the benchmark pre-compiles at harness init, the per-call `evaluate` is the fast path. A per-call compile would blow the <2ms budget trivially (a compile can be 50ms); the benchmark structure matters as much as the policy size.
- **No `Date.now()` in the benchmark harness except the latency measurement.** The fixture `DialRequest`s are seeded (deterministic); the latency measurement is wall-clock (the only legitimate `performance.now()` use). The reviewer (Stack-drift lens) verifies the determinism.
- **The exemplar is Tier 1 because the dial gate is the last line of automated defense against an unearned escalation** (`26` §6 non-goals — "no auto-escalation in the MVP"). A tampered policy (one that admits an escalation the 3 axes don't warrant) is a moatbreach by definition. Review at the full panel.
- **The benchmark gates the regression, the property tests gate the semantics.** A policy change that's still fast but wrong passes the benchmark + fails the property tests (good); a policy change that's right but slow passes the property tests + fails the benchmark (good). Both gates are required; neither is sufficient alone.
