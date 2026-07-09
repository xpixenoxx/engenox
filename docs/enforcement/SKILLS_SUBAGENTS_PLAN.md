# Skills & Subagents Plan

> **Status: FROZEN (the plan).** This is the *specification* of the Claude Code skills and subagents the Engenox workflow will use — not their installed configurations (those land at M0, in `.claude/skills/` + `.claude/agents/`, as the first enforcement-layer code). Skills are the *repetitive flows* codified so the AI does not improvise them each time; subagents are the *adversarial Specialists* the review tiers (`REVIEW_STANDARDS.md`, E08) dispatch. Authored against `28_EXECUTION_STRATEGY.md` §5 (skills for repetitive flows) + §6 Challenge B (adversarial subagents per review lens) + `AI_USAGE_RULES.md` (no autonomous coding agents on load-bearing work) + `CLAUDE.md` §8 (the tier map).

---

## The distinction

- **A skill** is an invokable flow (`/<skill-name>`) the founder or AI runs on demand — a checklist made reproducible. It captures a *process* (run the milestone gate, draft an ADR, run the weekly review, scaffold a ticket) so it is done identically each time.
- **A subagent** is a *delegated role* the orchestrator spawns for a bounded task — the adversarial Specialist running a lens, the stack-drift watchdog scanning a diff, the contract-codegen runner. It carries no cross-call state; it returns a verdict.
- **An autonomous coding agent is neither** — it is forbidden on Tier-1 surfaces (`AI_USAGE_RULES.md` §C). The Engenox subagents are reviewer/verifier/watcher agents, not authoring agents.

## The skills (the repetitive flows)

Each skill is a `.claude/skills/<name>/SKILL.md` (M0 install). The plan names them now; the install is M0.

### Flow skills (founder- or AI-invoked)

| Skill | Purpose | Invoked when | Source of the flow |
|---|---|---|---|
| `/milestone-gate` | run the stack-verification checklist (E06) for a milestone + record the closed/open boxes | the morning of a milestone gate | `STACK_VERIFICATION_CHECKLIST.md` (E06) |
| `/draft-adr` | scaffold an ADR from the template (`adr/README.md`) with the Context/Decision/Alternatives/Consequences scaffolding | when a stack swap, a reversal, or a new constraint surfaces | `adr/README.md` template + `29` §7 |
| `/weekly-review` | write the candor-floor weekly review (what shipped / slipped / blocked / the honest gate statuses) | weekly, the constitution's one process rule | `ENGINEERING_CONSTITUTION.md` process rule |
| `/postmortem` | scaffold a blameless postmortem + a doc-update/ADR follow-up | after an incident | `ENGINEERING_CONSTITUTION.md` non-negotiables |
| `/scaffold-ticket` | generate a ticket file in `docs/tickets/<milestone>/<slug>.md` with the Objective/Dependencies/Files/Acceptance/Tests/DoD/complexity fields | at JIT ticketing time (only the current milestone) | `25_IMPLEMENTATION_PLAN.md` + the E17 ticket shape |
| `/checkpoint` | write the artifact to disk + flip the `_RECOVERY.md` row + verify no frozen doc edited | after every completed artifact | `CHECKPOINT_WORKFLOW.md` (E11) |
| `/recover` | the session-start sequence: read `_RECOVERY.md`, find first ⬜, detect partial artifacts, resume | on session start / post-interruption | `CHECKPOINT_WORKFLOW.md` session-start checklist |
| `/contract-shape` | add a `.proto` under the right `pkg/contracts/proto/engenox/<domain>/v1/` namespace + run `buf generate` + verify all four languages | when a new entity/event/service/policy type is needed | `CLAUDE.md` §4 |
| `/golden-probe` | add a golden-probe fixture (the deterministic dev-mode probes) + its held-out trajectory split | when a seam behavior is asserted | `23_TESTING_STRATEGY.md` + `datasets/` |
| `/plan-ticket` | enter plan mode for a ticket: read the ticket + the cited frozen docs + the cited ADRs, produce the implementation plan, await sign-off | before coding any non-trivial ticket | `AI_USAGE_RULES.md` §A + `28` §5 |

### The principle for skills

- A skill codifies a flow that is run *more than once* and *matters that it's identical* — the milestone gate, the ADR drafting, the weekly review. A flow run once is not a skill; a flow that's improvisational is not a skill.
- A skill **does not edit a frozen doc** — `/draft-adr` produces an ADR; `/milestone-gate` records an ADR for a drift; none rewrite `docs/`.
- A skill **does not author load-bearing code autonomously** — `/contract-shape` adds a `.proto` and runs the codegen, but the `.proto` is a contract change (Tier-1 review, `REVIEW_STANDARDS.md`); the skill does the mechanical part, the review does the judgement.

## The subagents (the adversarial Specialists + the watchdog)

Subagents are `.claude/agents/<name>.md` (M0 install). Each is a role with a lens (`REVIEW_STANDARDS.md` lenses A–H), spawned by the orchestrator on a bounded task; each returns a verdict, not a diff.

### The adversarial-review Specialists (one per lens)

These map 1:1 to the `REVIEW_STANDARDS.md` lenses and are the Tier-1 panel. Spawned concurrently (≤6, per the founder's standing cap) on a Tier-1 diff; each returns its lens outcome.

| Subagent | Lens (E08) | The bounded task it returns a verdict on |
|---|---|---|
| `correctness-reviewer` | A | does the diff do what its ticket claims, on the empty/maximal/concurrent/nil/adversarial inputs and every typed error path? |
| `security-reviewer` | B | RLS preserved, no LLM-credential, no injection, Cedar path taken, the candor-floor security items |
| `arch-alignment-reviewer` | C | does the diff cite + preserve the frozen invariant; does it re-litigate a frozen choice without an ADR; no `utils` catch-all |
| `contract-spine-reviewer` | D | dependency direction, gateway leaf-only, `buf breaking` green, no hand-written cross-language type |
| `candor-floor-reviewer` | E | no omitted CI / contrarian block, no lift-number-without-CI, no inflated gate status |
| `ai-intelligence-reviewer` | F | constrained decoding wired, re-grounding gate present, Critic cross-family, the API shape correct (`thinking: {type: "adaptive"}` etc.) |
| `dial-ci-honesty-reviewer` | G | the three-axis ledger is atomic + replayable, the dial denies unearned escalation, conformal coverage computed, warm-canary divergence present |
| `provenance-reviewer` | H | corpus WORM + signed integrity tags, CIO integrity-tagged, `AssertionView` is the only bi-temporal path, commit reproducible from a signed node |

### The watchdog subagent (PR-time, always-on)

| Subagent | The bounded task | Forbidden-pattern source |
|---|---|---|
| `stack-drift-watchdog` | scan the cumulative diff for forbidden patterns (an AlloyDB re-introduction, an unratified stack swap, a stale `thinking` shape, a hand-written cross-language type, a bare lint skip) on every PR | `STACK_DRIFT_WATCHDOG.md` (E16) |

The watchdog is **not** a reviewer of judgement; it is a pattern match. It returns a list of forbidden-pattern hits (with file:line) or a clean verdict. A non-clean verdict blocks the PR until either the pattern is fixed or the waiver cites an ADR.

### The operational subagents (non-adversarial, mechanical)

| Subagent | The bounded task |
|---|---|
| `contract-codegen-runner` | run `buf generate` across all four languages + verify the output compiles in each + report the per-language result |
| `milestone-gate-runner` | run the milestone's stack-verification-checklist section + tabulate the ✅/⚠️/open boxes (the verdict is the founder's; the runner gathers) |
| `checkpoint-verifier` | verify the `_RECOVERY.md` row matches the on-disk state + no frozen doc was edited + the artifact's own DoD-fragment is satisfied |

### What there is deliberately **not** a subagent for

- **No "implementation-author" subagent for Tier-1 surfaces.** An agent that authors + merges action/gateway/verifier/cedar/crypto/kg/RLS/migration/contract code is forbidden (`AI_USAGE_RULES.md` §C). The author is the founder (or the founder + the AI author hat); the adversarial subagents review.
- **No "LLM seam executor" subagent in the product runtime.** The six bounded LLM seams run through the gateway in the deployed services, not as agents in the engineering workflow. The subagents here are engineering-tooling, not product-runtime.
- **No autonomous agent that runs across milestones** (it would defeat JIT ticketing, `28` §5). A subagent is spawned for one bounded task, returns a verdict, and is done.

## The spawn discipline (the cap + the parallelism)

- **≤6 subagents spawned concurrently** (the founder's standing cap, `AI_USAGE_RULES.md` directive 5). The Tier-1 panel is 8 lenses; it runs in two waves of 4 (or 3+3+2) — the orchestrator does not exceed 6 at once. The waves do not block each other; the second wave starts as the first's slots free.
- **A subagent is spawned with a bounded prompt** — "run Lens D on diff X, return the verdict + the specific defects with file:line." It is not given an open-ended "review this" — that produces an approval, not a refutation. (`REVIEW_STANDARDS.md` adversarial posture.)
- **A subagent does not review its own earlier output** (`AI_USAGE_RULES.md` §B). The watchdog does not review the watchdog; the contract-spine-reviewer does not review a contract the same session authored.
- **A subagent returns a verdict the orchestrator records** — the per-PR review record (`REVIEW_STANDARDS.md`) names which subagents ran + their verdicts. A subagent's verdict is evidence for the review record, not a substitute for the founder's seal on the commit.

## The install (M0, not now)

- `.claude/skills/<name>/SKILL.md` for each flow skill (the flow's steps + the doc-pointers it follows + the ADR-template it uses).
- `.claude/agents/<name>.md` for each subagent (the role's lens + the bounded-task prompt template + the source docs it reads + the verdict schema it returns).
- The install is the first M0 enforcement-layer code (it lives in the repo, it's reviewed at Tier 1 because the watchdog + the review Specialists are themselves load-bearing to the process; a tampered reviewer is a moat-breach).

## What this doc is not

- It is **not** the installed skills/agents — those land at M0; this is the plan + the names + the lenses.
- It is **not** the review standard — `REVIEW_STANDARDS.md` (E08) defines the lenses + the tiers; this maps subagents to those lenses.
- It is **not** a license to spawn autonomously — the cap + the bounded-task rule + the no-Tier-1-authorship rule all hold.
- It is **not** static — a new lens (a new blast-radius surface) gets a new Specialist; the install is amended by PR, the plan by editing this doc (which is itself frozen, so the amendment is dated + cited).

---

*End of skills & subagents plan. Next enforcement artifact: MCP configuration plan (E15, `docs/enforcement/MCP_PLAN.md`).*
