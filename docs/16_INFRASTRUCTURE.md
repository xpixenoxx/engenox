# 16 — Infrastructure

> **Status: FROZEN.** The physical substrate: the **cell abstraction** (a region-isolated, tenant-cohort-serving, self-contained slice of the stack), the **three GPU price points** (baseline committed / spike pay-per-second / constrained per-token-API) that fix the Infra critique's whale-vs-long-tail unit-economics, the Cloudflare-edge + GCP-primary topology, the data-plane choices per tier, the multi-region/cell DR posture, the FinOps cost gates that make the Starter gross-margin target reachable, and the scheduled (never improvised) graduations. Authored against `_FOUNDATION_CRITIQUES.md` (the Infra critique's P1/P2 + GPU-spot warning), `00_FOUNDATION_FINAL.md` (the resolved 2026 stack), `08_DATABASE_ARCHITECTURE.md`, and `11_AI_ARCHITECTURE.md` (the inference tiers). **The unit-economics gate is the infrastructure: cost-flipping points are modeled before the Growth cohort opens, not after the bill arrives.**

---

## 1. The single rule

**The infrastructure is a fleet of cells, and a cell is the unit of scale, isolation, and cost.** A cell is a self-contained slice of the stack — edge → control plane → workers → data plane — deployed in one region, serving a tenant cohort, isolated from other cells by construction. The privacy tenant's data never leaves their cell; the long-tail runs in the primary cell; the whale tier gets a dedicated cell. Graduations (single PG → Citus, pgvector → Qdrant, AGE → FalkorDB, single-cell → cell-pair) are scheduled with triggers + duel-write + rollback (08 §7), never improvised at 3am.

This section defines the cell, the topology, the compute tiers, the three GPU price points, and the FinOps gates.

---

## 2. The cell abstraction

```
┌──────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge (global)                  │
│   Workers (auth/pixel/rate-limit) · KV · R2 Object-Lock (WORM)   │
└─────────────────────────────┬────────────────────────────────────┘
                              │ (per-cell routing; the JWT carries
                              │  tenant_id; the edge resolves cell)
   ┌──────────────────────────┴───────────────────────────┐
   │              Cell = a regional deploy                  │
   │  ┌──────────────────────────────────────────────────┐ │
   │  │ Control Plane (TS/Hono)  Decision+Action (Go/TS) │ │
   │  │ Perception fleet (Go)    Measurement (Py)       │ │
   │  │ LLM Gateway (TS/Go)      Temporal workers        │ │
   │  └──────────────────────────────────────────────────┘ │
   │  ┌──────────────────────────────────────────────────┐ │
   │  │ Data plane: Postgres(+AGE/pgvector) · ClickHouse│ │
   │  │ FalkorDB · Qdrant · Redpanda · Valkey · Vault    │ │
   │  └──────────────────────────────────────────────────┘ │
   │  ┌──────────────────────────────────────────────────┐ │
   │  │ GPU: sglang (privacy/whale only) · Modal (spike) │ │
   │  └──────────────────────────────────────────────────┘ │
   └───────────────────────────────────────────────────────┘
```

- **Cell affinity is sticky:** a tenant is assigned a cell at provisioning; their `AtlasCycle` runs entirely within that cell; no cross-cell synchronous calls in the hot path.
- **Cross-cell flow is only the de-identified aggregated `corpus_analytics` mirror** (08 §3): the per-tenant corpus rows stay in the cell; the cohort-level sufficient statistics replicate to a central analytics cell for cross-tenant standardization (the lift predictor's training).
- **Cell classes:**
  - **Primary cell** (long-tail): the GCP primary region (16 §3), per-token API models (11 §5 Tier A), shared data-plane.
  - **Privacy cell** (EU/regulated): a sovereign regional cell with self-hosted sglang (11 §5 Tier B), HSM-backed KEK under EU KMS, no egress.
  - **Whale cell** (high-volume tenants): dedicated GPU metal in the primary cell (or a co-located cell), owned-metal sglang, the cost-flip threshold (16 §5).
- **Adding a cell is an OpenTofu apply**, not a re-architecture; the cell template is parameterized by `(region, class, cohort_size)`.

---

## 3. The Cloudflare-edge + GCP-primary topology

### Edge (Cloudflare)
- **Workers** for the auth middleware (10 §7), the AI-referral pixel (the customer-site JS that fires the referral event), and the rate-limit KV.
- **R2 Object-Lock** stays on Cloudflare even though the rest is GCP — **the free egress is the core reason** (08 §4: the closed loop re-reads archived samples continuously; S3 egress would dominate). R2 is multi-region by default; the per-tenant prefix is the isolation unit.
- **KV** for edge session + the rate-limit counters' hot read path.

### Primary cloud (GCP)
- **GKE Autopilot** for the stateless services (Control Plane TS/Hono, Go probe fleet nodes, Python measurement workers, Temporal workers, the LLM gateway). Autopilot removes the node-management tax; the polyglot services run as separate Deployments with a shared contract (Buf, 09 §4).
- **Temporal:** self-hosted Temporal on GKE for the MVP (the workflow state in Postgres, co-located, 08 §2 `job_state`); Temporal Cloud GA-evaluation at the ~500-tenant cohort (⚠️-verify Temporal Cloud GA + multi-region; if GA with the SLA we need, the migration is a duel-write window — 17 §DEPLOYMENT). Self-hosted temporal-on-Postgres + the cluster also keeps the data plane co-located for low-latency signal/workflow coupling.
- **Postgres on AlloyDB** (the GCP-managed Postgres-compatible that supports the AGE extension + logical decoding for Debezium) for the truth-tx tier ⚠️-verify AlloyDB AGE-support (if not, self-managed Postgres-on-GKE-with-Patroni for AGE + CloudSQL for the non-graph tier; the AGE requirement may force self-managed until AlloyDB ships AGE). The truth-tx tier gets sync replicas + cross-region DR replica.
- **ClickHouse** on ClickHouse Cloud (the managed GCP-native) at MVP; self-hosted on GKE at the cohort where the bus storage cost flips (the Warpstream graduation, 14 §2, is the bus-side counterpart).
- **Valkey** on a small Memorystore-for-Redis-compat or self-hosted (Valkey-on-GKE; ⚠️-verify Memorystore's Valkey support timeline — if it's still Redis-7-compat OSS-only, self-host Valkey).
- **Redpanda** self-hosted on GKE (the MVP posture); Warpstream-on-GCS evaluation at the bus-storage-graduation cohort.
- **Cloud KMS / Cloud HSM** for the KEK (the privacy tier uses an EU-region HSM).
- **FalkorDB** + **Qdrant/Turbopuffer** brought up at their graduation triggers (08 §7), not at MVP.

### The non-negotiable cloud choice rationale
- **GCP over AWS:** AlloyDB's PG-compat + AGE path (if AGE ships there) is cleaner than RDS-Aurora's extension story; Cloud KMS/HSM is first-class; the GKE Autopilot node-management tax is lower than EKS; the committed-use discounts on G2 (GPU) instances are competitive. (The decision is reversible: the cell template's OpenTofu provider swap is bounded.)
- **Cloudflare-edge over each-cloud's-CDN:** Workers + KV + R2 + the edge-auth story is the cleanest at the AI-surface-probe scale (the rate-limiting hot path runs at the edge, not the origin); R2's free egress is the WORM-tier economic reason (08 §4).
- **⚠️-verify at the deployment phase:** the AlloyDB+AGE question, the Memorystore+Valkey question, the Temporal Cloud GA question are the open gates (none changes the architecture; each changes a deployment manifest).

---

## 4. The compute tiers (what runs on what)

| Workload | Runtime | Sizing policy | Spot/preemptible? |
|---|---|---|---|
| **Control Plane (TS/Hono)** | GKE Autopilot | HPA on RPS; min 3 replicas for HA | No (stateless but latency-sensitive) |
| **Go probe fleet** | GKE Autopilot, separate node pool | HPA on probe-queue depth; per-surface concurrency cap | **Yes** (E2/D Spot; probe retries + cool-down absorb preemption — 09 §1) |
| **Decision + Action workers** | GKE Autopilot | co-located with Temporal workers; sized on workflow concurrency | No (latency-sensitive for the Critic loop) |
| **Python Measurement batch** | GKE Jobs, separate node pool | scheduled + on spike | **Yes** (D Spot; the batch is resumable — Temporal's durable history restarts the activity) |
| **LLM Gateway** | GKE Autopilot | HPA on call-rate; the cost gate is at the gateway, not the autoscaler | No |
| **Temporal workers** | co-located with the Decision layer | sized on workflow-step throughput | No |
| **Self-hosted sglang** (privacy/whale cells) | dedicated GPU node pool (H100/H200/B200-class) | static, batched-serve, in the cell | No (dedicated metal; spot is untenable for live inference) |
| **Modal overflow** (training spikes, the whale's burst inference) | Modal (pay-per-second GPU) | on-demand, ephemeral | n/a (Modal's own bin-packing) |

The split: **stateless + latency-sensitive on Autopilot; bursty + resumable on Spot; GPU-served on dedicated (privacy/whale) or Modal-overflow (spikes).** The probe fleet on Spot is the single biggest variable-cost line; the probe's `M×N×K` retry/cool-down design (09 §1) absorbs Spot preemption by construction.

---

## 5. The three GPU price points (the Infra critique #3 fix)

The AI layer's three-tier provider strategy (11 §5) maps to **three price points** that the FinOps gate models before the Growth tier opens:

| Price point | When it's cheapest | Tenant cohort | Cost character |
|---|---|---|---|
| **Baseline — per-token API** (Claude/GPT/Gemini) | Low-and-spiky token volume; the load is unpredictable; the inflection point hasn't been hit | Long-tail (Tier A) | per-token, no fixed cost, scales linearly |
| **Spike — Modal pay-per-second GPU** | Bursty training/measurement; the peak exists 5% of the time; never size owned metal for it | All tiers (overflow) | per-second, no commitment, ephemeral |
| **Constrained — owned-metal sglang** (H100 cell) | High sustained token volume; the cost-flip threshold is crossed | Whale tier (Tier C), privacy tier (Tier B) | amortized fixed + electricity; marginal token ≈ free |

### The cost-flip threshold (modeled before opening Growth)
The threshold is the per-tenant token-spend above which the **owned-metal marginal cost** (amortized GPU + electricity + ops) falls below the **per-token API cost**. The model:
```
owned_cost_per_token = (annualized_gpu_capex + opex) / annual_token_throughput
api_cost_per_token   = provider's published rate (× the discount tier)
flip_threshold       = point where owned_cost_per_token < api_cost_per_token
```
- **For the MVP cohort (long-tail):** we are firmly in the per-token API regime; the flip is not crossed. We do not buy GPU metal for the long-tail cell.
- **For the privacy tier:** we buy GPU metal *not* because it cost-flips but because the **no-egress requirement forces self-hosting** (the constraint is regulatory, not economic; the metal is the cost of the privacy tier's unit economics — priced into the privacy-tier price, 02 §pricing).
- **For the whale tier:** a dedicated GPU cell flips the unit economics above the threshold; **the threshold is modeled + documented before the Growth cohort opens**, so the whale tier is opened only when the cost-flip is confirmed. (This is the Infra critique's required fix: model the 3 price points before the bill, not after.)

### The Modal-overflow discipline
- Burst overflow (a whale's 95th-percentile spike, a federated-training spike, a re-embed of the corpus after a supersession wave) goes to **Modal pay-per-second**, not to over-provisioned owned metal. Never size owned capacity for the peak that exists 5% of the time.
- Modal's GPU isolation is cell-bounded (no cross-tenant co-tenant leakage on the GPU; Modal's bin-packing guarantees this — ⚠️-verify Modal's 2026 isolation story for the privacy tier specifically; the privacy tier may need its own dedicated Modal-style account or a self-hosted equivalent).

---

## 6. Multi-region + DR

- **The primary cell** (us-central1 or equivalent) serves the long-tail + is the analytics-replication target.
- **The privacy cell** (EU region, e.g., frankfurt / europe-west) is sovereign: its KEK is EU-HSM, its sglang is EU-cell, its data never crosses the region boundary; R2 prefix + the per-tenant DEK enforce it (15 §4).
- **The whale cell** is co-located in the primary region or a dedicated cell, per-tenant.
- **DR posture:**
  - Postgres: primary + 2 sync replicas (one in-cell, one cross-region) (08 §2); the cross-region replica is the DR target; RPO ≈ the WAL archive interval (seconds); RTO ≈ the time to promote the cross-region replica + repoint the cell-routing.
  - R2: multi-region by default; DR is automatic.
  - ClickHouse: the analytical mirror is rebuildable from `assertion.events` + R2 (08 §5); DR is "rebuildable," not "replicated."
  - Temporal: the workflow history is in Postgres (the truth-tx tier); losing Temporal's own visibility store is recoverable from Postgres + the Redpanda replays; the closed loop restarts from the last persisted step.
- **Cell-pair DR (the SRE readiness closure, 00_FINAL §gates):** before enterprise contracts requiring a documented RTO, a paired cell (a hot-standby in a second region for the same tenant cohort) is stood up with continuous replication; cutover is rehearsed quarterly. This is gated behind the SRE-readiness closure, not the MVP.

---

## 7. FinOps — the cost gates that make Starter's margin reachable

The unit-economics target (≥75% gross margin at Starter, 02 §unit-economics) is *primarily a constraint on the LLM-token spend + the probe-fleet Spot spend + the bus storage*. The gates:

1. **Per-tenant token budget** (11 §2d) — the budget gate returns the `PlanNotGuess` fallback; no over-budget call fires. **The cost is bounded before the call, not after the invoice.**
2. **Weighted-fair scheduling** (11 §2d) — a whale cannot starve the long-tail's queue; the long-tail's small call gets served even when the whale is hammering.
3. **EVSI-allocated probe spend** (11 §2d) — the prioritizer down-weights high-token-cost low-information calls; we do not spend a 5k-token long-context Abduce on a 0.1-EVSI query.
4. **Spot for the probe fleet + the measurement batch** — the two biggest variable cost lines run on ephemeral capacity; resumability (Temporal + probe retries) absorbs the preemption.
5. **Reserved/committed-use discounts** for the baseline sustained load (Control Plane min-replicas, the Temporal-backing Postgres, the dedicated-metal sglang in the whale cell).
6. **Daily FinOps report** per cohort (long-tail / privacy / whale): token spend, GPU spend, bus storage, R2 storage, egress (R2's free egress is the one we don't worry about; the per-token API egress is zero; the probe-fleet's outbound probe traffic is the egress line to watch — the rate-limit (15 §7) bounds it).
7. **The cost-flip alert:** when a whale tenant's rolling token spend crosses the modelled flip threshold, a "this tenant is now cheaper on dedicated metal" alert fires; the ops manual is to provision (not auto-provision — the human checks the model + the tenant's trajectory first).

---

## 8. The graduation runbooks (scheduled, never improvised)

(Each triggers, duel-writes, validates, cuts over, with a rehearsed rollback — per 08 §7.)

| Graduation | Trigger | Action | Rollback |
|---|---|---|---|
| **PG → Citus** | ~300 tenants / ~800GB | Citus stands up; CDC backfills; reads shadow | Flip to single-PG; Citus as replica |
| **pgvector → Qdrant/Turbopuffer** | ~10M vectors OR HNSW build >30% write path | Qdrant stands up; index from Postgres; reads shadow | Flip to pgvector (re-index tax) |
| **AGE → AGE+FalkorDB** | ~1M assertion nodes OR p99 multi-hop >200ms | FalkorDB stands up; Debezium backfills; analytical reads shadow | Flip to AGE; FalkorDB as analytical shadow |
| **Redpanda → Warpstream-on-GCS** | bus storage > ~5 TB/day | Warpstream topic-mirror; consumers switch by config | Flip to Redpanda (the Kafka-API surface means zero code change) |
| **self-hosted Temporal → Temporal Cloud** | ~500 tenants OR the SRE closure | Temporal Cloud stands up; workflow history migrates; duel-write | Flip to self-hosted (the history is portable — Postgres-backed) |
| **single cell → cell-pair DR** | enterprise contracts w/ RTO requirement | hot-standby cell in second region; continuous replication; quarterly rehearsal | Flip routing to primary; standby as replica |
| **per-token API → owned-metal sglang** (per whale) | per-tenant cost-flip threshold crossed | dedicated GPU cell provisioned; traffic routed; duel-serve | Flip to API (the per-tenant config swap) |

The discipline: **only one graduation runs at a time per cohort; each is rehearsed; the duel-write window is the safety net.** The three concurrent graduations the Infra critique warns of (PG+Citus ‖ pgvector+Qdrant ‖ AGE+FalkorDB) are sequenced, not parallelized — the runbook's gate is "the prior cohort's graduation ended cleanly before the next starts."

---

## 9. The non-negotiable invariants (the infrastructure layer)

1. **The cell is the unit of scale, isolation, and cost.** Edge-fronted; GCP-primary; Cloudflare-R2 WORM; region-isolated; cross-cell flow is only de-identified aggregates.
2. **Three GPU price points modeled before the Growth tier opens:** baseline (per-token API), spike (Modal), constrained (owned metal). The cost-flip threshold is documented, not discovered from the bill.
3. **Spot for the bursty/resumable tiers (probe fleet, measurement batch); reserved for the sustained baseline; dedicated metal for live sglang inference.** Temporal + probe-retries absorb Spot preemption.
4. **R2 Object-Lock stays on Cloudflare for the WORM tier's free egress** even though the primary cloud is GCP. The closed loop's continuous re-read of archived samples makes S3 egress economically untenable.
5. **DR: Postgres cross-region sync replica; R2 multi-region; ClickHouse rebuildable from events; Temporal history in Postgres.** Cell-pair DR is the SRE-readiness closure, not the MVP.
6. **FinOps gates run before the call, not after the invoice:** per-tenant token budget; weighted-fair scheduling; EVSI allocation; Spot for variable lines; cost-flip alert.
7. **Graduations are scheduled with trigger + duel-write + cutover + rollback; only one runs at a time per cohort; the duel-write window is the safety net.** Never improvised.
8. **The privacy cell is sovereign:** EU-HSM KEK, EU-cell sglang, no egress, envelope encryption never decrypted outside the cell. The architecture's hardest isolation.

---

*End of infrastructure. Next: `17_DEPLOYMENT.md` — OpenTofu + Argo CD GitOps, the CI pipeline gates (RLS introspection, idempotency tests, contract-compat), the staged-promotion envs, the blue/green cell cutover, and the rollback procedure.*
