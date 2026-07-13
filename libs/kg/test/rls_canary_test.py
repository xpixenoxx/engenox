# rls_canary_test.py — the canary-row test for tenant isolation (23 §3 + 15 §3 + CLAUDE.md §12).
#
# This test connects as each tenant (via `SET app.tenant_id = '<uuid>'`), runs a SELECT,
# and asserts ONLY that tenant's rows are visible. The canary row for tenant B has a
# deliberately provocative payload (`CANARY-TENANT-LEAK-{{tenant}}`) so a cross-tenant
# leak is UNMISTAKABLE — the candor floor principle: a leak surfaces LOUDLY, never silently.
#
# The query path USES the `assertion_view` library (the only sanctioned bi-temporal path,
# 13 §3). In Python this is a raw parametrized query that mirrors the view's semantics:
#   WHERE tenant_id = current_setting('app.tenant_id')::uuid
#     AND subject_id = %s
#     AND valid_time @> %s
# No hand-written `valid_time @>` outside this explicit assertion (the watchdog cat-4 catches it).
#
# Cites: 23 §3 (canary-row gate) · 15 §3 (tenant_id from JWT/session) · 13 §3 (assertion_view only)
#        · CLAUDE.md §12 (candor floor: leak = loud fail) · 26 §4 (MVP scope tables).
#        ADR-0003 (CNPG PG17) · ADR-0007 (thin M1: RLS on every real table from first write).

import os
import sys
import uuid

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("SKIP: DATABASE_URL not set — canary-row test requires live Postgres (M1 cell / testcontainer)")
    sys.exit(0)

# The three test tenants (matching the UUIDs in rls_regression.sql).
TENANT_A = uuid.UUID("967b8f2e-5a3c-4d1e-9f8a-7c2b4e6d8f1a")
TENANT_B = uuid.UUID("876c9e1f-4b2d-5c3a-8e9b-6d1c3f7e8a2b")
TENANT_C = uuid.UUID("765d8e0f-3a1b-4c2d-7e8f-5c0b1a2d3e4f")

# The canary subject_ids per tenant — provocative and traceable.
CANARY_A = "CANARY-TENANT-LEAK-A"
CANARY_B = "CANARY-TENANT-LEAK-B"
CANARY_C = "CANARY-TENANT-LEAK-C"

# The half-open bi-temporal window used in the fixture: valid_time [2024-01-01, 2025-01-01)
# We query at validAt = 2024-06-15 (inside the window).
VALID_AT = "2024-06-15T12:00:00Z"


def set_tenant(conn, tenant_id: uuid.UUID) -> None:
    """Set the session variable `app.tenant_id` for RLS scoping (15 §3)."""
    with conn.cursor() as cur:
        cur.execute("SET app.tenant_id = %s", (str(tenant_id),))


def count_assertions_for_subject(conn, subject_id: str, valid_at: str) -> int:
    """
    Count assertions for a subject_id at valid_at under the current tenant's session.
    This mirrors the `libs/kg/assertion_view` semantics:
      tenant_id = current_setting('app.tenant_id')::uuid
      AND subject_id = subject_id
      AND valid_time @> valid_at
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT count(*) as cnt
            FROM assertions
            WHERE subject_id = %s
              AND valid_time @> %s::timestamptz
            """,
            (subject_id, valid_at),
        )
        row = cur.fetchone()
        return row["cnt"] if row else 0


def run_canary_tests() -> bool:
    """Run all canary-row assertions. Returns True on PASS, False on FAIL."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        # ---- TENANT A ----
        set_tenant(conn, TENANT_A)
        a_own = count_assertions_for_subject(conn, CANARY_A, VALID_AT)
        a_b_leak = count_assertions_for_subject(conn, CANARY_B, VALID_AT)
        a_c_leak = count_assertions_for_subject(conn, CANARY_C, VALID_AT)

        print(f"Tenant A: own canary={a_own}, B_leak={a_b_leak}, C_leak={a_c_leak}")
        if a_own != 1:
            print(f"FAIL: Tenant A should see its OWN canary (count=1), got {a_own}")
            return False
        if a_b_leak != 0:
            print(f"FAIL: Tenant A LEAK — saw Tenant B's canary (count={a_b_leak})")
            return False
        if a_c_leak != 0:
            print(f"FAIL: Tenant A LEAK — saw Tenant C's canary (count={a_c_leak})")
            return False

        # ---- TENANT B ----
        set_tenant(conn, TENANT_B)
        b_own = count_assertions_for_subject(conn, CANARY_B, VALID_AT)
        b_a_leak = count_assertions_for_subject(conn, CANARY_A, VALID_AT)
        b_c_leak = count_assertions_for_subject(conn, CANARY_C, VALID_AT)

        print(f"Tenant B: own canary={b_own}, A_leak={b_a_leak}, C_leak={b_c_leak}")
        if b_own != 1:
            print(f"FAIL: Tenant B should see its OWN canary (count=1), got {b_own}")
            return False
        if b_a_leak != 0:
            print(f"FAIL: Tenant B LEAK — saw Tenant A's canary (count={b_a_leak})")
            return False
        if b_c_leak != 0:
            print(f"FAIL: Tenant B LEAK — saw Tenant C's canary (count={b_c_leak})")
            return False

        # ---- TENANT C (no data in fixture — should see zero) ----
        set_tenant(conn, TENANT_C)
        c_a = count_assertions_for_subject(conn, CANARY_A, VALID_AT)
        c_b = count_assertions_for_subject(conn, CANARY_B, VALID_AT)
        c_c = count_assertions_for_subject(conn, CANARY_C, VALID_AT)

        print(f"Tenant C: A={c_a}, B={c_b}, C={c_c}")
        if c_a != 0 or c_b != 0 or c_c != 0:
            print(f"FAIL: Tenant C (no fixture data) saw rows: A={c_a}, B={c_b}, C={c_c}")
            return False

        # ---- CROSS-TENANT UPDATE REJECTION (RLS WITH CHECK) ----
        # As Tenant A, attempt to UPDATE Tenant B's canary — RLS should reject (0 rows affected).
        set_tenant(conn, TENANT_A)
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE assertions
                SET predicate = 'attempted-cross-tenant-mutation'
                WHERE subject_id = %s
                """,
                (CANARY_B,),
            )
            updated = cur.rowcount
            print(f"Tenant A UPDATE on B's canary: rows affected = {updated}")
            if updated != 0:
                print(f"FAIL: Tenant A successfully mutated Tenant B's row (RLS WITH CHECK failed)")
                return False
            # Rollback the failed update attempt (it should have affected 0 rows anyway).
            conn.rollback()

        print("ALL CANARY-ROW TESTS PASSED — tenant isolation holds.")
        return True

    finally:
        conn.close()


if __name__ == "__main__":
    success = run_canary_tests()
    sys.exit(0 if success else 1)