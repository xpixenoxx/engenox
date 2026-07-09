# 11 — AI Architecture

> **Status: FROZEN.** The AI-runtime layer: the custom thin LLM gateway (the only place frontier models touch Engenox state), the constrained-decoding contracts against the SHACL shapes, the cross-family adversarial Critic, the provider/model strategy, the self-hosted inference tier, and the warm-canary symbolic fallback that keeps the product usable under frontier-model outage. Authored against `00_FOUNDATION_INTELLIGENCE_CORE.md` and `_FOUNDATION_TECH.md` Layer 9–10. **This document enforces the spine invariant: an LLM may PROPOSE; it may not COMMIT.**

---

## 1. The single rule

**An LLM touches Engenox's state only through six stateless, schema-constrained seams, and every seam's output is re-grounded against the KG by a symbolic verifier before it can touch a spine.** No agent framework is the architecture. No LLM writes a typed commitment. The AI architecture is the plumbing that closes the loop around the two spines — it is plumbing, not the spine.

This section defines the plumbing.

---

## 2. The LLM Gateway (the only model-touching surface)

A custom thin gateway (TypeScript/Go service) wrapping the LiteLLM-proxy routing core. It is the single ingress for every LLM call across every backend service; no service calls a model provider directly. The gateway owns five responsibilities:

### (a) Routing
Choose provider + model by:
- **Task:** Extract/Draft → Anthropic Claude (best JSON/tool-use); Critique → cross-family by config (the correlated-failure break); Abduce → Google Gemini (long-context for big subgraphs); Embed → Cohere/bge (cost).
- **Tenant tier:** long-tail → per-token API; privacy tier (EU/regulated) → self-hosted sglang in a regional cell; whale tier → dedicated GPU cell or hosted open-model inference (Modal) when burst-capacity needs.
- **Cost:** the per-tenant token-budget gate (see §d).

### (b) Constrained decoding
The gateway injects a grammar derived from the tenant's SHACL shapes into the model call:
- **Anthropic Claude:** tool-use mode with a strict JSON schema derived from the target shape (e.g., the `KnowledgeConflict` enum, the `Intervention` type) — Claude can emit only schema-valid terms. Verified best-in-class for constrained JSON.
- **Open models via sglang/vLLM:** GBNF (llama.cpp GBNF) / Outlines / XGrammar grammars derived from the same shapes — outputs are literally drawn from the vocabularies.
- **Gemini:** its schema-response mode + a post-hoc tokenizer-conformance check.
- **OpenAI:** structured outputs / function-calling with strict-mode schemas.

The result: an Extract seam emitting a `KnowledgeConflict` cannot invent a `ConflictType` not in the enum; a Draft seam cannot emit a claim whose `subject_id` isn't an existing KG node (the grammar is built from the living entity set per cycle).

### (c) Re-grounding (the hallucination guard, Pl)
Every seam output is passed through the symbolic verifier (an openCypher + SHACL/Datalog check service) before the gateway returns it:
- An Extract output's `subject_id`/`object`/`predicate` must dereference to existing KG nodes (or be a typed new-entity proposal that goes through Adjudicate).
- A Draft output's claims must each carry a node pointer; the verifier re-parses the polished prose and rewrites any ungrounded claim (or rejects the whole draft on >K ungrounded claims).
- An Abduce output's hypotheses must each reference existing conflicts; the verifier rejects a hypothesis with no `KnowledgeConflict` back-pointer.
- An Adjudicate output must pick among the `ConflictType` classes the Reconciler already enumerated (a constrained-choice schema enforces this).

Ungroundable outputs trigger a bounded re-attempt (≤2) with a tightened prompt; persistent ungroundability is surfaced as an error + the seam returns a `null` (the caller degrades gracefully to the symbolic rules + causal-scorer path).

### (d) Cost control (the whale-cannot-starve-the-long-tail gate)
- **Per-tenant token-budget counters** in Valkey (`token_budget:{tenant}:{day}`), replenished by tier (Starter's daily budget; Growth's; etc.); the gateway returns the probe-plan-not-guess fallback (HTTP 429 with a structured `PlanNotGuess` payload) when the budget is exhausted — no over-budget LLM call ever fires.
- **Weighted-fair scheduling:** the gateway's queue is a deficit-round-robin across active tenants with fair-share weights; a tenant whose budget allows it doesn't grab the queue ahead of a tenant at a low budget that needs a small call.
- **EVSI-allocated probe spend:** the gateway informs the Decision layer's prioritizer of per-call cost; the prioritizer down-weights high-token-cost low-information calls.

This is what makes the Starter-tier gross-margin target reachable (`04` §7) — the cost gate is the unit-economics gate.

### (e) Tracing
Every gateway call emits a Langfuse span: input, output, constraint, model-id, model-version, token cost, grounded? (verifier verdict), retry-count. The span links to the Temporal workflow span (OTel span-links) — a single root-cause trace crosses from `AtlasCycle.start` through the Critic veto to the `ActionRecord.commit`.

---

## 3. The six seams (re-stated, operationalized)

| Seam | Constraint | Model (default) | Re-grounding |
|---|---|---|---|
| **Extract** | Output drawn only from the tenant's SHACL shapes (grammar-injected). | Claude (tool-use) | every field dereferences to a KG node |
| **Draft** | May cite only existing KG/trajectory node pointers; prose verifier re-parses. | Claude | re-parse + rewrite ungrounded claims |
| **Adjudicate** | Constrained choice among `ConflictType` classes the symbolic Reconciler enumerated. | Claude/Gemini | schema constraint is the ground |
| **Embed** | Cohere/bge; vectors into pgvector/Qdrant. | Cohere embed-v4 / bge-m3 | deterministic, no re-grounding needed |
| **Abduce** | Falsifiable hypotheses; each must reference existing conflicts. | Gemini (long-context for big subgraphs) | each hypothesis references a `KnowledgeConflict` |
| **Critique** | Cross-family from the Planner's family; may VETO/DEMAND-REPLAN. | GPT or Gemini (≠ Planner) | each critique references the plan DAG nodes |

**No seam holds a conversation.** Each is a stateless function `input → constrained output`; context-per-call is provided by the caller (the Decision layer pulls the GraphRAG subgraph + recent trajectory into the prompt; nothing persists across calls except the KG + the trajectory store).

---

## 4. The cross-family adversarial Critic (the correlated-failure break)

The Critic must run a *different model family* than the Planner. Correlated failure modes (a prompt-injectable belief shared across same-family models) survive same-family critique but not cross-family. The gateway enforces this by config:
- Planner = Claude → Critic = GPT-5 or Gemini (whichever the tenant's tier allows).
- Planner = GPT-5 → Critic = Claude or Gemini.
- Planner = Gemini → Critic = Claude or GPT-5.

The Critic's mandate:
- **Attack the plan's missing counterfactuals and cost** — draw perturbations from the SCM + learned surface-dynamics models ("what if Bing reindexes mid-window? what if the competitor publishes identical content?") and re-derive expected uplift under each.
- **Run the symbolic validators as tools** — call the openCypher/SHACL checks, the blast-radius arithmetic, the OPA/Cedar permission check, the brand-truth conflict check; a failing validator is a grounded veto.
- **Independently re-probe load-bearing facts before assertion** — the Critic may issue a small targeted probe to re-verify a critical claim the Planner relied on.
- **VETO or DEMAND-REPLAN.** Veto: refuse the plan; the Planner must redraft or escalate. Demand-Replan: force a redraft with a specific objection. Both are typed (the veto references the plan DAG nodes + the validator failures).

**Deadlock resolution:** Planner/Critic disagreement that survives N rounds escalates **up the autonomy dial to a human**, never to an LLM tiebreaker. (There is no LLM tiebreaker because no LLM is the spine — see `05` §0.)

---

## 5. Provider + model strategy (the three-tier decision)

### Tier A — long-tail tenants (90% of MVP volume): provider APIs
- **Anthropic Claude** (default for Extract/Draft; best JSON/tool-use + reasoning quality).
- **OpenAI GPT-5 generation** (cross-family Critic).
- **Google Gemini** (Abduce on big subgraphs; long-context windows).
- **Perplexity Sonar** — used as a *probe target* (we probe its answers), not as a reasoning model — it's not in the gateway's reasoner roster.
- **Embedding:** Cohere embed-v4 (or self-hosted bge-m3 for the privacy tier to avoid egress).

### Tier B — privacy tier (EU/regulated, no egress): self-hosted sglang
- Self-hosted **sglang** on a regional GPU cell (H100/H200 or 2026 B200/GB200 class where supply allows) serving a 2026 open frontier model (a Llama-class or Qwen-class or whatever the strongest open model is at deployment ⚠️-verify).
- The gateway routes privacy-tier tenants to the self-hosted endpoint; their data never egresses to Anthropic/OpenAI/Google.
- The GPU cell is the cost pin; ⚠️-verify GPU quota + spot availability (Infra critique #3).

### Tier C — whale tier (high-volume): dedicated capacity + cost-flipping
- Above a per-tenant token-spend threshold, owned-metal self-hosted sglang beats per-token APIs on unit economics. Model the 3 price points (baseline / spike / constrained) before opening the Growth tier (per `16_INFRASTRUCTURE.md`).
- Burst overflow: Modal (pay-per-second GPU) for spiky measurement/training workloads; never size owned capacity for the peak that exists 5% of the time.

### The federated-learning *training* substrate (separate from inference)
- The PRM, the lift predictor, the conformal calibrator, the surface-dynamics models are *trained* on the CIO corpus in Python/PyTorch on GPU spikes (Modal).
- Federated FedAvg/FedProx refit rounds run weekly, batch; secure aggregation in TEEs (Nitro/SEV-SNP/TDX) for the privacy-tier + a non-TEE path for the long-tail cell.
- DP-SGD noise on gradients. This is *training* infra, gated by the AI-Intelligence readiness closures (Horizon 2+); the MVP inference stack is Tier A only.

---

## 6. The warm-canary symbolic fallback (the AI/ML-critique P1)

The intelligence core claims the proposing layer is "dereferenced from the critical path: under frontier-model outage, the spines run on symbolic rules + the causal scorer." That claim is only true if *the fallback is exercised continuously*, not stashed away unused. The architecture enforces:

- **A daily canary** routes a small fraction (e.g., 5%) of inference traffic through the **symbolic-rules + causal-scorer-only path** (no LLM seams) — the path that would run under outage.
- The canary's outputs are eval'd against the LLM-path outputs on the same inputs; divergence is monitored.
- If the canary's quality drifts (e.g., the symbolic rules rot because the AI surfaces changed), an alert fires — *before* an outage exposes the rot.
- On an actual LLM-provider outage, the canary becomes 100% of traffic within seconds (the gateway detects elevated error rates + re-routes); the product stays usable.

This is the difference between "we hope the fallback works" and "we know the fallback works because we run it every day."

---

## 7. Eval & observability (the LLM-specific surface)

- **Langfuse** (self-hosted OSS) for per-prompt tracing (input/output/constraint/model/grounded?/cost); spans link to Temporal.
- **Arize Phoenix** (or Langfuse evals) for the eval-experiment pipeline: the prompt-search against held-out trajectories (DSPy/TextGrad-style), the PRM-approval-rate-by-plan-class metric, the conformal-coverage-by-segment metric.
- **Argilla** for human-review annotation on the sampled slice — the *ground truth* the judged-evals calibrate against (NOT LLM-as-judge as ground truth per `05` §9).
- **LLM-as-judge** is *only coarse triage* on the long tail; never the ground-truth signal that promotes interventions or trains the PRM.
- **Golden-probe regression suite:** frozen fixtures over golden probe scenarios (the assertions are over the pipeline behavior, not the live-surface outputs, so the suite doesn't rot when Gemini changes — `23_TESTING_STRATEGY.md`).
- **Model-card per seam:** per-model, per-task documented quality + cost + latency + re-grounding-pass-rate; refreshed quarterly.

---

## 8. The non-negotiable invariants (the AI layer)

1. **An LLM may PROPOSE; it may not COMMIT.** Six seams; every output re-grounded before touching a spine.
2. **The gateway is the only model-touching surface.** No service calls a provider directly; routing + constrained-decoding + re-grounding + cost-control + tracing all central.
3. **Constrained decoding is mandatory** — Extract/Adjudicate/Draft emit only schema-valid terms drawn from the tenant's SHACL shapes.
4. **The Critic is cross-family from the Planner.** No LLM tiebreaker; deadlocks escalate to a human.
5. **Cost is gated.** Per-tenant token budget + weighted-fair scheduling + probe-plan-not-guess fallback.
6. **The warm-canary symbolic fallback runs daily.** Known-working, not hoped-working.
7. **LLM-as-judge is only coarse triage; the consented panel + Argilla human review are ground truth.**
8. **Privacy tier never egresses** — self-hosted sglang in a regional cell; the gateway enforces the routing.

---

*End of AI architecture. Next: `12_AGENT_ARCHITECTURE.md` — the bounded proposing layer operationalized (Planner/Critic/Specialist as Temporal-orchestrated workflow steps, the autonomy-dial ledger, the rollback saga).*
