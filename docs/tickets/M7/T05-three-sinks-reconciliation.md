# M7-T05: Three-Sinks Reconciliation — Postgres ↔ ClickHouse ↔ R2

**Status:** ⬜ NOT STARTED  
**Milestone:** M7 (Gate C–D)  
**Owner:** Data Engineer (founder acting as)  
**Depends on:** T01 (R2 bucket), E31 (corpus writer), E34 (measurement pipeline)

---

## Objective

Nightly reconciliation job ensuring **bit-identical** CIO corpus rows across all three sinks:
1. **Postgres** (`cio_corpus` table) — canonical transactional store
2. **ClickHouse** (`cio_corpus_analytics`) — analytical mirror (deduped)
3. **R2 Object-Lock** (`s3://engenox-corpus/{tenant_id}/{corpus_id}.json`) — WORM archive

**Gate:** 7 consecutive nights with zero mismatches on fixture data.

---

## Reconciliation Logic

```python
# services/measurement/src/engenox/measurement/reconciliation/job.py
async def reconcile_three_sinks(window_hours: int = 24) -> ReconciliationReport:
    since = datetime.utcnow() - timedelta(hours=window_hours)
    
    # 1. Fetch Postgres canonical rows (source of truth)
    pg_rows = await pg.fetch(
        "SELECT corpus_id, tenant_id, payload, integrity_signature, tx_time "
        "FROM cio_corpus WHERE tx_time >= $1 ORDER BY tx_time", since
    )
    
    report = ReconciliationReport(window_start=since)
    
    for row in pg_rows:
        corpus_id = row["corpus_id"]
        tenant_id = row["tenant_id"]
        canonical_payload = row["payload"]
        canonical_sig = row["integrity_signature"]
        
        # 2. Check ClickHouse (dedup on corpus_id + tenant_id)
        ch_row = await ch.fetch_one(
            "SELECT payload, integrity_signature FROM cio_corpus_analytics "
            "WHERE corpus_id = $1 AND tenant_id = $2 LIMIT 1",
            corpus_id, tenant_id
        )
        
        if not ch_row:
            report.missing_clickhouse.append(corpus_id)
            continue
            
        if ch_row["payload"] != canonical_payload:
            report.mismatch_clickhouse.append(clickhouse_mismatch)
        if ch_row["integrity_signature"] != canonical_sig:
            report.sig_mismatch_clickhouse.append(corpus_id)
        
        # 3. Check R2 Object-Lock
        r2_key = f"{tenant_id}/{corpus_id}.json"
        try:
            r2_obj = await r2.get_object(Bucket="engenox-corpus", Key=r2_key)
            r2_payload = json.loads(r2_obj["Body"].read())
            r2_sig = r2_payload.pop("integrity_signature", None)
            
            if r2_payload != canonical_payload:
                report.mismatch_r2.append(r2_mismatch)
            if r2_sig != canonical_sig:
                report.sig_mismatch_r2.append(corpus_id)
                
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                report.missing_r2.append(corpus_id)
            else:
                raise
    
    # 4. Check for orphans (in CH/R2 but not in PG)
    ch_orphans = await ch.fetch(
        "SELECT corpus_id, tenant_id FROM cio_corpus_analytics "
        "WHERE tx_time >= $1 AND (corpus_id, tenant_id) NOT IN "
        "(SELECT corpus_id, tenant_id FROM cio_corpus WHERE tx_time >= $1)",
        since
    )
    report.orphan_clickhouse = [f"{r['tenant_id']}/{r['corpus_id']}" for r in ch_orphans]
    
    # R2 orphans (list all objects, compare keys)
    r2_keys = await r2.list_objects(Prefix="", Bucket="engenox-corpus")
    pg_keys = {f"{r['tenant_id']}/{r['corpus_id']}.json" for r in pg_rows}
    report.orphan_r2 = [k for k in r2_keys if k not in pg_keys]
    
    # 5. Emit report
    await emit_report(report)
    return report
```

---

## ClickHouse Schema (Deduped)

```sql
-- libs/kg/migrations/atlas/0002_cio_corpus_analytics.sql
CREATE TABLE cio_corpus_analytics (
    corpus_id UUID,
    tenant_id UUID,
    payload String,
    integrity_signature String,
    tx_time DateTime64(3),
    valid_time DateTime64(3),
    id_strategy Enum8('RCT_ELIGIBLE'=1, 'QUASI_EXPERIMENTAL'=2, 'OBSERVATIONAL'=3),
    foreign_change_status Enum8('CLEAN'=1, 'QUARANTINED'=2, 'FLAGGED'=3),
    _version UInt64  -- for ReplacingMergeTree dedup
) ENGINE = ReplacingMergeTree(_version)
ORDER BY (tenant_id, corpus_id)
PARTITION BY tenant_id;
```

---

## Temporal Activity + Schedule

```typescript
// services/temporal/src/activities/reconciliationActivity.ts
export const reconcileThreeSinks = async (): Promise<ReconciliationReport> => {
  const client = new MeasurementClient(process.env.MEASUREMENT_URL!);
  return client.reconcile({ windowHours: 24 });
};

// services/temporal/src/workflows/reconciliationWorkflow.ts
export const ReconciliationWorkflow = defineWorkflow({
  name: "reconciliation",
  async *run(): AsyncGenerator<ReconciliationReport> {
    while (true) {
      yield reconcileThreeSinks();
      yield sleep(24 * 60 * 60 * 1000); // 24h
    }
  }
});
```

---

## CI Gate: Fixture Reconciliation Test

```python
# services/measurement/src/engenox/measurement/__tests__/test_reconciliation.py
def test_reconciliation_fixture():
    # 1. Insert 100 fixture rows into PG (via corpus writer)
    # 2. Run reconciliation job
    # 3. Assert: zero missing, zero mismatch, zero sig_mismatch, zero orphans
    report = reconcile_three_sinks(window_hours=1)
    assert report.missing_clickhouse == []
    assert report.mismatch_clickhouse == []
    assert report.sig_mismatch_clickhouse == []
    assert report.missing_r2 == []
    assert report.mismatch_r2 == []
    assert report.sig_mismatch_r2 == []
    assert report.orphan_clickhouse == []
    assert report.orphan_r2 == []
```

Add to `.github/workflows/tests.yaml`:
```yaml
- name: Measurement reconciliation test
  run: |
    cd services/measurement
    uv run pytest src/engenox/measurement/__tests__/test_reconciliation.py -xvs
```

---

## Grafana Alert

```yaml
# scripts/grafana-dashboards.yaml (add panel)
- title: "Three-Sinks Reconciliation"
  type: "table"
  targets:
    - expr: |
        increase(reconciliation_mismatch_total[24h])
      legendFormat: "Mismatches (CH)"
    - expr: |
        increase(reconciliation_missing_r2_total[24h])
      legendFormat: "Missing R2"
    - expr: |
        increase(reconciliation_orphan_total[24h])
      legendFormat: "Orphans"
  alert:
    name: "ReconciliationMismatch"
    condition: "any > 0"
    for: "5m"
    annotations:
      summary: "Corpus reconciliation mismatch detected"
```

---

## Candor Flags

- [ ] Reconciliation runs **after** measurement pipeline completes (not concurrent)
- [ ] Payload comparison is **bit-identical** (not semantic) — canonical JSON serialization
- [ ] Signature verification uses **same Ed25519 public key** across all sinks
- [ ] Orphan detection covers **both directions** (PG→CH/R2 and CH/R2→PG)
- [ ] Report emitted even on **zero rows** (proves job ran)
- [ ] 7-night clean run **documented in ticket closure** (not assumed)

---

## Files to Create/Modify

```
services/measurement/src/engenox/measurement/reconciliation/
├── job.py
├── models.py
└── clickhouse_schema.sql
services/temporal/src/activities/reconciliationActivity.ts
services/temporal/src/workflows/reconciliationWorkflow.ts
services/temporal/src/worker.ts (register workflow)
libs/kg/migrations/atlas/0002_cio_corpus_analytics.sql
scripts/grafana-dashboards.yaml (reconciliation panel)
.github/workflows/tests.yaml (reconciliation test step)
```

---

## Acceptance Criteria

- [ ] Nightly reconciliation job deployed + scheduled via Temporal
- [ ] ClickHouse table `cio_corpus_analytics` created with ReplacingMergeTree dedup
- [ ] Fixture reconciliation test passes in CI (zero mismatches)
- [ ] Grafana alert fires on any mismatch/ missing/ orphan
- [ ] 7 consecutive nights clean on stage (documented with timestamps)
- [ ] All CI gates pass
- [ ] Candor flags documented; no silent deferrals