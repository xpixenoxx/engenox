#!/usr/bin/env python3
"""
scripts/seed-conflict-stage.py — Seed a conflict for the pilot tenant.

Creates an AnswerEvent with a detected conflict (e.g., hallucinated URL + missing citation)
to trigger the AtlasCycle. Idempotent: upserts by tenant_id + surface + conflict_hash.
Cites: M7 T02; 13 §4 (conflict detection).
"""

import argparse
import json
import os
import sys
import hashlib
from datetime import datetime, timezone

import asyncpg


async def get_connection(database_url: str) -> asyncpg.Connection:
    url = database_url.replace("?sslmode=disable", "")
    if "?" in url:
        url = url.split("?")[0]
    return await asyncpg.connect(url)


async def ensure_pilot_tenant(conn: asyncpg.Connection) -> str:
    """Ensure pilot tenant exists, return its ID."""
    pilot_id = "00000000-0000-0000-0000-000000000001"
    await conn.execute(
        """
        INSERT INTO tenants (id, name, plan, settings, created_at)
        VALUES ($1, 'Pilot Tenant', 'pilot', '{}'::jsonb, now())
        ON CONFLICT (id) DO NOTHING
        """,
        pilot_id,
    )
    return pilot_id


async def ensure_pilot_surfaces(conn: asyncpg.Connection, tenant_id: str, surfaces: list[str]) -> dict:
    """Ensure surfaces exist for pilot tenant, return map surface_name -> surface_id."""
    surface_ids = {}
    for s in surfaces:
        entity_id = f"{s}-{tenant_id}"
        row = await conn.fetchrow(
            """
            INSERT INTO surfaces (id, tenant_id, entity_id, type, attrs, valid_time, provenance_id, created_at)
            VALUES (gen_random_uuid(), $1, $2, 'surface', '{}'::jsonb,
                    tstzrange(now(), 'infinity'::timestamptz), gen_random_uuid(), now())
            ON CONFLICT (tenant_id, entity_id) DO UPDATE SET id = surfaces.id
            RETURNING id
            """,
            tenant_id,
            entity_id,
        )
        surface_ids[s] = row["id"]
    return surface_ids


async def seed_conflict(conn: asyncpg.Connection, tenant_id: str, surface_name: str, surface_id: str) -> int:
    """Insert an AnswerEvent with a conflict, return assertion_id."""
    # Create a deterministic conflict hash for idempotency
    conflict_payload = {
        "tenant_id": tenant_id,
        "surface": surface_name,
        "conflict_type": "hallucinated_url",
        "extracted_claim": "Engenox was founded in 2020 by John Smith",
        "ground_truth": "Engenox was founded in 2024 by Pixenox Solutions",
        "evidence_url": "https://example.com/hallucinated-source",  # Fake URL
        "severity": "HIGH",
    }
    conflict_hash = hashlib.sha256(json.dumps(conflict_payload, sort_keys=True).encode()).hexdigest()[:16]

    # Upsert assertion (AnswerEvent equivalent in KG)
    row = await conn.fetchrow(
        """
        INSERT INTO assertions (
            id, tenant_id, surface_id, claim, evidence_urls, confidence, conflict_hash,
            conflict_type, conflict_severity, valid_time, provenance_id, created_at, tx_time
        )
        VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
            tstzrange(now(), 'infinity'::timestamptz), gen_random_uuid(), now(), now()
        )
        ON CONFLICT (tenant_id, conflict_hash) DO UPDATE SET
            claim = EXCLUDED.claim,
            evidence_urls = EXCLUDED.evidence_urls,
            confidence = EXCLUDED.confidence,
            conflict_type = EXCLUDED.conflict_type,
            conflict_severity = EXCLUDED.conflict_severity,
            valid_time = EXCLUDED.valid_time,
            tx_time = now()
        RETURNING id
        """,
        tenant_id,
        surface_id,
        conflict_payload["extracted_claim"],
        json.dumps([conflict_payload["evidence_url"]]),
        0.95,  # confidence the LLM had in the hallucination
        conflict_hash,
        conflict_payload["conflict_type"],
        conflict_payload["severity"],
    )
    return row["id"]


async def main() -> int:
    parser = argparse.ArgumentParser(description="Seed conflict for pilot tenant")
    parser.add_argument("--tenant", default="00000000-0000-0000-0000-000000000001", help="Tenant ID")
    parser.add_argument("--surface", default="chatgpt", help="Surface name (chatgpt, perplexity, gemini, grok, claude)")
    parser.add_argument("--surfaces", nargs="+", help="Multiple surfaces to seed")
    parser.add_argument("--env", required=True, choices=["stage", "dev"], help="Environment")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"), help="Postgres URL")
    args = parser.parse_args()

    if not args.database_url:
        parser.error("DATABASE_URL required (env or --database-url)")
        return 1

    surfaces = args.surfaces if args.surfaces else [args.surface]
    print(f"🌱 Seeding conflict for {args.env}...")
    print(f"   Tenant: {args.tenant}")
    print(f"   Surfaces: {surfaces}")

    try:
        conn = await get_connection(args.database_url)
        await ensure_pilot_tenant(conn)
        surface_ids = await ensure_pilot_surfaces(conn, args.tenant, surfaces)

        for s in surfaces:
            assertion_id = await seed_conflict(conn, args.tenant, s, surface_ids[s])
            print(f"   ✅ Conflict seeded for {s}: assertion_id={assertion_id}")

        await conn.close()
        print(f"\n✅ Conflict fixture seeded successfully")
        return 0
    except Exception as e:
        print(f"❌ Failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    import asyncio
    sys.exit(asyncio.run(main()))