# T09 — MCP config install (context7 + buf)

> **Tier:** 1 (scoped-authority is a security surface) | **Status:** pending | **Milestone:** M0
> **Cites:** `MCP_PLAN.md` (E15 — **the spec for this ticket**) · `28` §3 (MCP for live docs as the old-tech antidote) · `CLAUDE.md` §2 (the stack) · `29` §6 (the toolchain) · `ENGINEERING_CONSTITUTION.md` non-negotiables (an LLM never holds a credential) · the claude-api skill live-source discipline

## Objective

Install the **M0-tier MCP servers** from `MCP_PLAN.md` (E15): `context7` (the live-docs server — current API for the stack's libraries) + `buf` (the contract-package state MCP). The MCP servers are the **positive** discipline — the AI author reads live sources at the point of use — complementing the watchdog's negative discipline. M0 installs only the no-infra-dependency servers (context7 is pure docs; buf installs with the contract package from T02). The `postgres`/`playwright`/`github` MCP servers land at their milestones (M1/M6/M3 per E15).

## Dependencies

- **Tickets:** T01 (the workspace — `.mcp.json` lives at the repo root), T02 (the contract package — the buf MCP reads T02's contract state).
- **External:** the context7 MCP server (the canonical live-docs server); the `buf` CLI's MCP exposure (or a thin wrapper MCP over `buf`).

## Files

- `.mcp.json` (the repo root) — the MCP server config:
  - `context7` — the live-docs server. No credential (it's public docs). Scoped to resolve the stack's libraries (Next.js 16, Hono 4, Temporal, LiteLLM, Cedar, CNPG, AGE, Atlas, Buf, Biome, Ruff, golangci-lint).
  - `buf` — the contract-package MCP. Scoped to read-only + `buf breaking`/`buf generate` (no repo write). The credential (if the buf MCP needs one for a private BSR) is an env-var reference, not a value in `.mcp.json`.
- `.mcp.json` must **not** contain a credential value (only env-var names); the credential lives in the environment / Vault.
- `docs/enforcement/MCP_CONFIG.md` (Tier-3) — the runbook for the MCP install: how to add a server at a milestone (the M1/M3/M6 tiers from E15), the scoped-authority rule, the "do I need an MCP for this?" test from E15.

## Acceptance criteria

- [ ] `.mcp.json` is valid JSON + parses in Claude Code; the two servers (`context7`, `buf`) are connected (Claude Code lists them as available MCP servers).
- [ ] **context7 returns current docs** — a query for, e.g., Next.js 16's App Router returns the current API surface (verified by a query at install time + the response cites a current version, not a stale one).
- [ ] **buf MCP returns the contract state** — a query for the current `.proto` inventory returns the four v1 packages T02 shipped + `buf breaking` runs against the M0 baseline.
- [ ] **No credential value in `.mcp.json`** — `grep -iE '(key|secret|token|password)' .mcp.json` returns only env-var *names* (e.g., `${BUF_TOKEN}`), no values (verified by the secret-scan gate, T06).
- [ ] The buf MCP is **read + codegen only** — it does not write to the repo; it does not author a `.proto` (the `AI_USAGE_RULES.md` §C rule — no autonomous Tier-1 authoring).
- [ ] The context7 MCP is **read-only** by construction (it's public docs).
- [ ] `.mcp.json` is version-controlled (in the repo) + reviewed (this ticket's review).
- [ ] The MCP_CONFIG runbook documents the install tiers (M0: context7 + buf; M1: postgres; M3: github; M6: playwright) + the scoped-authority rule + the "do I need an MCP" test.
- [ ] No frozen doc edited; the change confined to `.mcp.json` + `docs/enforcement/MCP_CONFIG.md`.

## Tests

- **Connectivity test:** Claude Code lists `context7` + `buf` as available MCP servers (the `.mcp.json` parses + the servers connect).
- **Live-read test:** a query to context7 returns a current doc (the response cites a current version — e.g., Next.js 16.x, not 15.x — the whole point of the "old tech" antidote).
- **Buf-state test:** a query to the buf MCP returns the four v1 packages + `buf breaking` against the M0 baseline is green.
- **No-credential test:** the secret-scan gate (T06) on `.mcp.json` is green (no `AKIA...`-shaped string; no value where an env-var name should be).
- **No-write test:** the buf MCP cannot write to the repo (a fixture write attempt is rejected — the MCP's scope is read + codegen, not repo-write).

## Definition of Done

- [ ] Every acceptance criterion closed; connectivity + live-read + buf-state + no-credential + no-write tests green.
- [ ] Coding standard met: `.mcp.json` parses; the runbook is accurate.
- [ ] Review passed at Tier 1: the panel includes Security (the scoped authority — the buf MCP is read-only; no credential in `.mcp.json`), Architecture-alignment (the MCP install matches `MCP_PLAN.md` E15 — M0 is context7+buf, not the M1/M3/M6 servers), Stack-drift (context7 returns the *current* API, the old-tech antidote), AI-Intelligence (N/A for the install, but the MCP's live-reads feed the AI author's accuracy), Correctness (the servers connect + return what they claim).
- [ ] Stack-drift watchdog green: no credential in `.mcp.json`; the context7 + buf are the audited servers (`29` §6).
- [ ] Docs updated: `docs/enforcement/MCP_CONFIG.md` (the runbook) is written; `MCP_PLAN.md` (E15) cross-references the M0 install.
- [ ] Checkpoint written; commit-ready (`chore(t09): install the M0-tier MCP servers (context7 + buf) per E15` with `Refs: MCP_PLAN.md, ADR-0001, 29 §6`).

## Estimated complexity

**S — ~0.5 day.** The risk is the buf MCP's exposure shape (whether `buf` exposes an MCP server directly or a thin wrapper is needed). The mitigation: if `buf` has no native MCP, a 50-line wrapper MCP over `buf lint`/`buf breaking`/`buf generate`/`buf ls-files` is the fallback (the `MCP_PLAN.md` E15 "do I need an MCP" test covers this).

## Notes for the implementer

- **M0 installs only context7 + buf.** The `postgres` (M1), `github` (M3), `playwright` (M6) MCP servers land at their milestones per E15 — do not install them now (an MCP pointed at infrastructure that doesn't exist is noise; `MCP_PLAN.md` E15's install tiers).
- **The `.mcp.json` is a Tier-1 security surface.** A loose scope (the buf MCP with repo-write, or a credential in the file) is a moat-breach. Review at Tier 1; the secret-scan gate + the watchdog both check it.
- **No credential in `.mcp.json`.** The buf MCP, if it needs a BSR token, takes `${BUF_TOKEN}` (the env-var name); the value is in the environment / Vault. A credential in `.mcp.json` is a watchdog hit (category 4) + a secret-scan block (T06).
- **The context7 server is the "old tech" antidote's install.** The audit (`29`) + the watchdog (E16/T07) catch drift; context7 is the *positive* — the AI reads the *current* Next.js 16 / Hono 4 / etc. API, not its training-prior. The live-read test (a context7 query returns a current version) is the proof the install works.
- **Do not add a server not in `MCP_PLAN.md` (E15).** A "convenient" extra MCP server is an unratified swap (watchdog category 1 for the toolchain, loosely). Add servers by editing E15 + this ticket's install-tier table + the runbook, not by adding to `.mcp.json` ad hoc.
- **The MCP servers do not author Tier-1 code.** The buf MCP runs `buf generate` (mechanical); it does not author a `.proto`. The `AI_USAGE_RULES.md` §C rule holds for MCP servers too — a server that authors is forbidden; a server that runs mechanical codegen or returns live reads is allowed.
