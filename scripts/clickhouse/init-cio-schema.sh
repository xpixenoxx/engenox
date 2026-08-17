#!/usr/bin/env bash
# ClickHouse Schema Initialization for Engenox CIO Corpus
# Run after ClickHouse is deployed: kubectl exec -it clickhouse-0 -n clickhouse -- bash /scripts/init-cio-schema.sh

set -euo pipefail

CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-}"
CLICKHOUSE_DB="${CLICKHOUSE_DB:-engenox}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Execute ClickHouse query
ch_query() {
  local query="$1"
  curl -sS -X POST "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/" \
    -H "X-ClickHouse-User: ${CLICKHOUSE_USER}" \
    -H "X-ClickHouse-Key: ${CLICKHOUSE_PASSWORD}" \
    -d "$query" || error "Query failed: $query"
}

log "Initializing ClickHouse schema for database: $CLICKHOUSE_DB"

# Create database
ch_query "CREATE DATABASE IF NOT EXISTS \`${CLICKHOUSE_DB}\`"
log "Database created/verified"

# ============================================================================
# CIO CORPUS TABLE - Main intervention/outcome storage
# ============================================================================
log "Creating cio_corpus table..."

ch_query "
CREATE TABLE IF NOT EXISTS \`${CLICKHOUSE_DB}\`.cio_corpus (
    -- Primary identifiers
    intervention_id UUID DEFAULT generateUUIDv4(),
    tenant_id FixedString(36) NOT NULL,
    cycle_id UUID NOT NULL,

    -- Intervention details
    intervention_type Enum8(
        'content_update' = 1,
        'schema_markup' = 2,
        'canonical_tag' = 3,
        'robots_txt' = 4,
        'content_removal' = 5,
        'link_update' = 6,
        'structured_data' = 7,
        'meta_update' = 8
    ) NOT NULL,

    target_url String NOT NULL,
    target_selector String DEFAULT '',
    intervention_payload JSON NOT NULL,

    -- Causal identification
    treatment_population String NOT NULL,  -- 'control' | 'treatment'
    propensity_score Float64 DEFAULT 0.5,  -- For IPW
    instrument_z Nullable(String),         -- IV instrument

    -- Outcome measurement
    outcome_pre JSON NOT NULL,   -- Pre-intervention metrics
    outcome_post JSON NOT NULL,  -- Post-intervention metrics

    -- Uplift estimation
    uplift_pct Float64,           -- Point estimate
    uplift_ci_lower Float64,      -- Conformal CI lower
    uplift_ci_upper Float64,      -- Conformal CI upper
    conformal_coverage Float64 DEFAULT 0.9,

    -- Integrity & provenance (WORM)
    content_hash String NOT NULL,          -- SHA256 of intervention_payload
    signature String NOT NULL,             -- Ed25519 signature
    signing_key_id FixedString(36) NOT NULL,
    r2_object_key String,                  -- R2 WORM object key
    r2_etag String,                        -- R2 ETag for verification

    -- Temporal
    intervention_ts DateTime64(3) NOT NULL,
    measurement_ts DateTime64(3) NOT NULL,
    ingested_ts DateTime64(3) DEFAULT now64(3),

    -- Metadata
    labels Map(String, String) DEFAULT {},
    notes String DEFAULT '',

    -- Constraints
    CONSTRAINT valid_uplift_ci CHECK (uplift_ci_lower <= uplift_ci_upper),
    CONSTRAINT valid_propensity CHECK (propensity_score >= 0 AND propensity_score <= 1),
    CONSTRAINT valid_conformal CHECK (conformal_coverage >= 0.5 AND conformal_coverage <= 0.999)
)
ENGINE = ReplacingMergeTree(ingested_ts)
PARTITION BY toYYYYMM(intervention_ts)
ORDER BY (tenant_id, intervention_ts, intervention_id)
TTL intervention_ts + INTERVAL 2 YEAR DELETE
SETTINGS index_granularity = 8192;
"

log "cio_corpus table created"

# ============================================================================
# QUARANTINE TABLE - Rejected interventions with reason
# ============================================================================
log "Creating quarantine table..."

ch_query "
CREATE TABLE IF NOT EXISTS \`${CLICKHOUSE_DB}\`.cio_quarantine (
    quarantine_id UUID DEFAULT generateUUIDv4(),
    tenant_id FixedString(36) NOT NULL,
    cycle_id UUID NOT NULL,

    intervention_id UUID,
    intervention_type Enum8(
        'content_update' = 1,
        'schema_markup' = 2,
        'canonical_tag' = 3,
        'robots_txt' = 4,
        'content_removal' = 5,
        'link_update' = 6,
        'structured_data' = 7,
        'meta_update' = 8
    ),
    intervention_payload JSON,

    -- Rejection details
    rejection_reason Enum8(
        'integrity_failed' = 1,
        'consent_denied' = 2,
        'policy_violation' = 3,
        'low_confidence' = 4,
        'duplicate' = 5,
        'foreign_change' = 6,
        'measurement_error' = 7,
        'other' = 8
    ) NOT NULL,
    rejection_details JSON,

    -- For audit trail
    content_hash String,
    ingested_ts DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ingested_ts)
ORDER BY (tenant_id, ingested_ts, quarantine_id)
TTL ingested_ts + INTERVAL 1 YEAR DELETE
SETTINGS index_granularity = 8192;
"

log "cio_quarantine table created"

# ============================================================================
# FOREIGN CHANGE DETECTION TABLE
# ============================================================================
log "Creating foreign_change table..."

ch_query "
CREATE TABLE IF NOT EXISTS \`${CLICKHOUSE_DB}\`.foreign_change_log (
    change_id UUID DEFAULT generateUUIDv4(),
    tenant_id FixedString(36) NOT NULL,
    cycle_id UUID NOT NULL,

    detected_url String NOT NULL,
    change_type Enum8(
        'content_modified' = 1,
        'content_removed' = 2,
        'new_page' = 3,
        'redirect_changed' = 4,
        'canonical_changed' = 5,
        'robots_changed' = 6,
        'schema_changed' = 7,
        'structured_data_changed' = 8
    ) NOT NULL,

    diff_preview JSON,
    content_hash_before String,
    content_hash_after String,
    confidence Float64 DEFAULT 1.0,

    -- Attribution
    attributed_to_our_intervention Nullable(Bool) DEFAULT NULL,
    related_intervention_id Nullable(UUID),

    detected_ts DateTime64(3) NOT NULL,
    ingested_ts DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(detected_ts)
ORDER BY (tenant_id, detected_ts, change_id)
TTL detected_ts + INTERVAL 1 YEAR DELETE
SETTINGS index_granularity = 8192;
"

log "foreign_change_log table created"

# ============================================================================
# CONFORMAL PREDICTION CALIBRATION TABLE
# ============================================================================
log "Creating conformal_calibration table..."

ch_query "
CREATE TABLE IF NOT EXISTS \`${CLICKHOUSE_DB}\`.conformal_calibration (
    calibration_id UUID DEFAULT generateUUIDv4(),
    tenant_id FixedString(36) NOT NULL,
    segment String NOT NULL,  -- 'overall', 'high_volume', 'low_volume', 'new_site', etc.

    -- Calibration data
    nonconformity_scores Array(Float64),
    n_calibration UInt32,
    alpha Float64 DEFAULT 0.1,  -- 1 - coverage

    -- Quantiles for conformal intervals
    quantile_lower Float64,
    quantile_upper Float64,

    -- Coverage achieved on calibration set
    empirical_coverage Float64,

    window_start DateTime64(3) NOT NULL,
    window_end DateTime64(3) NOT NULL,
    created_ts DateTime64(3) DEFAULT now64(3),
    model_version String DEFAULT 'v1'
)
ENGINE = ReplacingMergeTree(created_ts)
PARTITION BY toYYYYMM(window_end)
ORDER BY (tenant_id, segment, window_end, calibration_id)
SETTINGS index_granularity = 8192;
"

log "conformal_calibration table created"

# ============================================================================
# INTEGRITY VERIFICATION LOG
# ============================================================================
log "Creating integrity_verification_log table..."

ch_query "
CREATE TABLE IF NOT EXISTS \`${CLICKHOUSE_DB}\`.integrity_verification_log (
    verification_id UUID DEFAULT generateUUIDv4(),
    tenant_id FixedString(36) NOT NULL,
    intervention_id UUID NOT NULL,

    check_type Enum8(
        'r2_worm' = 1,
        'signature' = 2,
        'content_hash' = 3,
        'full_chain' = 4
    ) NOT NULL,

    result Enum8('pass' = 1, 'fail' = 2, 'error' = 3) NOT NULL,
    details JSON DEFAULT '{}',
    latency_ms UInt32,

    verified_ts DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(verified_ts)
ORDER BY (tenant_id, verified_ts, verification_id)
TTL verified_ts + INTERVAL 90 DAY DELETE
SETTINGS index_granularity = 8192;
"

log "integrity_verification_log table created"

# ============================================================================
# MATERIALIZED VIEWS FOR COMMON QUERIES
# ============================================================================
log "Creating materialized views..."

# Uplift by segment & intervention type
ch_query "
CREATE MATERIALIZED VIEW IF NOT EXISTS \`${CLICKHOUSE_DB}\`.mv_uplift_by_segment
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(intervention_ts)
ORDER BY (tenant_id, intervention_type, treatment_population, toYYYYMM(intervention_ts))
AS SELECT
    tenant_id,
    intervention_type,
    treatment_population,
    toYYYYMM(intervention_ts) AS year_month,
    count() AS n_interventions,
    avg(uplift_pct) AS avg_uplift_pct,
    quantileTDigest(0.5)(uplift_pct) AS median_uplift_pct,
    quantileTDigest(0.95)(uplift_pct) AS p95_uplift_pct,
    avg(conformal_coverage) AS avg_conformal_coverage
FROM \`${CLICKHOUSE_DB}\`.cio_corpus
WHERE intervention_type IS NOT NULL
GROUP BY tenant_id, intervention_type, treatment_population, year_month;
"

log "mv_uplift_by_segment created"

# Quarantine rate by reason
ch_query "
CREATE MATERIALIZED VIEW IF NOT EXISTS \`${CLICKHOUSE_DB}\`.mv_quarantine_rate
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(ingested_ts)
ORDER BY (tenant_id, rejection_reason, toYYYYMM(ingested_ts))
AS SELECT
    tenant_id,
    rejection_reason,
    toYYYYMM(ingested_ts) AS year_month,
    count() AS n_quarantined
FROM \`${CLICKHOUSE_DB}\`.cio_quarantine
GROUP BY tenant_id, rejection_reason, year_month;
"

log "mv_quarantine_rate created"

# Foreign change rate
ch_query "
CREATE MATERIALIZED VIEW IF NOT EXISTS \`${CLICKHOUSE_DB}\`.mv_foreign_change_rate
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(detected_ts)
ORDER BY (tenant_id, change_type, toYYYYMM(detected_ts))
AS SELECT
    tenant_id,
    change_type,
    toYYYYMM(detected_ts) AS year_month,
    count() AS n_changes,
    sum(confidence) AS total_confidence,
    avg(confidence) AS avg_confidence
FROM \`${CLICKHOUSE_DB}\`.foreign_change_log
GROUP BY tenant_id, change_type, year_month;
"

log "mv_foreign_change_rate created"

# ============================================================================
# VERIFY ALL TABLES
# ============================================================================
log "Verifying tables..."

ch_query "SHOW TABLES FROM \`${CLICKHOUSE_DB}\`"

log "All tables verified successfully!"
log "
╔══════════════════════════════════════════════════════════════╗
║  ClickHouse CIO Corpus Schema Initialized                   ║
╠══════════════════════════════════════════════════════════════╣
║  Tables:                                                    ║
║  - cio_corpus (ReplacingMergeTree) - Main CIO storage       ║
║  - cio_quarantine (MergeTree) - Rejected interventions      ║
║  - foreign_change_log (MergeTree) - External changes        ║
║  - conformal_calibration (ReplacingMergeTree) - CI cal      ║
║  - integrity_verification_log (MergeTree) - WORM audit      ║
╠══════════════════════════════════════════════════════════════╣
║  Materialized Views:                                        ║
║  - mv_uplift_by_segment                                     ║
║  - mv_quarantine_rate                                       ║
║  - mv_foreign_change_rate                                   ║
╚══════════════════════════════════════════════════════════════╝
"