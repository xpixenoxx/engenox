-- 0001_initial_schema.sql — the M1-thin truth-spine schema (expand-only, 17 §4).
--
-- The ~6 tables the closed loop needs (06 §2 + 13 §2 + 26 §4 MVP scope):
--   1. tenants            — the tenant root (id, name, plan, created_at)
--   2. surfaces           — the brand's surface entities (tenant_id, entity_id, type, attrs, valid_time, provenance)
--   3. assertions         — the bi-temporal KG assertions (tenant_id, subject_id, predicate, object_id, valid_time, tx_time, provenance, integrity_tags)
--   4. conflicts          — detected conflicts (tenant_id, surface_id, status, evidence_refs, created_at)
--   5. interventions      — proposed interventions (tenant_id, conflict_id, action, rationale, lift_projection, status, dial_level)
--   6. outcomes           — measured outcomes (tenant_id, intervention_id, realized_lift, counterfactual_conditions, coverage, validity_window)
--   7. dial_ledger        — the append-only dial ledger (tenant_id, action, axis_count, decision, reasons, tx_time)
--
-- ALL tables with `tenant_id` have RLS enabled + a `tenant_isolation` policy (15 §3).
-- The `assertion_view` library (libs/kg) is the ONLY sanctioned bi-temporal query path (13 §3).
-- Migrations are expand-first; a destructive column drop is a SEPARATE migration (17 §4).
--
-- Cites: 06 §2 (domain vocab: Surface/Brand/Conflict/Intervention/Outcome) + 13 §2 (bi-temporal KG)
--        + 15 §3 (RLS-by-tenant) + 17 §4 (Atlas expand/contract) + 26 §4 (MVP scope tables)
--        + ADR-0003 (CNPG PG17 + AGE 1.6.0 + pgvector 0.8.2) + ADR-0007 (thin M1, not empty).

-- Extension bootstrap (AGE 1.6.0 + pgvector 0.8.2 are created in CNPG postInitApplicationSQL;
-- this migration runs inside a CNPG cluster that ALREADY has them. No CREATE EXTENSION here.

-- 1. tenants — the tenant root (scoping anchor for ALL RLS policies).
CREATE TABLE tenants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    plan            text NOT NULL DEFAULT 'starter',       -- starter | growth | enterprise (thin: one enum)
    settings        jsonb NOT NULL DEFAULT '{}'::jsonb,    -- thin: JSON plugin points; thickening fills
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'The tenant root — every scoping table FKs here; RLS policies read current_setting(''app.tenant_id'')';

-- 2. surfaces — the brand's surface entities (06 §2.1 Surface).
CREATE TABLE surfaces (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id       text NOT NULL,                          -- the deterministic hash (06 §2.1)
    type            text NOT NULL,                          -- surface | brand | competitor | property
    attrs           jsonb NOT NULL DEFAULT '{}'::jsonb,     -- typed attrs per type (thin: open; thickening adds checks)
    valid_time      tstzrange NOT NULL,                     -- bi-temporal: when the surface fact is true
    provenance_id   uuid NOT NULL,                          -- 06 §2.1: every node has provenance
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surfaces_tenant_entity ON surfaces(tenant_id, entity_id);
CREATE INDEX idx_surfaces_tenant_valid ON surfaces(tenant_id, valid_time);

COMMENT ON TABLE surfaces IS 'Surface entities — the brand/subject objects the loop perceives (06 §2.1). valid_time is the bi-temporal window.';

-- 3. assertions — the bi-temporal KG assertions (13 §2, 06 §7 invariant 2).
CREATE TABLE assertions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject_id      text NOT NULL,                          -- the subject entity_id (deterministic hash)
    predicate       text NOT NULL,                          -- e.g., 'competes_with', 'has_ranking', 'cites'
    object_id       text,                                   -- null for literal objects; FK to surfaces.entity_id when present
    object_literal  jsonb,                                  -- for literal objects (ranking value, text)
    valid_time      tstzrange NOT NULL,                     -- bi-temporal: when the assertion is true in the world
    tx_time         tstzrange NOT NULL,                     -- bi-temporal: when the system learned it (13 §2)
    provenance_id   uuid NOT NULL,                          -- 06 §2.1: the probe/extract that produced this
    integrity_tags  jsonb NOT NULL DEFAULT '{}'::jsonb,     -- 06 §2.4: IdentificationStrategy | ForeignChangeStatus | tags
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- The single sanctioned bi-temporal query: "what assertions for (tenant, entity) are valid at validAt?"
-- The view path is assertion_view (libs/kg) which filters: tenant_id + subject_id + valid_time @> validAt.
-- A hand-written `valid_time @>` query outside that lib is a lint-banned + watchdog hit (13 §3, CLAUDE.md §5).
CREATE INDEX idx_assertions_tenant_subj_valid ON assertions(tenant_id, subject_id, valid_time);
CREATE INDEX idx_assertions_tenant_tx ON assertions(tenant_id, tx_time);

COMMENT ON TABLE assertions IS 'Bi-temporal KG assertions — every row has valid_time + tx_time + provenance (06 §7 inv2, 13 §2). The ONLY query path is libs/kg/assertion_view.';

-- 4. conflicts — detected conflicts (06 §2.3 Conflict + 11 §2c detection).
CREATE TABLE conflicts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    surface_id      uuid NOT NULL REFERENCES surfaces(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'open',           -- open | investigating | resolved | dismissed
    evidence_refs   jsonb NOT NULL DEFAULT '[]'::jsonb,     -- array of assertion IDs + probe refs
    severity        text NOT NULL DEFAULT 'medium',         -- low | medium | high | critical
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conflicts_tenant_surface ON conflicts(tenant_id, surface_id);
CREATE INDEX idx_conflicts_tenant_status ON conflicts(tenant_id, status);

COMMENT ON TABLE conflicts IS 'Detected conflicts — the perception→diagnosis seam output (11 §2c).';

-- 5. interventions — proposed interventions (06 §2.4 Intervention + 26 §4 F7).
CREATE TABLE interventions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conflict_id         uuid NOT NULL REFERENCES conflicts(id) ON DELETE CASCADE,
    action              text NOT NULL,                      -- schema_org_patch | canonical_tag | robots_txt | content_brief | disavow
    rationale           text NOT NULL,
    lift_projection     jsonb NOT NULL,                     -- LiftDistribution (pointEstimate, ciLow, ciHigh, sampleCount) per 06 §2.2
    status              text NOT NULL DEFAULT 'proposed',   -- proposed | approved | pr_opened | merged | deployed | rejected
    dial_level          text NOT NULL DEFAULT 'propose',    -- propose | copilot | autopilot (12 §5; MVP top is propose, 26 §6)
    pr_url              text,                               -- set when PR opened (F7 — the 1-click PR connector)
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interventions_tenant_conflict ON interventions(tenant_id, conflict_id);
CREATE INDEX idx_interventions_tenant_status ON interventions(tenant_id, status);

COMMENT ON TABLE interventions IS 'Proposed interventions — the decision→action seam output. lift_projection carries a LiftDistribution (candor: must have CI + N>0).';

-- 6. outcomes — measured outcomes (06 §2.4 Outcome + 19 §4 + 26 §4 F9).
CREATE TABLE outcomes (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    intervention_id         uuid NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    realized_lift           jsonb,                            -- LiftDistribution (null pre-measurement; when present MUST pass reGroundLift)
    counterfactual_conditions jsonb NOT NULL DEFAULT '[]'::jsonb, -- the contrarian block (26 §6: NEVER empty; 19 §4d renders it)
    coverage_contained      integer NOT NULL DEFAULT 0,       -- the conformal coverage diagnostic numerator
    coverage_total          integer NOT NULL DEFAULT 0,       -- the conformal coverage diagnostic denominator
    validity_window         tstzrange,                        -- when this outcome measurement is valid
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outcomes_tenant_intervention ON outcomes(tenant_id, intervention_id);

COMMENT ON TABLE outcomes IS 'Measured outcomes — the measurement→verification seam. realized_lift null until measurement window closes. counterfactual_conditions (contrarian block) NEVER empty (26 §6).';

-- 7. dial_ledger — the append-only dial ledger (12 §5 + 26 §4 candor render).
CREATE TABLE dial_ledger (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action          text NOT NULL,                          -- propose | escalate | demote
    axis_count      integer NOT NULL,
    decision        text NOT NULL,                          -- allow | deny
    reasons         jsonb NOT NULL DEFAULT '[]'::jsonb,     -- Cedar policy IDs that matched (for the ledger-explainer 26 §4)
    tx_time         timestamptz NOT NULL DEFAULT now(),     -- the sysclock instant (bi-temporal candor: never back-datable)
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dial_ledger_tenant_tx ON dial_ledger(tenant_id, tx_time DESC);

COMMENT ON TABLE dial_ledger IS 'Append-only dial ledger — a denied escalation is recorded WITH decision=deny (the candor floor surfaces it, 26 §4). Thickening adds WORM signature + R2 mirror.';