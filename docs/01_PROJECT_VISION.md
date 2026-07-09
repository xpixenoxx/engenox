# 01 — Project Vision

> **Status: FROZEN.** Authored against `00_FOUNDATION_INTELLIGENCE_CORE.md` and `00_FOUNDATION_FINAL.md`. This document defines the company's identity, mission, the name decision, the single MVP ICP, the moat thesis, and the engineering-first operating principles that every subsequent document inherits.

---

## 1. The mission (one sentence, non-negotiable)

**Engenox is the control plane for a business's presence across every system that discovers, recommends, and answers about it — Google, Bing, ChatGPT, Claude, Gemini, Perplexity, Grok, voice assistants, enterprise AI, and the AI discovery systems that do not exist yet.**

We are not an SEO tool. Not a GEO/AEO dashboard. Not a keyword tracker. Not a reporting platform. We are the **operating system** for how a brand is *seen* by machines — the layer a business operates when it wants to authoritatively influence what AI systems say about it, and *prove* that the influence worked.

The strategic end-state — the 5-to-7-year north star — is the **Brand-Truth primary-source position**: the day AI surfaces read *from* Engenox as the verified source of truth about a brand, reversing today's scraper dependency where brands are hostage to whatever AI surfaces happened to crawl. That reversal is a two-sided network effect (enough brands → enough incentive for surfaces to integrate) and it is the deepest moat. It is explicitly *not* the MVP promise.

---

## 2. The name decision — Engenox, evaluated honestly

The founder asked: *evaluate "Engenox"; if it is not world-class, explain why and suggest alternatives.* Honest verdict:

**"Engenox" is not a category-defining name. It is a defensible-but-generic B2BaaS name.** Specifically:

- **Phonetic signature reads industrial/pharma, not category-native.** "Engenox" lands in the ear as a chemicals or generics-pharmaceuticals brand (cf. *Genentech*, *Enoxaparin*). The "-ox" suffix evokes "box / ox / monotony" — heavy, plodding, old-company. It does not signal speed, intelligence, or visibility.
- **It owns no category word.** "Proficient" (Profound), "Sonar" (Semrush-adjacent), "Ahrefs" — none own the category either, but the funded unicorn (Profound) at least gestures at depth/profundity. "Engenox" gestures at *engine* + *nox* (night?) — ambiguous, not claimed, not ownable as a category synonym.
- **It has no obvious URL / SEO affordance for the wedge query.** Buyers searching "AI visibility" or "GEO tool" or "how do I show up in ChatGPT" find nothing in "Engenox" that maps to their intent. A wedge-era name that contains or evokes the wedge verb helps organic discovery at exactly the moment we have no ad budget.
- **It is reversible now, irreversible after launch.** Pre-launch, the rename cost is a domain swap + a tagline. Post-launch, it is re-registering every integration, re-pointing every backlink, re-training every customer's muscle memory, and (if we have shipped the autonomy dial) breaking the trust association. The cost of changing it now is near-zero; the cost of changing it later is existential.

**Recommendation: adopt a category-native, wedge-verb-carrying name for launch; keep "Pixenox Solutions" as the agency/legal entity and "Engenox" available as a fallback only if the recommended name is unavailable.** The product name and the agency name need not match.

### Name alternatives evaluated (scored against four criteria: category-claim, wedge-verb affinity, distinctiveness, defensibility/trademark)

| Candidate | Category claim | Wedge-verb affinity | Distinctiveness | Notes |
|---|---|---|---|---|
| **Lumina** | medium (visibility/light) | low | low (crowded) | Pretty, overused. Rejected. |
| **Citera** | high (to *cite* — what we make AI surfaces do) | high | high | "We make AI cite you." Strong, ownable, category-verb-native. **Top candidate.** ⚠️-verify trademark/domain. |
| **Answerable** | high (the *answer* is where the brand lives) | medium | high | Slightly literal; risk of "answerable-to" double meaning. |
| **Visible** | high (the category noun) | high | very low (commodity word) | Cannot own. Rejected. |
| **Surfaced** | high (brand gets *surfaced* by AI) | high | medium | Past-tense verb is awkward as a noun. |
| **Promptra / Promptiv** | low-medium (we are NOT about prompts) | medium | high | Misframes us as a prompt tool. Rejected. |
| **Atlas** | medium (cartography of AI surfaces) | low | medium | Already the internal MVP codename; conflicts. Reserve as code name only. |
| **Candor** | low (honesty), but high on the *honest-attribution* sub-brand | low | high | Strong for the *report* line, not the company. Use as a product/feature name (the "Candor Report"). |
| **Verit** / **Veriton** | high (truth — the Brand-Truth spine) | low | high | Good but clinical; "Veritone" exists and is public (AI company). Confusable. Rejected. |
| **Engenox** (current) | low | low | medium | Defensible but generic; see critique above. |

**Recommended product name: Citera.**
*Rationale:* it is derived from *cite* — the exact verb of the wedge ("make AI cite you / show up in AI answers"). It is coined, ownable as a trademark, ≤3 syllables, no negative connotation in major markets, URL-plausible (citera.io / citera.ai), and it *is* the category verb in latent form. It signals intelligence + visibility + attribution without being a commodity word. It survives translation. And it pairs cleanly with the agency entity (Pixenox Solutions) without forcing a rename of the legal entity.

**Fallback if Citera trademark/domain is unavailable:** Answerable (with the "honest attribution" sub-brand "Candor Report" carrying the truth-differentiator).

**Reserved sub-brand names** (product features, not the company): *Candor Report* (the lift report with CIs + coverage diagnostic + degradation alerts — the honesty differentiator), *Atlas Probe* (the multi-sample AI-surface probe), *Brand Card* (the editable Brand-Truth source-of-truth entity card).

**For the rest of this document set, the product is referred to as "Engenox"** (the founder's working name) to avoid confusion mid-design; the rename to Citera is an explicit pre-launch action item in `27_FUTURE_ROADMAP.md` and the Engineering Readiness Report. The architecture is name-agnostic.

---

## 3. The single MVP ICP — locked

The Product & Design and Founder critiques forced one decision: **the MVP serves ONE ICP, not two.**

### Locked MVP ICP: the AI-era technical-brand founder

- **Who:** a founder, Head of Growth, or Head of SEO at a technical B2B brand — SaaS, dev tools, AI startups, DTC brands with an engineering team — 5–200 employees, $1M–$50M ARR, English-speaking markets first.
- **Their painful problem (the wedge verb):** "I have no idea what ChatGPT / Perplexity / Gemini say about us, and the one time I checked they got it wrong or omitted us — and I have no lever to fix it. My competitors show up; I don't."
- **Why they pay us:** we make the brand show up in AI answers *and prove it* — multi-sample probe across surfaces, the editable Brand Card that drives a validated schema.org JSON-LD + content-brief 1-click PR into their repo, the AI-referral pixel for honest attribution, and the monthly Candor Report with reported variance + degradation alerts. They pay $129–$399/mo. They are technical enough to merge a PR and to read a confidence interval.
- **Why NOT two ICPs at MVP:** the small agency (5–15 clients, $599/mo Growth tier) is a *different* job-to-be-done (per-client dashboards, bulk-edit, white-label reporting, account-manager workflow). Serving both at launch guarantees serving both badly. The agency is **Phase-2** (Growth/Agency tier) with explicit multi-client workspace features, not a launch segment.

### The ICP the MVP deliberately does NOT serve (Phase-2+)
- Small digital agencies (5–15 clients) → Growth/Agency tier, post-traction.
- Enterprise & regulated brands (data-residency, SSO, dedicated cells) → Enterprise tier, post-SOC2 + cell graduation.
- Non-technical local SMBs (dentists, plumbers) → not a target; their causal-transfer viability is unproven (see AI/ML critique #3) and their willingness to merge a PR is near-zero.

---

## 4. The moat thesis (what a clone cannot copy)

The founder's most important question: *if a competitor copied every screen, every API, every feature, every workflow, what would they still be unable to copy?* The answer, hardened across the recovered synthesis and 8 critiques, is **six time-and-consent-accumulated assets, not features**:

1. **The Causal Intervention-Outcome (CIO) Corpus** — path-dependent. You cannot seed it by scraping (you don't control the customer-side repo merges or the aligned measurement windows); it is only causal if you hold the counterfactual, which needs a donor pool of comparable consenting tenants at scale. A clone's counterfactuals are wide nonsense until it has hundreds of aligned tenants, accumulated only over years.
2. **The Consented Human-Query Panel** — real humans querying ChatGPT/Perplexity/Gemini whose verbatim answers we measure with known demographics. A recruitment, trust, and privacy-engineering asset a clone cannot reconstruct from search APIs.
3. **The Brand-Truth primary-source position** — a two-sided network: AI surfaces read Engenox as the source of truth once Engenox is the de-facto SOT for enough brands that surfaces have incentive to integrate. A clone arrives with zero brands and therefore zero incentive for any surface to integrate.
4. **The aligned coordinate system** — the KG schema + the intervention feature space — itself a standardization asset; it is what makes the federated gradients meaningful, so a clone cannot even pool across its (nonexistent) tenants.
5. **The calibrated core** — a competitor who steals the rules, ontology, and schema inherits *uncalibrated* heuristics; the rules without the corpus are just guesses, and the differential value IS the calibration, which only the loop produces.
6. **Autonomy trust** — customers let Engenox open PRs in their repos because calibrated confidence has been demonstrated over time; a clone with no calibration history is either overconfident (causes damage) or overcautious (delivers no value) and cannot reach "autonomous" on the dial for years.

**The deepest claim:** a clone produces a system that can *draft* plausible recommendations (any frontier LLM can) but cannot *rank* them by expected uplift, cannot give honest confidence intervals, and cannot tell you which intervention will work for *your* entity/surface/context — it's a horoscope. In a market where acting on a wrong recommendation costs the customer real engineering money (content, schema, PRs), the calibrated predictor is the entire product; the screenshot looks identical but is empty of the one capability the buyer is paying for.

### The competitive defense against the funded unicorn (Profound, $1B Series C, Feb 2026)

Profound has *measurement + content + autonomous marketing agents funded* and will copy surface features fast. Our defensiveness is **repo-native vs pixel-native**:

- Profound is **pixel-native** — it deploys its own ad/marketing pixels, operates in the customer's marketing stack, and owns measurement-and-content as a marketing-ops product. Its locus of action is the customer's *marketing channels*.
- Engenox is **repo-native** — it ships pull requests into the customer's *engineering* stack (Git/CMS), fixes the structural reason the brand is invisible to AI surfaces (schema.org JSON-LD, content briefs, entity markup), and proves the lift with honest before/after measurement and *reported variance*.

This is not a marketing-ops tool. It is an engineering-shipped, trust-first visibility product aimed at founders who can merge a PR and respect a confidence interval. That audience and that locus-of-action are the open seam the funded incumbent's GTM does not naturally reach.

---

## 5. "Operating System" — internal north star, external wedge

The Founder critique #5 is binding: **the "AI Visibility Operating System" framing is strategically right and commercially premature.** Buyers do not know they need an OS; an SMB buyer wants a wedge, not a platform decision.

- **External message (MVP and through Growth tier):** "Make your brand show up in AI search — and prove it works." The wedge verb. No "OS" in the marketing site, the onboarding, or the sales deck until ecosystem traction exists.
- **Internal north star (engineering + investor narrative):** the OS — a control plane with an extension model (agent SDK, plugin marketplace, the published AI Visibility Index standard) that earns the "OS" framing as the wedge compounds and the corpus accrues. The Brand-Truth primary-source reversal is the 5–7-year moat the OS framing ultimately delivers.

The OS is what we *build*. The wedge is what we *sell*. Never invert this in customer-facing language until the ecosystem earns the word.

---

## 6. Engineering-first operating principles (inherited by every document 02–27)

These are the non-negotiable engineering values the founding team operates under. They resolve disputes.

1. **Two spines, never one.** The bi-temporal typed KG owns truth commitments; the counterfactual uplift estimator on the integrity-tagged corpus owns action commitments. The LLM owns neither — it may *propose*, never *commit*. An LLM touches state only through six bounded, schema-constrained seams (Extract, Draft, Adjudicate, Embed, Abduce, Critique).
2. **Honesty is structural, not decorative.** Every lift number ships with its calibrated confidence interval and a coverage diagnostic. "CI straddles zero OR overlap-support is below threshold" is a productized behavior: the system returns a *probe plan*, not a guess. We never overclaim; the honest-CI is the product's saleable property and the trust floor for autonomy.
3. **Durable execution is the loop.** Temporal owns the `perceive → decide → act → measure → tag-and-append → refresh-models` saga. No workflow state lives in an agent framework or a cache. Every external-side-effect activity is idempotent (typed key + integration test) or it does not ship.
4. **Actions execute in the customer's infra, never ours.** We open PRs into the customer's Git/CMS; the customer merges. We do not deploy to their site. Blast-radius is computed symbolically and gated; rollback is `git revert`, deliberately not a proprietary mechanism. The autonomy dial escalates only on *demonstrated* calibration + approval rate + overlap support, and demotes automatically on degradation alerts.
5. **Tenant isolation is a typed invariant, not a hope.** RLS-by-tenant enforced in-transaction; per-tenant crypto keys with HSM-backed KEK; no SUPERUSER in the app pool ever; every table introspected by CI for a policy. A cross-tenant leak is the single fault that collapses the trust moat, so it is treated as the highest-severity class of bug.
6. **The corpus is the asset; guard it.** WORM-replicated, signed, integrity-tagged, retention-principled. Every module's KPI is its marginal contribution to *high-confidence causal pairs added per period* — preventing the search-team-recall-vs-LLM-team-BLEU pathology where local optima split the loop.
7. **Cost is a first-class architectural input.** Free-egress object storage, pay-per-use for the long tail, self-hostable for the whale tier with cost-control gating on the LLM gateway. The long tail's unit economics must be positive unaided; the whale tier funds itself via dedicated cells.
8. **One cloud, edge partner, portable by construction.** GCP primary + Cloudflare edge; OpenTofu + containers preserve portability. Multi-region cells for data-residency, not multi-cloud for abstraction's sake.
9. **Buy time, not comfort.** The phase-gated validation (problem calls → refundable deposits → concierge pilots → build) runs *in parallel with the corpus clock*: concierge pilots are manual interventions whose (intervention, context, outcome) tuples still seed the corpus. Validation and moat-accrual are not in tension — they are the same activity.
10. **Build nothing unrequired.** Every milestone is independently deployable and increases customer value. The 20-module OS architecture is *deferred* — the wedge ships first, and each OS module is added only when its wedge productizes.

---

## 7. What "done" looks like at each horizon

- **Horizon 1 (MVP, 0–6 months):** the Atlas wedge end-to-end. A technical-brand founder signs up, runs the 5-field onboarding, gets a 90-second preliminary probe result, edits the Brand Card, receives a validated schema.org JSON-LD + content-brief 1-click PR, merges it, the multi-sample monthly probe completes, the AI-referral pixel runs, the Candor Report lands with CIs + degradation alerts. The closed loop accrues the first corpus rows. *Ship the loop, not the audit.*
- **Horizon 2 (Growth + Agency, 6–18 months):** multi-client workspaces, the autonomy dial at `execute-with-approval` for tenants that have earned it, the causal estimator exposed as customer-facing lift numbers (gated by the AI-Intelligence readiness closures), the published AI Visibility Index as demand-gen, the cell abstraction for data-residency, SOC 2 Type II.
- **Horizon 3 (Platform/OS, 18–60 months):** the agent SDK and plugin marketplace, federated learning across tenants at scale, the Brand-Truth primary-source reversal begins (first AI surface integrates Engenox as a verified authority), the "AI Visibility Operating System" frame becomes externally defensible. The OS framing the founder envisioned is now *earned*, not asserted.

---

## 8. What this vision explicitly rejects

- **Another SEO audit / keyword tracker / "your score is 67" dashboard.** The market is saturated; the funded incumbents own this.
- **An LLM-agent-first architecture.** The two-spine discipline is the architecture; an LLM agent as the spine is the popular 2026 reflex and is wrong here (it is un-auditable, un-calibratable, and re-introduces exactly the hallucination/commitment problem the symbolic + causal spines were built to eliminate).
- **Autonomous deployment into the customer's site.** We open PRs; the customer merges. Autonomy is *earned* on the dial and demotes automatically — it is never "set and trust."
- **Multi-cloud from day one.** One cloud + edge; multi-region cells for residency, not multi-cloud for comfort.
- **Building the full 20-module OS before the wedge proves willingness-to-pay.** The OS is earned through the wedge; the architecture accommodates the OS, the roadmap *delivers* the wedge first.

---

*End of vision. Next: `02_PRODUCT_STRATEGY.md` — the commercial strategy, pricing, GTM motion, the phase-gated validation gates, and the competitive positioning that operationalizes this vision.*
