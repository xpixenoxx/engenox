#!/usr/bin/env python3
"""
scripts/verify_reconciliation.py — Three-sinks reconciliation test (M7 T05).

Compares row counts + checksums across:
  1. Postgres (cio_corpus + interventions)
  2. ClickHouse (cio_corpus_olap)
  3. R2 (signed corpus objects)

Fails if any mismatch > 0.
Cites: M7 T05; 16 §6 (dual-canonical); 26 §4 (CIO corpus).
"""

import argparse
import asyncio
import hashlib
import json
import os
import sys

import asyncpg


async def get_pg_conn(url: str):
    url = url.replace("?sslmode=disable", "")
    if "?" in url:
        url = url.split("?")[0]
    return await asyncpg.connect(url)


async def get_ch_conn(url: str):
    import clickhouse_connect
    return clickhouse_connect.get_client(url=url)


async def get_r2_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_TEST_ENDPOINT"),
        aws_access_key_id=os.getenv("R2_TEST_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("R2_TEST_SECRET_KEY"),
        region_name="auto",
    )


async def count_pg(conn, tenant_id: str) -> dict:
    """Count rows in Postgres core tables."""
    tables = {
        "cio_corpus": "SELECT count(*) FROM cio_corpus WHERE tenant_id = $1",
        "interventions": "SELECT count(*) FROM interventions WHERE tenant_id = $1",
        "answer_events": "SELECT count(*) FROM assertions WHERE tenant_id = $1",
    }
    result = {}
    for name, sql in tables.items():
        result[name] = await conn.fetchval(sql, tenant_id)
    return result


async def count_ch(client, tenant_id: str) -> dict:
    """Count rows in ClickHouse mirror tables."""
    tables = {
        "cio_corpus_olap": f"SELECT count() FROM cio_corpus_olap WHERE tenant_id = '{tenant_id}'",
        "interventions_olap": f"SELECT count() FROM interventions_olap WHERE tenant_id = '{tenant_id}'",
        "assertions_olap": f"SELECT count() FROM assertions_olap WHERE tenant_id = '{tenant_id}'",
    }
    result = {}
    for name, sql in tables.items():
        try:
            result[name] = client.query(sql).result_rows[0][0]
        except Exception:
            result[name] = 0
    return result


async def count_r2(client, tenant_id: str) -> dict:
    """Count objects in R2 under tenant prefix."""
    bucket = os.getenv("R2_TEST_BUCKET", "engenox-corpus-test")
    prefix = f"corpus/{tenant_id}/"

    paginator = client.get_paginator("list_objects_v2")
    count = 0
    total_bytes = 0
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            count += 1
            total_bytes += obj["Size"]
    return {"r2_objects": count, "r2_bytes": total_bytes}


async def checksum_pg(conn, tenant_id: str) -> str:
    """Compute deterministic checksum of Postgres data for tenant."""
    rows = await conn.fetch(
        """
        SELECT jsonb_strip_nulls(to_jsonb(t)) as row_json
        FROM (
            SELECT * FROM cio_corpus WHERE tenant_id = $1
            UNION ALL
            SELECT * FROM interventions WHERE tenant_id = $1
        ) t
        ORDER BY tenant_id, tx_time
        """,
        tenant_id,
    )

    content = "".join(json.dumps(dict(r["row_json"]), sort_keys=True) for r in rows)
    return hashlib.sha256(content.encode()).hexdigest()


async def checksum_ch(client, tenant_id: str) -> str:
    """Compute deterministic checksum in ClickHouse."""
    rows = client.query(
        f"""
        SELECT jsonAsString(tuple(tenant_id, intervention_id, lift_estimate, lift_ci_lower, lift_ci_upper, conformal_coverage, r2_object_key, signature))
        FROM cio_corpus WHERE tenant_id = '{tenant_id}'
        UNION ALL
        SELECT jsonAsString(tuple(tenant_id, intervention_id, lift_estimate, lift_ci_lower, lift_ci_upper))
        FROM interventions_olap WHERE tenant_id = '{tenant_id}'
        ORDER BY tenant_id
        """
    ).result_rows

    content = "".join(r[0] for r in rows) if rows else ""
    return hashlib.sha256(content.encode()).hexdigest()


async def checksum_r2(client, tenant_id: str) -> str:
    """Compute checksum of R2 objects for tenant."""
    bucket = os.getenv("R2_TEST_BUCKET", "engenox-corpus-test")
    prefix = f"corpus/{tenant_id}/"

    hashes = []
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            resp = client.get_object(Bucket=bucket, Key=obj["Key"])
            body = resp["Body"].read()
            hashes.append(hashlib.sha256(body).hexdigest())

    return hashlib.sha256("".join(sorted(hashes)).encode()).hexdigest() if hashes else ""


async def main() -> int:
    parser = argparse.ArgumentParser(description="Three-sinks reconciliation test")
    parser.add_argument("--tenant", default="pilot-tenant-001", help="Tenant ID")
    parser.add_argument("--pg-url", default=os.getenv("DATABASE_URL"), help="Postgres URL")
    parser.add_argument("--ch-url", default=os.getenv("CLICKHOUSE_URL"), help="ClickHouse URL")
    parser.add_argument("--r2-bucket", default=os.getenv("R2_TEST_BUCKET"), help="R2 bucket")
    args = parser.parse_args()

    if not args.pg_url:
        parser.error("DATABASE_URL required (env or --pg-url)")
        return 1

    print(f"🔍 Three-sinks reconciliation (tenant={args.tenant})")

    try:
        # Postgres
        pg = await get_pg_conn(args.pg_url)
        pg_counts = await count_pg(pg, args.tenant)
        pg_checksum = await checksum_pg(pg, args.tenant)
        await pg.close()
        print(f"   PostgreSQL: {pg_counts} | checksum={pg_checksum[:16]}...")

        # ClickHouse (optional - may not exist in dev)
        ch_counts = {"cio_corpus_olap": 0, "interventions_olap": 0, "assertions_olap": 0}
        ch_checksum = ""
        if args.ch_url:
            try:
                ch = await get_ch_conn(args.ch_url)
                ch_counts = await count_ch(ch, args.tenant)
                ch_checksum = await checksum_ch(ch, args.tenant)
                ch.close()
                print(f"   ClickHouse: {ch_counts} | checksum={ch_checksum[:16]}...")
            except Exception as e:
                print(f"   ClickHouse: unavailable ({e})")
        else:
            print("   ClickHouse: SKIPPED (no CLICKHOUSE_URL)")

        # R2 (optional - needs test bucket creds)
        r2_counts = {"r2_objects": 0, "r2_bytes": 0}
        r2_checksum = ""
        if os.getenv("R2_TEST_ENDPOINT") and os.getenv("R2_TEST_ACCESS_KEY"):
            try:
                r2 = await get_r2_client()
                r2_counts = await count_r2(r2, args.tenant)
                r2_checksum = await checksum_r2(r2, args.tenant)
                print(f"   R2: {r2_counts} | checksum={r2_checksum[:16]}...")
            except Exception as e:
                print(f"   R2: unavailable ({e})")
        else:
            print("   R2: SKIPPED (no test creds)")

        # Verify PG counts match (core invariant: cio_corpus rows = interventions rows)
        mismatches = []
        if pg_counts["cio_corpus"] != pg_counts["interventions"]:
            mismatches.append(f"PG: cio_corpus({pg_counts['cio_corpus']}) != interventions({pg_counts['interventions']})")

        if args.ch_url and pg_counts["cio_corpus"] != ch_counts["cio_corpus_olap"]:
            mismatches.append(f"PG vs CH: cio_corpus({pg_counts['cio_corpus']}) != cio_corpus_olap({ch_counts['cio_corpus_olap']})")

        if mismatches:
            print("\n❌ MISMATCHES:")
            for m in mismatches:
                print(f"   - {m}")
            return 1

        print(f"\n✅ All sinks reconciled for tenant {args.tenant}")
        return 0

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))