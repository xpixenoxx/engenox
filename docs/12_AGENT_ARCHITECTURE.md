# 12 — Agent Architecture

> **Status: FROZEN.** The bounded proposing layer operationalized: the Planner/Critic/Specialist as Temporal-orchestrated workflow steps (not a framework-run "brain"), the typed plan DAG between them, the seven-level autonomy dial and the per-tenant calibration ledger that gates escalation, the human-approval gate, the regret-detection/rollback saga, and the no-LLM-tiebreaker deadlock rule. Authored against `00_FOUNDATION_INTELLIGENCE_CORE.md` (the proposing-layer cut), `05_SYSTEM_INTELLIGENCE.md`, `09_BACKEND_ARCHITECTURE.md` (the Temporal spine), and `11_AI_ARCHITECTURE.md` (the gateway seams). **No agent framework is the architecture; an LLM may PROPOSE; it may not COMMIT.**

---

## 1. The single rule, operationalized

The Decision layer is **thin orchestration around two symbolic systems** — the causal scorer and the LLM gateway — not a reasoning brain. The Planner, the Critic, and the Specialists are Temporal workflows composed of typed activities; each activity either (a) issues a bounded LLM-seam call through the gateway, (b) issues a symbolic query against the KG, or (c) issues a numeric computation against the causal scorer. **There is no private agent state, no agent memory, no agent tool-loop.** Everything durable lives in Temporal + Postgres; everything transient is re-derived per activity from the KG + the trajectory store.

This section defines what the agents *do*, what the dial *permits*, and how regret is *reversed*.

---

## 2. The three agent roles (workflows, not processes)

| Role | Implemented as | Reads | Writes | Commits? |
|---|---|---|---|---|
| **Planner** | `Decision.Diagnose` + `Decision.ScoreAndPlan` child workflows (Temporal, TS) | AnswerEvents, KG subgraph, trajectory store, causal scorer | a typed **plan DAG** (in Postgres, never a spine) | No — proposes only |
| **Critic** | `Decision.CritiquePlan` child workflow (Temporal, TS) — cross-family via the gateway | the plan DAG, the SCM perturbation set, the symbolic validators (as tools) | a typed **critique verdict** (VETO / DEMAND-REPLAN / ACCEPT) | No — may block, never commit |
| **Specialist** | stateless functions behind the gateway (schema.org JSON-LD generator, content-brief writer, canonical-tag fixer, redirect-map builder, robots.txt patcher) | the plan node's target entity + the tenant's Brand Card | a typed **artifact** (JSON-LD / markdown brief / diff hunk) | No — the Action layer commits |

**Composition:** `AtlasCycle` (09 §2) calls these as child workflows in a fixed DAG — diagnose → score-and-plan → critique → (loop or accept) → action. There is **no free-form agent loop**: the workflow's control flow is deterministic; the LLM only fills typed slots inside each activity. A Specialist that produces a JSON-LD blob is a seam call, not a "tool the agent decided to use."

### Why not an agent framework (LangGraph / AutoGen / CrewAI)
- They put **state in the wrong place** (graph runtime / agent memory), violating "all longevity in Temporal + Postgres" (09 §1).
- They invite **unbounded tool loops**, violating "six stateless seams, no seam holds a conversation" (11 §3). The framework's affordance is the risk.
- They make the **causal scorer a peer tool to "search the web"**, flattening the two-spine hierarchy into a flat tool belt. The scorer is a *spine*; the web is a *seam input*.
- They are **harder to replay** than Temporal workflows on Postgres event history, which breaks the corpus's "survives-architecture-turnover" property (08 §4).

The decision is negative: **Temporal + typed activities + the gateway.** Anything a framework would buy us (looping, branching, tool dispatch) is a 30-line activity already.

---

## 3. The plan DAG (the typed intermediate between Planner and Critic)

The Planner's output is a **DAG** (not prose, not a JSON blob, not free text) persisted to Postgres `plan_dag` (a typed table; like `action_records` it is spine-adjacent but not itself an `ActionRecord` until executed). Each node:

```
PlanNode {
  node_id: UUID
  tenant_id: UUID
  cycle_id: UUID
  intervention_type: InterventionType          // from the SHACL enum
  target_entity_id: UUID                       // dereferences into the KG
  target_surface: Surface                      // the AI surface(s) implicated
  predicted_uplift: Float                       // from the causal scorer
  predicted_uplift_ci: (Float, Float)           // conformal-calibrated
  blast_radius_band: BlastRadiusBand            // single-page | multi-page | sitewide | canonical | redirect
  proposed_dial_level: DialLevel                // what the Planner thinks it needs
  dependencies: [UUID]                          // other PlanNodes that must execute first
  specialist_artifact_ref: UUID | null          // if a Specialist produced the artifact
  provenance: [ProvenanceRef]                  // KG node pointers for every load-bearing claim
  critic_verdict: CriticVerdict | null         // filled by the Critic
}
```

**The Critic's verdict references `node_id`s + the validator failures.** A VETO carries `vetoed_nodes: [UUID]` + `validator_failures: [ValidatorFailure]`; a DEMAND-REPLAN carries `demand_nodes: [UUID]` + `objection: TypedObjection`. The Critic cannot veto in prose; the type forces grounded reference. This is the same discipline as the Draft seam's node-pointer requirement (10 §2) — the audit hover on a vetoed node shows *which validator failed on which claim*.

### The plan-DAG is not a commitment
The DAG is a **proposal artifact**. It becomes an `ActionRecord` (a spine row) only after the Critic accepts (or survives DEMAND-REPLAN rounds) AND the Cedar gate's second pass (09 §6) maps `(plan, dial_level, blast_radius)` → `permitted | denied`. Until then, it is queryable, replayable, and discardable; a crashed cycle re-derives it from the persisted `AnswerEvents` + the deterministic Planner prompt. **A tenant can see the plan that *would* run before any dial permits it to run** — this is the "tell me what's wrong without changing anything" (`read`) affordance.

---

## 4. The seven-level autonomy dial

The intelligence core's dial (read → recommend → draft → propose → execute-with-approval → guarded → autonomous) is the **least the symbolic spine permits**. The frontend (10 §5) maps it to a four-tier human metaphor ("hands on the wheel"); internally it is seven discrete levels with distinct commitments:

| Level | Symbolic gate permits | What actually executes | Touches the customer's site? |
|---|---|---|---|
| `read` | Diagnose only | perceive → diagnose → render the conflict + the would-be plan | No |
| `recommend` | + ScoreAndPlan (render) | the plan DAG is built and rendered as a bullet list | No |
| `draft` | + Specialist artifacts (render) | the JSON-LD / content brief / diff hunk is generated and shown | No |
| `propose` | + Action.PR-open | a PR is opened; **human merge required** | No (until merged) |
| `execute-with-approval` | + Action.PR-open-and-assign | a PR is opened and assigned to the human; **human approval is a Temporal Signal** | No (until approved) |
| `guarded` | + Action.PR-merge (auto, within blast-radius cap) | the PR merges automatically; **rollback-hash pre-staged**; alert on regret | **Yes** (reversible) |
| `autonomous` | + Action.PR-merge (auto, full cap) + batched scheduling | multiple PRs per cycle; periodic review; alert + auto-rollback on regret | **Yes** (reversible, batched) |

**The dial is per-tenant, per-surface.** A tenant may be `propose` on their blog content but `read` on `schema.org` sitewide canonicals. The Cedar gate (09 §6) evaluates the pair `(dial_level, blast_radius_band)` per PlanNode — a `propose`-level tenant cannot accidentally auto-merging a canonical redirect.

### The MVP default: `Co-pilot` = `propose`
No tenant starts above `propose` (the frontend's "Co-pilot" tier). Every escalation above it is **earned** (§5) and **opt-in** (the tenant explicitly toggles in `/admin`); every demotion is **automatic** (§7) and **visible** (a "auto-rolled back to Co-pilot after 2 alerts" notification — 10 §5).

---

## 5. The autonomy-dial ledger (the calibration that earns escalation)

Escalation is not a toggle the user sets; it is **earned on three measured axes**, recorded in `autonomy_dial_ledger` (08 §2). A tenant may *request* a higher level in `/admin`; the request evaluates against the ledger, and the Cedar gate grants it only if all three axes clear:

| Axis | What it measures | Threshold to escalate one level | Why |
|---|---|---|---|
| **Lift-predictor calibration coverage** | For the last N cycles at the *current* level, did the conformal interval contain the realized lift at the nominal rate? (the coverage diagnostic from 05 §8) | ≥ k cycles with coverage ≥ 1−α | If we can't predict lift accurately *for this tenant*, we can't be trusted to auto-merge. |
| **Human-approval rate** | Of the PRs we opened at `propose`/`execute-with-approval`, what fraction did the human merge without modification? | ≥ m PRs with approval rate ≥ threshold | If the human keeps rejecting/redrafting, our plans don't match the tenant's intent. |
| **Pooled overlap/support** | Across the corpus for this tenant's segment, how many prior interventions of this `intervention_type × surface × context_signature` have we measured? (the standardization asset, 06) | ≥ p comparable outcomes with non-degenerate CIs | We won't auto-merge a plan class we've never measured; the causal scorer can't price it. |

**The escalation function is a pure function of the ledger** — `requestEscalation(tenant, surface, requested_level) → {granted, denied, missing_axes}`. No LLM is in this path. This is the spine's embodiment: trust is *measured*, not *claimed*.

### The ledger row
```
autonomy_dial_ledger {
  tenant_id, surface, cycle_id, current_level, requested_level,
  lift_predictor_coverage_k, lift_predictor_coverage_pass,
  human_approval_rate, human_approval_rate_pass,
  pooled_overlap_n, pooled_overlap_pass,
  decision: granted | denied | auto_demoted,
  decision_reason: jsonb,
  decided_at, decided_by: human | system
}
```

Every escalation *and* every demotion writes a row; `/admin` renders the ledger so the tenant sees the *measurement*, not a "because the system said so."

---

## 6. The human-approval gate (`execute-with-approval` and above)

At `execute-with-approval`, the `Action.Execute` child workflow opens the PR and **pauses** on a Temporal `Signal:HumanApproved`. The workflow's event history records the pause; the PR description carries the typed plan node + the Critic verdict + the blast-radius arithmetic + the conformal CI of predicted uplift. The human approves by merging the PR (the merge event → a webhook → the Signal) or by clicking "Approve" in `/interventions` (a Server Action → the Signal).

- **Timeout:** if no Signal within `approval_timeout_days` (per-tenant configurable, default 14), the workflow **expires the plan** (not auto-merges) and emits a "plan expired, redraft?" prompt. Auto-merging on timeout is strictly prohibited.
- **Re-probe-on-approval:** when the Signal fires, the workflow re-runs the Critic's load-bearing-fact probe (11 §4) once more — if a critical fact has shifted since the plan was built, the merge is *blocked* and the plan is re-criticized. A stale plan does not merge.
- **The merge is the commit boundary.** The PR merge creates the `ActionRecord` spine row (08 §2 `action_records`) — *this*, not "the LLM decided," is the moment a typed commitment enters the truth spine. The Action layer signs the manifest; the measurement window opens (09 §2 `InterventionSaga`).

---

## 7. The regret-detection + rollback saga

The `InterventionSaga` (09 §2) watches the outcome TE during the lagged measurement window. Regret is **typed, not vibes**:
- **Realized regret:** the conformal interval's realized lift is **negative** (lift < 0) OR the realized lift falls **below the CI lower bound** predicted at plan time — the estimator was not just wrong, it was directionally wrong.
- **Regret is a high-integrity corpus row.** The `Outcome` row carries integrity tags (`id_strategy`, `foreign_change_status` per 06) + **`regret: true`** + the `plan_node_id` whose prediction failed. This is gold to the causal scorer — a counterexample that recalibrates the lift predictor (the closed loop's whole point — 05 §3).

### The rollback
```
RegretRollback(action_record_id):
  1. Measurement.EstimateOutcome confirms realized regret (not a foreign-change artifact — §8)
  2. Action.Rollback(action_record_id) [idempotent activity, IdempotencyKey = (tenant, cycle, intervention, "rollback")]
     → reverts the merged change via the pre-staged rollback-hash (the signed-inverse diff)
     → opens a "rollback PR" (at any dial level — rollback is always permitted; it *reduces* blast radius)
  3. dial_ledger.auto_demote(tenant, surface, reason: "regret")   → drops one level
  4. Alert.tenant(tenant, "regret + rollback at <surface>; auto-rolled back to <new level>")
  5. tag Outcome.regret = true → refreshes the causal scorer on the weekly batch
```

- **The rollback-hash is pre-staged at merge time (09 §1 Action layer):** the signed-inverse of every merged diff is computed and stored in R2 Object-Lock *before* the original PR merges. Regret rollback is therefore *mechanical* — no LLM re-reasons about how to undo a change; it applies a verifiable inverse.
- **Rollback is not gated by the dial.** A tenant at `autonomous` may auto-merge; the rollback is still permitted (and automatic on confirmed regret). The dial gates *forward* blast radius; the spine **always** preserves the right to reverse.
- **Demotion is automatic and recorded** (the ledger row with `decision: auto_demoted`, `decided_by: system`). The tenant may re-earn the level on the next cycle (§5) — the measurement, not a toggle, restores trust.

### The N-alert demotion window
The Cedar gate's demotion-on-alert (09 §6) computes over a rolling window: **N degradation alerts OR 1 confirmed regret** in the window → drop one level. (Degradation alerts = the EWMA/CUSUM-detected surface drift, 09 §2 step 7; regret = the outcome-side failure defined here.) The window length and N are per-tier defaults overridable per-tenant; both are *symbolic* (Cedar policy), not LLM-judged.

---

## 8. The "foreign change, not regret" guard

The risk: a surface's metric drops because **the AI surface itself shifted** (Bing reindexes, ChatGPT changes its citation format) — a foreign change, *not* a consequence of our intervention. The intuition core demands we not blame (and not rollback) our intervention for a platform bump. The guard:

- **EWMA/CUSUM foreign-change detection** (15 §measurement) tags the measurement window's `foreign_change_status` (`clean | suspected-bump | confirmed-bump | period-invalid`) on every cycle.
- **If `period-invalid`:** the `InterventionSaga` **quarantines** the outcome — it does NOT count it as regret, does NOT auto-demote, does NOT feed the causal scorer; it raises a "measurement window contaminated by platform bump — manual review" alert instead. The corpus row is tagged `quarantined` (a high-integrity "we don't know" — 05 §8).
- **If `confirmed-bump` and the lift is still negative:** the outcome is recorded but **down-weighted** in the causal scorer (the integrity tag `foreign_change_status` does exactly this — 06). Regret rollback still fires if the conformal CI of *our* effect is negative *after* partialling out the bump via the SCM's surface-dynamics model; otherwise it is recorded as a non-regret noisy outcome.

This guard is the difference between an honest estimator and a superstitious one. It is the AI-research-scientist role's hill.

---

## 9. The Planner/Critic deadlock rule (no LLM tiebreaker)

When the Planner and Critic disagree and survive N rounds of DEMAND-REPLAN (N per-tier, default 3), the workflow **escalates up the autonomy dial to a human**:

- At `propose` and below: the plan is **not built** — the cycle renders the disagreement as "our analysts disagree — here is the Planner's plan and the Critic's objection; human review recommended," a typed `PlanDeadlock` row in the dashboard.
- At `execute-with-approval` and above: the plan is **auto-demoted to `propose`** for this cycle (the deadlock is evidence the plan is not safe to auto-merge) and surfaced for human review.
- **There is no LLM tiebreaker, ever.** No third LLM "decides" between Planner and Critic. An LLM that broke a Planner/Critic tie would be an LLM committing — the one thing the spine forbids (05 §0). The tie stays broken until a human resolves it; the symbolic fallback (symbolic rules + causal scorer, 11 §6) runs in the meantime so the product stays usable.

---

## 10. Context-window discipline (the proposing layer's input)

Each seam call is stateless; the Decision layer supplies context per call (11 §3). The discipline:

- **The GraphRAG pull is sized against the mid-context degradation threshold** (07 §memory router) — community summaries + the working-set subgraph, never "dump the whole KG." The memory router's job is to fit the load-bearing subgraph + recent trajectory + the tenant's Brand Card + the Critic's perturbation set *under* the model's effective-attention budget.
- **Trajectory context is a typed window** (the last N `InterventionSaga`s + their outcomes), pulled from ClickHouse + Postgres, not a "conversation history."
- **No memory persists across cycles in the agent.** The KG + trajectory store are the memory; the agent re-derives per cycle. This is what makes a crashed cycle fully replayable from `AnswerEvents` + deterministic prompts — no "agent mental state" to reconstruct.
- **The Critic gets the Planner's prompt + output verbatim** (cross-family adversarial critique needs the same facts, not a summarized version), plus its own perturbation set. The gateway's tracing (11 §2e) records both so a deadlock is forensically replayable.

---

## 11. The bounded proposing layer invariants

1. **No agent framework; Temporal + typed activities + the gateway.** No private agent state, no tool loop, no agent memory in the runtime.
2. **The Planner's output is a typed plan DAG; the Critic's verdict references DAG nodes + validator failures.** No prose vetoes; no free-text plans.
3. **The plan DAG is a proposal, not a commitment.** It becomes an `ActionRecord` only on Critic acceptance + the Cedar gate's second pass + (for `≥execute-with-approval`) the human Signal.
4. **Escalation is earned on three measured axes (calibration, approval rate, pooled overlap) recorded in the ledger, not toggled.** No LLM in the escalation path.
5. **The dial is per-tenant per-surface; `Co-pilot` (`propose`) is the MVP default; escalation is opt-in; demotion is automatic and visible.**
6. **The merge is the commit boundary.** A typed commitment enters the truth spine only on a PR merge (or the auto-merge at `guarded`+ with pre-staged rollback-hash), signed by the Action layer.
7. **Regret is typed (lift < 0 or below CI lower bound); rollback is mechanical (pre-staged inverse); demotion is automatic; the regret row is a high-integrity corpus counterexample.**
8. **Foreign-change contamination quarantines the outcome, never blames the intervention.** The honesty estimator's discipline.
9. **No LLM tiebreaker; Planner/Critic deadlock escalates to a human** (or auto-demotes to `propose` at higher dial levels). The spine never lets an LLM break a tie.

---

*End of agent architecture. Next: `13_MEMORY_ARCHITECTURE.md` — stratified memory across hot/operational/episodic/corpus tiers, the memory router, the GraphRAG community-summary cache, and the consented-panel build sequence that turns the corpus into a standardization asset.*
