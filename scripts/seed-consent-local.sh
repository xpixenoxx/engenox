#!/usr/bin/env bash
# scripts/seed-consent-local.sh — Seed founder cohort consent records
# 3 tenants × 5 surfaces = 15 consent records (RCT_ELIGIBLE)

set -euo pipefail

DATABASE_URL="postgresql://engenox:engenox@localhost:5432/engenox?sslmode=disable"

echo "🌱 Seeding founder cohort consent records (3 tenants × 5 surfaces)..."

psql "$DATABASE_URL" <<'SQL'

-- 1. Ensure tenants exist (created by onboarding flow, but seed here for dev)
INSERT INTO tenants (id, name, slug, created_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Corp', 'acme-corp', now()),
    ('22222222-2222-2222-2222-222222222222', 'Beta Inc', 'beta-inc', now()),
    ('33333333-3333-3333-3333-333333333333', 'Gamma Ltd', 'gamma-ltd', now())
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure surfaces exist (ChatGPT=1, Perplexity=2, Gemini=3, Grok=4, Claude=5)
INSERT INTO surfaces (id, name, provider, surface_type, created_at)
VALUES
    (1, 'ChatGPT', 'OpenAI', 'chat', now()),
    (2, 'Perplexity', 'Perplexity', 'search', now()),
    (3, 'Gemini', 'Google', 'chat', now()),
    (4, 'Grok', 'xAI', 'chat', now()),
    (5, 'Claude', 'Anthropic', 'chat', now())
ON CONFLICT (id) DO NOTHING;

-- 3. Seed consent ledger — Founder cohort: 3 tenants × 5 surfaces = 15 records
-- Status: GRANTED (for active probing), RCT_ELIGIBLE (for measurement)
INSERT INTO consents (id, tenant_id, surface_id, status, granted_at, rct_eligible, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    s.id,
    'GRANTED',
    now(),
    true,
    now()
FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222'),
    ('33333333-3333-3333-3333-333333333333')
) AS t(id)
CROSS JOIN (SELECT id FROM surfaces WHERE id BETWEEN 1 AND 5) s
ON CONFLICT (tenant_id, surface_id) DO UPDATE SET
    status = 'GRANTED',
    rct_eligible = true,
    granted_at = now();

-- 4. Verify
SELECT
    COUNT(*) as total_consents,
    COUNT(*) FILTER (WHERE status = 'GRANTED') as granted,
    COUNT(*) FILTER (WHERE rct_eligible = true) as rct_eligible
FROM consents;

-- 5. Show per-tenant breakdown
SELECT
    t.name as tenant,
    COUNT(c.*) as consents,
    STRING_AGG(s.name, ', ') as surfaces
FROM consents c
JOIN tenants t ON t.id = c.tenant_id
JOIN surfaces s ON s.id = c.surface_id
GROUP BY t.name
ORDER BY t.name;

SQL

echo "✅ Consent fixture seeded successfully"