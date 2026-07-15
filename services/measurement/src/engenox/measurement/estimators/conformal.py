"""Placeholder Conformal Calibrator — M4-thin.

Provides a thin conformal prediction wrapper that yields valid (but wide) CIs
until the real conformal calibrator (with proper calibration set, split-conformal
or CV+) lands in the thickening pass. The candor floor:alpha is carried
through; CIs are intentionally conservative.

Per ADR-0007: the real conformal calibrator with grf-based CATE estimation
and proper calibration is a thickening item. This is the FALLBACK path.
"""

from dataclasses import dataclass
from typing import Any, Protocol

import numpy as np

from engenox.measurement.config.settings import get_settings


class EstimatorResult(Protocol):
    """Protocol for estimator results with ATE/SE attributes."""

    ate: float | None
    pre_fit_rmse: float | None
    ate_se: float | None
    n_calibration: int


@dataclass(frozen=True, slots=True)
class ConformalInterval:
    """Conformal prediction interval result."""

    lower: float | None
    upper: float | None
    alpha: float
    n_calibration: int
    method: str  # "split-conformal" | "cv+" | "placeholder"
    metadata: dict[str, Any]


def _placeholder_interval(
    point_estimate: float, alpha: float, n_calibration: int = 0
) -> ConformalInterval:
    """
    Placeholder conformal interval using asymptotic normal approximation.

    In M4-thin, we don't have a proper calibration set. This uses the
    conservative asymptotic CI with a small-sample correction factor.
    This is intentionally WIDE — the candor floor renders "preliminary"
    until real calibration lands in thickening.
    """
    # Use the pre-registered alpha from settings
    settings = get_settings()
    alpha = alpha or settings.conformal_alpha

    # Conservative correction factor (widens CI for small calibration sets)
    correction = 2.0 if n_calibration < settings.conformal_min_calibration else 1.0

    # Asymptotic normal CI with correction
    z = 1.96  # 95% nominal
    margin = correction * z / np.sqrt(max(n_calibration, 1))
    half_width = margin  # Will be scaled by point estimate uncertainty externally

    return ConformalInterval(
        lower=point_estimate - half_width,
        upper=point_estimate + half_width,
        alpha=alpha,
        n_calibration=n_calibration,
        method="placeholder-asymptotic",
        metadata={
            "note": "THIN M4 PLACEHOLDER — conformal calibrator deferred to thickening",
            "correction_factor": correction,
            "min_calibration_required": settings.conformal_min_calibration,
        },
    )


def apply_conformal_correction(
    estimate: float,
    se: float,
    alpha: float | None = None,
    n_calibration: int = 0,
) -> ConformalInterval:
    """
    Apply conformal correction to a point estimate with standard error.

    In M4-thin: SE-based CI with conservative multiplier.
    In thickening: proper split-conformal / CV+ with calibration set.
    """
    if se <= 0 or not np.isfinite(se):
        return _placeholder_interval(estimate, alpha or 0.05, n_calibration)

    settings = get_settings()
    alpha = alpha or settings.conformal_alpha

    # Base margin = 1.96 * se * correction_factor
    n_cal = n_calibration
    if n_cal < settings.conformal_min_calibration:
        correction = (
            1.5
            + (settings.conformal_min_calibration - n_cal)
            / settings.conformal_min_calibration
        )
    else:
        correction = 1.0

    z = 1.96  # nominal 95%
    half_width = z * se * correction

    return ConformalInterval(
        lower=estimate - half_width,
        upper=estimate + half_width,
        alpha=alpha,
        n_calibration=n_cal,
        method="placeholder-se-corrected",
        metadata={
            "se": se,
            "correction_factor": correction,
            "note": "THIN M4 PLACEHOLDER — real conformal calibrator in thickening pass",
        },
    )


def combine_estimators_conformal(
    scm_result: EstimatorResult,
    dml_result: EstimatorResult,
    alpha: float | None = None,
) -> dict[str, ConformalInterval]:
    """
    Combine SCM and DML estimates with conformal correction.

    Returns dict with 'scm' and 'dml' ConformalInterval objects.
    Real model combination (grf CATE) is a thickening item.
    """
    intervals = {}

    if scm_result and hasattr(scm_result, "ate") and scm_result.ate is not None:
        se = getattr(scm_result, "pre_fit_rmse", 1.0)  # proxy if no direct SE
        intervals["scm"] = apply_conformal_correction(
            scm_result.ate, se, alpha, getattr(scm_result, "n_calibration", 0)
        )

    if dml_result and hasattr(dml_result, "ate") and dml_result.ate is not None:
        se = getattr(dml_result, "ate_se", 1.0)
        intervals["dml"] = apply_conformal_correction(
            dml_result.ate, se, alpha, getattr(dml_result, "n_calibration", 0)
        )

    # If both available, also provide a combined (simple average for now)
    if "scm" in intervals and "dml" in intervals:
        scm_lower = intervals["scm"].lower
        scm_upper = intervals["scm"].upper
        dml_lower = intervals["dml"].lower
        dml_upper = intervals["dml"].upper
        if (
            scm_lower is not None
            and scm_upper is not None
            and dml_lower is not None
            and dml_upper is not None
        ):
            combined_est = (scm_lower + dml_lower) / 2
            combined_se = (
                scm_upper - scm_lower + dml_upper - dml_lower
            ) / 4
            intervals["combined"] = apply_conformal_correction(combined_est, combined_se, alpha)

    return intervals