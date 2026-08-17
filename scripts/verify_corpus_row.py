#!/usr/bin/env python3
"""
scripts/verify_corpus_row.py — Verify CIOCorpusRow was written for the tenant.

Checks the cio_corpus table for a row with integrity_tags + lift + CI.
Exits 0 if valid row found, 1 otherwise.
Cites: M7 T02; 16 §4 (CIO corpus); 26 §4 (lift + CI + contrarian).
"""

import argparse
import json
import os
import sys

import asyncpg


async def get_connection(database_url: str) -> asyncpg.Connection:
    url = database_url.replace("?sslmode=disable", "")
    if "?" in url:
        url = url.split("?")[0]
    return await asyncpg.connect(url)


async def verify_corpus_row(conn: asyncpg.Connection, tenant_id: str) -> bool:
    row = await conn.fetchrow(
        """
        SELECT id, tenant_id, intervention_id, lift_estimate, lift_ci_lower, lift_ci_upper,
               conformal_coverage, integrity_tags, r2_object_key, signature, tx_time
        FROM cio_corpus
        WHERE tenant_id = $1
        ORDER BY tx_time DESC
        LIMIT 1
        """,
        tenant_id,
    )

    if not row:
        print(f"❌ No CIOCorpusRow found for tenant {tenant_id}")
        return False

    print(f"✅ Found CIOCorpusRow: {row['id']}")
    print(f"   tx_time: {row['tx_time']}")
    print(f"   intervention_id: {row['intervention_id']}")
    print(f"   lift: {row['lift_estimate']:.4f} (CI: [{row['lift_ci_lower']:.4f}, {row['lift_ci_upper']:.4f}])")
    print(f"   conformal_coverage: {row['conformal_coverage']}")

    # Verify required fields
    checks = [
        ("lift_estimate", row["lift_estimate"] is not None),
        ("lift_ci_lower", row["lift_ci_lower"] is not None),
        ("lift_ci_upper", row["lift_ci_upper"] is not None),
        ("integrity_tags", row["integrity_tags"] is not None),
        ("r2_object_key", row["r2_object_key"] is not None),
        ("signature", row["signature"] is not None),
    ]

    all_ok = True
    for name, ok in checks:
        status = "✅" if ok else "❌"
        print(f"   {status} {name}: {'present' if ok else 'MISSING'}")
        if not ok:
            all_ok = False

    # Verify integrity_tags structure
    if row["integrity_tags"]:
        try:
            tags = json.loads(row["integrity_tags"]) if isinstance(row["integrity_tags"], str) else row["integrity_tags"]
            required_tags = ["tenant_consent", "source_provenance", "estimator_version", "conformal_method"]
            for tag in required_tags:
                has_tag = tag in tags
                status = "✅" if has_tag else "❌"
                print(f"   {status} integrity_tags.{tag}: {'present' if has_tag else 'MISSING'}")
                if not has_tag:
                    all_ok = False
        except Exception as e:
            print(f"   ❌ integrity_tags invalid JSON: {e}")
            all_ok = False

    # Verify CI contains the estimate
    if row["lift_ci_lower"] is not None and row["lift_ci_upper"] is not None and row["lift_estimate"] is not None:
        if not (row["lift_ci_lower"] <= row["lift_estimate"] <= row["lift_ci_upper"]):
            print("   ❌ lift_estimate not within CI bounds")
            all_ok = False
        else:
            print("   ✅ lift_estimate within CI bounds")

    # Verify R2 object key format
    if row["r2_object_key"] and row["r2_object_key"].startswith("corpus/"):
        print("   ✅ r2_object_key has corpus/ prefix")
    elif row["r2_object_key"]:
        print(f"   ⚠️  r2_object_key format unexpected: {row['r2_object_key']}")

    return all_ok


async def main() -> int:
    parser = argparse.ArgumentParser(description="Verify CIOCorpusRow for tenant")
    parser.add_argument("--tenant", required=True, help="Tenant ID")
    parser.add_argument("--env", required=True, choices=["stage", "dev"], help="Environment")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"), help="Postgres URL")
    args = parser.parse_args()

    if not args.database_url:
        parser.error("DATABASE_URL required (env or --database-url)")
        return 1

    print(f"🔍 Verifying CIOCorpusRow for {args.env} tenant={args.tenant}")

    try:
        conn = await get_connection(args.database_url)
        ok = await verify_corpus_row(conn, args.tenant)
        await conn.close()

        if ok:
            print(f"\n✅ CIOCorpusRow verification PASSED")
            return 0
        else:
            print(f"\n❌ CIOCorpusRow verification FAILED")
            return 1
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    import asyncio
    sys.exit(asyncio.run(main()))