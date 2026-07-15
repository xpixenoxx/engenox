"""Foreign Change Detector — M4-thin.

Implements EWMA (Exponentially Weighted Moving Average) and CUSUM
(Cumulative Sum) detectors for identifying foreign changes that could
confound intervention effect estimates. These are the safety net that
ships WITH the loop per 26 §4.

References: 15 §3 (WORM signature), 26 §4 (foreign change detector).
"""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any

import pandas as pd

from engenox.measurement.config.settings import get_settings


class DetectorSignal(StrEnum):
    """Signal from foreign change detector."""

    CLEAR = "CLEAR"  # No foreign change detected
    WARNING = "WARNING"  # Elevated signal, monitoring
    ALERT = "ALERT"  # Foreign change detected


@dataclass(frozen=True, slots=True)
class EwmaState:
    """Current state of EWMA detector."""

    value: float
    signal: DetectorSignal
    threshold: float
    lambda_param: float


@dataclass(frozen=True, slots=True)
class CusumState:
    """Current state of CUSUM detector."""

    c_plus: float
    c_minus: float
    signal: DetectorSignal
    threshold: float
    drift: float


@dataclass(frozen=True, slots=True)
class ForeignChangeResult:
    """Result of foreign change detection."""

    ewma: EwmaState
    cusum: CusumState
    combined_signal: DetectorSignal
    reason: str | None
    metadata: dict[str, Any]

    def to_corpus_row(self, tenant_id: str, surface: str) -> dict[str, Any]:
        """Convert to corpus row format for audit."""
        return {
            "tenant_id": tenant_id,
            "surface": surface,
            "detector": "ewma_cusum",
            "ewma_value": self.ewma.value,
            "ewma_signal": self.ewma.signal.value,
            "ewma_threshold": self.ewma.threshold,
            "cusum_c_plus": self.cusum.c_plus,
            "cusum_c_minus": self.cusum.c_minus,
            "cusum_signal": self.cusum.signal.value,
            "cusum_threshold": self.cusum.threshold,
            "combined_signal": self.combined_signal.value,
            "reason": self.reason,
            "metadata": self.metadata,
            "checked_at": datetime.utcnow().isoformat() + "Z",
        }


def _compute_ewma(series: pd.Series, lambda_param: float) -> pd.Series:
    """Compute EWMA for a pandas Series."""
    return series.ewm(alpha=lambda_param, adjust=False).mean()


def _compute_ewma_residuals(series: pd.Series, lambda_param: float) -> pd.Series:
    """Compute residuals from EWMA forecast (one-step-ahead)."""
    ewma = _compute_ewma(series, lambda_param)
    # Residual = actual - forecast (forecast is previous EWMA value)
    forecast = ewma.shift(1)
    return series - forecast


def update_ewma(
    previous_ewma: float | None,
    new_observation: float,
    lambda_param: float,
) -> float:
    """Update EWMA with single new observation (streaming)."""
    if previous_ewma is None:
        return new_observation
    return lambda_param * new_observation + (1 - lambda_param) * previous_ewma


def detect_ewma_batch(
    series: pd.Series,
    *,
    lambda_param: float | None = None,
    threshold: float | None = None,
) -> EwmaState:
    """Run EWMA detection on full batch series."""
    settings = get_settings()
    lambda_param = lambda_param or settings.ewma_lambda
    threshold = threshold or settings.ewma_threshold

    if len(series) < 2:
        return EwmaState(
            value=series.iloc[-1] if len(series) > 0 else 0.0,
            signal=DetectorSignal.CLEAR,
            threshold=threshold,
            lambda_param=lambda_param,
        )

    ewma_forecast = _compute_ewma(series.shift(1).dropna(), lambda_param)
    residuals = series.iloc[1:] - ewma_forecast

    # Standardize residuals
    residual_std = residuals.std()
    if residual_std > 0:
        standardized = residuals / residual_std
    else:
        standardized = pd.Series(0.0, index=residuals.index)

    # Current EWMA value
    current_ewma = ewma_forecast.iloc[-1] if len(ewma_forecast) > 0 else series.iloc[-1]

    # Signal based on max standardized residual
    max_residual = standardized.abs().max() if len(standardized) > 0 else 0.0

    if max_residual > threshold:
        signal = DetectorSignal.ALERT
    elif max_residual > threshold * 0.7:  # Warning at 70% of threshold
        signal = DetectorSignal.WARNING
    else:
        signal = DetectorSignal.CLEAR

    return EwmaState(
        value=current_ewma,
        signal=signal,
        threshold=threshold,
        lambda_param=lambda_param,
    )


def detect_cusum_batch(
    series: pd.Series,
    *,
    lambda_param: float | None = None,
    threshold: float | None = None,
    drift: float | None = None,
) -> CusumState:
    """Run CUSUM detection on full batch series."""
    settings = get_settings()
    lambda_param = lambda_param or settings.ewma_lambda
    threshold = threshold or settings.cusum_threshold
    drift = drift or settings.cusum_drift

    if len(series) < 2:
        return CusumState(
            c_plus=0.0,
            c_minus=0.0,
            signal=DetectorSignal.CLEAR,
            threshold=threshold,
            drift=drift,
        )

    # Use EWMA residuals as CUSUM input
    ewma_forecast = _compute_ewma(series.shift(1).dropna(), lambda_param)
    residuals = series.iloc[1:] - ewma_forecast
    residual_std = residuals.std()
    if residual_std > 0:
        standardized = residuals / residual_std
    else:
        standardized = pd.Series(0.0, index=residuals.index)

    c_plus = 0.0
    c_minus = 0.0

    for r in standardized:
        c_plus = max(0, c_plus + r - drift)
        c_minus = max(0, c_minus - r - drift)

    signal = DetectorSignal.CLEAR
    if c_plus > threshold or c_minus > threshold:
        signal = DetectorSignal.ALERT
    elif c_plus > threshold * 0.7 or c_minus > threshold * 0.7:
        signal = DetectorSignal.WARNING

    return CusumState(
        c_plus=c_plus,
        c_minus=c_minus,
        signal=signal,
        threshold=threshold,
        drift=drift,
    )


def detect_foreign_change(
    series: pd.Series,
    *,
    lambda_param: float | None = None,
    ewma_threshold: float | None = None,
    cusum_threshold: float | None = None,
    cusum_drift: float | None = None,
) -> ForeignChangeResult:
    """
    Run both EWMA and CUSUM foreign change detection on a series.

    Returns combined result with the highest severity signal.
    """
    ewma_state = detect_ewma_batch(
        series,
        lambda_param=lambda_param,
        threshold=ewma_threshold,
    )
    cusum_state = detect_cusum_batch(
        series,
        lambda_param=lambda_param,
        threshold=cusum_threshold,
        drift=cusum_drift,
    )

    # Combine signals: ALERT > WARNING > CLEAR
    signal_order = {DetectorSignal.CLEAR: 0, DetectorSignal.WARNING: 1, DetectorSignal.ALERT: 2}
    combined_signal = max(
        [ewma_state.signal, cusum_state.signal],
        key=lambda s: signal_order[s],
    )

    reason = None
    if combined_signal == DetectorSignal.ALERT:
        if ewma_state.signal == DetectorSignal.ALERT:
            reason = "EWMA threshold exceeded — potential foreign change"
        else:
            reason = "CUSUM threshold exceeded — potential foreign change"
    elif combined_signal == DetectorSignal.WARNING:
        reason = "Elevated detector signal — monitoring for foreign change"

    return ForeignChangeResult(
        ewma=ewma_state,
        cusum=cusum_state,
        combined_signal=combined_signal,
        reason=reason,
        metadata={
            "series_length": len(series),
            "series_mean": float(series.mean()) if len(series) > 0 else 0.0,
            "series_std": float(series.std()) if len(series) > 1 else 0.0,
        },
    )