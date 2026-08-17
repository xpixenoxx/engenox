-- Seed the 3 tenants
INSERT INTO tenants (id, name, plan, created_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Corp', 'starter', now()),
    ('22222222-2222-2222-2222-222222222222', 'Beta Inc', 'starter', now()),
    ('33333333-3333-3333-3333-333333333333', 'Gamma Ltd', 'starter', now())
ON CONFLICT (id) DO NOTHING;

-- Seed 5 surfaces per tenant
INSERT INTO surfaces (tenant_id, entity_id, type, attrs, valid_time, provenance_id)
SELECT t.id, s.entity_id, 'surface', '{}'::jsonb, tstzrange(now(), 'infinity'::timestamptz), gen_random_uuid()
FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid),
    ('22222222-2222-2222-2222-222222222222'::uuid),
    ('33333333-3333-3333-3333-333333333333'::uuid)
) AS t(id)
CROSS JOIN (VALUES
    ('chatgpt'), ('perplexity'), ('gemini'), ('grok'), ('claude')
) AS s(entity_id)
ON CONFLICT (tenant_id, entity_id) DO NOTHING;

-- Create consents table if not exists
CREATE TABLE IF NOT EXISTS consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    surface_id uuid NOT NULL REFERENCES surfaces(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'GRANTED',
    granted_at timestamptz NOT NULL DEFAULT now(),
    rct_eligible boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consents_tenant_surface ON consents(tenant_id, surface_id);
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='consents' AND policyname='tenant_isolation') THEN
    EXECUTE 'CREATE POLICY tenant_isolation ON consents USING (tenant_id = current_setting(''app.tenant_id'')::uuid)';
  END IF;
END $$;

-- Seed consent ledger -- 3 tenants x 5 surfaces = 15 records
INSERT INTO consents (tenant_id, surface_id, status, rct_eligible)
SELECT t.id, s.id, 'GRANTED', true
FROM tenants t
JOIN surfaces s ON s.tenant_id = t.id
WHERE t.id IN ('11111111-1111-1111-1111-111111111111'::uuid,
               '22222222-2222-2222-2222-222222222222'::uuid,
               '33333333-3333-3333-3333-333333333333'::uuid)
ON CONFLICT (tenant_id, surface_id) DO UPDATE SET status = 'GRANTED', rct_eligible = true;

-- Verify
SELECT COUNT(*) as total_consents,
       COUNT(*) FILTER (WHERE status = 'GRANTED') as granted,
       COUNT(*) FILTER (WHERE rct_eligible = true) as rct_eligible
FROM consents;

-- Per-tenant breakdown
SELECT t.name as tenant, COUNT(c.*) as consents, STRING_AGG(s.entity_id, ', ') as surfaces
FROM consents c
JOIN tenants t ON t.id = c.tenant_id
JOIN surfaces s ON s.id = c.surface_id
GROUP BY t.name
ORDER BY t.name;