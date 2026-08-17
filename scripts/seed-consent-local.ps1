<#
.SYNOPSIS
    Seed consent fixture for founder cohort (3 tenants x 5 surfaces)
.DESCRIPTION
    Creates tenant + surface + consent records in local Postgres for the founder panel
#>

param(
    [string]$DATABASE_URL = "postgresql://engenox:engenox@localhost:5432/engenox?sslmode=disable"
)

Write-Host "Seeding founder cohort consent fixture..." -ForegroundColor Yellow
Write-Host "   DB: $DATABASE_URL" -ForegroundColor Gray

try {
    $sql = @"
-- 1. Ensure tenants exist
INSERT INTO tenants (id, name, plan, settings, created_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Corp', 'starter', '{}'::jsonb, now()),
    ('22222222-2222-2222-2222-222222222222', 'Beta Inc', 'starter', '{}'::jsonb, now()),
    ('33333333-3333-3333-3333-333333333333', 'Gamma Ltd', 'starter', '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure surfaces exist (one per tenant per surface type)
-- ChatGPT
INSERT INTO surfaces (id, tenant_id, entity_id, type, attrs, valid_time, provenance_id, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    'chatgpt-' || t.id,
    'surface',
    '{}'::jsonb,
    tstzrange(now(), infinity),
    gen_random_uuid(),
    now()
FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222'),
    ('33333333-3333-3333-3333-333333333333')
) AS t(id)
ON CONFLICT (tenant_id, entity_id) DO NOTHING;

-- Perplexity
INSERT INTO surfaces (id, tenant_id, entity_id, type, attrs, valid_time, provenance_id, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    'perplexity-' || t.id,
    'surface',
    '{}'::jsonb,
    tstzrange(now(), infinity),
    gen_random_uuid(),
    now()
FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222'),
    ('33333333-3333-3333-3333-333333333333')
) AS t(id)
ON CONFLICT (tenant_id, entity_id) DO NOTHING;

-- Gemini
INSERT INTO surfaces (id, tenant_id, entity_id, type, attrs, valid_time, provenance_id, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    'gemini-' || t.id,
    'surface',
    '{}'::jsonb,
    tstzrange(now(), infinity),
    gen_random_uuid(),
    now()
FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222'),
    ('33333333-3333-3333-3333-333333333333')
) AS t(id)
ON CONFLICT (tenant_id, entity_id) DO NOTHING;

-- Grok
INSERT INTO surfaces (id, tenant_id, entity_id, type, attrs, valid_time, provenance_id, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    'grok-' || t.id,
    'surface',
    '{}'::jsonb,
    tstzrange(now(), infinity),
    gen_random_uuid(),
    now()
FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222'),
    ('33333333-3333-3333-3333-333333333333')
) AS t(id)
ON CONFLICT (tenant_id, entity_id) DO NOTHING;

-- Claude
INSERT INTO surfaces (id, tenant_id, entity_id, type, attrs, valid_time, provenance_id, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    'claude-' || t.id,
    'surface',
    '{}'::jsonb,
    tstzrange(now(), infinity),
    gen_random_uuid(),
    now()
FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222222'),
    ('33333333-3333-3333-3333-333333333333')
) AS t(id)
ON CONFLICT (tenant_id, entity_id) DO NOTHING;

-- 3. Seed consent ledger -- 3 tenants x 5 surfaces = 15 records
INSERT INTO consents (id, tenant_id, surface_id, status, granted_at, rct_eligible, created_at)
SELECT
    gen_random_uuid(),
    s.tenant_id,
    s.id,
    'GRANTED',
    now(),
    true,
    now()
FROM surfaces s
WHERE s.entity_id LIKE 'chatgpt-%'
   OR s.entity_id LIKE 'perplexity-%'
   OR s.entity_id LIKE 'gemini-%'
   OR s.entity_id LIKE 'grok-%'
   OR s.entity_id LIKE 'claude-%'
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

-- 5. Per-tenant breakdown
SELECT
    t.name as tenant,
    COUNT(c.*) as consents,
    STRING_AGG(s.entity_id, ', ') as surfaces
FROM consents c
JOIN tenants t ON t.id = c.tenant_id
JOIN surfaces s ON s.id = c.surface_id
GROUP BY t.name
ORDER BY t.name;
"@

    $tempSql = Join-Path $env:TEMP "seed-consent-$([Guid]::NewGuid()).sql"
    Set-Content -Path $tempSql -Value $sql -Encoding UTF8 -NoNewline
    Get-Content $tempSql -Raw | docker exec -i engenox-postgres psql -U engenox -d engenox
    Remove-Item -Force $tempSql

    Write-Host "Consent fixture seeded successfully" -ForegroundColor Green
}
catch {
    Write-Host "Failed to seed consent fixture: $_" -ForegroundColor Red
    exit 1
}