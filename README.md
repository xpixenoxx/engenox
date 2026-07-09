# Engenox

> The AI Visibility Operating System — a closed loop that perceives a brand's AI presence → diagnoses the conflict → proposes an intervention → opens a PR (NOT auto-merge in the MVP) → measures the outcome → writes the corpus row → renders the candor.

**Read [`CLAUDE.md`](./CLAUDE.md) first.** It pins the verified 2026 stack to the frozen blueprint and is the repo's operating manual; on any conflict between it and a frozen doc, **the frozen doc is authoritative** and `CLAUDE.md` is edited to match.

- [`docs/`](./docs) — the FROZEN blueprint (`00`–`27`) + the execution layer (`28`) + the verified 2026 stack audit (`29`).
- [`docs/_RECOVERY.md`](./docs/_RECOVERY.md) — the checkpoint tracker (the build's current state; Phase 0 → M0 → …).
- [`adr/`](./adr) — the post-STOP-CONDITION change log; a stack swap is an ADR (`adr/NNNN-<slug>.md`), never a frozen-doc edit.
- [`docs/enforcement/`](./docs/enforcement) — the operating manual: engineering constitution, review standards, Definition of Done, AI-usage rules, checkpoint workflow, stack-drift watchdog.

We are in **Phase 0 (the enforcement environment)** until `docs/_RECOVERY.md` shows E18 ✅ — at which point the first M0 ticket is closed and we are **in M0** (`CLAUDE.md` §0 + §9).

