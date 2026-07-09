# Repository Conventions

> **Status: FROZEN.** The branch / commit / PR / merge conventions. The history is a *provenance surface* — every commit is a signed graph node from which the work is reproducible (`00_FOUNDATION_FINAL.md` §2 invariant 8). So the conventions are stricter than "tidy history"; they are how the closed loop's reproducibility is enforced at the VCS layer. Authored against `28_EXECUTION_STRATEGY.md` §8 (signed commits / reproducibility) + `29_STACK_VERIFICATION.md` §6 (squash-merge) + `21_DEVELOPMENT_GUIDELINES.md` §3 (doc-pointers) + `22_CODING_STANDARDS.md` §5 (the ADR cite in code).

---

## The one principle

> **The history is a signed provenance graph, one commit per ticket, with a stable doc-pointer or ADR cite in every commit that touches a load-bearing surface.** A future auditor (or the Provenance Audit Hover, `26` §4) must be able to read the log and reconstruct what was decided, why, and on what evidence.

## Branch naming

- **One ticket → one short-lived branch.** `feat/contracts/dial-ledger`, `fix/kg/age-tx-join`, `chore/infra/cnpg-pitr`, `docs/adr/0007-cedar-policy`. The pattern is `<type>/<scope>/<slug>`; the slug is the ticket's slug from `docs/tickets/<milestone>/<slug>.md`.
- **Branch off the default branch** (currently `main`; will be `main` + release branches once M9 ships), not off another feature branch. A stacked change records its parent in the PR description, not by branching off an unmerged PR.
- **No long-lived feature branches.** A branch open past the milestone it belongs to is a defect; rebase or merge.
- **The default branch is never committed to directly** — work goes through PR. (The enforcement environment's own scaffolding — E01–E16 docs — were authored by the AI directly; that was the founder's explicit directive and ends at E16. Product code from E17 onward goes through PR.)

## Commit messages (Conventional Commits + the doc-pointer / ADR cite)

Every commit is a **Conventional Commit**:

```
<type>(<scope>): <imperative summary, ≤72 chars>

<body: the why — the doc-pointer or the ADR cite>

<footer:_coauthor / breaking / closes>
```

- **Type** ∈ {`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `build`, `ci`, `revert`}. A product change is `feat`/`fix`/`refactor`; an enforcement-doc change is `docs`; a contract change is `feat(contracts)!` if breaking.
- **Scope** is the surface (`contracts`, `kg`, `gateway`, `verifier`, `dial`, `cedar`, `infra`, `web`, `docs`). One scope per commit — a multi-scope change is squashed to one commit, but the body lists the scopes.
- **Summary** is imperative, present-tense ("add the dial ledger schema", not "added"), ≤72 chars.
- **Body carries the doc-pointer or the ADR cite.** A load-bearing commit has `Refs: 25 §4 (the three-axis dial ledger)` or `Refs: ADR-0006 (the cross-family Critic roster)` in the body. A non-load-bearing commit still cites its reason. (`CODING_STANDARDS.md` §5 makes the same convention inside code; the commit message makes it at the history layer.)
- **Footer** carries `BREAKING CHANGE:` (for a contract-breaking change, which is also Tier-1 review + a migration), `Closes: <milestone>/<ticket-slug>` (so a commit links to its ticket), and the co-author trailer.
- **No `Co-Authored-By:` unless the contributor actually co-authored.** The AI author's contributions carry `Co-Authored-By: Engenox-AI <noreply@engenox.local>` (the project's own AI author handle, not a generic model tag) — the AI author's role is recorded in the provenance, but the human reviewer's signature is the one that seals the commit-to-state (the LLM never commits; `ENGINEERING_CONSTITUTION.md` non-negotiables).

## Signing (the reproducibility surface)

- **Every commit-to-state commit is signed.** The default is a GPG / SSH / sigstore signature on the merge commit; the signature is the seal that makes the commit reproducible from the signed graph node (`00` §2 invariant 8). An unsigned merge is a blocker (the DoD, `E09`, names it).
- **The LLM never signs.** The seal is the human reviewer's; the AI's contribution is recorded by the co-author trailer, not by a signature. (`AI_USAGE_RULES.md` §E.)
- **The merge commit, not the squashed commit, is the sealed node** for a Tier-1 surface (the merge is the human's act); for Tier-2/Tier-3 the squash-merged commit carries the human signature. The distinction is recorded in the PR.

## Merge strategy (squash-merge by default)

- **Squash-merge: one commit per ticket on the target.** The squashed commit's message is the PR's Conventional Commit message (with the body's doc-pointer + the footer's `Closes:`). This makes the history one-commit-per-ticket — bi-temporal-able, replayable, and readable as a provenance surface. (`29` §6.)
- **Exception — a contract-breaking migration** may preserve its own multi-commit history (the migration's intermediate steps are part of the provenance), recorded as a `--no-ff` merge with the migration PR's commit log intact. This exception is cited in the PR description + the ADR that authorizes the migration.
- **No merge commits from rebase accidents.** The branch is rebased onto the target before squash-merge; the squash produces exactly one commit.

## Pull requests (the review vehicle)

- **One Tier-1 ticket per PR, or one coherent set of Tier-2/Tier-3 tickets.** No drive-by unrelated changes (`28` §8 -commitment discipline). A PR that mixes a Tier-1 contract change with a Tier-3 doc fix is split.
- **PR description carries the review record** (`REVIEW_STANDARDS.md`, E08): the ticket(s), the tier, the lenses run, the lens outcomes, the waivers with their ADR cites, the verdict. "Looks good" with no record is not mergeable.
- **The PR links to the ticket** (`Closes: M0/T01-...`) so the merge closes the ticket file's status.
- **CI is fully green on the merge target**, not just the PR tip (`E09` per-PR DoD). Trivy + secret-scan + the dependency-direction lint + `buf breaking` + the per-language test stacks all green.
- **No `--no-verify` / no hook bypass / no `--force` to the target branch.** A failed hook is investigated, not bypassed (`AI_USAGE_RULES.md` §E). A force-push to a shared branch is a blocker (it rewrites the provenance surface; the invariants forbid it).
- **Rebase before merge**, not merge-by-merge-commit-into-the-feature-branch. The tip is linear against the target.

## Tags + releases

- **Milestone-bound tags: `m0`, `m1`, … `m9`, `p2.0`, etc.** A tag is placed when a milestone's DoD (`E09`) closes. A tag is annotated (not lightweight) and signed (the same reproducibility surface).
- **No date-based versions on the MVP.** The product version follows `26_MVP_SCOPE.md`; the internal milestone tag is the provenance marker through M9. A semver scheme is adopted at the M9 release decision (recorded as an ADR), not before.
- **Contract releases** tag the `pkg/contracts/` state (`contracts/v0.1.0`) so a deployed service can pin a contract version; a breaking contract change bumps the minor/major per the contract-semver policy (recorded in the ADR that authorizes the breaking change).

## The `.gitignore` + skeleton rules

- **Skeleton directories carry a `.keep`** so the polyglot tree's empty modules are committed (`24` §2). The scaffold (E13) commits the `.keep` files; a real file replaces a `.keep` when the module gets its first real content.
- **Generated artifacts are gitignored** (the `buf generate` output, the `node_modules`, the `.venv`, the build dirs). The contract package's *source* (`pkg/contracts/proto/`) is committed; its *generated* language outputs are gitignored except where a downstream tool needs them committed (recorded in the contract package README).
- **Secrets are never committed.** Trufflehog / gitleaks (the secret-scan gate, `CLAUDE.md` §7) is the backstop; the convention is the first defense. A `.env` is gitignored; a Vault reference is the only credential surface in-repo.
- **The frozen docs are committed + immutable.** `docs/00_*`–`docs/27_*` + the foundation docs + the readiness report + the frozen enforcement docs are in-repo and never edited after their freeze commit; their immutability is the contract the ADR system rests on.

## The doc-pointer in the history

The same `// 11 §2c` that points inside code (`CODING_STANDARDS.md` §5) points inside a commit message:

```
feat(dial): add the three-axis ledger write path

The ledger writes valid_time + tx_time atomically per the bi-temporal
invariant (// 13 §2 + // 00 §2 invariant 8). Conformal coverage is
computed, not asserted (// 23 §4).

Refs: 25 §4 (the dial ledger), ADR-0006 §closure (the Critic budget)
Closes: M3/T04-three-axis-ledger
```

The pointer is stable; the audit-hover (`26` §4) cites it; the auditor reconstructs the decision.

## What this doc is not

- It is **not** a substitute for review (`E08`) or DoD (`E09`); the PR is the vehicle, the review is the gate, the DoD is the closure.
- It is **not** a license to bypass the conventions "for a quick fix"; a quick fix obeys the same conventions (one commit, signed, conventional, cited).
- It is **not** the contract-semver policy — that is recorded in the ADR that authorizes the first breaking contract change; this doc names where it lives.

---

*End of repository conventions. Next enforcement artifact: folder structure scaffold (E13, the repo tree).*
