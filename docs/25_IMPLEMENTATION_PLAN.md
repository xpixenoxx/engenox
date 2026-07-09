# 25 — Implementation Plan

> **Status: FROZEN.** The milestone sequence from `STOP_CONDITION` to MVP-live to the Phase-2 expansions: each milestone is **independently deployable** (it produces a running artifact, not a half-feature), the **readiness-closure sequence** is enforced (Scalability + Security gates close before any `execute-with-approval`+ dial level; the AI-Intelligence closure closes before any customer-facing causal lift number; the Production-Readiness closure closes before public self-serve onboarding), and the **build-nothing-unrequired** scope discipline holds (every milestone traces to a doc invariant or a Gates-A-D validation; nothing ships because "it'd be cool"). Authored against `00_FOUNDATION_FINAL.md` (the readiness scores' sync sequencing), `02_PRODUCT_STRATEGY.md` (Gates A-D), `04_PRODUCT_WEDGE.md` (the MVP), `26_MVP_SCOPE.md` (forward-ref the MVP minimum), and `27_FUTURE_ROADMAP.md` (forward-ref the Phase-2 + Horizon expansions). **A milestone that can't be deployed independently is not a milestone; it's a sprint inside one.**

---

## 1. The single rule

**Each milestone is a runnable artifact a customer (or the founder acting as the validation team) can use, and each milestone closes at least one readiness gate before unlocking the next.** The "ship-the-loop, not the audit" discipline (`02`) means the closed loop ships end-to-end even when individual milestones' statistics are immature behind it; the loop is the asset. The closed-loop's hard prerequisites — Postgres+RLS, the Cedar gate, the LLM gateway with constrained decoding, the Temporal spine, the corpus's WORM tier — are the *gates that must exist before any customer sees a causal claim.* The plan sequences those gates.

This section defines the milestones, the readiness closures, the dependency graph, and the scope discipline.

---

## 2. The milestone taxonomy

| Tier | What "done" means | Independently deployable as |
|---|---|---|
| **Foundation milestones (M0–M3)** | the spines stand up; no customer touched yet | an internal demo + a gate-closure evidence pack |
| **Closed-loop milestones (M4–M7)** | the loop runs end-to-end in stage; the consented panel feeds it; the first concierge pilots | the concierge cohort (Gates C-D) |
| **MVP-live milestones (M8–M9)** | the public self-serve path; the <10-minute journey; the dial defaults at Co-pilot | the live MVP (Gates D-final) |
| **Phase-2 expansions (P2.x)** | the Growth / Agency / Enterprise tiers; the white-label; the dial escalation; the federated training | the tier-cohort unlocks |

---

## 3. The milestones (the sequence)

### **M0 — Contract spine + IaC skeleton (the foundation that doesn't ship behavior)**
- **Delivers:** `pkg/contracts/` v1 (the entity + event + service + policy Protobuf), codegen to TS/Go/Python; the `infra/tofu/modules/cell` template; the `infra/kustomize/base` + an `envs/dev`; the Argo CD app-of-apps root; the CI gate-chain skeleton (`17` §4 — contract-compat, RLS-introspection, secret-scan, Biome first); the empty wellness + readiness probes; the `docs/` freeze + `adr/` scaffold.
- **Independently deployable as:** a `dev` cell on a single region that the founder can `kubectl get` and see healthy; a contract package a service can `import`.
- **Gates closed:** none yet (the readiness closures are downstream); the *contract-compat CI gate* fires for the first time.
- **Cannot proceed to M1 until:** the contract compiles + the codegen succeeds across three languages + the dev cell is up.

### **M1 — The truth spine: Postgres + RLS + the KG library (the P0 floor)**
- **Delivers:** the Postgres schema (`tenants`, `assertions`, `entities`, `interventions`, `action_records`, `outcomes`, `probes`, `answer_events`, `brand_card`, the bi-temporal indexes, the `assertion_view`); AGE + pgvector enabled; the RLS policies on every scoping-required table; the `libs/kg` typed bindings (the `assertion_view` + the bi-temporal helpers); the Debezium → Redpanda → sink wiring skeleton; the R2 Object-Lock bucket in Compliance mode + the per-tenant prefix; the Cloud KMS HSM + the KEK + the per-tenant DEK envelope.
- **Independently deployable as:** a seedable tenant + a typed assertion write/read round-trip through `kg`'s `assertion_view` with the canary-row test passing.
- **Gates closed:** **the Security closure's RLS half** — the canary-row test + the SUPERUSER lint + the schema-introspection pass in CI. *A single client-multi-tenant leak is impossible by construction + tested.*
- **Gates opened:** Verification — the security P0 closed in evidence.

### **M2 — The LLM gateway + the verifier (the proposing layer's plumbing)**
- **Delivers:** the `gateway` service (the LiteLLM-routing core, the constrained-decoding injection against the SHACL shapes — Claude tool-use + GBNF for open models via sglang, the `libs/verifier` openCypher + SHACL/Datalog post-call check, the bounded re-attempt on ungroundable output → `null`, the per-tenant token-budget gate with the `PlanNotGuess` 429, the weighted-fair scheduler, the Langfuse span emission with OTel span-links to the Temporal span).
- **Independently deployable as:** the six seam calls (`Extract`, `Draft`, `Adjudicate`, `Embed`, `Abduce`, `Critique`) invocable as stateless functions; a fixture proves the constrained decoding (an `Extract` cannot emit a non-enum `ConflictType`) + the verifier-reject path.
- **Gates closed:** the *AI-Intelligence closure's constrained-decoding + re-grounding half* — the verifier-reject test + the constrained-decoding test pass.
- **Gates opened:** Verification (the proposing-layer plumbing is grounded).

### **M3 — The Temporal spine + the Action layer + the autonomy dial (the closed loop's commitment boundary, NONE of which the LLM controls)**
- **Delivers:** the `AtlasCycle` + `InterventionSaga` workflows; the `decision`'s Planner/Critic/Specialist orchestration (typed plan DAG, the cross-family Critic — Planner≠Critic by config); the `action` service (the GitHub-App credential in Vault, the rule-based diff-review blocker, the per-tenant allow-list-glob, the blast-radius bands, the signed-manifest + the pre-staged rollback-hash); the Cedar gate (the two-pass, the compiled cache, the demote-on-alert, the no-LLM-policy-decision); the autonomy-dial ledger + the three-axis escalation function (the measure-not-toggle).
- **Independently deployable as:** a dry-run `AtlasCycle` against the deterministic fixtures that produces a typed plan DAG + a Critic verdict + a `propose`-level PR preview (no merge), with the rollback-hash pre-staged.
- **Gates closed:** **the Security closure's autonomous-action half** — the rule-based diff-review-blocker test + the allow-list-glob scope + the Cedar two-pass gate + the demote-on-alert property test pass. **The dial default is `propose`; no escalation above it unblocks.**
- **Gates opened:** Verification — the symbolic commitment floor is closed; the LLM may propose, it cannot commit, by construction.

### **M4 — The Measurement + the CIO corpus + the WORM tier (the action spine)**
- **Delivers:** the `measurement` service (the synthetic-control, the DML/doubly-robust, the causal-forests `grf`, the conformal calibrator, the EWMA/CUSUM foreign-change detector, the federated-refit skeleton stubbed); the corpus's dual-canonical (Postgres canonical + R2 immutable signed copy + ClickHouse analytical mirror); the integrity-tag assignment (`id_strategy`, `foreign_change_status`); the three-sinks reconciliation nightly; the regret-detection + the rollback saga; the foreign-change-quarantine guard.
- **Independently deployable as:** a stage `InterventionSaga` against the fixtures that opens a measurement window + estimates the outcome + writes a signed corpus row to R2 Object-Lock + replays the signature in the restore test.
- **Gates closed:** **the three-sinks reconciliation test + the R2 restore test + the foreign-change-quarantine test** pass (the QA critique's P1 closures). The WORM tier's audit promise is verified by restore.

### **M5 — The Perception fleet + the connectors + the consented-panel's first cohort (the probe scale-out + the second moat's seed)**
- **Delivers:** the `perception` Go probe fleet with the per-probe timeouts/retries/cool-downs on Spot; the connector adapters (Ahrefs/Semrush/GSC/GA4/CDN/Git/CMS) with the per-connector rate-limits; the Consent + Roadmap #2 — the founder-network panel's first cohort (the consent ledger, the revocable model, the jurisdiction-aware routing to the privacy cell's self-hosted sglang); the EWMA/CUSUM-driven fixture-refresh hook.
- **Independently deployable as:** a multi-surface probe run that fans out M×N×K + returns the multi-sample `AnswerEvents` to the KG; the consented panel's first row ingested with `id_strategy=RCT-eligible`.
- **Gates closed:** the controlled probe-fleet behavior under Spot preemption + the consent-ledger discipline.

### **M6 — The frontend + the design-system + the <10-minute journey (the trust surface)**
- **Delivers:** the `design-system` package (tokens + primitives + the patterns, `20`); the `web/` Next.js App Router app (`/onboarding`, `/dashboard`, `/brand-card`, `/interventions`, `/report`, `/competitors`, `/settings`, `/admin`); the streaming-RSC provenance-rendering of the six explanation panels; the Candor Report; the Provenance Audit Hover; the dial UI (the four-label metaphor + the three-axis ledger explainer + the demotion-on-alert visibility); the SSE broker for the probe partials + the alert feed; the WorkOS edge auth; the 1-click PR connector (the GitHub OAuth flow → Vault).
- **Independently deployable as:** a complete dashboard session against the staging cell — the <10-minute journey lands + the candor report renders a lift (placeholder CI through M4's measurement).
- **Gates closed:** the a11y (axe) + the visual regression + the Storybook coverage; the <10-minute journey's <90s activation in stage.

### **M7 — The closed loop end-to-end in stage + the warm-canary symbolic fallback + the first concierge pilot (Gates C–D)**
- **Delivers:** the warm-canary symbolic-fallback path (5% of stage traffic routed through the symbolic-rules-only path, eval'd against the LLM path, the divergence monitored); the full closed loop running in stage on the consented-panel cohort; the **first concierge pilot cohort** (Gates C — the refundable-deposit customers run on the closed loop + the manual dial + the human-approved PR for every intervention — the `propose`-default discipline extended by hand).
- **Independently deployable as:** concierge clients see their dashboard + a PR opened for them; the manual dial never escalates; the corpus fills with real (consented) rows.
- **Gates closed:** **the AI-Intelligence closure's eval half** — the conformal-coverage-by-segment metric on the held-out trajectories clears the nominal coverage; the warm-canary divergence stays under threshold; the human-approval-rate from the concierge cohort is a signal (not a closure yet — the closure is the production-cohort measurement).
- **Gates opened:** the closed-loop-symmetry check; the corpus starts being a real asset (real tenant rows, real integrity tags).

### **M8 — The Scalability + Production-Readiness closures + the cell-pair DR rehearsal (the gates before public self-serve)**
- **Delivers:** the load test for the 1000-tenant cohort (the closed loop sustains the M×N×K fan-out + the bus + the LLM-token budget without error-budget breach); the cell-pair DR in a second region + the quarterly cutover rehearsal; the chaos practice documented + run; the SOC2-adjacent audit-log completeness + the break-glass two-person test; the FinOps report per cohort + the cost-flip-threshold model confirmed before the Growth cohort opens.
- **Independently deployable as:** the paired-cell DR rehearsal succeeds; the load test passes.
- **Gates closed:** **the Scalability closure** (the load test) + **the Production-Readiness closure** (the DR rehearsal + the chaos practice + the audit completeness). The closed loop is ready for the public.
- **Gates opened:** the public-self-serve path is unblocked (per `00_FINAL` sync sequencing: Production-Readiness gates public self-serve).

### **M9 — MVP live: the public self-serve onboarding + the <10-minute journey (Gates D-final)**
- **Delivers:** the public `/onboarding` path's hardening (the rate-limit at the edge, the fraud/abuse guards, the SEO-content-installation UX); the marketing-site integration (the candor message); the billing integration (Stripe + the per-tier token budget reconciliation); the live `propose`-default dial; the degradation alerts in production; the first self-serve signups.
- **Independently deployable as:** a stranger signs up + lands on a dashboard + opens their first PR within 10 minutes, no human at Engenox involved.
- **Gates closed:** Gates D-final passes — the MVP is public.
- **Gates opened:** Phase-2 starts (P2.1 below).

### **Phase-2 expansions**
- **P2.1 — Growth tier + the dial escalation unlocks:** the Growth-cohort onboarding + the cost-flip threshold model in production; the dial-escalation beyond `propose` for tenants whose three axes clear. (Closes: the AI-Intelligence closure's *production* half — the dial-escalation ledger is now measured on real customers, not stage.)
- **P2.2 — The `Agency` tier + the white-label:** the white-label theme-swap (a `theme.ts`, `20` §5); the summarized-CI for the end-client report (the CI never omitted); the agency's central billing + multi-tenant-of-clients model.
- **P2.3 — The `Enterprise` tier + the only-egress-for-you cell:** the dedicated cell (the whale cell, 16 §5) + the SSO + the enterprise contracts' RTO mapping.
- **P2.4 — The federated training substrate + the AI-Intelligence readiness closure:** the PRM + the lift predictor + the conformal calibrator + the surface-dynamics models *trained* (not just inferred); the federated FedAvg/FedProx weekly refit; the DP-SGD noise; the readiness closure that promotes the closed loop from "ship-the-loop" to "the calibrated core."

---

## 4. The readiness-closure sequence (the `00_FINAL` sync sequencing, enforced)

The readiness scores' prerequisites are *gates the milestones close in order*:

```
M1 (Security-RLS) ─┐
M2 (constrained-decoding + verifier) ─── before the closed loop touches a tenant
M3 (Security autonomous-action gate) ─── before any execute-with-approval+ dial level
M4 (the corpus + the WORM tier + QA closures)
M5 (the probe scale-out + panel seed)
M6 (the trust surface)
M7 (closed loop end-to-end + first concierge pilot) ─── before any customer-facing causal lift number
                                                          (the AI-Intelligence closure's eval half)
M8 (Scalability + Production-Readiness + DR rehearsal) ─── before public self-serve onboarding
M9 (MVP live)
P2.x (the Phase-2 expansions explicit + the dial escalation per measured axis)
```

- **No milestone proceeds before its closure-precursors pass.** M3 (the autonomous-action gate) cannot start until M1's RLS closure + M2's constrained-decoding closure pass — the gate sequence is the safety sequence.
- **No customer-facing causal lift number ships before M7's AI-Intelligence closure's *eval half* passes** (the conformal coverage on the held-out trajectories). Until then: the report renders the lift as "preliminary — calibration in flight, the CI is wider than nominal" (the candor microcopy).
- **No public self-serve onboarding before M8's Production-Readiness closure passes** (the DR rehearsal + the chaos practice). Until then: the concierge cohort (Gates C-D) is the only path.
- **No dial escalation above `propose` before P2.1** (`autonomous` is opt-in + earned, never default) — even though M3 ships the gate, the *unlocking* beyond `propose` is P2.1's measured decision.

---

## 5. The dependency graph (the critical path)

```
                M0 (contracts + IaC)
                       │
            ┌──────────┴──────────┐
            ▼                      ▼
        M1 (Postgres+RLS+KG)   M2 (gateway+verifier)
            │                      │
            └──────────┬───────────┘
                       ▼
              M3 (Temporal + Action + dial)
                       │
            ┌──────────┴──────────┐
            ▼                      ▼
   M4 (measurement + corpus)  M5 (perception + panel)
            │                      │
            └──────────┬───────────┘
                       ▼
              M6 (frontend + design-system)
                       │
                       ▼
              M7 (closed loop end-to-end + concierge)
                       │
                       ▼
              M8 (Scalability + Prod-Readiness closures)
                       │
                       ▼
              M9 (MVP live — public self-serve)
                       │
                       ▼
              P2.1–P2.4 (Phase-2 expansions)
```

- The parallel work (M1 ‖ M2; M4 ‖ M5) is the founder-as-the-team's concurrent specialist assignment — the Security engineer owns M1, the AI engineer owns M2, the Backend engineer owns M3, the Data engineer owns M4, the Perception engineer owns M5, the Frontend engineer owns M6.
- The serial gates (M3 → M4+M5 → M6 → M7 → M8 → M9) are the readiness closures — these cannot be parallelized because each closes the gate the next depends on.

---

## 6. The build-nothing-unrequired scope discipline

- **Every milestone task traces to a doc invariant + a readiness closure + a gate (A-D) stage.** A feature that doesn't trace is a Phase-2 or a Horizon candidate, not an MVP milestone.
- **The MVP scope** (`26`) is the closed-loop minimum — the 12 features from `04` minus the deferred Phase-2 elements (the white-label, the autonomous dial, the federated training, the Ecosystem plugins are all Phase-2+, NOT MVP).
- **The "ship the loop, not the audit" discipline:** even when a milestone's statistics are immature (M4's estimator is symbolic-only behind a placeholder conformal + a simple SCM; M7's coverage is small-N), the loop ships *if* it's honest about its immaturity (the candor microcopy: "preliminary," the wider CI, the "we haven't measured this on your segment yet"). The loop's *mechanism* is shipped; the *calibration* matures behind it. The asset is the loop (`02`).
- **A milestone slip** is not a "drop a feature" — it's a "split the closure" — a milestone that can't close a gate is split into the closure-it-can-close + the next-milestone part (no half-closed gates merging).
- **The deferred work is documented as Phase-2/Horizon** (`27`), not dropped — a feature reviewable for the next phase is preserved (the roadmap is the memory of the deferred).

---

## 7. The founder-acts-as-the-team sequencing (M0–M9)

(per `21` §3 — the 15-role team maps to the milestones.)

- **M0:** the CTO + the Principal-Software-Engineer (the contract spine + the IaC).
- **M1:** the Security-Engineer + the Backend-Engineer + the Data-Engineer (the truth spine + RLS).
- **M2:** the Principal-AI-Engineer + the AI-Research-Scientist (the gateway + the constraint + the verifier).
- **M3:** the Principal-Software-Engineer + the Backend-Engineer + the Security-Engineer (the Temporal spine + the Action layer + the dial + Cedar).
- **M4:** the Data-Engineer + the AI-Research-Scientist + the QA-Architect (the measurement + the corpus + the restore test).
- **M5:** the Principal-Infrastructure-Engineer (the Spot-based probe fleet) + the Principal-AI-Engineer (the panel's consent-guarded ingestion).
- **M6:** the Staff-Product-Designer + the Frontend-Engineer (the trust surface).
- **M7:** the Technical-Product-Manager + the QA-Architect + the Founder (the concierge cohort + the warm canary + the candor in customer-facing lift).
- **M8:** the DevOps + the Performance-Engineer + the Security-Engineer (the load test + DR + audit completeness).
- **M9:** the Founder + the Technical-Product-Manager (the public launch + the candor in the messaging).

---

## 8. The implementation-plan invariants

1. **Each milestone is independently deployable** — produces a runnable artifact, not a half-feature.
2. **The readiness-closure sequence is enforced:** Security-RLS floor (M1) + constrained-decoding (M2) + autonomous-action gate (M3) before any execute-with-approval+ dial; AI-Intelligence-eval half (M7) before customer-facing causal lift numbers; Production-Readiness (M8) before public self-serve.
3. **The closed loop ships end-to-end early (M7) and matures behind the candor microcopy** — the loop is the asset; the calibration matures behind it (`02`).
4. **The parallel work (M1‖M2, M4‖M5) is the founder-as-team's concurrent specialist assignment; the serial gates (M3→M4+M5→M6→M7→M8→M9) are the readiness closures.**
5. **Build-nothing-unrequired: every task traces to a doc invariant + a readiness closure + a Gates A-D stage;** untraced work is Phase-2/Horizon, not MVP.
6. **A milestone slip splits the closure, not the feature** — no half-closed gate merges; a milestone is the closure-it-can-close + the next-milestone part.
7. **The Phase-2 + Horizon work is documented (`27`), not dropped** — the roadmap is the memory of the deferred.

---

*End of implementation plan. Next: `26_MVP_SCOPE.md` — the explicit MVP minimum (the closed-loop subset of features, the deferred Phase-2 list, the gates-to-MVP-live checklist), authored against the wedge (04) + the readiness closures.*
