# T08 — Skills + subagents install (.claude/skills + .claude/agents)

> **Tier:** 1 (the process moat — a tampered reviewer is a moat-breach; the subagents are the load-bearing part) | **Status:** pending | **Milestone:** M0
> **Cites:** `SKILLS_SUBAGENTS_PLAN.md` (E14 — **the spec for this ticket**) · `28` §5 (skills for repetitive flows) + §6 Challenge B (adversarial subagents) · `REVIEW_STANDARDS.md` (E08 — the lenses the Specialists run) · `AI_USAGE_RULES.md` (E10 — no autonomous Tier-1 authoring) · `CLAUDE.md` §8

## Objective

Install the `.claude/skills/` flow skills + the `.claude/agents/` subagents from `SKILLS_SUBAGENTS_PLAN.md` (E14), so the AI author + the founder invoke the repetitive flows (`/milestone-gate`, `/draft-adr`, `/weekly-review`, `/scaffold-ticket`, `/checkpoint`, `/recover`, `/contract-shape`, `/golden-probe`, `/plan-ticket`, `/postmortem`) on demand, and so the Tier-1 review panel dispatches the adversarial Specialists + the watchdog subagent. This is the *install* of E14 — the plans become daily discipline.

## Dependencies

- **Tickets:** none strictly (the `.claude/` config is independent of the workspace). Logically depends on the enforcement docs E01–E16 (which exist); the contract-spine-reviewer subagent references T02's contracts + T03's lint (but the subagent is a *definition*, not a run, so it can land before T02/T03 are exercised).
- **External:** Claude Code's skill + subagent format (the `.claude/skills/<name>/SKILL.md` + `.claude/agents/<name>.md` conventions).

## Files

- `.claude/skills/<name>/SKILL.md` for each flow skill (E14's table):
  - `milestone-gate/SKILL.md` — invokes `STACK_VERIFICATION_CHECKLIST.md` (E06) for a milestone.
  - `draft-adr/SKILL.md` — scaffolds an ADR from `adr/README.md`'s template.
  - `weekly-review/SKILL.md` — writes the candor-floor weekly review.
  - `postmortem/SKILL.md` — scaffolds a blameless postmortem + the doc-update/ADR follow-up.
  - `scaffold-ticket/SKILL.md` — generates a ticket file with the Objective/Dependencies/Files/Acceptance/Tests/DoD/complexity fields.
  - `checkpoint/SKILL.md` — writes the artifact + flips the `_RECOVERY.md` row + verifies no frozen doc edited.
  - `recover/SKILL.md` — the session-start sequence (`CHECKPOINT_WORKFLOW.md`, E11).
  - `contract-shape/SKILL.md` — adds a `.proto` under the right `pkg/contracts/proto/engenox/<domain>/v1/` + runs `buf generate` (the flow `CLAUDE.md` §4 describes).
  - `golden-probe/SKILL.md` — adds a golden-probe fixture + the held-out trajectory split.
  - `plan-ticket/SKILL.md` — enters plan mode for a ticket; reads the ticket + the cited frozen docs + the cited ADRs; produces the implementation plan; awaits sign-off.
- `.claude/agents/<name>.md` for each subagent (E14's tables):
  - The adversarial Specialists (one per `REVIEW_STANDARDS.md` lens A–H): `correctness-reviewer.md`, `security-reviewer.md`, `arch-alignment-reviewer.md`, `contract-spine-reviewer.md`, `candor-floor-reviewer.md`, `ai-intelligence-reviewer.md`, `dial-ci-honesty-reviewer.md`, `provenance-reviewer.md`. Each carries the lens's adversarial questions (E08) + a bounded-task prompt template + the verdict schema it returns.
  - The watchdog: `stack-drift-watchdog.md` — the agent form of T07's scanner; spawned by the Tier-1 panel for a structured verdict.
  - The operational subagents: `contract-codegen-runner.md`, `milestone-gate-runner.md`, `checkpoint-verifier.md`.
- `.claude/agents/README.md` or `.claude/skills/README.md` — the index of installed skills + subagents, the spawn discipline (≤6 concurrent), the bounded-task rule.

## Acceptance criteria

- [ ] Each flow skill is invocable as `/<skill-name>` in Claude Code; the SKILL.md follows the Claude Code skill format (the frontmatter + the body).
- [ ] Each subagent is spawnable (the Agent tool can dispatch it); the agent `.md` follows the Claude Code subagent format.
- [ ] The adversarial Specialists carry the `REVIEW_STANDARDS.md` lens questions (E08) verbatim — the lens A checklist is in `correctness-reviewer.md`, etc. The subagent is the lens made dispatchable.
- [ ] Each subagent returns a *verdict* (a structured object: `{lens, outcome: pass/fail, defects: [{file, line, summary}]}`), not a free-form essay. The verdict schema is a documented field in the agent `.md`.
- [ ] The bounded-task rule is in every adversarial subagent: "you are running one lens on one diff, return the verdict — do not approve, do not edit, do not re-author."
- [ ] The `stack-drift-watchdog.md` subagent references T07's scanner (the agent is the agent form; the CI job is the CI form — they share the rule set).
- [ ] The `/recover` skill implements the session-start checklist from `CHECKPOINT_WORKFLOW.md` (E11) verbatim.
- [ ] The `/contract-shape` skill implements the add-a-type flow from `CLAUDE.md` §4 (the `pkg/contracts/proto/engenox/<domain>/v1/` + `buf generate` + the four-language verify).
- [ ] The `/checkpoint` skill implements the after-every-artifact protocol from `CHECKPOINT_WORKFLOW.md` (E11) — write + flip `_RECOVERY.md` + verify no frozen doc edited.
- [ ] The `/plan-ticket` skill enters plan mode + reads the ticket's cited doc-pointers + ADRs *before* producing the plan (`AI_USAGE_RULES.md` §A).
- [ ] No frozen doc edited; the change confined to `.claude/`.

## Tests

- **Invocability test:** `/<skill-name>` resolves in Claude Code (the SKILL.md is found + parses).
- **Spawnability test:** the Agent tool dispatches each subagent; the subagent returns the verdict schema (a StructuredOutput tool call validating the schema).
- **Lens-fidelity test:** the adversarial Specialist's prompt contains the lens A (or B, C, …) checklist from `REVIEW_STANDARDS.md` — verbatim, not paraphrased.
- **Flow-fidelity test:** the `/checkpoint` skill, run on a fixture artifact, produces the artifact on disk + flips the `_RECOVERY.md` row + verifies no frozen doc edited (the fixture is a Tier-3 doc).
- **Spawn-cap test:** the orchestrator's dispatch honors ≤6 concurrent subagents (the founder's standing cap, `AI_USAGE_RULES.md` directive 5) — a fixture Tier-1 dispatch with 8 lens-subagents runs in two waves (the cap is enforced by the orchestrator, not the subagent).

## Definition of Done

- [ ] Every acceptance criterion closed; the invocability + spawnability + lens-fidelity + flow-fidelity tests green.
- [ ] Coding standard met: the SKILL.md + agent `.md` files are well-formed Markdown + the frontmatter is valid (the Claude Code skill/agent schema); the verdict schemas are documented.
- [ ] Review passed at Tier 1: the panel includes Correctness (the skills implement the E06/E11/E08/E14 flows), Architecture-alignment (the subagents map to the E08 lenses 1:1), Security (a tampered subagent is a moat-breach — the subagent files are reviewed; no subagent can edit a frozen doc; no subagent authors Tier-1 code autonomously per `AI_USAGE_RULES.md` §C), Candor-floor (the subagents return verdicts, not approvals), Stack-drift (the watchdog subagent's rule set matches T07's scanner).
- [ ] The skills are invocable across the remaining M0 tickets (T09 onward) — the `/plan-ticket` skill is the one the founder uses to plan T09+.
- [ ] Stack-drift watchdog green: the `.claude/` files don't contain a forbidden pattern (no skill authors a frozen-doc edit; no subagent authors Tier-1 code autonomously).
- [ ] Docs updated: the `.claude/skills/README.md` + `.claude/agents/README.md` index + the spawn discipline; `SKILLS_SUBAGENTS_PLAN.md` (E14) cross-references the install.
- [ ] Checkpoint written; commit-ready (`chore(t08): install the .claude/ skills + subagents (E14 — the flow skills + the adversarial Specialists + the watchdog)` with `Refs: SKILLS_SUBAGENTS_PLAN.md, REVIEW_STANDARDS.md, AI_USAGE_RULES.md`).

## Estimated complexity

**M — ~1 day.** The risk is the volume (10 skills + 12 subagents = 22 files) + the verdict-schema consistency across the 8 adversarial Specialists. The mitigation: the lens questions are already in `REVIEW_STANDARDS.md` (E08) — copy, don't re-derive; the verdict schema is one shape reused across the 8.

## Notes for the implementer

- **The subagents are the install of E14; the spec is already done.** Read `SKILLS_SUBAGENTS_PLAN.md` (E14) + `REVIEW_STANDARDS.md` (E08) *before* authoring the agent `.md` files — the lens questions are verbatim from E08; the bounded-task rule + the spawn-cap are from E14. Do not re-derive the lens questions.
- **No subagent authors Tier-1 code autonomously.** The adversarial Specialists *review*; the operational subagents *run mechanical flows* (codegen, gate-runner, checkpoint-verifier). An "implementation-author" subagent on `pkg/contracts/` or the action seam is forbidden (`AI_USAGE_RULES.md` §C) — do not create one.
- **The verdict is a structured object.** Each adversarial subagent's `.md` documents its verdict schema (the StructuredOutput tool call shape). The review record (`REVIEW_STANDARDS.md`) consumes these verdicts.
- **The `/recover` skill is the session-start sequence.** It must implement `CHECKPOINT_WORKFLOW.md` (E11)'s session-start checklist verbatim: read `_RECOVERY.md`, find the first ⬜ + any 🚧, detect partial artifacts, resume. This is the skill that survives interruptions.
- **The `/plan-ticket` skill enforces plan-mode-first.** It enters plan mode + reads the ticket's `Cites:` doc-pointers/ADRs *before* producing the plan. A ticket planned without reading the cited frozen docs is a defect (`AI_USAGE_RULES.md` §A).
- **The `.claude/` files are themselves a Tier-1 surface.** A subagent whose prompt is tampered (e.g., the `security-reviewer` whose lens-B checklist is weakened) is a moat-breach. Review the `.claude/` files at Tier 1; the watchdog scans them too (the `.claude/` files are not exempt).
