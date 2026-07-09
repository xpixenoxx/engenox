# Stack Drift Watchdog Specification

> **Status: FROZEN.** The PR-time forbidden-pattern sentinel. The audit (`29`) is the *point-in-time* confirmation; the stack-verification checklist (E06) is the *milestone-time* drill; **this is the *PR-time* backstop** — it scans every diff for the drift patterns the audit + the ADRs already forbid, and blocks the PR until the drift is either fixed or waived with an ADR. Authored against `28_EXECUTION_STRATEGY.md` §3 (the old-tech-drift watchdog) + §8 invariant 7 (a swap is an ADR, not a silent edit) + `CLAUDE.md` §2/§3/§8 + ADR-0001/0003 + the claude-api skill's drift table.

---

## The one job

> **On every PR, scan the cumulative diff for the forbidden patterns below. Return the hits (file:line + the pattern) or a clean verdict. A hit blocks the PR until the pattern is fixed or a waiver cites the ADR that authorizes it.** The watchdog does not review judgement; it pattern-matches.

The watchdog is the **negative** discipline — the forbidden patterns — where the MCP servers (E15) are the **positive** discipline (live sources). The audit (`29`) caught the *first* drift; the watchdog catches the *next* drift, at the moment it's introduced.

## The forbidden-pattern categories

Each category is a list of patterns the watchdog matches against the diff. A pattern is matched literally (a string in the diff) or structurally (an import-graph / type-graph rule). The watchdog returns `hit`/`clean` + the file:line + the violated rule.

### Category 1 — Stack-swap-without-ADR (the unratified swap)

A version / framework / vendor swap that an ADR has not ratified. (`28` §8 invariant 7; `CLAUDE.md` §3.)

- **AlloyDB re-introduced.** Any `alloydb` reference in `infra/` (outside `adr/0003-*` + `docs/29_STACK_VERIFICATION.md` + this doc) is a hit — ADR-0003 swapped to CNPG; AlloyDB is forbidden. (`File: infra/tofu/modules/cell/*.tf`.)
- **WarpStream re-introduced.** Any `warpstream` reference in `services/`/`infra/` is a hit — ADR-0004 swaps to AutoMQ at the graduation trigger; until ADR-0004 is ACCEPTED, Redpanda is interim, WarpStream is forbidden.
- **Quickwit re-introduced.** Any `quickwit` reference is a hit — ADR-0005 defers the verbatim-FTS tier; Postgres FTS is the MVP path.
- **Next.js 15 re-pinned** (before ADR-0002's M6 ratification). A `package.json` in `web/` pinning `next: "^15"` is a hit — ADR-0002 (PROPOSED, ratifies at M6) upgrades to 16; a Next-15 pin before M6 is *expected* (M0–M5 use 15), so this pattern is **M6-conditional** — the watchdog checks the ADR-0002 status before flagging. (A pre-M6 Next-15 pin is clean; a post-ratification Next-15 pin is a hit.)
- **Any new framework/vendor/SDK not in the audited stack** (`29` §2). A new dep in any `go.mod`/`package.json`/`pyproject.toml`/`Cargo.toml` without a corresponding ADR is a hit — the AI doesn't silently add `langchain` or `prisma` or `typeorm` without an ADR authorizing it.

### Category 2 — Stale API shape (the LLM binding drift)

The models + the API surfaces the audited roster + the claude-api skill pin. (`29` §4; ADR-0006; `CLAUDE.md` §2; the claude-api-skill drift table.)

- **`thinking: {type: "enabled", budget_tokens: N}`** on any call to Opus 4.8 / Sonnet 5 / Fable 5 / Opus 4.7 is a hit — the old shape is rejected with a 400 on the current models. The active shape is `{type: "adaptive"}`. (`29` §4.)
- **`thinking: {type: "disabled"}`** on a Fable 5 call is a hit — Fable 5's thinking is always-on; the parameter is omitted. (`29` §4.)
- **`thinking: {type: "enabled", budget_tokens: N}`** on a Fable 5 call is a hit (same — rejected with a 400). (`29` §4.)
- **`web_search_20250305` / `web_fetch_20250910`** (the old server-tool variants) on Opus 4.8 / 4.7 / 4.6 / Sonnet 5 / Sonnet 4.6 calls is a hit — the dynamic-filtering variants (`web_search_20260209` / `web_fetch_20260209`) are current on those models. (Vertex AI is basic-only — a docs note in the call site exempts Vertex.) (`29` §4.)
- **A same-family Critic.** A Critic call hitting the same model family as the seam it critiques is a hit — the cross-family property is the invariant (ADR-0006). The watchdog maps each seam's family + the Critic's family and flags a collision.
- **A model string not in the audited roster** (`29` §4: `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5`, `claude-fable-5`, the GPT-5-class + Gemini 3-class Critic slots) is a hit, unless accompanied by an ADR adding it. The AI does not silently switch to `claude-sonnet-4-6` or `gpt-4o`.

### Category 3 — Contract-spine violation (the cross-language type drift)

`pkg/contracts/` is the only cross-language type source. (`CLAUDE.md` §4; `24` §3.)

- **A hand-written cross-language type.** A type duplicating a contract type (the same domain name in `services/*/types.ts` + the `.proto`) is a hit — the contract is the source. (The watchdog diffs the contract inventory against the per-service types for duplicated domain names.)
- **`services/*` imports another `services/*`'s internals.** An import of `services/decision/...` from `services/perception/...` is a hit — cross-service calls go through the contract or the gateway, not internal imports. (`24` §4.)
- **`services/*` imports `gateway`'s internals.** The gateway is leaf-only; only the seam's typed contract crosses. (`24` §3.)
- **A `v1` namespace edited destructively.** A field *removed* or *renamed* from a `pkg/contracts/proto/engenox/<domain>/v1/*.proto` without a `v2` + a migration + an ADR is a hit — strict add-only within a version (`14` §5 + `18` §8).
- **`buf breaking`** is the gate (the structural check); the watchdog's category-3 patterns are the *diff-level* check that runs before `buf breaking` and catches the import/type-duplication drift `buf breaking` doesn't see.

### Category 4 — The candor-floor + security non-negotiables (the moat-breach drift)

The invariants the constitution makes non-negotiable. (`ENGINEERING_CONSTITUTION.md` non-negotiables; `CLAUDE.md` §8.)

- **A client supplies `tenant_id`.** A `tenant_id` field in a client-supplied payload (a request body, a client-side form, a URL param the client sets) is a hit — the tenant boundary comes from the server, never the client. (The RLS-introspection gate is the structural check; this is the diff-level preemptive.)
- **An LLM holds a credential.** A credential (API key, secret, token) passed into an LLM prompt context, a prompt template, or a seam's input is a hit — the LLM never holds a credential. (`AI_USAGE_RULES.md` §E.)
- **An LLM commits.** A commit authored/signed by an LLM (a `Co-Authored-By:` trailer alone is fine — that records contribution — but a *signature* by the model, or an automated `git commit` from an LLM seam, is a hit) — the LLM never commits; the human's signature seals the commit-to-state.
- **A bare lint skip.** A `# noqa`, `// nolint`, `// type: ignore` without a rule code + a reason + a doc-pointer is a hit — `# type: ignore[arg-type]  // 11 §2c: <reason>` is the form (`CODING_STANDARDS.md` §8/§9).
- **A `utils.ts` / `helpers.go` / `misc.py` / `shared.ts` catch-all** added is a hit — a module is named for its concern, not a grab-bag (`CODING_STANDARDS.md` §4; `24` §3).
- **A hand-written `valid_time @>` query** (a bi-temporal query outside the `assertion_view` library) is a hit — the `assertion_view` is the only bi-temporal read path (`13` §3; `CLAUDE.md` §5).
- **`--no-verify` / a hook bypass** in a commit log or a CI config is a hit — a failed hook is investigated, not bypassed (`AI_USAGE_RULES.md` §E).
- **An unconstrained `JSON.parse` on an LLM output.** A seam that parses an LLM's output with a bare `JSON.parse` / `json.loads` / a template-interpolation instead of the constrained-decoding schema is a hit — the seam parses via Outlines/XGrammar/GBNF or returns a typed `Result.err` (`CLAUDE.md` §7).
- **A frozen doc edited.** A change to `docs/00_*` through `docs/27_*`, the foundation docs, the readiness report, or a previously-frozen enforcement doc, is a hit — the frozen doc is never edited; the change is an ADR. (The watchdog's `git-log` check on the diff is the structural verifier for the constitution's first non-negotiable.)

### Category 5 — The AGE↔Postgres compatibility matrix (ADR-0003 closure)

- **A Postgres major bump without an AGE-compat confirmation.** A `postgres` version bump in `infra/tofu/modules/cell/` or the Atlas baseline without a corresponding AGE compatibility check (the AGE release-notes cite in the PR) is a hit — ADR-0003 closure work named the matrix as a tracked invariant. The watchdog flags the bump; the AGE-compat cites the release notes.

## The runtime (where the watchdog runs)

- **PR-time, on the cumulative diff.** The watchdog runs as a CI job in `.github/workflows/` (the gate chain, `CLAUDE.md` §7) on every PR, after the format/lint step, before the review-gate step. It scans the cumulative diff (the PR tip vs the merge target).
- **Author-time, as a peer to the lint.** The founder-local pre-commit runs the watchdog on the staged diff so a drift is caught before the PR, the same as a format error.
- **Subagent-form, in the review panel.** The `stack-drift-watchdog` subagent (`SKILLS_SUBAGENTS_PLAN.md`, E14) is the agent form of the same patterns, spawned by the Tier-1 review panel for a structured verdict + the specific hits.
- **Milestone-time, in the checklist.** The morning-of-the-milestone preamble (`STACK_VERIFICATION_CHECKLIST.md`, E06) runs the watchdog on the milestone's cumulative diff — zero hits required to close the gate.

## The verdict + the waiver

- **A clean verdict** returns `clean: true` + the diff scope. The PR proceeds to the review gate.
- **A hit verdict** returns the hits: each `{file, line, pattern, rule, severity}`. The PR is blocked.
- **A hit is fixed** by editing the diff (remove the AlloyDB reference, fix the `thinking` shape, move the type to the contract).
- **A hit is waived** only by an ADR cite — `// ADR-NN: <reason>` in the diff at the hit site + the ADR filed + ratified (or PROPOSED-to-ratify-at-milestone with the founder's sign-off for the interim). A waiver without an ADR is not a waiver; the PR stays blocked. (`28` §8 invariant 7.)
- **The waiver record** is part of the review record (`REVIEW_STANDARDS.md`, E08): the watchdog's hits + the waivers-with-ADR-cite are named in the PR description.

## The false-positive discipline

The watchdog pattern-matches, so it produces false positives (a doc that *mentions* AlloyDB; a test fixture that *simulates* a drift). The discipline:
- **A false positive is annotated**, not suppressed silently: the annotation cites why it's a false positive (`// watchdog-fp: this is the AlloyDB-rejection test fixture, adr/0003 §alternatives`) — and the annotation itself is a reviewable line.
- **The false-positive rate is monitored.** A pattern that produces >N false positives is refined (the pattern is tightened), not the suppressions multiplied — a noisy watchdog is ignored, and an ignored watchdog is no backstop.
- **A suppression is scoped to the line**, not the file — `// nolint`, file-level disables, or a `watchdog: off` block is a hit in itself unless it cites an ADR.

## What this doc is not

- It is **not** a substitute for the audit — `29` is the evidence; this is the recurring diff-level check.
- It is **not** a substitute for the checklist — E06 is the milestone-time drill; this is the PR-time drill. Both run.
- It is **not** a substitute for review — `REVIEW_STANDARDS.md` (E08) is the judgement; this is the pattern-match. A clean watchdog verdict does not mean a clean review — a diff can pass all forbidden patterns and still be wrong on the lenses.
- It is **not** static — the pattern list grows as the ADRs grow (each new ADR adds its supercession to the forbidden list); the install is amended by PR, this doc by an edit (dated + cited; the doc itself is frozen, so the amendment is a dated section).

## The summary table (the install manifest)

| Category | Pattern families | Severity | Waiver |
|---|---|---|---|
| 1 — stack-swap-without-ADR | AlloyDB, WarpStream, Quickwit, Next-15-post-M6, unlisted deps | block | an ADR |
| 2 — stale API shape | `budget_tokens`, Fable-5 `thinking`, old server-tool variants, same-family Critic, unlisted models | block | an ADR (ADR-0006 / a successor) |
| 3 — contract-spine violation | hand-written cross-language types, cross-service internals, gateway-internals, destructive `v1` edits | block | a `v2` migration + an ADR |
| 4 — candor-floor + security | client-supplied `tenant_id`, LLM-credential, LLM-commit, bare lint skip, `utils.ts`, hand-written `valid_time @>`, `--no-verify`, unconstrained `JSON.parse`, frozen-doc edit | block | an ADR (or, for the lint skips, the rule-code+reason+doc-pointer form) |
| 5 — AGE↔Postgres compat | Postgres major bump without AGE-compat cite | block | the AGE release-notes cite in the PR |

---

*End of stack drift watchdog specification. This completes the enforcement environment (E01–E16). Next: the M0 implementation plan + tickets (E17, `docs/tickets/M0/`).*
