# M7-T06: R2 Object-Lock WORM Mirror + Restore Test

**Status:** ⬜ NOT STARTED  
**Milestone:** M7 (Gate C–D)  
**Owner:** Data/Infra Engineer (founder acting as)  
**Depends on:** T01 (R2 bucket provisioned), E31 (corpus writer), E33 (quarantine guard)

---

## Objective

Make the **R2 Object-Lock Compliance bucket** the **second canonical sink** for the CIO corpus (dual-canonical per `15` §3 + `26` §4):
- Measurement service writes signed corpus row to R2 **synchronously** after Postgres commit
- Nightly `CorpusRestoreTest` fetches random corpus from R2 → verifies Ed25519 signature → asserts bit-identical to Postgres row
- **Gate:** 7 consecutive nights with zero restore failures

---

## R2 Bucket Spec (Provisioned in T01)

| Property | Value |
|---|---|
| Name | `engenox-corpus` |
| Object-Lock | **Compliance mode** (immutable even by root) |
| Default retention | 7 years (2555 days) |
| Location | WNAM (or EU for GDPR tenants) |
| Encryption | SSE-S3 (R2 managed) |
| CORS | None (internal access only) |

**Verify:** `wrangler r2 bucket info engenox-corpus` → `ObjectLockEnabled = true`, `DefaultRetentionMode = COMPLIANCE`

---

## Measurement Service: Dual-Canonical Write

```python
# services/measurement/src/engenox/measurement/corpus/writer.py
class CorpusWriter:
    def __init__(self, pg_pool: Pool, r2_client: boto3.client, signing_key: Ed25519PrivateKey):
        self.pg = pg_pool
        self.r2 = r2_client
        self.signer = signing_key
    
    async def write(self, row: CIOCorpusRow) -> CorpusWriteResult:
        # 1. Canonical JSON serialization (deterministic)
        canonical_json = row.canonical_json()  # sorted keys, bigint as decimal string
        
        # 2. Ed25519 signature
        signature = self.signer.sign(canonical_json.encode()).signature
        
        # 3. Postgres write (primary canonical)
        async with self.pg.acquire() as conn:
            await conn.execute("""
                INSERT INTO cio_corpus (corpus_id, tenant_id, payload, integrity_signature, 
                                       tx_time, valid_time, id_strategy, foreign_change_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, row.corpus_id, row.tenant_id, canonical_json, 
                signature.hex(), row.tx_time, row.valid_time, 
                row.id_strategy.value, row.foreign_change_status.value)
        
        # 4. R2 write (secondary canonical) — SYNCHRONOUS, not async
        r2_key = f"{row.tenant_id}/{row.corpus_id}.json"
        r2_payload = {**row.payload_dict(), "integrity_signature": signature.hex()}
        
        try:
            self.r2.put_object(
                Bucket="engenox-corpus",
                Key=r2_key,
                Body=json.dumps(r2_payload, separators=(",", ":")).encode(),
                ObjectLockMode="COMPLIANCE",
                ObjectLockRetainUntilDate=datetime.utcnow() + timedelta(days=2555),
                ContentType="application/json"
            )
        except Exception as e:
            # If R2 write fails, we have PG but not R2 — ALERT but don't rollback PG
            # (the reconciliation job T05 will catch and alert)
            logger.error("R2 write failed", corpus_id=row.corpus_id, error=str(e))
            await emit_alert("corpus_r2_write_failed", {"corpus_id": str(row.corpus_id)})
            raise
        
        return CorpusWriteResult(corpus_id=row.corpus_id, r2_key=r2_key, signature=signature.hex())
```

**Critical:** R2 write is **synchronous** in the same request. If it fails, the API returns 500 and the Temporal activity retries. This ensures dual-canonical at write time.

---

## CorpusRestoreTest (Nightly Temporal Activity)

```python
# services/measurement/src/engenox/measurement/restore/test.py
async def corpus_restore_test(sample_size: int = 10) -> RestoreTestReport:
    # 1. Pick random corpus_ids from last 24h
    corpus_ids = await pg.fetch(
        "SELECT corpus_id, tenant_id FROM cio_corpus "
        "WHERE tx_time >= $1 ORDER BY random() LIMIT $2",
        datetime.utcnow() - timedelta(hours=24), sample_size
    )
    
    report = RestoreTestReport(tested_count=0, passed=0, failed=0, failures=[])
    
    for row in corpus_ids:
        corpus_id = row["corpus_id"]
        tenant_id = row["tenant_id"]
        
        # 2. Fetch from R2
        r2_key = f"{tenant_id}/{corpus_id}.json"
        try:
            r2_obj = r2_client.get_object(Bucket="engenox-corpus", Key=r2_key)
            r2_data = json.loads(r2_obj["Body"].read())
        except ClientError as e:
            report.failed += 1
            report.failures.append(RestoreFailure(
                corpus_id=corpus_id, 
                reason=f"R2 fetch failed: {e.response['Error']['Code']}"
            ))
            continue
        
        # 3. Verify signature
        r2_sig_hex = r2_data.pop("integrity_signature", None)
        if not r2_sig_hex:
            report.failed += 1
            report.failures.append(RestoreFailure(
                corpus_id=corpus_id,
                reason="Missing integrity_signature in R2 object"
            ))
            continue
        
        canonical_json = json.dumps(r2_data, separators=(",", ":"), sort_keys=True)
        try:
            verifying_key.verify(bytes.fromhex(r2_sig_hex), canonical_json.encode())
        except Exception:
            report.failed += 1
            report.failures.append(RestoreFailure(
                corpus_id=corpus_id,
                reason="Ed25519 signature verification failed"
            ))
            continue
        
        # 4. Fetch from Postgres and assert bit-identical
        pg_row = await pg.fetch_one(
            "SELECT payload FROM cio_corpus WHERE corpus_id = $1", corpus_id
        )
        
        if pg_row["payload"] != canonical_json:
            report.failed += 1
            report.failures.append(RestoreFailure(
                corpus_id=corpus_id,
                reason="R2 payload != Postgres payload (bit mismatch)"
            ))
            continue
        
        report.passed += 1
        report.tested_count += 1
    
    # 5. Emit metrics
    await emit_metric("corpus_restore_test", {
        "tested": report.tested_count,
        "passed": report.passed,
        "failed": report.failed
    })
    
    if report.failed > 0:
        await emit_alert("corpus_restore_test_failed", {"failures": report.failures})
    
    return report
```

---

## CI Gate: Restore Test on Fixture Data

```python
# services/measurement/src/engenox/measurement/__tests__/test_r2_restore.py
def test_r2_restore_fixture():
    # 1. Write 10 fixture rows via CorpusWriter (hits real R2 via LocalStack or test bucket)
    # 2. Run CorpusRestoreTest
    # 3. Assert: all 10 pass, zero failures
    report = await corpus_restore_test(sample_size=10)
    assert report.passed == 10
    assert report.failed == 0
```

```yaml
# .github/workflows/tests.yaml (add step)
- name: Measurement R2 restore test
  if: env.R2_TEST_ENDPOINT != ''
  run: |
    cd services/measurement
    uv run pytest src/engenox/measurement/__tests__/test_r2_restore.py -xvs
  env:
    R2_TEST_ENDPOINT: ${{ secrets.R2_TEST_ENDPOINT }}
    R2_TEST_ACCESS_KEY: ${{ secrets.R2_TEST_ACCESS_KEY }}
    R2_TEST_SECRET_KEY: ${{ secrets.R2_TEST_SECRET_KEY }}
```

---

## Verification Gates

| Gate | Target | Evidence |
|---|---|---|
| R2 Object-Lock | Compliance + 7y retention | `wrangler r2 bucket info engenox-corpus` |
| Dual-canonical write | Sync R2 write after PG | Measurement API latency <500ms p99 |
| Restore test (fixtures) | 10/10 pass | CI `test_r2_restore.py` green |
| Restore test (stage, 7 nights) | 0 failures | Grafana `corpus_restore_test_failed` = 0 |
| Signature verification | Ed25519 same key | `libs/crypto` signing key used |

---

## Candor Flags

- [ ] R2 write is **synchronous** (not fire-and-forget) — measurable latency added to API
- [ ] Object-Lock **Compliance mode** (not Governance) — verified via CLI
- [ ] RetainUntilDate set to **7 years from write** (not fixed date)
- [ ] Restore test uses **same canonical JSON** serialization as writer
- [ ] If R2 write fails, PG is **not rolled back** — reconciliation catches it (T05)
- [ ] Test bucket for CI is **separate** from stage/prod (LocalStack or dedicated test bucket)

---

## Files to Create/Modify

```
services/measurement/src/engenox/measurement/corpus/
├── writer.py (add synchronous R2 write)
└── r2_client.py (R2 client with retry + timeout)

services/measurement/src/engenox/measurement/restore/
├── test.py (CorpusRestoreTest)
└── models.py (RestoreTestReport, RestoreFailure)

services/temporal/src/activities/corpusRestoreActivity.ts (wrap Python test)
services/temporal/src/workflows/corpusRestoreWorkflow.ts (nightly schedule)
services/measurement/src/engenox/measurement/__tests__/test_r2_restore.py
.github/workflows/tests.yaml (R2 restore test step)
```

---

## Acceptance Criteria

- [ ] R2 bucket `engenox-corpus` has Object-Lock Compliance + 7y retention verified
- [ ] Measurement `CorpusWriter.write()` writes to PG + R2 synchronously
- [ ] `CorpusRestoreTest` implemented + unit tested (10/10 fixtures pass)
- [ ] Nightly restore workflow deployed via Temporal
- [ ] 7 consecutive nights clean on stage (documented with dates/times)
- [ ] CI gate `test_r2_restore.py` passes (using test R2 endpoint)
- [ ] All CI gates pass
- [ ] Candor flags documented; no silent deferrals