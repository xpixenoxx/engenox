# 14 — Event Architecture

> **Status: FROZEN.** The async spine between services: the Redpanda assertion-event bus (and the Warpstream-on-S3 alternative), the CDC fan-out from Postgres to the analytical sinks, the Buf/Confluent Schema Registry that makes every event a versioned compatibility-gated message, the SSE/streaming contract to the Next.js frontend, and the signed retryable webhook-out discipline. Authored against `08_DATABASE_ARCHITECTURE.md` (the three-sinks reconciliation), `09_BACKEND_ARCHITECTURE.md` (inter-service comms), and `_FOUNDATION_TECH.md` Layer 12–13. **Postgres is the source of truth; the bus is the fan-out + the audit log of what was fanned out. Events are typed, versioned, idempotency-keyed, and the only thing that crosses a service boundary asynchronously.**

---

## 1. The single rule

**No service calls another service's database, and no service mutates another service's state synchronously across a boundary.** Cross-boundary communication is one of three things: (a) a typed gRPC sync call (for fan-in reads), (b) a Temporal signal (for cross-workflow control), (c) a **versioned event on the bus** (for async fan-out). The event is the contract; the schema registry is the gate; idempotency is the floor.

This section defines the bus, the envelope, the CDC fan-out, the SSE/webhook-out contracts.

---

## 2. The bus (Redpanda, or Warpstream-on-S3 for the cost ceiling)

### Recommendation: Redpanda (self-hosted) for the MVP, with a documented Warpstream-on-S3 evaluation
- **Redpanda** is the 2026 Kafka-API-compatible, C++/io_uring, no-ZK, no-JVM streaming engine (per `_FOUNDATION_TECH.md` Layer 12). It removes Kafka's JVM GC pauses + the ZooKeeper/KRaft ops tax; the throughput-per-core is materially higher; the license is BSL (the concerns are post-2028, evaluable, not now).
- **Warpstream** (acquired by Confluent 2025 ⚠️-verify post-acquisition product roadmap + pricing) is the S3-native, no-broker, no-attach-EBS option — the cost ceiling for the "we are shipping terabytes of probe telemetry per day" horizon. Worth the re-eval at the ~10k-tenant cohort because bus storage cost flips to S3.
- **Why not Kafka:** JVM GC pauses are a real ops burden at our 24/7 probe-fleet scale (the Infra critique's "memory stability over 24/7" point extends to the bus); ZK/KRaft is one more stateful system to operate; the throughput-per-watt is worse on 2026 hardware.
- **Why not Pulsar/NATS JetStream:** capable, but they split our SRE attention; the Kafka-API surface (Redpanda/Warpstream) means any Kafka-compatible tooling (the ClickHouse Kafka engine, Debezium connectors, the Buf Schema Registry integration) works unaltered.

### The decision: Redpanda at MVP; Warpstream is the documented graduation when bus storage > ~5 TB/day.

### Topology
- **Per-tenant partition key** (`tenant_id`) on every topic → events for one tenant are **ordered**, cross-tenant parallel. (A tenant's `AtlasCycle` consumes its own events in order; no two tenants contend on a partition.)
- **Three nodes minimum** for the MVP cohort, RF=3, one region per cell (the privacy-tier cell is physically separate — 11 §5 Tier B).
- **Retention:** `assertion.events` is **compacted + retained long** (the audit log; the latest value per key is kept, history retained per the regulation tier); `probe.events` is **short-retention** (7–14 days) because the raw sample goes to R2 Object-Lock before the row downgrades (08 §3), so the bus's job is fan-out not durability; `intervention.lifecycle` is compacted (the latest status per `intervention_id`); `alerts.degradation` is short-retention (the alert is persisted in Postgres immediately, the bus is the push channel).

---

## 3. The assertion-event envelope (the canonical event)

Every CDC-emitted row + every cross-service event is a versioned instance of the typed envelope:

```protobuf
message AssertionEvent {
  string event_id = 1;       // deterministic hash of (tenant_id, entity_id, fact_id, valid_time, tx_time) — the idempotency key downstream
  string tenant_id = 2;
  string entity_id = 3;
  string schema_version = 4; // the envelope's own version (compatibility-gated)
  string kg_version = 5;     // the KG version this assertion is true-of (the community-summary gate, 13 §3)
  Assertion payload = 6;     // the typed assertion (subject/predicate/object/valid_time/tx_time/superseded_by/anti_fact_for)
  IntegrityTags tags = 7;    // id_strategy, foreign_change_status — gate estimator weight (06)
  ProvenanceRef provenance = 8; // the source (a probe, a panelist, a connector, a manual edit)
  google.protobuf.Timestamp emitted_at = 9;
}
```

- **`event_id` is the idempotency key at every sink** (08 §5): `INSERT ... ON CONFLICT (event_id) DO NOTHING`. A replay (a Debezium restart, a Redpanda consumer rebalance) cannot double-write.
- **`schema_version` + `kg_version` are the two fields the Schema Registry gates** (§5) — the envelope's structural version and the knowledge-graph semantic version.
- **The envelope is the only thing on the bus.** No ad-hoc JSON; no per-service message shapes. The contract spine (09 §4 Buf codegen) generates this envelope in TS/Go/Python; no hand-written event types.

---

## 4. The CDC fan-out (Postgres → the analytical sinks)

Postgres is the source of truth; the analytical tiers are derived. The fan-out:

```
Postgres (WAL) → Debezium (logical decoding) → Redpanda `assertion.events`
                                                    ↓
                                              ┌─────┴──────┬─────────────┬───────────────┐
                                              ↓             ↓             ↓               ↓
                                     ClickHouse       FalkorDB       Qdrant         R2 manifest
                                     Kafka engine    (CDC loader)   (vector upsert) writer
                                     (ReplacingMergeTree)                          (signed pointer)
```

- **Exactly-once at each sink** via `event_id` `ON CONFLICT DO NOTHING` + Redpanda's idempotent-producer + transactional-consumer (transactional reads commit sink + offset together).
- **ClickHouse** consumes via its `Kafka` engine table → batched-flush into `ReplacingMergeTree(version=aggregation_version)` (08 §3), avoiding part-merge thrash.
- **FalkorDB** loads via a typed CDC loader (a Go worker that consumes the topic and issues idempotent graph upserts — `MERGE` semantics, no orphan nodes).
- **Qdrant** upserts vectors for the `intervention_features` embedding (the standardization asset, 06) — the embedding is recomputed on assertion supersession (a KG version bump invalidates the vector).
- **R2 manifest writer** appends a signed-pointer object per `event_id` to the per-tenant prefix (the dual-canonical WORM copy, 08 §4).
- **The nightly three-sinks reconciliation** (08 §5) samples N `event_id`s from Postgres, fetches each from every sink, asserts agreement (content + integrity tags + provenance); drift triggers a targeted replay from the `assertion.events` topic.

### Vector upsets on supersession
When an `assertion` is superseded (the old row gains `superseded_by`), the `intervention_features` embedding for the affected entity **stale-marks** immediately: a `KG_version` bump on the entity invalidates the Qdrant vector; the next read triggers a re-embed (the Embed seam, 11 §3) + a re-upsert. A stale vector is never served to the retrieval path; the version gate is the floor (13 §3).

---

## 5. The Schema Registry (the contract gate)

- **Confluent/Buf Schema Registry** holds the Protobuf definitions for every event type (the `AssertionEvent`, the `ProbeEvent`, the `InterventionLifecycleEvent`, the `DegradationAlert`, the `WebhookOut`).
- **Compatibility modes are strict by event class:**
  - `BACKWARD` (consumers can read old + new) for additive changes — you may add optional fields, you may never remove/rename/change a field's type.
  - `FORWARD` is required for `WebhookOut` (customers' receivers may not have upgraded) — strictly additive only.
  - `FULL` (both) for the `AssertionEvent` envelope (the spine; any drift breaks every sink).
- **CI gate:** a producer PR that registers an incompatible schema version is **blocked** (the Buf contract-discipline gate, 09 §4, extended to events). Version-skew between a producer's generated code and the registry is also blocked.
- **The registry is the abuse-prevention layer** for the polyglot cost: TS, Go, and Python all consume the same registry-generated types; no hand-written cross-language event shapes.

---

## 6. The topic topology

| Topic | Partitions by | Retention | Compaction | Producers | Consumers |
|---|---|---|---|---|---|
| `assertion.events` | `tenant_id` | long (regulated tier: indefinite) | yes (latest per `event_id`) | Debezium | ClickHouse, FalkorDB, Qdrant, R2 writer, three-sinks recon |
| `probe.events` | `tenant_id` | 7–14 days | no | Perception (Go probe fleet) | ClickHouse probe_samples, downsample MV |
| `intervention.lifecycle` | `intervention_id` | long | yes (latest status) | Decision + Action + Measurement workflows | SSE broker (Control Plane), webhooks-out |
| `alerts.degradation` | `tenant_id` | short | no | Measurement (EWMA/CUSUM) | SSE broker, webhooks-out, dial-ledger auto-demote |
| `webhooks.out` | `tenant_id` | short + DLQ | no | Any workflow that needs customer notification | Webhook dispatcher (idempotent) |
| `panel.queries` | `panelist_id` | short | no | Decision (the consented-panel probe-scheduler) | Panel-adapter (per vendor API), answer capture |

**No topic is multi-tenant in its keying** — every topic's partition key is the tenant (or the panelist, for panel-only flows). Cross-tenant joins happen in ClickHouse (the per-tenant partition + the aggregated `corpus_analytics` mirror, 08 §3), never on the bus.

---

## 7. The SSE / streaming contract to the frontend

The Control Plane (09 §1) is the SSE broker; it consumes `intervention.lifecycle`, `alerts.degradation`, and the in-flight probe partial results, and streams them to authenticated Next.js sessions (10 §3):

- **`graphql-ws` subscriptions** for the alert feed + probe-complete events (the BFF fans out to internal gRPC + dataloaders per-tenant, 10 §3).
- **SSE** for the dry-run toggle of an explanation panel + the partial-probe render (the <90s activation moment, 04). The Control Plane's SSE handler is per-session, per-tenant (the JWT carries `tenant_id`, set at the edge — 10 §7).
- **Backpressure:** the SSE stream is *not* a Kafka consumer per session (that would be a partition storm). The Control Plane maintains **one** consumer group per topic across the cluster, fans events into a per-session Valkey ring buffer (`sse:{tenant}:{session}`, TTL=5m), and sessions read from their ring buffer. Backpressure drops the *oldest* event for a non-subscribed surface, never fills up unbounded.
- **Ordering:** events flow in `event_id` order per tenant (the partition key guarantees it); the SSE handler preserves order within a tenant's stream.
- **The streaming contract is typed** (the same Buf envelope, regenerated to TS); the frontend never parses ad-hoc JSON.

### The probe partial-result stream (the <90s activation)
The fast-partial-probe (04) emits its 1-surface / 1-sample preliminary result the moment the first probe completes — not when the cycle finishes. The Perception layer publishes a `ProbePartial` event on `probe.events` with `partial=true`; the SSE broker forwards it to the tenant's session; the dashboard SSRs the preliminary panel. Subsequent partials overwrite the preliminary; the full multi-sample result closes the cycle. **The activation metric is the first usable partial, not the cycle's completion.**

---

## 8. Webhook-out (signed, retryable, idempotent)

Customer-configured webhooks (PR opened, alert fired, monthly report ready) are delivered by a dedicated dispatcher (a Temporal activity, idempotent-keyed per 09 §2):

- **Signed:** every webhook carries an asymmetric signature (the per-tenant webhook signing key, rotated, stored in Vault behind the HSM-backed KEK, 15). The signature header is `Engenox-Signature: t=<ts>,v1=<sig>`; the receiver verifies with the tenant's public key (rotated quarterly).
- **Idempotent:** the payload carries a `delivery_id` (deterministic hash of `(event_id, webhook_config_id)`); the receiver de-duplicates on `delivery_id`. Redelivery (retry storm) cannot double-act.
- **Retry policy:** exponential backoff (1m, 5m, 30m, 2h, 12h, 24h) up to N attempts; the dead-letter topic `webhooks.out.dlq` captures terminal failures → an alert + a "your webhook is failing" notification in `/settings`.
- **The webhook is a Temporal activity:** durable, replayable, idempotent-keyed (the same `(tenant_id, activity_name, idempotency_key)` discipline as PR creation — 09 §2). A crashed dispatcher resumes; a receiver that's down gets retried; nothing is lost.
- **For FORWARD-compatibility** (§5), the payload is strictly additive — a new event type adds an optional field; the receiver ignores unknown fields per FORWARD contract.

### The Integrity-of-dispatch record
Every webhook attempt writes a `webhook_delivery_log` row (signed manifest: the payload, the signature, the response status, the timestamps, the retry count). The log is itself a corpus-adjacent audit artifact — a customer can prove "we attempted delivery N times and they failed" for SOC-2 / their own audit.

---

## 9. Backpressure, ordering, and the consumer model

- **Producers are idempotent** (Redpanda idempotent producer, sequence numbers per partition) — retries on network blips do not duplicate.
- **Consumers are transactional** — the sink commit + the offset commit happen in one transaction; a crash mid-batch replays the whole batch, and `ON CONFLICT (event_id) DO NOTHING` absorbs the duplicates.
- **Per-tenant ordering, cross-tenant parallelism** — the partition key is always the tenant; no tenant's events arrive out-of-order, no two tenants contend on a partition.
- **The deficit-round-robin on the producer side** mirrors the gateway's weighted-fair scheduling (11 §2d) — a whale's high-volume tenant cannot push a small tenant's events off the queue at the bus layer either.
- **Quota per producer** — the Perception fleet's per-tenant rate limit (the Valkey token-bucket, 08 §6) is enforced *before* the produce call; over-quota probes are shed at the source, not at the bus.

---

## 10. The event-architecture invariants

1. **Postgres is the source of truth; the bus is the fan-out + the audit log.** No sink writes a commitment; every sink is derived + rebuildable from `assertion.events` + R2.
2. **The `AssertionEvent` envelope is the only event shape on the bus;** Buf/Schema-Registry-generated in every language; no hand-written cross-language event types.
3. **`event_id` is the idempotency key at every sink (`ON CONFLICT DO NOTHING`);** Redpanda idempotent producer + transactional consumer → effectively exactly-once.
4. **Every topic partitions by `tenant_id` (or `panelist_id` for panel-only flows);** per-tenant ordering, cross-tenant parallelism.
5. **Schema Registry gates compatibility: BACKWARD for internal, FORWARD for `WebhookOut`, FULL for the `AssertionEvent` envelope;** incompatible producer PRs are CI-blocked.
6. **SSE is one consumer group → per-session Valkey ring buffer;** no per-session Kafka consumers; backpressure drops oldest, never fills unbounded.
7. **Webhooks are signed, retryable, idempotent (`delivery_id`), DLQ'd, audit-logged;** a Temporal activity, not a fire-and-forget HTTP call.
8. **The three-sinks reconciliation runs nightly on `event_id`** (08 §5); drift is alerted + targeted-replayed.

---

*End of event architecture. Next: `15_SECURITY_ARCHITECTURE.md` — the RLS-in-transaction invariant, the per-tenant crypto lifecycle (HSM-backed KEK + envelope encryption), the PR allow-list-glob diff-review gate, the plugin sandbox, and the SOC2-adjacent audit log.*
