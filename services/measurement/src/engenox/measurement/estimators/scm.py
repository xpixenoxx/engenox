"""Synthetic Control Method (SCM) Estimator — M4-thin.

Implements the synthetic control estimator for panel data with
multiple control units. The SCM constructs a weighted combination of
control units that best matches the pre-intervention characteristics
of the treated unit.

Per 26 §4: SCM is the primary estimator for brand-level interventions.
References: 13 §4 (corpus), 11 §3 seam 5 (Abduce hypotheses from SCM).
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Any

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from engenox.measurement.config.settings import get_settings


class SCMStatus(StrEnum):
    """SCM estimation status."""

    OK = "ok"
    FALLBACK = "fallback"
    INFEASIBLE = "infeasible"


@dataclass(frozen=True, slots=True)
class SCMResult:
    """Result of Synthetic Control Method estimation."""

    status: SCMStatus
    ate: float | None
    ate_ci_lower: float | None
    ate_ci_upper: float | None
    weights: dict[str, float] | None
    pre_fit_rmse: float | None
    pre_fit_max_abs_error: float | None
    reason: str | None
    metadata: dict[str, Any]

    def to_integrity_tags(self) -> dict[str, Any]:
        """Convert to integrity tags for CIO corpus."""
        tags: dict[str, Any] = {
            "estimator": "scm",
            "status": self.status.value,
        }
        if self.ate is not None:
            tags["ate"] = self.ate
            if self.ate_ci_lower is not None:
                tags["ate_ci_lower"] = self.ate_ci_lower
                tags["ate_ci_upper"] = self.ate_ci_upper
        if self.weights is not None:
            tags["scm_weights"] = self.weights
        if self.pre_fit_rmse is not None:
            tags["pre_fit_rmse"] = self.pre_fit_rmse
        if self.reason is not None:
            tags["fallback_reason"] = self.reason
        return tags


def _validate_scm_data(
    treated_pre: pd.Series,
    control_pre: pd.DataFrame,
    min_pre_periods: int,
    min_controls: int,
) -> tuple[bool, str]:
    """Validate data for SCM estimation."""
    if len(treated_pre) < min_pre_periods:
        return False, f"treated pre-periods ({len(treated_pre)}) < min ({min_pre_periods})"
    if control_pre.shape[1] < min_controls:
        return False, f"control units ({control_pre.shape[1]}) < min ({min_controls})"
    if len(treated_pre) != len(control_pre):
        return False, "treated and control pre-periods length mismatch"
    if treated_pre.isnull().any() or control_pre.isnull().any().any():
        return False, "missing values in pre-period data"
    return True, ""


def _scm_objective(weights: np.ndarray, treated_pre: np.ndarray, control_pre: np.ndarray) -> float:
    """SCM objective: minimize squared prediction error in pre-period."""
    synthetic = control_pre @ weights
    return float(np.sum((treated_pre - synthetic) ** 2))


def _scm_constraint_sum_to_one(weights: np.ndarray) -> float:
    """Constraint: weights sum to 1."""
    return float(np.sum(weights) - 1.0)


def estimate_scm(
    treated_series: pd.Series,
    control_panel: pd.DataFrame,
    treatment_start: int,
    *,
    min_pre_periods: int | None = None,
    min_controls: int | None = None,
    v_weight_matrix: np.ndarray | None = None,
) -> SCMResult:
    """
    Estimate treatment effect using Synthetic Control Method.

    Args:
        treated_series: Full time series for treated unit
        control_panel: Panel with columns=control units, index=time
        treatment_start: Index (0-based) where treatment begins
        min_pre_periods: Minimum pre-treatment periods required
        min_controls: Minimum control units required
        v_weight_matrix: Optional predictor weight matrix (for convex optimization)

    Returns:
        SCMResult with ATE estimate, synthetic control weights, and fit diagnostics
    """
    settings = get_settings()
    min_pre = min_pre_periods or settings.scm_min_pre_periods
    min_ctrl = min_controls or settings.scm_min_controls

    # Split pre/post
    treated_pre = treated_series.iloc[:treatment_start]
    treated_post = treated_series.iloc[treatment_start:]
    control_pre = control_panel.iloc[:treatment_start]
    control_post = control_panel.iloc[treatment_start:]

    # Validate
    valid, reason = _validate_scm_data(treated_pre, control_pre, min_pre, min_ctrl)
    if not valid:
        return SCMResult(
            status=SCMStatus.FALLBACK,
            ate=None,
            ate_ci_lower=None,
            ate_ci_upper=None,
            weights=None,
            pre_fit_rmse=None,
            pre_fit_max_abs_error=None,
            reason=reason,
            metadata={
                "treated_pre_periods": len(treated_pre),
                "control_units": control_pre.shape[1],
                "min_pre_periods": min_pre,
                "min_controls": min_ctrl,
            },
        )

    # Prepare data arrays
    y_pre = treated_pre.values.astype(float)
    x_pre = control_pre.values.astype(float)
    n_controls = x_pre.shape[1]

    # Default V matrix (identity = equal weight on all predictors)
    if v_weight_matrix is None:
        v_weight_matrix = np.eye(n_controls)

    # Optimization: minimize weighted MSE subject to weights >= 0, sum = 1
    initial_weights = np.ones(n_controls) / n_controls

    bounds = [(0, 1) for _ in range(n_controls)]
    constraints = [{"type": "eq", "fun": _scm_constraint_sum_to_one}]

    result = minimize(
        fun=lambda w: _scm_objective(w, y_pre, x_pre),
        x0=initial_weights,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 1000, "ftol": 1e-12},
    )

    if not result.success:
        return SCMResult(
            status=SCMStatus.FALLBACK,
            ate=None,
            ate_ci_lower=None,
            ate_ci_upper=None,
            weights=None,
            pre_fit_rmse=None,
            pre_fit_max_abs_error=None,
            reason=f"optimization failed: {result.message}",
            metadata={"optimizer_message": result.message},
        )

    weights = result.x
    synthetic_pre = x_pre @ weights

    # Pre-fit diagnostics
    pre_residuals = y_pre - synthetic_pre
    pre_fit_rmse = float(np.sqrt(np.mean(pre_residuals**2)))
    pre_fit_max_abs_error = float(np.max(np.abs(pre_residuals)))

    # Post-treatment synthetic control
    synthetic_post = control_post.values.astype(float) @ weights
    treated_post_vals = treated_post.values.astype(float)

    # ATE = average post-treatment gap
    post_gaps = treated_post_vals - synthetic_post
    ate = float(np.mean(post_gaps))

    # Thin M4: placeholder CI (conformal in thickening)
    post_gap_std = float(np.std(post_gaps, ddof=1)) if len(post_gaps) > 1 else 0.1
    ci_width = 1.96 * post_gap_std / np.sqrt(len(post_gaps))
    ate_ci_lower = ate - ci_width
    ate_ci_upper = ate + ci_width

    # Weight dict with control names
    weight_dict = {
        name: float(w)
        for name, w in zip(control_pre.columns, weights, strict=True)
        if w > 1e-6
    }

    return SCMResult(
        status=SCMStatus.OK,
        ate=ate,
        ate_ci_lower=ate_ci_lower,
        ate_ci_upper=ate_ci_upper,
        weights=weight_dict,
        pre_fit_rmse=pre_fit_rmse,
        pre_fit_max_abs_error=pre_fit_max_abs_error,
        reason=None,
        metadata={
            "n_pre_periods": len(y_pre),
            "n_post_periods": len(post_gaps),
            "n_control_units": n_controls,
            "n_active_weights": len(weight_dict),
            "optimizer_success": True,
            "optimizer_nit": result.nit,
        },
    )


def estimate_scm_placebo(
    treated_series: pd.Series,
    control_panel: pd.DataFrame,
    treatment_start: int,
    n_placebos: int = 20,
) -> list[float]:
    """
    Run placebo tests by re-estimating SCM for each control unit as
    "treated" to compute empirical p-value for the observed ATE.

    Returns list of placebo ATEs.
    """
    placebo_ates = []

    for ctrl in control_panel.columns:
        # Use this control as treated, others as controls
        placebo_treated = control_panel[ctrl]
        placebo_controls = control_panel.drop(columns=[ctrl])

        if placebo_controls.shape[1] == 0:
            continue

        result = estimate_scm(placebo_treated, placebo_controls, treatment_start)
        if result.status == SCMStatus.OK and result.ate is not None:
            placebo_ates.append(result.ate)

    return placebo_ates