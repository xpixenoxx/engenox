# 02 — Product Strategy

> **Status: FROZEN.** Operationalizes the vision in `01_PROJECT_VISION.md`. Covers commercial model, pricing/GTM, the phase-gated validation that proves willingness-to-pay *before* hard code, the "ship-the-loop" MVP scope discipline, corpus-clock parallelism, competitive positioning, and unit-economics targets.

---

## 1. Strategic thesis (one paragraph)

We win by being the **engineering-native, trust-first AI-visibility product** in a market where the funded incumbent (Profound, $1B Series C, Feb 2026) has chosen to be the *marketing-native measurement+content* leader. We do not out-fund-raise them and we do not out-feature-audit them. We out-wedge them — *make your brand show up in AI search and prove it* — by shipping a validated 1-click pull request into the customer's own repo (not deploying another ad pixel), and by proving the lift with calibrated confidence intervals and reported variance rather than vanity scores. The wedge earns the right to build the operating system; the closed loop accrues the corpus that is the moat. Validation and corpus-accrual run in parallel (concierge pilots seed the corpus) so the founder's discipline of proving willingness-to-pay never starves the time-accumulated moat.

---

## 2. The wedge, restated sharply

**"Make your brand show up in AI search — and prove it works."**

Three load-bearing words:
- **"Make"** — we are an action product, not a report product. We ship a PR.
- **"Show up"** — the wedge verb (cite / surface / mention). The buyer's visceral pain is omission.
- **"Prove it"** — the Candor Report with CIs + degradation alerts. Honesty as the differentiator against horoscope competitors.

Everything else in the 27-doc architecture is in service of this wedge or deferred to a later horizon.

---

## 3. Pricing & packaging

| Tier | Price/mo | Seat | Target | What's included | Deliberately excluded |
|---|---|---|---|---|---|
| **Starter** | $129 | 1 brand, 1 user | technical-brand founder (MVP ICP) | Multi-sample monthly probe across ChatGPT/Perplexity/Gemini; editable Brand Card; validated schema.org JSON-LD + content-brief **1-click PR**; AI-referral pixel; monthly Candor Report (CIs + degradation alerts); 3 tracked competitors | Multi-user, white-label, enterprise SSO, autonomous dial above `propose`, the published Index |
| **Growth** | $399 | 3 brands, 5 users | technical brand scaling | Everything in Starter + autonomous dial (earnable to `execute-with-approval`), 10 competitors, Slack/email alerts, API access (read + webhook) | Multi-client workspaces (agency), white-label, SSO/SAML |
| **Agency** | $599 | 10 client brands, 10 users | small agency (5–15 clients) | Everything in Growth + multi-client workspaces, white-label client reports, account-manager workflow, bulk Brand Card edit. **Phase-2 launch.** | Enterprise SSO / data-residency / dedicated cell |
| **Enterprise** | custom | dedicated cell | regulated/whale brand | Everything + SSO/SAML/SCIM, regional data-residency cell, SOC2, self-hosted inference option, audited autonomy, dedicated CSM. **Phase-2+ launch.** | — |
| **Concierge pilot** | $299–$999 one-time (often credited toward subscription) | 1 brand, founder-led | pre-product validation + warm-start | We operate the loop *by hand* for the customer: manual probes, manual Brand Card, manual schema PR (in their repo with their review), manual lift report. Produces real (intervention, context, outcome) tuples that seed the corpus. | Anything automated — the point is to prove willingness-to-pay and accrue corpus before building automation. |

### Pricing rationale (honest, not aspirational)
- **Starter at $129** is below the "I have to ask my finance team" threshold for a technical founder (their monthly SaaS overflow tolerance is ~$200 without approval), high enough to filter tire-kickers, and explicitly *not* free — the phase-gated validation requires refundable deposits, not free trials, because free signals nothing about willingness-to-pay.
- **Growth at $399** captures the brand that has validated AI visibility matters and now wants the autonomy-dial earnable path + API access — the natural second seat.
- **Agency at $599** is positioned to capture the dollar-spread of a small agency (5–15 × clients × per-client value) without per-client line-item pain. It is a *Phase-2* launch because the multi-client workspace features do not exist at MVP and the Product critique was explicit that serving two ICPs at launch guarantees serving both badly.
- **Concierge at $299–$999** is the *validation* product — sold before the automated MVP is complete (per the phase-gated gates below). The price is high enough to be a real purchase decision (the founder's discipline) and is typically credited toward the eventual subscription, so it is a "refundable deposit with deliverables" not a sunk cost.
- **Enterprise custom** is the future-proven pricing floor for regulated + whale tenants; not pursued until SOC 2 + the cell abstraction ship.

### Why not value-based pricing at MVP
Value-based pricing ("1% of the lift we generate") is the long-term target, but it is operationally impossible at MVP: (a) we cannot yet attribute revenue to AI-referral with confidence (the AI-referral attribution pixel is itself a confounder-injector per the AI/ML critique — answer engines strip referrers); (b) pricing on mention-rate lift before the causal estimator is calibrated would force us to claim a number we cannot honestly bound. So mention-rate lift is the *tractable north star* for MVP, revenue-tied attribution is the *research item* (Open Question #5), and pricing is subscription-flat until Horizon 2 when the calibrated estimator + revenue attribution justify value-based tiers.

---

## 4. Go-to-market motion (by tier)

### Starter: product-led, technical-founder-origin
- **Channel:** organic (the wedge-verb-naming helps: "AI visibility" / "show up in ChatGPT" content), developer-adjacent communities (HN, Indie Hackers, B2B founder Slack/Discord), a published "AI Visibility Index" as recurring demand-gen + thought-leadership moat, and the concierge→self-serve conversion path.
- **Activation moment:** surfaced-probe-results < 90 seconds (the fast-partial-probe). The first time a founder sees "here's what Gemini says about you vs your 3 competitors" is the conversion event.
- **Retention moment:** the first Candor Report that shows a real lift with an honest CI. This is the second hook — the proof — and it has to land in the first monthly cycle.
- **Expansion:** Starter → Growth when the brand wants the autonomy dial + API.

### Growth: sales-assisted PLG
- The PLG funnel produces warm Growth leads (brands hitting Starter limits, asking for API/multi-user). Light touch — a single revenue person, not a field sales motion.

### Agency: outbound + partnership
- Phase-2. Outbound to agencies already reselling SEO; partner with a few design-first agencies as design partners. Multi-client workspace is the deal-closer.

### Enterprise: founder-led, reference-driven
- Phase-2+. Founder-led sales to regulated/whale brands; reference accounts from the Growth tier; SOC 2 + the cell abstraction are table stakes.

### Concierge: the validation engine
- Run continuously from pre-product through MVP. Sold via the founder's network and warm inbound. Every concierge pilot produces (a) a willingness-to-pay signal (did they pay? did they renew?) and (b) real corpus tuples. **This is how validation and corpus-accrual run in parallel** — the founder's discipline does not starve the moat.

---

## 5. Phase-gated validation (Gates A–D) — prove willingness-to-pay before hard code

This is the founder's Phase-1 PRD discipline, hardened. The rule: **no milestone unlocks the next investment of engineering effort until its gate passes.** The corpus clock runs in parallel via concierge, so the gates gate *automation spend*, not corpus accrual.

| Gate | What we do | Signal that passes the gate | What unlocks |
|---|---|---|---|
| **A — Problem calls** | 20–30 structured discovery calls with the locked ICP (technical-brand founders). Asked: "walk me through the last time you checked what ChatGPT said about you; what did you do; what would you pay to fix it." | ≥70% confirm the pain unprompted and name a willingness-to-pay figure ≥ Starter price; we hear the wedge verb in their own words ("show up," "get cited," "mentioned"). | Permission to design the concierge pilot + ask for refundable deposits. |
| **B — Refundable deposits** | Ask Gate-A-warm leads to put down a refundable deposit ($100–$300) for the concierge pilot. | ≥10 paid deposits (not verbal interest — money moved). The deposit is the first *economic* willingness-to-pay signal. | Permission to run concierge pilots. |
| **C — Concierge pilots** | Run the loop manually for 5–10 deposit-paying customers: manual probes, manual Brand Card, manual schema PR (reviewed + merged by them), manual Candor Report. | ≥5 pilots complete the full loop (PR merged + measurement window observed); ≥3 convert to a paid subscription at the post-pilot price; <30% churn in the first 60 days post-pilot. | Permission to build the automated probe + Brand Card + PR pipeline (the MVP hard code). |
| **D — MVP live + first self-serve** | Build the automated MVP. Onboard the converted concierge customers + new self-serve signups. | 10 paying self-serve Starter customers within 90 days of launch; activation (90s probe) >60%; first-month retention >80%. | Permission to open the Growth tier + invest in the autonomy-dial earnable path + the causal estimator. |

### What the gates deliberately do NOT prove (and why that's OK)
- Gate A/B does not prove the *causal estimator* works — that's an AI-Intelligence readiness gate, not a willingness-to-pay gate, and it lands at Horizon 2.
- Gate C proves willingness-to-pay for the *human-operated* loop; the assumption that automated loop = willingness-to-pay is a D-gate risk, mitigated by pricing the automated tier at or below the concierge-equivalent.
- The corpus accrues through C regardless of D, so a D-gate failure does not waste the corpus investment.

---

## 6. "Ship the loop, not the audit" — the MVP scope discipline

The Founder critique #3 is binding: **the MVP MUST include the closed loop end-to-end (PR + measurement), even if the causal-estimator battery matures slowly behind it.**

- The audit-only MVP (probe + entity card + "here's your gaps" report) is rejected because it ships a feature-competitive product with *no moat accrual* — the corpus never grows, the product stays a dashboard, and the funded incumbents copy it.
- The ship-the-loop MVP ships the PR + measurement end-to-end so the first corpus rows accrue from day one. The causal estimator is allowed to be immature behind it (it returns wide CIs + "probe plan, not guess" for cold tenants) — but the loop *runs*.
- This is the single most important scope decision in the strategy: **the loop is the asset; ship the loop.**

---

## 7. Competitive positioning (condensed; full analysis in `03_COMPETITOR_RESEARCH.md`)

| Competitor | What they own | What they don't | Why we co-exist / win |
|---|---|---|---|
| **Profound** ($1B Series C, Feb 2026) | Measurement + content + "autonomous marketing agents"; funded; pixel-native (deploys in the marketing stack); design/polish | Honesty/CIs; repo-native action; aligned causal corpus across heterogeneous tenants; the trust-first autonomy dial | We are repo-native + honest-attribution; the open seam they don't naturally reach (engineering-shipped, trust-first). |
| **Ahrefs / Semrush** | SEO distribution; existing customer accounts; brand authority | Native AI-visibility; the closed loop; repo-native action | They bolt AI-visibility on as a feature; their wedge advantage is accounts, ours is action+proof. |
| **Airix / AEO Engine / RankPrompt / SEO Stack / Indexsy / LocalRank** (smaller AI-visibility startups) | Niche surface coverage; pointed features | Closed-loop causal measurement; brand-truth SOT; the corpus moat | They are feature-point solutions; we are the loop the features plug into. |
| **The AI surfaces themselves** (OpenAI, Google, etc.) | Their own ranking/answer algos; could surface a brand-authoring portal | The aligned causal corpus; the cross-surface measurement; the federated learning a portal won't have | A surface-launched portal is the deepest threat; our defense is the corpus + the calibrated learning + the multi-surface position a single-surface portal structurally cannot have. |

The competitive moat is not "we have more features." It is "our intelligence compounds in a way theirs cannot, because ours is built on consented closed-loop corpus + aligned coordinate system + trust-first autonomy — none of which a clone or an incumbent can purchase or backfill." See `00_FOUNDATION_INTELLIGENCE_CORE.md` §3.

---

## 8. Unit-economics targets (per tier, at steady state)

| Metric | Target | Why |
|---|---|---|
| **CAC payback** | < 6 months (Starter), < 4 months (Growth/Agency) | PLG-led; long-tail profitability requires fast payback |
| **Gross margin** | **≥ 75%** (Starter), ≥ 80% (Growth+), ≥ 85% (Agency/Enterprise) | LLM inference + probe spend is the COGS; the bounded-seams + cost-control gate is what makes this achievable. **⚠️ This is a stretch at Starter** — the dominant variable cost (LLM tokens + probe egress + the human panel) can eat 35–45% of Starter revenue if uncontrolled; see `16_INFRASTRUCTURE.md` for the 3-price-point model. |
| **Net revenue retention** | ≥ 110% (Starter→Growth expansion), ≥ 115% (Agency/Enterprise) | The autonomy-dial earnable path + the monthly proof loop drive expansion |
| **Logo churn** | < 5% monthly (Starter), < 2% (Growth+) | The Candor Report's "you can't Unsee the lift" is the retention hook |
| **Concierge→subscription conversion** | ≥ 50% | Gate C signal |
| **Corpus-pair growth rate** | ≥ 20% MoM (Horizon 1) | The *moat* health metric — high-confidence causal pairs added per period |

### The unit-economics risk the strategy must own
The Starter tier at $129/mo with ≥75% gross margin is **thehardestnumber in this strategy**. The AI-surface probe cost (LLM tokens + egress + panel) is real. The cost-control gate on the LLM gateway (per-tenant token budgets + the EVSI-allocated probe spend so cheap-and-informative queries win) + the fast-partial-probe (don't spend full-probe-tokens on first-touch) + the *monthly* (not daily) full-probe cadence are what make the number achievable. If empirically it's not, the answer is to raise Starter to $179 or compress the probe cadence — NOT to cut the loop. The loop is the asset.

---

## 9. The non-goals of the MVP strategy (what we will NOT do at Horizon 1)

- NOT build the full 20-module OS (deferred per Vision §8).
- NOT pursue the agency ICP at launch (Phase-2).
- NOT pursue enterprise at launch (Phase-2+, post-SOC2).
- NOT price on value-based / revenue-share (deferred to Horizon 2 when attribution is honest).
- NOT ship the autonomy dial above `propose` (the PR-for-you-to-merge level) until the AI-Intelligence readiness gates close.
- NOT claim revenue attribution in the Candor Report (mention-rate lift is the tractable north star; revenue attribution is Open Question #5).
- NOT market "AI Visibility Operating System" externally (Vision §5).
- NOT rename the product externally mid-cycle; the Citera rename is a single pre-launch action, not a rolling decision.

---

## 10. The strategic clock

The corpuses' time-to-coverage is the strategic clock, not ARR. The competitor cannot buy or backfill the corpus; they can only grow it tenant-by-tenant under consent over years. Every month the loop runs faster, on more tenants, with more closed-loop pairs, the moat widens irreversibly. This reframes every product priority as: **"does this accelerate the corpus clock?"** — and a great many seductive features (more surfaces, fancier dashboards, a free tier, a mobile app) fail that test and are correctly deferred.

---

*End of product strategy. Next: `03_COMPETITOR_RESEARCH.md` — the full competitor analysis (Profound's funded unicorn position, the SEO incumbents, the AI-visibility startup wave, and the AI surfaces themselves) with the precise seam each leaves open.*
