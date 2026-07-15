"""Tests for DML Estimator — M4-thin.

Cites: 13 §4 (corpus), 25 §3 M4, 26 §2.4 (integrity tags).
"""

from dataclasses import FrozenInstanceError

import numpy as np
import pytest

from engenox.measurement.estimators.dml import (
    DMLResult,
    DMLStatus,
    estimate_dml,
)


class TestDMLEstimator:
    """Tests for Double Machine Learning estimation."""

    def test_dml_basic_estimation_ok(self) -> None:
        """DML produces OK result with valid binary treatment data."""
        np.random.seed(42)
        n = 200

        # Covariates
        X = np.random.randn(n, 5)

        # Treatment assignment depends on X (confounding)
        propensity = 1 / (1 + np.exp(-(X[:, 0] - 0.5 * X[:, 1])))
        D = np.random.binomial(1, propensity)

        # Outcome depends on X and treatment effect = 2.0
        true_ate = 2.0
        Y = 1 + 2 * X[:, 0] - 1.5 * X[:, 1] + true_ate * D + np.random.randn(n) * 0.5

        result = estimate_dml(
            outcome=Y,
            treatment=D,
            covariates=X,
            n_folds=5,
            n_estimators=50,
            max_depth=5,
            random_state=42,
        )

        assert result.status == DMLStatus.OK
        assert result.lift is not None
        assert result.lift_se is not None
        # Should recover effect close to 2.0
        assert abs(result.lift - true_ate) < 0.5
        assert result.lift_ci_lower is not None
        assert result.lift_ci_upper is not None
        assert result.lift_ci_lower < result.lift < result.lift_ci_upper

    def test_dml_fallback_binary_treatment_missing(self) -> None:
        """DML returns FALLBACK when treatment not binary."""
        Y = np.random.randn(50)
        D = np.random.choice([0, 1, 2], 50)  # Three values
        X = np.random.randn(50, 3)

        result = estimate_dml(Y, D, X)

        assert result.status == DMLStatus.FALLBACK
        assert result.lift is None
        assert result.reason is not None
        assert "binary" in result.reason.lower()

    def test_dml_fallback_nan_inputs(self) -> None:
        """DML returns FALLBACK when inputs contain NaN."""
        Y = np.array([1.0, 2.0, 3.0, np.nan, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0])
        D = np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
        X = np.random.randn(10, 2)

        result = estimate_dml(Y, D, X)

        assert result.status == DMLStatus.FALLBACK
        assert result.reason is not None
        assert "nan" in result.reason.lower()

    def test_dml_fallback_length_mismatch(self) -> None:
        """DML returns FALLBACK when Y, D, X lengths differ."""
        Y = np.random.randn(10)
        D = np.random.randint(0, 2, 9)  # Wrong length
        X = np.random.randn(10, 2)

        result = estimate_dml(Y, D, X)

        assert result.status == DMLStatus.FALLBACK
        assert result.reason is not None
        assert "same length" in result.reason.lower()

    def test_dml_fallback_insufficient_observations(self) -> None:
        """DML returns FALLBACK when insufficient obs for folds."""
        Y = np.random.randn(5)
        D = np.random.randint(0, 2, 5)
        X = np.random.randn(5, 2)

        result = estimate_dml(Y, D, X, n_folds=5)

        assert result.status == DMLStatus.FALLBACK
        assert result.reason is not None
        assert "at least" in result.reason.lower()

    def test_dml_fallback_all_treated_or_control(self) -> None:
        """DML returns FALLBACK when treatment has no variation."""
        Y = np.random.randn(50)
        D = np.zeros(50)  # All control
        X = np.random.randn(50, 3)

        result = estimate_dml(Y, D, X)

        assert result.status == DMLStatus.FALLBACK
        assert result.reason is not None
        assert "both treated and control" in result.reason.lower()

    def test_dml_cross_fitting_cross_validates(self) -> None:
        """DML cross-fitting uses all folds."""
        np.random.seed(123)
        n = 100
        X = np.random.randn(n, 4)
        D = np.random.randint(0, 2, n)
        Y = 2 * D + X[:, 0] + np.random.randn(n) * 0.5

        result = estimate_dml(Y, D, X, n_folds=5, random_state=42)

        assert result.status == DMLStatus.OK
        assert len(result.metadata["fold_ates"]) == 5
        assert result.metadata["n_folds"] == 5

    def test_dml_integrity_tags_structure(self) -> None:
        """DML result converts to integrity tags."""
        np.random.seed(42)
        n = 100
        X = np.random.randn(n, 3)
        D = np.random.randint(0, 2, n)
        Y = 1.5 * D + X[:, 0] + np.random.randn(n) * 0.3

        result = estimate_dml(Y, D, X, random_state=42)
        tags = result.to_integrity_tags()

        assert tags["estimator"] == "dml"
        assert tags["status"] == result.status.value
        if result.lift is not None:
            assert "lift" in tags
            assert "lift_se" in tags
            assert "lift_ci_lower" in tags
            assert "lift_ci_upper" in tags


class TestDMLResult:
    """Tests for DMLResult dataclass."""

    def test_dml_result_frozen(self) -> None:
        """DMLResult is frozen (immutable)."""
        result = DMLResult(
            status=DMLStatus.OK,
            lift=1.5,
            lift_se=0.3,
            lift_ci_lower=0.9,
            lift_ci_upper=2.1,
            reason=None,
            metadata={"n": 100},
        )
        with pytest.raises(FrozenInstanceError):
            result.lift = 2.0