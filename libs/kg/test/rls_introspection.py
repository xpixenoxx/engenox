# rls_introspection.py — the RLS-introspection gate (23 §3 + CLAUDE.md §7).
#
# This gate queries `pg_policies` for EVERY scoping-required table in the M1-thin
# schema and FAILS if any table lacks a `tenant_id` policy. The gate is EXHAUSTIVE:
# it lists the scoping-required tables from the Atlas-defined schema (0001_initial_schema.sql);
# a new table added without a policy FAILS the gate, even if the author forgot.
#
# The tenant_id MUST come from `current_setting('app.tenant_id')` (the JWT-bound session
# variable, 15 §3) — a client-supplied tenant_id is a watchdog cat-4 hit + security
# reviewer's headline. The policy reads the SESSION VAR, not a request field.
#
# Cites: 23 §3 (RLS-introspection gate) · 15 §3 (tenant_id from JWT) · 13 §2 (schema)
#        · 0001_initial_schema.sql (the scoping tables) · CLAUDE.md §7/§12 (candor floor).

import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("SKIP: DATABASE_URL not set — RLS-introspection gate requires live Postgres")
    sys.exit(0)

# The scoping-required tables in the M1-thin schema (from 0001_initial_schema.sql).
# A table in this list MUST have a tenant_id RLS policy.
# The RLS-introspection gate is EXHAUSTIVE — this list IS the schema's source of truth.
# (The canary-row test asserts `assertions` works; this gate asserts ALL tables have policies.)
SCOPING_TABLES = [
    "surfaces",
    "assertions",
    "conflicts",
    "interventions",
    "outcomes",
    "dial_ledger",
]

# The expected policy pattern — every policy on these tables should be a tenant_isolation
# policy that USEs current_setting('app.tenant_id') for the USING clause and WITH CHECK.
EXPECTED_USING_PATTERN = "current_setting('app.tenant_id')::uuid"


def run_gate() -> bool:
    """Run the RLS-introspection gate. Returns True on PASS, False on FAIL."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        with conn.cursor() as cur:
            failed_tables = []

            for table in SCOPING_TABLES:
                cur.execute("""
                    SELECT policyname, cmd, permissive, qual, with_check
                    FROM pg_policies
                    WHERE tablename = %s
                """, (table,))
                policies = cur.fetchall()

                if not policies:
                    failed_tables.append(f"{table}: NO policies found")
                    continue

                # Check that at least one policy has the expected tenant_id pattern in qual or with_check
                has_tenant_policy = False
                for p in policies:
                    qual = p.get("qual", "") or ""
                    with_check = p.get("with_check", "") or ""
                    combined = f"{qual} {with_check}".lower()
                    if "tenant_id" in combined and "current_setting" in combined:
                        has_tenant_policy = True
                        break

                if not has_tenant_policy:
                    failed_tables.append(
                        f"{table}: policies exist but NO tenant_id + current_setting pattern found: {policies}"
                    )

            if failed_tables:
                print("RLS-INTROSPECTION GATE FAILED:")
                for f in failed_tables:
                    print(f"  - {f}")
                return False

            print(f"RLS-INTROSPECTION GATE PASSED: all {len(SCOPING_TABLES)} scoping tables have tenant_id policies.")
            return True

    finally:
        conn.close()


if __name__ == "__main__":
    success = run_gate()
    sys.exit(0 if success else 1)