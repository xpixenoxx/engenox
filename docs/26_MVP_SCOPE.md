# 26 — MVP Scope

> **Status: FROZEN.** The explicit MVP minimum — the closed-loop subset of features that ships to a stranger within the <10-minute journey at the `Co-pilot` dial default — and the **deferred-phase list** that is, by definition, NOT the MVP. Authored against `02_PRODUCT_STRATEGY.md` (Gates A-D + the ship-the-loop discipline), `04_PRODUCT_WEDGE.md` (the 12 MVP features + the intentionally-excluded), `25_IMPLEMENTATION_PLAN.md` (the closure sequence), `00_FOUNDATION_FINAL.md` (the readiness gates), and the standing instruction set ("build nothing unrequired"). **The MVP is not "the product minus the hard parts"; it is the closed-loop's irreducible minimum, deferred list explicit, candor-preserving.**

---

## 1. The single rule

**The MVP is the closed-loop's irreducible minimum** — perceive a brand's AI presence → diagnose the conflict → propose the intervention → open the PR (NOT auto-merge) → measure the outcome → write the corpus row → render the candor — and **everything not on this list is deferred with an explicit, documented reason.** The `Co-pilot` (`propose`) dial default means the MVP does not auto-merge anything; the customer merges their own PR; the closed loop's first corpus rows are consented-panel-seeded + concierge-cohort-real. The MVP ships the loop, not the calibration; it ships the candor, never the overpromise.

This section defines the MVP minimum, the deferred-phase list, the gates-to-MVP-live checklist, and the explicit non-goals.

---

## 2. The MVP minimum (the closed-loop feature set)

### In-scope (the irreducible minimum, M0–M9)

1. **The truth spine + RLS** (`M1`): Postgres + AGE + pgvector + the bi-temporal `assertion_view` + RLS-by-tenant on every scoping-required table, CI-introspected + canary-row tested. *Non-negotiable: no MVP without the P0 floor.*
2. **The LLM gateway + the verifier + constrained decoding** (`M2`): the six seams (Extract, Draft, Adjudicate, Embed, Abduce, Critique) as stateless schema-constrained functions; the cross-family Critic (Planner≠Critic); the re-grounding verifier; the per-tenant token-budget gate; the Langfuse tracing.
3. **The Temporal spine + the Action layer + the autonomy dial** (`M3`): `AtlasCycle` + `InterventionSaga`; `propose`-level PR-open (NO merge — the `Co-pilot` default); the rule-based diff-review blocker + the allow-list-glob + the blast-radius bands + the Cedar two-pass gate; the dial ledger + the three-axis escalation function (NOT unlocked beyond `propose` in the MVP).
4. **The Measurement + the CIO corpus + WORM** (`M4`): the synthetic-control + the DML/doubly-robust estimator + a simple conformal calibrator (the calibration matures behind the MVP); the EWMA/CUSUM foreign-change detector; the corpus's dual-canonical (Postgres + R2 Object-Lock); the integrity tags; the three-sinks reconciliation; the regret-rollback saga.
5. **The Perception fleet + the connectors + the consented panel's first cohort** (`M5`): the Go probe fleet on Spot; the connector adapters (the MVP subset: GSC + GA4 + the Git connector + the CMS connector — Ahrefs/Semrush are *not* in the MVP-fleet unless a concierge client requests); the founder-network consented panel (the consent ledger, the revocable model).
6. **The frontend + the design-system + the <10-minute journey** (`M6`): the design-system package; the `web/` Next.js App Router; the six-panel explanation render; the Candor Report (the headline lift + the trajectory + the Honesty expandable + the contrarian block + the Provenance Audit Hover); the dial UI (the four-label metaphor with `Co-pilot` default); the SSE broker; the WorkOS edge auth; the 1-click PR connector.
7. **The 12 wedge features (`04` §the-12-feature-minimum)** — explicitly enumerated here as MVP-deliverable:
   - **F1 — 5-field onboarding** (brand, primary URL, 3 competitors, primary buyer query, AI surfaces).
   - **F2 — Fast-partial probe, <90s** (the activation moment).
   - **F3 — Multi-sample monthly probe** (the M×N×K probe fan-out with the multi-sample belief).
   - **F4 — Editable Brand Card** (the Brand-Truth SOT, the per-entity editor).
   - **F5 — AI-readiness report** (the conflict feed + the explainable "why your brand isn't showing up").
   - **F6 — Validated `schema.org` JSON-LD + content briefs** (the Specialist artifacts, verifier-grounded).
   - **F7 — 1-click PR connector** (the GitHub OAuth → the `propose`-level PR — NOT auto-merge).
   - **F8 — AI-referral pixel** (the customer-site JS → the REST ingestion → the Perception layer).
   - **F9 — Monthly Candor Report** (the lift + the CI + the coverage + the contrarian block).
   - **F10 — Degradation alerts** (the EWMA/CUSUM-driven alert feed + the auto-demotion).
   - **F11 — 3 tracked competitors** (the mention trajectory vs the brand).
   - **F12 — The autonomy dial at `Co-pilot`** (the four-label UI, the three-axis ledger explainer, the demotion-on-alert — the unlock beyond `propose` is deferred).

### The 1-tier MVP
- **Tier served:** the locked MVP ICP (the technical-brand founder, `01` + `04`), $129 Starter (per `02` §pricing) — NO Growth, NO Agency, NO Enterprise tier in the MVP.
- **The Stripe billing** wires the Starter plan + the per-tier token budget.
- **The concierge add-on** ($299–999, `02`) is served manually by the founder for the first cohort + is the seed of the consented panel.

---

## 3. The deferred-phase list (explicit — NOT the MVP)

| Deferred to | The feature | Why deferred |
|---|---|---|
| **P2.1** | The dial escalation beyond `propose` (the `execute-with-approval` / `guarded` / `autonomous` levels) | Locked behind the AI-Intelligence readiness closure measured on real customers; the three-axis ledger cannot clear on stage-only data. `Co-pilot` (`propose`) is the MVP default. |
| **P2.1** | The `Growth` tier (the per-tenant cost-flip threshold model touched) | The Growth cohort opens only when the cost-flip threshold for the closed loop is documented from production, not modeled from stage. |
| **P2.2** | The `Agency` tier + white-label | The white-label is a `theme.ts` swap (`20` §5); the summarized-CI (CI never omitted); the multi-tenant-of-clients model — material scope, not MVP-critical. |
| **P2.3** | The `Enterprise` tier + the dedicated cell + SSO | The cell-pair DR rehearsal (`M8`) opens the public-self-serve path; the dedicated whale cell + SSO is P2.3. |
| **P2.4** | The federated-training substrate (PRM + lift predictor training + conformal calibrator training + the surface-dynamics models) | The federated FedAvg/FedProx weekly refit + DP-SGD noise — *training* infra, gated by the AI-Intelligence readiness closure; the MVP runs the *inference* stack with the symbolic + a simple conformal, not the trained calibrator. |
| **Phase-2** | The self-hosted sglang (the privacy tier's EU cell + the whale tier's dedicated cell) | The MVP runs Tier-A (per-token API, `11` §5); the privacy/whale self-hosting is Phase-2 (the GPU buy is the unit-economics commitment, not the MVP bet). |
| **Phase-2** | The cross-tenant standardization training (the lift predictor trained on the pooled aggregates) | The pooled `corpus_analytics` mirror exists in the MVP (the schema, the integration); the *training* of the lift predictor on it is P2.4. The MVP's estimator runs SCM + DML on the per-tenant + the panel-cohort rows. |
| **Phase-2** | The Ecosystem plugins + the connector marketplace (the `27` Horizon-3 items) | Out of scope; the connector set is fixed in the MVP (the 4-connector subset in §2.5). |
| **Horizon 2+** | The "representative" consented-panel sampling frame | The MVP's panel is the founder-network cohort (the seed); the statistically-representative panel is the AI-Intelligence closure 4. |
| **Horizon 2+** | The model-card per seam + the quarterly model-eval refresh | The first model cards come at the AI-Intelligence closure; the quarterly refresh is the steady-state. |
| **Horizon 3** | The OS surface (the "AI Visibility Operating System" as a category claim) | The MVP's external message is the *wedge* ("make your brand show up in AI search + prove it works"); the OS claim is the long-game north star (`01`). |

### The "deferred-not-dropped" discipline
Per `25` §6 — every deferred item is documented in `27_FUTURE_ROADMAP.md` with its trigger + its closure-prerequisite + its Phase. The roadmap is the memory of the deferred.

---

## 4. The candor-preservation rules in the MVP

The MVP ships the loop, not the calibration — but it ships the candor *about the calibration's immaturity*:

- **The first customer-facing lift numbers** (the Candor Report) carry the candor microcopy: "preliminary — calibration in flight; the CI is wider than nominal." The point estimate renders; the CI renders *wider* until the AI-Intelligence closure's production half (`P2.1`) passes (per `25` §4 + §6 — the closed loop is shipped honest, not overpromised).
- **The corpus-N is small in the MVP** (the concierge cohort + the founder panel + the first Starter customers); the corpus precedents panel (Panel 4, `19` §3) renders the small-N honestly: "we have N comparable priors on your segment; the CI is wider than our average."
- **The dial defaults to `Co-pilot`** — the MVP does not auto-merge anything; the customer merges their own PR. The dial slider renders with `Co-pilot` selected + the `execute-with-approval`/`guarded`/`autonomous` options visibly *grayed out with the candor explainer* ("unlocks on the three measured axes — see the ledger explainer"), not hidden.
- **The autonomy-dial ledger's three-axis check** runs (the function is in `M3`) but **denies** every escalation request in the MVP (the closure hasn't passed) — the denial is the candor: "your three axes haven't cleared yet — we'll re-evaluate after 100 measured cycles."
- **The degradation alerts + the auto-demotion** are in the MVP — the closed-loop's safety net ships with the loop, not after it.

### The point at which each candor restriction lifts
- The "preliminary CI" microcopy lifts when the AI-Intelligence closure's production half passes (`P2.1`) — the coverage clears the nominal rate.
- The dial escalating beyond `propose` unlocks when the per-tenant three-axis ledger clears on production data (`P2.1` + per-tenant).
- The "small-N" honesty lifts gradually as the corpus fills — no specific milestone; the corpus growth is the lift.

---

## 5. The gates-to-MVP-live checklist (M0–M9 closure)

The MVP goes public when **all** of the following pass (per `25` §4 the readiness closures, the corridors of production-quality):

### Security closure (M1 + M3)
- [ ] Every Postgres table has an RLS policy; CI-introspected; the canary-row test passes; no SUPERUSER in the app pool.
- [ ] The rule-based diff-review blocker + the allow-list-glob + the Cedar two-pass gate pass their tests; the deny-list is non-overridable.
- [ ] The per-tenant crypto: HSM-backed KEK + envelope-encrypted per-tenant DEK + quarterly rotation; the dual-canonical two-fence property holds (a DB clone without the KEK is unintelligible; an R2 clone without the signature key is unverifiable).
- [ ] The audit log is immutable, per-tenant isolated for read, signed-manifest-linked, bi-temporal.
- [ ] The privacy-tier never-egress is enforced (the EU cell is sovereign — the self-hosted sglang is *deferred* but the routing + the KV-no-egress is in the MVP for the future privacy client).

### Scalability closure (M8)
- [ ] The load test passes for the 1000-tenant cohort — the closed loop sustains the M×N×K fan-out + the bus + the LLM-token budget without error-budget breach.
- [ ] The cell-pair DR rehearsal succeeds; the cutover + the rollback runbook execute cleanly.
- [ ] The FinOps report per cohort + the cost-flip threshold model confirmed before the Growth cohort opens (the Growth cohort is *not* opened as part of MVP-live — it's P2.1, the threshold is the gate).

### AI-Intelligence closure (M2 + M6 + M7)
- [ ] The constrained decoding (no seam emits out-of-enum) + the cross-family Critic + the verifier-reject path pass.
- [ ] The eval pipeline (DSPy/TextGrad-style prompt search) is owned separately from production; LLM-as-judge is coarse triage only; the consented panel + Argilla are the ground truth.
- [ ] The conformal-coverage-by-segment metric clears the nominal coverage on the held-out trajectories (the eval half); the warm-canary divergence stays under threshold.
- [ ] **The customer-facing lift numbers (the Candor Report) ship with the candor microcopy** (the wider CI / the preliminary note) until the production half (`P2.1`) passes.
- [ ] The golden-probe regression suite asserts over pipeline behavior, not surface outputs.

### Maintainability closure (the docs-STOP-CONDITION + the contract spine)
- [ ] Every one of the 27 blueprint documents is FROZEN + production-quality; the Engineering Readiness Report clears the gate thresholds on **Architecture + Maintainability + Competitive Moat at ≥9.5**.
- [ ] The contract spine (Buf) is the only cross-language type source; the CI contract-compat gate fires.
- [ ] The dependency-direction lint is enforced.

### Production-Readiness closure (M8)
- [ ] The blue/green cell cutover is rehearsed; the rollback procedure (the deploy-rollback + the data-rollback, separate, `17` §8) is documented + tested.
- [ ] The chaos practice is documented + run monthly — the LLM-provider outage, the Postgres-primary loss, the Redpanda partition loss, the Temporal worker crash, the GPU cell saturation, the regret-rollback rehearsal.
- [ ] The R2 restore test (the WORM tier's audit promise) passes quarterly.
- [ ] The SOC2-adjacent audit-log completeness + the break-glass two-person test pass.

### The product closure (Gates A–D + the <10-minute journey)
- [ ] **Gates A** (problem calls) — the customer-development calls said the problem is real.
- [ ] **Gates B** (refundable deposits) — the deposits cleared.
- [ ] **Gates C** (concierge pilots) — the concierge cohort (the first cohort ran on the closed loop in stage, M7).
- [ ] **Gates D-final** (MVP live + first self-serve) — a stranger signs up + lands on a dashboard + opens their first PR within 10 minutes, no human at Engenox involved.
- [ ] The <10-minute journey's <90s activation is met in production.
- [ ] The candor-differentiator UX is shippable: the CI is never omitted; the Provenance Audit Hover works; the candor microcopy is in production copy.

### The "build-nothing-unrequired" closure
- [ ] Every MVP feature traces to a doc invariant + a readiness closure + a Gates A-D stage (the §2 list passes).
- [ ] The deferred list (§3) is documented in `27_FUTURE_ROADMAP.md` with triggers + closures + phases.

---

## 6. The explicit non-goals (the MVP does NOT)

- The MVP does **not** auto-merge anything (the dial is `propose`; the customer merges their own PR).
- The MVP does **not** serve anything above the Starter tier (no Growth, Agency, Enterprise).
- The MVP does **not** run the federated-training substrate (the PRM + lift predictor + conformal calibrator training is P2.4).
- The MVP does **not** run the self-hosted sglang (Tier-A per-token API is the MVP's inference tier).
- The MVP does **not** open the Growth cohort (the cost-flip threshold model touches production in P2.1).
- The MVP does **not** claim the "AI Visibility Operating System" category (the external message is the wedge: "make your brand show up in AI search + prove it works"; the OS claim is the long-game north star, `01`).
- The MVP does **not** use LLM-as-judge as ground truth for promoting interventions or training the PRM (the consented panel + Argilla human review are the ground truth, per `11` §7 the AI-Intelligence-Skeptical invariant).
- The MVP does **not** accept a `tenant_id` from a client — `app.tenant_id` is from the JWT (the P0 floor).
- The MVP does **not** render a lift number without its CI (the honesty floor).
- The MVP does **not** omit the contrarian block (the honesty floor, §4f).

---

## 7. The MVP-scope invariants

1. **The MVP is the closed-loop's irreducible minimum — perceive → diagnose → propose → open-PR → measure → corpus → render-candor — at the `Co-pilot` dial default;** the deferred list is explicit (`27`).
2. **The 12 wedge features (F1–F12) are the shipped surface;** the 1-tier MVP (Starter, $129) is the served tier; the concierge add-on seeds the consented panel.
3. **The candor-preservation rules hold: the first lift numbers ship with the wider/preliminary CI;** the corpus precedents render small-N honestly; the dial denies escalation with the ledger-explainer; the degradation alerts + the auto-demotion ship with the loop.
4. **The Gates-to-MVP-live checklist** (Security + Scalability + AI-Intelligence + Maintainability + Production-Readiness + the product Gates-A-D + the build-nothing-unrequired closure) closes before public self-serve.
5. **The non-goals** (no auto-merge, no Growth+, no federated training, no self-hosted sglang, no OS category claim, no LLM-as-judge-as-ground-truth, no client-supplied `tenant_id`, no lift-without-CI, no contrarian-block-omission) are explicit; a MVP claim that violates them is rejected at review.
6. **The MVP ships the loop, not the calibration — and ships the candor about the immaturity**, not the overpromise (`02` the ship-the-loop discipline).

---

*End of MVP scope. Next: `27_FUTURE_ROADMAP.md` — the Phase-2 + Horizon expansions (the Growth/Agency/Enterprise tiers, the federated training, the self-hosted inference, the Ecosystem plugins, the OS category claim, the readiness-closure-gated unlocks), the deferred-item triggers, and the pre-launch Citera rename action item.*
