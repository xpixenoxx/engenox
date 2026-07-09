# 05 — System Intelligence

> **Status: FROZEN.** This is the document the founder named as the most important: *What is the actual intelligence of Engenox — what would a competitor who copies every screen, API, feature, and workflow still be unable to copy?* This document is the external-blueprint rendering of the recovered, frozen intelligence core (`00_FOUNDATION_INTELLIGENCE_CORE.md`). It describes the intelligence across the 12 dimensions the founder named — **how it thinks, learns, remembers, reasons, predicts, prioritizes, decides, explains, improves, and how every module shares intelligence** — plus the copying-resistance thesis. The architecture's distinctive ideas are preserved verbatim from the recovered synthesis; nothing here is re-litigated.

---

## 0. The intelligence thesis (the answer to the most important question)

Engenox's intelligence is **two commitment spines with a bounded proposing layer between them**:

- **The truth spine** — a typed, bi-temporal knowledge graph. It owns every commitment to *what is the case*. Perception writes typed, time-stamped, provenance-tagged assertions; a symbolic verifier (openCypher + Datalog/SHACL) returns hard yes/no on any claim; conflicts are typed `KnowledgeConflict` nodes; provenance runs to a re-derivable tree. **No commitment to "X is the case" is made anywhere else.**

- **The action spine** — a counterfactual uplift estimator trained on a signed, integrity-tagged Causal Intervention-Outcome (CIO) corpus. It owns every commitment to *what to do*. Predicted uplift, confidence interval, prioritization weight, and autonomy-escalation evidence all derive from it. **Its honest output IS the product's saleable property.**

- **The proposing layer** — frontier LLM agents (Planner / Critic / Specialist) sit *between* the spines. They abduce diagnostic hypotheses and generate candidate interventions — **but commit nothing**. The Critic is cross-family adversarial (Claude vs. Gemini vs. GPT) so correlated failure modes don't survive; it can VETO or DEMAND-REPLAN; deadlocks escalate up the autonomy dial to a human, never to an LLM tiebreaker. This layer is dereferenced from the critical path: under a frontier-model outage, the spines keep running on symbolic rules + the causal scorer.

- **The decisive honest-handling move** — every corpus row carries two integrity tags: **identification strategy** (RCT-eligible / quasi-experimental / observational) and **foreign-change status** (clean / suspected-bump / confirmed-bump / period-invalid). These tags gate how hard each row may pull the causal estimator. This is what makes the "honest confidence" a saleable property rather than rhetoric.

The moat is **not code**. It is the **calibrated, consented, time-accumulated corpus on an aligned coordinate system** that a clone cannot buy or backfill. A competitor who copies every screen, API, agent prompt, and model architecture inherits a UI shell over public AI surfaces and is left with **zero of six time-and-consent-accumulated assets** (see §13).

---

## 1. How it thinks

Thinking reduces messy perception into typed, time-stamped, provenance-tagged assertions, then queries the causal estimator for expected uplift per candidate. The cycle runs as a durable Temporal workflow per tenant (`AtlasCycle`):

1. **Perception** fires M queries × N samples per surface through the thin LLM gateway, capturing verbatim answers, citations, competitor IDs; raw lands in R2/ClickHouse.
2. **Extract** (a constrained-decoding LLM seam) maps free text into typed `AnswerEvent` / `Assertion` / `SourceDoc` / `mentions(Competitor)` / `rankedAt(position)` nodes — the model can emit only terms drawn from the tenant's SHACL shapes.
3. **Reconciler** compares Perception to the Brand-Truth source-of-truth and emits first-class `KnowledgeConflict` nodes typed `{Stale, Wrong, Missing, Ambiguous, CompetitorDistortion}`.
4. **Framing** maps the snapshot into the KG coordinate space: entity/surface/context nodes with mention-rate, rank, sentiment, attribution-revenue as edge properties.
5. **Abduce + Critic** generate falsifiable diagnostic hypotheses and typed candidate interventions.
6. Each surviving candidate is embedded into the **intervention feature space** — the load-bearing engineering work — and the causal estimator returns `E[Y|do(I)|context]`, a calibrated CI, a side-effect vector, and an expected realization date.

The LLM touches state only at step 2 (extraction) and step 5 (hypothesis/candidate drafting); it **never commits an asset**. Multi-sample quantification turns LLM nondeterminism into a measurable posterior: `P(brand mentioned | Q, S, week)` is a typed node *with a distribution*, not a guess.

---

## 2. How it learns

Every corpus row is tagged with an **identification strategy**, and that tag decides how hard the row pulls the estimator. Four parallel mechanisms run over a Temporal measurement window:

1. **Active exploration** — Thompson sampling / LinUCB on cheap, reversible, low-blast interventions (content-brief phrasing, schema-field wording) under an explicit per-tenant consented exploration budget. Tagged `RCT-eligible`, weighted highest.
2. **Observational debiasing** — Double Machine Learning (Chernozhukov DML) and doubly-robust / propensity-weighted estimation for the high-blast / irreversible majority where randomization is unethical. Tagged `observational`.
3. **Synthetic-control / DiD** for counterfactual trajectories; donor pool = comparable consenting tenants' entity-surface-contexts measured in the same window. Tagged `quasi-experimental`.
4. **Heterogeneous treatment effect** estimation via causal forests (grf) / R-learners yielding CATE `τ(x) = E[Y(1)−Y(0)|X=x]`.

**Calibration is first-class:** per segment, per surface, per intervention class — isotonic / Platt, then conformally re-calibrated for distribution shift. Cross-tenant: federated FedAvg / FedProx gradients with secure multi-party aggregation inside TEEs (Nitro / SEV-SNP / TDX) and DP-SGD noise; raw assertion streams never leave a cell.

**Critical cold-start fix:** cross-tenant transfer is hierarchical-Bayesian shrinkage on cluster-level posteriors with **hard positivity/overlap guardrails** — if pooled support for a new tenant's (intervention, context) cell is below threshold, the prior is down-weighted and the CI widened (which itself forces the autonomy dial *down*) rather than recommending an extrapolated effect. This protects the small-agency ICP by being honest rather than overconfident. **North-star metric:** high-confidence causal pairs added per period.

---

## 3. How it remembers

Stratified, append-only, bi-temporal, tenant-partitioned.

- **Episodic:** the CIO corpus — every `(intervention, context, outcome, counterfactual, ID-strategy, foreign-change-status, consent)` tuple — write-once, signed by signer-of-record, WORM-replicated to R2, partitioned by `tenant_id` under RLS + per-tenant crypto keys. The institutional memory that survives employee and architecture turnover.
- **Semantic / declarative:** the bi-temporal KG, carrying brand entities/facts/relations, the AI-surface coordinate graph, schema-prefs, voice profile (the Brand-Truth SOT) as a versioned DAG with validity intervals. Corrections are supersession, never overwrite — state-as-of any T is a time-sliced Cypher query. Corrected facts leave **anti-facts** so dead ones are never re-asserted (ghost-busting).
- **Procedural:** the typed intervention catalog + learned effectors — action templates, their feature embeddings, and the learned intervention→effect-distribution map.
- **Working:** the live scratchpad — pulled GraphRAG subgraph + recent observations, sized by a memory router trading GraphRAG depth against the model's effective context (accounting for mid-context degradation), discarded once a decision commits.
- **Calibration memory:** per-model per-segment isotonic / Platt tables tracking predicted-vs-realized uplift — itself a learned artifact making "honest confidence" literal.

Forgetting is principled: verbatim probe samples downsample to distributions after ~90 days while typed assertions and corpus rows are retained indefinitely; DP-aggregated summaries survive past the per-tenant retention window so the corpus outlives the row. Cross-tenant memory exists only as federated parameters + sufficient statistics, never raw rows.

---

## 4. How it reasons

Three distinct modes, all auditable.

- **Syntactic truth-reasoning:** the planner emits falsifiable hypotheses ("ChatGPT undermentions Product P because: no Product schema markup; low presence on cited domains D; competitor C outranks us on entity E"); the symbolic verifier (openCypher + Datalog/SHACL) returns hard yes/no + numbers; nothing the LLM hypothesized is trusted until re-grounded; conflicts are typed `KnowledgeConflict` nodes and the Adjudicate service picks among classes the symbolic side enumerated — never free-generating.

- **Causal action-reasoning:** a coarse per-surface structural causal model (content change → reindexation lag → rank → mention-rate → referral → revenue) with explicit named confounders lets the causal model evaluate `E[Y|do(I)]` not `E[Y|I]` — the difference between "brands that publish JSON-LD rank better" (confounded) and "publishing JSON-LD causes +τ mention lift in this segment". `do`-calculus / intervention semantics keep reasoning faithful to signed corpus rows.

- **Abductive / counterfactual reasoning** (the agent layer): the cross-family Critic stress-tests plans by drawing perturbations from the SCM + learned surface-dynamics models ("what if Bing reindexes mid-window? what if the competitor publishes identical content?"), re-deriving expected uplift under each — exploratory reasoning *over the model*, LLM-free. It may VETO or DEMAND-REPLAN, and independently re-probes load-bearing facts before assertion. Planner/Critic deadlock escalates up the autonomy dial, never to an LLM jury as ground truth.

Every conclusion stores its derivation as a provenance subgraph with back-pointers to the signed corpus rows that produced it.

---

## 5. How it predicts

The flagship output is a calibrated distribution `P(uplift|do(I), context)` = point estimate + honest conformal CI, with an attached **expected realization date**.

Two models are averaged then reconciled: a **structural** model (what the graph and SCM say *should* change — authority + presence + schema gaps) and an **empirical** uplift model (what the corpus says *did* change for comparable contexts). Large disagreement signals high uncertainty and routes the bandit to EXPLORE (probe-first) rather than EXPLOIT.

Primary estimator: causal forest / R-learner CATE `τ̂(x)` with honest asymptotically-normal CIs, isotonic + conformally re-calibrated. Counterfactual trajectories use the synthetic-control method (Abadie) — a donor basket of comparable competitor/tenant-query contexts estimates the un-intervened path; the gap between actual and synthetic is the lift, with bootstrap CIs; cumulative-lift = area between them, with **degradation alerts** when the Δ CI crosses zero.

Surface-dynamics models — per-AI-surface forecasters for reindexation-latency distributions, rank→mention-rate curves, attribution-pixel-firing reliability — translate an upstream rank effect into the downstream business metric and quantify propagation lag, so a "lift" predicted today carries an expected realization date. A side-effect predictor runs in parallel for negative outcomes (penalty risk, cannibalization, duplicate-content flags, brand-voice drift).

**The decisive honesty feature:** EWMA / CUSUM control limits on prediction residuals raise a degradation alert, cleanly separating "our move worked" from "OpenAI/Google pushed a model bump."

Cold-start: the hierarchical-Bayesian federated prior gives the new tenant a CATE with a wide CI gated by overlap support — and that wide CI itself forces the autonomy dial down to read/recommend/draft only.

---

## 6. How it prioritizes

A dual scheduler where the queue math and fairness are deterministic and only the lift/EVSI estimates are model-derived.

Per-candidate score `= predicted_uplift × business_weight − risk × irreversibility + exploration_bonus`, all with explicit CIs so high-variance actions are discounted, not just high-point-estimate ones. `business_weight` is the tenant's revenue-tied scoreboard; `exploration_bonus` is the **Expected Value of Sample Information** — cheap-but-uncertain interventions are bumped so the fleet learns even when single-tenant uplift is modest.

**Decisive rule:** the system never prioritizes an intervention it cannot get *merged AND measured*, because unmeasured interventions cannot enter the corpus and so cannot improve the model — if a loop can't close, it's deprioritized regardless of EV.

**Intra-tenant:** weighted-fair deficit-round-robin in Temporal so whales can't starve the long tail; per-surface cooldowns and concurrency caps. **Cross-tenant:** weighted-fair queuing on the shared inference + probe pool with fair-share weights protecting the long tail; a **federated bandit** allocates pooled exploration — when many tenants face the same uncertain high-value intervention class, the system runs it on a few consenting tenants to learn cheaply, then exploits fleet-wide. Active sensing: probe budget itself is EVSI-allocated.

High-blast / low-reversibility candidates route to the approval lane regardless of score. Under model outage, the prioritizer degrades gracefully to round-robin — a real downgrade but a live one.

---

## 7. How it decides

A decision is a typed, signed, auditable **ActionRecord**, never an LLM utterance. The type carries `interventionType, predicted_lift, conformal CI, blast-radius, reversibility, derivation subgraph with corpus-row back-pointers, approval_required`.

The **autonomy dial** (`read → recommend → draft → propose → execute-with-approval → guarded → autonomous`, per-tenant, earned) is a deterministic policy gate evaluated BOTH before and after the proposing layer reasons:

- **Before:** OPA/Cedar compute scope, blast-radius, and permission bounds symbolically.
- **After:** the Critic-validated, causally-scored plan is mapped to a dial level, where escalation is EARNED by demonstration on **three** measured axes — (a) lift-predictor calibration (conformal coverage) above threshold per surface and intervention class, (b) human-approval rate above threshold, and (c) **pooled overlap/support above threshold for THIS (intervention, context) cell**.

The overlap axis is the key addition: low-support cell → no autonomous action regardless of calibration, eliminating the "confident-but-extrapolated" failure mode. **An agent cannot self-promote; an LLM override is structurally impossible because no LLM writes to the `ActionRecord` type.**

Execution mutates only the **CUSTOMER's infra**: at `propose` it renders a 1-click PR into their Git/CMS; at `execute-with-approval` it opens the PR and pings the human to merge; at `guarded/autonomous` it lands the change within a blast-radius budget, with a Temporal compensating-action saga that auto-rolls-back on a probe-drift-threshold breach. Every executed intervention carries a signed manifest (`who/what/why/expected-uplift/CI/rollback-hash`); rollback is `git revert` into their repo/CMS — deliberately not a proprietary mechanism, which is where blast-radius trust derives from.

---

## 8. How it explains

Explanations are rendered **provenance subgraphs, not rhetoric** — six panels plus a contrarian block, all constrained.

The panels: **what-we-perceived** (verbatim probe quotes + sample counts + binomial CIs + provenance), **what-brand-truth-says** (the SOT assertion + author + `tx_time`), **the conflict** (typed, both sides' provenance), **considered-interventions** (each with predicted lift + its CI), **the chosen action + guardrail-check results**, and **the measurement plan** — plus retrieved corpus precedents ("we forecast +18% mention lift for this schema change; rests on 312 similar interventions across 47 tenants in comparable entity/surface contexts; CI ±6; here are 5 anonymized exemplars and their measured trajectories") and the Critic's surviving objections **verbatim**.

A drafting LLM polishes the prose but may cite only existing KG/trajectory node pointers — it cannot introduce a fact with no node. A verifier re-parses the polished text and rewrites any claim it cannot ground; **the LLM literally cannot invent an explanation that survives to the user.** A **contrarian block** names the conditions under which the forecast flips ("if the competitor publishes equivalent content, or Bing reindexes >T days late, predicted uplift falls to +2%") — SCM logic, not prose. A dry-run / counterfactual toggle shows what happens if we don't act.

Honesty is structural: lift is always reported with its CI ("+6% mentioning lift, 90% CI [+1%, +11%]") and any degradation alert surfaces alongside it; the monthly Candor Report pairs realized lift with the interval we predicted *plus a coverage diagnostic* of past intervals. **The statistics are immutable; the LLM only dresses them in the tenant's voice.**

---

## 9. How it improves

The closed loop runs as a resumable Temporal saga: `perceive → decide → act → measure → tag-and-append-to-corpus → refresh-models`. Each cycle retro-parses predicted-vs-actual residuals; large residuals fork into either a **foreign-change flag** (residual signature matches a platform bump → isolate, refit that surface's dynamics model only) or a **model-update job** (re-estimate the tenant's uplift posterior).

Every measurement window ends with a foreign-change status — `clean / suspected-bump / confirmed-bump / period-invalid` — that gates corpus weight: clean rows feed the high-confidence estimator at full weight; suspected at reduced weight or held; **period-invalid rows (e.g., Bing reindexed mid-window, corrupting both treated unit and synthetic control) are quarantined and trigger refit rather than contaminating `τ̂`.**

Promotion is a three-tier pipeline (soft → hard):
1. **SOFT** correlations live immediately inside the uplift model, flagged `learned/unvalidated`.
2. A transfer rule that K tenants converge on with effect size > τ and CI excluding zero **graduates** to a published deterministic heuristic in the rules engine — but only after held-out cross-tenant validation.
3. Candidate SHACL shapes / Datalog rules proposed from recurring patterns sit in a **candidate-rules sandbox** and require human + statistical + overlap-support validation before they ever gate an autonomous action.

**Self-improvement is bounded:** the system may *propose* new shapes/rules but **never self-write its guardrails into production**. Eval is a regression suite over golden probe scenarios plus Argilla human review on a sampled slice; LLM-as-judge is only coarse triage, never ground truth — the consented panel is.

The discipline: every module's KPI is its marginal contribution to high-confidence causal pairs per period, preventing the search-team-recall-vs-LLM-team-BLEU pathology. The flywheel: corpus grows → CIs narrow → more decisions clear the autonomy threshold → more interventions merged → more outcomes → corpus grows; **time-to-corpus-coverage is the strategic clock.**

---

## 10. How every module shares intelligence

Four central registries every module reads and writes, not distributed assets:
- (a) the **bi-temporal KG + SHACL/OWL ontology + Kafka/Redpanda assertion-and-event bus + shared feature store** (Feast-style: uplift features + published heuristics loaded at inference);
- (b) the **signed CIO corpus**;
- (c) the **intervention feature space** — embeddings that make interventions comparable, the standardization asset that lets transfer be meaningful at all;
- (d) the **federated models** (PRM, lift predictor + conformal calibrator, embedders, retrievers, surface-dynamics models) pulled by every cell.

All seven layers speak one typed substrate with one provenance discipline: Perception writes assertions and consumes the federated model to perform active sensing; Brand-Truth is the SOT the SCM reads and consumes the causal model back (low-coverage field → deprioritize; high-leverage field → make prominent); Decision is thin orchestration around the causal scorer; Action/Governance writes executed interventions back, closing the loop; Measurement writes tagged Outcome rows — without it nothing in the corpus is causal.

The LLM gateway exposes exactly six stateless, schema-constrained services with shared constrained-decoder configs and shared DSPy-Assert'd prompts — **no module owns a private LLM brain, so intelligence cannot drift apart across the stack.** OpenTelemetry + Langfuse-style spans unify telemetry across every graph query, rule eval, and LLM call, so a single eval harness and a single root-cause trace cross all layers. The Ecosystem layer reads and writes the same bus: plugins must emit candidate interventions into the shared feature space to be invoked, so the central scorer scores them and the marketplace cannot fragment intelligence; candidate-facts from plugins go through the identical Extract→verify pipeline under WASM / Firecracker-microVM sandbox — they augment the KG but cannot inject unverified facts. The Standards layer publishes the aggregate causal findings as the **AI Visibility Index**, which doubles as a public-side calibration signal feeding back into the system.

---

## 11. The six bounded LLM seams (the only places intelligence is fuzzy)

1. **Extract** — free text → typed assertions (constrained decoding via Outlines / XGrammar / GBNF; output drawn only from the tenant's SHACL shapes).
2. **Draft** — render structured claims into the tenant's voice; may cite only existing KG node pointers.
3. **Adjudicate** — constrained *choice* among conflict classes the symbolic side already enumerated (never free generation).
4. **Embed** — produce retrieval vectors.
5. **Abduce** — generate falsifiable diagnostic hypotheses.
6. **Critique** — cross-family adversarial veto.

An LLM may PROPOSE; it may not COMMIT. A symbolic verifier re-grounds every output before it can touch either spine. The proposing layer is dereferenced from the critical path: under a frontier-model outage, the symbolic rules + the causal scorer run as a warm canary every day and keep the product usable (compute-only), not "round-robin as throwaway."

---

## 12. The cut points (the discipline made operational)

```
Perception (probe) → typed assertions → Reconciler (KG conflict nodes)
   ↓
Abduce + Critic (LLM proposing layer) → falsifiable hypotheses + candidate interventions
   ↓
Symbolic verifier (openCypher + Datalog/SHACL) → refutes/proves against the KG
   ↓
Causal scorer → scores survivors: E[Y|do(I)|context] + conformal CI + side-effect vector + realization date
   ↓
Autonomy dial (Cedar policy gate, evaluated before AND after) → maps to dial level
   ↓
Action → executes in the CUSTOMER's infra (PR into their Git/CMS; they merge)
   ↓
Measurement (Temporal window, weeks-long) → tagged outcome row (ID-strategy + foreign-change status)
   ↓
Corpus (append-only, signed, WORM) → refits the causal scorer → next cycle
```

**Nothing crosses a spine without being re-grounded on the receiving side.** An LLM may PROPOSE; the symbolic verifier proves or refutes; the causal scorer scores; the autonomy dial gates; Action executes in the customer's infra; Measurement closes the loop with a tagged row that refits the scorer.

---

## 13. What cannot be copied (the moat, restated)

A competitor who clones every screen, API, agent prompt, and model architecture inherits a UI shell over public AI surfaces and is left with **zero of six time-and-consent-accumulated assets**:

1. **The CIO corpus** — path-dependent. Cannot be seeded by scraping (no control over customer-side repo merges or aligned measurement windows); only causal if the counterfactual is held, which needs a donor pool of comparable consenting tenants at scale. A clone's counterfactuals are wide nonsense until it has hundreds of aligned tenants, accumulated only over years.
2. **The Consented Human-Query Panel** — real humans querying ChatGPT/Perplexity/Gemini whose verbatim answers are measured with known demographics. A recruitment, trust, and privacy-engineering asset a clone cannot reconstruct from search APIs.
3. **The Brand-Truth primary-source position** — a two-sided network: AI surfaces read Engenox as the source of truth once Engenox is the de-facto SOT for enough brands that surfaces have incentive to integrate. A clone arrives with zero brands and zero incentive for any surface to integrate.
4. **The aligned coordinate system** — the KG schema + the intervention feature space — itself a standardization asset; what makes the federated gradients meaningful, so a clone cannot even pool across its (nonexistent) tenants.
5. **The calibrated core** — a competitor who steals the rules, ontology, and schema inherits *uncalibrated* heuristics; the rules without the corpus are just guesses, and the differential value IS the calibration, which only the loop produces.
6. **Autonomy trust** — customers let Engenox open PRs in their repos because calibrated confidence has been demonstrated over time; a clone with no calibration history is either overconfident (causes damage) or overcautious (delivers no value) and cannot reach "autonomous" on the dial for years.

**The deepest claim:** a clone produces a system that can *draft* plausible recommendations (any frontier LLM can) but cannot *rank* them by expected uplift, cannot give honest CIs, and cannot tell you which intervention will work for YOUR entity/surface/context — it's a horoscope. In a market where acting on a wrong recommendation costs the customer real engineering money (content, schema, PRs), the calibrated predictor is the entire product; the screenshot looks identical but is empty of the one capability the buyer is paying for.

---

## 14. Open questions (named, not hidden — tracked research items, not MVP blockers)

1. The intervention feature space is hand-engineered and only partly learned; if its representation is wrong, the causal model learns the wrong thing everywhere at once.
2. Period-validity of counterfactuals under mid-window platform bumps (Bing reindex, ChatGPT retrain) has no clean statistical fix; quarantining period-invalid rows is honest but lossy.
3. Federated transfer across heterogeneous tenants (dentist vs B2B SaaS vs DTC) is empirically unproven; pooling violates positivity/overlap for many cells.
4. The panel is selection-biased (panel users are not the brand's customers) — threatens external validity.
5. The AI-referral attribution pixel is itself a confounder-injector (answer engines strip referrers) — is reliable revenue-tied attribution attainable, or must mention-rate remain the tractable north star?
6. The formalization ceiling: how wide can the wedge go before the ontology/KG-maintenance treadmill returns?
7. The agent deliberation layer over long subgraphs risks lost-in-the-middle / mid-context degradation.
8. The autonomy dial rewards calculated confidence and may keep executing a wrong-but-confident intervention; residual-only CIs miss systematic bias.
9. Brand-Truth primary-source reversal: at what brand-count threshold do AI surfaces integrate Engenox as a verified authority — 2-year or 7-year milestone?
10. Loop latency: measurement windows need weeks to observe lift, yet the SMB wedge competes on snappiness — how to keep "1-click PR → measurable outcome" feeling responsive?

These are frontier risks, surfaced honestly because the moat relies on the corpus being *causal* — and causal identification on AI surfaces is genuinely hard. The honesty discipline (the integrity tags, the cold-start guardrails, the probe-plan-not-guess behavior, the warm-canary fallback) is how the architecture *acknowledges* these risks rather than papering over them.

---

*End of system intelligence. Next: `06_DOMAIN_MODEL.md` — the typed domain model (entities, facts, conflicts, interventions, outcomes, the ontology) that the bi-temporal KG enforces.*
