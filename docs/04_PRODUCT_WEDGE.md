# 04 — Product Wedge (Atlas MVP)

> **Status: FROZEN.** The concrete MVP wedge codenamed **Atlas**: the customer, the daily workflow, the painful problem, the why-pay, the minimum feature set, the intentionally-excluded features, the <10-minute journey, and the engineering-effort + infra-cost estimates. This operationalizes the "smallest-product-that-ships-the-loop" discipline from `02_PRODUCT_STRATEGY.md` §6.

---

## 1. The wedge in one sentence

**Atlas makes a technical-brand founder's brand show up in AI search — and proves it works — by probing ChatGPT/Perplexity/Gemini, generating a validated schema.org JSON-LD + content-brief 1-click pull request into their repo, and reporting the measured lift with honest confidence intervals one month later.**

The loop is the asset. We ship the loop, not the audit.

---

## 2. The customer (locked MVP ICP, restated from Vision §3)

**A founder, Head of Growth, or Head of SEO at a technical B2B brand** (SaaS, dev tools, AI startups, DTC with an eng team), 5–200 employees, $1M–$50M ARR, English-speaking markets first.

**Daily workflow we insert into:**
1. They check analytics — "where is my traffic coming from?" — and increasingly notice an opaque "AI-referral" bucket they can't attribute.
2. They ask ChatGPT/Perplexity/Gemini "who is the best [their category]" and wince when they're omitted or misrepresented.
3. They want to *do something* but the actions are diffuse (write more content? add schema? fix their Wikipedia?) and they have no proof any of it works.
4. Atlas inserts: "here's exactly what each AI surface says about you vs your 3 competitors; here's the validated fix; here's a PR ready to merge; here's the measured lift next month."

**Painful problem:** *"I have no idea what AI systems say about me, and the one time I checked they got it wrong — and I have no lever and no proof."*

**Why they pay us:** we convert a diffuse, unattributable anxiety into a *specific, ship-able, provable* action with a closed-loop report. They pay $129–$399/mo. They are technical enough to merge a PR and to read a confidence interval — the two capabilities that gate the wedge.

---

## 3. Minimum feature set (what the MVP ships)

| # | Feature | What it does | Why it's in the loop |
|---|---|---|---|
| **F1** | **5-field onboarding** | Brand name, primary URL, 3 competitors, 3 buyer-queries, ICP one-liner. Fires the fast-partial-probe immediately. | The activation moment is < 90s. |
| **F2** | **Fast-partial probe** (gateway) | 2 queries × 1 sample × 2 surfaces in < 90s; returns a preliminary "here's what we see" so the dashboard renders before the full probe completes. | Activation > 60% is the D-gate signal. |
| **F3** | **Multi-sample monthly probe (Atlas Probe)** | M queries × N samples (8–32) × K surfaces (ChatGPT, Perplexity, Gemini — Phase 1; Grok, Claude Phase 1.5) capturing verbatim answers + entity IDs + citations + competitor mentions. | This is the *measurement substrate* — the corpus rows' perception side. |
| **F4** | **Editable Brand Card** | The Brand-Truth source-of-truth entity card: fields the brand declares (legal name, parent org, products, founders, founding date, category, differentiators, voice). Drives the schema.org JSON-LD + content briefs. | The customer's lever over their own visibility; the seed of the Brand-Truth spine. |
| **F5** | **AI-readiness report + gap list** | "You're missing Product schema; you have no FAQ; your entity is referenced by 2 of 8 cited domains; competitor C is cited in 6." | The diagnosis the PR fixes. |
| **F6** | **Probe-gap-driven validated schema.org JSON-LD** | Generate Organization + Product + FAQ + Breadcrumb JSON-LD validated against schema.org + against the probe gaps (we generate the schema for the *exact* entities the AI surfaces are failing to resolve). | The intervention. |
| **F7** | **Content briefs** | Short, schema-grounded content briefs for the gap the schema alone doesn't close (e.g., "write a page establishing that {product} is a {category} for {ICP} — this is the entity the surfaces are missing"). | The second-order intervention for content gaps schema can't fix. |
| **F8** | **1-click Pull Request** | Rendered into the customer's repo (GitHub App, minimum-scope, allow-listed file-glob per P0 hardening) — *they merge*, never us. Carries the signed manifest (rollback-hash, expected-uplift, CI). | The *action* in the customer's infra — the locus of the moat. |
| **F9** | **AI-referral pixel** | A first-party script (Cloudflare edge, jurisdictional first-hop) that detects ChatGPT/Perplexity/Gemini/Grok referrers and tags sessions, with conservative-by-design attribution. | Honest attribution input — tractable north star (mention-rate), not revenue (Open Q #5). |
| **F10** | **Monthly Candor Report** | Realized lift vs synthetic-control counterfactual, the *predicted* interval + a coverage diagnostic of past intervals, degradation alerts ("Gemini's mention of you dropped Mar 12 — we did not change anything; OpenAI likely pushed a model bump"). | **The honesty differentiator.** The proof + the variance. |
| **F11** | **Degradation alert subscription** | Email/Slack when a Δ CI crosses zero or a foreign-change signature is detected. | The retention hook — "you can't unsee the lift or the alert." |
| **F12** | **3 tracked competitors** | Same probe across the brand's 3 declared competitors; their mention-rate trajectory alongside the brand's. | The comparative pain ("they show up, you don't") made quantitative. |

That is the loop: **probe → diagnose → brand card → schema/brief → PR (merge) → pixel → measure → report → alert → next cycle.**

---

## 4. Intentionally excluded features (what the MVP does NOT ship, and why)

| Excluded | Why excluded | Horizon |
|---|---|---|
| **Autonomy dial above `propose`** (no auto-merge, no `execute-with-approval`) | The AI-Intelligence readiness gates (calibrated estimator + overlap support) are not closed at MVP. The customer merges; trust accrues. | Post-D-gate, Growth tier |
| **Customer-facing lift numbers from the causal estimator** | Same gate — the estimator returns "probe plan, not guess" until calibrated; we surface the *measured* lift (synthetic-control) honestly, not a *predicted* causal uplift claim. | Horizon 2 |
| **Multi-client workspaces / white-label / agency tier** | Two-ICP dilution (Product critique #1). The agency is a *product* (multi-client workspaces), not a launch segment. | Phase-2 |
| **Enterprise SSO/SAML, data-residency, dedicated cell** | The cell abstraction + SOC 2 are P2; not MVP. | Phase-2+ |
| **Self-hosted inference / the privacy tier** | No enterprise tenants at MVP; API-only to providers. | Horizon 2 (whale/privacy tier) |
| **Plugin marketplace / agent SDK** | The OS Ecosystem layer is Horizon 3; no integrators exist yet. | Horizon 3 |
| **Voice assistants, enterprise AI, niche surfaces beyond ChatGPT/Perplexity/Gemini** | Wedge breadth — the formalization ceiling (AI/ML critique #6) demands a narrow surface set first. Claude/Grok in Phase 1.5; voice/enterprise later. | Horizon 2+ |
| **Revenue attribution in the Candor Report** | The AI-referral pixel is itself a confounder-injector (Open Q #5). Mention-rate lift is the tractable north star at MVP. | Horizon 2 (research item) |
| **Autonomous content generation / publishing** | We open PRs; we do not write the customer's content. Content *briefs* are the intervention; the brand writes the content. | Never claim autonomous content in Horizon 1 |
| **A free tier** | The founder's discipline: refundable deposits + paid concierge, not free trials, because free signals nothing about willingness-to-pay. | Never for the validation phase |
| **"Your AI visibility score is 67" vanity scoring** | Saturated market; the funded incumbents own this; we sell proof, not a number. | Never |

---

## 5. The < 10-minute user journey

**Minute 0–1 — Sign up + 5 fields.** Stripe checkout at Starter $129 (the deposit-equivalent for self-serve). Land in the app, fill brand name, primary URL, 3 competitors (autocomplete against our entity-resolved graph), 3 buyer-queries ("who is the best [category]"), ICP one-liner. Hit "Probe."

**Minute 1–2.5 — Fast-partial probe renders.** 2 queries × 1 sample × 2 surfaces (ChatGPT + Perplexity) returns in < 90s. The dashboard renders: "Here's what ChatGPT and Perplexity say about you right now." Verbatim answers + your entity highlighted (or ARM MISSING flag) + your 3 competitors with their mention status + citations. The first wow.

**Minute 2.5–4 — The AI-readiness report + gap list.** "Your brand is mentioned by 1 of 2 surfaces; competitors average 1.8. You're missing Organization schema (your entity can't be resolved); no Product schema; your entity is cited by 2 of 8 cited domains (vs competitor C's 6)." Each gap is a clickable "fix this."

**Minute 4–6 — The Brand Card.** Auto-populated from the probe + a quick crawl of their homepage; editable. "Confirm your legal name, parent org, products, founders, founding date, category, core differentiators, voice." Save.

**Minute 6–8 — The intervention preview + PR.** Based on the Brand Card + the gap list, Atlas generates (a) the validated schema.org JSON-LD (Organization + Product + FAQ + Breadcrumb) for the *exact* entities the surfaces failed to resolve, (b) up to 2 content briefs for content-only gaps. The user previews the diff against their repo (the GitHub App connects here, minimum-scope, allow-listed glob). Click "Open PR."

**Minute 8–9 — The PR opens in their repo.** They review the diff in GitHub. The PR description carries the signed manifest: what changed, why, expected signal, the rollback-hash, the next probe date. They merge (or request edits).

**Minute 9–10 — The forward promise.** "PR merged. Your first measured Candor Report lands in ~30 days. We'll email you when the next probe completes and when any degradation alert fires. Connect Slack for alerts (optional)." The AI-referral pixel install snippet is offered (one line in their site header).

The full multi-sample probe completes in the background (M×N×K, 15–45 min); an email notification lands when done, and the dashboard fills in with the full set. The first *Candor Report* lands after the next monthly probe cycle + the measurement window.

---

## 6. Engineering effort (T-shirt sizing, validated foundation)

Solo-founder-to-small-team scale. Skill-mix assumed: 1 backend+infra-strong, 1 frontend-strong, 0.5 ML/data part-time (the founder role carries ML until Series Seed). Numbers are calendar estimates with the phase-gated discipline applied (Gates A–D gate spend; the figures below are *total* across the validation-to-MVP arc, not a moonshot start).

| Component | Effort | Notes |
|---|---|---|
| **F2 Fast-partial probe gateway** | S- | A thin, fast, low-sample probe path; reused infra for the full probe. |
| **F3 Atlas Probe (multi-sample across surfaces)** | M | The probe fleet (Go), the LLM-gateway routing + constrained extract, ClickHouse ingest, per-surface rate caps + jitter. The single hardest infra component. |
| **F4 Brand Card (UI + entity graph)** | S | Next.js form + a typed entity node in the KG; CRUD. |
| **F5 AI-readiness report + gap list** | S | Aggregation over the probe + a rules-engine over the KG gaps; deterministic, not LLM. |
| **F6 Validated schema.org JSON-LD generation** | M | Constrained-decoding Draft seam generating schema.org against the Brand Card + the gap-list; validation against schema.org + the probe's failed-entity list. |
| **F7 Content briefs** | S | Constrained Draft seam; short schema-grounded briefs; not full content. |
| **F8 1-click PR (GitHub App + allow-list + diff review)** | M | GitHub App, Vault-dynamic secrets, the per-tenant allow-list glob, the rule-based (non-LLM) diff-review blocker (P0 security), the signed manifest, rollback-hash. |
| **F9 AI-referral pixel (edge + attribution)** | S | Cloudflare Worker first-hop + session tagging + conservative attribution logic. |
| **F10 Monthly Candor Report** | M | Synthetic-control trajectory + bootstrap CIs + the coverage diagnostic + the degradation-alert (EWMA/CUSUM) logic + a clean Next.js report view. |
| **F11 Degradation alert subscription** | S | Email + Slack webhook; on top of F10's alerts. |
| **F12 3 tracked competitors** | S | Same probe path, more rows in the dashboard. |
| **Cross-cutting** | **L** | The Temporal closed-loop spine, the Postgres+AGE+RLS multi-tenant foundation, the Cedar policy gate (autonomy-dial at MVP is `propose`-only but the gate must exist), the LLM-gateway with constrained decoding, OTel+Langfuse observability, the Buf contract codegen, CI gates for RLS + idempotency + redaction + diff-review, the cell-abstraction placeholder. *This is the bulk of the engineering.* |
| **Concierge tooling (Gate-C parallel)** | S | Internal tools to operate the loop manually (we operate; customer gets the report). Runs before the automated MVP exists. |

**Total to Gate-D (MVP live + 10 self-serve customers):** ~3–4 months of focused 2–3-person engineering after Gates A–C pass, with concierge running in parallel from pre-product. **The validation gates (A–C) take 4–8 weeks of founder-time mostly, not engineering-time** — they gate engineering spend, they don't consume it.

---

## 7. Infrastructure cost estimates (solo-founder-to-seed budget)

Constraints honored: solo founder / minimal budget, VPS-grade where sensible, open-source-first, Anthropic/OpenAI/Google only where necessary (no GPU at MVP). Numbers in USD/month at steady-state per cohort.

| Cohort | Postgres+AGE (Crunchy/Aurora) | ClickHouse (self-host) | Redpanda (self-host) | R2 (object+egress) | LLM inference (gate'd) | Probe egress + panel | Valkey + Workers + observability | **Total/mo** | **Per-customer** |
|---|---|---|---|---|---|---|---|---|---|
| **10 customers** | $120 | $80 (small node) | $0 (defer — Redpanda on the probe node) | ~$5 | ~$800 (the dominant cost) | ~$200 | ~$80 | **~$1,285** | **~$128** (Starter $129 → **breakeven**, hence the gross-margin risk in `02` §8) |
| **100 customers** | $250 | $150 | $200 (dedicated) | ~$30 | ~$5,500 (cost-gate active) | ~$1,200 | ~$250 | **~$7,580** | **~$76** (74% → meets GM target with disciplined gating) |
| **1,000 customers** | $800 (Citus approaching) | $400 | $400 | ~$200 | ~$45,000 (consult + self-host partial) | ~$9,000 | ~$700 | **~$56,500** | **~$57** (~78% GM at Starter; strengthens with self-host + federated caching) |
| **10,000 customers** | ~$3,500 (Citus + multi-region cells) | ~$1,500 | ~$1,200 | ~$1,200 | ~$300,000 (this is where self-host sglang + per-tenant cost caps + the federated learning materially shift unit economics) | ~$70,000 | ~$3,000 | **~$380,400** | **~$38** (~85% GM; the whale tier + cells kick in) |

**Honest reading of the cost model:**
- The **LLM inference + probe** line is the dominant variable cost through every cohort and the single threat to the ≥75% gross-margin target at Starter for the first 10 customers. The cost-control gate on the LLM gateway (per-tenant token budget + EVSI-allocated probe spend + fast-partial-probe on first-touch + monthly full-probe cadence) is what moves the per-customer cost from ~$128 (breakeven) at n=10 to ~$76 (target) at n=100. **These are not nice-to-haves at MVP; they are the gate to a viable Starter tier.**
- **Self-hosted sglang inference** (Horizon 2, whale + privacy tier) is the structural cost reduction at n≥1,000 — owned metal beats per-token APIs at that volume.
- **The corpus + federated learning** has negligible *compute* cost at MVP (the closed loop's tagged tuples accrue for free from running the product); the federated refit rounds become real GPU cost only at Horizon 2 once the fleet justifies training.
- **The consented panel** cost is real and recurring (panelist compensation + retention) — modeled in the "probe egress + panel" line; underestimated here if the panel is built early; see `13_MEMORY_ARCHITECTURE.md` for the panel's build sequence.

---

## 8. The wedge-to-OS extrapolation (one paragraph)

Every MVP feature is a *seed* of an OS module: the Atlas Probe → the Perception layer; the Brand Card → the Brand-Truth Layer; the schema/brief PR → the Action & Governance layer; the AI-readiness + gap list → a sliver of the Decision layer (deterministic rules at MVP, the causal estimator behind it Horizon 2); the Candor Report → the Measurement & Attribution layer; the AI-referral pixel → a sliver of the Ecosystem (the pixel becomes a first-party SDK); the published aggregate eventually → the Standards & Data Assets layer (the AI Visibility Index). The wedge does not branch away from the OS; it is the OS in microcosm, with every intelligence-spine component stubbed in its simplest honest form. The OS grows by *deepening* each seed (probe → multi-surface + panel; brand card → primary-source reversal; PR → autonomy dial; report → calibrated causal predictor) — see `27_FUTURE_ROADMAP.md`.

---

*End of wedge. Next: `05_SYSTEM_INTELLIGENCE.md` — the 12-dimension intelligence, written for the external blueprint audience; this is the document the founder named as the most important, derived from `00_FOUNDATION_INTELLIGENCE_CORE.md`.*
