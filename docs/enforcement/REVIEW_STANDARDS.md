# Review Standards (adversarial, tiered by blast radius)

> **Status: FROZEN.** The adversarial review standard. Engenox's moat is a correctness property, so the review is adversarial (the reviewer's job is to *refute*, not to approve) and tiered by blast radius (the more a surface can break the moat, the heavier the panel). Authored against `28_EXECUTION_STRATEGY.md` §5 (tiered adversarial review) + §6 Challenge B (review tiered by blast radius) + `CLAUDE.md` §8 (author never reviews own work) + `_ENGINEERING_READINESS_REPORT.md` §3 (the milestone-gated review dimensions).

---

## The one rule that makes the rest work

**The author never reviews their own work.** A reviewer who approved their own diff fails the candor floor. In the founder-solo phase (the founder playing the 15 roles, `21` §2), the separation is enforced by *hat*: the author hat writes the change; a later session, in the reviewer hat, reads the *diff cold* and adversarially tries to refute it. The review record names which hat ran it. This is not ceremony — it is the only reason the adversarial review catches anything: a reviewer who remembers writing the code cannot see its failure modes.

## The tiers (blasted by the surface, not by the author's seniority)

A diff is tiered by **what it touches**, not by who wrote it. A founder diff touching `pkg/contracts/` is Tier 1.

### Tier 1 — full adversarial panel (blast radius = the moat or the boundary)

A Tier-1 change can break the contract spine, the closed loop, the security boundary, or the AI-intelligence property. It gets the **full panel**: every relevant lens below run by distinct reviewers (or distinct founder-hats) + the stack-drift watchdog (E16). The review is **blocking**; merge requires every lens closed or explicitly waived with an ADR cite.

Tier-1 surfaces:
- `pkg/contracts/` — the cross-language type source (the spine). Any breaking contract change.
- The **action** seam — the open-PR commit boundary; the only place an LLM output becomes a commit-to-state.
- The **LLM gateway** — the six bounded seams, the constrained-decoding wiring, the re-grounding gate, the cross-family Critic.
- The **verifier** — re-grounding, integrity-tagging, the commit-to-state gate.
- **Cedar policies** + the <2 ms p99 invariant.
- **Crypto** — keys, HSM, Vault, the rotation/derivation paths.
- The **KG** (Apache AGE truth spine) + **RLS** + **migrations** (Atlas).
- The **diff-review-blocker** CI logic + the **dial** three-axis ledger + the conformal-coverage gate.

### Tier 2 — single adversarial reviewer + the watchdog (blast radius = a service's correctness)

A Tier-2 change can break one service or the UI but cannot break the moat as a whole. It gets **one strong adversarial reviewer** running the correctness + architecture-alignment + the one most-relevant lens, plus the stack-drift watchdog. The review is **blocking**.

Tier-2 surfaces:
- **Perception** service, **measurement** service, **decision** service.
- The **control-plane** (the orchestration above the closed loop).
- The **web** app (Next.js) where it is not a Tier-1 dial/CI surface.
- The **design-system** implementation (the Storybook stories + the `20` alignment).

### Tier 3 — lint + spot-check (blast radius = assistive)

A Tier-3 change cannot break the product; it can only degrade the assistive layer. It gets the **lint** (the full format/lint/typecheck stack, `CODING_STANDARDS.md` §8) plus a human **spot-check** (a skim for obvious wrongness, copyright, a broken link, a misnamed test fixture). Non-blocking for the gate; still logged.

Tier-3 surfaces:
- **Docs** (the frozen blueprint is never edited; new docs / enforcement docs / ADRs go here).
- **Storybook** stories that are pure presentation (no contract surface).
- **Fixtures** + **test-data**.
- **CI config** that is not diff-review-blocker logic (the wiring, not the policy).

## The lenses (the adversarial panel members)

A reviewer is not "a reviewer"; they are *running a lens*. A lens asks specific adversarial questions. A Tier-1 panel runs **every relevant lens concurrently**; the review record names who/which-hat ran which lens.

### Lens A — Correctness (always run, every tier)
- [ ] Does the diff do what its ticket/objective claims? Are the acceptance-criteria tests green, not just *some* tests green?
- [ ] What does it do on the empty input, the maximal input, the concurrent input, the nil input, the adversarial input?
- [ ] What does it do on every typed error path? Are the error paths *tested*, not just the happy path?
- [ ] Is there a path where it silently does the wrong thing (returns a default, swallows an error, logs-and-continues)?
- [ ] If it's idempotent-by-contract (a Temporal activity), is idempotency *demonstrated* by a re-call test?

### Lens B — Security (Tier 1 always; Tier 2 when state-touching)
- [ ] RLS: does the change preserve row-level security? Does a client **never** supply `tenant_id` (the introspection gate)?
- [ ] Keys: does an LLM **never** hold a credential? Does a credential never enter the prompt context? (`CLAUDE.md` §8)
- [ ] Injection: are all untrusted inputs (LLM outputs, user inputs, corpus) parsed through the constrained-decoding schema or a hardened parser — never a bare `eval`/`JSON.parse`/template interpolation?
- [ ] Authn/authz: is the Cedar policy path taken for the decision, and is it the policy that was reviewed (not a newer unreviewed one)?
- [ ] The candor-floor security items: a client never supplies `tenant_id`; an LLM never holds a credential; an LLM never commits. (`ENGINEERING_CONSTITUTION.md` non-negotiables)

### Lens C — Architecture alignment (Tier 1 always; Tier 2 always)
- [ ] Does the diff cite the frozen doc + section it implements (`// 11 §2c`) — and does the code actually match that section?
- [ ] Does it *preserve* the cited invariants, or quietly suspend one? A suspended invariant needs an ADR.
- [ ] Does it re-litigate a frozen choice? (A frozen doc is never edited; a reversed choice is an ADR — does the diff add the ADR cite or silently re-implement?)
- [ ] Does it add a catch-all `utils`/`helpers`/`misc`? (Strike it; rename by concern.)

### Lens D — Contract spine (Tier 1 for `pkg/contracts/` or cross-service)
- [ ] Dependency direction: does `services/*` import another service's internals? (Blocker.)
- [ ] Is the gateway leaf-only? Does anything other than a seam import the gateway?
- [ ] Is `buf breaking` green? Is the breaking change (if any) accompanied by a migration + a Tier-1 sign-off?
- [ ] Is a cross-language type hand-written anywhere? (Blocker — `pkg/contracts/` is the only source.)

### Lens E — Candor floor (Tier 1 always; Tier 2 for UI/dial)
- [ ] Does the change omit the CI, omit the contrarian block, or render a lift number without its CI? (`26` §4)
- [ ] Does it report a gate as closed before it's closed, or a status as "substantially done"?
- [ ] Does it round a readiness score up?
- [ ] Does the change's own review record name what's blocked + what slipped?

### Lens F — AI intelligence (Tier 1 for any LLM seam)
- [ ] Is constrained decoding wired on the seam (Outlines / XGrammar / GBNF per `11` §2)? Is there a bare `JSON.parse` on an LLM output? (Blocker.)
- [ ] Is the re-grounding gate present before the output becomes a commit-to-state?
- [ ] Is the Critic call cross-family (a *different* model family from the seam it critiques)? (`ADR-0006`)
- [ ] Is the API shape correct — `thinking: {type: "adaptive"}` on Opus 4.8 / Sonnet 5 / Fable 5; `thinking` omitted on Fable 5; no `budget_tokens`? (`29` §4)
- [ ] Does the seam return a typed `Result.err` on LLM failure, or does it swallow into a default?

### Lens G — Dial / CI honesty (Tier 1 for dial, measurement, corpus-align)
- [ ] Is the dial's three-axis ledger read/write correct, atomic, and replayable from the signed graph node?
- [ ] Does the dial *deny* an unearned escalation beyond `Co-pilot`? (P2.1-gated — `_ENGINEERING_READINESS_REPORT.md` §3.)
- [ ] Is the conformal coverage honest (the gate computes coverage, doesn't assert it)?
- [ ] Is the warm-canary divergence gate present where a behavioral change ships under canary?

### Lens H — Provenance / corpus integrity (Tier 1 for corpus, provenance, KG)
- [ ] Is the corpus write WORM (Cloudflare R2 WORM)? Is the integrity tag signed?
- [ ] Is the CIO (Causal Intervention-Outcome) record integrity-tagged and signed?
- [ ] Is the `AssertionView` the only bi-temporal read path, and does it record both `valid_time` and `tx_time`? (`06`/`13`)
- [ ] Is every commit-to-state reproducible from a signed graph node? (`00` §2)

## The review record

A review is not a thumbs-up; it is a **commit-attached record**:
- The tier assigned + the lenses run + the lens outcomes.
- The specific defects found (with file:line) and the fix applied.
- The watchdog result (E16) — forbidden-pattern hits = 0, or the waivers with ADR cites.
- For a Tier-1 change, the per-lens reviewer names (or the founder-hats) + the explicit waivers.
- The verdict: **merged / blocked / reverted**. A "looks good" with no lens outcomes is not a verdict.

The record lives with the change (PR description / the per-ticket review log in `docs/tickets/M0/<ticket>/review.md`). For the founder-solo phase, the record names the hat that ran each lens, per the one rule.

## Adversarial review + ADR-bound changes

When a change implements an ADR's closure work (e.g. `ADR-0003` → the CNPG cell template), the review confirms:
- The change matches the ADR's Decision, not a drift from it.
- The ADR's closure-work list is being closed (or a `TODO(ADR-NN, owner)` records the remaining item).
- The ADR is the authority; if the change diverges from the ADR, the divergence is a new ADR or a documented rejection, not a silent re-implementation.

## What this doc is not

- It is **not** a general "code review guide" — it is adversarial; the reviewer's success state is *finding* a defect, not approving.
- It is **not** the coding standard — that is `CODING_STANDARDS.md` (E07). The standard is the *gate*; this is the *judgement at the gate*.
- It is **not** the Definition of Done — a change can pass review and still be not-done (no docs, no checkpoint, no release notes).
- It is **not** a static tier list — surfaces migrate tiers as the architecture evolves; a tier change is recorded here with the rationale.

---

*End of review standards. Next enforcement artifact: Definition of Done (E09, `docs/enforcement/DEFINITION_OF_DONE.md`).*
