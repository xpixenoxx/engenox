# MCP Configuration Plan

> **Status: FROZEN (the plan).** The Model Context Protocol servers the Engenox workflow connects to Claude Code, so the AI author works from *live* sources — live vendor docs, the actual contract-codegen state, the actual cluster introspection, the actual e2e harness — not from training-prior recollection (the "old tech" failure mode). This is the *plan*; the installed `.mcp.json` lands at M0. Authored against `28_EXECUTION_STRATEGY.md` §3 (MCP for live docs as the old-tech antidote) + `CLAUDE.md` §2 (the verified stack) + `29_STACK_VERIFICATION.md` §6 (the toolchain) + the claude-api skill (live-source discipline).

---

## The principle: live sources over recollection

The audit (`29`) and the stack-drift watchdog (E16) exist because AI recollection drifts. MCP servers are the *positive* complement: they give the AI author **live, authoritative sources at the point of use** — the current API surface, the current SDK signature, the current extension list, the current cluster state. The rule: **when an AI author is about to write a binding against an external surface, it reads that surface through an MCP server (or a live WebFetch), not from memory.** (`28` §3.)

This is the operational form of the claude-api skill's discipline: "Never guess SDK usage … must come from explicit documentation — either the live-sources or the official SDK repositories." MCP is how that live-source discipline is wired into the daily flow rather than invoked ad hoc.

## The MCP servers (planned)

| Server | What it provides | Why it's in the plan | The discipline it enforces | Install tier |
|---|---|---|---|---|
| **context7** (or the canonical live-docs MCP) | the current docs for the stack's libraries (Next.js 16, Hono 4, Temporal, LiteLLM, Cedar, CNPG, AGE, Atlas, Buf, Biome, Ruff, golangci-lint, etc.) on demand | the "old tech" antidote — the AI reads the *current* API, not its training-prior | no AI-authored binding against a library's API without a live-docs read for the current version | M0 |
| **buf** (or a `buf`-CLI MCP wrapper) | the contract-package state — the current `.proto` inventory, `buf breaking` against the last release, `buf generate` output state, the dependency graph | the contract-spine-first rule (`CLAUDE.md` §4) made live — the AI sees the actual contract surface, not a remembered one | no cross-language type authored without the current contract state; `buf breaking` is the gate, the MCP is the visibility | M0 (with the contract ticket) |
| **postgres** (a Postgres MCP) | the CNPG cluster's live introspection — extensions installed (AGE, pgvector), roles, RLS policies, the dial's three-axis ledger schema | ADR-0003's cluster is the truth spine; the AI reads the *actual* schema + the *actual* RLS, not a remembered one | no `valid_time @>` query hand-written (the `assertion_view` is the only path, `CLAUDE.md` §5); no RLS policy authored without the live role/policy state | M1 (when the cluster is live) |
| **playwright** (the Playwright MCP) | the e2e harness state — the current `<10-minute journey` run, the 1-click-PR flow, the candor-report render | the candor-floor surfaces (the CI on the lift, the contrarian block, the Provenance Audit Hover) are verified live, not asserted | no "the candor report renders" claim without a live Playwright run (`26` §4, `e2e/`) | M6 (when `web/` is real) |
| **github** (the GitHub MCP, optional) | the PR state for the `services/action/` GitHub-App tests — the open-PR workflow the action seam drives | the action seam's closed loop is `propose → open-PR`; the AI verifies the open-PR path against a real PR, not a mock | a `services/action/` change is verified against a live GitHub-App PR flow | M3 (when the action seam lands) |

## The install tiers (when each lands)

The MCP servers are not all installed at once — they install with the milestone that needs them, because an MCP server pointed at infrastructure that doesn't exist yet is noise.

- **M0 — context7 + buf.** context7 from the start (it's pure docs; it has no infra dependency). buf installs with the contract ticket (the first M0 ticket, E17's lead) — `buf generate` must work for the contract spine to exist, and the buf MCP gives the AI the live contract state.
- **M1 — postgres.** Installs when the CNPG cluster is live (ADR-0003's cell template provisioned at M0, cluster accepting writes at M1). Before the cluster exists, the postgres MCP has nothing to read; after, it's the truth-spine visibility layer.
- **M3 — github.** Installs with `services/action/` (the GitHub-App PR seam). Before the action seam, there's no PR flow to introspect in-product.
- **M6 — playwright.** Installs when `web/` is real (Next.js 16 per ADR-0002, ratified at M6). Before, there's no UI to drive the e2e against.

## The configuration discipline (the `mcp.json` rules)

The installed `.mcp.json` (M0 onward) follows these rules — the configuration is itself an enforcement surface, so it's reviewed at the tier of what it touches:

- **An MCP server is scoped to the least authority it needs.** The postgres MCP connects with a read-introspection role, not the superuser. The buf MCP runs `buf breaking`/`buf generate` in a sandbox, not with write to the repo. The github MCP scopes its token to the test org's repos, not the founder's personal account. (`ENGINEERING_CONSTITUTION.md` non-negotiable: an LLM never holds a credential — the MCP server holds a scoped credential, not the model.)
- **No MCP server reads or writes a frozen doc.** The MCP servers operate on *live* surfaces (vendor docs, the contract package, the cluster, the harness, the PRs); the frozen blueprint is never an MCP target. A frozen-doc "live read" is the file on disk, not an MCP-mediated view.
- **No MCP server authors Tier-1 code autonomously.** The buf MCP can run `buf generate` (mechanical codegen); it cannot author a `.proto` without review. The postgres MCP can introspect; it cannot write a migration. The github MCP can read a PR; it cannot merge one. (`AI_USAGE_RULES.md` §C.)
- **The MCP configuration is version-controlled + reviewed.** `.mcp.json` is in the repo; a change to it (a new server, a scope change) is a PR, reviewed at the tier of the surface it touches (a postgres-MCP scope change is Tier 1 because it touches the truth spine's authority).
- **An MCP server that requires a credential stores it in the environment / a secret manager, not in `.mcp.json`.** The `.mcp.json` references the env var name; the value is in Vault (or the local env for dev). A credential in `.mcp.json` is a blocker (the secret-scan gate, `CLAUDE.md` §7).

## The "do I need an MCP for this?" test

Before adding an MCP server, the test:
1. Does the AI author bind against a surface that *drifts* (an API, a schema, a cluster state, a harness)? If yes — an MCP (or a live WebFetch) is the discipline.
2. Does the surface have a *canonical* MCP server (context7 for docs, buf for contracts, postgres for the cluster, playwright for e2e, github for PRs)? If yes — use it.
3. If no canonical server — is a *live WebFetch* of the authoritative doc sufficient (the audit's AlloyDB-extensions check was a WebFetch, not an MCP)? If yes — WebFetch; MCP is for *recurring* live access, not one-shot.
4. If neither — the AI falls back to the patterns in the claude-api skill's language files + a compile/interpret loop against local errors. It does **not** fall back to recollection.

## What this doc is not

- It is **not** the installed `.mcp.json` — that lands at M0 (context7 + buf) and grows per the install tiers.
- It is **not** a license to bypass the audit or the watchdog — the MCP servers are the *positive* live-source discipline; the watchdog (E16) is the *negative* forbidden-pattern discipline. Both hold.
- It is **not** a license for the AI to act on live data without review — the postgres MCP gives the AI the live RLS state; the AI's *change* to RLS is still a Tier-1 review (`REVIEW_STANDARDS.md`).
- It is **not** static — a new MCP server (a new live surface the AI binds against) is added by PR to this doc + the `.mcp.json`; the addition is dated + cited with the surface it covers.

---

*End of MCP configuration plan. Next enforcement artifact: stack drift watchdog specification (E16, `docs/enforcement/STACK_DRIFT_WATCHDOG.md`).*
