# Foundation — Technology Evaluation (15 layers, 2026)

> **Status:** regenerated inline by the founding engineering team after the upstream workflow lost this phase. Each layer: recommendation, why, ≥2 alternatives compared, 2026 maturity, risks, cost signal. Picks marked **⚠️-verify** are ones whose mid-2026 point-release status I want web-confirmed before final commit (the Bash/WebSearch classifier was intermittently unavailable during this run). None of these flags change the *recommendation*; they only confirm the maturity claim.

**Meta-principle for the stack:** Engenox is a *two-spine* system (typed bi-temporal KG = truth; counterfactual uplift estimator on a consented corpus = action) with six bounded LLM seams and a Temporal orchestrator. The stack must therefore optimize for: (1) a graph store that does bi-temporal typed assertions and openCypher with RLS-by-tenant isolation; (2) a streaming spine whose events ARE the typed assertions; (3) a durable workflow engine that can pair an intervention to its lagged measurement window across weeks; (4) a thin LLM gateway with constrained decoding, not an agent framework; (5) cheap cold storage for WORM audit (the corpus is the moat — it must outlive employee/architecture turnover). Everything else is a commodity.

---

## Layer 1 — Frontend framework & meta-framework

**Recommendation: Next.js 15 (App Router) on React 19, TypeScript, Tailwind CSS v4, Radix UI primitives, TanStack Query for server-cache, Zustand for ephemeral client state.** ⚠️-verify Next.js 16 GA status — if stable by the time MVP ships, adopt; if still RC, stay on 15.x.

**Why:** The Engenox UI is a data-dense B2B console — provenance subgraph panels, lift charts with CI bands, intervention DAGs, the autonomy dial, monthly lift reports. It is *not* a content site (so SSG/Astro not needed) and *not* a pure SPA (we want streaming RSC for snappy first paint on dashboards and route-level layout). App Router + RSC gives us streamed server components for the heavy provenance renders (the six explanation panels can render server-side against the GraphQL/REST gateway with zero client JS), partial prerendering for marketing/docs, and a clean path to edge auth via Next middleware. Tailwind v4 (Oxide engine) + Radix gives an accessible, design-system-friendly component base we fully own (no MUI/Chakra lock-in). TanStack Query is the right server-cache for a GraphQL+REST+SSE fanout. Zustand for the small amount of genuinely client-local state (the autonomy dial slider, in-flight probe previews).

**Alternatives considered:**
- **TanStack Start / React Router 7** — excellent, framework-agnostic, gives more portability; but the ecosystem gravity (Vercel edge, Next middleware, hiring) still favors Next in 2026 and the founder wants ship-velocity without re-inventing caching. Rejected for now, viable if we want to avoid Vercel lock-in.
- **Remix (now merged into React Router 7)** — same family; its loader/action model is clean but RSC is the longer-term bet.
- **SvelteKit 2** — best DX/perf, but the hiring pool and the design-system inventory (the provenance-graph vis ecosystem is React-heavy: reactflow, cytoscape.js) tilt to React. Rejected.
- **Astro 5** — wrong fit; it's for content. Rejected.

**2026 maturity:** Production-credible. React 19 stable (Actions, useOptimistic, the `use` hook), Turbopack stable for dev. ⚠️-verify Next 16.
**Risks:** Vercel lock-in is the main one — mitigate by keeping the app Vercel-agnostic (self-host on Fly.io / Container Apps / our K8s for the billing-sensitive production tier; use Vercel only pre-revenue and for preview/PR deploys). RSC + heavy client interop has rough edges (the "use client" boundary discipline).
**Cost signal:** Vercel Pro $20/seat + usage; self-hosted runtime is just container CPU. Cheap pre-scale.

---

## Layer 2 — Backend languages, runtimes & frameworks (polyglot or single?)

**Recommendation: Polyglot-but-layered.** Three service tiers:
- **Control plane + API + gateway + agent orchestration: TypeScript (Node 22 LTS, or Bun-runtime where safe) on Hono.** Shared types with the frontend (the typed `KnowledgeConflict`, `ActionRecord`, `Intervention` shapes are defined ONCE in a shared package and consumed by both Next.js and the backend). Hono is framework-light, runs on Node/Bun/Workers/edge, is the 2026 credible pick over Express/Fastify for new code.
- **Perception probe workers + measurement + heavy crawl: Go.** Goroutines are purpose-built for fanning out hundreds of concurrent AI-surface probes with per-probe timeouts/retries; pprof gives cheap flame-graph profiling; memory is predictable for long-running workers (the Bun/Node GC pause risk is real for 24/7 workers). Go is also the right call for the Temporal worker processes.
- **Causal/ML core: Python (3.12+) on a thin FastAPI service, isolated behind a strict gRPC/queue boundary.** The causal-inference ecosystem (econML, grf-bindings, sklearn, statsmodels, owl, doubleml, conformal-prediction libs) is Python-native and we will not reinvent it. The lift predictor, PRM, conformal calibrator, and the federated aggregation all live here.

**Why:** Single-language purity (all-TypeScript or all-Go) is the popular 2026 reflex; it's wrong here. The product has three workloads with three different dominant constraints: the API wants shared types with React and fast iteration; the probe fleet wants cheap concurrency and memory stability under load; the ML core wants the SciPy ecosystem and won't tolerate a reimplementation. Java/C# are credible but add an order of magnitude more ops surface for a small team. The cost of polyglot is one well-managed monorepo boundary (see Layer 15) — worth it.

**Alternatives considered:**
- **All-Go** — great for infra, but the causal-science layer fights it (grf/econML aren't idiomatic; cgo is a trap). Rejected for the ML tier.
- **All-Python** — great for ML, but the probe fleet and API gateway want concurrency and type-safety Python's async story can't match at this scale. Rejected for control+probe tiers.
- **Rust for the probe fleet** — best perf, wrong hiring/velocity for MVP. Reserve Rust for the LLM gateway's constrained-decoding hot path and any WASM sandbox we ship (Layer 9/15), not the fleet.
- **Bun-everywhere** — Bun 1.x is production-credible for APIs in 2026, but its GC and long-running-memory behavior is still not where Node 22/Go are for 24/7 workers. Use Bun as a *runtime* for stateless Hono APIs if benchmarks hold; do not bet the worker fleet on it. ⚠️-verify Bun 2.x LTS.

**2026 maturity:** Hono mature; Go 1.24 mature; FastAPI mature; econML/grf actively maintained.
**Risks:** Three languages = three build/test pipelines = real CI complexity (mitigated by the monorepo + Bazel/Nx, Layer 15). Type drift across the polyglot boundary is the silent killer — solved by code-generating TS types from the canonical Python/Go schemas (openapi-typescript, or a shared protobuf).
**Cost signal:** Languages are free; the cost is engineer cognitive load. Three tiers is the maximum a sub-30-person team can run well.

---

## Layer 3 — Relational/transactional database + multi-tenant scaling

**Recommendation: PostgreSQL 16 as the system of record, Citus for horizontal sharding beyond ~300 tenants, Row-Level Security as the tenant-isolation primitive, `pgvector` for the working-set embeddings, Apache AGE for the operational graph (co-located with Postgres).** Pgbouncer or PgBouncer/Supavisor in front. ⚠️-verify Citus on Postgres 17 (Citus 13 trails PG releases by ~6 months in 2026 — confirm PG16 row before committing).

**Why:** The truth spine is a *bi-temporal typed graph*. The operational tier of that graph (current-state entities, conflict nodes, in-flight `ActionRecord`s, tenant config, the autonomy-dial ledger) must be transactional, strongly consistent, and tenant-isolated — Postgres with RLS is the cleanest 2026 answer: one physical cluster, one logical schema, `tenant_id` on every row, RLS policies enforced at the session level via `SET app.tenant_id`, with a per-tenant crypto key in a separate KMS-held column (Layer 12). `pgvector` handles the working-set embeddings cheaply until we graduate (Layer 6). Apache AGE gives us openCypher over Postgres for the *operational* graph queries (the "what does ChatGPT believe about {Brand} right now" time-sliced reads) without a second datastore — the same ACID guarantee covers the assertion and its provenance. Citus is the escape hatch when a single node can't hold the assertion volume; it shards by `tenant_id` with co-located joins, so cross-tenant analytics go to ClickHouse (Layer 4) instead.

**Alternatives considered:**
- **CockroachDB** — excellent multi-tenant geo-distribution, but we do NOT need global active-active in the MVP (single-region + S3 replication is fine), and CRDB's per-row latency tax vs. PG is real for a tx-heavy workload. Re-evaluate for the "dedicated cell" escalation tier.
- **YugabyteDB** — same tradeoffs as CRDB; PG-wire compatible but heavier ops. Rejected.
- **Aurora Serverless v2 / Supabase** — fine hosted PG, but we want portability (fly.io / Crunchy / self-hosted). Use managed PG (Crunchy Bridge or Aurora) in prod; keep portable.
- **TiDB** — strong HTAP but heavier and we already have ClickHouse for the A side. Rejected.

**2026 maturity:** PG16 + RLS + pgvector + AGE all production-credible.
**Risks:** RLS is a footgun — a missed policy = cross-tenant leak; mitigated by (a) an integration test that asserts every table has a tenant-scoping policy, (b) a `SET app.tenant_id` middleware that aborts any query without it, (c) periodic tenant-isolation penetration tests (Layer 15). AGE is less mature than standalone graph stores at *large scale* — that's why we graduate to FalkorDB for the analytical graph (Layer 5).
**Cost signal:** A 4-vCPU Crunchy Bridge / Aurora instance ~$100–200/mo holds the first ~100 tenants. Citus adds ~2x at the sharding threshold.

---

## Layer 4 — Time-series / analytics / OLAP database

**Recommendation: ClickHouse (self-hosted single-shard → clustered) for all probe telemetry, assertion-analytics, measurement windows, lift-trajectory time series, and the CIO corpus's analytical mirror.** Replicate WORM snapshots to Cloudflare R2 (Layer 11) for the immutable audit copy.

**Why:** The measurement closed loop is *made* of time series: M queries × N samples × K surfaces, repeated daily, with per-sample mention/sentiment/citation, lagged outcome windows of days–weeks, EWMA/CUSUM residual control charts, and the `clean/suspected-bump/confirmed-bump/period-invalid` foreign-change tagging rolled up per surface per tenant. This is a columnar OLAP workload at the scale of billions of rows, and it is exactly what ClickHouse dominates: 10–100x the scan throughput of Postgres for these aggregations, MergeTree's ability to downsample verbatim samples to distributions after ~90 days (the "principled forgetting" from the intelligence core), and materialized views for the degradation-alert CUSUM. Postgres cannot serve this at scale without drowning. The CIO corpus's *analytical* mirror (sufficient statistics for the causal estimator) lives here; the *canonical signed immutable* copy lives in R2 + a small Postgres manifest (the corpus's authoritative provenance is tamper-evident storage, not a hot OLAP engine).

**Alternatives considered:**
- **DuckDB** — brilliant for single-node embedded analytics and for the per-tenant "your data, exported" CSV/Parquet generation; use DuckDB *on top of* the Parquet exports, not as the central OLAP. Complementary, not competing.
- **TimescaleDB** — Postgres-native, ops-simple, but it is still Postgres under the hood; at multi-billion-row telemetry it loses to ClickHouse's columnar compression by a wide margin. Rejected as the central store; fine for the small operational time-series if we want one fewer DB.
- **Druid** — strong for sub-second UI slices, heavier ops than ClickHouse, and we don't need its real-time ingestion edge over ClickHouse's. Rejected.
- **Apache Pinot** — similar to Druid; better at ad-hoc but heavier. Rejected.
- **Snowflake / BigQuery** — pay-per-scan punishes a closed loop that queries itself continuously; great for the *public* AI Visibility Index publishing, wrong for the hot internal loop. Rejected for internal; BigQuery retained as an option for the published Index.

**2026 maturity:** ClickHouse Cloud mature; self-hosted mature.
**Risks:** ClickHouse's weak point is updates/deletes (the ReplacingMergeTree async-compaction model) — the corpus needs append-mostly + the rare supersession, which maps cleanly to its model, but per-row mutable state must stay in Postgres. Rebalances on a sharded cluster are operator-heavy — start single-node, shard later.
**Cost signal:** Self-hosted single-shard 8-vCPU/64GB ~$150–300/mo for the first thousand tenants; CH Cloud ~2x for managed convenience.

---

## Layer 5 — Graph database

**Recommendation: Two-tier. Operational graph in Apache AGE (Layer 3, co-located with Postgres). Analytical/working-set graph graduates to FalkorDB when AGE can't keep up with the multi-hop bi-temporal queries over the full assertion history.** ⚠️-verify FalkorDB production momentum + multi-tenancy isolation maturity (it's the least-seasoned pick in this stack).

**Why:** The truth spine's queries bifurcate: (a) current-state and recent-window reads ("what does ChatGPT believe about {Brand} this week, and what conflicts exist against the SOT?") — these are shallow, transactional, and must share the ACID guarantee of the assertion write; AGE on the same Postgres cluster is ideal and removes a distributed-transaction seam. (b) Deep traversal reads the agents make during a thinking cycle — GraphRAG community-summarized subgraph pulls, multi-hop counterfactual-challenge walks, the explanation-rendering provenance fanout — these are read-heavy, analytical, and benefit from a purpose-built graph engine with sub-millisecond multi-hop. FalkorDB (over a Redis-compatible stack, claimed order-of-magnitude faster multi-hop than Neo4j at teh memory footprint) is the 2026 credible challenger to Neo4j for this; it is open-source, runs in our own K8s, and avoids Neo4j's Enterprise license cost. The graduation path is explicit in the intelligence core: AGE first, FalkorDB when working-set reads force it — **not on day one.**

**Alternatives considered:**
- **Neo4j** — the reference standard, brilliant Cypher, mature, but the Enterprise Edition (RLS, clustering, multi-tenancy) is expensive and lock-in-y; Community lacks HA. Use only if FalkorDB stumbles; strong fallback.
- **Memgraph** — in-memory, very fast, good Cypher, EU-based (nice for GDPR posture); a real FalkorDB alternative. Marginal vs FalkorDB on license + tee'd-in algorithm library.
- **TigerGraph** — powerful for deep-link analytics but a heavier ops model and a proprietary query language (GSQL); wrong fit for a small team iterating Cypher.
- **NebulaGraph / HugeGraph** — capable but smaller ecosystems; no edge over FalkorDB/Memgraph for us.
- **Stay Postgres+AGE only** — tempting for ops simplicity; rejected because the working-set multi-hop reads on the full assertion graph will exceed AGE's comfort zone within the first 1–2k tenants, and we'd then migrate under pressure instead of on schedule.

**2026 maturity:** AGE production-usable for operational queries; FalkorDB production-credible but younger than Neo4j ⚠️-verify.
**Risks:** A second graph store is real operational surface; the graduation must be scheduled, not improvised. FalkorDB's multi-tenant isolation story is thinner than Neo4j's — mitigate by per-tenant logical namespaces + a shard map, not by trusting the engine to isolate.
**Cost signal:** AGE = free on the existing PG cluster. FalkorDB self-hosted on a 16-vCPU node ~$200/mo. Neo4j Enterprise ~$$$$ (six-figure at scale) — the reason we avoid it.

---

## Layer 6 — Vector database / embeddings store

**Recommendation: Two-tier mirroring the graph choice. `pgvector` (in the Postgres cluster) for the working-set / operational embeddings (entity cards, recent probes, the retrieval index for the memory router); graduate to Qdrant (self-hosted) or Turbopuffer (serverless) only when vector volume forces it.** ⚠️-verify Turbopuffer GA + multi-region + durability guarantees; ⚠️-verify Qdrant 1.x scale numbers.

**Why:** The "retrieval" workload here is * Grinding* — the memory router pulls a GraphRAG community-summarized subgraph, and the playbook library retrieval finds "similar prior interventions." Both need vector search over embeddings that are mostly *tenant-scoped and frequently warm*. `pgvector` (HNSW index, in the same Postgres with RLS) gives us tenant-isolated vector search with zero new infra and one fewer consistency seam — it's the right MVP choice and handles hundreds of thousands of vectors per tenant comfortably. We graduate only when the *combined* vector count crosses ~10M or the HNSW build cost at ingest starts to dominate Write throughput. At that point: Qdrant (purpose-built, Rust, fast, mature, self-hosted, cheap) is the conservative production pick; Turbopuffer (S3-backed serverless, ~10x cheaper at scale, no idle cost) is the aggressive pick IF its GA durability/latency SLA holds in 2026 — its economics are uniquely good for a star: pay-per-query at the long tail of tenants.

**Alternatives considered:**
- **Pinecone serverless** — credible, easy, but proprietary and per-query pricing adds up across a closed loop that queries itself continuously; vendor lock-in. Rejected for the hot internal index; could serve the marketplace/third-party plugin burden later.
- **Weaviate** — capable, but its module/GPU story adds ops weight without an edge over Qdrant for our workload. Rejected.
- **Milvus** — strong at very large scale (10M+), heavier ops; only revisits if Qdrant tops out.
- **Chroma** — great for prototyping, not for our prod scale. Rejected.
- **stay on pgvector permanently** — viable longer than people think (pgvector HNSW + CDC is genuinely good now); but the federated retrieval across the playbook library at fleet scale will want a dedicated store. The graduation is eventual, not immediate.

**2026 maturity:** pgvector HNSW production-credible; Qdrant mature; Turbopuffer ⚠️-verify GA.
**Risks:** Migration off pgvector to a dedicated store means a re-index over historical embeddings — schedule the graduation, do it once. Turbopuffer's cold-query latency (S3-backed) is fine for the playbook library (low-frequency high-recall) but wrong for the live memory router (low-latency) — keep the *hot* working set on pgvector/Qdrant and the *cold* fleetwide playbook index on Turbopuffer.
**Cost signal:** pgvector = free on existing PG. Qdrant on a 16-vCPU node ~$200/mo. Turbopuffer ~$0.011/1k vector-months + query $ — near-free for the long tail.

---

## Layer 7 — Streaming / event spine

**Recommendation: Redpanda (self-hosted, KRaft, no ZooKeeper) OR Warpstream (if we want zero-ops S3-backed), Kafka protocol-compatible.** ⚠️-verify Warpstream's post-acquisition GA tier under Confluent. Default pick: **Redpanda** for control; treat the assertion bus as the spine's tap.

**Why:** The assertion-and-event bus is the spine's *tap* — every typed assertion (Perception writes), every conflict node, every `ActionRecord`, every measurement outcome flows through it before landing in Postgres/AGE/ClickHouse/R2. Kafka protocol compatibility matters because the ecosystem (Connect, Schema Registry, rdkafka clients in TS/Go/Python, Debezium for Postgres CDC) is non-negotiable; going off-protocol (NATS/JetStream, Pulsar) forfeits that. Among Kafka-compatible options in 2026: Redpanda is the thread-per-core C++ engine, no JVM, no ZooKeeper, order-of-magnitude lower ops tax than Apache Kafka clusters — the right self-hosted pick for a small team. Warpstream (S3-backed, zero local storage, pay-for-throughput-only) is the right pick *if* we want zero storage ops and accept slightly higher per-message latency; it was acquired by Confluent, so ⚠️-verify its stand-alone GA pricing/tiering in mid-2026. **Default: Redpanda.** Plain Apache Kafka is always the no-regret fallback but it's heavier on ops than Redpanda for us.

**Alternatives considered:**
- **Apache Kafka (self-hosted) / Confluent Cloud** — the standard; rejected as default only because Redpanda is strictly simpler ops for the same protocol. Confluent Cloud is a fine managed escape hatch if we want to stop running brokers.
- **Warpstream** — see above; strong contender, deferred pending mid-2026 GA confirmation.
- **NATS JetStream** — lovely, simpler, lighter, but non-Kafka-protocol = smaller ecosystem for the CDC/Schema-Registry surface we want. Keep as a candidate for a *narrow* internal control bus if Kafka feels too heavy for one subsystem.
- **Amazon Kinesis** — lock-in; rejected.
- **AWS SQS / GCP PubSub** — fine as point-to-point queues (and fine for the AI-surface probe fan-out trigger), but the assertion bus needs replayable, partitioned, schema-validated ordering — Kafka-protocol wins.

**2026 maturity:** Redpanda mature; Warpstream ⚠️-verify post-acquisition.
**Risks:** Topic sprawl without a schema registry (use Buf/Confluent Schema Registry + Avro/Protobuf from day one; every assertion event is a versioned schema). Replication factor 3 minimum; cross-region mirror for the R2 WORM pipeline.
**Cost signal:** Redpanda 3-broker cluster on 8-vCPU/200GB NVMe ~$400–600/mo. Warpstream pay-throughput (comparable or cheaper at low volume, no idle brokers). Runs the whole event spine for thousands of tenants on this footprint.

---

## Layer 8 — Job queues & durable workflow engine

**Recommendation: Temporal (self-hosted Postgres-backed, or Temporal Cloud at scale) for the closed loop's durable workflows. A thin queue (Redis Streams or Redpanda itself) for short-lived brokered jobs (probe fan-out triggers, webhook deliveries).** ⚠️-verify Temporal Cloud GA multi-region + pricing.

**Why:** The closed loop is *long* — an intervention's measurement window is days to weeks; the `perceive→decide→act→measure→tag-and-append→refresh-models` saga must survive process crashes, deploys, and weeks of wall-clock without losing the causal pairing between an action and its outcome. This is *exactly* what Temporal is built for: durable execution, replay-based recovery, activity retries with backoff, child-workflows for the per-tenant `AtlasCycle`, signals for human-approval gates (the autonomy dial's `execute-with-approval`), and idempotency keys so a re-executed activity doesn't double-open a PR. Engineers habituated to Celery/BullMQ/RabbitMQ underestimate how badly those handle multi-week sagas. Temporal is non-negotiable for this product. Short-lived fire-and-retry workloads (the probe fan-out trigger, outbound webhooks) don't need Temporal's overhead — a Redis Stream or the Redpanda topic itself with a consumer-group worker is right there.

**Alternatives considered:**
- **Restate** — the 2026 challenger; Rust-based, durable execution as a service, lighter than Temporal, "invocations" model. Credible and worth a spike, but Temporal's library of patterns (signals, queries, update API) and its huge ecosystem make it the safe pick; Restate is "if Temporal's ops tax becomes painful." ⚠️-verify Restate 1.x GA + the Temporal-vs-Restate 2026 calculus.
- **DBOS / Hatchet / Inngest** — credible newer entrants; Hatchet is slick for the queue+workflow middle ground; Inngest is great for event-driven app workloads. None match Temporal for multi-week sagas at the rigor we need. Rejected as the *primary*; Inngest could serve the public webhooks-in tier later.
- **Celery / BullMQ / Sidekiq** — these are task queues, not durable workflows; they cannot reliably pair an action to an outcome across a redeploys-and-weeks window. Rejected for the spine.
- **AWS Step Functions** — capable for the AWS-locked use case; lock-in + per-state-machine pricing at our invocation volume is painful. Rejected.

**2026 maturity:** Temporal mature (Temporal Cloud GA ⚠️-verify multi-region). Self-hosted Temporal on Postgres is the MVP-grade choice (reuses the PG cluster).
**Risks:** Temporal's operational learning curve is real; mitigate with the self-hosted Postgres backend (no Cassandra) and a single shared cluster with per-tenant namespaces until ~1k tenants, then shard. Workers must be idempotent — the closed loop makes this natural (every action has a determinstic idempotency key from `(tenant_id, cycle_id, intervention_id)`).
**Cost signal:** Self-hosted Temporal on the PG cluster = ~free (a few extra vCPU). Temporal Cloud ~$0.04/workflow-execution + activity KB — cheap until thousands of active workflows.

---

## Layer 9 — AI runtime, agent orchestration, model routing & gateway

**Recommendation: A custom thin LLM gateway (in-house, TS/Go) that wraps the LiteLLM-proxy routing core, with constrained-decoding enforcement at the seam to the models. NO heavy agent framework (LangGraph/CrewAI/AutoGen) as the spine — only their utilities bolted on where needed.** Models: Anthropic Claude (primary planner/drafter), OpenAI GPT (cross-family Critic for correlated-failure avoidance), Google Gemini (third family + long-context agent cycles), Perplexity (Sonar — as a *probe target*, not a reasoning model), plus self-hosted vLLM/sglang for the privacy-tier / big-tenant cells (Layer 10).

**Why:** The intelligence core is explicit: an LLM may *propose*, never *commit*; there are exactly six stateless schema-constrained LLM seams (Extract, Draft, Adjudicate, Embed, Abduce, Critique). This means *the agent orchestration IS the workflow* (Temporal) around six bounded LLM calls — not a graph-of-agents framework. A heavy agent framework as the spine would re-introduce exactly the un-auditable reasoning the two-spine design was built to eliminate. So the right artifact is a *thin gateway* that (a) routes to the right provider/model by task+tenant+cost, (b) enforces the constrained-decoding contract (Outlines/XGrammar/GBNF) for Extract/Adjudicate/Draft/Embed so the model can only emit terms in the tenant's SHACL shapes, (c) re-grounds every output against the KG before it touches a spine, (d) records Langfuse-style spans, (e) budgets per-tenant token spend so whales can't starve the long tail. LiteLLM gives us the multi-provider routing primitive; we wrap it with our constrained-decoding + re-grounding + cost-control layer. Cross-family Critic (Claude vs GPT vs Gemini) is the correlated-failure break — the founder's requirement.

**Alternatives considered:**
- **LangGraph / LlamaIndexAgents** — popular, but they enshrine LLM-as-spine reasoning; our design *rejects* LLM-as-spine explicitly. Use only as a *utility* if a specific workflow needs a reactive subgraph; never the architecture.
- **CrewAI / AutoGen** — multi-agent role frameworks; wrong fit for our bounded-six-seam model. Rejected.
- **LiteLLM-proxy alone (no wrapper)** — gives routing but not constrained decoding + re-grounding + the autonomy-dial cost gate; not enough.
- **Portkey / OpenRouter (hosted gateway)** — credible hosted gateways; Portkey in particular has good LLM-observability. Use for the *first* MVP pass if self-hosting the gateway delays ship; the wrapper logic (constrained decoding, re-ground, cost gate) is what we own and port in later. ⚠️-verify Portkey 2026 features.
- **Vercel AI SDK** — excellent for the Next.js chat/streaming UI (the explanation panels' dry-run toggle SSE); use it in the *frontend*, not as the backend agent spine.

**2026 maturity:** Anthropic/OpenAI/Google/Perplexity APIs mature; Outlines/XGrammar mature for constrained decoding; LiteLLM mature.
**Risks:** Constrained decoding quality varies by provider (Anthropic's tool-use/JSON mode is excellent; some providers fight GBNF); mitigate by keeping the constrained-seam prompts short and the SHACL vocabularies bounded. Provider outages: the cross-family Critic + the "degrades to symbolic rules + causal scorer" fallback covers this (the proposing layer is dereferenced from the critical path).
**Cost signal:** This is the dominant variable cost. At ~$0.01–$0.03 per rich probe answer and ~$1–$3 per planning cycle, a 100-tenant book is ~$2–8k/mo in inference; cost-control gating is the戈dthat keeps unit economics alive (see 16_INFRASTRUCTURE).

---

## Layer 10 — Inference serving (self-hosted) + provider strategy

**Recommendation: API-first by default for the long tail of tenants. Self-hosted vLLM or sglang on GPU nodes (H100/H200 or the 2026 B200/GB200 class) ONLY for (a) the privacy/enterprise tier tenants whose data can't egress to Anthropic/OpenAI, and (b) the big-whale tenants where the unit economics flip in favor of dedicated capacity.** ⚠️-verify 2026 GPU supply + spot availability; ⚠️-verify sglang vs vLLM performance parity.

**Why:** The federated-learning + DP-SGD path the intelligence core names requires a *training* substrate (the PRM, the lift predictor, the conformal calibrator, the surface-dynamics models) — that's a Python/ML workload (PyTorch, possibly with the 2026 frameworks), not an inference-serving decision per se. The inference-serving decision is *who runs the frontier-model calls and on what metal*. For 90%+ of tenants, the answer is "call the API" — the closed loop's token volume is modest and API unit economics win. The exception is the privacy tier (EU/regulated tenants whose consented corpus can't egress) and the whale tier (where a dedicated H100 serving Qwen/Llama-4/some 2026 open frontier model with sglang is cheaper than per-token API). We host those on our own GPU cells, served by the thin LLM gateway's routing layer (Layer 9). vLLM and sglang are the 2026 picks; sglang has pulled ahead on throughput for structured outputs (which is exactly our constrained-decoding workload), so **lean sglang for the self-hosted seams**, with vLLM as the breadth/compat fallback.

**Alternatives considered:**
- **All-API, no self-host** — simpler, but the privacy tier and the whale unit-economics demand self-host; and the federated-learning *training* needs GPU anyway. Rejected as a permanent stance; fine as the day-one posture.
- **TGI (HuggingFace)** — credible, eclipsed by vLLM/sglang on perf for our structured-output workload. Rejected.
- **TensorRT-LLM** — fastest for fixed-shape inference, but its build/quantize loop is heavier than vLLM/sglang for a small team; revisit only for the highest-volume single model if it dominates cost.
- **Modal / Replicate / Together / Fireworks (hosted open-model inference)** — excellent for spiky load and for the privacy tier at sub-whale volume; сильный option for the middle tier (privacy-but-not-whale). Use Modal for the training jobs' GPU spikes (the federated refit runs), self-host only the steady-state whale capacity.

**2026 maturity:** vLLM/sglang mature; hosted open-model providers mature. GPU supply for self-hosting remains the real risk ⚠️-verify.
**Risks:** GPU CapEx/spot-price volatility is the #1 infra risk; model it at 3 price points in 16_INFRASTRUCTURE. Right-sizing self-hosted capacity (overprovision = wasted CapEx; underprovision = angry whale) — start on hosted providers, consolidate to owned metal only once steady-state demand is empirically known.
**Cost signal:** H100 on-demand ~$2–4/hr; spot ~$0.80–1.50/hr; a dedicated whale cell maybe 2–4 H100s = $6–15k/mo. Modal training spikes: pay-per-second, kilo-dollars per federated refit round.

---

## Layer 11 — Caching, object storage, CDN/edge

**Recommendation: Cloudflare R2 for object storage (the WORM audit copy of the corpus + raw probe snapshots + page snapshots) with free egress; Cloudflare Workers/KV/Durable Objects for edge auth, rate-limiting, and the attribution pixel's first-hop; Redis (Valkey in 2026 — the Redis-SSPL fork) for hot caches (session, rate-limit counters, the per-tenant working scratchpad hot-subset, probe idempotency keys); OpenSearch **or** Quickwit for the verbatim-answer full-text/citation search (the "find every probe sample that mentioned competitor C" workload). ⚠️-verify Quickwit 1.x GA as the cheaper OpenSearch alternative.

**Why:** The corpus's *immutable, signed* copy must outlive the OLAP engine (Layer 4) — R2 with object-lock (WORM via S3 Object Lock) gives us tamper-evident storage at near-zero egress cost (R2's defining economic advantage over S3 in 2026). The AI-referral attribution pixel is a *global edge* problem (low-latency first-hop, jurisdictional data handling) — Cloudflare Workers at the edge is purpose-built and cheap. Redis for the hot path is non-controversial; in 2026 the open-source choice is **Valkey** (the Linux Foundation fork after Redis went SSPL), which avoids the Redis license risk. Full-text over verbatim probe answers ("show me every sample where Gemini cited competitor C in the last 30 days") needs an inverted index — OpenSearch is the established pick; Quickwit (Rust, S3-backed, much cheaper at petabyte scale) is the 2026 challenger worth a spike, especially since our verbatim-answer archive lives in R2 already and Quickwit reads S3 natively.

**Alternatives considered:**
- **AWS S3 (incl. Glacier)** — fine, but egress costs punish the closed loop's constant re-read of archived samples; R2 with free egress is a structural win for a corpus-heavy product. Use S3 only for the AWS-locked glacier-tier of compliance archives in specific tenants' accounts.
- **Vercel Blob / Supabase Storage** — fine, but R2's free-egress economics win for a corpus product. Rejected as the central store.
- **Elastic / Elasticsearch** — heavy, expensive, the OpenSearch fork already avoided the Elastic license; OpenSearch is the cleaner 2026 pick.
- **Meilisearch / Typesense** — great for product search, not built for the scale of full-text over billions of probe-sample tokens. Rejected for this workload (likely fine for the in-app settings/admin search).
- **Redpanda/ClickHouse for the cache** — not caches; wrong tool. Rejected.

**2026 maturity:** R2 + Workers mature; Valkey mature; OpenSearch mature; Quickwit ⚠️-verify GA.
**Risks:** R2 Object-Lock WORM config must be set up correctly at bucket creation (can't easily retrofit compliance mode); get it right day one. Edge-worker cold-starts are fine now but watch the per-tenant KV consistency (Durable Objects for the small set of strongly-consistent edge state).
**Cost signal:** R2 storage ~$0.015/GB-mo + **free egress** — transformative for a corpus product. Valkey on a 4-vCPU node ~$80/mo. Quickwit = pay-for-compute-querying-S3, near-free at ingest. This layer is *cheap*.

---

## Layer 12 — Authentication, authorization, secrets management

**Recommendation: OIDC auth via a hosted identity provider (Clerk or WorkOS — WorkOS for the enterprise/SSO/SAML angle that agency + ICP needs), session JWTs, OPA (Open Policy Agent) or Cedar (GitHub's policy language) for the autonomy-dial + blast-radius + tenant-permission policy layer, HashiCorp Vault (or AWS Secrets Manager / Doppler/HCP Vault Radar 2026) for secrets, and a per-tenant envelope-encryption key hierarchy stored in KMS with the DEK in Postgres (encrypted) and the KEK in HSM-backed KMS.** ⚠️-verify Clerk-vs-WorkOS 2026 enterprise-feature parity.

**Why:** Auth splits into three concerns. (a) **Identity** — who the human is; OIDC federated to Google/GitHub/SSO. WorkOS wins here for the agency ICP because agencies *will* ask for SAML SSO and directed-SCIM provisioning at the Growth tier; Clerk is slicker for the self-serve Starter flow but has historically trailed on enterprise SSO depth. Pick WorkOS as the primary, Clerkian flows are replicable. (b) **Authorization** — what an agent/human/system is *permitted* to do. The autonomy dial (`read→recommend→draft→propose→execute-with-approval→guarded→autonomous`) plus blast-radius plus tenant permission scopes are *policies*, not code — they belong in a policy engine, evaluated deterministically before AND after the proposing layer reasons (per the intelligence core). OPA (Rego) is the default; **Cedar (now with a validation + type system, AWS-backed + open-source)** is the cleaner 2026 choice for a typed policy domain like ours — its policy-validation catches errors OPA-Rego's ad-hoc types miss, and it integrates with the typed schema we already have. Either way the policy gate is a *symbolic* commitment, structurally impossible for an LLM to override. (c) **Secrets** — API keys, the per-tenant Git/CMS tokens, the AI-provider keys, the per-tenant crypto keys. Vault or HCP Vault Radar (the 2026 Vault successor path) / AWS Secrets Manager / Doppler; the right shape is *short-lived dynamic secrets + envelope encryption*, not static keys in env vars. The per-tenant corpus-row signer must use a per-tenant key (HSM-backed KEK → envelope-encrypted DEK in Postgres) so a clone of the database is unintelligible to anyone without the KMS-held KEK.

**Alternatives considered:**
- **Clerk (sole auth)** — great DX, lighter on enterprise SSO. Could still be the Starter-tier only IDP and WorkOS the Growth-tier; but running two IDPs is more ops than one. Pick WorkOS.
- **Auth0** — credible, mature, but pricing + the Okta-era complexity makes it a third choice.
- **Self-built auth** — never. Rejected.
- **Casbin / AWSZ* approach** — fine for simple RBAC; the autonomy dial + blast-radius + per-context overlap-gate is richer than RBAC and wants a real policy engine; OPA/Cedar it is.
- **Plain env-var secrets** — rejected; corp-cred-leak risk intolerable at a corpus product where trust is the moat.

**2026 maturity:** WorkOS mature; Cedar mature + improving; OPA mature; Vault / HCP Vault Radar mature.
**Risks:** Policy-engine latency on the hot path (every action passes through OPA/Cedar twice) — keep policies compiled+cached, profile the gate. Per-tenant key rotation must be non-disruptive (envelope rotation, not re-encrypt-every-row).
**Cost signal:** WorkOS free→ ~per-MAU tier; Cedar/OPA self-hosted = free; Vault ~$0–100/mo self-hosted, HCP Vault tiers by usage. Cheap.

---

## Layer 13 — Observability: metrics, logs, traces + LLM evaluation

**Recommendation: OpenTelemetry as the universal wire format; a Grafana stack (Mimir for metrics, Loki for logs, Tempo for traces) OR a vendor (Grafana Cloud / Honeycomb / Datadog at the rich-traces tier); for the LLM surface, Langfuse (self-hosted) or Arize Phoenix for the per-prompt tracing + the LLM-as-judge eval harness.** ⚠️-verify Phoenix vs Langfuse 2026 feature parity for the eval/annotation workflow.

**Why:** The intelligence core says OpenTelemetry + Langfuse-style spans unify telemetry across *every* graph query, rule eval, and LLM call, so a single eval harness and a single root-cause trace cross all layers. That dictates the design: emit OTel spans from the Temporal workflows, the Go probe workers, the Hono API, the Python ML service, the LLM gateway, and the Cedar policy gate — one trace from `AtlasCycle.start` through the critic veto to the `ActionRecord.commit` and the measurement-window outcome. For the backend-of-observability, choose by tier: self-host Grafana (Mimir+Loki+Tempo) for cost control and no vendor lock-in; if the team is small and the trace-cardinality is high, Honeycomb's high-cardinality model is genuinely better for the "why did this decision defer?" kind of query and worth the money. For the LLM-specific surface (per-prompt input/output, token cost, constrained-decoding pass/fail, the LLM-as-judge triage on the sampled slice, the Argilla human-review queue handoff), Langfuse (self-hosted, OSS, mature in 2026) is the default; Arize Phoenix is the stronger *eval-experiment* tool and integrates with the conformal-calibration / PRM eval runs.

**Alternatives considered:**
- **Datadog** — great, expensive, LLM-obs add-on is younger than Langfuse/Phoenix; use for infra metrics if Grafana self-host feels too heavy, but the LLM eval stack stays OSS.
- **New Relic / Splunk / Dynatrace** — credible, heavier, expensive; no edge over the Grafana+Langfuse stack for us.
- **LangSmith (LangChain)** — good LLM tracing, binds to the LangChain ecosystem we're explicitly *not* using as the spine; Langfuse is the vendor-neutral choice.
- **W\&B / Weights-Biases** — fine for the ML-experiment tracking (the causal-model training runs, the PRM eval sweeps); use it for *ML experiment* tracking, not for production-LLM tracing. Complementary.
- **Homegrown** — rejected; OTel + existing tools obviates it.

**2026 maturity:** OTel mature; Grafana stack mature; Langfuse mature; Phoenix maturing fast ⚠️-verify.
**Risks:** Trace-cardinality explosion (per-probe-sample spans blow the budget) — use OTel span-links + sampled long-tail traces, full-fidelity only for in-flight decision cycles. Loki's log-query latency at scale is the weak spot; ClickHouse already holds the structured telemetry for the closed loop, so plain logs in Loki + structured events in ClickHouse is the split.
**Cost signal:** Self-hosted Grafana stack = a cluster (~$300–600/mo) + storage. Honeycomb / Datadog = usage-tiered, $$$ at high-cardinality. Langfuse self-hosted = free + its own PG/ClickHouse. Keep the prod telemetry budget to <2% of infra cost.

---

## Layer 14 — Deployment, orchestration, cloud, IaC, GitOps

**Recommendation: ONE cloud for the MVP (pick by GPU + Postgres + R2-equivalent economics — see below), Kubernetes (managed — EKS/GKE/AKS), Argo CD (GitOps) + Terraform/OpenTofu (IaC, OpenTofu is the 2026 Terraform-MPL fork) for infra, Helm/Kustomize for manifests, GitHub Actions for CI. Containarized services; Pulumi considered for the multi-cloud graduation only.** ⚠️-verify OpenTofu 1.x production registry support.

**Why:** Multi-cloud is a distraction at MVP scale and the founder's directive is "managed K8s on ONE cloud." The product has three defining infra needs: Postgres + ClickHouse (CPU/storage), GPU for the privacy/whale inference + training (Layer 10), and cheap object storage with free egress for the corpus WORM copy (Layer 11). The economics of those three tilt the cloud choice:
- **Cloudflare** owns the edge + R2 (free egress) — but it has no real Postgres/ClickHouse/GPU story, so it's a *layer*, not the cloud home.
- **AWS** has the deepest GPU (P5en, the 2026 B200/GB200 capacity) + Aurora + MSK + S3 — but egress costs on the corpus are the structural penalty, and AWS's K8s (EKS) is fine but cluster-management tax is real.
- **GCP** has excellent Postgres (AlloyDB), BigQuery (for the public Index), TPU/GPU, and Clean-room IP for the federated-learning TEEs — and its ClickHouse / GKE story is solid.
- **Azure** has the enterprise-sales angle (ea-able EA contracts, maybe relevant for the privacy tier / regulated tenants) + good GPUs + a strong confidential-VM / SEV-SNP story (the federated TEEs).

**Pragmatic 2026 pick: GCP as the primary cloud** (AlloyDB for Postgres with RLS, GKE Autopilot for K8s-with-ops-tax, BigQuery for the published Index, Confidential VMs for the federated TEEs, decent GPU quota) **+ Cloudflare in front** (Workers/KV/R2 for the edge + corpus WORM copy). Use AWS only when a specific tenant/regulated deal demands it. This is a deliberate single-cloud-with-edge-partner decision, not multi-cloud.

For IaC: Terraform is the incumbent but its MPL→BUSL license shift in 2024 created the OpenTofu fork; in 2026 OpenTofu is the open-source production choice (and the Linux Foundation registry is mature ⚠️-verify). Pulumi (TypeScript IaC) is appealing for a polyglot TS-heavy team and is the right tool if/when we add a second cloud (its multi-cloud abstraction is real) — but for ONE cloud, OpenTofu + modules is simpler. GitOps: Argo CD (declarative, mature, the de-facto 2026 pick over Flux by a hair). CI: GitHub Actions (assuming GitHub is the VCS).

**Alternatives considered:**
- **Multi-cloud from day one** — the founder's directive rejects this; right call. Deferred to regulated-tenant graduation.
- **Serverless-everything (Lambda/Cloud Run/Fly Machines)** — right for spiky small workloads; the closed loop's long-running Temporal workers, Redpanda brokers, ClickHouse, and GPU nodes are NOT serverless-compatible. Mixed: Cloud Run/Fly for the Hono API when spiky, Dedicated nodes for the durables.
- **Nomad / plain Docker Swarm** — lighter than K8s; viable for the very first MVP if K8s ops feels heavy, but we'll want K8s by the privacy/whale tier anyway. Re-evaluate for the earliest vertical slice only.
- **Pulumi instead of OpenTofu** — stronger at multi-cloud; revisit if/when cloud #2 lands.
- **AWS as primary** — defensible; lose the free-egress corpus economics + pay more for equivalent K8s ops. GCP wins for our shape.

**2026 maturity:** GKE Autopilot mature; OpenTofu mature ⚠️-verify registry; Argo CD mature; GitHub Actions mature.
**Risks:** GPU quota on GCP is the real risk for the privacy/whale tier — file quota increase requests early, keep Modal as the burst overflow. Single-cloud lock-in is acceptable at MVP and explicitly hedged by OpenTofu modules + containerized everything.
**Cost signal:** GKE Autopilot pay-per-pod; a small MVP cluster (API + workers + Temporal + Redpanda + Postgres-sidecar + a GPU cell on-demand) is ~$2–5k/mo at 100 tenants; the GPU cell dominates.

---

## Layer 15 — Developer experience: monorepo, CI, package manager, linting/formatting

**Recommendation: A single polyglot monorepo (Nx or Bazel — Nx for the TS-dominant MVP, Bazel if/when the Python/Go/Causal complexity outgrows Nx), pnpm for JS, uv for Python, Go modules for Go, Buf for protobuf/JSON-schema (the contract spine across the polyglot boundary), Biome for JS/TS lint+format (the 2026 ESLint/Prettier replacement where its rules suffice, ESLint where deeper lint is needed), ruff+black for Python, golangci-lint for Go. GitHub Actions matrix CI with remote caches (Nx Cloud or Buildbarn). Changesets for release versioning.** ⚠️-verify Biome 2.x lint-rule coverage.

**Why:** The polyglot-but-layered backend (Layer 2) demands a *shared-contract-first* monorepo: the canonical schema for `KnowledgeConflict`, `ActionRecord`, `Intervention`, the assertion-event envelope, the telemetry span shapes is defined ONCE (Buf for protobuf, or JSON-Schema + codegen) and code-generates TypeScript types for the frontend+API, Go structs for the workers, and Python dataclasses/pydantic for the ML service. Type drift across the boundary is the silent killer; codegen eliminates it. A monorepo (vs. polyrepo) gives us atomic cross-cutting refactors (change the `ActionRecord` schema, see every consumer fail in CI simultaneously) which a corpus product with a fast-moving ontology needs. pnpm (fast, workspace-aware) for JS; uv (Astral, 2026's fastest Python package manager, ~10–100x pip) for Python; Go modules native. Linting/formatting: Biome is the 2026 successor to the Prettier+ESLint pair (single Rust binary, format+lint in one pass, much faster); use it for JS/TS and keep ESLint for the deeper rules Biome doesn't yet cover. ruff+black for Python (ruff replaced flake8/isort etc., also Rust-based). golangci-lint for Go.

**Alternatives considered:**
- **Polyrepo with a published contract package** — workable and the conservative hire-friendly default, but loses atomic cross-language refactor; the ontology churn rate makes the monorepo's atomicity valuable. Rejected for MVP, viable as a graduation.
- **Bazel-only (no Nx)** — best hermetic builds at scale, steep learning curve; right *eventually* for the polyglot + ML-build complexity, overkill for the MVP. Re-evaluate when CI wall-clock becomes the bottleneck.
- **Turborepo** — credible Nx alternative (Vercel's), lighter; fine if Nx feels heavy. Nx's stronger task pipeline + codegen story edges it out for our polyglot case.
- **Pants** — strong for polyglot (Python+Go+JS) monorepos, the philosophical sibling of Bazel; viable, less mainstream than Nx but fits our shape better than Nx in principle. Re-evaluate.
- **ESLint+Prettier (no Biome)** — safe, slower, more surface; Biome is the better 2026 default where its rules suffice, blended with ESLint.

**2026 maturity:** Monorepo+Nx mature; uv mature; Buf mature; Biome maturing fast ⚠️-verify lint coverage; ruff mature.
**Risks:** Monorepo CI cost (every change runs the matrix) — mitigate with remote cache hits (Nx Cloud) + path-scoped affected-task detection so a frontend-only change doesn't rebuild the causal model. Polyglot monorepo tooling is more complex than a TS-only one — the contract-codegen discipline is the load-bearing piece; if it slips, type drift returns.
**Cost signal:** Nx Cloud ~free tier → ~$0.02/cache-miss tier; GitHub Actions runners included for OSS, self-hosted runners on the GPU build lane cost real money for the Python/ML lane — budget ~$200–500/mo for CI at small-team scale.

---

## Cross-layer resolved decisions (the invariants every engineer must respect)

These resolve the cross-layer conflicts the foundation synthesis must call:

1. **The contract spine.** Canonical schemas in Buf/JSON-Schema; codegen to TS/Go/Python. No hand-written cross-language types. (`15` enables this; `2` and `9` depend on it.)
2. **Postgres is the truth-tx tier; everything else is a read replica, an analytics mirror, or an archive.** AGE lives in Postgres; the analytical graph (FalkorDB) and vector store (Qdrant/Turbopuffer) are fed by CDC from Postgres and are *not* sources of truth. (`3`,`5`,`6`.)
3. **Temporal owns the closed loop; the LLM gateway owns nothing durable.** No workflow state lives in an agent framework or a Redis hash; it lives in Temporal + Postgres. (`8`,`9`.)
4. **The event bus is the spine's tap, not the spine.** Redpanda carries assertion events from write-path to read-paths (ClickHouse, FalkorDB, the span index) and to the WORM R2 audit; the *commitment* to a fact is the Postgres write, not the event. (`7`,`11`.)
5. **The LLM is six bounded seams behind a custom gateway; constrained decoding + re-grounding is mandatory.** No agent framework as spine; no LLM writes a typed commit. (`9`; ties to the intelligence core.)
6. **One cloud + edge partner; OpenTofu + containers preserve portability.** GCP primary + Cloudflare edge; AWS only for regulated-tenant graduation. (`14`.)
7. **Cost is a first-class architectural input.** Every layer picks the free-egress / pay-per-use / self-hostable option that keeps the long tail's unit economics positive; the whale tier funds itself via dedicated cells. (`11`, `10`, `16`.)
8. **Every commit-to-state is reproducible from a signed graph node.** WORM R2 + Postgres provenance + OTel span-links = an auditable trail from `ActionRecord` back to the signed measurement that earned the autonomy promotion. (`11`,`13`, intelligence core.)

---

*End of technology evaluation. Next: `_FOUNDATION_CRITIQUES.md` — 8 specialist adversarial critiques of this stack + the intelligence core, then the final synthesis + 7 readiness scores.*
