# Checkpoint & Recovery Workflow

> **Status: FROZEN.** The operational form of the checkpoint discipline. `_RECOVERY.md` is the source of truth for "where are we"; this doc is the protocol for keeping it honest across interruptions, context compactions, and session boundaries. Authored against `28_EXECUTION_STRATEGY.md` §5 + §8 (checkpoint discipline) + `CLAUDE.md` §9 + `AI_USAGE_RULES.md` §G + the recovery directive the founder issued at the first interruption.

---

## The one invariant

> **After every completed artifact: write it to disk, mark it ✅ in `_RECOVERY.md`, continue. Work is never held only in memory. On interruption, resume from the first ⬜ — never restart, never regenerate completed work, complete partial work instead of replacing it, preserve every frozen document.**

Everything below is the mechanics of that invariant.

## The tracker

`docs/_RECOVERY.md` is the source of truth. It has three sections that grow over time:

1. **Foundational state** — the pre-execution foundation (frozen).
2. **Blueprint documents (01–27)** — all ✅ (frozen at the STOP CONDITION).
3. **Final report** — ✅ (frozen).
4. **Execution phase (E01–E18)** — the live tracker. Each row: `| # | Artifact | Status | Path |`. Status is `⬜` (pending), `✅` (done), or `🚧` (in-progress, see partial-artifact handling).

The status symbol is the protocol:
- `⬜` — not started. The first `⬜` in the table is the resume point.
- `✅` — done. The artifact is on disk at the row's Path; it passes its own DoD (E09) at the artifact level (the doc is written, self-consistent, aligns with the frozen blueprint, cites its authorities).
- `🚧` — in progress, the write was interrupted. The artifact may be partial. *This status is used only when a Write tool result did not return a success confirmation.* (See "Detecting a partial artifact" below.)

## The checkpoint cadence (after every completed artifact)

1. **Write the artifact** to its Path with the Write tool (one Write call per complete file; prefer one file per call so partial-state is detectable at file granularity).
2. **Confirm the Write succeeded** (the tool result says "File created successfully" / "has been updated successfully"). If it did not, the artifact is 🚧, not ✅ — handle per "Recovery from a failed/partial write."
3. **Update `_RECOVERY.md`**: the artifact's row status flips `⬜` → `✅`. Where the artifact delivered more than the row's original description (e.g. E05 delivered ADR-0001 *and* ADR-0003, not just ADR-0001), the row's description + path are edited to match what was actually delivered — the tracker is the record, not a guess.
4. **Verify no frozen document was edited.** A frozen doc (`docs/00_*` through `docs/27_*`, plus previously-frozen enforcement docs + the readiness report + the foundation docs) is never modified; a needed change is an ADR. After a checkpoint, `git status` (or the equivalent) shows the new artifact, the updated `_RECOVERY.md`, and **no** frozen-doc edits.
5. **Continue to the next artifact** (the next `⬜`). No "wrap-up" mid-stream; the next artifact starts immediately.

The checkpoint is **artifact-granular**, not session-granular. A session that completes three artifacts checkpoints three times; a session that completes none does not checkpoint (and the tracker stays accurate).

## The recovery protocol (on interruption)

An interruption is: a network error mid-tool-call, a context compaction, a session close + reopen, a manual stop, a crash. The protocol is the same for all of them.

1. **Do not restart. Do not regenerate completed work.** The first rule of recovery is to not destroy what survived. (`AI_USAGE_RULES.md` §G.)
2. **Read `_RECOVERY.md`** to find the first `⬜` (the resume point) — and any `🚧` (a partial artifact from a failed write).
3. **Inspect the first incomplete artifact's Path on disk** before authoring. (`README.md` was read at session start and showed the ADR system doc; the ADR files were listed before authoring, confirming `0001`/`0003` did not yet exist.) The aim is to *complete* a partial file, not replace it.
4. **If the artifact does not exist on disk**: author it (it was never written; recovery starts it fresh).
5. **If the artifact exists and is complete**: the Write must have succeeded silently — flip the row to ✅ (this is the "tool result didn't confirm but the file is there" case) and continue.
6. **If the artifact exists and is partial** (see detection below): *complete* it — read what's there, fill what's missing, preserve the rest. Do not rewrite from scratch. `Edit` the partial file rather than `Write`-overwriting it, so the surviving content is preserved.
7. **Preserve every frozen document.** No recovery step edits `docs/00_*`–`docs/27_*`, the foundation docs, the readiness report, or a previously-frozen enforcement doc. A recovery that "needs" to change a frozen doc is a sign an ADR is required, not an edit.
8. **Check the context summary** (if a compaction happened): the summary preserves what was completed; cross-check it against the on-disk state, and trust the on-disk state when they differ (a summary can mis-record; the file on disk is the record).
9. **Resume from the first ⬜** — author it, checkpoint, continue. Do not "decide what to do next" abstractly; the tracker decides.

## Detecting a partial artifact

A file on disk is partial if any of these hold:
- **It ends mid-section.** The expected structure (per the row's artifact type — ADR template, enforcement doc structure, ticket shape) is incomplete. (e.g. an ADR with Context + Decision but no Consequences is partial.)
- **It contains the template un-filled.** (e.g. an enforcement doc that still has `<the forces — ...>` placeholders.)
- **The Write tool result did not confirm success** — treat the file as partial until a Read confirms it's complete.
- **Its byte count is implausibly small** for the artifact type (a 200-byte enforcement doc is not done).

When in doubt, Read the file and verify against the expected structure before flipping to ✅.

## Recovery from a failed/partial write

- **The Write call errored or was interrupted mid-stream:** Read the Path. If the file is partial, `Edit` it to completion (add the missing sections to the surviving partial). If the file does not exist, `Write` it fresh (nothing survived).
- **The tracker flip errored after a successful Write:** the artifact is done on disk; the tracker is stale. Read `_RECOVERY.md`, find the row, `Edit` it to ✅. (This happened at E04 in the prior session — the Write succeeded, the tracker Edit succeeded, but a network error followed; the recovery confirmed both and continued.)
- **Two writes seem to have happened** (the file exists with content + a later Write also succeeded): the later Write is the authoritative version; the tracker reflects ✅. Verify the later Write didn't *corrupt* a frozen doc — it must have written to a *new* path or an *enforcement* path, never a frozen-doc path.

## What is never checkpointed / never recovered

- **A frozen document is never edited, in checkpoint or in recovery.** `docs/00_*`–`docs/27_*`, the foundation docs, the readiness report, and previously-frozen enforcement docs are read-only to this workflow. A needed change is an ADR.
- **A completed artifact is never regenerated.**` An interruption does not license re-authoring E04 because "it might be incomplete" — Read it, verify it's complete, and if it is, leave it.
- **No "summary-as-completion."**` An interruption near the end of an artifact does not make the summary a substitute. The artifact is completed on disk or it is 🚧; a summary of "what would have been written" is not a checkpoint.
- **No silent reordering.** The E01–E18 sequence binds (each row informs the next — E02 informs E06, E04 informs E08, etc.); recovery proceeds in order unless a row's own description says otherwise (E17's M0 tickets reference E16's watchdog, E13's scaffold, E07's standards).

## The session-start checklist

A fresh session (new session, post-compaction, post-interruption) runs this in order:

1. `Read docs/_RECOVERY.md` — find the first `⬜` and any `🚧`.
2. `Read adr/README.md` + the frozen `CLAUDE.md` (`CLAUDE.md` §1 reintroduces the "do not re-litigate" frame; §2 reintroduces the stack). Skim `ENGINEERING_CONSTITUTION.md` for the one process rule.
3. Inspect the first incomplete artifact's Path per "Detecting a partial artifact."
4. Author / complete it. Checkpoint. Continue to the next ⬜.

This is the exact sequence the recovery directive ("Inspect the repository and RECOVERY.md. Determine the last successfully completed artifact. Continue from the first incomplete artifact.") formalizes.

## What this doc is not

- It is **not** the work tracker — that is `_RECOVERY.md`. This is the *protocol* for the tracker.
- It is **not** the Definition of Done — `E09` is the per-artifact/per-PR/per-milestone gate; this is the *continuity* layer that ensures the DoD is met across interruptions.
- It is **not** a substitute for review — a recovered artifact still passes `REVIEW_STANDARDS.md` (E08) at its tier.
- It is **not** a license to skip the plan — `AI_USAGE_RULES.md` §A (plan-mode first) applies on recovery too; a partial ticket is re-planned if the partial reveals the plan was wrong.

---

*End of checkpoint workflow. Next enforcement artifact: repository conventions (E12, `docs/enforcement/REPO_CONVENTIONS.md`).*
