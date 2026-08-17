"""Tests for Measurement Estimators — M4-thin."""

import numpy as np
import pandas as pd
import pytest

from engenox.measurement.estimators import (
    DetectorSignal,
    DMLStatus,
    SCMStatus,
    estimate_scm,
    estimate_scm_placebo,
)
from engenox.measurement.estimators.conformal import apply_conformal_correction
from engenox.measurement.estimators.dml import estimate_dml
from engenox.measurement.estimators.foreign_change import detect_foreign_change


class TestSCM:
    """Tests for Synthetic Control Method estimator."""

    def test_basic_scm_estimation(self):
        """Test basic SCM estimation with synthetic data."""
        dates = pd.date_range("2024-01-01", periods=30, freq="D")
        treated = pd.Series(
            np.concatenate([np.linspace(100, 110, 15), np.linspace(120, 130, 15)]),
            index=dates,
        )

        control1 = pd.Series(np.linspace(95, 105, 30), index=dates) + np.random.normal(0, 1, 30)
        control2 = pd.Series(np.linspace(105, 115, 30), index=dates) + np.random.normal(0, 1, 30)

        control_panel = pd.DataFrame({"ctrl1": control1, "ctrl2": control2})

        result = estimate_scm(
            treated_series=treated,
            control_panel=control_panel,
            treatment_start=15,
            min_pre_periods=10,
            min_controls=2,
        )

        assert result.status == SCMStatus.OK
        assert result.ate is not None
        assert result.ate > 5  # Should capture the jump
        assert result.weights is not None
        assert len(result.weights) == 2
        assert abs(sum(result.weights.values()) - 1.0) < 1e-6
        assert result.pre_fit_rmse is not None
        assert result.pre_fit_rmse < 5  # Good pre-fit

    def test_scm_placebo_tests(self):
        """Test placebo test functionality."""
        np.random.seed(42)

        dates = pd.date_range("2024-01-01", periods=30, freq="D")
        treated = pd.Series(np.linspace(100, 110, 30), index=dates)
        control1 = pd.Series(np.linspace(95, 105, 30), index=dates)
        control2 = pd.Series(np.linspace(105, 115, 30), index=dates)
        control3 = pd.Series(np.linspace(90, 100, 30), index=dates)

        control_panel = pd.DataFrame({"ctrl1": control1, "ctrl2": control2, "ctrl3": control3})

        placebo_ates = estimate_scm_placebo(
            treated_series=treated,
            control_panel=control_panel,
            treatment_start=15,
            n_placebos=3,
        )

        assert len(placebo_ates) == 3
        assert all(isinstance(ate, float) for ate in placebo_ates)

    def test_scm_fallback_insufficient_pre_periods(self):
        """Test fallback when pre-periods are insufficient."""
        dates = pd.date_range("2024-01-01", periods=5, freq="D")
        treated = pd.Series(np.linspace(100, 110, 5), index=dates)
        control = pd.DataFrame({"ctrl1": np.linspace(95, 105, 5)}, index=dates)

        result = estimate_scm(
            treated_series=treated,
            control_panel=control,
            treatment_start=3,
            min_pre_periods=10,
        )

        assert result.status == SCMStatus.FALLBACK
        assert "pre-period" in result.reason.lower()

    def test_scm_fallback_no_controls(self):
        """Test fallback when no control units available."""
        dates = pd.date_range("2024-01-01", periods=20, freq="D")
        treated = pd.Series(np.linspace(100, 110, 20), index=dates)
        control = pd.DataFrame({}, index=dates)

        result = estimate_scm(
            treated_series=treated,
            control_panel=control,
            treatment_start=10,
            min_controls=2,
        )

        assert result.status == SCMStatus.FALLBACK
        assert "control" in result.reason.lower() or "donor" in result.reason.lower()

    def test_scm_weights_sum_to_one(self):
        """Test that SCM weights sum to 1."""
        dates = pd.date_range("2024-01-01", periods=20, freq="D")
        treated = pd.Series(np.linspace(100, 110, 20), index=dates)
        control = pd.DataFrame(
            {
                "c1": np.linspace(90, 100, 20),
                "c2": np.linspace(100, 110, 20),
                "c3": np.linspace(110, 120, 20),
            },
            index=dates,
        )

        result = estimate_scm(treated, control, treatment_start=10)
        weights_sum = sum(result.weights.values()) if result.weights else 0
        assert abs(weights_sum - 1.0) < 1e-6


class TestDML:
    """Tests for Double Machine Learning estimator."""

    def test_basic_dml_estimation(self):
        """Test basic DML with synthetic data."""
        np.random.seed(42)
        n = 200

        x = np.random.randn(n, 3)

        prop = 1 / (1 + np.exp(-x[:, 0]))
        d = (np.random.rand(n) < prop).astype(float)

        true_ate = 2.5
        y = 1.0 + true_ate * d + 0.5 * x[:, 1] - 0.3 * x[:, 2] + np.random.randn(n) * 0.5

        result = estimate_dml(
            outcome=y,
            treatment=d,
            covariates=x,
            n_folds=5,
            n_estimators=50,
        )

        assert result.status == DMLStatus.OK
        assert result.lift is not None
        assert abs(result.lift - true_ate) < 1.5  # Generous tolerance for thin RF

    def test_dml_fallback_insufficient_data(self):
        """Test DML fallback with insufficient data."""
        result = estimate_dml(
            outcome=[1, 2, 3],
            treatment=[0, 1, 0],
            covariates=[[1], [2], [3]],
            n_folds=5,
        )

        assert result.status == DMLStatus.FALLBACK
        assert result.lift is None
        assert "at least" in result.reason.lower()

    def test_dml_fallback_no_treatment_variation(self):
        """Test DML fallback when treatment is constant."""
        result = estimate_dml(
            outcome=[1, 2, 3, 4, 5],
            treatment=[0, 0, 0, 0, 0],
            covariates=[[1], [2], [3], [4], [5]],
            n_folds=2,
        )

        assert result.status == DMLStatus.FALLBACK


class TestForeignChangeDetector:
    """Tests for EWMA + CUSUM foreign change detection."""

    def test_clear_signal(self):
        """Test detection on truly stable series (no noise)."""
        # Truly constant series - no noise, no drift
        series = pd.Series([100.0] * 50)

        result = detect_foreign_change(series, ewma_threshold=3.0, cusum_threshold=5.0)

        assert result.combined_signal == DetectorSignal.CLEAR
        assert result.reason is None

    def test_ewma_alert_on_shift(self):
        """Test EWMA detects level shift."""
        np.random.seed(42)
        stable = [100 + np.random.normal(0, 0.5) for _ in range(30)]
        shifted = [120 + np.random.normal(0, 0.5) for _ in range(20)]
        series = pd.Series(stable + shifted)

        result = detect_foreign_change(series, ewma_threshold=2.0, cusum_threshold=5.0)

        assert result.combined_signal in (DetectorSignal.WARNING, DetectorSignal.ALERT)

    def test_cusum_alert_on_drift(self):
        """Test CUSUM detects gradual drift."""
        np.random.seed(42)
        drift = [100 + i * 0.5 + np.random.normal(0, 0.5) for i in range(50)]
        series = pd.Series(drift)

        result = detect_foreign_change(series, ewma_threshold=3.0, cusum_threshold=3.0, cusum_drift=0.3)

        assert result.combined_signal in (DetectorSignal.WARNING, DetectorSignal.ALERT)
        assert result.cusum.signal in (DetectorSignal.WARNING, DetectorSignal.ALERT)


class TestConformalCorrection:
    """Tests for placeholder conformal correction."""

    def test_placeholder_conformal_wide_intervals(self):
        """Test that placeholder conformal gives wide intervals."""
        result = apply_conformal_correction(
            estimate=10.0,
            se=0.5,
            alpha=0.1,
            n_calibration=0,
        )

        assert result.method == "placeholder-se-corrected"
        assert result.lower < 10.0
        assert result.upper > 10.0
        # With n_cal=0, correction factor is 2.5
        expected_half_width = 1.96 * 0.5 * 2.5
        actual_half_width = (result.upper - result.lower) / 2
        assert abs(actual_half_width - expected_half_width) < 0.1

    def test_conformal_with_adequate_calibration(self):
        """Test conformal narrows with calibration data."""
        result = apply_conformal_correction(
            estimate=10.0,
            se=0.5,
            alpha=0.1,
            n_calibration=100,
        )

        assert result.method == "placeholder-se-corrected"
        # With adequate calibration, correction factor ~1.0
        expected_half_width = 1.96 * 0.5
        actual_half_width = (result.upper - result.lower) / 2
        assert abs(actual_half_width - expected_half_width) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v"])