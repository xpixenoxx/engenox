# Definition of Done

> **Status: FROZEN.** The Definition of Done. "Done" is a closed set of gates, not a feeling. There is no "substantially done," no "90% done," no "done pending a follow-up." A work item is done or it is not done; if it is not done, the record says what remains. Authored against `CLAUDE.md` §10 (the condensed DoD) + `28_EXECUTION_STRATEGY.md` §8 (the execution invariants) + `ENGINEERING_CONSTITUTION.md` (the candor-floor process rule) + the CI gate chain in `CLAUDE.md` §7.

---

## The one principle

> **A gate is either closed or it is not.** Reporting a closed gate that is not closed is the worst failure mode this project has, because it defeats the candor floor on which the product's commercial differentiator rests. A not-done item is reported as not-done, with the closure list, and that report itself counts as candor. (`ENGINEERING_CONSTITUTION.md` process rule.)

"Done" therefore has three scales — **ticket**, **PR**, **milestone** — and each is a closed set.

## The per-ticket Definition of Done

A ticket (one item in `docs/tickets/<milestone>/`) is **done** when *all* of these are closed:

- [ ] **Acceptance criteria met.** Every acceptance-criterion test in the ticket is green — not *some* tests green, *those* tests green.
- [ ] **Coding standard met.** `CODING_STANDARDS.md` (E07) §8 lint/format/typecheck stack green in the ticket's language(s). No unsuppressed-skip; every suppression cites an ADR or doc-pointer.
- [ ] **Contract spine intact** (if the ticket touches a contract surface). `buf breaking` green + `buf generate` clean across all four languages. No hand-written cross-language type. (`CODING_STANDARDS.md` §1)
- [ ] **Review passed at the right tier.** The review record (`REVIEW_STANDARDS.md`, E08) exists, names the tier + the lenses run + the lens outcomes, and the verdict is `merged`. Author did not review their own work; the founder-solo record names the hat.
- [ ] **The relevant CI gates green** (from the gate chain, `CLAUDE.md` §7):
  - [ ] `RLS-introspection` green if state-touching (a client never supplies `tenant_id`).
  - [ ] `idempotency` green if a Temporal activity (re-call is a no-op).
  - [ ] `dial-property` green if dial-related (denies an unearned escalation beyond `Co-pilot`).
  - [ ] `conformal-coverage` green where applicable (computed, not asserted).
  - [ ] `warm-canary divergence` green where a behavioral change ships under canary.
  - [ ] `diff-review-blocker` green where the closed-loop contract changes.
  - [ ] `Cedar <2 ms p99` benchmark green where a Cedar policy is added/changed.
  - [ ] `golden-probe` green where a seam behavior is asserted.
  - [ ] Trivy + secret-scan green (always).
- [ ] **Reproducible from a signed graph node.** The change's commit-to-state is sealed: the commit is signed (or the equivalent integrity tag is), and the work is reconstructible from the provenance node. (`00_FOUNDATION_FINAL.md` §2 — the reproducing-the-commit invariant.)
- [ ] **Docs updated.** The doc-pointer (`// 11 §2c`) stays valid; if the change implements an ADR's closure work, the `TODO(ADR-NN, owner)` is updated or removed; the ticket's own file in `docs/tickets/<milestone>/<ticket>.md` records the outcome. No frozen doc is edited (a frozen-doc edit means an ADR instead).
- [ ] **Checkpoint written.** `_RECOVERY.md` reflects the new state; the artifact is on disk; an interruption would resume from the next item, not this one. (`CHECKPOINT_WORKFLOW.md`, E11)
- [ ] **Stack-drift watchdog green.** Zero forbidden-pattern hits on the diff (the watchdog, E16), or waivers with ADR cites are recorded.
- [ ] **Commit-ready.** The commit message follows `REPO_CONVENTIONS.md` (E12) — Conventional Commits, the doc-pointer or ADR cite in the body, the candor-floor honest. No `--no-verify`; the hooks ran.

A ticket is done ⇔ every box is closed. A single open box means the ticket stays `in_progress`, and its `docs/tickets/<milestone>/<ticket>.md` records the open box + the closure work.

## The per-PR Definition of Done

A PR is the *vehicle* a ticket rides in. A PR is **done** when:

- [ ] It carries one Tier-1 ticket, or one coherent set of Tier-2/Tier-3 tickets (no drive-by unrelated changes; `28` §8 commitment discipline).
- [ ] The per-ticket DoD holds for every ticket it carries.
- [ ] CI is fully green on the merge target, not just the PR tip.
- [ ] The PR description names: the ticket(s), the tier, the lenses run, the verdict, and any waivers-with-ADR-cite. (The review record, `REVIEW_STANDARDS.md`.)
- [ ] The change is squash-merged (one commit per ticket, `29` §6) unless an explicit no-squash exception is recorded for a contract-breaking migration.
- [ ] No `--no-verify` / no hook skip / no force-without-lease-without-a-reason; if a hook was bypassed for an enforcement-environment script, the PR cites why.

A PR is done ⇔ merged with all of the above. A PR held in "waiting on review" is **not done** and is reported as such.

## The per-milestone Definition of Done

A milestone (M0–M9) is **done** when *all* of these are closed — this is the milestone-gate discipline (`28` §4, `_ENGINEERING_READINESS_REPORT.md` §3):

- [ ] **Every ticket in the milestone is done** (per per-ticket DoD). The milestone closes when its ticket set closes, not on a calendar.
- [ ] **The stack-verification checklist (E06) for this milestone is run** — every morning-of-the-milestone box closed or recorded as a new ADR. No verify-at-milestone ⚠️ silently skipped.
- [ ] **The milestone's readiness-gate dimensions are closed** (the named 9.5/9.0/8.5 dimensions the milestone is responsible for). A dimension not closed is reported as not-closed with its closure list; it is not rounded to "done."
- [ ] **The candor-floor review for the milestone is written**: the weekly written review covering the milestone names what shipped, what slipped, what's blocked, and the honest gate statuses. No inflated status. (`ENGINEERING_CONSTITUTION.md` process rule.)
- [ ] **No frozen doc was edited** to make the milestone "fit." A doc that needed to change was changed by an ADR; the `git log -- docs/0*`-through-`docs/27_*` shows no edits.
- [ ] **The `_RECOVERY.md` milestone row is ✅** and the milestone's ticket directory `docs/tickets/<milestone>/` is complete on disk.
- [ ] **A blameless postmortem for any incident during the milestone** is written and followed by an ADR or a doc-update (the failure is encoded so it cannot recur). If the milestone had no incidents, the record says so.

A milestone is done ⇔ every clause closes. A "milestone substantially complete" with two open tickets is **not done**; the record names the two tickets and the milestone stays open.

## What "not done" looks like (the candor floor, applied)

A not-done item reported honestly:
> `ticket: T03-contract-shape — in_progress. Acceptance criteria green; review blocked on Lens D (contract spine) pending the `buf breaking` triage; closure work: re-run `buf breaking` against the M0 baseline + resolve the `Reserved` field rename. Estimated: half a day.`

A not-done item reported dishonestly (this is the failure mode):
> `ticket: T03 — substantially done (90%), minor follow-ups.` ← *This violates the constitution and is a defect in its own right.*

## What this doc is not

- It is **not** a checklist to fill in at the end — it is the definition the work is built against from the start. A ticket's acceptance criteria are written to close these gates; the gates are not retro-fitted.
- It is **not** a substitute for review (`E08`) or the coding standard (`E07`) — it *calls* them by name; the gates live in those docs.
- It is **not** the release criteria for the MVP — that is `26_MVP_SCOPE.md` (frozen) + the M9 milestone DoD.
- It is **not** negotiable per ticket — a ticket that "doesn't need" a clause (e.g. no contract surface) marks the clause `N/A: <reason>`, not omitted; the N/A is reviewable.

---

*End of Definition of Done. Next enforcement artifact: AI usage rules (E10, `docs/enforcement/AI_USAGE_RULES.md`).*
