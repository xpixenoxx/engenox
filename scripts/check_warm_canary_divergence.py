#!/usr/bin/env python3
"""
scripts/check_warm_canary_divergence.py — Warm-canary divergence check (M7 T03).

Measures lift estimate divergence between canary (dial=propose) and control (no intervention)
over the last N hours. Fails if divergence > threshold (default 15%).
Cites: M7 T03; 11 §6 (warm-canary); 26 §4 (lift + CI).
"""

import argparse
import asyncio
import os
import sys


async def get_connection(database_url: str):
    url = database_url.replace("?sslmode=disable", "")
    if "?" in url:
        url = url.split("?")[0]
    import asyncpg
    return await asyncpg.connect(url)


async def fetch_lift_estimates(conn, hours: int, tenant_id: str):
    """Fetch latest lift estimates for canary and control groups."""

    # Canary = interventions with dial=propose (treatment)
    canary = await conn.fetchrow(
        """
        SELECT avg(lift_estimate) as avg_lift
        FROM cio_corpus
        WHERE tenant_id = $1
          AND tx_time >= now() - interval '%s hours'
          AND integrity_tags::jsonb @> '{"dial": "propose"}'  -- canary group
        """,
        tenant_id,
    )

    # Control = no intervention (baseline) - use foreign change detector baseline
    # or fallback to 0 lift for control group
    # For MVP: control lift = 0 (no intervention = no lift expected)
    control = await conn.fetchrow(
        """
        SELECT avg(lift_estimate) as avg_lift
        FROM cio_corpus
        WHERE tenant_id = $1
          AND tx_time >= now() - interval '%s hours'
          AND integrity_tags::jsonb @> '{"dial": "control"}'  -- control group
        """,
        tenant_id,
    )

    canary_lift = canary["avg_lift"] if canary and canary["avg_lift"] is not None else 0.0
    control_lift = control["avg_lift"] if control and control["avg_lift"] is not None else 0.0

    # If no control group data yet, assume 0 (no intervention = no lift)
    if control_lift == 0.0:
        print("   ⚠️  No control group data yet — assuming 0 lift for control")

    return canary_lift, control_lift


def compute_divergence(canary: float, control: float) -> float:
    """Compute relative divergence: |canary - control| / max(|control|, epsilon)"""
    epsilon = 1e-6
    if abs(control) < epsilon:
        return abs(canary)  # if control ~0, divergence = absolute canary
    return abs(canary - control) / abs(control)


async def main() -> int:
    parser = argparse.ArgumentParser(description="Warm-canary divergence check")
    parser.add_argument("--hours", type=int, default=48, help="Lookback window in hours")
    parser.add_argument("--threshold", type=float, default=0.15, help="Max divergence (0.15 = 15%)")
    parser.add_argument("--tenant", default="pilot-tenant-001", help="Tenant ID")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"), help="Postgres URL")
    args = parser.parse_args()

    if not args.database_url:
        parser.error("DATABASE_URL required (env or --database-url)")
        return 1

    print(f"🔍 Checking warm-canary divergence (tenant={args.tenant}, window={args.hours}h, threshold={args.threshold:.0%})")

    try:
        conn = await get_connection(args.database_url)
        canary_lift, control_lift = await fetch_lift_estimates(conn, args.hours, args.tenant)
        await conn.close()

        divergence = compute_divergence(canary_lift, control_lift)
        print(f"\n📊 Results:")
        print(f"   Canary lift (dial=propose): {canary_lift:.4f}")
        print(f"   Control lift (dial=control): {control_lift:.4f}")
        print(f"   Divergence: {divergence:.2%} (threshold: {args.threshold:.0%})")

        if divergence <= args.threshold:
            print("✅ PASS: Divergence within threshold")
            return 0
        else:
            print("❌ FAIL: Divergence exceeds threshold")
            return 1

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))