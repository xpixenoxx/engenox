-- rls_regression.sql — the canary-row regression test for tenant isolation.
--
-- This fixture set of rows across 3 tenants + a query under each tenant's session
-- asserts the candor-floor invariant: a tenant can ONLY see its own rows.
-- The "canary row" for tenant B is a deliberately provocative payload that, if
-- returned to tenant A's SELECT, fails the test LOUDLY (not silently).
--
-- Cites: 23 §3 (RLS-introspection gate + canary-row test) · 15 §3 (JWT-bound tenant_id)
--        CLAUDE.md §12 (candor floor: a leak surfaces LOUDLY, never silently) · 26 §4.

-- Tenants (simulated via SET app.tenant_id).
-- We INSERT as superuser (no RLS), then SET the session var to test each tenant's view.

-- Tenant A's normal row.
INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '967b8f2e-5a3c-4d1e-9f8a-7c2b4e6d8f1a'::uuid,
    'brand-A',
    'competes_with',
    'brand-B',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'f1e2d3c4-b5a6-4789-90ab-cdef12345678'::uuid,
    '{}'::jsonb
);

-- Tenant A's CANARY row (this row MUST NOT leak to other tenants).
INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '967b8f2e-5a3c-4d1e-9f8a-7c2b4e6d8f1a'::uuid,
    'CANARY-TENANT-LEAK-A',
    'test_canary',
    'must-not-leak-to-B-or-C',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'f1e2d3c4-b5a6-4789-90ab-cdef12345678'::uuid,
    '{}'::jsonb
);

-- Tenant B's normal row.
INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '876c9e1f-4b2d-5c3a-8e9b-6d1c3f7e8a2b'::uuid,
    'brand-X',
    'competes_with',
    'brand-Y',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    '{}'::jsonb
);

-- Tenant B's CANARY row (MUST NOT leak to A or C).
INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '876c9e1f-4b2d-5c3a-8e9b-6d1c3f7e8a2b'::uuid,
    'CANARY-TENANT-LEAK-B',
    'test_canary',
    'must-not-leak-to-A-or-C',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    '{}'::jsonb
);

-- Tenant C's normal row.
INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '785d8a3c-3c4e-4b5d-7f8a-5c1d2e6f7a3c'::uuid,
    'brand-P',
    'competes_with',
    'brand-Q',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
    '{}'::jsonb
);

-- Tenant C's CANARY row (MUST NOT leak to A or B).
INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '785d8a3c-3c4e-4b5d-7f8a-5c1d2e6f7a3c'::uuid,
    'CANARY-TENANT-LEAK-C',
    'test_canary',
    'must-not-leak-to-A-or-B',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
    '{}'::jsonb
);

-- Cross-tenant UPDATE test rows (RLS should REJECT the UPDATE via WITH CHECK).
-- These are inserted as superuser; the test SETs app.tenant_id = 'tenant-A' and
-- attempts UPDATE on tenant-B's row → must be rejected (0 rows affected, or error).
INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '967b8f2e-5a3c-4d1e-9f8a-7c2b4e6d8f1a'::uuid,
    'update-test-A',
    'test_update',
    'target',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'f1e2d3c4-b5a6-4789-90ab-cdef12345678'::uuid,
    '{}'::jsonb
);

INSERT INTO assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance_id, integrity_tags)
VALUES (
    '876c9e1f-4b2d-5c3a-8e9b-6d1c3f7e8a2b'::uuid,
    'update-test-B',
    'test_update',
    'target',
    tstzrange('2024-01-01', '2025-01-01'),
    tstzrange('2024-06-01', NULL),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    '{}'::jsonb
);