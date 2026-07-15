"""Configuration for the Measurement service (M4-thin)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Service settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Service
    service_name: str = "measurement"
    service_port: int = 8083
    log_level: str = "INFO"

    # Database (Postgres for CIO corpus rows + ClickHouse for OLAP)
    database_url: str = "postgresql://postgres:postgres@localhost:5432/engenox"
    clickhouse_url: str = "http://localhost:8123"
    clickhouse_database: str = "engenox"

    # ClickHouse credentials (optional for MVP)
    clickhouse_user: str = "default"
    clickhouse_password: str = ""

    # Foreign change detector thresholds (configurable)
    ewma_lambda: float = 0.2
    ewma_threshold: float = 3.0
    cusum_threshold: float = 5.0
    cusum_drift: float = 0.5

    # SCM/DML estimator settings
    scm_min_pre_periods: int = 7
    scm_min_controls: int = 2
    dml_n_folds: int = 5

    # Conformal calibration (placeholder — real calibrator in thickening)
    conformal_alpha: float = 0.1
    conformal_min_calibration: int = 30

    # WORM signature (libs/crypto) — F3: key rotation config
    signing_key_path: str | None = None  # PEM path; if None, generate ephemeral in dev
    signing_key_rotation_days: int = 90  # F3: rotation period for Ed25519 key

    # Temporal (for activity heartbeats)
    temporal_address: str = "localhost:7233"
    temporal_namespace: str = "default"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()