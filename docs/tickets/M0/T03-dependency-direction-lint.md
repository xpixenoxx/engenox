# T03 — Dependency-direction lint (the architecture made physical)

> **Tier:** 1 (the arrows enforced) | **Status:** pending | **Milestone:** M0
> **Cites:** `24` §4 (the dependency-direction lint) + §3 (the module-boundary examples) · `22` §6 (the no-`utils` rule) · `CLAUDE.md` §4 (contract-spine-first) + §5 (the polyglot boundaries) · `CODING_STANDARDS.md` §4 (the no-utils rule)

## Objective

Make the architecture's dependency arrows **enforced by lint, not by convention** (`24` §4). Stand up the per-language boundary lint — `nx enforce-module-boundaries` (TS), `depguard` (Go), `import-linter` (Python), and the contract-graph unidirectional assertion — so a forbidden import (`services/perception` importing `services/decision`'s internals; `services/*` importing `gateway`'s internals; a hand-written `utils.ts`) is a CI-blocked failure from the first PR. This is the lint that "makes the architecture physical, not advisory" (`24` §4).

## Dependencies

- **Tickets:** T01 (the workspace, so `nx`/`depguard`/`import-linter` have a config home), T02 (the contract package, so the `*→contracts` arrow + the contract-graph assertion have a target).
- **External:** `nx`, `golangci-lint` (with `depguard`), `import-linter` (Python), `dependency-cruiser` or `madge` (the contract-graph assertion).

## Files

- `nx.json` (extend T01's) — the `nx-enforce-module-boundaries` rule: the allowed `web→design-system` one-way; `web`,`services/*`→`pkg/contracts`; `services/*`→`libs/{kg,verifier,cedar,crypto,otel}`; `services/control-plane`→`services/{perception,decision,action,measurement}` **only via the contract's generated gRPC client**, never via a direct internal import (`24` §4). The `libs/*` never import a service; `gateway` is leaf-only.
- `.eslintrc` or the Biome-equivalent boundary config (TS) — the forbidden-import rules in the form the `nx` boundary lint enforces.
- `services/perception/.depguard.yml` (Go — per-module) — the depguard rules: `services/perception` may import `pkg/contracts`, `libs/kg-go`, `libs/otel-go`, stdlib, third-party; it may **not** import `services/decision`, `services/action`, `services/gateway`, `services/control-plane`. (One `depguard.yml` per Go service dir, encoding that service's allowed deps per `24` §3.)
- `services/action/.depguard.yml` (Go) — `services/action` may import `contracts`, `kg`, `cedar`, `crypto`; not `decision`/`perception`/`measurement`/`gateway` (`24` §3).
- `pyproject.toml` (the measurement module — extend T12's later, but the `import-linter` config root lands here) — the `import-linter` contracts: `services/measurement`'s estimator package / conformal package / federated package boundaries (`24` §4).
- `tools/check-contract-graph.{sh,ps1}` — the contract-graph unidirectional assertion: `pkg/contracts/` imports nothing in-repo (the fan-in root is leaf-only). Run via `dependency-cruiser` or `madge` against the contract graph.
- `docs/enforcement/dependency-rules.md` (a Tier-3 doc) — the human-readable list of the allowed/forbidden arrows per service, the reference a contributor reads when the lint fails. (This is an *enforcement* doc, not a frozen blueprint doc — it's editable.)

## Acceptance criteria

- [ ] `nx enforce-module-boundaries` passes on the (currently scaffold) project graph: the boundary rules are configured + valid; a *forbidden* TS import (a stub `services/perception` importing `services/decision`) is caught when run against a staged test.
- [ ] `golangci-lint run` with `depguard` passes on the (currently empty) Go services; the per-service `.depguard.yml` files are valid + load.
- [ ] `lint-imports` (the `import-linter` CLI) passes on the (currently empty) measurement module; the contracts file is valid.
- [ ] `tools/check-contract-graph.{sh,ps1}` asserts `pkg/contracts/` imports nothing in-repo (exit 0 when true, exit 1 + the offending import when false).
- [ ] A *negative* test: a deliberately-forbidden import (e.g. a `services/perception/perception.ts` that imports `services/decision/plan.ts`) is caught by the relevant lint (the TS boundary lint blocks it; the Go depguard blocks the Go equivalent; the contract-graph check blocks a contract-imports-service reverse arrow). The negative test is a CI fixture (Tier-3) that asserts the lint *fires*.
- [ ] The allowed arrows match `24` §3 + §4 exactly (the `24` §3 module-boundary table is the spec; the lint is its enforcement).
- [ ] No frozen doc edited; the change is the lint configs + the boundary-rules doc.

## Tests

- **Boundary-fire test (the negative test):** a fixture diff that adds a forbidden import; the CI run (T06) asserts the lint blocks it. This is the test that proves the lint *works*, not just that it's *configured*.
- **Contract-leaf test:** `tools/check-contract-graph` exits 0 on the green path (contracts imports nothing) + exits 1 on a injected reverse arrow (a `pkg/contracts/` file importing `services/...`).
- **No-utils test:** a fixture `libs/kg/utils.ts` (a catch-all) is caught by the lint (the `no-utils` rule, `CODING_STANDARDS.md` §4). The lint bans `utils.ts`/`helpers.go`/`misc.py`/`shared.ts` filenames.
- **Architecture-alignment test:** the review (Tier 1) confirms the lint rules match `24` §3's boundary table row-by-row — not a free interpretation.

## Definition of Done

- [ ] Every acceptance criterion closed; the boundary-fire + contract-leaf + no-utils negative tests green.
- [ ] Coding standard met: the lint configs are valid + pinned; the boundary-rules doc is accurate.
- [ ] Contract spine intact: `pkg/contracts/` is leaf-only (the contract-graph assertion is green); no service imports another's internals; the gateway is leaf-only.
- [ ] Review passed at Tier 1: the panel includes Architecture-alignment (the lint matches `24` §3) + Contract-spine (the leaf-only assertion) + Stack-drift (the lint rule-set matches `29` §6).
- [ ] The lint is wired to fire on PR (the CI wiring lands in T06, but T03's local-command form runs now).
- [ ] Stack-drift watchdog green: the lint configs don't suppress a forbidden pattern; no `utils.ts`/`helpers.go`/`misc.py` catch-all added.
- [ ] Docs updated: `docs/enforcement/dependency-rules.md` (the human-readable boundary list) is written; `nx.json`/the depguard configs cite `24` §3 + §4 in comments.
- [ ] Checkpoint written; commit-ready (`build(lint): T03 — the dependency-direction lint across TS/Go/Python + the contract-graph assertion` with `Refs: 24 §3, 24 §4, ADR-0001`).

## Estimated complexity

**M — ~1 day.** The risk is the `nx enforce-module-boundaries` + Biome configuration shape (the TS boundary lint's exact rule syntax) + the depguard per-service config boilerplate. The mitigation: one service's `.depguard.yml` is the template; the rest copy it (the golden-path-for-configs).

## Notes for the implementer

- **The lint rules are the architecture's spec made executable.** Each rule cites `24` §3 (the boundary table) + §4 (the lint section) in a comment — a contributor whose import is blocked reads the comment + the doc, not just the error.
- **Do not author the services here.** T03 ships the *lint configs* + the *boundary-rules doc* + the *negative test fixtures*. The actual services land with the exemplar tickets (T10–T13). The lint must pass on the empty scaffold + fail on the forbidden-import fixture.
- **The `no-utils` rule is part of T03** (it's a dependency-direction question — a `utils.ts` is a module with no boundary). `CODING_STANDARDS.md` §4 names it; T03 enforces it.
- **The contract-graph assertion is the structural backstop for the contract-spine rule** (`CLAUDE.md` §4): if `pkg/contracts/` ever imports a service, the assertion fires. This is distinct from the TS boundary lint (which catches a service importing another service's internals); both run.
- **Do not suppress the lint to make a scaffold pass.** If the empty scaffold has a false-positive (e.g. `nx` complains about an empty workspace), fix the config, not suppress the rule. A bare `// nolint` is a watchdog hit (category 4).
