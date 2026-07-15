"""Measurement Service API — M4-thin.

FastAPI service exposing SCM, DML, foreign change detection, and
signed corpus write endpoints. Per ADR-0007: thin signal (estimators)
with WORM provenance from day one.

References: 11 §3 (measurement seam), 13 §4 (corpus), 15 §3 (WORM).
"""

import pathlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import asyncpg
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from engenox.measurement.config.settings import get_settings
from engenox.measurement.corpus.writer import (
    create_signed_corpus_row,
    write_corpus_row,
)
from engenox.measurement.estimators import (
    DMLResult,
    SCMResult,
    detect_foreign_change,
    estimate_dml,
    estimate_scm,
)

# ---- Request/Response Models ----

class ScmRequest(BaseModel):
    treated_series: list[dict[str, Any]] = Field(
        ..., description="Treated unit time series: [{'timestamp': '...', 'value': ...}]"
    )
    control_panel: dict[str, list[dict[str, Any]]] = Field(
        ..., description="Control units: {unit_name: [{'timestamp': '...', 'value': ...}]}"
    )
    treatment_start_index: int = Field(..., description="0-based index where treatment begins")
    min_pre_periods: int | None = None
    min_controls: int | None = None


class ScmResponse(BaseModel):
    ate: float | None
    ate_ci_lower: float | None
    ate_ci_upper: float | None
    weights: dict[str, float] | None
    pre_fit_rmse: float | None
    status: str
    reason: str | None
    metadata: dict[str, Any]


class DmlRequest(BaseModel):
    outcome: list[float] = Field(..., description="Outcome values Y")
    treatment: list[int] = Field(..., description="Binary treatment D (0/1)")
    covariates: list[list[float]] = Field(..., description="Covariate matrix X")
    n_folds: int | None = None
    n_estimators: int = 100
    max_depth: int | None = 10
    random_state: int = 42


class DmlResponse(BaseModel):
    ate: float | None
    ate_se: float | None
    ate_ci_lower: float | None
    ate_ci_upper: float | None
    status: str
    reason: str | None
    metadata: dict[str, Any]


class ForeignChangeRequest(BaseModel):
    series: list[dict[str, Any]] = Field(
        ..., description="Time series: [{'timestamp': '...', 'value': ...}]"
    )
    ewma_lambda: float | None = None
    ewma_threshold: float | None = None
    cusum_threshold: float | None = None
    cusum_drift: float | None = None


class ForeignChangeResponse(BaseModel):
    ewma_signal: str
    cusum_signal: str
    combined_signal: str
    reason: str | None
    metadata: dict[str, Any]


class CorpusWriteRequest(BaseModel):
    intervention_id: str
    tenant_id: str
    estimator: str
    lift: float
    lift_ci_lower: float | None = None
    lift_ci_upper: float | None = None
    status: str = "ok"
    integrity_tags: dict[str, Any] = {}
    foreign_change_tags: dict[str, Any] | None = None


class CorpusWriteResponse(BaseModel):
    row_id: str
    estimated_at: str


# ---- Database Pool ----

_db_pool: asyncpg.Pool | None = None


async def get_db_pool() -> asyncpg.Pool:
    """Get or create database connection pool."""
    global _db_pool
    if _db_pool is None:
        settings = get_settings()
        _db_pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    return _db_pool


async def close_db_pool() -> None:
    """Close database pool on shutdown."""
    global _db_pool
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None


# ---- Lifespan ----


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    # Initialize DB pool (optional for M4-thin — allow running without DB)
    # await get_db_pool()
    yield
    # Shutdown
    await close_db_pool()


# ---- App ----

app = FastAPI(
    title="Engenox Measurement Service",
    description="M4-thin: SCM + DML + Foreign Change Detection + Signed CIO Corpus",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "measurement", "version": "0.1.0"}


@app.post("/estimate/scm", response_model=ScmResponse)
async def estimate_scm_endpoint(request: ScmRequest) -> ScmResponse:
    """
    Estimate treatment effect using Synthetic Control Method.

    Takes treated unit series and control panel, returns ATT with weights.
    """
    # Convert to pandas
    treated_df = pd.DataFrame(request.treated_series)
    treated_df["timestamp"] = pd.to_datetime(treated_df["timestamp"])
    treated_df = treated_df.set_index("timestamp").sort_index()
    treated_series = treated_df["value"]

    control_dfs = {}
    for unit_name, obs_list in request.control_panel.items():
        ctrl_df = pd.DataFrame(obs_list)
        ctrl_df["timestamp"] = pd.to_datetime(ctrl_df["timestamp"])
        ctrl_df = ctrl_df.set_index("timestamp").sort_index()
        control_dfs[unit_name] = ctrl_df["value"]

    control_panel = pd.DataFrame(control_dfs)

    result: SCMResult = estimate_scm(
        treated_series=treated_series,
        control_panel=control_panel,
        treatment_start=request.treatment_start_index,
        min_pre_periods=request.min_pre_periods,
        min_controls=request.min_controls,
    )

    return ScmResponse(
        ate=result.ate,
        ate_ci_lower=result.ate_ci_lower,
        ate_ci_upper=result.ate_ci_upper,
        weights=result.weights,
        pre_fit_rmse=result.pre_fit_rmse,
        status=result.status.value,
        reason=result.reason,
        metadata=result.metadata,
    )


@app.post("/estimate/dml", response_model=DmlResponse)
async def estimate_dml_endpoint(request: DmlRequest) -> DmlResponse:
    """
    Estimate ATE using Double Machine Learning with cross-fitting.

    Takes outcome Y, binary treatment D, covariates X.
    """
    outcome = pd.Series(request.outcome)
    treatment = pd.Series(request.treatment)
    covariates = pd.DataFrame(request.covariates)

    result: DMLResult = estimate_dml(
        outcome=outcome,
        treatment=treatment,
        covariates=covariates,
        n_folds=request.n_folds,
        n_estimators=request.n_estimators,
        max_depth=request.max_depth,
        random_state=request.random_state,
    )

    return DmlResponse(
        ate=result.lift,
        ate_se=result.lift_se,
        ate_ci_lower=result.lift_ci_lower,
        ate_ci_upper=result.lift_ci_upper,
        status=result.status.value,
        reason=result.reason,
        metadata=result.metadata,
    )


@app.post("/detect/foreign-change", response_model=ForeignChangeResponse)
async def detect_foreign_change_endpoint(request: ForeignChangeRequest) -> ForeignChangeResponse:
    """
    Run EWMA + CUSUM foreign change detection on a time series.

    Returns combined signal (CLEAR/WARNING/ALERT) with detector states.
    """
    series_df = pd.DataFrame(request.series)
    series_df["timestamp"] = pd.to_datetime(series_df["timestamp"])
    series_df = series_df.set_index("timestamp").sort_index()
    series = series_df["value"]

    result = detect_foreign_change(
        series=series,
        lambda_param=request.ewma_lambda,
        ewma_threshold=request.ewma_threshold,
        cusum_threshold=request.cusum_threshold,
        cusum_drift=request.cusum_drift,
    )

    return ForeignChangeResponse(
        ewma_signal=result.ewma.signal.value,
        cusum_signal=result.cusum.signal.value,
        combined_signal=result.combined_signal.value,
        reason=result.reason,
        metadata=result.metadata,
    )


@app.post("/corpus/write", response_model=CorpusWriteResponse)
async def write_corpus_endpoint(request: CorpusWriteRequest) -> CorpusWriteResponse:
    """
    Write a signed CIO corpus row to the database.

    M4-thin: Requires signing key (WORM ed25519 via libs/crypto).
    """
    settings = get_settings()
    if not settings.signing_key_path:
        raise HTTPException(
            status_code=503,
            detail="Signing key not configured — corpus writes disabled in thin mode",
        )

    # Read signing key
    key_path = pathlib.Path(settings.signing_key_path)
    if not key_path.exists():
        detail = f"Signing key not found: {settings.signing_key_path}"
        raise HTTPException(status_code=500, detail=detail)
    signing_key_pem = key_path.read_text()

    # Create signed row
    row = await create_signed_corpus_row(
        intervention_id=request.intervention_id,
        tenant_id=request.tenant_id,
        estimator=request.estimator,
        lift=request.lift,
        lift_ci_lower=request.lift_ci_lower,
        lift_ci_upper=request.lift_ci_upper,
        status=request.status,
        integrity_tags=request.integrity_tags,
        signing_key_pem=signing_key_pem,
        foreign_change_tags=request.foreign_change_tags,
    )

    # Write to DB (requires pool)
    pool = await get_db_pool()
    row_id = await write_corpus_row(pool, row)

    return CorpusWriteResponse(
        row_id=row_id,
        estimated_at=row.estimated_at,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=get_settings().service_port)