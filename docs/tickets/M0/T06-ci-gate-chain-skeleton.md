# T06 — CI gate-chain skeleton (the gates that make the invariants physical)

> **Tier:** 1 (the enforcement gates) | **Status:** pending | **Milestone:** M0
> **Cites:** `17` §4 (the CI gate chain) · `24` §8 (nx-targeted CI) · `CLAUDE.md` §7 (the gate chain) · `DEFINITION_OF_DONE.md` (E09 — the per-PR gate) · `25` §3 M0 (the contract-compat gate fires for the first time) · `29` §6 (the per-language lint pins)

## Objective

Wire the `.github/workflows/` chain that runs **on every PR**, in the **gate order** the architecture requires: the **contract gate first** (`buf lint` + `buf breaking` + `buf generate` + the three-language compile), then the **per-language lint/typecheck/format** (Biome 2 + tsc strict for TS; golangci-lint for Go; Ruff + mypy --strict for Python), then the **dependency-direction lint** (T03), then **Trivy** (the image/dep vuln scan) + **secret-scan** (Trufflehog/gitleaks). **Nothing runs until the contract spine is intact** — the contract gate is first, the rest are gated on it. This is the gate chain that makes the invariants physical from day one (`25` §3 — the contract-compat gate fires for the first time on this ticket's PR).

## Dependencies

- **Tickets:** T01 (the workspace — `nx` targets exist), T02 (the contract package — the contract gate has a target), T03 (the dependency-direction lint — the gate runs it).
- **External:** GitHub Actions (the runner); the per-language toolchain (pinned in T01's mise, installed in CI via `mise install`).

## Files

- `.github/workflows/contract-gate.yaml` — **the first gate**. Steps: `buf lint`, `buf breaking --against .git#branch=main` (the contract-compat check), `buf generate` (regenerate the contract outputs), `tsc --noEmit` in `pkg/contracts/` (TS compile), `go build ./...` in `pkg/contracts/` (Go compile), `mypy --strict` on the Python output. **All other workflows depend on this gate's success** (`needs: contract-gate`). This is the M0 gate `25` §3 names.
- `.github/workflows/lint.yaml` — the per-language lint+format+typecheck (Biome 2 for TS, golangci-lint for Go, Ruff + mypy --strict for Python). `needs: contract-gate`. Calls `nx affected --target=lint` so only changed services lint (`24` §8).
- `.github/workflows/tests.yaml` — the per-language unit tests. `needs: contract-gate`. `nx affected --target=test`.
- `.github/workflows/dependency-direction.yaml` — T03's lint in CI: `nx enforce-module-boundaries` + `golangci-lint` (depguard) + `lint-imports` + `tools/check-contract-graph`. `needs: contract-gate`. The boundary-fire + the contract-leaf + the no-utils negative tests run here.
- `.github/workflows/security-scan.yaml` — Trivy (the repo + the image vuln scan) + Trufflehog/gitleaks (the secret scan). `needs: contract-gate`. Always runs (it doesn't depend on the changed services).
- `.github/workflows/stack-drift-watchdog.yaml` — **T07 owns this file** (the watchdog is a distinct concern; T06 sets up the workflow-* skeleton, T07 adds the watchdog workflow). T06 leaves a placeholder + the `needs: contract-gate` ordering for T07 to fill.
- `.github/workflows/ci-orchestrator.yaml` — the top-level workflow that calls the gate chain in order + reports the gate status (the contract-gate is the `needs:` root; the failure of any gate fails the PR). This is the candor-floor CI surface — a gate status is reported as closed-or-not, not "substantially done" (`DEFINITION_OF_DONE.md`).

## Acceptance criteria

- [ ] A PR runs the gate chain; the contract gate runs **first** + the other gates `needs: contract-gate` (verified by the workflow graph).
- [ ] The contract gate (`buf lint` + `buf breaking` + `buf generate` + the three-language compile) is green on the T02 PR (the first contract-compat gate firing — `25` §3).
- [ ] The dependency-direction workflow runs T03's lint + the boundary-fire/contract-leaf/no-utils negative tests pass.
- [ ] The security-scan workflow runs Trivy + the secret-scan, both green on the M0 baseline.
- [ ] **A forbidden-import PR is blocked:** a fixture PR adding a `services/perception` → `services/decision` internal import fails the dependency-direction gate (the negative test runs in CI, not just locally).
- [ ] **A secret in the diff is blocked:** the secret-scan catches a fixture `AWS_ACCESS_KEY_ID=AKIA...` in a committed file (the negative test).
- [ ] **A `:latest` image tag is blocked:** (if a Trivy/Gatekeeper-policy check runs on the manifest) a fixture pod with `:latest` is flagged.
- [ ] The gate status is reported as a single pass/fail per gate; no "substantially done" middle state (the candor floor in CI).
- [ ] The `nx affected` targeting works: only changed services' lint/test run (verify by a PR that touches only `docs/` running only `security-scan`, not the contract gate's `buf generate` of unchanged contracts — actually the contract gate always runs on contract-touching PRs; the `nx affected` targeting is for the lint/test gates).
- [ ] No frozen doc edited; the change confined to `.github/workflows/`.

## Tests

- **The gate-chain is the test.** Each gate is itself the assertion it's testing: the contract gate asserts the contracts compile; the lint gate asserts the code lints; the security gate asserts no vuln/secret. The "tests" are the negative fixtures (the forbidden-import, the secret, the `:latest` tag) that assert the gates *fire*.
- **Gate-order test:** a workflow-graph assertion (a `tools/assert-gate-order.{sh,ps1}` that reads the workflow files + asserts `contract-gate` is the `needs:` root for lint/tests/dependency-direction/security-scan).
- **Candor-floor test:** the orchestrator workflow reports each gate as a discrete pass/fail — a junction that asserts no gate emits an "in-progress-but-mergeable" state.

## Definition of Done

- [ ] Every acceptance criterion closed; the gate chain green on the T02/T03 PRs; the negative fixtures blocked.
- [ ] Coding standard met: the workflow YAML is valid + pinned-action (the GitHub Actions versions pinned per `29` §6; `@v4` not `@latest`).
- [ ] Review passed at Tier 1: the panel includes Correctness (the gate order + the `needs:` graph are right), Architecture-alignment (the gates match `17` §4 + `CLAUDE.md` §7), Stack-drift (the action pins match `29` §6 — no `@latest`), Security (the secret-scan + Trivy are wired; the AppProject-style scoping of the runners), Candor-floor (the gate status is honest pass/fail).
- [ ] The M0 gate `25` §3 names — the contract-compat CI gate — **fires for the first time** on this ticket's PR (the contract gate runs green on the T02 contracts).
- [ ] Stack-drift watchdog green: no `@latest` action pin; no unratified swap; the gate chain matches the audited one.
- [ ] Docs updated: `CLAUDE.md` §11 ("How to run things") points to the gate chain; the `infra/` README cites the CI.
- [ ] Checkpoint written; commit-ready (`ci(t06): the gate-chain skeleton — contract gate first, per-language lint/test, dep-direction, security-scan` with `Refs: 17 §4, 24 §8, ADR-0001`).

## Estimated complexity

**L — ~1.5 days.** The risk is the `needs:` graph ordering + the `nx affected` targeting + the runner-toolchain bootstrap (installing mise + the pinned tools on the GitHub Actions runner). The mitigation: the toolchain bootstrap is a single `mise install` step reused across workflows; the `needs:` graph is explicit in `ci-orchestrator.yaml`.

## Notes for the implementer

- **The contract gate is the first gate, always.** The architecture's #1 anti-rework discipline (`CLAUDE.md` §4) is enforced by making `buf breaking` the gate every other gate waits on. If the contracts don't compile, nothing else runs — this is correct, not a waste.
- **Pin the GitHub Actions.** `actions/checkout@v4.2.x`, `actions/setup-node@v4.x`, etc. — never `@latest` or `@main`. A `@latest` action is a watchdog hit (category 1 — unratified swap) + a supply-chain risk.
- **The watchdog workflow (T07) is a sibling, not part of T06.** T06 sets up the gate-chain skeleton + the `stack-drift-watchdog.yaml` placeholder; T07 fills the watchdog job. Do not author the watchdog patterns here — that's T07.
- **The `nx affected` targeting is for the lint/test gates, not the contract gate.** The contract gate always runs `buf breaking` on the contract package (the contract is the spine; a contract change is Tier 1). The lint/test gates run `nx affected --target=...` so a docs-only PR doesn't re-lint every service.
- **The gate status is the candor floor in CI.** A gate that "substantially passed" is a defect (`DEFINITION_OF_DONE.md`). Each gate emits pass/fail; the orchestrator aggregates to mergeable/blocked. No middle state.
- **Do not add the Trivy/secret-scan suppressions.** If a scan flags a false positive (a fixture secret, a known vuln in a pinned dep), the suppression cites the reason + the doc-pointer; a bare `# noqa`/`trivy-ignore` is a watchdog hit (category 4).
