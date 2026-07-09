# Architecture Decision Records (ADR)

> **Status: FROZEN (the system).** The post-STOP-CONDITION change log. The blueprint documents (`docs/00_*` through `docs/27_*`) are FROZEN and are **never edited**; every architectural change after the STOP CONDITION is recorded here as an ADR that *supercedes* a documented choice at implementation time, citing the evidence. Authored against `21_DEVELOPMENT_GUIDELINES.md` §3 (the docs + adr coupling) + `28_EXECUTION_STRATEGY.md` §8 invariant 7 + `29_STACK_VERIFICATION.md` §7 (the ADRs the audit produced).

---

## The ADR discipline

- **A frozen doc is never edited.** A verified-better-2026-choice, a new constraint, a reversal — all become ADRs. The frozen doc stays as the architecture-of-record; the ADR is the audited change.
- **An ADR supercedes by reference, not by rewrite.** The ADR cites the doc + section it supercedes (`supercedes: 00 §1 layer 3`); the implementation follows the ADR; the doc is not rewritten.
- **A doc-pointer in code is stable.** `// 11 §2c` is stable across doc-updates because the docs are numbered + section-edited in place (`21` §3, `24` §7). An ADR citation is added to the code comment as `// ADR-NN` or `TODO(ADR-NN, owner)` (`22` §5).
- **ADR states:** `PROPOSED` (drafted, not yet ratified) · `ACCEPTED` (ratified, in effect) · `DEPRECATED` (superseded by a later ADR) · `REJECTED` (drafted and rejected, kept for the record).
- **Numbering:** four-digit, zero-padded, monotonic. `adr/NNNN-<kebab-slug>.md`. Once a number is assigned it is never reused, even if the ADR is rejected or deprecated.
- **Every ADR carries:** Context (the forces) · Decision (the choice + the why) · Alternatives Considered (the rejected options + why) · Consequences (positives + negatives + the closure work) · Supercedes (the doc + section) · Status · Date · Evidence (the `29_STACK_VERIFICATION.md` section or external source).
- **Ratification:** an ADR is `ACCEPTED` when the founder (acting as the 15-role engineering team, `21` §2) signs it; it transitions to `ACCEPTED` in the file's Status line. PROPOSED ADRs are drafts the founder may ratify at the milestone they bind to.

## The ADRs the stack audit produced (`29_STACK_VERIFICATION.md` §7)

| ADR | Title | The swap / record | Status | Binds at |
|---|---|---|---|---|
| `0001` | The 2026 stack, confirmed | the audit itself (record-of-reference; the 11 confirmed layers + 5 verify-at-milestone items) | **ACCEPTED** | Phase 0 |
| `0002` | Next.js 16 over 15 | Swap 1 (`00` §1 layer 1 ⚠️ resolves to UPGRADE) | **PROPOSED** (ratify at M6) | M6 |
| `0003` | Self-managed Postgres (CNPG) over AlloyDB, for AGE support | Swap 2 (AlloyDB does not support AGE; the AGE-in-transaction invariant forces the fallback) | **ACCEPTED** | **M0 + M1** |
| `0004` | AutoMQ as the bus graduation target, over WarpStream | Swap 3 (WarpStream now Confluent→IBM) | **PROPOSED** (ratify at the bus graduation trigger) | Phase-2 graduation |
| `0005` | The verbatim-FTS tier is deferred; Postgres FTS for the MVP | Swap 4 (Quickwit now Datadog; re-evaluate at the corpus-search milestone) | **PROPOSED** (ratify at the corpus-search milestone) | Phase-2 |
| `0006` | The 2026 cross-family model roster (the Critic + the seam assignments) | the model audit (`29` §4) | **PROPOSED** (ratify at M2) | M2 |

**ADR-0001 and ADR-0003 are ACCEPTED at Phase 0** because they bind to Phase-0 / M0 work: ADR-0001 is the audit record; ADR-0003 informs the cell template provision (`infra/tofu/modules/cell` must provision CNPG, not AlloyDB). ADR-0002/0004/0005/0006 are PROPOSED and ratify at their binding milestones — drafted now so the foundation docs reflect the resolved vendor-risk, executed when their milestone arrives.

## The ADRs that will come later (milestone-bound, not yet drafted)

- `adr/0007-…` and onward — the implementation-time decisions: the first Cedar policy binding, the first RLS policy template, the dial's three-axis ledger schema, the corpus WORM layout, the federated-substrate design, etc. These are drafted at their milestone, not pre-emptively.
- The `adr/` index grows monotonically; an ADR is never deleted (rejected/deprecated ones are kept for the record, with a Status line explaining why).

## The template

```markdown
# ADR-NNNN — <Title>

> **Status:** PROPOSED | ACCEPTED | DEPRECATED (by ADR-MMMM) | REJECTED
> **Date:** YYYY-MM-DD
> **Supercedes:** <doc + section, e.g. `00 §1 layer 3`> | (none)
> **Evidence:** `docs/29_STACK_VERIFICATION.md` §<section> + <external sources>
> **Binds at:** <milestone, e.g. M0 + M1>

## Context
<the forces — why this decision is being considered, what constraint or evidence is in play>

## Decision
<the choice + the why — one paragraph, the rationale>

## Alternatives Considered
<the rejected options + why each was rejected>

## Consequences
**Positives:** ...
**Negatives / risks:** ...
**Closure work required:** <the named work this ADR creates>

## References
<the doc sections + the external sources>
```

---

*End of the ADR system. The first two ADRs (`0001`, `0003`) follow. The PROPOSED ADRs (`0002`, `0004`, `0005`, `0006`) are drafted at their binding milestones.*
