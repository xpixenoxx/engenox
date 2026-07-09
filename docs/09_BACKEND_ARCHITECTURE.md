# 09 — Backend Architecture

> **Status: FROZEN.** The polyglot-but-layered backend service topology, the Temporal-closed-loop spine, the six bounded LLM seams behind the custom gateway, the cross-service contract discipline (Buf codegen), and the Cedar policy gate. Authored against `00_FOUNDATION_FINAL.md` (the 8 cross-cutting invariants), `05_SYSTEM_INTELLIGENCE.md`, and `08_DATABASE_ARCHITECTURE.md`.

---

## 1. Service topology (polyglot, three tiers)

The backend is a *layered modular monolith early → split at the probe + worker seam*. The polyglot decision (TS/Hono · Go · Python/FastAPI per `_FOUNDATION_TECH.md` Layer 2) maps to service boundaries:

```
                        ┌──────────────────────────────────────────────┐
                        │              Cloudflare Edge                 │
                        │  (Auth mid · Pixel Worker · Rate-limit KV)   │
                        └──────────────────────┬───────────────────────┘
                                               │
                        ┌──────────────────────▼───────────────────────┐
                        │           Control Plane (TypeScript/Hono)     │
                        │  API gateway · GraphQL+BFF · Webhooks-out ·   │
                        │  SSE · AuthN/AuthZ session · Cedar gate entry │
                        └──────┬──────────────────────┬─────────────────┘
                               │                      │
              ┌────────────────▼─────┐      ┌──────────▼──────────────┐
              │  Temporal Backbone    │      │  LLM Gateway (TS/Go)    │
              │  (workflows+signals)  │      │  LiteLLM-routing ·      │
              │  per-tenant AtlasCycle│◀────▶│  constrained decoding · │
              │  per-intervention saga│      │  re-grounding ·         │
              └──┬───────────────┬────┘      │  cost-control gate      │
                 │               │           └──────┬──────────────────┘
   ┌─────────────▼─────┐  ┌──────▼────────────┐      │
   │ Perception Layer │  │  Decision Layer    │      │
   │ (Go probe fleet, │  │  (Temporal-        │      │  Six LLM seams
   │  edge workers,    │  │  orchestrated;     │      │  (stateless, schema
   │  connector pulls, │  │  Planner/Critic/   │◀─────┤  constrained):
   │  crawler)         │  │  Specialist = thin │      │  Extract, Draft,
   └────────┬──────────┘  │  orchestration)     │      │  Adjudicate, Embed,
            │             └────────┬────────────┘      │  Abduce, Critique
            │                      │                   │
   ┌────────▼──────────────────────▼───────────────────▼──┐
   │                  Action & Governance Layer (Go)       │
   │   GitHub-App PR · blast-radius · allow-list-glob ·   │
   │   rule-based diff-review · signed-manifest ·        │
   │   rollback-hash · autonomy-dial enforcement          │
   └────────┬─────────────────────────────────────────────┘
            │
   ┌────────▼────────────────────────────────────────────┐
   │            Measurement & Causal Layer (Python)       │
   │  Probe aggregation · synthetic-control · DML/        │
   │  doubly-robust · causal forests (grf) · conformal   │
   │  calibration · EWMA/CUSUM foreign-change ·            │
   │  federated FedAvg/FedProx refit                       │
   └────────┬─────────────────────────────────────────────┘
            │
   ┌────────▼────────────────────────────────────────────┐
   │         Data Plane (per 08_DATABASE_ARCHITECTURE)    │
   │  Postgres+AGE+pgvector · ClickHouse · R2-ObjectLock ·│
   │  FalkorDB(graduated) · Valkey · Redpanda             │
   └──────────────────────────────────────────────────────┘
```

### Tier responsibilities

- **Control Plane (TypeScript/Hono):** the user-facing API. GraphQL+BFF for the dashboard (Next.js RSC streams against this), REST for webhooks+SSE for the AI-referral pixel and degradation alerts, the auth-session entry, the Cedar policy gate's *first* evaluation (before any agent reasons — see §6). Stateless where possible; one service, horizontally scaled.
- **Temporal Backbone:** the durability spine. One `AtlasCycle` workflow per tenant per probe cycle; one `InterventionSaga` per executed intervention (the lagged measurement window). Signals for the human-approval gate (`execute-with-approval`) and for degradation-alert-triggered rollback. **No state in the agent framework or a cache** — all longevity in Temporal + Postgres.
- **Perception Layer (Go):** the probe fleet — fanning out M×N×K concurrent AI-surface probes with per-probe timeouts/retries/cool-downs; the connector pulls (Ahrefs/Semrush/GSC/GA4/CDN/Git/CMS); the crawler. Goroutines are purpose-built for this; memory stability over 24/7 is the Go choice (Node/Bun GC is the risk the Infra critique named).
- **Decision Layer (Temporal-orchestrated, mostly TS):** the Planner/Critic/Specialist are thin orchestration around the causal scorer and the LLM-gateway seams — not a heavy agent framework. This layer reasons by issuing bounded LLM calls + symbolic queries + the causal scorer; it commits nothing (see `12_AGENT_ARCHITECTURE.md`).
- **Action & Governance Layer (Go):** the GitHub-App PR creation, the per-tenant allow-list-glob enforcement, the rule-based (non-LLM) diff-review blocker (the P0 security gate), the blast-radius computation, the signed-manifest generation, the rollback-hash, the autonomy-dial enforcement (the Cedar gate's *second* evaluation — after the plan is built). **High-blast actions execute only here; no LLM writes a commit.**
- **Measurement & Causal Layer (Python/FastAPI):** the SciPy-ecosystem home — synthetic-control, DML/doubly-robust, causal forests (grf), conformal calibration, EWMA/CUSUM foreign-change detection, the federated FedAvg/FedProx refit. Isolated behind a gRPC/queue boundary so the polyglot cost is contained.
- **LLM Gateway (TS/Go):** the thin wrapper on LiteLLM routing with the constrained-decoding + re-grounding + cost-control layers (see §5). **No state owned here** — it's stateless service plumbing.

### The seam that splits the monolith
The first split from a single deployable is the **probe-and-worker seam**: the probe fleet (Go) + the measurement worker (Python) become their own deployable once the control plane (TS) is stable, because they have different scaling and runtime profiles. Until then, a singleTS service + a Go probe binary + the Python service as separate processes within one deployable unit is the minimal-complexity posture.

---

## 2. The Temporal closed-loop spine

The closed loop (`perceive → decide → act → measure → tag-and-append → refresh-models`) is a hierarchy of Temporal workflows:

### `AtlasCycle` (per tenant, periodic — monthly full probe + the weekly active-sensing mini-cycles)
```
AtlasCycle(tenant_id):
  1. trigger Perception.ProbeTenant(tenant, queries, surfaces, M, N) [child workflow]
  2. await → Perception returns AnswerEvents
  3. trigger Decision.Diagnose(tenant, AnswerEvents) [child workflow]
     → returns KnowledgeConflicts + candidate Interventions (Critic-vetoed)
  4. for each surviving Intervention:
       trigger Decision.ScoreAndPlan(intervention) [child workflow]
       → returns ActionRecord (predicted_uplift + CI + blast_radius + dial_level)
  5. for each ActionRecord at dial_level >= propose:
       trigger Action.Execute(action_record) [child workflow, idempotent]
       → reaches PR-open (propose) OR awaits Signal:HumanApproved (execute-with-approval)
  6. for each merged Intervention:
       trigger Measurement.OpenWindow(intervention) [child workflow, weeks-long]
  7. emit degradation-alert subscription updates [signals to webhooks/SSE]
```

### `InterventionSaga` (per executed intervention — the long-tail measurement)
```
InterventionSaga(intervention_id):
  1. status: merged → measurement-window-open
  2. sleep until measurement window start (Temporal Timer — durable across weeks)
  3. trigger Perception.ProbeTarget(intervention.target_surface, intervention.target_query)
  4. sleep until window end
  5. trigger Measurement.EstimateOutcome(intervention_id) [the synthetic-control + DML]
  6. tag integrity (ID-strategy + foreign-change-status)
  7. if foreign-change == period-invalid → quarantine + alert; else append to Corpus
  8. status: recorded → emits signal to refresh causalscorer (weekly batch)
```

### Idempotency (QA critique P0)
Every external-side-effect activity carries a typed `IdempotencyKey` derived from `(tenant_id, cycle_id, intervention_id, activity_name)`. The Action layer's PR-creation activity checks "does this PR already exist on this idempotency key" before creating. An integration test re-executes every external-side-effect activity and asserts idempotency; **a PR-creating activity without a passing idempotency test is CI-blocked.**

### The "two-pass policy gate" pattern
The Cedar policy gate evaluates **before** any agent reasons (bounding legal options by autonomy-dial level + blast-radius) AND **after** the Critic-validated plan is built (mapping the surviving plan to the dial level and enforcing the demotion-on-alert invariant). This is the symbolic commitment to "an LLM cannot override autonomy" — it's a gate, not a request to the LLM.

---

## 3. The bounded LLM seams (re-stated; see `11_AI_ARCHITECTURE.md` for runtime)

Stateless, schema-constrained services invoked by every layer. None owns a private brain:

| Seam | Constraint | Invoked by |
|---|---|---|
| Extract | Output drawn only from the tenant's SHACL shapes (Outlines/XGrammar/GBNF) | Perception |
| Draft | May cite only existing KG/trajectory node pointers; verifier re-parses + rewrites ungrounded claims | Decision, Action, Reporting |
| Adjudicate | Constrained *choice* among `ConflictType` classes the Reconciler enumerated | Reconciler |
| Embed | Produces retrieval vectors (bge/Cohere) | Memory router, playbook retrieval |
| Abduce | Generates falsifiable diagnostic hypotheses | Decision (Planner) |
| Critique | Cross-family adversarial (Claude vs Gemini vs GPT); may VETO or DEMAND-REPLAN | Decision (Critic) |

**The re-grounding rule (non-negotiable):** nothing an LLM seam produces touches a spine until a symbolic verifier (openCypher + SHACL/Datalog) re-grounds it against the KG. The verifier rejects any output it cannot ground; the LLM seam's output is a *proposal* until verified.

---

## 4. The contract spine (the polyglot anti-drift discipline)

The polyglot cost is contained by the Buf contract-codegen discipline (the `_FOUNDATION_TECH.md` Layer 15 invariant):

- **Canonical schemas** for `AssertedNode`, `KnowledgeConflict`, `Intervention`, `ActionRecord`, `Outcome`, the assertion-event envelope, the telemetry span shapes — defined ONCE in Buf (Protobuf) or JSON-Schema.
- **Codegen** to TypeScript (frontend + API), Go structs (workers), Python pydantic (ML service).
- **Strict add-only compatibility** (only add optional fields; never remove/rename/change semantics; major version bumps trigger assertion-migrations).
- **CI gate:** a contract-package PR that breaks compatibility is blocked.
- **Schema Registry** (Buf/Confluent) for the Redpanda assertion-event envelope — every event is a versioned, compatibility-gated message.

This is what makes the type drift across the polyglot boundary impossible by construction. **No hand-written cross-language types.**

---

## 5. The LLM Gateway internals

- **Routing** via the LiteLLM-proxy core: choose provider/model by task (Extract/Draft → Claude; Critique → cross-family, GPT; Abduce → Gemini long-context; Embed → bge Cohere) + by tenant (privacy tier → self-hosted sglang; whale tier → dedicated cell; long-tail → API) + by cost (per-tenant token-budget gate).
- **Constrained decoding** enforcement: the gateway injects the Outlines/XGrammar/GBNF grammar derived from the tenant's SHACL shapes into the provider call (Anthropic's tool-use/JSON mode for Claude; GBNF for open models via sglang/vLLM).
- **Re-grounding** post-call: every seam output is passed through the symbolic verifier (an openCypher + SHACL check service) before the gateway returns it to the caller. Ungroundable outputs are rejected + the seam re-attempts with a tightened prompt (bounded retries).
- **Cost control:** per-tenant token-budget counters in Valkey; the gateway returns HTTP 429 with a probe-plan-not-guess fallback when the budget is exhausted (the weighted-fair-scheduling realization — whales cannot starve the long tail).
- **Cross-family Critic:** the Critic seam explicitly uses a *different* model family from the Planner's; the gateway enforces this by config (Planner=Claude → Critic=GPT-or-Gemini; Planner=GPT → Critic=Claude-or-Gemini), so correlated failure modes don't survive.
- **Tracing:** every LLM call emits a Langfuse span (input/output/constraint/model-id/cost/grounded?) linked to the Temporal workflow span. A single root-cause trace crosses from `AtlasCycle.start` through the Critic veto to the `ActionRecord.commit` and the measurement outcome.

---

## 6. The Cedar policy gate

- **Policies encode the autonomy dial + blast-radius + tenant-permission scopes.** Typed against the shared schema (the `ActionRecord` type carries the fields the policy evaluates).
- **Compiled + cached** keyed by `(subject, action, resource_class, blast_radius_band)` — the Performance-critique <2ms p99 requirement.
- **Two-pass enforcement:** the gate is invoked at the start of every cycle (bounding what the planner may even consider) and after the plan is built (mapping the surviving plan to the dial level + enforcing the demotion-on-alert invariant).
- **Demotion is automatic:** if a tenant has N degradation alerts in a window, the policy downgrades the dial level — *it is the default, not something to remember* (the QA critique's P1).
- **No LLM writes a policy decision.** The gate is structural; an LLM may not commit. This is the symbolic-spine's embodiment.

---

## 7. Inter-service communication patterns

- **API → internal services:** gRPC (typed, contract-spine-driven) for sync calls; Temporal signals for cross-workflow triggers; Redpanda topics for async fan-out.
- **SSE for user-facing streaming:** the dry-run toggle, the partial-probe results, the degradation alerts. The Control Plane streams these to the Next.js frontend.
- **Webhooks-out:** Proven-to-the-customer notifications (PR opened, alert fired, monthly report ready) via signed webhooks with retry — also a Temporal activity (idempotent, idempotency-keyed).
- **Connector pulls (Ahrefs/Semrush/GSC/GA4/CDN/Git/CMS):** scheduled Temporal activities with per-connector rate-limiting; the connectors are typed adapters that emit typed assertions into the assertion-event envelope.

---

## 8. The non-negotiable invariants (the backend layer)

1. **Temporal owns the closed loop; no workflow state in the agent framework or a cache.** All longevity in Temporal + Postgres.
2. **Every external-side-effect activity has a typed IdempotencyKey + a passing idempotency test, or it is CI-blocked.**
3. **No LLM commits.** The six seams are stateless + schema-constrained + re-grounded; the symbolic verifier rejects ungroundable output.
4. **The Cedar gate is the symbolic commitment to autonomy.** Two-pass (before + after); demote-on-alert; no LLM writes a policy decision.
5. **Buf contract codegen across the polyglot boundary.** No hand-written cross-language types; strict add-only compatibility CI-gated.
6. **Cost is gated.** Per-tenant token-budget; weighted-fair scheduling; probe-plan-not-guess fallback on budget exhaustion.
7. **The Control Plane is the only user-facing service.** Everything behind it is internal; the Ecosystem layer (horizon 3) is the exception, sandboxed.

---

*End of backend architecture. Next: `10_FRONTEND_ARCHITECTURE.md` — the Next.js App Router frontend, the provenance-rendering pattern for the explanation panels, the SSE/streaming contract with the Control Plane, and the design-system-to-frontend contract.*
