# T01 — Repo + polyglot workspace bootstrap

> **Tier:** 1 (foundation — everything depends on it) | **Status:** pending | **Milestone:** M0
> **Cites:** `24` §2 (the tree) + §8 (nx + pnpm/uv/go.work) · `29` §2 (the toolchain pins) + §6 (the per-language dep inventory) · `ADR-0001` (the confirmed stack) · `CLAUDE.md` §2 (the stack table) · `REPO_CONVENTIONS.md` (E12 — `.gitignore`)

## Objective

Stand up the polyglot monorepo's *root* — the four-language workspace tooling (nx + pnpm + uv + go.work), the pinned toolchain (mise), the `.gitignore` for generated artifacts — so every later M0 ticket (contracts, lint, CI, exemplars) authors inside a working workspace. T01 ships no product code; it ships the *build orchestrator config* + the *workspace roots*.

## Dependencies

- **External:** none (this is the root).
- **Tickets:** none. This is the first M0 ticket; everything depends on it.

## Files

- `nx.json` — the build orchestrator config (the project graph + `nx affected` config).
- `pnpm-workspace.yaml` — the TS workspace roots (`pkg/contracts/`, `services/control-plane/`, `services/decision/`, `services/gateway/`, `web/`, `design-system/`, `libs/*-ts/`, `tools/`).
- `pyproject.toml` (root, the uv workspace) — the Python workspace root naming `services/measurement/`, `libs/*-py/`.
- `go.work` — the Go workspace naming `services/perception/`, `services/action/`, `services/gateway/` (Go half), `libs/*-go/`.
- `mise.toml` — the pinned toolchain: Node 22 LTS, pnpm, Go 1.24+, Python 3.12, uv, Buf, Biome 2, Ruff, mypy, golangci-lint, Atlas, OpenTofu, the Buf CLI (`29` §6).
- `.gitignore` — the generated-artifact ignores (`pkg/contracts/generated/`, `node_modules/`, `.venv/`, `dist/`, `build/`, `*.tfstate`, `coverage/`, `.next/`, `__pycache__/`) per `REPO_CONVENTIONS.md` (E12) §"`.gitignore` + skeleton rules."
- `.editorconfig` — the editor baseline (indent, charset, eol).
- Root `README.md` — a one-paragraph project pointer to `CLAUDE.md` + `docs/` + `_RECOVERY.md` (a newcomer reads CLAUDE.md first).
- The existing scaffold `.keep` files remain (T01 does not remove them; a later ticket's real file replaces a `.keep`).

## Acceptance criteria

- [ ] `mise install` reproduces the pinned toolchain (Node 22, pnpm, Go 1.24+, Python 3.12, uv, Buf, Biome 2, Ruff, mypy, golangci-lint, Atlas, OpenTofu) on a clean checkout.
- [ ] `pnpm install` resolves the (currently empty) TS workspace with no errors; `pnpm-workspace.yaml` lists the TS roots that exist as scaffold dirs.
- [ ] `uv sync` resolves the (currently empty) Python workspace with no errors; the root `pyproject.toml`'s uv-workspace `members` lists the Python roots.
- [ ] `go work sync` resolves the (currently empty) Go workspace; `go.work` lists the Go module roots.
- [ ] `nx run-many --target=build --all` succeeds on the (currently empty) project graph — it runs nothing, with no error, confirming `nx.json` is valid.
- [ ] `.gitignore` excludes `pkg/contracts/generated/` + the standard build dirs; `git check-ignore pkg/contracts/generated/foo` returns the ignore match.
- [ ] No frozen doc was edited (`git status` shows only new files + the workspace roots).

## Tests

- **Toolchain-repro test:** a script (`tools/check-toolchain.sh` or `.ps1`, Tier-3 surface) that asserts each pinned tool is on the expected version (`mise current` per tool). Run in CI from T06 onward.
- **Workspace-resolution test:** `pnpm install --frozen-lockfile`, `uv sync --frozen`, `go work sync` each exit 0 on a clean checkout. (The lockfiles are empty-but-present at T01; a locked resolution confirms the workspace roots are valid.)
- **`nx` graph test:** `nx graph` produces a valid graph (no nodes yet, no error) — confirms `nx.json` + the workspace roots are named consistently.

## Definition of Done (per `DEFINITION_OF_DONE.md`, E09)

- [ ] Every acceptance criterion above is closed; the tests green.
- [ ] Coding standard met: the JSON/TOML/YAML configs are valid (a `mise tomll`/`pnpm config`/`go work` validation passes; Biome validates `nx.json`'s format if it's in scope).
- [ ] Review passed at Tier 1: the review record names the lenses run (Correctness — the workspace roots are valid; Architecture-alignment — the tree matches `24` §2; Contract-spine — `pkg/contracts/` is a root, not importing anything; Stack-drift — the toolchain pins match `29` §6 + ADR-0001). Author did not review their own work.
- [ ] Stack-drift watchdog green: zero forbidden-pattern hits (the `.gitignore` doesn't suppress a frozen-doc edit; no `alloydb`/`warpstream`/`quickwit` references; the toolchain pins match the audited stack).
- [ ] Docs updated: the root `README.md` points to `CLAUDE.md` + `_RECOVERY.md`; `_RECOVERY.md` E18 row reflects T01's closure status (once E18 runs). No frozen doc edited.
- [ ] Checkpoint written: the artifact is on disk; `_RECOVERY.md` reflects the state.
- [ ] Commit-ready: the commit message follows `REPO_CONVENTIONS.md` (E12) — `build(t01): stand up the polyglot workspace (nx + pnpm + uv + go.work + mise)` with `Refs: 24 §2, ADR-0001` in the body.

## Estimated complexity

**M — ~1 day.** The risk is the cross-tool version matrix (mise pinning Buf/OpenTofu/Atlas versions that are mutually compatible + Go 1.24+ ↔ the AGE/Temporal SDKs landing later). The mitigation: pin the minimum viable matrix now (the exact AGE/Temporal SDK pins land with T04/T13); `mise.toml` is the single source.

## Notes for the implementer

- **Do not pin Bun as the runtime here.** Node 22 LTS is the MVP target; Bun is the verify-at-milestone spike (`29` §5; `STACK_VERIFICATION_CHECKLIST.md` M0 ⚠️). T01 pins Node 22; the Bun spike is its own follow-up, not T01.
- **Do not create per-service `package.json`/`go.mod`/`pyproject.toml` here.** Those land with the exemplar tickets (T10–T12) + the contract package (T02). T01 ships the *root* workspace config only.
- **Do not create `buf.yaml` here.** That's T02 (the contract spine). T01 prepares the ground (the workspace root that `pkg/contracts/` will live in); T02 stands up Buf.
- The `mise.toml` pins are the foundation's first "this is the 2026 stack" commitment — they are the live form of ADR-0001. A version bump to any of them is an ADR (`STACK_DRIFT_WATCHDOG.md` category 1).
