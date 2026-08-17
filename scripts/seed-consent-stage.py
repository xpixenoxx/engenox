#!/usr/bin/env python3
"""
scripts/seed-consent-stage.py — Seed consent fixture for founder cohort (3 tenants × 5 surfaces).

Idempotent: ON CONFLICT DO UPDATE. Run against stage Postgres via SSM tunnel or direct VPC access.
Cites: M7 T02; 16 §3 (consent ledger); 26 §4 (RCT_ELIGIBLE cohort).
"""

import argparse
import os
import sys
import uuid
from datetime import datetime, timezone

import asyncpg


SURFACES = ["chatgpt", "perplexity", "gemini", "grok", "claude"]

TENANTS = [
    {"id": "11111111-1111-1111-1111-111111111111", "name": "Acme Corp", "plan": "starter"},
    {"id": "22222222-2222-2222-2222-222222222222", "name": "Beta Inc", "plan": "starter"},
    {"id": "33333333-3333-3333-3333-333333333333", "name": "Gamma Ltd", "plan": "starter"},
]

PILOT_TENANT = {"id": "00000000-0000-0000-0000-000000000001", "name": "Pilot Tenant", "plan": "pilot"}


async def get_connection(database_url: str) -> asyncpg.Connection:
    # Strip sslmode=disable if present (asyncpg doesn't need it)
    url = database_url.replace("?sslmode=disable", "")
    if "?" in url:
        url = url.split("?")[0]
    return await asyncpg.connect(url)


async def ensure_tenants(conn: asyncpg.Connection) -> None:
    for t in TENANTS + [PILOT_TENANT]:
        await conn.execute(
            """
            INSERT INTO tenants (id, name, plan, settings, created_at)
            VALUES ($1, $2, $3, '{}'::jsonb, now())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                plan = EXCLUDED.plan,
                settings = EXCLUDED.settings
            """,
            t["id"],
            t["name"],
            t["plan"],
        )
    print(f"✅ Tenants ensured: {len(TENANTS) + 1}")


async def ensure_surfaces(conn: asyncpg.Connection) -> dict:
    """Return map of (tenant_id, surface_name) -> surface_id"""
    surface_ids = {}
    for t in TENANTS + [PILOT_TENANT]:
        for s in SURFACES:
            entity_id = f"{s}-{t['id']}"
            # Upsert surface
            row = await conn.fetchrow(
                """
                INSERT INTO surfaces (id, tenant_id, entity_id, type, attrs, valid_time, provenance_id, created_at)
                VALUES (gen_random_uuid(), $1, $2, 'surface', '{}'::jsonb,
                        tstzrange(now(), 'infinity'::timestamptz), gen_random_uuid(), now())
                ON CONFLICT (tenant_id, entity_id) DO UPDATE SET
                    id = surfaces.id,
                    attrs = EXCLUDED.attrs
                RETURNING id
                """,
                t["id"],
                entity_id,
            )
            surface_ids[(t["id"], s)] = row["id"]
    print(f"✅ Surfaces ensured: {len(surface_ids)}")
    return surface_ids


async def ensure_consents(conn: asyncpg.Connection, surface_ids: dict) -> None:
    count = 0
    for t in TENANTS + [PILOT_TENANT]:
        for s in SURFACES:
            surf_id = surface_ids[(t["id"], s)]
            # Upsert consent
            await conn.execute(
                """
                INSERT INTO consents (id, tenant_id, surface_id, status, granted_at, rct_eligible, created_at)
                VALUES (gen_random_uuid(), $1, $2, 'GRANTED', now(), true, now())
                ON CONFLICT (tenant_id, surface_id) DO UPDATE SET
                    status = 'GRANTED',
                    rct_eligible = true,
                    granted_at = now()
                """,
                t["id"],
                surf_id,
            )
            count += 1
    print(f"✅ Consents ensured: {count}")


async def verify(conn: asyncpg.Connection) -> None:
    # Total counts
    total = await conn.fetchval("SELECT COUNT(*) FROM consents")
    granted = await conn.fetchval("SELECT COUNT(*) FROM consents WHERE status = 'GRANTED'")
    rct = await conn.fetchval("SELECT COUNT(*) FROM consents WHERE rct_eligible = true")
    print(f"\n📊 Verification:")
    print(f"   Total consents: {total}")
    print(f"   Granted: {granted}")
    print(f"   RCT_ELIGIBLE: {rct}")

    # Per-tenant breakdown
    rows = await conn.fetch("""
        SELECT t.name as tenant, COUNT(c.*) as consents,
               STRING_AGG(s.entity_id, ', ') as surfaces
        FROM consents c
        JOIN tenants t ON t.id = c.tenant_id
        JOIN surfaces s ON s.id = c.surface_id
        GROUP BY t.name
        ORDER BY t.name
    """)
    for r in rows:
        print(f"   {r['tenant']}: {r['consents']} consents [{r['surfaces']}]")

    # Ensure pilot tenant has data
    pilot_count = await conn.fetchval(
        "SELECT COUNT(*) FROM consents c JOIN tenants t ON t.id = c.tenant_id WHERE t.id = $1",
        PILOT_TENANT["id"],
    )
    if pilot_count == 0:
        print("⚠️  WARNING: Pilot tenant has no consents!", file=sys.stderr)
        sys.exit(1)
    print(f"   Pilot tenant: {pilot_count} consents ✅")


async def main() -> int:
    parser = argparse.ArgumentParser(description="Seed consent fixture for stage")
    parser.add_argument("--env", required=True, choices=["stage", "dev"], help="Environment")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"), help="Postgres URL")
    args = parser.parse_args()

    if not args.database_url:
        parser.error("DATABASE_URL required (env or --database-url)")
        return 1

    print(f"🌱 Seeding consent fixture for {args.env}...")
    print(f"   DB: {args.database_url.split('@')[-1] if '@' in args.database_url else args.database_url}")

    try:
        conn = await get_connection(args.database_url)
        await ensure_tenants(conn)
        surface_ids = await ensure_surfaces(conn)
        await ensure_consents(conn, surface_ids)
        await verify(conn)
        await conn.close()
        print(f"\n✅ Consent fixture seeded successfully for {args.env}")
        return 0
    except Exception as e:
        print(f"❌ Failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))