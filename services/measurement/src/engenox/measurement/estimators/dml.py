"""Double Machine Learning (DML) Estimator — M4-thin.

Cross-fitting DML for ATE estimation with RandomForest nuisance
parameters. Thin implementation — real grf/CATE and conformal
calibration deferred to thickening.

References: 13 §4 (corpus), 11 §3 seam 5 (Abduce from DML).
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import KFold

from engenox.measurement.config.settings import get_settings


class DMLStatus(StrEnum):
    """DML estimation status."""

    OK = "ok"
    FALLBACK = "fallback"


@dataclass(frozen=True, slots=True)
class DMLResult:
    """Result of DML estimation."""

    status: DMLStatus
    lift: float | None
    lift_se: float | None
    lift_ci_lower: float | None
    lift_ci_upper: float | None
    reason: str | None
    metadata: dict[str, Any]

    def to_integrity_tags(self) -> dict[str, Any]:
        """Convert to integrity tags for CIO corpus."""
        tags: dict[str, Any] = {
            "estimator": "dml",
            "status": self.status.value,
        }
        if self.lift is not None:
            tags["lift"] = self.lift
            if self.lift_se is not None:
                tags["lift_se"] = self.lift_se
            if self.lift_ci_lower is not None:
                tags["lift_ci_lower"] = self.lift_ci_lower
                tags["lift_ci_upper"] = self.lift_ci_upper
        if self.reason is not None:
            tags["fallback_reason"] = self.reason
        return tags


def _validate_dml_inputs(
    y: np.ndarray,
    d: np.ndarray,
    x: np.ndarray,
    n_folds: int,
) -> tuple[bool, str]:
    """Validate DML input arrays."""
    n = len(y)
    if n != len(d) or n != len(x):
        return False, "Y, D, X must have same length"
    if n < n_folds * 2:
        return False, f"Need at least {n_folds * 2} observations for {n_folds}-fold cross-fitting"
    if np.isnan(y).any() or np.isnan(d).any() or np.isnan(x).any():
        return False, "Input arrays contain NaN"
    if len(np.unique(d)) < 2:
        return False, "Treatment must have both treated and control units"
    if np.any((d != 0) & (d != 1)):
        return False, "Treatment must be binary (0 or 1)"
    return True, ""


def _cross_fit_nuisance(
    y: np.ndarray,
    d: np.ndarray,
    x: np.ndarray,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
    n_estimators: int,
    max_depth: int | None,
    random_state: int,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Estimate nuisance functions on train fold, predict on test fold.

    Returns (g_hat, m_hat) on test fold.
    """
    y_train = y[train_idx]
    d_train = d[train_idx]
    x_train = x[train_idx]
    x_test = x[test_idx]

    # g(x) = E[Y|X]
    g_model = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_state,
        n_jobs=-1,
    )
    g_model.fit(x_train, y_train)
    g_hat = g_model.predict(x_test)

    # m(x) = E[D|X] (propensity)
    m_model = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_state + 1,
        n_jobs=-1,
    )
    m_model.fit(x_train, d_train)
    m_hat = m_model.predict(x_test)

    # Clip propensity to avoid division by zero
    m_hat = np.clip(m_hat, 0.01, 0.99)

    return g_hat, m_hat


def estimate_dml(
    outcome: pd.Series | np.ndarray | list[float],
    treatment: pd.Series | np.ndarray | list[float],
    covariates: pd.DataFrame | np.ndarray | list[list[float]],
    *,
    n_folds: int | None = None,
    n_estimators: int = 100,
    max_depth: int | None = 10,
    random_state: int = 42,
) -> DMLResult:
    """
    Estimate Average Treatment Effect using Double Machine Learning.

    Uses cross-fitting with RandomForest for g(x)=E[Y|X] and m(x)=E[D|X].

    Args:
        outcome: Outcome variable Y (n,)
        treatment: Binary treatment D ∈ {0,1} (n,)
        covariates: Covariate matrix X (n, p)
        n_folds: Cross-fitting folds (default from settings)
        n_estimators: RF trees
        max_depth: RF max depth
        random_state: Random seed

    Returns:
        DMLResult with ATE estimate, SE, CI, and diagnostics.
    """
    settings = get_settings()
    folds = n_folds or settings.dml_n_folds

    # Convert to arrays
    y = np.asarray(outcome, dtype=float)
    d = np.asarray(treatment, dtype=float)
    x = np.asarray(covariates, dtype=float)

    # Validate
    valid, reason = _validate_dml_inputs(y, d, x, folds)
    if not valid:
        return DMLResult(
            status=DMLStatus.FALLBACK,
            lift=None,
            lift_se=None,
            lift_ci_lower=None,
            lift_ci_upper=None,
            reason=f"Invalid DML input: {reason}",
            metadata={"n_obs": len(y), "n_folds": folds},
        )

    n = len(y)

    # Cross-fitting
    kf = KFold(n_splits=folds, shuffle=True, random_state=random_state)

    thetas = []
    sigmas = []

    for train_idx, test_idx in kf.split(x):
        g_hat, m_hat = _cross_fit_nuisance(
            y, d, x, train_idx, test_idx,
            n_estimators, max_depth, random_state
        )

        y_test = y[test_idx]
        d_test = d[test_idx]

        # Orthogonal moment: E[(Y - g(X)) * (D - m(X)) / Var(D|X)]
        residual_y = y_test - g_hat
        residual_d = d_test - m_hat

        # ATE via orthogonal score
        # θ = E[((Y - g) * (D - m))] / E[(D - m)^2]
        num = np.mean(residual_y * residual_d)
        den = np.mean(residual_d**2)

        if abs(den) < 1e-10:
            continue  # Skip fold with near-zero variance

        theta_fold = num / den
        thetas.append(theta_fold)

        # Fold-level SE via influence function
        # IF = ((Y - g) * (D - m) - θ * (D - m)^2) / den
        if_vals = (residual_y * residual_d - theta_fold * residual_d**2) / den
        sigma_fold = np.std(if_vals, ddof=1) / np.sqrt(len(test_idx))
        sigmas.append(sigma_fold)

    if not thetas:
        return DMLResult(
            status=DMLStatus.FALLBACK,
            lift=None,
            lift_se=None,
            lift_ci_lower=None,
            lift_ci_upper=None,
            reason="All cross-fitting folds failed",
            metadata={"n_obs": n, "n_folds": folds},
        )

    # Aggregate
    ate = float(np.mean(thetas))
    ate_se = float(np.sqrt(np.mean(np.array(sigmas)**2)))

    # Thin M4: simple asymptotic CI (conformal calibrator in thickening)
    ci_width = 1.96 * ate_se
    ci_lower = ate - ci_width
    ci_upper = ate + ci_width

    return DMLResult(
        status=DMLStatus.OK,
        lift=ate,
        lift_se=ate_se,
        lift_ci_lower=ci_lower,
        lift_ci_upper=ci_upper,
        reason=None,
        metadata={
            "n_obs": n,
            "n_treated": int(np.sum(d)),
            "n_control": int(np.sum(1 - d)),
            "n_folds": folds,
            "fold_ates": thetas,
            "fold_ses": sigmas,
            "n_estimators": n_estimators,
            "max_depth": max_depth,
        },
    )