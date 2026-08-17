-- init-rls.sql — Initialize Row Level Security roles and base policies
-- Runs as part of docker-entrypoint-initdb.d
-- Note: Full RLS policies are applied by Atlas migrations (libs/kg/migrations/atlas/0001_initial_schema.sql)
-- This script sets up the shared RLS infrastructure

-- Create RLS roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_tenant') THEN
        CREATE ROLE rls_tenant NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_auditor') THEN
        CREATE ROLE rls_auditor NOLOGIN;
    END IF;
END
$$;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO rls_tenant, rls_auditor;
GRANT USAGE ON SCHEMA ag_catalog TO rls_tenant, rls_auditor;

-- Function to get current tenant_id from session variable
-- This is set by the application middleware on each request
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$;

-- Function to check if user is auditor (bypass RLS for audit queries)
CREATE OR REPLACE FUNCTION is_auditor() RETURNS boolean
LANGUAGE sql STABLE
AS $$
    SELECT current_user = 'rls_auditor';
$$;

-- Revoke public access on tables that will have RLS
-- (Atlas migration will enable RLS on specific tables)
-- This is a safety default
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'RLS infrastructure initialized. Tenant isolation via app.tenant_id session variable.';
END
$$;