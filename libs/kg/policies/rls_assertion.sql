-- rls_assertion.sql — the RLS policy for the `assertions` table (spine-of-truth).
--
-- This is the TEMPLATE policy the AI copies for every scoping-required table (15 §3).
-- The `tenant_id` is sourced from `current_setting('app.tenant_id')` — the JWT-bound
-- session variable set by the gateway from the WorkOS token claim (15 §3). A client-
-- supplied `tenant_id` is NEVER used (watchdog cat-4 + security reviewer's headline).
--
-- Cites: 15 §3 (RLS-by-tenant, tenant_id from JWT) + 23 §3 (RLS-introspection gate)
--        + 26 §4 (MVP scope) + CLAUDE.md §7 (RLS introspection + canary-row in CI)
--        + ADR-0003 (CNPG Postgres with RLS) + ADR-0007 (thin M1: policy on every real table).

-- Enable RLS on the assertions table (the spine-of-truth, 13 §2).
ALTER TABLE assertions ENABLE ROW LEVEL SECURITY;

-- The tenant isolation policy: a tenant sees ONLY its own rows.
-- `current_setting('app.tenant_id')` is the session variable populated by the gateway
-- from the WorkOS JWT's `tenant_id` claim (15 §3). The `::uuid` cast matches the column type.
-- This policy applies to SELECT, INSERT, UPDATE, DELETE (the default FOR ALL).
CREATE POLICY tenant_isolation ON assertions
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Force RLS for table owners too (the `rls_tenant` role policy enforces; `rls_auditor`
-- is the audit role that can read across tenants via a separate policy — T04's CNPG
-- CR creates both roles + GRANTs). `FORCE ROW LEVEL SECURITY` ensures the table owner
-- is not bypassed (defense-in-depth against role escalation).
ALTER TABLE assertions FORCE ROW LEVEL SECURITY;

COMMENT ON POLICY tenant_isolation ON assertions IS 'RLS-by-tenant: tenant_id from JWT (current_setting), never client-supplied. 15 §3 + watchdog cat-4.';