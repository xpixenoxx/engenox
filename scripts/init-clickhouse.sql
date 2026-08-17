-- init-clickhouse.sql — Initialize ClickHouse for corpus analytics mirror
-- Runs as part of docker-entrypoint-initdb.d

-- Create database
CREATE DATABASE IF NOT EXISTS engenox;

-- Table: Corpus analytics (OLAP copy of CIO corpus)
CREATE TABLE IF NOT EXISTS engenox.cio_corpus_analytics
(
    intervention_id UUID,
    tenant_id UUID,
    brand_id UUID,
    surface UUID,
    conflict_type Enum8('hallucination' = 1, 'omission' = 2, 'misattribution' = 3, 'staleness' = 4, 'bias' = 5, 'other' = 6),
    intervention_type Enum8('schema_org' = 1, 'content_brief' = 2, 'canonical_tag' = 3, 'robots_txt' = 4, 'other' = 5),
    proposed_at DateTime,  -- DateTime64(3) not supported in TTL
    pr_opened_at Nullable(DateTime),
    merged_at Nullable(DateTime),
    lift_point Nullable(Float64),
    lift_ci_lower Nullable(Float64),
    lift_ci_upper Nullable(Float64),
    conformal_coverage Nullable(Float64),
    foreign_change_flag Nullable(UInt8),
    quarantine_status Nullable(UInt8),
    integrity_signature String,
    estimator_type Enum8('scm' = 1, 'dml' = 2, 'conformal' = 3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(proposed_at)
ORDER BY (tenant_id, intervention_id, proposed_at)
TTL proposed_at + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;

-- Table: Provenance audit (for Provenance Audit Hover)
CREATE TABLE IF NOT EXISTS engenox.provenance_audit
(
    corpus_row_id UUID,
    tenant_id UUID,
    intervention_id UUID,
    seam Enum8('extract' = 1, 'draft' = 2, 'adjudicate' = 3, 'embed' = 4, 'abduce' = 5, 'critique' = 6),
    model_family String,
    model_version String,
    raw_output String,
    verifier_decision Enum8('pass' = 1, 'fail' = 2),
    verifier_reason String,
    estimator_inputs String,
    recorded_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (tenant_id, intervention_id, seam, recorded_at)
TTL recorded_at + INTERVAL 3 YEAR
SETTINGS index_granularity = 8192;

-- Table: Dial ledger (for Dial UI Ledger Explainer)
CREATE TABLE IF NOT EXISTS engenox.dial_ledger
(
    tenant_id UUID,
    intervention_id UUID,
    from_level Enum8('propose' = 1, 'execute_with_approval' = 2, 'guarded' = 3, 'autonomous' = 4),
    to_level Enum8('propose' = 1, 'execute_with_approval' = 2, 'guarded' = 3, 'autonomous' = 4),
    decision Enum8('allow' = 1, 'deny' = 2),
    axis_calibration Nullable(UInt8),
    axis_human_approval Nullable(UInt8),
    axis_pooled_overlap Nullable(UInt8),
    axes_cleared UInt8,
    reason String,
    decided_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(decided_at)
ORDER BY (tenant_id, intervention_id, decided_at)
TTL decided_at + INTERVAL 7 YEAR
SETTINGS index_granularity = 8192;

-- Table: Token costs (for per-tenant budgets)
CREATE TABLE IF NOT EXISTS engenox.token_costs
(
    tenant_id UUID,
    seam Enum8('extract' = 1, 'draft' = 2, 'adjudicate' = 3, 'embed' = 4, 'abduce' = 5, 'critique' = 6),
    model_family String,
    model_version String,
    input_tokens UInt64,
    output_tokens UInt64,
    cost_usd Decimal(10, 6),
    recorded_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (tenant_id, seam, recorded_at)
TTL recorded_at + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- Table: Verifier rejects (for AI-Intelligence monitoring)
CREATE TABLE IF NOT EXISTS engenox.verifier_rejects
(
    tenant_id UUID,
    intervention_id UUID,
    seam Enum8('extract' = 1, 'draft' = 2, 'adjudicate' = 3, 'embed' = 4, 'abduce' = 5, 'critique' = 6),
    failure_mode Enum8(
        'hallucinated_subject' = 1,
        'hallucinated_object' = 2,
        'lift_without_ci' = 3,
        'zero_sample_lift' = 4,
        'contrarian_omitted' = 5,
        'critic_same_family' = 6,
        'missing_backpointer' = 7,
        'other' = 8
    ),
    raw_output String,
    rejected_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(rejected_at)
ORDER BY (tenant_id, seam, rejected_at)
TTL rejected_at + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- Table: Golden probe results (for regression detection)
CREATE TABLE IF NOT EXISTS engenox.golden_probe_results
(
    probe_id String,
    version String,
    tenant_id UUID,
    surface UUID,
    expected_conflict_types Array(UInt8),
    actual_conflict_types Array(UInt8),
    expected_intervention_types Array(UInt8),
    actual_intervention_types Array(UInt8),
    pipeline_behavior_hash String,
    passed UInt8,
    runtime_ms UInt32,
    recorded_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (probe_id, tenant_id, recorded_at)
TTL recorded_at + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- Note: GRANT requires GRANT OPTION; default user lacks it in ClickHouse entrypoint.
-- Permissions are handled by ClickHouse default ACLs for the default user.
SELECT 'ClickHouse initialized for Engenox analytics' AS status;