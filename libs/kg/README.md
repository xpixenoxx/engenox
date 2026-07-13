# libs/kg — the truth-spine golden path (M1-thin → M6-thin → thickening)

> **The ONLY sanctioned bi-temporal query path is `assertion_view` (13 §3).**
> A hand-written `valid_time @>` query anywhere else is a lint-banned + stack-drift
> watchdog hit (CLAUDE.md §5). Every appended node is bi-temporal: `valid_time` +
> `tx_time` + `provenance` are mandatory on every assertion (06 §7 invariant 2).

---

## What this lib owns (the long-term contract)

| Surface | Purpose | Cites |
|---|---|---|
| `AssertionStore` PORT | The only sanctioned write + read interface. `append` enforces bi-temporal + provenance + identity invariants; `view` is the ONLY as-of query path. | 13 §3, 06 §7 inv2 |
| `assertion_view` query | The single bi-temporal read: "what was true for (tenant, entity) as-of `validAt`?" Half-open window semantics; no cross-tenant leakage. | 13 §2/3/4 |
| `InMemoryAssertionStore` | The launch-first dev store (append-only list). The thickening swaps for CNPG+AGE without touching callers (ADR-0003/0007). | ADR-0007 Thinning Rule |
| RLS policies | Tenant isolation via `current_setting('app.tenant_id')` (JWT-bound, 15 §3). The canary-row test + introspection gate make RLS a CI invariant. | 23 §3, 15 §3 |
| Atlas migrations | Schema-as-code, expand/contract-native (17 §4). The `atlas.sum` checksum is committed; drift = fail. | 17 §4, ADR-0001 |
| Canary-row test | Provocative fixture: `CANARY-TENANT-LEAK-{{tenant}}`. A cross-tenant leak fails LOUDLY (CLAUDE.md §12). | 23 §3, 26 §4 |
| RLS-introspection gate | Queries `pg_policies` for EVERY scoping table; a missing policy = CI fail (exhaustive, not a checklist). | 23 §3, CLAUDE.md §7 |

---

## How to copy this exemplar (the teaching surface for the KG + RLS layer)

### 1. The migration patterns (Atlas, 17 §4)
- **Expand-first**: every migration is `CREATE` / `ALTER ... ADD COLUMN` only.
- **Destructive separately**: a column drop is a LATER migration (`0002_drop_xxx.sql`), not in the same file.
- `atlas migrate lint` (in `atlas.hcl`) enforces: destructive op in same file as expand = ERROR.

### 2. The RLS policy patterns (15 §3)
```sql
-- EVERY scoping table:
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <table>
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
```
- `tenant_id` comes from the JWT → gateway sets `app.tenant_id` session var.
- NEVER accept `tenant_id` from a client request body (watchdog cat-4 + security review).
- `FORCE RLS` prevents table-owner bypass (defense-in-depth).

### 3. The canary-row test pattern (23 §3 + CLAUDE.md §12)
- Insert a row per tenant with subject_id = `CANARY-TENANT-LEAK-{{tenant}}`.
- Under tenant A's session: SELECT must return A's canary, B's canary MUST be INVISIBLE.
- Payload is deliberately provocative so a leak is UNMISTAKABLE (candor floor).
- Test UPDATE/DELETE cross-tenant → RLS WITH CHECK rejects (0 rows affected).

### 4. The RLS-introspection gate pattern
```python
SCOPING_TABLES = ["surfaces", "assertions", "conflicts", "interventions", "outcomes", "dial_ledger"]
# For each: query pg_policies → assert tenant_id + current_setting pattern exists.
```
- List IS the schema's source of truth; a new table without a policy FAILS the gate.
- Runs in CI against the M1 cell / testcontainer (ADR-0007 M1-thin).

### 5. The `assertion_view` ONLY bi-temporal path (13 §3)
```ts
// The ONLY allowed query shape (libs/kg/ts/src/kg.ts):
WHERE tenant_id = current_setting('app.tenant_id')::uuid
  AND subject_id = entityId
  AND valid_time @> validAt  // HALF-OPEN: start <= validAt < end
```
- No hand-written `valid_time @>` outside this lib — watchdog cat-4 + lint.
- The as-of read respects `tx_time` (no lookahead bias, 13 §4).

### 6. The bi-temporal candor gate on `append` (06 §7 inv2 + 13 §2)
```ts
if (node.id === "") return err("missing-id");
if (node.tenantId === "") return err("missing-tenant");
if (!node.validTime?.start) return err("missing-valid-time");
if (!node.txTime?.start) return err("missing-tx-time");
if (!node.provenance) return err("missing-provenance");
```
- Proto marks them optional; the STORE enforces mandatory (candor floor: typed-optional ≠ omitted-mandatory).
- Rejected node is NOT stored (devCount stays 0, 13 §4 append-only).

---

## M1-thin what shipped (this checkpoint)

| Artifact | Status | Path |
|---|---|---|
| Atlas migration 0001 (6 tables + indexes + comments) | ✅ | `migrations/atlas/0001_initial_schema.sql` |
| Atlas config + expand/contract lint | ✅ | `migrations/atlas/atlas.hcl` |
| RLS policy template + assertions policy | ✅ | `policies/rls_assertion.sql` |
| Canary-row regression fixture (3 tenants + canaries) | ✅ | `policies/rls_regression.sql` |
| Canary-row test (Python, uses assertion_view semantics) | ✅ | `test/rls_canary_test.py` |
| RLS-introspection gate (exhaustive pg_policies check) | ✅ | `test/rls_introspection.py` |
| In-memory AssertionStore (the dev PORT impl) | ✅ | `ts/src/kg.ts` |
| Vitest suite (13 tests: append gates + as-of read + timeLt) | ✅ | `ts/__tests__/kg.test.ts` |
| Python test config (pytest + ruff + mypy) | ✅ | `pyproject.toml` |

---

## Gates that run in CI (T06 orchestration)

| Gate | What it asserts |
|---|---|
| `contract-gate` | Schema compiles (mypy/tsc/go build) |
| `dependency-direction` | `libs/kg` imports no service, contract-graph leaf-only |
| `tests` | `rls_canary_test.py` + `rls_introspection.py` (needs DATABASE_URL) |
| `stack-drift-watchdog` | No `valid_time @>` outside this lib; no `alloydb`; no `@latest` actions |

---

## Thickening (additive, post-concierge)

| What | Where it lands |
|---|---|
| AGE edges (graph traversal in same tx) | M1-thickening: `ALTER TABLE assertions ADD COLUMN ...` + AGE `CREATE VLABEL` |
| `pgvector` columns (embeddings) | M1-thickening: HNSW index + `vector` column |
| `surfaces` table RLS + type-checks | M1-thickening |
| Real `assertion_view` (CNPG+AGE, not in-memory) | M1-thickening |
| Envelope encryption (KEK→DEK) | Thickening (ADR-0007) |
| WORM signature on every row (libs/crypto) | Thickening (dual-canonical) |

---

## The candor floor reminder

> The canary row's payload (`CANARY-TENANT-LEAK-B`) is the test's voice: if it appears in tenant A's SELECT, the test SCREAMS. A leak that surfaces silently is a moat breach; one that surfaces loudly is a gate doing its job. **Never silence the canary.** (CLAUDE.md §12)