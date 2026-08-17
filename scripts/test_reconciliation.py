#!/usr/bin/env python3
"""
scripts/test_reconciliation.py — Three-sinks reconciliation (PG ↔ ClickHouse ↔ R2).

Nightly job comparing row counts + checksums across the three sinks.
Exits 0 if zero mismatch, 1 otherwise.
Cites: M7 T05; 16 §6 (dual-canonical); 26 §4 (corpus integrity).
"""

import argparse
import asyncio
import hashlib
import os
import sys

import asyncpg
import clickhouse_connect


async def get_pg_conn(database_url: str) -> asyncpg.Connection:
    url = database_url.replace("?sslmode=disable", "")
    if "?" in url:
        url = url.split("?")[0]
    return await asyncpg.connect(url)


def get_ch_client():
    return clickhouse_connect.get_client(
        host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
        username=os.getenv("CLICKHOUSE_USER", "default"),
        password=os.getenv("CLICKHOUSE_PASSWORD", ""),
        database=os.getenv("CLICKHOUSE_DB", "engenox"),
    )


def get_r2_client():
    import boto3
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


async def pg_counts(conn: asyncpg.Connection, since_hours: int) -> dict:
    """Fetch row counts + checksums from PG cio_corpus table."""
    since = f"now() - interval '{since_hours} hours'"

    # Count
    count = await conn.fetchval(
        f"SELECT COUNT(*) FROM cio_corpus WHERE tx_time >= {since}"
    )

    # Checksum of lift_estimate + r2_object_key
    checksum = await conn.fetchval(
        f"""
        SELECT md5(string_agg(lift_estimate::text || r2_object_key, '' ORDER BY id))
        FROM cio_corpus WHERE tx_time >= {since}
        """
    )

    return {
        "sink": "postgres",
        "count": count,
        "checksum": checksum,
    }


def ch_counts(since_hours: int) -> dict:
    """Fetch row counts + checksums from ClickHouse."""
    client = get_ch_client()
    since = f"now() - INTERVAL {since_hours} HOUR"

    count = client.query(
        f"SELECT COUNT(*) FROM cio_corpus WHERE tx_time >= {since}"
    ).result_rows[0][0]

    checksum = client.query(
        f"""
        SELECT md5(arrayJoin(groupArray(lift_estimate || r2_object_key))) as checksum
        FROM cio_corpus WHERE tx_time >= {since}
        """
    ).result_rows

    checksum_val = checksum[0][0] if checksum else None

    return {
        "sink": "clickhouse",
        "count": count,
        "checksum": checksum_val,
    }


def r2_counts(since_hours: int) -> dict:
    """Count objects in R2 corpus prefix for the time window."""
    client = get_r2_client()
    if not client:
        return {"sink": "r2", "count": 0, "checksum": "unconfigured"}

    bucket = os.getenv("R2_CORPUS_BUCKET", "engenox-corpus")

    # List objects in corpus/ prefix
    paginator = client.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=bucket, Prefix="corpus/")

    count = 0
    checksums = []
    for page in pages:
        for obj in page.get("Contents", []):
            count += 1
            # Could HEAD each object for ETag (MD5) but expensive
            # For now just count -- full checksum is a separate job
            if obj["ContentType"] == "application/json":
                resp = client.get_object(Bucket=bucket, Key=obj["Key"])
                body = resp["Body"].read()
                checksums.append(hashlib.sha256(body).hexdigest())

    checksum = hashlib.md5("".join(sorted(checksums)).encode()).hexdigest() if checksums else None

    return {
        "sink": "r2",
        "count": count,
        "checksum": checksum,
    }


async def main() -> int:
    parser = argparse.ArgumentParser(description="Three-sinks reconciliation nightly check")
    parser.add_argument("--hours", type=int, default=24, help="Lookback window in hours")
    parser.add_argument("--tolerance-count", type=int, default=0, help="Max allowed count difference (default 0)")
    parser.add_argument("--pg-url", default=os.getenv("DATABASE_URL"), help="Postgres URL")
    parser.add_argument("--ch-host", default=os.getenv("CLICKHOUSE_HOST"), help="ClickHouse host")
    args = parser.parse_args()

    if not args.pg_url:
        parser.error("DATABASE_URL required (env or --pg-url)")
        return 1

    print(f"🔍 Three-sinks reconciliation (lookback={args.hours}h)")

    try:
        pg = await get_pg_conn(args.pg_url)
        pg_result = await pg_counts(pg, args.hours)
        await pg.close()

        ch_result = ch_counts(args.hours)

        r2_result = r2_counts(args.hours)

        print(f"   PG:      count={pg_result['count']}, checksum={pg_result['checksum']}")
        print(f"   ClickHouse: count={ch_result['count']}, checksum={ch_result['checksum']}")
        print(f"   R2:      count={r2_result['count']}, checksum={r2_result['checksum']}")

        # Compare PG vs ClickHouse
        count_diff = abs(pg_result["count"] - ch_result["count"])
        checksum_match = pg_result["checksum"] == ch_result["checksum"]

        if count_diff > args.tolerance_count:
            print(f"❌ COUNT MISMATCH: PG={pg_result['count']} vs CH={ch_result['count']} (diff={count_diff})")
            return 1

        if not checksum_match:
            print(f"❌ CHECKSUM MISMATCH: PG={pg_result['checksum']} vs CH={ch_result['checksum']}")
            return 1

        # R2 optional comparison
        if r2_result["checksum"] != "unconfigured":
            if abs(pg_result["count"] - r2_result["count"]) > args.tolerance_count:
                print(f"❌ R2 COUNT MISMATCH: PG={pg_result['count']} vs R2={r2_result['count']}")
                return 1
            if pg_result["checksum"] != r2_result["checksum"]:
                print(f"❌ R2 CHECKSUM MISMATCH: PG={pg_result['checksum']} vs R2={r2_result['checksum']}")
                return 1

        print("✅ All sinks reconciled (zero mismatch)")
        return 0

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))