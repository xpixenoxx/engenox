"""
services/measurement/__tests__/test_reconciliation.py — Three-sinks reconciliation fixture test.

Compares row counts + checksums across:
  1. Postgres (cio_corpus + interventions)
  2. ClickHouse (cio_corpus_olap)
  3. R2 (signed corpus objects)

Fixture: 10 known test rows inserted into all three sinks.
Cites: M7 T05; 16 §6 (dual-canonical); 26 §4 (corpus integrity).
"""

import asyncio
import hashlib
import json
import os

import asyncpg  # type: ignore[import-not-found]
import clickhouse_connect  # type: ignore[import-not-found]
import pytest  # type: ignore[import-not-found]
import pytest_asyncio  # type: ignore[import-not-found]

# --- Fixtures ----------------------------------------------------------------

@pytest.fixture(scope="session")
def pg_url():
    url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/engenox")
    if "sslmode=disable" in url:
        url = url.replace("?sslmode=disable", "")
    return url


@pytest.fixture(scope="session")
def ch_client():
    host = os.getenv("CLICKHOUSE_HOST", "localhost")
    port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    user = os.getenv("CLICKHOUSE_USER", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")
    db = os.getenv("CLICKHOUSE_DB", "engenox")
    try:
        client = clickhouse_connect.get_client(
            host=host, port=port, username=user, password=password, database=db
        )
        # Test connection
        client.query("SELECT 1")
        return client
    except Exception:
        return None


@pytest.fixture(scope="session")
def r2_client():
    import boto3  # type: ignore[import-not-found]
    endpoint = os.getenv("R2_TEST_ENDPOINT")
    access = os.getenv("R2_TEST_ACCESS_KEY")
    secret = os.getenv("R2_TEST_SECRET_KEY")
    if not (endpoint and access and secret):
        return None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access,
        aws_secret_access_key=secret,
        region_name="auto",
    )


@pytest.fixture(scope="function")
async def pg_conn(pg_url):
    try:
        conn = await asyncpg.connect(pg_url)
        try:
            yield conn
        finally:
            await conn.close()
    except Exception:
        pytest.skip("Postgres not available")


# --- Test Data Generation ----------------------------------------------------

def generate_test_rows(n: int = 10) -> list[dict]:
    """Generate N deterministic test corpus rows."""
    rows = []
    for i in range(n):
        rows.append({
            "id": f"test-corpus-{i:04d}",
            "tenant_id": "reconciliation-test-tenant",
            "intervention_id": f"test-intervention-{i:04d}",
            "lift_estimate": 0.05 + (i * 0.001),
            "lift_ci_lower": 0.02 + (i * 0.001),
            "lift_ci_upper": 0.08 + (i * 0.001),
            "conformal_coverage": 0.95,
            "integrity_tags": json.dumps({
                "tenant_consent": True,
                "source_provenance": f"test-source-{i}",
                "estimator_version": "scm-v1.0",
                "conformal_method": "split-conformal",
            }),
            "r2_object_key": f"corpus/test-corpus-{i:04d}.json",
            "signature": hashlib.sha256(f"test-{i}".encode()).hexdigest()[:64],
        })
    return rows


# --- Helpers -----------------------------------------------------------------

async def insert_pg_test_data(conn: asyncpg.Connection, rows: list[dict]) -> tuple[int, str]:
    """Insert test rows into PG, return (count, checksum)."""
    for r in rows:
        await conn.execute(
            """
            INSERT INTO cio_corpus (id, tenant_id, intervention_id, lift_estimate, lift_ci_lower,
                                    lift_ci_upper, conformal_coverage, integrity_tags,
                                    r2_object_key, signature, tx_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
            ON CONFLICT (id) DO UPDATE SET
                lift_estimate = EXCLUDED.lift_estimate,
                lift_ci_lower = EXCLUDED.lift_ci_lower,
                lift_ci_upper = EXCLUDED.lift_ci_upper,
                integrity_tags = EXCLUDED.integrity_tags,
                r2_object_key = EXCLUDED.r2_object_key,
                signature = EXCLUDED.signature,
                tx_time = now()
            """,
            r["id"], r["tenant_id"], r["intervention_id"], r["lift_estimate"],
            r["lift_ci_lower"], r["lift_ci_upper"], r["conformal_coverage"],
            r["integrity_tags"], r["r2_object_key"], r["signature"],
        )

    count = await conn.fetchval(
        "SELECT COUNT(*) FROM cio_corpus WHERE tenant_id = $1",
        "reconciliation-test-tenant"
    )
    checksum = await conn.fetchval(
        """
        SELECT md5(string_agg(lift_estimate::text || r2_object_key, '' ORDER BY id))
        FROM cio_corpus WHERE tenant_id = $1
        """,
        "reconciliation-test-tenant"
    )
    return count, checksum


def insert_ch_test_data(client: clickhouse_connect.Client, rows: list[dict]) -> tuple[int, str]:
    """Insert test rows into ClickHouse, return (count, checksum)."""
    data = [(
        r["id"], r["tenant_id"], r["intervention_id"], r["lift_estimate"],
        r["lift_ci_lower"], r["lift_ci_upper"], r["conformal_coverage"],
        r["integrity_tags"], r["r2_object_key"], r["signature"],
    ) for r in rows]

    client.insert(
        "cio_corpus",
        data,
        column_names=[
            "id", "tenant_id", "intervention_id", "lift_estimate", "lift_ci_lower",
            "lift_ci_upper", "conformal_coverage", "integrity_tags",
            "r2_object_key", "signature",
        ]
    )

    count = client.query(
        "SELECT COUNT(*) FROM cio_corpus WHERE tenant_id = 'reconciliation-test-tenant'"
    ).result_rows[0][0]

    checksum = client.query(
        """
        SELECT md5(arrayJoin(groupArray(lift_estimate || r2_object_key)))
        FROM cio_corpus WHERE tenant_id = 'reconciliation-test-tenant'
        """
    ).result_rows[0][0]

    return count, checksum


def insert_r2_test_data(client, bucket: str, rows: list[dict]) -> tuple[int, str]:
    """Insert test objects into R2, return (count, checksum)."""
    for r in rows:
        body = json.dumps(r, sort_keys=True, separators=(",", ":")).encode()
        client.put_object(
            Bucket=bucket,
            Key=r["r2_object_key"],
            Body=body,
            ContentType="application/json",
        )

    # Count + checksum
    paginator = client.get_paginator("list_objects_v2")
    count = 0
    hashes = []
    for page in paginator.paginate(Bucket=bucket, Prefix="corpus/test-corpus-"):
        for obj in page.get("Contents", []):
            count += 1
            resp = client.get_object(Bucket=bucket, Key=obj["Key"])
            body = resp["Body"].read()
            hashes.append(hashlib.sha256(body).hexdigest())

    checksum = hashlib.md5("".join(sorted(hashes)).encode()).hexdigest()
    return count, checksum


def cleanup_pg(conn: asyncpg.Connection):
    """Remove test data from PG."""
    asyncio.run(conn.execute(
        "DELETE FROM cio_corpus WHERE tenant_id = 'reconciliation-test-tenant'"
    ))


def cleanup_ch(client: clickhouse_connect.Client):
    """Remove test data from ClickHouse."""
    client.query(
        "DELETE FROM cio_corpus WHERE tenant_id = 'reconciliation-test-tenant'"
    )


def cleanup_r2(client, bucket: str):
    """Remove test objects from R2."""
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix="corpus/test-corpus-"):
        for obj in page.get("Contents", []):
            client.delete_object(Bucket=bucket, Key=obj["Key"])


# --- Tests -------------------------------------------------------------------

class TestThreeSinksReconciliation:
    """Verify zero-mismatch reconciliation across PG, ClickHouse, and R2."""

    @pytest_asyncio.fixture(autouse=True)
    async def setup_teardown(self, pg_conn, ch_client, r2_client):
        rows = generate_test_rows(10)
        bucket = os.getenv("R2_TEST_BUCKET", "engenox-corpus-test")

        # Setup
        pg_count, pg_checksum = await insert_pg_test_data(pg_conn, rows)

        if ch_client:
            ch_count, ch_checksum = insert_ch_test_data(ch_client, rows)
        else:
            ch_count, ch_checksum = 0, ""

        if r2_client:
            r2_count, r2_checksum = insert_r2_test_data(r2_client, bucket, rows)
        else:
            r2_count, r2_checksum = 0, ""

        self.pg_data = (pg_count, pg_checksum)
        self.ch_data = (ch_count, ch_checksum)
        self.r2_data = (r2_count, r2_checksum)
        self.rows = rows
        self.bucket = bucket
        self.r2_client = r2_client
        self.ch_client = ch_client

        yield

        # Teardown
        await pg_conn.execute(
            "DELETE FROM cio_corpus WHERE tenant_id = 'reconciliation-test-tenant'"
        )
        if ch_client:
            ch_client.query(
                "DELETE FROM cio_corpus WHERE tenant_id = 'reconciliation-test-tenant'"
            )
        if r2_client:
            cleanup_r2(r2_client, bucket)

    @pytest.mark.asyncio
    async def test_pg_clickhouse_count_match(self):
        """PG and ClickHouse row counts must match exactly."""
        if not self.ch_client:
            pytest.skip("ClickHouse not configured")
        pg_count, _ = self.pg_data
        ch_count, _ = self.ch_data
        assert pg_count == ch_count, (
            f"Row count mismatch: PG={pg_count}, ClickHouse={ch_count}"
        )

    @pytest.mark.asyncio
    async def test_pg_clickhouse_checksum_match(self):
        """PG and ClickHouse data checksums must match (data integrity)."""
        if not self.ch_client:
            pytest.skip("ClickHouse not configured")
        _, pg_checksum = self.pg_data
        _, ch_checksum = self.ch_data
        assert pg_checksum == ch_checksum, (
            f"Checksum mismatch: PG={pg_checksum}, ClickHouse={ch_checksum}"
        )

    @pytest.mark.asyncio
    async def test_pg_r2_count_match(self):
        """PG row count must match R2 object count (if R2 configured)."""
        if not self.r2_client:
            pytest.skip("R2 test credentials not configured")
        pg_count, _ = self.pg_data
        r2_count, _ = self.r2_data
        assert pg_count == r2_count, (
            f"Object count mismatch: PG={pg_count}, R2={r2_count}"
        )

    @pytest.mark.asyncio
    async def test_pg_r2_checksum_match(self):
        """PG and R2 data checksums must match (if R2 configured)."""
        if not self.r2_client:
            pytest.skip("R2 test credentials not configured")
        _, pg_checksum = self.pg_data
        _, r2_checksum = self.r2_data
        assert pg_checksum == r2_checksum, (
            f"Checksum mismatch: PG={pg_checksum}, R2={r2_checksum}"
        )

    @pytest.mark.asyncio
    async def test_exact_fixture_size(self):
        """All sinks must have exactly 10 test rows, no more no less."""
        expected = 10
        pg_count, _ = self.pg_data
        ch_count, _ = self.ch_data

        assert pg_count == expected, f"PG has {pg_count} rows, expected {expected}"
        if self.ch_client:
            assert ch_count == expected, f"ClickHouse has {ch_count} rows, expected {expected}"

        if self.r2_client:
            r2_count, _ = self.r2_data
            assert r2_count == expected, f"R2 has {r2_count} objects, expected {expected}"

    @pytest.mark.asyncio
    async def test_integrity_tags_present(self, pg_conn):
        """Every test row must have all required integrity tags."""
        rows = await pg_conn.fetch("""
            SELECT integrity_tags FROM cio_corpus
            WHERE tenant_id = 'reconciliation-test-tenant'
        """)
        required = ["tenant_consent", "source_provenance", "estimator_version", "conformal_method"]
        for r in rows:
            tags = json.loads(r["integrity_tags"])
            for req in required:
                assert req in tags, f"Missing integrity tag '{req}' in row"


# --- R2 Restore Test (T06) ---------------------------------------------------

class TestR2Restore:
    """Verify R2 WORM bucket can be written and read back correctly (10/10)."""

    @pytest.fixture(autouse=True)
    def setup_teardown(self, r2_client):
        if not r2_client:
            pytest.skip("R2 test credentials not configured")
        self.client = r2_client
        self.bucket = os.getenv("R2_TEST_BUCKET", "engenox-corpus-test")
        yield
        # Cleanup
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix="restore-test/"):
            for obj in page.get("Contents", []):
                self.client.delete_object(Bucket=self.bucket, Key=obj["Key"])

    def test_write_and_verify_10_objects(self):
        """Write 10 test objects, read back, verify all 10 match."""
        n = 10
        prefix = "restore-test/test-r2-restore-"

        for i in range(n):
            key = f"{prefix}{i:04d}.json"
            content = {
                "test_id": i,
                "tenant_id": "r2-restore-test-tenant",
                "corpus_row_id": f"restore-test-row-{i:04d}",
                "lift_estimate": 0.1 + i * 0.001,
                "integrity_tags": {"tenant_consent": True, "test": "r2-restore"},
            }
            body = json.dumps(content, sort_keys=True).encode()
            expected_hash = hashlib.sha256(body).hexdigest()

            self.client.put_object(
                Bucket=self.bucket, Key=key, Body=body,
                Metadata={"content-sha256": expected_hash, "test": "true"},
                ContentType="application/json",
            )

        # Read back and verify
        passed = 0
        for i in range(n):
            key = f"{prefix}{i:04d}.json"
            resp = self.client.get_object(Bucket=self.bucket, Key=key)
            body = resp["Body"].read()
            actual_hash = hashlib.sha256(body).hexdigest()
            expected_hash = resp["Metadata"].get("content-sha256", "")

            assert actual_hash == expected_hash, f"Hash mismatch for {key}"
            passed += 1

        assert passed == n, f"Only {passed}/{n} objects verified"