# 27 — Future Roadmap

> **Status: FROZEN.** The Phase-2 + Horizon expansions forward of the MVP (`26`): the **deferred items** (P2.1–P2.4 + the Horizon-2/3 expansions), each with its trigger + the readiness-closure prerequisite + the Phase; the **readiness-closure-gated unlocks**; the **graduation runbooks** at scale; the **open research questions** carried from the intelligence core (`05` §14), each tracked to closure; and the **pre-launch action items** (the Citera rename decision; the open ⚠️-verify technology gates). Authored against `00_FOUNDATION_FINAL.md` (the readiness gates + sync sequencing), `26_MVP_SCOPE.md` (the deferred list), `25_IMPLEMENTATION_PLAN.md`, `05_SYSTEM_INTELLIGENCE.md` (the open questions), and `01_PROJECT_VISION.md` (the 3 horizons). **The roadmap is the memory of the deferred — and the discipline that the unlocks are measured, not vouched.**

---

## 1. The single rule

**Every deferred item is documented with its trigger + its closure-prerequisite + its Phase; nothing is "we'll get to it" — it's "we'll get to it when X" with X a measurable gate.** The founders' instruction ("build a product that could realistically become a category-defining company") is the long-game framing — the MVP is the wedge (`01`); the OS category is the horizon-3 claim that's *earned* by the corpus + the calibrated core + the autonomy trust, not *asserted* by marketing. This roadmap is the operational form of the long game: it tells you what to build next, what gates must close first, what to research, and what to honestly defer.

This section defines Phase-2, the Horizons, the open research questions, the graduations at scale, and the pre-launch action items.

---

## 2. Phase-2 — the post-MVP expansions (`P2.1`–`P2.4`)

### **P2.1 — The Growth tier + the dial-escalation unlock**
- **Trigger:** the AI-Intelligence readiness closure's *production half* passes — the conformal-coverage-by-segment metric clears the nominal rate on the real (production) trajectory data, the warm-canary divergence is stable under threshold, the human-approval-rate is measured on real customers (not stage).
- **Closure-prerequisite:** the AI-Intelligence closure; the per-tenant three-axis ledger has cycles-on-real-data; the cost-flip threshold model is documented from production (the GPU-owned-metal-vs-per-token-API flip).
- **Delivers:** the Growth tier's onboarding + the per-tenant cost-flip threshold confirmed + the dial-escalation beyond `propose` for tenants whose three axes clear — `execute-with-approval` (the human Signal-gated auto-PR-open-and-assign, 12 §6) → `guarded` (the auto-merge within blast-radius cap with pre-staged rollback-hash) → `autonomous` (the batched auto-merge, opt-in + visible).
- **Risk:** this is the first time a tenant's site changes without a human in the merge path (the `guarded` dial). The action's blast radius is bounded by the allow-list-glob + the bands + the demote-on-alert; the candor differentiator is the "auto-rolled back to Co-pilot after 2 alerts" notification. **P2.1 is the trust's first real test**; a single irreversibly-bad auto-merge is the worst possible incident.

### **P2.2 — The Agency tier + the white-label**
- **Trigger:** the MVP cohort includes the first agency prospects (the Phase-2 ICP per `01`); the design-system's `theme.ts` mechanism is built (`20` §5); the summarized-CI rendering (the CI never omitted) is a tested pattern.
- **Closure-prerequisite:** the candor-preservation floor (the honesty-floor elements are theme-unoverridable by construction, `20` §5 — the agency cannot theme-out the CI or theme-in a vanity score).
- **Delivers:** the agency's multi-tenant-of-clients model (an agency owns N end-clients; the per-agency central billing; the per-end-client dashboard with the agency's theme); the summarized-CI for the end-client report; the agency's white-label domain.
- **Risk:** the commercial-terrifying bit (Product critique #2 — the CI summarized for the end-client). The honesty floor holds by construction; the summarized-CI is *density-tuned*, never omitted.

### **P2.3 — The Enterprise tier + the dedicated cell + SSO**
- **Trigger:** the enterprise prospect cohort; the cell-pair DR rehearsal (`M8`) is in steady-state quarterly executions.
- **Closure-prerequisite:** the cell-pair DR (a second region hot-standby per cohort, `16` §6) + the SSO + the enterprise RTO mapping (the SOC 2 / ISO 27001 audits).
- **Delivers:** the dedicated cell (the whale cell, Tier C, `11` §5 — owned-metal sglang or a hosted-open-model cell); the SSO (SAML/OIDC for the enterprise IdP); the enterprise contracts' RTO/RPO mapping; the SOC 2 Type II audit complete; the EU-region cell stood up for the regulated-tier enterprise.
- **Risk:** the GPU buy (the whale cell's owned metal is the unit-economics commitment, `16` §5 — the cost-flip threshold must be confirmed *before* the procurement); the EU-cell's KEK under EU KMS + the no-egress routing (15 §8) verified.

### **P2.4 — The federated-training substrate + the AI-Intelligence readiness closure-final**
- **Trigger:** the corpus has enough rows (per (`intervention_type × surface × context_signature`) segment) to support the lift predictor's training (the standardization asset's *first* training, not just inference).
- **Closure-prerequisite:** the federated-learning substrate designed (the PRM + the lift predictor + the conformal calibrator + the surface-dynamics models; the FedAvg/FedProx weekly refit; the DP-SGD noise; the TEE secure aggregation for the privacy-tier cell + the non-TEE path for the long-tail cell, `11` §5 + `13`); the consent ledger's opted-in-pooling coverage per segment; the AI-Intelligence readiness closure's *trained-models* half.
- **Delivers:** the federated training of the PRM + lift predictor + conformal calibrator + surface-dynamics models (the closed loop transitions from "ship-the-loop" to "the calibrated core"); the closed loop's first *learned* upgrade (the lift predictor trained on the pooled aggregates, never on a tenant's raw rows — the standardization boundary, `13` §7); the AI-Intelligence readiness closure lifts to its *production* final.
- **Risk:** the federated training's correctness (the secure aggregation, the DP noise, the privacy-tier's TEE path) is genuinely research-grade; the AI-Research-Scientist role's hill. The first trained model is gated behind the closure; an immature trained model does NOT replace the symbolic estimator's floor (the symbolic stays as the warm-canary path + the fallback, `11` §6).

---

## 3. The Horizons (the long-game north stars, `01`)

### **Horizon 1 — the wedge (closed-loop MVP → the calibration matures)** (`26` + P2.1)
- The closed-loop MVP ships (`M9`); the first self-serve Starter customers; the corpus accumulates; the calibration matures behind the candor microcopy. The product is the wedge: "make your brand show up in AI search + prove it works." **The strategic clock is the corpus-time-to-coverage** (`02` — the time-to-a-honest-estimate on a new tenant's segment, the asset that compounds with the corpus).

### **Horizon 2 — the calibrated core + the consented representative panel + the OS surface emerges**
- The AI-Intelligence closure's production half + the federated training (P2.4); the **representative consented panel** (the AI-Intelligence closure 4 — the statistically-representative sampling frame, `13` §6 the build sequence); the model-card per seam + the quarterly refresh. The product's external message starts to mention the OS framing ("the OS for your AI presence" — earned by the calibrated core, the corpus, the consented panel). **The corpus-asset's defensibility widens** — a competitor cannot copy the years of signed outcomes + the contractual panel relationship (`05` §6 the 6 moats).
- **The agency tier's full white-label** (P2.2 has shipped by now; Horizon 2 deepens it — the agency market widens to the white-label end-clients).
- **The "honesty as a category" claim** — the candor-differentiator is the commercial positioning (the CI never omitted; the contrarian block; the Provenance Audit Hover). The overconfident competitors cannot match without rebuilding their honesty floor.

### **Horizon 3 — the AI Visibility Operating System (the category claim) + the Ecosystem**
- **The OS surface** — the closed loop generalizes to a category: any surface (a new AI search engine, a voice assistant, an enterprise-AI RAG, a future agentic-UI discovery system) slots into the cell's Perception fleet; the corpus standardizes across them; the calibrated core reasons over them; the autonomy dial gates the action per surface. The external message catches up to the north star (`01` — "the world's first AI Visibility Operating System").
- **The Ecosystem plugins + the connector marketplace** (the earlier deferrals): a plugin framework (capability-scoped, network-sandboxed, tenant-approved, `15` §7); the connector marketplace (third-party connectors register against a typed contract); the third-party Specialist seams (a content-brief writer, a `schema.org` validator, a redirect-map builder — each verifier-grounded, each committing nothing).
- **The Profound-class integration-or-compete decision** (per `03` the competitor research — Profound's $1B-valuation pixel-native measurement; the Engenox OS includes measurement but the wedge is the closed loop, not the measurement dashboard). Horizon 3 evaluates partnerships or the feature-organic growth.

---

## 4. The graduation runbooks at scale (the Phase-2 graduations, per `08` §7 + `16` §8)

These are the *scheduled* graduations (never improvised) triggered by the cohort growth:

| Graduation | Trigger | Phase | The closure-prereq |
|---|---|---|---|
| **PG → Citus** | ~300 tenants / ~800GB | Phase-2 (the Growth cohort) | The duel-write window + the nightly three-sinks reconciliation passes |
| **pgvector → Qdrant/Turbopuffer** | ~10M vectors OR HNSW build >30% write path | Phase-2 | The index rebuild + the read-shadowing validate |
| **AGE → AGE+FalkorDB** | ~1M assertion nodes OR p99 multi-hop >200ms | Phase-2 | The CDC backfill + the analytical-read shadow |
| **Redpanda → Warpstream-on-GCS** | bus storage > ~5 TB/day | P2.3+ | The topic-mirror + the consumer config-switch |
| **self-hosted Temporal → Temporal Cloud** | ~500 tenants OR the SRE closure | P2.x | The history migration + the duel-write |
| **single cell → cell-pair DR** | enterprise contracts w/ RTO requirement | P2.3 | The hot-standby cell + the continuous replication + the quarterly cutover rehearsal |
| **per-token API → owned-metal sglang** | per-tenant cost-flip threshold crossed | P2.3 (the whale cell) | The cost-flip threshold model + the dedicated cell provisioning |
| **the consented panel → the representative frame** | the AI-Intelligence closure 4 | Horizon 2 | The statistically-representative sampling frame + the documented frame-validation |
| **the federated substrate → the trained models** | the AI-Intelligence closure-final | P2.4 | The corpus-N + the consent ledger's pooling coverage + the secure aggregation in TEEs |

The discipline carries from `16` §8: **only one graduation runs at a time per cohort; each is rehearsed; the duel-write window is the safety net.**

---

## 5. The open research questions (carried from the intelligence core, `05` §14)

These are the architecture's acknowledged open questions, each carried with a path-to-closure:

### (a) The causal estimator's maturity to "category-defining" quality
- **Question:** synthetic-control + DML + causal forests + conformal calibration + the foreign-change partialling — is the closed loop's estimator genuinely category-defining, or is it "honestly better than the alternatives"?
- **The path to closure:** the AI-Intelligence readiness closure's production half (P2.1) + the federated training (P2.4) + the coverage-on-representative-segments metric. The model-card per seam (the quarterly refresh) is the steady-state evidence. **Closure: P2.4 + the model-card's quarterly coverage at/nominal across the segments.**

### (b) The "memorize the lesson, not the regret" cycle
- **Question:** does the regret row's inclusion in the corpus (the high-integrity counterexample, `12` §7) genuinely recalibrate the lift predictor, or does it over-fit to the regret anecdotes? The federated refit's the test.
- **The path to closure:** P2.4 + the supervised eval of the lift-predictor-with-vs-without-regret-inclusion on the held-out trajectories. **Closure: the regret-inclusion lifts the coverage without over-fitting (held-out evaluation).**

### (c) The consented panel's representativeness + selection bias
- **Question:** the consented panel's selection bias (the panelists who consent are different from those who don't — the founder-network's technical-brand founders are the MVP), and the panel's representativeness to the broader market.
- **The path to closure:** the AI-Intelligence closure 4 (Horizon 2) — the statistically-representative panel + the documented sampling frame + the validation against the scraped-surface baseline (the infra-grade surface polling). **Closure: the cross-validation of the consented panel against the scraped baseline agrees within tolerance.**

### (d) The LLM's role beyond the proposing layer
- **Question:** does the LLM stay a constrained proposing layer forever, or does the maturing corpus enable a higher-fidelity learned model that eventually does more than propose (the Abduce seam — the falsifiable hypotheses) — always under the verifier?
- **The path to closure:** a Horizon-3 research track; the answer is bound by the spine-invariant ("an LLM may PROPOSE; it may not COMMIT" `05` §0 — unchanged regardless of the LLM's role's expansion). The expansion is in *what* it proposes (more nuanced hypotheses, broader-scoped plans), not *whether* it commits.

### (e) The Profound-class integration-or-compete decision
- **Question:** does Engenox integrate with the measurement-dashboard leader (Profound — the $1B-valued pixel-native player), or compete by organic-build, or differentiate (the closed-loop wedge vs the measurement-dashboard)?
- **The path to closure:** Horizon-3's product-strategy decision; the corpus asset + the calibrated core + the closed loop's autonomy are the differentiators, while the pixel-native measurement is a *component* (the AI-referral pixel is in the MVP, F8) — the framing is "we integrate the measurement where it serves our closed loop, we compete where the closed loop is the moat." **Closure: a Horizon-3 product-strategy review tied to the OS-surface emergence.**

### (f) The recorder-of-record question
- **Question:** as the corpus accumulates signed outcomes, the corpus itself becomes the industry's *recorder of record* on "what AI surfaces say about brands" — the audit-trail-of-trust + the compliance artifact. Is this a Phase-2 product line (the corpus as a service — licensed to regulators, to platforms themselves, to the agencies' end-clients) or a Horizon-3 expansion?
- **The path to closure:** the corpus's dual-canonical (WORM) + the consent ledger + the per-tenant retention matured; the question is commercial, not technical. **Closure: a Horizon-3 commercial-licensing decision (the corpus-as-a-service for regulated buyers).**

---

## 6. The pre-launch action items (the explicit ⚠️-verify + the rename)

### The rename decision: **Citera** over Engenox (the pre-launch action item)
- **The decision (per `01` §2):** "Engenox" is not world-class (pharma-sounding, generic, no category claim, weak etymological hook — "engine" + a soft ending); **"Citera"** (cite-verb-derived, ownable, signals the citation/provenance thesis at the heart of the product) is the recommendation; "Answerable" is the secondary fallback (signals the closed loop's "did your brand show up — measured" thesis). The product is referred to as "Engenox" through the docs to avoid confusion; the rename is a pre-launch action — the domain + the trademarks + the marketing-site + the legal entity (Pixenox Solutions → the renamed entity, if the founder so chooses) before the public MVP launch.
- **The candor-thesis product naming:** the sub-brands ("Candor Report," "Atlas Probe," "Brand Card" — `01` §2) carry the thesis; the parent name (Citera) carries the provenance idea; the wedge ("make your brand show up in AI search + prove it works") carries the message.

### The ⚠️-verify technology gates (the confirmations needed from the Web-Search-cooldown period, per `_FOUNDATION_TECH.md`)
These were marked "⚠️-verify" because the web-search classifier was unavailable during the stack evaluation; none of them change the recommendations, but each is a deployment-phase verification (a one-search confirmation the morning of the relevant milestone):
- **Next.js 16** (the upgraded App Router features — the partial prerendering evolution; the decision of 15 vs 16 at the MVP). Verify at M6.
- **Bun's stability** for the runtime-mode comparison against Hono-on-Node/Bun; the bundler story. Verify at the TS-workspace setup.
- **AlloyDB's Apache AGE extension support** (`16` §3) — if not, the self-managed Postgres-on-GKE-with-Patroni for the AGE requirement; the AGE-backend-on-AlloyDB is the open question. Verify at M1.
- **Memorystore's Valkey support timeline** (`16` §3) — self-host Valkey if Memorystore is still Redis-7-OSS-compat only. Verify at M1.
- **FalkorDB's HA + cluster story** (the analytical-graph graduation). Verify before the AGE→FalkorDB trigger (`08` §7).
- **Turbopuffer's GA maturity** (the vector-graduation alternative to Qdrant). Verify before the pgvector→Qdrant/Turbopuffer trigger.
- **Warpstream's post-acquisition product roadmap** (Confluent-acquired; the cost-ceiling-on-S3 path). Verify before the bus-storage-graduation trigger.
- **Temporal Cloud GA + multi-region + the SLA** for the self-hosted→Temporal-Cloud graduation (P2.x). Verify at the ~500-tenant cohort.
- **Quickwit** as the ClickHouse-secondary-search alternative for the corpus's analytical mirror's text search. Verify at the corpus-search-feature milestone.
- **sglang's 2026 stability** for the privacy/whale self-hosting (P2.1+). Verify before the self-hosted-sglang decision.
- **Modal's 2026 isolation story for the privacy tier** (the GPU-overflow isolation for the regulated tier). Verify before the privacy-tier cell stands up.
- **The strongest 2026 open model for self-hosting** (a Llama-class / Qwen-class / etc. — ⚠️-verify the date-of-deployment frontier). Verify before the whale-cell provisioning (P2.3).
- **The strongest 2026 panel-sourcing vendor** for the consented representative panel (Horizon 2 — Prolific-class; ⚠️-verify Prolific's quality for AI-panel work specifically + the alternatives). Verify before the panel representative-cohort sourcing.
- **Biome's plugin-maturity** (the 2026 ESLint/Prettier-replacement choice). Verify at the TS-workspace setup; the fallback is ESLint + Prettier flat-config.
- **The Atlas vs sqitch choice** for the expand/contract migration engine (`17` §10) — the Atlas Postgres bi-temporal support question. Verify at M1.

### The readiness-closure gates before each Phase-2 unlock
(per `25` §4 + `26` §5 — the unlocks are measured, not vouched.)
- **P2.1 unlock:** AI-Intelligence-closure production half + the cost-flip-threshold-from-production + the per-tenant dial-ledger cycles-on-real-data.
- **P2.2 unlock:** the candor-preservation floor + the design-system's theme-swap mechanism + the first agency prospects.
- **P2.3 unlock:** the cell-pair DR steady-state + the enterprise-prospect cohort + the SOC 2 Type II.
- **P2.4 unlock:** the corpus-N-per-segment + the consent ledger's opted-in-pooling + the federated-substrate-designed + the AI-Intelligence-closure-trained-models evidence.
- **Horizon 3 unlock (the OS-surface + the Ecosystem):** the calibrated core's coverage + the representativeness of the consented panel + the corpus's recorder-of-record identity.

---

## 7. The directions-the-founders-might-not-take list (the explicit non-goals forward of the MVP)

- The product does **not** become a generic LLM-agent-tool-builder (the closed loop stays the spine; an LLM stays the proposing layer; no agent framework becomes the architecture, per `12` §2).
- The product does **not** enter the SEO-incumbent's category (the Ahrefs/Semrush-class keyword-tool space; the AI-visibility thesis is the wedge, not the SEO-tool category, per `03` the competitor research).
- The product does **not** commodify the corpus's recorder-of-record by selling raw access (the corpus is the moat; the licensed-recorder-of-record product is a Horizon-3 commercial decision, never a fire-sale).
- The product does **not** relax the candor differentiator for a competitor's overconfidence model (the CI is the differentiation floor; an overconfident alternative is rejected even under competitive pressure — Product critique #2 the commercial-terrifying bit).
- The product does **not** accelerate the autonomy dial for a whale tenant who hasn't earned it (the dial is per-tenant, earned on the three measured axes + opt-in + auto-demotion visible; no "because they're paying us" unlocks, per `12` §5).
- The product does **not** accept an LLM tiebreaker for a Planner/Critic deadlock (the deadlock escalates to a human; no LLM is the spine, `05` §0 + `12` §9).

---

## 8. The forecasts-with-confidence-intervals (the candor applied to the roadmap itself)

(Per the candor principle, the roadmap carries its own uncertainty — `04` §infra-cost-estimates + `02` §unit-economics are point estimates with assumptions; the roadmap acknowledges them.)

- **The corpus-time-to-coverage** is the strategic clock (`02`); the MVP estimate (the first honest CI on a new tenant's segment) is on the order of months, not weeks — the corpus needs to accumulate the comparable priors. The point estimate drops as the corpus grows; the candor: "we cannot honestly claim a coverage span shorter than the corpus's maturity supports."
- **The unit-economics** (the Starter ≥75% gross margin, `02` §7) is the hardest number; the cost gate (`11` §2d) is the enabler but the GPU/token costs are volatile; the candor: the margin is reachable with the per-tenant budget + the Spot probe fleet + the Warpstream-on-S3 storage + the R2 free egress — but the frontier-token-pricing is the volatile input. The quarterly model-refresh is the discipline.
- **The competitive clock** (the rate at which competitors close the gap) — Profound's $1B raise (the verification anchor, `03`) accelerates the "build measurement dashboard" competitor wave but **collapses that as a defensible wedge** (a well-funded competitor already owns it); Engenox's defensible wedge is the *closed loop* (the corpus + the calibrated core + the autonomy trust), which Profound's pixel-native measurement is structurally not. The candor: the competitive clock on the closed-loop moat is slower than the competitive clock on the measurement dashboard; the latter is not our wedge.
- **The federation / regulatory clock** — the EU AI Act + the platform-ToS shifts (OpenAI/Anthropic/Google's terms on scraping + on panel-sourced data) are the exogenous risks; the consented panel (the second moat) is the structural defense; the privacy-tier self-hosting (P2.3) is the regulatory-defense product. The candor: the regulatory clock is the one we cannot control; we control the consent + the isolation discipline.

---

## 9. The non-negotiable invariants (the roadmap layer)

1. **Every deferred item is documented with trigger + closure-prerequisite + Phase** — nothing is "we'll get to it."
2. **The Phase-2 unlocks are readiness-closure-gated** (P2.1 → AI-Intelligence production + cost-flip; P2.2 → candor floor + theme-swap; P2.3 → cell-pair DR + SOC 2; P2.4 → corpus-N + consent + the federated substrate); the unlocks are measured, not vouched.
3. **The Horizons are the long-game north stars** — Horizon 1 the wedge + the calibration-matures; Horizon 2 the calibrated core + the representative panel + the OS-surface emerges; Horizon 3 the OS category claim + the Ecosystem.
4. **The graduations at scale are scheduled with trigger + duel-write + cutover + rollback** (per `08` §7 + `16` §8); only one runs at a time per cohort; never improvised.
5. **The open research questions are carried with a path-to-closure** (the estimator's maturity, the regret-inclusion, the panel's representativeness, the LLM's role, the Profound decision, the recorder-of-record); none is "trust me."
6. **The pre-launch Citera rename is an action item**, not a debate; the ⚠️-verify technology gates are morning-of-the-milestone confirmations, none of which changes a recommendation.
7. **The candor applies to the roadmap itself** — the corpus-time-to-coverage, the unit-economics, the competitive clock, the regulatory clock each carry their uncertainty; the roadmap does not overpromise its own forecasts.
8. **The directions-not-taken are explicit** (no generic-agent-tool-builder; no SEO-incumbent category; no corpus fire-sale; no candor-relaxation-under-competitive-pressure; no dial-unlock-for-revenue; no LLM-tiebreaker); a future temptation to take one is a roadmap-violation, not a "pivot."

---

*End of the future roadmap — and the end of the 27-document blueprint. Next: `_ENGINEERING_READINESS_REPORT.md` — the standalone final report with the 7 readiness scores (Architecture / Scalability / Security / Maintainability / AI Intelligence / Competitive Moat / Production Readiness), the gate thresholds (≥9.5 on Architecture, Maintainability, Competitive Moat; ≥9.0 on Scalability, Security, AI Intelligence; Production Readiness ≥9.5 gated behind the SRE closure), and the demonstrated, not asserted, readiness closures.*
