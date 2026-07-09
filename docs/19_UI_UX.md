# 19 — UI / UX

> **Status: FROZEN.** The interaction + information-design layer on top of `10_FRONTEND_ARCHITECTURE.md`: the product-design principles (honesty is the differentiator), the **six-panel explanation render** (the perceptual → brand-truth → conflict → corpus → critic → contrarian stack), the **Candor Report UX** (the headline lift + trajectory chart + Honesty expandable + contrarian block + Provenance Audit Hover), the **"hands-on-the-wheel" autonomy-dial UI** (the four-tier human metaphor, the three-axis ledger explainer, the demotion-on-alert visibility), the **<10-minute journey's interaction choreography**, the degradation-alert UX, the loading/error/empty states that preserve trust, the candor microcopy, and the WCAG 2.2 AA discipline. Authored against `01_PROJECT_VISION.md` (the 10 operating principles), `04_PRODUCT_WEDGE.md` (the <10-minute journey), `05_SYSTEM_INTELLIGENCE.md` (the six panels), `10_FRONTEND_ARCHITECTURE.md`, and the Product/Design critique (`_FOUNDATION_CRITIQUES.md`). **The UX is the trust surface: clarity and trust, not animations and vanity scores.**

---

## 1. The single rule

**Every interaction either reinforces the honesty-differentiator or it is decoration** — and decoration is forbidden where it competes with a number that has to be trusted. The Product/Design critique is the brief: "design edge = clarity and trust, not animations." There is no "67/100" gamification, no vanity score, no celebratory confetti on a successful intervention. The hero is the **lift number with its CI**, the **Provenance Audit Hover**, and the **contrarian block** — the artifacts that say *we will tell you exactly how much we don't know*. Everything else is supporting.

This section defines the principles, the panel render, the report UX, the dial UI, the journey choreography, and the edge states.

---

## 2. The product-design principles

1. **Honesty is the differentiator, and it is shown.** The CI is never omitted (10 §6); the coverage diagnostic is surfaced (the past-interval containment rate); the contrarian block is collapsible-but-present.
2. **Provenance is the trust affordance.** Every claim is click-to-provenance (10 §6) — the audit hover is the trust differentiator a customer can see *exactly which probe sample produced each number, on which surface, at which model-id.*
3. **The autonomy dial is a human metaphor.** The internal seven-level dial maps to four labels: Off / Co-pilot / Auto-pilot with review / Full auto-pilot. No engineer-speak leaks to the UI (10 §5).
4. **Understated aesthetic.** No gratuitous animations, no vanity scores, no "AI magic" sparkle. The lift number + the CI is the hero. The critique of "design edge = clarity and trust" is the brief (10 §8).
5. **The <10-minute journey is sacred.** Onboarding → fast-partial-probe → dashboard → first intervention → PR. No step is added without removing two.
6. **The candor microcopy.** Tone is plain, specific, and acknowledges uncertainty. "We measured this on 47 samples across 3 surfaces; the lift is +6% but the CI is +1% to +11% — we'd be lying if we claimed tighter." Not "POWERFUL insights from your AI presence!!"
7. **Density without crowding.** A technical-brand founder is the ICP (04); they will read a dense table. The information density is high; the visual noise is low. The Byte editor founders want the audit hover, not the dashboard chrome.
8. **Errors are honest states, not broken UI.** `VERIFIER_REJECT` / `DIAL_DENIED` / `FOREIGN_CHANGE_QUARANTINE` (18 §7) are rendered with the candor microcopy + the typed fallback, never as a `500 - something went wrong`.

---

## 3. The six-panel explanation render (the per-intervention view)

The six panels (05 §8) surface the closed loop's reasoning for a single candidate intervention. They render in **priority order** (RSC streams the load-bearing first, 10 §2):

### Panel 1 — What we perceived (the probe read)
- The verbatim probe answer (the actual model output, the model-id, the timestamp, the sample count). The "this is what the AI surface literally said" — the audit-trail floor.
- Visual: a quoted block + the sample-count badge (`n=47 across 3 surfaces`); the Provenance hover on each quote → the `AnswerEvent` + the `SourceDoc`.

### Panel 2 — What Brand-Truth says (the source-of-truth comparison)
- The Brand Card's claim on the same entity/predicate; the gap between the perceived answer and the brand's truth.
- Visual: a two-column comparison (`Brand Card: ...` | `Perceived: ...`); the conflict type is a labeled chip (the `KnowledgeConflict` enum, 06); the chip's color is **redundant with the label** (a11y — not color-only).

### Panel 3 — The conflict (the typed `KnowledgeConflict`)
- The typed ConflictType (`BrandTruthMismatch` / `CompetitorOutranking` / `SurfaceRefusal` / `CitationAbsence` / `StructuralMismatch`, 06) + the load-bearing surfaces + the predicted impact on the brand's presence.
- Visual: the conflict type chip + the implicated surfaces + the "this is why your brand isn't showing up" one-paragraph explainer.

### Panel 4 — Corpus precedents (what we've measured before)
- The prior `(intervention_type, surface, context_signature)` matches in the corpus; their lift + CI; the integrity tags (`id_strategy`, `foreign_change_status`); whether the tenant's segment is RCT-eligible or observational.
- Visual: a small multiples chart — a row of mini-trajectories, each with a CI band; the integrity tag is a labeled chip (`RCT-eligible` vs `observational`); a tenant with **no comparable priors** shows "we have not measured an intervention like this on your segment yet — the prediction below is wider-CI than our average."

### Panel 5 — The Critic's surviving objections (the adversarial check)
- The cross-family Critic's verdict (ACCEPT with reservations / DEMAND-REPLAN survived / VETO overturned); the surviving objections (the counterfactuals the Critic raised + how they were addressed).
- Visual: a "counterfactuals considered" list — each is `Perturbation → Estimator impact → Symptom`, clickable to the SCM perturbation source. The Critic's model family is shown (`Critic: GPT-5 ≠ Planner: Claude, 11 §4`) — the cross-family discipline made visible.

### Panel 6 — The contrarian block (the conditions under which the forecast flips)
- The SCM-derived conditions: "this prediction flips to negative if Bing reindexes mid-window, or if the competitor publishes identical content within 14 days." Not prose — the typed conditions with their estimated probability.
- Visual: a collapsible list of typed `CounterfactualCondition`s, each with a probability + the early-warning signal; collapsed by default for the agency end-client, expanded for the technical ICP.

### The dry-run toggle
- Above the panels: a `Dry-run / Commit` toggle (10 §3 the SSE contract). In Dry-run, the artifact (the JSON-LD patch / the content brief) renders as a diff preview with no PR opened; in Commit, the 1-click PR preview renders. **The toggle is the dial's UX hook** — a `propose` tenant sees the PR-for-you-to-merge; an `autonomous` tenant sees the auto-merge-with-rollback-staged.

---

## 4. The Candor Report UX (the honesty-differentiator's commercial embodiment)

The Candor Report (the monthly readout) is the commercial artifact that embodies the honesty philosophy — Product critique #2 ("the CI is intellectually right and commercially terrifying"). It renders as (10 §6 + the report route `/report`):

### (a) The headline number (`+6%`)
- The point-estimate lift; the dashboard tile shows **only this** for the at-a-glance.
- The provenance hover: the SCM + the measurement window + the conformal coverage.

### (b) The trajectory chart
- The **actual vs synthetic-control counterfactual**; the area between is the lift; the **CI bands as shaded regions**; **degradation alerts as vertical lines**.
- The chart is keyboard-accessible (the lift-trajectory zoom is operable without a pointer, 10 §8) + a screen-reader narrative ("the actual trajectory diverges upward from the synthetic control starting at the intervention; the 90% CI band spans +1% to +11%").
- The chart's encoding is **not color-only**: the CI band is a shaded region with a labeled bound, not a color hue alone.

### (c) The Honesty expandable
- The CI (`90% CI [+1%, +11%]`), the coverage diagnostic of past intervals (`8 of last 10 intervals contained the realized lift`), and a one-paragraph "what this means" framed as a **feature**: "We tell you exactly how much we don't know — unlike anyone else."
- This is the commercial-terrifying bit (Product critique #2) rendered as the upsell — the CI's presence is the moat, not the missing-elsewhere.

### (d) The contrarian block
- Collapsible; the conditions under which the forecast flips (Panel 6, the report-version). Collapsed by default for the agency end-client, expanded for the technical ICP.

### (e) The Provenance Audit Hover
- Every claim in the report renders with a node pointer (10 §6); hovering/clicking reveals the underlying `AnswerEvent`, the `SourceDoc`, the citation, the sample count, the model-id. The audit-trail-as-UI is the trust differentiator.

### (f) The reviewer bias (Phase-2 agency tier)
- For technical buyers (the MVP ICP): the CI is prominent. For the agency's white-label end-client: the CI is summarized — **but never omitted** (10 §6 the honesty floor). The CI omission is what differentiates us from overconfident competitors; we never commit it.

---

## 5. The "hands-on-the-wheel" autonomy-dial UI

The internal seven-level dial maps to four labels (10 §5). The UX:

### (a) The slider
- A single four-position slider: Off / Co-pilot / Auto-pilot with review / Full auto-pilot. The labels are the human metaphor; the underlying seven-level mapping is internal (and exposed in `/admin`'s advanced view).
- The default is **Co-pilot** (= `propose`, the PR-for-you-to-merge). No tenant starts above it.

### (b) The escalation explainer (the three-axis ledger, made honest)
- When the tenant requests a higher level, the UI shows the **measurement, not a toggle**:
  ```
  To enable Auto-pilot with review, we need to verify:
   ✓ Lift-predictor calibration: 9 of last 10 intervals contained the realized lift (passed)
   ✗ Human-approval rate: 4 of 11 PRs merged unmodified (needs ≥9 of 11)
   ✓ Pooled overlap: 23 comparable priors on your segment (passed)
  ```
- The ledger is the floor (12 §5). The UI does not say "because the system said so"; it shows the three axes + what's missing. This is the candor microcopy in operational form.

### (c) The demotion-on-alert visibility
- A small notification (10 §5): "auto-rolled back to Co-pilot after 2 alerts" with a click-to-the-alert. The tenant sees the dial moved *and why*; it is not silent.

### (d) The blast-radius indicator
- Per-surface: which surfaces the current dial level permits auto-touching (the per-tenant allow-list-glob, 15 §5) renders as a file-tree with allow/deny chips. The tenant can see "you're at Co-pilot, which allows auto-PRs to `content/blog/**` only" — the structural floor made visible.

---

## 6. The <10-minute journey's interaction choreography

The journey (04 + 10 §4) is a sequence of **progressive disclosure** — the headline first, the detail streamed in:

### Minute 0–1: Onboarding (`/onboarding`)
- 5 fields (the brand, the primary URL, 3 competitors, the primary buyer query, the AI surfaces to track). The submit fires the **fast-partial-probe** immediately (no waiting for cycle completion); the browser redirects to `/dashboard` with an optimistic partial render.
- The microcopy: "We're probing your brand's presence across 3 surfaces. First results in <90 seconds; the full multi-sample probe completes over the next hour."

### Minute 1–2: The activation moment
- The dashboard's SSR path shows a **preliminary result** (1 surface, 1 sample, the brand's mention status vs the first competitor) within <90s (10 §4 + 14 §7's probe partial stream). The "feels responsive while the loop closes" UX.
- Activation metric: surfaced results <90s (F2 from 04).

### Minute 2–10: The dashboard fills
- The full multi-sample probe streams in over SSE; the dashboard fills: the verbatim probe answer, the conflict feed, the 3 competitors' trajectories, the candidate interventions list.
- The first candidate intervention's six-panel explanation renders; the dry-run toggle; the 1-click PR preview.

### Minute ∼10: The first PR
- The 1-click PR / the connect-GitHub flow (10 §4):
  - The connect-GitHub OAuth redirect → the install-credential lands in Vault (15 §5e).
  - The PR preview: the diff hunk (the JSON-LD patch or the content brief), the **allow-list scope** (the file paths it touches, with the deny-list non-overridable chip), the **blast-radius** (the band), the **predicted-uplift CI**, the Critic's verdict.
  - The merge interaction: at `propose`, "Open PR" (human merges); at `execute-with-approval`, "Open + assign PR" (human approves via the PR or the in-app "Approve"); at `guarded`+, "Auto-merge with rollback staged" — the UI **makes the autonomy explicit** before the click.

### The journey's invariant: never block on LLM latency in the critical path
- The fast-partial-probe + the dashboard SSR + the SSE fill mean the user is **never staring at a spinner waiting for an LLM** (04's wedge discipline). The Provenance Audit Hover is the trust affordance, *not* a latency tax.

---

## 7. The degradation-alert UX

- **The alert feed** (`/dashboard`'s right rail + the SSE subscription): severity + the surface + the recommended action + the early-warning signal (the EWMA/CUSUM residual, 09 §2 step 7).
- **Severity** is typed (`advisory | warning | critical`); a `critical` alerts renders with the recommended action (often "we recommend rolling your autonomy dial back to Co-pilot while we measure").
- **The "we don't know" quarantine surfacing:** when the measurement window was contaminated by a foreign change (12 §8), the alert is rendered with candor: "We can't measure this outcome — a platform bump (Bing's index refresh) contaminated the comparison window. We quarantined the result rather than guess." The `FOREIGN_CHANGE_QUARANTINE` typed error (18 §7) is the source.

---

## 8. The Brand Card editor (`/brand-card`)

- The **editable Brand-Truth source-of-truth** (06 + 10 §4): per-entity, per-predicate, the user can assert the canonical truth.
- Forms with progressive enhancement + optimistic updates via Server Actions (10 §3). The audit hover on every editable field shows *when* the claim was last edited and *by whom* (the bi-temporal supersession, 13 §4).
- The "what we'll prove" preview: as the user edits the Brand Card, the UI shows *which perceived conflicts this resolves* — the Brand Card edit's downstream signal rendered upstream. The "truth edit → conflict resolved" link is the Brand-Truth-SOT moat (05 §6) made tangible.

---

## 9. The loading / empty / error states (the trust-undermining modes)

These states are where most trust dies; they are designed explicitly:

| State | UX |
|---|---|
| **Loading (panel)** | `loading.tsx` Suspense skeleton matching the panel's final shape — no generic spinner; the user sees *what's loading*. |
| **Loading (probe partial)** | The partial render + a "filling in" indicator (not a blocker). |
| **Empty (no interventions yet)** | The candor: "We've probed your brand; no actionable conflicts yet — here's the raw probe read." Not "🎉 your AI presence is great!" |
| **Empty (no corpus priors for this segment)** | "We haven't measured an intervention like this on your segment yet — the prediction carries a wider CI than our average." The integrity tag, made honest. |
| **`VERIFIER_REJECT`** | "We couldn't ground this claim against your brand's source-of-truth — we won't show it. The symbolic fallback ran instead; here's what it found." |
| **`DIAL_DENIED`** | "Your autonomy dial (Co-pilot) doesn't permit auto-merging a canonical redirect — here's the policy. Open the PR for human review instead?" |
| **`PLAN_NOT_GUESS` (budget)** | "Your plan's daily LLM budget is exhausted — we returned the symbolic-only plan (no LLM). Resets at 00:00 UTC; upgrade tier for higher budget." |
| **`FOREIGN_CHANGE_QUARANTINE`** | (§7) "We can't measure this — a platform bump contaminated the window." |
| **Error (500-class)** | The `trace_id` is shown: "Trace `<id>` failed; our team can replay it. We logged it at `<timestamp>`." The candor: we admit it, we give you the trace. |

The principle: **the candor microcopy + the typed fallback + the trace_id** — never "something went wrong."

---

## 10. Accessibility (WCAG 2.2 AA — a UX principle, not an afterthought)

- **Radix UI primitives** (10 §1) give keyboard / focus / ARIA for free; the candor-report's chart interactions are keyboard-accessible (10 §8) — the lift-trajectory zoom is operable without a pointer.
- **Color contrast ≥ 4.5:1** for body; **≥ 3:1** for the large-text chart labels.
- **Not color-only encoding** — the CI bands are shaded AND labeled; the conflict-type chips are colored AND labeled; the integrity tags are colored AND labeled. The rule: every color carries a redundant label (a11y + the honesty principle: the label is the truth, the color is the affordance).
- **Screen-reader narrative** for every chart (the trajectory's "actual diverges upward from synthetic control; 90% CI band spans +1% to +11%").
- **Reduced-motion:** no parallax, no count-up animations (the lift number does not "count up to +6%" — it renders as +6%; the count-up is a vanity animation forbidden by §2.4); `prefers-reduced-motion` shortens the SSE-fill transitions.
- **axe** integrated into Playwright + Storybook (10 §9) — an a11y regression is CI-blocked.

---

## 11. Information density + the "scanning vs audit" modes

- The dashboard supports **two reading modes**: a **scanning mode** (the headline tiles, the alert feed, the at-a-glance trajectory) and an **audit mode** (the Provenance Audit Hover, the click-to-provenance exploration). The default is scanning; the click is audit. The same screen serves both; the density is high but the visual hierarchy steers the eye to the headline first (the F-pattern: headline → trajectory → alert feed → the candidate list).
- The **technical ICP** reads the audit mode deeply; the **agency end-client** (Phase-2) sees the summarized version (the CI summarized, never omitted — §4f). The same data; the density adaptively tuned by audience.

---

## 12. Tone of voice (the candor in the microcopy)

- Plain, specific, uncertainty-acknowledging. Never "POWERFUL," never "magical," never exclamation marks at claims.
- The honesty-floor examples:
  - "We measured this on 47 samples across 3 surfaces; the lift is +6% with a 90% CI of +1% to +11%."
  - "We haven't measured an intervention like this on your segment yet."
  - "Your daily plan budget is exhausted; the symbolic-only plan ran instead."
  - "We can't measure this outcome — we quarantined it rather than guess."
- The competitive-terrors rendered as features (Product critique #2): every acknowledgement of uncertainty is framed as the differentiator, not the apology.

---

## 13. The UX invariants

1. **The CI is never omitted;** every lift is `(point, CI)`; the Candor Report renders the coverage diagnostic + the contrarian block.
2. **Every claim is click-to-provenance;** the Provenance Audit Hover is the trust affordance.
3. **The autonomy dial is a four-label human metaphor;** `Co-pilot` is the default; escalation is opt-in + earned + visible (the three-axis ledger explainer); demotion-on-alert is shown.
4. **The <10-minute journey is sacred;** progressive disclosure; no LLM-latency blocker in the critical path; the fast-partial-probe renders <90s.
5. **No vanity scores, no count-ups, no "AI magic";** the lift + the CI is the hero; understated aesthetic.
6. **Errors are honest states:** `VERIFIER_REJECT` / `DIAL_DENIED` / `PLAN_NOT_GUESS` / `FOREIGN_CHANGE_QUARANTINE` render with candor microcopy + the typed fallback + the `trace_id`.
7. **WCAG 2.2 AA — color-contrast, not-color-only encoding, keyboard-accessible charts, screen-reader narratives, reduced-motion.** a11y is CI-gated via axe.
8. **Candor microcopy, always:** plain, specific, uncertainty-acknowledging; the commercial-terrifying bits framed as the differentiator.

---

*End of UI/UX. Next: `20_DESIGN_SYSTEM.md` — the tokens (color, type, spacing, radius, motion), the component library (Radix + custom styles), the accessibility-owned primitive specs, the Storybook + the a11y addon, and the versioned-Changeset publishing discipline.*
