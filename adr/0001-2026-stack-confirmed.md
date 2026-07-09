# ADR-0001 — The 2026 stack, confirmed

> **Status:** ACCEPTED
> **Date:** 2026-07-04
> **Supercedes:** (none — this is the record-of-reference, not a swap)
> **Evidence:** `docs/29_STACK_VERIFICATION.md` §0, §2, §5, §6 + the per-layer evidence URLs cited inline there
> **Binds at:** Phase 0

## Context

The blueprint (`docs/00_*` through `docs/27_*`) was frozen at the STOP CONDITION against a stack reached by first-principles reasoning. Before any product code, the execution strategy (`28` §3) required a complete implementation-readiness audit re-verifying every layer, dependency, framework, version, SDK, AI model, and infra/database/deployment decision against the latest 2026 evidence. Three forces made this audit non-optional:

1. **The "old tech" concern.** The founder flagged that AI coding assistants (Claude Code included) tend to reach for whatever was canonical at their training prior, not the best 2026 option. The audit is the empirical backstop: each layer was re-checked against current vendor docs / release notes / M&A filings, not against recollection.
2. **Version / SDK drift.** Frameworks the blueprint named at one version (Next.js 15-era, etc.) had moved; SDK surfaces (the Anthropic `thinking` parameter, server-tool variants) had shifted; pinning to stale versions in CLAUDE.md would have baked the exact failure the audit exists to prevent.
3. **Vendor M&A.** Two blueprint choices (WarpStream, Quickwit) had been acquired between the blueprint freeze and the audit, changing their risk posture. An audit that didn't surface that would be cosmetic.

The audit answered one question per layer: *is the blueprint choice still the BEST 2026 choice, not merely a still-working one?* Where the answer was yes, this ADR records the confirmation. Where the answer was no, the finding became a swap ADR (`0002`–`0005`); the model roster finding became `0006`.

## Decision

**Confirm the audited stack as the foundation of record.** The 11 confirmed layers (per `29` §2) hold as the best 2026 choices given the architecture's invariants; the 5 verify-at-milestone items (per `29` §5) are scheduled, not deferred-risks; the 4 vendor swaps (`29` §3) and the cross-family model roster (`29` §4) are recorded as their own ADRs and ratified at the milestones they bind to. This ADR is the **record-of-reference** — it is not itself a swap, it is the audited confirmation that the rest of the stack holds, with the swaps isolated rather than papered over.

The 11 confirmed layers: Next.js 16-era web (React 19.2, Tailwind v4, Radix); the polyglot services (Hono 4 / Go 1.24+ / Python 3.12–3.13 + FastAPI); self-managed Postgres via CNPG + Apache AGE + pgvector + RLS (the subject of ADR-0003); Atlas migrations; ClickHouse for the dial's three-axis ledger; FalkorDB as the KG graduation target; pgvector → Qdrant/Turbopuffer as the vector graduation target; Redpanda → AutoMQ as the bus graduation target (ADR-0004); Temporal self-hosted → Temporal Cloud; the custom LLM gateway on LiteLLM with constrained decoding + a cross-family Critic (ADR-0006); sglang (vLLM fallback); Memorystore for Valkey 9.0; WorkOS + Cedar + Vault; OpenTelemetry + Langfuse + Phoenix; Argilla for ground truth (not LLM-as-judge); GCP + Cloudflare edge; OpenTofu + Argo CD + CNPG; Nx + pnpm + uv + go.work + Buf + Biome + Ruff + golangci-lint.

The 5 verify-at-milestone items: the JS runtime (Bun spike vs Node 22 LTS for the MVP), the 2026 open frontier model (watch, don't pin), the Prolific-class human-eval panel vendor, Modal privacy-tier isolation (reaffirmed as a spike tier), and Cedar vs OPA (reaffirmed Cedar for the <2 ms p99 invariant).

## Alternatives Considered

- **Skip the audit and trust the blueprint versions.** Rejected. The "old tech" concern is exactly this failure mode. The audit is the evidence the choices still hold; skipping it would make the foundation a matter of faith, and the first drift would land in product code where it is most expensive to fix.
- **Re-derive the whole stack from scratch.** Rejected. The blueprint's *architecture-layer* choices (two-spine truth/action, six bounded LLM seams, one-cloud+edge, Temporal owns the closed loop) are sound and were stress-tested through 8 specialist critiques + the final synthesis. Only *versions, SDKs, and vendor ownership* drifted. Re-deriving the architecture would discard frozen, audited work and re-introduce the exact rework the execution strategy is built to prevent.
- **Audit but record findings as silent edits to the frozen docs.** Rejected by the constitution (`ENGINEERING_CONSTITUTION.md` non-negotiables; `28` §8 invariant 7). A frozen doc is never edited; a verified-better choice is an ADR that supercedes by reference. Silent edits would erase the architecture-of-record and make the foundation un-auditable.

## Consequences

**Positives:**
- The foundation is now evidence-backed per layer, not recollection-backed; each row in `29` §2 carries a live source.
- The four vendor-risk swaps are isolated as ADRs with explicit milestone binding, so the foundation docs reflect resolved 2026 vendor reality without rewriting the frozen architecture.
- The readiness scores are reaffirmed at their honest values (three at 9.5, three at 9.0, one at 8.5) — the audit gathered evidence; it did not inflate.
- The verify-at-milestone list is the input to the stack-verification checklist (E06), so the morning-of-the-milestone drill is already defined.

**Negatives / risks:**
- Four swaps mean four ADRs and their closure work; ADR-0003 in particular makes the infra/SRE first hire non-deferrable at M1 (founder-funding-conditional per `28` §7).
- Five items are explicitly *not* closed (verify-at-milestone); the audit names them but does not resolve them — they must not be read as resolved.
- The audit is a point-in-time snapshot (July 2026); the stack-drift watchdog (E16) is the mechanism that catches the *next* drift, not this audit.

**Closure work required:**
- ADR-0002 / 0003 / 0004 / 0005 / 0006 — the swap and roster ADRs this audit produced.
- The per-language dependency inventory (`29` §6) becomes the input to the contract-codegen + lint gates in CLAUDE.md §7.
- The stack-verification checklist (E06, `docs/enforcement/STACK_VERIFICATION_CHECKLIST.md`) operationalizes the verify-at-milestone list as a recurring confirmation.
- The stack-drift watchdog (E16) encodes the forbidden-pattern list so the *next* drift is caught on PR, not in production.

## References

- `docs/29_STACK_VERIFICATION.md` §0 (verdict), §2 (confirmed stack), §5 (verify-at-milestone), §6 (dependency inventory), §7 (ADR index)
- `docs/28_EXECUTION_STRATEGY.md` §3 (the audit mandate), §8 invariant 7 (a swap is an ADR)
- `docs/enforcement/ENGINEERING_CONSTITUTION.md` non-negotiables (frozen doc never edited)
- `CLAUDE.md` §2 (the stack table the audit produced) + §3 (the four ADRs)
