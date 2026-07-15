"""FastAPI routes for Measurement Service — M4-thin."""

from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

# Import generated protobuf types for MeasurementService lifecycle
from engenox.measurement.config.settings import get_settings
from engenox.measurement.corpus.writer import (
    create_signed_corpus_row,
)
from engenox.measurement.estimators import (
    ConformalInterval,
    DMLResult,
    ForeignChangeResult,
    SCMResult,
    apply_conformal_correction,
    detect_foreign_change,
    estimate_dml,
    estimate_scm,
)
from engenox.measurement.quarantine.guard import ForeignChangeQuarantineGuard

router = APIRouter(prefix="/v1", tags=["measurement"])


# ---- Request/Response Models ----

class ScmRequest(BaseModel):
    treated_series: list[dict[str, Any]] = Field(
        ...,
        min_length=2,
        description=(
            "Treated unit series: "
            "[{'timestamp': ISO8601, 'value': float}]"
        ),
    )
    control_panel: dict[str, list[dict[str, Any]]] = Field(
        ...,
        min_length=1,
        description=(
            "Control units: "
            "{unit_name: [{'timestamp': ISO8601, 'value': float}]}"
        ),
    )
    treatment_start_index: int = Field(
        ..., ge=1, description=("0-based index where treatment begins")
    )
    min_pre_periods: int | None = None
    min_controls: int | None = None


class ScmResponse(BaseModel):
    status: str
    ate: float | None = None
    ate_ci_lower: float | None = None
    ate_ci_upper: float | None = None
    weights: dict[str, float] | None = None
    pre_fit_rmse: float | None = None
    pre_fit_max_abs_error: float | None = None
    reason: str | None = None
    metadata: dict[str, Any]


class DmlRequest(BaseModel):
    outcome: list[float] = Field(..., min_length=2, description="Outcome variable Y")
    treatment: list[int] = Field(..., min_length=2, description="Binary treatment D (0/1)")
    covariates: list[list[float]] = Field(..., min_length=2, description="Covariate matrix X")
    n_folds: int | None = None
    n_estimators: int = 100
    max_depth: int | None = 10
    random_state: int = 42

    @model_validator(mode="after")
    def check_binary_treatment(self) -> "DmlRequest":
        if any(t not in (0, 1) for t in self.treatment):
            raise ValueError("treatment must contain only 0 or 1")
        if len(self.outcome) != len(self.treatment) or len(self.covariates) != len(self.treatment):
            raise ValueError("outcome, treatment, and covariates must have same length")
        return self


class DmlResponse(BaseModel):
    status: str
    ate: float | None = None
    ate_se: float | None = None
    ate_ci_lower: float | None = None
    ate_ci_upper: float | None = None
    reason: str | None = None
    metadata: dict[str, Any]


class ForeignChangeRequest(BaseModel):
    series: list[dict[str, Any]] = Field(
        ..., description="Time series: [{'timestamp': ISO8601, 'value': float}]"
    )
    ewma_lambda: float | None = None
    ewma_threshold: float | None = None
    cusum_threshold: float | None = None
    cusum_drift: float | None = None


class ForeignChangeResponse(BaseModel):
    ewma: dict[str, Any]
    cusum: dict[str, Any]
    combined_signal: str
    reason: str | None
    metadata: dict[str, Any]


class ConformalRequest(BaseModel):
    estimate: float
    se: float
    alpha: float | None = None
    n_calibration: int = 0


class ConformalResponse(BaseModel):
    lower: float | None
    upper: float | None
    alpha: float
    n_calibration: int
    method: str
    metadata: dict[str, Any]


class CorpusWriteRequest(BaseModel):
    intervention_id: str
    tenant_id: str
    estimator: str
    lift: float
    lift_ci_lower: float | None = None
    lift_ci_upper: float | None = None
    status: str = "ok"
    integrity_tags: dict[str, Any] = Field(default_factory=dict)
    foreign_change_tags: dict[str, Any] | None = None


class CorpusWriteResponse(BaseModel):
    row_id: int
    estimated_at: str
    signature: str
    payload_hash: str


# ---- Health ----

@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "service": "measurement", "version": "0.1.0"}


# ---- SCM Estimation ----

@router.post("/estimate/scm", response_model=ScmResponse)
async def scm_estimate(request: ScmRequest) -> ScmResponse:
    """
    Synthetic Control Method estimation.

    Constructs a weighted combination of control units matching the
    treated unit's pre-intervention trajectory.
    """
    # Convert to pandas
    treated_df = pd.DataFrame(request.treated_series)
    treated_df["timestamp"] = pd.to_datetime(treated_df["timestamp"])
    treated_series = treated_df.set_index("timestamp")["value"]

    control_dfs = {}
    for name, data in request.control_panel.items():
        df = pd.DataFrame(data)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        control_dfs[name] = df.set_index("timestamp")["value"]

    control_panel = pd.DataFrame(control_dfs)

    # Align indices (inner join)
    common_index = treated_series.index.intersection(control_panel.index)
    treated_aligned = treated_series.loc[common_index]
    control_aligned = control_panel.loc[common_index]

    result: SCMResult = estimate_scm(
        treated_series=treated_aligned,
        control_panel=control_aligned,
        treatment_start=request.treatment_start_index,
        min_pre_periods=request.min_pre_periods,
        min_controls=request.min_controls,
    )

    return ScmResponse(
        status=result.status.value,
        ate=result.ate,
        ate_ci_lower=result.ate_ci_lower,
        ate_ci_upper=result.ate_ci_upper,
        weights=result.weights,
        pre_fit_rmse=result.pre_fit_rmse,
        pre_fit_max_abs_error=result.pre_fit_max_abs_error,
        reason=result.reason,
        metadata=result.metadata,
    )


# ---- DML Estimation ----

@router.post("/estimate/dml", response_model=DmlResponse)
async def dml_estimate(request: DmlRequest) -> DmlResponse:
    """
    Double Machine Learning estimation.

    Uses cross-fitting with RandomForest for nuisance functions.
    """
    result: DMLResult = estimate_dml(
        outcome=pd.Series(request.outcome),
        treatment=pd.Series(request.treatment),
        covariates=pd.DataFrame(request.covariates),
        n_folds=request.n_folds,
        n_estimators=request.n_estimators,
        max_depth=request.max_depth,
        random_state=request.random_state,
    )

    return DmlResponse(
        status=result.status.value,
        ate=result.lift,
        ate_se=result.lift_se,
        ate_ci_lower=result.lift_ci_lower,
        ate_ci_upper=result.lift_ci_upper,
        reason=result.reason,
        metadata=result.metadata,
    )


# ---- Foreign Change Detection ----

@router.post("/detect/foreign-change", response_model=ForeignChangeResponse)
async def foreign_change(request: ForeignChangeRequest) -> ForeignChangeResponse:
    """
    Detect foreign changes in time series using EWMA + CUSUM.

    Safety-net detector that ships with the loop (26 §4).
    """
    df = pd.DataFrame(request.series)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.set_index("timestamp").sort_index()
    series = df["value"]

    result: ForeignChangeResult = detect_foreign_change(
        series,
        lambda_param=request.ewma_lambda,
        ewma_threshold=request.ewma_threshold,
        cusum_threshold=request.cusum_threshold,
        cusum_drift=request.cusum_drift,
    )

    return ForeignChangeResponse(
        ewma={
            "value": result.ewma.value,
            "signal": result.ewma.signal.value,
            "threshold": result.ewma.threshold,
            "lambda_param": result.ewma.lambda_param,
        },
        cusum={
            "c_plus": result.cusum.c_plus,
            "c_minus": result.cusum.c_minus,
            "signal": result.cusum.signal.value,
            "threshold": result.cusum.threshold,
            "drift": result.cusum.drift,
        },
        combined_signal=result.combined_signal.value,
        reason=result.reason,
        metadata=result.metadata,
    )


# ---- Conformal Correction ----

@router.post("/calibrate/conformal", response_model=ConformalResponse)
async def conformal_calibrate(request: ConformalRequest) -> ConformalResponse:
    """
    Apply placeholder conformal correction to point estimate + SE.

    THIN M4: asymptotic with conservative correction factor.
    Thickening: proper split-conformal / CV+ with calibration set.
    """
    result: ConformalInterval = apply_conformal_correction(
        estimate=request.estimate,
        se=request.se,
        alpha=request.alpha,
        n_calibration=request.n_calibration,
    )

    return ConformalResponse(
        lower=result.lower,
        upper=result.upper,
        alpha=result.alpha,
        n_calibration=result.n_calibration,
        method=result.method,
        metadata=result.metadata,
    )


# ---- Signed Corpus Write ----

@router.post("/corpus/write", response_model=CorpusWriteResponse)
async def write_corpus(request: CorpusWriteRequest) -> CorpusWriteResponse:
    """
    Write a signed CIO corpus row.

    Creates canonical payload, signs with ed25519 (libs/crypto),
    and persists to Postgres. WORM signature binds the row
    intervention outcome.
    """
    import pathlib


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

    # M4-thin: DB write is optional (may not have DB in dev)
    # Return row with metadata; actual persist via batch job
    # Return row with metadata; actual persist via batch job
    return CorpusWriteResponse(
        row_id=-1,  # placeholder — real ID from DB insert
        estimated_at=row.estimated_at,
        signature=row.signature.hex(),
        payload_hash=sha256(row.canonical_json.encode()).hexdigest(),
    )


# ---- Batch Corpus Write ----

class BatchCorpusWriteRequest(BaseModel):
    rows: list[CorpusWriteRequest]


class BatchCorpusWriteResponse(BaseModel):
    written: int
    estimated_at: str


@router.post("/corpus/write-batch", response_model=BatchCorpusWriteResponse)
async def write_corpus_batch(request: BatchCorpusWriteRequest) -> BatchCorpusWriteResponse:
    """Write multiple signed corpus rows."""
    settings = get_settings()
    if not settings.signing_key_path:
        raise HTTPException(
            status_code=503,
            detail="Signing key not configured — corpus writes disabled in thin mode",
        )

    rows = []
    for req in request.rows:
        row = await create_signed_corpus_row(
            intervention_id=req.intervention_id,
            tenant_id=req.tenant_id,
            estimator=req.estimator,
            lift=req.lift,
            lift_ci_lower=req.lift_ci_lower,
            lift_ci_upper=req.lift_ci_upper,
            status=req.status,
            integrity_tags=req.integrity_tags,
            signing_key_pem=settings.signing_key_path,
            foreign_change_tags=req.foreign_change_tags,
        )
        rows.append(row)

    # M4-thin: return count; actual DB persist is async batch job
    return BatchCorpusWriteResponse(
        written=len(rows),
        estimated_at=datetime.now(UTC).isoformat() + "Z",
    )


# ---- Measurement Lifecycle (M4-thin) ----

class StartMeasurementRequest(BaseModel):
    tenant_id: str
    intervention_id: str
    merge_commit_sha: str
    idempotency_key: str


class StartMeasurementResponse(BaseModel):
    outcome_id: str
    treatment_time: str  # ISO 8601


class RecordMeasurementRequest(BaseModel):
    outcome_id: str
    surface_id: str
    value: float
    measured_at: str | None = None  # ISO 8601, defaults to now
    idempotency_key: str


class RecordMeasurementResponse(BaseModel):
    recorded: bool
    foreign_change_detected: bool
    foreign_change_reason: str


class OutcomeResponse(BaseModel):
    outcome_id: str
    intervention_id: str
    point_estimate: float
    ci_low: float
    ci_high: float
    sample_count: int
    foreign_change_status: int
    integrity_tags: dict[str, Any]
    conformal_coverage: dict[str, Any] | None = None


class ListOutcomesRequest(BaseModel):
    tenant_id: str
    page_size: int = 50
    page_token: str = ""


class ListOutcomesResponse(BaseModel):
    outcomes: list[OutcomeResponse]
    next_page_token: str


@router.post("/measurements/start", response_model=StartMeasurementResponse)
async def start_measurement(request: StartMeasurementRequest) -> StartMeasurementResponse:
    """
    Start a measurement window for an intervention (PR merge).

    M4-thin: Creates a placeholder outcome ID with current timestamp.
    M4-thicken: Record treatment_time = PR merge time, start outcome row in DB.
    """
    outcome_id = f"{request.tenant_id}-{request.intervention_id}-outcome-{request.idempotency_key}"
    treatment_time = datetime.now(UTC).isoformat()

    return StartMeasurementResponse(
        outcome_id=outcome_id,
        treatment_time=treatment_time,
    )


@router.post("/measurements/record", response_model=RecordMeasurementResponse)
async def record_measurement(request: RecordMeasurementRequest) -> RecordMeasurementResponse:
    """
    Record a measurement point for an outcome.

    M4-thin: Returns recorded=true with no foreign change detection.
    M4-thicken: Append to time series, run EWMA/CUSUM, update outcome.
    """
    # M4-thin: just acknowledge
    return RecordMeasurementResponse(
        recorded=True,
        foreign_change_detected=False,
        foreign_change_reason="",
    )


@router.get("/measurements/outcome/{outcome_id}", response_model=OutcomeResponse)
async def get_outcome(outcome_id: str) -> OutcomeResponse:
    """
    Get the full outcome with lift + CI + conformal + foreign-change.

    M4-thin: Returns placeholder with candor microcopy.
    """
    # M4-thin: Return placeholder with honest candor
    return OutcomeResponse(
        outcome_id=outcome_id,
        intervention_id="",
        point_estimate=0.0,
        ci_low=0.0,
        ci_high=0.0,
        sample_count=0,
        foreign_change_status=0,  # UNSPECIFIED
        integrity_tags={},
        conformal_coverage={
            "prediction_interval_low": 0.0,
            "prediction_interval_high": 0.0,
            "coverage_contained": 0,
            "coverage_total": 0,
            "candor_microcopy": "preliminary — calibration in flight (M4-thin placeholder)",
        },
    )


@router.get("/measurements/outcomes", response_model=ListOutcomesResponse)
async def list_outcomes(
    tenant_id: str,
    page_size: int = 50,
    page_token: str = "",
) -> ListOutcomesResponse:
    """
    List outcomes for a tenant.

    M4-thin: Returns empty list.
    """
    return ListOutcomesResponse(
        outcomes=[],
        next_page_token="",
    )


# ---- Full Measurement Pipeline (M4-thin) ----

class RunMeasurementPipelineRequest(BaseModel):
    """Request to run the full measurement pipeline for an intervention."""
    tenant_id: str
    intervention_id: str
    # Pre-treatment outcome data
    treated_pre_series: list[dict[str, Any]]  # [{"timestamp": ISO8601, "value": float}]
    control_pre_panel: dict[str, list[dict[str, Any]]]  # {unit: [{"timestamp", "value"}]}
    # Post-treatment outcome data
    treated_post_series: list[dict[str, Any]]
    control_post_panel: dict[str, list[dict[str, Any]]]
    treatment_start_index: int
    # DML covariates (post-treatment)
    dml_outcome: list[float]
    dml_treatment: list[int]
    dml_covariates: list[list[float]]
    # Foreign change series (e.g., daily impressions)
    foreign_change_series: list[dict[str, Any]] | None = None
    idempotency_key: str


class RunMeasurementPipelineResponse(BaseModel):
    """Response with full pipeline results."""
    outcome_id: str
    scm_result: dict[str, Any] | None = None
    dml_result: dict[str, Any] | None = None
    conformal_coverage: dict[str, Any] | None = None
    foreign_change_result: dict[str, Any] | None = None
    quarantine_decision: dict[str, Any] | None = None
    corpus_written: bool = False
    corpus_row_id: int | None = None
    error: str | None = None


@router.post(
    "/measurements/pipeline", response_model=RunMeasurementPipelineResponse
)
async def run_measurement_pipeline(
    request: RunMeasurementPipelineRequest,
) -> RunMeasurementPipelineResponse:
    """
    Run the full measurement pipeline for an intervention.

    Pipeline: SCM + DML estimation → Conformal calibration → Foreign change detection
    → Quarantine check → Signed corpus row write (if allowed).
    """
    settings = get_settings()
    outcome_id = f"{request.tenant_id}-{request.intervention_id}-outcome-{request.idempotency_key}"

    # --- 1. SCM Estimation ---
    scm_result: dict[str, Any] | None = None
    try:
        treated_df = pd.DataFrame(request.treated_pre_series + request.treated_post_series)
        treated_df["timestamp"] = pd.to_datetime(treated_df["timestamp"])
        treated_series = treated_df.set_index("timestamp")["value"]

        control_dfs = {}
        for name, data in request.control_pre_panel.items():
            df = pd.DataFrame(data)
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            control_dfs[name] = df.set_index("timestamp")["value"]

        for name, data in request.control_post_panel.items():
            df = pd.DataFrame(data)
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            if name in control_dfs:
                combined = pd.concat([control_dfs[name], df.set_index("timestamp")["value"]])
                control_dfs[name] = combined.sort_index()
            else:
                control_dfs[name] = df.set_index("timestamp")["value"]

        control_panel = pd.DataFrame(control_dfs)

        # Align indices
        common_idx = treated_series.index.intersection(control_panel.index)
        treated_aligned = treated_series.loc[common_idx]
        control_aligned = control_panel.loc[common_idx]

        scm_est = estimate_scm(
            treated_series=treated_aligned,
            control_panel=control_aligned,
            treatment_start=request.treatment_start_index,
        )
        scm_result = {
            "status": scm_est.status.value,
            "ate": scm_est.ate,
            "ate_ci_lower": scm_est.ate_ci_lower,
            "ate_ci_upper": scm_est.ate_ci_upper,
            "weights": scm_est.weights,
            "pre_fit_rmse": scm_est.pre_fit_rmse,
            "pre_fit_max_abs_error": scm_est.pre_fit_max_abs_error,
            "reason": scm_est.reason,
            "integrity_tags": scm_est.to_integrity_tags(),
        }
    except Exception as e:
        scm_result = {"status": "error", "error": str(e)}

    # --- 2. DML Estimation ---
    dml_result: dict[str, Any] | None = None
    try:
        if request.dml_outcome and request.dml_treatment and request.dml_covariates:
            dml_est = estimate_dml(
                outcome=request.dml_outcome,
                treatment=request.dml_treatment,
                covariates=request.dml_covariates,
            )
            dml_result = {
                "status": dml_est.status.value,
                "lift": dml_est.lift,
                "lift_se": dml_est.lift_se,
                "lift_ci_lower": dml_est.lift_ci_lower,
                "lift_ci_upper": dml_est.lift_ci_upper,
                "reason": dml_est.reason,
                "integrity_tags": dml_est.to_integrity_tags(),
            }
        else:
            dml_result = {"status": "skipped", "reason": "no_dml_inputs"}
    except Exception as e:
        dml_result = {"status": "error", "error": str(e)}

    # --- 3. Conformal Calibration ---
    conformal_result: dict[str, Any] | None = None
    try:
        intervals = {}
        if scm_result and scm_result.get("ate") is not None:
            se_proxy = scm_result.get("pre_fit_rmse", 1.0)
            scm_interval = apply_conformal_correction(
                estimate=float(scm_result["ate"]), se=float(se_proxy), n_calibration=30
            )
            intervals["scm"] = {
                "lower": scm_interval.lower,
                "upper": scm_interval.upper,
                "method": scm_interval.method,
            }
        if dml_result and dml_result.get("lift") is not None:
            dml_lift = float(dml_result["lift"])
            dml_se = float(dml_result.get("lift_se", 1.0))
            dml_interval = apply_conformal_correction(
                estimate=dml_lift, se=dml_se, n_calibration=30
            )
            intervals["dml"] = {
                "lower": dml_interval.lower,
                "upper": dml_interval.upper,
                "method": dml_interval.method,
            }
        conformal_result = {"intervals": intervals, "alpha": 0.1}
    except Exception as e:
        conformal_result = {"error": str(e)}

    # --- 4. Foreign Change Detection ---
    foreign_change_result: dict[str, Any] | None = None
    try:
        if request.foreign_change_series:
            df = pd.DataFrame(request.foreign_change_series)
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df = df.set_index("timestamp").sort_index()
            series = df["value"]

            fc_result = detect_foreign_change(series)
            foreign_change_result = {
                "ewma": {
                    "value": fc_result.ewma.value,
                    "signal": fc_result.ewma.signal.value,
                    "threshold": fc_result.ewma.threshold,
                    "lambda_param": fc_result.ewma.lambda_param,
                },
                "cusum": {
                    "c_plus": fc_result.cusum.c_plus,
                    "c_minus": fc_result.cusum.c_minus,
                    "signal": fc_result.cusum.signal.value,
                    "threshold": fc_result.cusum.threshold,
                    "drift": fc_result.cusum.drift,
                },
                "combined_signal": fc_result.combined_signal.value,
                "reason": fc_result.reason,
            }
        else:
            foreign_change_result = {"status": "no_series_provided"}
    except Exception as e:
        foreign_change_result = {"error": str(e)}

    # --- 5. Quarantine Check ---
    quarantine_decision: dict[str, Any] | None = None
    try:
        if request.foreign_change_series:
            df = pd.DataFrame(request.foreign_change_series)
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df = df.set_index("timestamp").sort_index()
            series = df["value"]

            guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
            q_decision = guard.check_series(series)

            quarantine_decision = {
                "status": q_decision.status.value,
                "allowed": q_decision.allowed,
                "reason": q_decision.reason,
                "integrity_tags": q_decision.to_integrity_tags(),
            }
        else:
            quarantine_decision = {
                "status": "clean",
                "allowed": True,
                "reason": "no_foreign_change_series",
            }
    except Exception as e:
        quarantine_decision = {"status": "error", "allowed": True, "error": str(e)}

    # --- 6. Corpus Write (if allowed) ---
    corpus_written = False
    corpus_row_id = None

    should_write = (
        quarantine_decision
        and quarantine_decision.get("allowed", True)
        and settings.signing_key_path
    )

    if should_write and settings.signing_key_path:
        try:
            key_path = Path(settings.signing_key_path)
            if key_path.exists():
                signing_key_pem = key_path.read_text()

                # Combine integrity tags from all components
                integrity_tags: dict[str, Any] = {}
                if scm_result and "integrity_tags" in scm_result:
                    integrity_tags.update(scm_result["integrity_tags"])
                if dml_result and "integrity_tags" in dml_result:
                    integrity_tags.update(dml_result["integrity_tags"])
                if quarantine_decision and "integrity_tags" in quarantine_decision:
                    integrity_tags.update(quarantine_decision["integrity_tags"])

                # Determine lift and CI from best available estimator
                lift: float | None = scm_result.get("ate") if scm_result else None
                if lift is None and dml_result:
                    lift = dml_result.get("lift")
                ci_lower: float | None = scm_result.get("ate_ci_lower") if scm_result else None
                if ci_lower is None and dml_result:
                    ci_lower = dml_result.get("lift_ci_lower")
                ci_upper: float | None = scm_result.get("ate_ci_upper") if scm_result else None
                if ci_upper is None and dml_result:
                    ci_upper = dml_result.get("lift_ci_upper")

                fc_tags: dict[str, Any] | None = (
                    quarantine_decision.get("integrity_tags") if quarantine_decision else None
                )

                await create_signed_corpus_row(
                    intervention_id=request.intervention_id,
                    tenant_id=request.tenant_id,
                    estimator="scm+dml",
                    lift=lift,
                    lift_ci_lower=ci_lower,
                    lift_ci_upper=ci_upper,
                    status="ok",
                    integrity_tags=integrity_tags,
                    signing_key_pem=signing_key_pem,
                    foreign_change_tags=fc_tags,
                )
                corpus_written = True
                corpus_row_id = -1  # Placeholder until DB write
        except Exception:
            # Signing key not available or write failed - continue without corpus write
            pass

    return RunMeasurementPipelineResponse(
        outcome_id=outcome_id,
        scm_result=scm_result,
        dml_result=dml_result,
        conformal_coverage=conformal_result,
        foreign_change_result=foreign_change_result,
        quarantine_decision=quarantine_decision,
        corpus_written=corpus_written,
        corpus_row_id=corpus_row_id,
        error=None,
    )