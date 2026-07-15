"""Tests for Conformal Calibrator — M4-thin placeholder.

Cites: 13 §4 (corpus), 25 §3 M4, 26 §4 (candor floor).
"""

from dataclasses import FrozenInstanceError

import numpy as np
import pytest

from engenox.measurement.estimators.conformal import (
    ConformalInterval,
    apply_conformal_correction,
    combine_estimators_conformal,
)


class TestConformalCalibrator:
    """Tests for placeholder conformal calibration."""

    def test_apply_conformal_basic(self) -> None:
        """Apply conformal correction to point estimate + SE."""
        interval = apply_conformal_correction(
            estimate=5.0,
            se=1.0,
            alpha=0.1,
            n_calibration=30,
        )

        assert interval.lower is not None
        assert interval.upper is not None
        assert interval.lower < 5.0 < interval.upper
        assert interval.alpha == 0.1
        assert interval.n_calibration == 30
        assert interval.method == "placeholder-se-corrected"

    def test_apply_conformal_zero_se_fallback(self) -> None:
        """Zero SE falls back to placeholder asymptotic."""
        interval = apply_conformal_correction(
            estimate=5.0,
            se=0.0,
            alpha=0.1,
            n_calibration=100,
        )

        assert interval.method == "placeholder-asymptotic"
        assert "THIN M4 PLACEHOLDER" in interval.metadata["note"]

    def test_apply_conformal_nan_se_fallback(self) -> None:
        """NaN SE falls back to placeholder."""
        interval = apply_conformal_correction(
            estimate=5.0,
            se=np.nan,
            alpha=0.1,
            n_calibration=100,
        )

        assert interval.method == "placeholder-asymptotic"

    def test_placeholder_widens_for_small_calibration(self) -> None:
        """Small calibration set gets wider interval (conservative)."""
        interval_small = apply_conformal_correction(5.0, 1.0, 0.1, n_calibration=5)
        interval_large = apply_conformal_correction(5.0, 1.0, 0.1, n_calibration=100)

        assert interval_small.upper is not None
        assert interval_small.lower is not None
        assert interval_large.upper is not None
        assert interval_large.lower is not None
        width_small = interval_small.upper - interval_small.lower
        width_large = interval_large.upper - interval_large.lower

        assert width_small >= width_large

    def test_conformal_metadata_contains_correction_factor(self) -> None:
        """Metadata includes correction factor for transparency."""
        interval = apply_conformal_correction(5.0, 1.0, 0.1, n_calibration=10)

        assert "correction_factor" in interval.metadata
        assert interval.metadata["correction_factor"] >= 1.0
        assert "THIN M4 PLACEHOLDER" in interval.metadata["note"]

    def test_combine_estimators_both_available(self) -> None:
        """Combining SCM + DML produces both + combined interval."""

        class MockResult:
            def __init__(
                self,
                ate: float | None = 3.0,
                pre_fit_rmse: float | None = 0.8,
                ate_se: float | None = 0.5,
                n_calibration: int = 30,
            ) -> None:
                self.ate = ate
                self.pre_fit_rmse = pre_fit_rmse
                self.ate_se = ate_se
                self.n_calibration = n_calibration

        scm = MockResult()
        dml = MockResult(ate=2.5, ate_se=0.4, n_calibration=25)

        intervals = combine_estimators_conformal(scm, dml)

        assert "scm" in intervals
        assert "dml" in intervals
        assert "combined" in intervals
        assert intervals["combined"].lower is not None
        assert intervals["combined"].upper is not None
        assert intervals["combined"].lower < intervals["combined"].upper

    def test_combine_estimators_one_missing(self) -> None:
        """Combining with one missing estimator skips missing."""

        class MockResult:
            def __init__(
                self,
                ate: float | None = 3.0,
                pre_fit_rmse: float | None = 0.8,
                ate_se: float | None = 0.5,
                n_calibration: int = 30,
            ) -> None:
                self.ate = ate
                self.pre_fit_rmse = pre_fit_rmse
                self.ate_se = ate_se
                self.n_calibration = n_calibration

        scm = MockResult()
        dml = MockResult(ate=None)

        intervals = combine_estimators_conformal(scm, dml)

        assert "scm" in intervals
        assert "dml" not in intervals
        assert "combined" not in intervals

    def test_combine_estimators_none_available(self) -> None:
        """Combining with no valid estimators returns empty dict."""

        class MockResult:
            ate: float | None = None
            pre_fit_rmse: float | None = 0.8
            ate_se: float | None = 0.5
            n_calibration: int = 30

        scm = MockResult()
        dml = MockResult()

        intervals = combine_estimators_conformal(scm, dml)

        assert intervals == {}

    def test_combine_estimators_uses_scpm_rmse_as_se(self) -> None:
        """For SCM, pre_fit_rmse used as SE proxy when no direct SE."""

        class MockResult:
            ate: float | None = 3.0
            pre_fit_rmse: float | None = 0.8
            ate_se: float | None = None  # Required by EstimatorResult protocol
            n_calibration: int = 30

        scm = MockResult()
        intervals = combine_estimators_conformal(scm, None)

        assert "scm" in intervals
        # The interval should be based on the pre_fit_rmse proxy
        assert intervals["scm"].lower is not None
        assert intervals["scm"].upper is not None
        assert intervals["scm"].lower < 3.0 < intervals["scm"].upper


class TestConformalInterval:
    """Tests for ConformalInterval dataclass."""

    def test_conformal_interval_frozen(self) -> None:
        """ConformalInterval is frozen (immutable)."""
        interval = ConformalInterval(
            lower=4.0,
            upper=6.0,
            alpha=0.1,
            n_calibration=30,
            method="test",
            metadata={},
        )
        with pytest.raises(FrozenInstanceError):
            interval.lower = 3.0