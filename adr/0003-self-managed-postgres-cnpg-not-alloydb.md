# ADR-0003 — Self-managed Postgres (CNPG) over AlloyDB, for AGE support

> **Status:** ACCEPTED
> **Date:** 2026-07-04
> **Supercedes:** `08_DATABASE_ARCHITECTURE.md` (the managed-Postgres choice) + `16_INFRASTRUCTURE.md` (AlloyDB as that managed Postgres)
> **Evidence:** `docs/29_STACK_VERIFICATION.md` §3 Swap 2 + `https://docs.cloud.google.com/alloydb/docs/reference/extensions` (the WebFetch that confirmed AlloyDB supports no graph extensions)
> **Binds at:** M0 + M1

## Context

The blueprint chose **AlloyDB** as the managed Postgres — a reasonable default for a one-cloud+edge GCP deployment that wanted operational simplicity (managed backups, HA, PITR) without standing up its own Postgres fleet. That choice was made before the AGE-in-transaction invariant was stress-tested against AlloyDB's actual extension surface.

The architecture's **truth spine** is a typed bi-temporal knowledge graph living in **Postgres + Apache AGE** (`07_KNOWLEDGE_GRAPH.md`; `00_FOUNDATION_FINAL.md` §2, the 8 cross-cutting invariants). The load-bearing constraint is not merely "use AGE" — it is the **AGE-in-transaction invariant**: graph traversals and relational reads/writes must execute *inside the same Postgres transaction*, so a KG query can join relational rows and graph edges atomically and the truth-tx tier (`00` §2) is a single consistency boundary, not a distributed one. This invariant is what makes the two-spine design cohere.

The audit (`29` §3 Swap 2) fetched the AlloyDB extensions reference page (`docs.cloud.google.com/alloydb/docs/reference/extensions`). The result was decisive: **AlloyDB supports no graph extensions at all** — no Apache AGE, no AgensGraph, nothing in the graph family. This is a hard platform incompatibility, not a performance or cost question. There is no configuration of AlloyDB that runs AGE.

Therefore the blueprint's AlloyDB choice and the architecture's AGE-in-transaction invariant **cannot both hold**. One must give. Because the invariant is load-bearing for the truth spine and AlloyDB is a replaceable implementation choice, the implementation choice gives — and the replacement must run AGE in-cluster with the relational tier.

## Decision

**Self-managed Postgres via the CloudNativePG (CNPG) operator on GKE, with Apache AGE + pgvector + RLS, instead of AlloyDB.**

CNPG is the graduated, widely-adopted Kubernetes operator for Postgres that delivers managed-grade operational primitives — automated backups, point-in-time recovery, streaming replication, automated failover, rolling major-version upgrades, connection pooling — on *self-managed* Postgres, so AGE, pgvector, and RLS all run in one cluster inside one transaction boundary. This preserves the AGE-in-transaction invariant (the whole reason for the swap), keeps pgvector and RLS co-located with the graph tier (the dial's three-axis ledger, the RLS policy templates, and the KG all share the cluster), and keeps the staged graduation path intact: AGE-in-Postgres now → FalkorDB-for-scale later, exactly as `07` planned.

The cell template (`infra/tofu/modules/cell`) provisions CNPG, not AlloyDB. This ADR binds at **M0 + M1** because the cell template is provisioned in M0 and the truth-spine schema + RLS baseline land in M1 — the cluster CR written at M0 must already be the CNPG shape the M1 migrations target.

## Alternatives Considered

- **AlloyDB for the relational tier + a separate self-managed Postgres-with-AGE instance for the graph tier.** Rejected. This violates the AGE-in-transaction invariant by construction: a graph query joining relational rows cannot share a transaction across two databases. The invariant is the consistency guarantee the truth spine sells; splitting it re-introduces the distributed-join / two-phase-commit problem the architecture explicitly rejected when it chose AGE-in-Postgres over a standalone graph DB. The "operational simplicity" gained on the relational side is bought at the cost of the property that makes the truth spine work.
- **Keep AlloyDB and move the KG to a standalone graph database (Neo4j / FalkorDB) immediately.** Rejected. The blueprint's *staged* path is AGE-in-Postgres first (in-transaction joins) → FalkorDB as a later *scale* graduation. Jumping straight to a separate graph DB forfeits the in-transaction join the two-spine design depends on at MVP scale, and it does so to preserve AlloyDB — an implementation detail — at the expense of an architectural invariant. The tail wags the dog. FalkorDB remains the graduation target for *scale*, not the substitute for *transactional consistency*.
- **A different managed Postgres that exposes AGE (Supabase / Neon / etc.).** Rejected. None of the mainstream managed-Postgres offerings expose AGE (the same audit that checked AlloyDB checked this); even if one did, adopting it would fracture the one-cloud+edge invariant (`00` §2) and add a second cloud's blast radius + billing + networking to a product whose infra story is deliberately single-cloud. CNPG on the same GKE cluster preserves one-cloud.
- **Self-managed Postgres *without* CNPG (raw StatefulSet / a VM-postgres approach).** Rejected. Raw self-management forfeits the managed-grade primitives (PITR, automated failover, rolling upgrades) that made AlloyDB attractive in the first place, and would require the team to re-implement what CNPG already provides. CNPG is the path that keeps the operational posture *and* unblocks AGE.

## Consequences

**Positives:**
- The AGE-in-transaction invariant holds — the truth spine is one consistency boundary, graph + relational + vector co-resident in one cluster.
- The graduation path (`07`) stays intact: AGE-in-Postgres now, FalkorDB-for-scale later; pgvector → Qdrant/Turbopuffer later. No architectural rewrite forced by the swap.
- One-cloud+edge preserved. RLS policy templates, the dial's ledger, the KG, and pgvector all share a cluster → the M1 RLS baseline and the M2 verifier both have a single introspection surface.
- CNPG gives managed-grade operations (backups, PITR, failover, rolling upgrades) on self-managed Postgres, so the operational gap vs AlloyDB is narrower than "raw self-managed."
- The audit evidence is a single vendor doc page — the decision is replayable and auditable, not a judgement call.

**Negatives / risks:**
- **Self-managed Postgres is operational weight.** Backups, replication, point-in-time-recovery, version patches, extension/AGE compatibility per Postgres major, and the CNPG operator itself are now on the team. This is the real cost of the swap.
- **The infra/SRE first hire is non-deferrable at M1, not M3.** `28` §7 flagged the first-hire timing as founder-funding-conditional; this swap pulls the infra/SRE hire to M1 because the CNPG cluster that the truth spine depends on cannot be operated by the founder alone through M1's RLS + KG work. The founder must either (a) close funding on the timeline that lands the infra/SRE hire before M1, or (b) accept a constrained M1 that ships the RLS baseline against a single, manually-operated CNPG cluster with the hire landed before M2 scale work. This is the most consequential consequence of the audit and it must be named, not buried.
- **One more operator to master.** CNPG is mature but is a CRD-based control loop the team must understand (cluster CR, backup schedule, PITR policy, pooling config). The M0 infra work includes operator competency, not just provisioning.
- **AGE extension version-pinning.** AGE's compatibility with each Postgres major must be tracked; a Postgres major bump can wait on AGE support. The stack-drift watchdog (E16) adds the AGE↔Postgres compatibility matrix as a tracked item.
- **The frozen docs still say AlloyDB.** By constitution they are not rewritten; this ADR supercedes by reference. Code comments cite `// ADR-0003`; the cell template cites `ADR-0003`. A reader who stops at `08`/`16` and misses this ADR will be misled — the ADR index in `adr/README.md` and the CLAUDE.md §3 swap table are the discoverability layer.

**Closure work required:**
- **M0 infra:** `infra/tofu/modules/cell` provisions a CNPG `Cluster` CR (not an AlloyDB instance) + backup schedule + PITR policy + AGE/pgvector extension bootstrap + RLS-ready baseline. The cell template is the M0 artifact this ADR most directly shapes.
- **M0/M1 migrations:** the Atlas baseline migration installs AGE + pgvector + RLS roles/policies on the CNPG cluster; M1 lands the truth-spine schema + the first RLS policy templates on this cluster.
- **Infra/SRE hire plan (M1):** a one-page hiring plan written ahead of M1, founder-funding-conditional per `28` §7, covering CNPG operation, AGE extension management, backup/PITR drills, and the M2 scale path. This is the human consequence of the swap.
- **Stack-drift watchdog (E16):** add `AlloyDB` → `CNPG` as a forbidden drift pattern (no contributor re-introduces AlloyDB), and add the AGE↔Postgres major compatibility matrix as a tracked invariant.
- **CLAUDE.md §3 swap table** already records this swap and flags it as the most consequential; this ADR is the full justification that table points at.

## References

- `docs/29_STACK_VERIFICATION.md` §3 Swap 2 (the audit reasoning + the AlloyDB extensions evidence)
- `https://docs.cloud.google.com/alloydb/docs/reference/extensions` (the evidence: AlloyDB's extension list contains no graph extensions)
- `docs/00_FOUNDATION_FINAL.md` §2 (the AGE-in-transaction invariant; the 8 cross-cutting invariants)
- `docs/07_KNOWLEDGE_GRAPH.md` (the truth spine: Postgres+AGE now, FalkorDB graduation)
- `docs/08_DATABASE_ARCHITECTURE.md` (the managed-Postgres choice this ADR supercedes)
- `docs/16_INFRASTRUCTURE.md` (AlloyDB as that managed Postgres — superceded)
- `docs/28_EXECUTION_STRATEGY.md` §3 (the audit mandate), §7 (first-hire timing, founder-funding-conditional)
- `CLAUDE.md` §3 (the swap table; this ADR flagged as most consequential)
- `docs/enforcement/ENGINEERING_CONSTITUTION.md` non-negotiables (frozen doc never edited; an ADR supercedes by reference)
