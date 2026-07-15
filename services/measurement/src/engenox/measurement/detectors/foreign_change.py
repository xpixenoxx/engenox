"""Foreign Change Detector — M4-thin.

Implements EWMA (Exponentially Weighted Moving Average) and CUSUM
(Cumulative Sum) control charts for detecting foreign changes in the
measurement signal. These are the safety-net detectors that run alongside
the main estimators (SCM/DML).

Per 26 §4: the foreign-change detector ships WITH the loop, not after.
References: 13 §4 (corpus), 26 §2.4 (integrity tags).
"""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any

import numpy as np
import pandas as pd

from engenox.measurement.config.settings import get_settings


class ChangeType(StrEnum):
    """Type of detected change."""

    NONE = "none"
    EWMA = "ewma"
    CUSUM = "cusum"
    BOTH = "both"


@dataclass(frozen=True, slots=True)
class ChangeDetectionResult:
    """Result of foreign change detection."""

    change_type: ChangeType
    ewma_signal: float | None
    ewma_threshold: float | None
    ewma_triggered: bool
    cusum_signal: float | None
    cusum_threshold: float | None
    cusum_triggered: bool
    detection_time: datetime
    metadata: dict[str, Any]

    def to_integrity_tags(self) -> dict[str, Any]:
        """Convert to integrity tags for CIO corpus row."""
        tags: dict[str, Any] = {
            "foreign_change_detected": self.change_type != ChangeType.NONE,
            "change_type": self.change_type.value,
            "detected_at": self.detection_time.isoformat() + "Z",
        }
        if self.ewma_signal is not None:
            tags["ewma_signal"] = self.ewma_signal
            tags["ewma_threshold"] = self.ewma_threshold
            tags["ewma_triggered"] = self.ewma_triggered
        if self.cusum_signal is not None:
            tags["cusum_signal"] = self.cusum_signal
            tags["cusum_threshold"] = self.cusum_threshold
            tags["cusum_triggered"] = self.cusum_triggered
        return tags


def compute_ewma(series: pd.Series, lambda_: float) -> pd.Series:
    """
    Compute Exponentially Weighted Moving Average.

    EWMA_t = lambda * x_t + (1 - lambda) * EWMA_{t-1}
    """
    return series.ewm(alpha=lambda_, adjust=False).mean()


def compute_ewma_control_limits(
    series: pd.Series, lambda_: float, control_limit_multiplier: float
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    Compute EWMA control limits.

    UCL = EWMA_mean + L * sigma * sqrt(lambda / (2 - lambda) * (1 - (1 - lambda)^(2t)))
    """
    ewma = compute_ewma(series, lambda_)
    ewma_mean = ewma.iloc[0] if len(ewma) > 0 else 0.0

    # Estimate in-control standard deviation from first stable period
    sigma = series.std() if len(series) > 1 else 1.0

    # Time-varying control limits (wider at start)
    t = np.arange(1, len(series) + 1)
    var_factor = lambda_ / (2 - lambda_) * (1 - (1 - lambda_) ** (2 * t))
    std_factor = np.sqrt(np.maximum(var_factor, 0))

    ucl = ewma_mean + control_limit_multiplier * sigma * std_factor
    lcl = ewma_mean - control_limit_multiplier * sigma * std_factor

    return ewma, pd.Series(ucl, index=series.index), pd.Series(lcl, index=series.index)


def compute_cusum(
    series: pd.Series, threshold: float, drift: float
) -> tuple[pd.Series, pd.Series]:
    """
    Compute CUSUM (Cumulative Sum) control chart.

    CUSUM+ = max(0, CUSUM+_{t-1} + (x_t - target - drift))
    CUSUM- = max(0, CUSUM-_{t-1} - (x_t - target + drift))

    Signal when either exceeds threshold.
    """
    target = series.mean()
    cusum_pos = np.zeros(len(series))
    cusum_neg = np.zeros(len(series))

    for i, x in enumerate(series):
        if i == 0:
            cusum_pos[i] = max(0, x - target - drift)
            cusum_neg[i] = max(0, target + drift - x)
        else:
            cusum_pos[i] = max(0, cusum_pos[i - 1] + (x - target - drift))
            cusum_neg[i] = max(0, cusum_neg[i - 1] - (x - target + drift))

    return (
        pd.Series(cusum_pos, index=series.index),
        pd.Series(cusum_neg, index=series.index),
    )


def detect_foreign_changes(
    metric_series: pd.Series,
    *,
    ewma_lambda: float | None = None,
    ewma_threshold: float | None = None,
    cusum_threshold: float | None = None,
    cusum_drift: float | None = None,
) -> ChangeDetectionResult:
    """
    Detect foreign changes in a metric time series using EWMA and CUSUM.

    Args:
        metric_series: Time series of metric values (e.g., daily impressions)
        ewma_lambda: EWMA smoothing parameter (default from settings)
        ewma_threshold: Control limit multiplier (default from settings)
        cusum_threshold: CUSUM threshold (default from settings)
        cusum_drift: CUSUM drift parameter (default from settings)

    Returns:
        ChangeDetectionResult with signals and triggered status
    """
    settings = get_settings()

    lambda_ = ewma_lambda or settings.ewma_lambda
    ewma_L = ewma_threshold or settings.ewma_threshold
    cusum_h = cusum_threshold or settings.cusum_threshold
    cusum_k = cusum_drift or settings.cusum_drift

    if len(metric_series) < 2:
        return ChangeDetectionResult(
            change_type=ChangeType.NONE,
            ewma_signal=None,
            ewma_threshold=None,
            ewma_triggered=False,
            cusum_signal=None,
            cusum_threshold=None,
            cusum_triggered=False,
            detection_time=datetime.utcnow(),
            metadata={"reason": "insufficient data", "n_points": len(metric_series)},
        )

    # Compute EWMA
    ewma, ucl, lcl = compute_ewma_control_limits(metric_series, lambda_, ewma_L)
    ewma_signal = ewma.iloc[-1] if len(ewma) > 0 else None
    ewma_triggered = (
        ewma_signal is not None
        and (ewma_signal > ucl.iloc[-1] or ewma_signal < lcl.iloc[-1])
    )

    # Compute CUSUM
    cusum_pos, cusum_neg = compute_cusum(metric_series, cusum_h, cusum_k)
    cusum_signal = max(cusum_pos.iloc[-1], cusum_neg.iloc[-1]) if len(cusum_pos) > 0 else None
    cusum_triggered = cusum_signal is not None and cusum_signal > cusum_h

    # Determine change type
    if ewma_triggered and cusum_triggered:
        change_type = ChangeType.BOTH
    elif ewma_triggered:
        change_type = ChangeType.EWMA
    elif cusum_triggered:
        change_type = ChangeType.CUSUM
    else:
        change_type = ChangeType.NONE

    return ChangeDetectionResult(
        change_type=change_type,
        ewma_signal=float(ewma_signal) if ewma_signal is not None else None,
        ewma_threshold=float(ewma_L),
        ewma_triggered=ewma_triggered,
        cusum_signal=float(cusum_signal) if cusum_signal is not None else None,
        cusum_threshold=float(cusum_h),
        cusum_triggered=cusum_triggered,
        detection_time=datetime.utcnow(),
        metadata={
            "series_length": len(metric_series),
            "series_mean": float(metric_series.mean()),
            "series_std": float(metric_series.std()),
            "ewma_lambda": lambda_,
            "cusum_drift": cusum_k,
        },
    )