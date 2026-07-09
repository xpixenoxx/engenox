# 28 — Execution Strategy

> **Status: FROZEN.** The execution layer above the 27 architecture documents: *how* the blueprint is built, not *what* it is. Authored by the CTO / Staff Engineer / Principal Architect / Engineering Manager roles against `00_FOUNDATION_FINAL.md` (the readiness scores + sync sequencing), `21_DEVELOPMENT_GUIDELINES.md` (the docs-until-STOP-CONDITION + the founder-as-15-role-team mode + the transition to hires), `22_CODING_STANDARDS.md`, `23_TESTING_STRATEGY.md`, `24_PROJECT_STRUCTURE.md` (the tree + the dependency-direction lint), `25_IMPLEMENTATION_PLAN.md` (M0–M9 + the readiness-closure sequence), and `26_MVP_SCOPE.md`. **The blueprint did the design work; this document is the discipline that protects that work from default-drift during implementation.** This doc does NOT modify any of the 27; it aligns with them and sequences their execution.

---

## 0. The verdict, up front

**Do not build a process layer first; build a guardrail layer first.** The six candidate approaches the founder named — an Engineering Operating System (EOS), an engineering constitution, bulk implementation tickets, an autonomous AI agent workflow, sprint planning, an ADR/checkpoint system — were each evaluated. Five are *process* artifacts, and process is what you build when you have a *team that needs coordination*. This project has a solo founder acting as 15 roles + an AI author. The leverage for that combination is not in process; it is in the **enforcement environment**: a contract-codegen spine, a root `CLAUDE.md` that pins the 2026 stack to the frozen docs, a small set of skills/subagents for the repetitive flows, lint gates as the hard backstop, adversarial review subagents tiered by blast radius, and one reviewed golden-path exemplar per pattern before any fan-out.

The one approach on the founder's list that is genuinely load-bearing (ADR + checkpoints) was already proven during the blueprint phase — it survived rate-limit interruptions across docs 01–27. It is a discipline to **continue**, not a phase to **launch**.

The strategy in one sentence: **enforcement environment + stack re-verification first → contract-spine-first M0 with golden-path exemplars → milestone-gated execution (M1→M9) against the readiness closures, with adversarial AI review on every PR that touches a gated module, just-in-time ticketing, the first hire conditionally timed at M2, and the checkpoint discipline continuing throughout.**

---

## 1. First principles — what constrains this project's execution

Seven facts about *this* project pin the strategy:

1. **Solo founder acting as 15 roles.** No team to coordinate → Scrum, sprints, and standups are theater. The replacement is a *written* cadence (docs-as-standup, `21` §2) — a weekly one-paragraph review: what closed, what's blocked, gate status. Gate-driven, not time-boxed.
2. **The AI is the primary author and reviewer.** The leverage multiplier is in the *environment* the AI authors inside, not in a multi-agent "workflow." The project does not need more agents; it needs better guardrails.
3. **Correctness is the moat, not speed-to-PR.** A category-defining causal product is the *worst* candidate for autonomous coding agents. Adversarial review > autonomous authorship. This mirrors the architecture's own thesis (`05` §0: an LLM may PROPOSE; it may not COMMIT); the *engineering process* mirrors the *product architecture*.
4. **Contract-first polyglot monorepo.** The single biggest rework source in AI-coded polyglot repos is the AI inventing parallel types in each language. The `pkg/contracts/` Buf codegen (`24` §2) is not a nice-to-have; it is the anti-rework spine. It must exist before any service code.
5. **The architecture is already frozen, with invariants named.** Those invariants are *exactly* what property tests + lint should assert. The rules do not need to be discovered; they need to be compiled into CI.
6. **Milestone-gated with hard dependency gates** (`25` §4). Not time-boxed. The gate (e.g., "Security closure before `execute-with-approval`") is the unit of progress, not the sprint.
7. **Rate-limit fragility is real.** The checkpoint-discipline (write immediately, recover from last ✅) is not optional; it is load-bearing infrastructure for the coding phase — as it was for the blueprint phase.

**Consequence:** the highest-ROI move before any product code is to build the enforcement environment + resolve the ⚠️-verify flags + lay the contract spine + write one golden-path exemplar per pattern. Then milestone-gated execution against gates, with adversarial AI review on every PR touching a gated module.

---

## 2. The six options, challenged (the never-auto-agree part)

| Option | Verdict | Why |
|---|---|---|
| **Build an EOS first** | **No — kernel only.** | A full EOS is process for a team that does not exist. Building rituals for 15 roles one person is playing alone is theater. Do the *kernel*: the written weekly review, the ADR-for-every-decision discipline, the blameless postmortem template — ~1 day; it makes the solo phase legible to future hires. The full EOS grows *with* the team. |
| **Create an engineering constitution** | **Mostly already exists.** | The 8 cross-cutting invariants (`00` §2) + each doc's §9 invariants *are* the constitution. Do not rewrite — write a 1-page `ENGINEERING_CONSTITUTION.md` that *points to* `00` §2 + the doc invariants. Re-deriving risks drift. |
| **Generate implementation tickets** | **Do not generate all of them.** | Bulk-ticketing M0–M9 is 2020 waterfall; the later milestones will rot before they're reached. Ticket M0–M3 now (low uncertainty, fully specified). Ticket M4+ *just-in-time* as the prior milestone closes. A ticket older than one milestone is a stale ticket. |
| **Build an AI agent workflow** | **Wrong framing for this product.** | An autonomous coding agent is philosophically incoherent for a correctness-moat product whose thesis is "LLM proposes, doesn't commit." The right move: *configure* the agentic environment (Claude Code + skills + subagents + MCP + CLAUDE.md) and use **adversarial subagents for review**, not autonomous authorship. Author + adversary, with a *different* agent per lens. |
| **ADR + checkpoint systems** | **Already proven — continue.** | `adr/` starts day 1 of code (`24`); the checkpoint pattern carries from the blueprint into the code. Continuing discipline, not a new phase. |
| **Sprint planning + milestones** | **Milestones yes; sprints no.** | 2-week sprints for a solo founder are theater. M0–M9 already exist (`25`); keep them. Replace sprints with a weekly written review. |
| **Another approach** | **Yes — this one.** | Enforcement-First + Contract-Spine-First + Gate-Driven Milestones + Just-in-Time Ticketing + Adversarial AI Review. |

The sharpest challenge: **"build an AI agent workflow" is the most tempting and the most wrong option.** For a correctness-as-moat product, autonomous coding agents are an anti-pattern. The correct use of AI is author + adversarial-review, where the reviewer is a *different* subagent with a *different* lens, explicitly instructed to refute. That is the engineering-process mirror of the architecture's cross-family Critic (`11` §2).

---

## 3. The "Claude Code uses old tech" concern — addressed concretely

Three truths:

1. **Claude Code (the CLI) is stack-agnostic.** It does not force Next.js Pages or Express. The "old tech" perception has two real causes: (a) the model's training prior is slightly behind the cutting edge; (b) the model defaults to well-trodden patterns (higher success rate in the training distribution). Both are fixable with *enforcement*, not knowledge.
2. **The blueprint already chose the 2026 stack** (`00` §1): Next.js 15 App Router + RSC, Hono, Go probe fleet, Python/FastAPI, Temporal, LiteLLM + constrained decoding, Cedar, Buf, OpenTofa + Argo CD, Biome over ESLint+Prettier, Ruff, Valkey, Redpanda→Warpstream, Cloudflare R2 WORM, cell abstraction. The architecture is not the old-tech risk.
3. **The real risk is drift during implementation** — the AI reaching for `express()` because it's common in its prior, or hand-writing a TS type that should be Buf-generated. That drift is what burns credits on rework.

**The enforcement that makes drift improbable:**

- **A root `CLAUDE.md`** pins every 2026 choice with a doc-pointer (the `// 11 §2c` convention of `22` §5). Anytime the AI reaches for a type or framework, `CLAUDE.md` redirects it to the blueprint's choice. The single highest-leverage file in the repo.
- **The contract codegen as the first thing built.** If `pkg/contracts/generated/` exists and the AI imports from `@engenox/contracts`, it *cannot* invent a parallel type — enforced by the dependency-direction lint (`24` §4). The codegen is the anti-rework spine.
- **A stack-drift-watchdog subagent** reviews every PR for old-pattern imports (express, jest, eslint, prettier, hand-written cross-language types, Pages Router, REST-where-it-should-be-gRPC) and blocks them. Adversarial review applied to the *stack choice*, not just the logic.
- **Skills for the repetitive flows**: `add-a-contract-type`, `add-a-temporal-activity`, `add-an-rls-policy`, `add-a-cedar-policy`, `add-a-closed-loop-invariant-test`. Each encodes the *2026 way* so the AI does not reach for the 2020 way.
- **MCP servers wired for live docs** — Context7 for up-to-date library docs, the Buf MCP, a Postgres MCP for M1 RLS iteration, a Playwright MCP for M6. The 2026 move is the AI reading *live* docs via MCP, not its training prior.
- **Lint as the hard backstop** — Biome + depguard + import-linter + the forbidden-import CI block (`24` §4). The lint makes the architecture *physical*, not advisory.
- **A one-time ⚠️-verify pass before M0** (`27` §6 list, 15 items): Next.js 16 vs 15, Bun, AlloyDB AGE support, Memorystore Valkey, FalkorDB HA, Turbopuffer GA, Warpstream post-acquisition, Temporal Cloud GA, Quickwit, sglang stability, Modal privacy isolation, the 2026 open model for self-hosting, the panel vendor (Prolific-class), Biome plugin maturity, Atlas vs sqitch. Resolve all in one focused bounded audit *now* — the single best pre-coding investment, because the foundation is poured on confirmed-not-flagged choices. This is `29_STACK_VERIFICATION.md`.

---

## 4. The execution roadmap — today → production

Each phase: **why → what → gate closed → next.** No code; this is the execution layer above the code.

### Phase 0 — Stack Re-Verification + Enforcement Environment (≈1 week, NO product code)
- **Why:** Resolve every ⚠️-verify flag in one bounded pass *before* the foundation is poured, and stand up the guardrails so every later phase authors inside them. This phase pays for itself in avoided rework across M0–M9.
- **What's in it:** (a) the ⚠️-verify audit → `docs/29_STACK_VERIFICATION.md`; (b) root `CLAUDE.md` pinning the verified 2026 stack with doc-pointers; (c) `docs/enforcement/ENGINEERING_CONSTITUTION.md` (1-page pointer to `00` §2 + the doc invariants); (d) the skill set for the repetitive flows; (e) the stack-drift-watchdog + adversarial-review subagents configured; (f) MCP servers wired; (g) the `adr/` scaffold + ADR-0001 ("the 2026 stack, confirmed"); (h) the weekly-written-review template; (i) the operational enforcement docs (review standards, DoD, AI usage rules, checkpoint workflow, repo conventions, skills plan, MCP plan, stack drift watchdog spec, stack verification checklist); (j) the folder-structure scaffold (empty dirs + `.keep`).
- **Gate closed:** none (pre-foundation).
- **Next:** M0.

### Phase 1 — M0: Contracts + IaC Skeleton + CI Gate Chain + Golden-Path Exemplars
- **Why:** The contract spine is the fan-in root (`24` §2); everything imports it. If it's right, the AI can't invent parallel types later. The CI gate chain (`17` §4) makes the invariants physical from day one. The golden-path exemplars are the single most under-valued 2026 practice: **one reviewed reference of each pattern** (a TS/Hono service, a Go service, a Python service, a Temporal workflow, a contract proto, a Cedar policy, an RLS policy) so the AI *copies* rather than *invents*.
- **What's in it:** `pkg/contracts/` Buf + first entity/event/service/policy protos + codegen to TS/Go/Python; `infra/tofu/modules/cell` skeleton; `nx.json` + pnpm/uv/go.work workspaces; the CI gate-chain skeleton (Buf contract-compat, Biome, Ruff, golangci-lint, the forbidden-import lint, Trivy, secret-scan); **one golden-path exemplar per pattern**, each reviewed against the blueprint; the first real tickets (M0-level).
- **Gate closed:** Maintainability half (the contract spine is the only cross-language type source — `24` invariant 2).
- **Next:** M1.
- **AI-credits note:** the exemplars cost ~1 day of AI review each and save *weeks* of rework down the line. The best credits-to-leverage ratio in the roadmap.

### Phase 2 — M1: Truth Spine + RLS + KG + `libs/kg`
- **Why:** the P0 floor (`26` §5 Security closure). No MVP without per-tenant RLS on every scoping-required table. The `assertion_view` bi-temporal library is the *only* allowed KG read path (`13` §3) — getting it right now prevents every later service from hand-rolling queries.
- **What's in it:** Postgres schema + AGE + pgvector; RLS policies on every table; the canary-row test; the CI pg_policies introspection; `libs/kg` (the `assertion_view`); the Debezium→Redpanda→sink skeleton; R2 Object-Lock Compliance mode; Cloud KMS KEK + per-tenant DEK.
- **Gate closed:** **Security closure half-1 (RLS)** — `26` §5. One of the two gates that must close before the PR-touches-repo moment.
- **Next:** M2 (M1 ‖ M2 can parallel — `25` §4).
- **First-hire trigger:** *conditionally* the infra/SRE hire, timed at M2 start — see §6.

### Phase 3 — M2: LLM Gateway + Verifier + Constrained Decoding
- **Why:** the gateway is the only model-touching surface (`11`); the constrained-decoding + re-grounding verifier is the AI-Intelligence floor. Doing it before M3 means the Planner/Critic in M3 call through a real bounded seam, not a stub.
- **What's in it:** LiteLLM routing; the constrained decoding (Outlines/XGrammar/GBNF); `libs/verifier` (openCypher + SHACL/Datalog); the bounded re-attempt → null; the per-tenant token-budget gate + the PlanNotGuess 429; the weighted-fair scheduler; Langfuse tracing.
- **Gate closed:** **AI-Intelligence closure half-1 (constrained decoding + re-grounding)** — `26` §5.
- **Next:** M3.

### Phase 4 — M3: Temporal + Action + Dial (the first real gate moment)
- **Why:** this is the **PR-touches-repo moment** — the first time code touches a customer's repo. Everything that protects that moment (the Security closure's second half, the dial as a property-tested pure function) must close *here*. `propose`-level only; `Co-pilot` default; no auto-merge.
- **What's in it:** `AtlasCycle` + `InterventionSaga`; the typed plan DAG; the cross-family Critic; the action service (GitHub-App, rule-based diff-review, allow-list-glob, blast-radius bands, Cedar two-pass, signed manifest, rollback-hash); the dial ledger + the 3-axis escalation function (denies every escalation in MVP — `26` §4); the Temporal DR drill.
- **Gate closed:** **Security closure half-2 (the autonomous-action half)** + the `execute-with-approval` *unlock* stays locked (MVP default is `propose`). The dial is property-tested with automatic demotion.
- **Next:** M4 ‖ M5.
- **This is the hinge milestone.** If one thing is gotten right, it's this one.

### Phase 5 — M4 ‖ M5: Measurement + Perception (parallel)
- **Why:** once the action layer is gated, the measurement (the spine of action) and the perception (the spine of truth's input) can build in parallel — no dependency between them (`25` §4).
- **What's in it (M4):** synthetic-control + DML + causal-forest + a *simple* conformal calibrator; the EWMA/CUSUM foreign-change detector; the dual-canonical WORM corpus; the integrity tags; the three-sinks reconciliation; the regret-rollback saga; the foreign-change-quarantine.
- **What's in it (M5):** the Go probe fleet on Spot; the 4-connector subset (GSC, GA4, Git, CMS); the founder-network consented panel's first cohort.
- **Gate closed:** the QA closures (the estimator + the regret path + the foreign-change quarantine).
- **Next:** M6.

### Phase 6 — M6: Frontend + Design-System + the <10-minute Journey
- **Why:** the productization half. The Candor Report, the six-panel explanation render, the dial UI at `Co-pilot` default, the Provenance Audit Hover, the <90s activation. This is where the candor differentiator becomes visible.
- **What's in it:** the design-system package (tokens/primitives/patterns from `20`); `web/` Next.js App Router + RSC streaming provenance; the six panels; the Candor Report; the dial UI; the SSE broker; the WorkOS edge auth; the 1-click PR connector. WCAG 2.2 AA + axe CI-gated.
- **Gate closed:** a11y + visual-regression + <90s activation.
- **Next:** M7.

### Phase 7 — M7: Closed Loop E2E + Concierge + the AI-Intelligence Eval Half
- **Why:** the warm-canary symbolic fallback (5% daily) runs for real; the closed loop runs end-to-end in stage; the first concierge cohort (Gates C) runs on it. The conformal-coverage-on-held-out metric *clears the nominal rate* — the gate before the first customer-facing lift number.
- **What's in it:** the warm-canary 5%; the full loop in stage; the eval pipeline (DSPy/TextGrad-style) owned *separately* from production; the consented panel + Argilla as ground truth (not LLM-as-judge); the golden-probe regression suite over pipeline behavior; the first concierge pilot cohort.
- **Gate closed:** **AI-Intelligence closure eval half** — `26` §5. The first customer-facing lift numbers ship *with the candor microcopy* ("preliminary; calibration in flight; wider CI").
- **Next:** M8.

### Phase 8 — M8: Scalability + Production-Readiness + DR Rehearsal
- **Why:** the composite gate before public self-serve. The 1000-tenant load test; the cell-pair DR rehearsal; the chaos practice documented + monthly; the FinOps report + the cost-flip threshold; the SOC2 audit-log completeness; the blue/green cutover rehearsed; the deploy-rollback vs data-rollback (separate, `17` §8).
- **What's in it:** the load test; the second-region hot-standby + the quarterly cutover rehearsal; the chaos runbooks + the calendar; the R2 restore test; the SOC2-adjacent audit-log + break-glass two-person test; the FinOps report per cohort.
- **Gate closed:** **Scalability + Production-Readiness** — the two readiness scores below 9.5, now closed.
- **Next:** M9.

### Phase 9 — M9: MVP Live (Gates D-final)
- **Why:** a stranger signs up, lands on a dashboard, opens their first PR within 10 minutes — no human at Engenox involved. The wedge shipped. Calibration matures behind the candor microcopy.
- **What's in it:** the Stripe billing (Starter $129); public self-serve; the <10-minute journey in production.
- **Gate closed:** **Gates D-final** — `26` §5.
- **Next:** P2.x (each gated on its readiness closure per `27`).

### Phase 10 — P2.x: the post-MVP unlocks (gated)
- P2.1 Growth + dial escalation (gated on AI-Intelligence *production* half + cost-flip-from-production + the ledger on real data).
- P2.2 Agency + white-label (gated on the candor floor + the theme-swap + agency prospects).
- P2.3 Enterprise + dedicated cell + SSO (gated on cell-pair DR steady-state + SOC 2 Type II).
- P2.4 federated training + AI-Intelligence closure-final (gated on corpus-N-per-segment + consent pooling + the federated substrate). Then Horizon 2/3 per `27`.

---

## 5. The AI-credits / anti-rework discipline

Six rules that minimize wasted credits and rework:

1. **Plan-mode before any non-trivial implementation.** No service, no workflow, no schema gets written without a reviewed plan. The plan is cheap; the wrong code is expensive.
2. **Contract-codegen-first.** The AI imports from `@engenox/contracts`; it never hand-writes a cross-language type. The #1 rework source eliminated by construction.
3. **One golden-path exemplar per pattern before fan-out.** The AI copies the exemplar; it doesn't invent. Invention is what burns credits.
4. **Adversarial review subagents on every PR touching a gated module**, each with a different lens (security, contract-compat, RLS, candor-floor, stack-drift). The author subagent never reviews its own work — the same separation as the cross-family Critic (`11`). Catching bad code at PR is cheap; at milestone is expensive; after a customer incident is catastrophic.
5. **Just-in-time ticketing.** M0–M3 ticketed now (low uncertainty); M4+ ticketed as the prior milestone closes. A ticket older than one milestone is a stale ticket.
6. **The checkpoint discipline continues.** Every ADR, every exemplar, every service skeleton is written to disk immediately; the `_RECOVERY.md` pattern carries over ("after every completed artifact: write it, mark it ✅, continue"). Proven under 429s during the blueprint phase.

---

## 6. The assumption challenges — one final pass before freeze

The founder asked for every assumption to be challenged one final time. Six challenges, each answered honestly; most *refine* the strategy rather than overturn it.

### Challenge A — Is "enforcement-first" actually right, or is it procrastination?
- **Counter:** A solo founder + AI author building a polyglot contract-first monorepo WITHOUT a root `CLAUDE.md` + contract spine + lint first produces ~2–3× rework. The enforcement environment is ≈1 week; the blueprint was months. The ratio favors enforcement-first.
- **Verdict: holds.** No change.

### Challenge B — Is "adversarial review" actually better than "autonomous agent workflow"?
- **Counter:** For a correctness-moat product, yes — *but* the cost is real: a full adversarial panel on every PR is expensive in AI credits. Is it justified for *every* PR?
- **Refinement: TIER THE REVIEW INTENSITY BY BLAST RADIUS.** Not every PR needs the full panel.
  - **Tier-1 (full adversarial panel):** any PR touching `pkg/contracts/`, `services/action/`, `services/gateway/`, `libs/verifier/`, `libs/cedar/`, `libs/crypto/`, `libs/kg/`, or any RLS/migration/Cedar/diff-review code. These are the spine + the spine-of-the-spine. The panel is: security lens, contract-compat lens, stack-drift lens, and the domain lens (e.g., candor-floor for `web/`, RLS for `libs/kg/`).
  - **Tier-2 (single adversarial reviewer + lint):** any PR touching `services/perception/`, `services/measurement/`, `services/decision/`, `services/control-plane/`, `web/`, `design-system/`. One reviewer with the relevant domain lens, plus the always-on stack-drift watchdog.
  - **Tier-3 (lint + spot-check):** docs, storybook, fixtures, test-data, CI config. The stack-drift watchdog still runs; no adversarial panel.
  - **This is the single refinement that most changes operations.** It bakes the cost discipline into the review standards (`docs/enforcement/REVIEW_STANDARDS.md`).

### Challenge C — Is "first hire during M2" realistic given funding?
- **Counter:** This presupposes funding runway. A solo pre-funding founder cannot hire during M2. Is the recommendation contingent?
- **Refinement: MAKE THE FIRST-HIRE TIMING FUNDING-CONDITIONAL, WITH A FALLBACK.** The original recommendation ("infra/SRE hire at M2 start") holds *if* the founder has funding runway. The fallback: the founder wears the infra hat through M3, accepting slower velocity, and the first hire slides to M4/M5 (the AI runtime hire, or the frontend/design-system hire). The architecture does not break if the hire slides — M3 just takes longer. **This is an Engineering-Manager call the architecture cannot make; it is flagged as a founder decision in §7.** The strategy names it; it does not presume it.

### Challenge D — Should `29_STACK_VERIFICATION` come before the strategy freeze?
- **Counter:** The strategy references the ⚠️ items. If the audit overturns a choice (e.g., AlloyDB does not support AGE), does the strategy need revision?
- **Verdict: no — freeze 28 first, then verify.** The strategy is high-level enough that a single stack swap doesn't change it (the cell abstraction + the contract spine + the adversarial review are stack-agnostic). The audit's findings feed `CLAUDE.md` and become ADRs. If the audit overturns something *structural* (unlikely), an ADR revises the relevant frozen doc — the strategy doc itself does not change.
- **Ordering: E01 (28 strategy) → E02 (29 audit) → E03 (CLAUDE.md, which pins the *verified* stack).**

### Challenge E — Is milestone-gating too slow for a startup?
- **Counter:** The gates are concentrated at *risky* moments (PR-touches-repo, customer-facing-lift, public-self-serve). The non-gated path between milestones is fast. The gates prevent catastrophic rework. A startup that ships a bad auto-merge to a customer repo is dead; the gate is insurance.
- **Verdict: holds — but emphasize concentration.** The gates are *three moments*, not a tax on every PR. Most of the roadmap is ungated fast-path between those three moments. No change to the strategy; an emphasis in how it's communicated.

### Challenge F — Is just-in-time ticketing disciplined enough?
- **Counter:** JIT ticketing can become "no ticketing" if undisciplined.
- **Refinement: TICKET M0–M3 FULLY + TICKET AT MILESTONE BOUNDARY + REQUIRE A TICKET FOR ANY PR TOUCHING A TIER-1 MODULE.** JIT applies to M4+; it is not a license to skip tickets. A ticket is required for any Tier-1 PR. This makes JIT explicit, not lazy.

**Net effect of the six challenges:** the strategy is *refined* (Tier-by-blast-radius review in Challenge B; funding-conditional first hire in Challenge C; explicit JIT discipline in Challenge F), not overturned. Three of the six challenges confirmed the existing decision; three produced refinements. That is the honest outcome of a good challenge pass — most assumptions survive, the ones that don't get sharper.

---

## 7. The risks (the CTO / Engineering Manager view)

Three risks the six candidate options did not address, in severity order:

1. **Founder burnout playing 15 roles through M0–M3.** The *highest* risk to the project, not the architecture. The execution strategy explicitly calls the first hire *conditionally during M2*, not after M3. The infra/SRE hire inherits the M1 RLS + M2 gateway work for M3's action layer; the founder's bandwidth frees for the closed-loop domain + product. If the founder defers hiring to "after M3," M4–M5 ship late. **This is a funding-conditional Engineering-Manager call (Challenge C, above).** The strategy names it; the founder decides it.
2. **The contract-codegen is load-bearing.** If the AI invents types instead of using Buf during M0, every later service inherits the drift and the rework compounds. Phase 1's single most important discipline: the contract spine is real and the dependency-direction lint is green *before* any service code is written. The stack-drift watchdog catches this.
3. **The "old tech" drift is real but manageable.** The bigger adjacent risk: the AI *inventing* tech not even in the blueprint (a new state machine, a hand-rolled queue, custom auth middleware). The stack-drift watchdog catches both. Phase 0 budgets the enforcement environment — the cheapest insurance in the roadmap.

---

## 8. The non-negotiable execution invariants

1. **Enforcement environment before product code.** Phase 0 (E01–E16) completes before any service code. The single first M0 ticket (E18) is the only product code authorized before the environment is reviewed.
2. **Contract-codegen is the only cross-language type source.** No hand-written cross-language types. The dependency-direction lint is green before any service code is written (`24` §4).
3. **Adversarial review is tiered by blast radius.** Tier-1 modules get the full panel; Tier-2 get a single adversarial reviewer + the watchdog; Tier-3 get lint + spot-check (Challenge B). The author never reviews its own work.
4. **Milestone gates are the unit of progress, not sprints.** The readiness closures (`25` §4 + `26` §5) gate the risky moments; the path between is ungated fast-path.
5. **Just-in-time ticketing, with a ticket required for every Tier-1 PR.** M0–M3 ticketed fully; M4+ at milestone boundaries; no Tier-1 PR without a ticket (Challenge F).
6. **The checkpoint discipline continues.** Every artifact written to disk immediately; `_RECOVERY.md` updated after each; the recovery mechanism proven under 429s.
7. **A stack swap is an ADR, not a silent edit.** A frozen doc is never modified; a verified-better-2026-choice becomes `adr/NNNN-<slug>.md` + a doc-pointer update, citing `29_STACK_VERIFICATION.md` as the evidence.
8. **The first-hire timing is the founder's call.** The strategy recommends M2-start (funding-permitting); the architecture does not break if it slides (Challenge C). The recommendation is named, not presumed.
9. **No autonomous coding agents for load-bearing work.** Adversarial review > autonomous authorship for Tier-1 modules. Autonomous authorship is acceptable only for Tier-3 mechanical scaffolding, and even then under the watchdog.
10. **The candor floor applies to the engineering process too.** The weekly written review names what's blocked and what's slipping; the gate status is honest; no score is inflated. The honesty differentiator of the product (`26` §4) is modeled in how the product is built.

---

## 9. The deliverable map (the Phase-0 artifact list, with paths)

To make Phase 0 recoverable and concrete, the enforcement-environment artifacts and their locations:

| # | Artifact | Path | One-line purpose |
|---|---|---|---|
| E01 | Execution strategy (this doc) | `docs/28_EXECUTION_STRATEGY.md` | The execution layer above the 27. |
| E02 | Stack verification audit | `docs/29_STACK_VERIFICATION.md` | Resolves every ⚠️-verify item against 2026 evidence; recommends swaps via ADR. |
| E03 | Root `CLAUDE.md` | `CLAUDE.md` (repo root) | Pins the verified 2026 stack + doc-pointers; the highest-leverage file in the repo. |
| E04 | Engineering constitution | `docs/enforcement/ENGINEERING_CONSTITUTION.md` | 1-page pointer to `00` §2 + the doc invariants. |
| E05 | ADR system + ADR-0001 | `adr/README.md` + `adr/0001-2026-stack-confirmed.md` | The post-STOP-CONDITION change log; ADR-0001 records the confirmed 2026 stack. |
| E06 | Stack verification checklist | `docs/enforcement/STACK_VERIFICATION_CHECKLIST.md` | The morning-of-the-milestone confirmations (the running form of E02). |
| E07 | Coding standards (execution) | `docs/enforcement/CODING_STANDARDS.md` | The execution-layer coding standards (aligns with, does not re-derive, `22`). |
| E08 | Review standards | `docs/enforcement/REVIEW_STANDARDS.md` | The adversarial-review tiers (Challenge B) + the per-lens checklists. |
| E09 | Definition of Done | `docs/enforcement/DEFINITION_OF_DONE.md` | The DoD (CI gates + invariant-tests + candor + rollback + observability). |
| E10 | AI usage rules | `docs/enforcement/AI_USAGE_RULES.md` | When the AI authors, when it reviews, what it may never do. |
| E11 | Checkpoint & recovery workflow | `docs/enforcement/CHECKPOINT_WORKFLOW.md` | The `_RECOVERY.md` discipline, formalized for the code phase. |
| E12 | Repository conventions | `docs/enforcement/REPO_CONVENTIONS.md` | Branch, commit, PR, squash-merge, Conventional Commits, the doc-pointer convention. |
| E13 | Folder structure (scaffolded) | repo tree (skeleton dirs + `.keep`) | The `24` §2 tree, scaffolded empty, ready for M0. |
| E14 | Skills & subagents plan | `docs/enforcement/SKILLS_SUBAGENTS_PLAN.md` | The repetitive-flow skills + the adversarial subagent definitions. |
| E15 | MCP configuration plan | `docs/enforcement/MCP_PLAN.md` | The live-docs MCP servers (Context7, Buf, Postgres, Playwright). |
| E16 | Stack drift watchdog spec | `docs/enforcement/STACK_DRIFT_WATCHDOG.md` | The forbidden-pattern spec the watchdog enforces on every PR. |
| E17 | M0 implementation plan + tickets | `docs/tickets/M0/` | M0 broken into the smallest tickets, each with DoD + tests + complexity. |
| E18 | M0 ticket 1 implementation | (the first ticket) | The single first M0 ticket, implemented + reviewed + checkpointed, then STOP. |

---

*End of the execution strategy. Next: `docs/29_STACK_VERIFICATION.md` — the implementation-readiness audit that resolves every ⚠️-verify item against the latest 2026 evidence, recommends any swap via ADR with justification, and feeds the verified stack into `CLAUDE.md` (E03). The execution phase begins with E02.*
