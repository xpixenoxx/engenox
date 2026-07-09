# AI Usage Rules

> **Status: FROZEN.** The discipline for using an AI author (Claude Code, today; future AI coding agents, later) on Engenox. The AI author is a force multiplier for a *correctness-moat* product; it is **not** an autonomous author for load-bearing work (`28` §8). The rules below are the standing directives of the founder + the execution-strategy discipline + the constitution, made operative. Authored against `28_EXECUTION_STRATEGY.md` §5 (plan-mode first, contract-codegen-first, tiered adversarial review) + §8 (no autonomous coding agents for load-bearing work) + `CLAUDE.md` §8 + the claude-api skill (`claude-opus-4-8` default, `thinking: {type: "adaptive"}`).

---

## The standing directives (the founder's, still in effect)

1. **Never automatically agree with the founder's ideas.** If an idea is weak, say why it is weak. Agreement as a default is a defect; the value of the AI author is its adversarial posture, including toward the founder.
2. **Do not rely on outdated tutorials / frameworks / architectures because they are popular.** Evaluate before recommending. If a better architecture exists in 2026, use it — and record the swap as an ADR. The "old tech" concern (`28` §3) is the failure mode these rules exist to prevent.
3. **Every important architectural decision is reviewed internally before the final answer.** Challenge your own assumptions. First-principles, then present.
4. **Never optimize for writing code quickly.** Optimize for building a product that could realistically become a category-defining company. Speed is a consequence of not reworking; it is not a target variable.
5. **No more than six specialist agents spawned simultaneously.** The cap is a real cost guard; the founder's standing constraint.
6. **After every completed artifact: save it, mark it frozen/done in `_RECOVERY.md`, continue. Never keep work only in memory.** If interrupted, continue from the latest checkpoint. (`CHECKPOINT_WORKFLOW.md`, E11; `28_EXECUTION_STRATEGY.md` §8.)

## The operating rules

### A. Plan before code (plan-mode first)
- A non-trivial implementation enters **plan mode** before any code: the plan is reviewed against the frozen blueprint + the relevant ADRs + the coding standard before a single file is written. (`28` §5).
- A trivial fix (a typo, a renamed local, a one-line config bump) does not enter plan mode; the boundary is "could this touch an invariant or a contract surface?" If yes, plan mode; if not, still cite the doc-pointer.
- A plan that proposes to edit a frozen doc is rejected at plan time; the plan becomes an ADR draft or a code change with a doc-pointer. (A frozen doc is never edited.)

### B. Tiered adversarial review (the AI is a reviewer, not an approver)
- AI-authored code is reviewed **adversarially** at the tier its surface warrants (`REVIEW_STANDARDS.md`, E08). The AI's review of its own earlier code runs a *different lens* in a *different session* — the author-never-reviews-own-work rule (`E08` §one-rule).
- A future AI coding agent running on a load-bearing surface (Tier 1) is **never** its own reviewer. Its output goes to the adversarial panel — in the founder-solo phase, that is the founder-in-reviewer-hat plus the AI-in-a-different-lens.
- "Looks good to me" — from the AI or from a human — is not a review. The review record names the lenses run + the outcomes (`E08`).

### C. No autonomous coding agents on load-bearing work
- An autonomous coding agent (one set a long-running task and left to author + merge) is **forbidden** on a Tier-1 surface (`28` §8): the contract spine, the action seam, the gateway, the verifier, Cedar, crypto, KG, RLS, migrations, the diff-review-blocker logic, the dial.
- An autonomous agent *may* run on Tier-3 surfaces (docs, fixtures, test-data, pure-presentation Storybook) with a human spot-check before merge.
- The closed loop (perceive → diagnose → propose → open-PR → measure → corpus → render-candor) is the moat; the *propose → open-PR* step that an autonomous agent most wants to do is exactly the step a human (or an adversarial AI panel) must adjudicate.

### D. The model roster + the API shape (per the claude-api skill + `CLAUDE.md` §2 + ADR-0006)
- The default authoring model is **Claude Opus 4.8** (`claude-opus-4-8`), the claude-api skill's default. The AI does not downgrade for cost — that is the founder's decision, not the AI's. (`CLAUDE.md` §2.)
- The API shape: `thinking: {type: "adaptive"}` on Opus 4.8 / Sonnet 5 / Fable 5; `thinking` *omitted* on Fable 5 (always-on); the old `{type: "enabled", budget_tokens: N}` is **not** sent (rejected with a 400 on the current models). (`29` §4.) The cross-family Critic calls a *different* model family — GPT-5-class + Gemini 3-class — the cross-family property is the invariant (ADR-0006).
- A new model enters the rota only as an ADR; the AI does not silently switch models mid-task. The roster is a frozen-architecture decision.

### E. The never-do list (the AI's hard no's)
- **No LLM holds a credential; no LLM commits; no client supplies `tenant_id`.** (`ENGINEERING_CONSTITUTION.md` non-negotiables; `CLAUDE.md` §8.) A credential never enters a prompt context; an LLM never signs a commit; a tenant boundary comes from the server, never the client.
- **No silent edit to a frozen doc.** A frozen doc is never edited; a change is an ADR. The AI that wants to "fix" `08` instead writes the ADR that supercedes the relevant §.
- **No silent stack swap.** A version bump, a framework swap, a vendor swap — all are ADRs first; the swap is ratified, then the code changes. The stack-drift watchdog (E16) catches the unratified swap at PR time.
- **No `--no-verify`; no hook bypass; no `--force` on shared branches without a recorded reason.** (`28` §8.) A hook that failed is a hook that caught something; investigate, don't bypass.
- **No silent lint skip.** A `# noqa` / `// nolint` / `// type: ignore` carries the rule code + the reason + the doc-pointer; a bare skip is a blocker (`CODING_STANDARDS.md` §8/§9).
- **No `dangerouslyDisableSandbox`-equivalent on product code.** The forced-tool bypass is for the enforcement environment's own scripts (the watchdog runs, the globally-installed checks), never for the service tree.

### F. Token + rework discipline (the AI-credits invariant)
- **Plan-mode first** (rule A) is the primary credit guard; a rework caused by a missed plan is the most expensive token waste.
- **Contract-codegen-first** (`28` §5) — generate the cross-language types once, not hand-write them in four languages; a contract change regenerates all four.
- **Golden-path exemplar per pattern** (`28` §5) — the first instance of a pattern (a Temporal activity, a Cedar policy binding, an LLM seam) is authored to exemplar quality and frozen as the reference for the rest; later instances copy the exemplar, not their own improvisation.
- **Just-in-time ticketing** (`28` §5) — only the current milestone's tickets exist; later-milestone tickets are not pre-written (they would be stale by their milestone). The AI does not "get ahead" by authoring M3 tickets during M0.
- No more than six specialist agents spawned concurrently (standing directive 5) — every parallel agent costs credits; the cap is a cost guard, not a style choice.

### G. The checkpoint discipline (continuity)
- After every completed artifact, the AI writes it to disk, marks it ✅ in `_RECOVERY.md`, and continues — work is never held in memory. (`E11`.)
- On an interruption (network error, context limit, manual stop), the AI reads `_RECOVERY.md`, finds the first ⬜, and resumes there. The AI does **not** restart, regenerate completed work, or summarize-instead-of-finish.
- A partially written artifact is *completed*, not replaced (`E11`). The AI reads what's there, fills what's missing, preserves the rest.

### H. The candor floor, applied to AI outputs
- An AI status report ("the change is done", "tests pass", "gate closed") is **not trusted** until a human verifies the gate. The AI's status is a claim; the review record + the CI gate + the checkpoint are the evidence.
- An AI that cannot close a gate reports it as not-closed with the closure list; it does not round up. (`E09`.) An AI that reports "substantially done" is producing the exact defect the constitution forbids.
- The weekly written review (the constitution's one process rule) names the AI's outputs that are still open, not the AI's optimistic estimates.

## What this doc is not

- It is **not** a ban on AI authoring — the AI authors most of the surface; it authors under discipline, not under autonomy on load-bearing work.
- It is **not** the review standard — that is `REVIEW_STANDARDS.md` (E08).
- It is **not** the coding standard — that is `CODING_STANDARDS.md` (E07).
- It is **not** the stack-drift watchdog — that is `STACK_DRIFT_WATCHDOG.md` (E16); this doc points to the forbidden-pattern list the watchdog enforces.
- It is **not** a static model roster — the models + API shapes are pinned in `CLAUDE.md` §2 + ADR-0006; a change is an ADR.

---

*End of AI usage rules. Next enforcement artifact: checkpoint & recovery workflow (E11, `docs/enforcement/CHECKPOINT_WORKFLOW.md`).*
