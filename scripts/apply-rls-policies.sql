-- Apply RLS policies to scoping tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON tenants USING (id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='surfaces' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON surfaces USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='assertions' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON assertions USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conflicts' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON conflicts USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='interventions' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON interventions USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outcomes' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON outcomes USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dial_ledger' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON dial_ledger USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

-- Enable FORCE RLS on all scoping tables
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE surfaces FORCE ROW LEVEL SECURITY;
ALTER TABLE assertions FORCE ROW LEVEL SECURITY;
ALTER TABLE conflicts FORCE ROW LEVEL SECURITY;
ALTER TABLE interventions FORCE ROW LEVEL SECURITY;
ALTER TABLE outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE dial_ledger FORCE ROW LEVEL SECURITY;

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('tenants','surfaces','assertions','conflicts','interventions','outcomes','dial_ledger')
ORDER BY tablename;