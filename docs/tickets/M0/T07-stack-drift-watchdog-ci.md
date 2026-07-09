# T07 — Stack-drift watchdog CI job

> **Tier:** 1 (the PR-time forbidden-pattern sentinel) | **Status:** pending | **Milestone:** M0
> **Cites:** `STACK_DRIFT_WATCHDOG.md` (E16 — **the spec for this ticket**) · `28` §3 (the old-tech-drift watchdog) · §8 invariant 7 (a swap is an ADR) · `ADR-0001`/`ADR-0003`/`ADR-0006` (the ADRs whose supercessions the watchdog enforces) · `CLAUDE.md` §2 (the stack pins) · the claude-api skill drift table

## Objective

Install the **stack-drift watchdog** (E16) as a CI job: a scanner that runs on every PR's cumulative diff, matches the forbidden-pattern categories 1–5 from `STACK_DRIFT_WATCHDOG.md`, and returns a `clean`/`hit` verdict with file:line + the violated rule. A `hit` blocks the PR until the pattern is fixed or a waiver cites an ADR. The watchdog is the **negative** discipline (forbidden patterns) complementing the MCP servers' **positive** discipline (live sources). It is what catches the *next* drift at the moment it's introduced, not at the next milestone audit.

## Dependencies

- **Tickets:** T06 (the CI gate-chain skeleton — the watchdog is a workflow that `needs: contract-gate`).
- **External:** the scanner implementation (a script `tools/stack-drift-watchdog.{sh,ps1,py}` — Python is natural for the AST-aware category-3 checks; the script itself is a Tier-1 surface because a tampered watchdog is a moat-breach).

## Files

- `.github/workflows/stack-drift-watchdog.yaml` — the workflow (the placeholder T06 left). `needs: contract-gate`. Runs on the cumulative PR diff. Reports `clean`/`hit` as a gate status (pass/fail, no middle).
- `tools/stack_drift_watchdog.py` — the scanner. Implements the five categories from `STACK_DRIFT_WATCHDOG.md`:
  - **Category 1 (stack-swap-without-ADR):** `alloydb` in `infra/` (outside the cites), `warpstream`, `quickwit`, a Next-15 pin in `web/` post-ADR-0002-ratification, any new dep in `go.mod`/`package.json`/`pyproject.toml`/`Cargo.toml` without a corresponding ADR.
  - **Category 2 (stale API shape):** `thinking: {type: "enabled", budget_tokens: N}` on Opus 4.8/Sonnet 5/Fable 5/Opus 4.7; `thinking: {type: "disabled"}` on Fable 5; the old `web_search_20250305`/`web_fetch_20250910` on the current models; a same-family Critic; a model string not in the `29` §4 roster.
  - **Category 3 (contract-spine violation):** hand-written cross-language types (domain-name duplicates across `services/*/types.ts` + the `.proto`); `services/*` importing `services/*` internals; `services/*` importing `gateway`'s internals; a destructive `v1` proto edit (field removed/renamed without a `v2` + migration).
  - **Category 4 (candor-floor + security non-negotiables):** a client-supplied `tenant_id`; a credential in an LLM prompt context; an LLM-committed signature; a bare lint skip (`# noqa`/`// nolint`/`// type: ignore` without a rule code + reason + doc-pointer); a `utils.ts`/`helpers.go`/`misc.py`/`shared.ts` added; a hand-written `valid_time @>` query; `--no-verify` in a commit/CI config; an unconstrained `JSON.parse` on an LLM output; a frozen-doc edit (`docs/00_*`–`docs/27_*` + the foundation + the readiness report + the frozen enforcement docs).
  - **Category 5 (AGE↔Postgres compat):** a Postgres major bump in `infra/`/Atlas without an AGE-compat cite.
- `tools/stack_drift_watchdog/` — the scanner's rule modules (one per category) + the verdict schema (`{clean: bool, hits: [{file, line, pattern, rule, severity}]}`).
- `tools/stack_drift_watchdog/README.md` — the scanner's runbook: how to run locally, how to annotate a false positive (`// watchdog-fp: <reason> <cite>`), how to waive with an ADR (`// ADR-NN: <reason>`).
- `.github/workflows/stack-drift-watchdog.yaml`'s negative-test fixtures: a set of fixture diffs (one per category) the workflow asserts the scanner catches — the fixture PRs go in `tools/stack_drift_watchdog/fixtures/`.

## Acceptance criteria

- [ ] The scanner runs on the PR's cumulative diff + returns a `clean`/`hit` verdict matching the schema.
- [ ] **Category 1 — an `alloydb` fixture in `infra/` is caught** (exit 1 + the file:line + the ADR-0003 rule).
- [ ] **Category 2 — a `thinking: {type: "enabled", budget_tokens: 8000}` fixture on an Opus 4.8 call is caught.**
- [ ] **Category 3 — a `services/perception` → `services/decision` internal-import fixture is caught.**
- [ ] **Category 4 — a client-supplied `tenant_id` fixture (in a request body) is caught.**
- [ ] **Category 4 — a `docs/24_PROJECT_STRUCTURE.md` edit fixture is caught** (the frozen-doc-edit rule — the constitution's first non-negotiable).
- [ ] **Category 4 — a bare `// type: ignore` (no rule code) fixture is caught.**
- [ ] **Category 5 — a Postgres major bump fixture without an AGE-compat cite is caught.**
- [ ] **A clean PR returns `clean: true`** (the negative tests + the positive test).
- [ ] **A waiver with an ADR cite is honored** — a fixture `alloydb` hit annotated `// ADR-0003: <reason>` is reported as `waived` (not `hit`), with the ADR cite recorded.
- [ ] **A false-positive annotation is honored** — a fixture annotated `// watchdog-fp: <reason> <cite>` is reported as `false-positive`, not `hit`.
- [ ] The watchdog workflow reports pass/fail (no middle state); a `hit` blocks the PR.
- [ ] The scanner is itself a Tier-1 surface (a tampered scanner is a moat-breach) — its own review (T07's PR) is Tier 1.
- [ ] No frozen doc edited; the change confined to `tools/` + `.github/workflows/`.

## Tests

- **The negative-test fixtures (one per category):** `tools/stack_drift_watchdog/fixtures/<category>/` — a `bad.diff` the scanner must catch + the expected verdict.
- **The positive test:** a `clean.diff` that the scanner returns `clean: true` on.
- **The waiver test:** a `waived.diff` (an `alloydb` with `// ADR-0003`) that the scanner reports `waived`.
- **The false-positive test:** a `fp.diff` (a legit AlloyDB mention in `adr/0003`) annotated `// watchdog-fp` reported `false-positive`.
- **Tamper-resistance test:** the scanner's own code is reviewed at Tier 1; the scanner cannot be `// nolint`'d by its own rules (the scanner's source passes itself).

## Definition of Done

- [ ] Every acceptance criterion closed; the 8 negative fixtures + the 3 positive/waived/fp fixtures green.
- [ ] Coding standard met: the Python scanner passes `ruff` + `mypy --strict` on itself; the rule modules are typed; the verdict schema is a `pydantic frozen` model.
- [ ] Review passed at Tier 1: the panel includes Correctness (the categories match `STACK_DRIFT_WATCHDOG.md` §category 1–5), Stack-drift (the scanner is the reference — every forbidden pattern in E16 is implemented), Security (the scanner is tamper-resistant; a `// nolint` on the scanner fails the scanner), Architecture-alignment (the scanner's verdict schema is the one `REVIEW_STANDARDS.md`'s review record consumes), Candor-floor (the verdict is pass/fail, no middle).
- [ ] The watchdog runs on the M0 PRs (T02/T03/T04/T06 + the exemplars) — green on the legitimate diffs, blocking on the fixtures.
- [ ] Docs updated: `tools/stack_drift_watchdog/README.md` documents run + annotate + waive; `STACK_DRIFT_WATCHDOG.md` (E16) cross-references the install.
- [ ] Checkpoint written; commit-ready (`ci(t07): the stack-drift watchdog — category 1–5 forbidden-pattern scanner` with `Refs: STACK_DRIFT_WATCHDOG.md, ADR-0001, ADR-0003, ADR-0006`).

## Estimated complexity

**M — ~1 day.** The risk is the AST-aware category-3 checks (detecting a hand-written cross-language type requires diffing the `.proto` domain names against the per-service TS types) + the category-2 JSON-shape matching (the `thinking` parameter's shape in an LLM-gateway call). The mitigation: category 1 + 4 are mostly `grep`-matching; category 2 + 3 are the AST passes — start with grep-based heuristics + tighten to AST where the false-positive rate is high.

## Notes for the implementer

- **The scanner is the install of E16.** Read `STACK_DRIFT_WATCHDOG.md` (E16) *before* coding — it is the spec; every forbidden pattern there is a rule here. The scanner is the executable form of that doc.
- **The scanner's own source is a Tier-1 surface.** A `// nolint` on the scanner that suppresses a scanner rule is a moat-breach — the scanner must pass itself, no suppressions. (The tamper-resistance test.)
- **The waiver mechanism is ADR-bound, not author-bound.** A `// ADR-NN: <reason>` annotation waives a hit; a `// I think this is fine` does not. The waiver cites the ADR that authorizes the drift (`28` §8 invariant 7).
- **The category-2 patterns are the API-drift the claude-api skill flags.** The `thinking: {type: "adaptive"}` vs `budget_tokens` distinction is the one the skill's drift table names — the scanner is the CI backstop for it.
- **The category-4 frozen-doc-edit check is structural.** The scanner reads the diff's file list; a path matching `docs/0[0-9]_*.md`–`docs/27_*.md` + the foundation + the readiness report + the frozen enforcement docs is a hit. This is the constitution's first non-negotiable made executable.
- **Do not make the scanner noisy.** A scanner that fires on every doc that *mentions* AlloyDB (e.g. `adr/0003`, `docs/29`) is ignored. The cites (`adr/0003-*`, `docs/29_STACK_VERIFICATION.md`, `docs/enforcement/STACK_DRIFT_WATCHDOG.md`, the cell README's `ADR-0003` cite) are the allowlist; the false-positive annotation is the escape valve.
