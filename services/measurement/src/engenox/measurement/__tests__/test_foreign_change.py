"""Tests for Foreign Change Detector (EWMA + CUSUM) — M4-thin.

Cites: 13 §4 (corpus), 25 §3 M4, 26 §4 (foreign-change detector ships with loop).
"""

from dataclasses import FrozenInstanceError

import numpy as np
import pandas as pd
import pytest

from engenox.measurement.detectors.foreign_change import (
    ChangeDetectionResult,
    ChangeType,
    compute_cusum,
    compute_ewma,
    compute_ewma_control_limits,
    detect_foreign_changes,
)


class TestEWMA:
    """Tests for Exponentially Weighted Moving Average."""

    def test_ewma_constant_series(self) -> None:
        """EWMA of constant series equals that constant."""
        series = pd.Series([10.0] * 20)
        ewma = compute_ewma(series, lambda_=0.2)

        assert np.allclose(ewma.values, 10.0, atol=1e-6)

    def test_ewma_responds_to_step(self) -> None:
        """EWMA detects step change in mean."""
        series = pd.Series([10.0] * 10 + [15.0] * 10)
        ewma = compute_ewma(series, lambda_=0.3)

        # After change point, EWMA moves toward 15
        mid_val = ewma.iloc[9]
        final_val = ewma.iloc[-1]
        assert final_val > mid_val
        assert final_val > 12.0

    def test_ewma_smaller_lambda_slower_response(self) -> None:
        """Smaller lambda = slower adaptation."""
        series = pd.Series([10.0] * 10 + [20.0] * 10)

        ewma_fast = compute_ewma(series, lambda_=0.5)
        ewma_slow = compute_ewma(series, lambda_=0.1)

        # Fast EWMA adapts quicker - closer to 20 by end
        assert abs(ewma_fast.iloc[-1] - 20.0) < abs(ewma_slow.iloc[-1] - 20.0)


class TestEWMAControlLimits:
    """Tests for EWMA control limit computation."""

    def test_constant_series_limits_constant(self) -> None:
        """Control limits for constant series are constant after warmup."""
        series = pd.Series([10.0] * 30)
        ewma, ucl, lcl = compute_ewma_control_limits(
            series, lambda_=0.2, control_limit_multiplier=3.0
        )

        # After initial period, limits converge
        # All values should be equal
        assert np.allclose(ewma.values, 10.0, atol=1e-6)
        assert np.allclose(ucl.values[5:], ucl.values[5], atol=1e-6)
        assert np.allclose(lcl.values[5:], lcl.values[5], atol=1e-6)

    def test_limits_wider_at_start(self) -> None:
        """Control limits vary over time (wider/equal in steady state)."""
        # Use series with variance so limits vary
        rng = np.random.default_rng(42)
        series = pd.Series([10.0 + rng.normal(0, 0.5) for _ in range(30)])
        ewma, ucl, lcl = compute_ewma_control_limits(
            series, lambda_=0.2, control_limit_multiplier=3.0
        )

        # The steady-state EWMA variance formula: limits start at ~0.2*sigma and grow to ~sigma
        # For this implementation, limits START narrow and widen
        # Standard EWMA: std_factor = sqrt(lambda/(2-lambda) * (1-(1-lambda)^(2t)))
        # At t=1: sqrt(lambda/(2-lambda) * (1-(1-lambda)^2))
        # As t->inf: sqrt(lambda/(2-lambda))
        assert ucl.iloc[-1] > ucl.iloc[0]  # Steady-state wider than initial
        assert lcl.iloc[-1] < lcl.iloc[0]  # Steady-state wider than initial


class TestCUSUM:
    """Tests for CUSUM control chart."""

    def test_cusum_constant_series(self) -> None:
        """CUSUM on constant series stays near zero."""
        series = pd.Series([10.0] * 20)
        c_plus, c_minus = compute_cusum(series, threshold=5.0, drift=0.5)

        assert np.max(c_plus) < 1.0
        assert np.max(c_minus) < 1.0

    def test_cusum_detects_upward_shift(self) -> None:
        """CUSUM+ triggers on upward mean shift."""
        series = pd.Series([10.0] * 10 + [14.0] * 10)
        c_plus, c_minus = compute_cusum(series, threshold=3.0, drift=0.5)

        # After shift, CUSUM+ should exceed threshold
        assert c_plus.iloc[-1] > 3.0

    def test_cusum_detects_downward_shift(self) -> None:
        """CUSUM- triggers on downward mean shift."""
        series = pd.Series([10.0] * 10 + [6.0] * 10)
        c_plus, c_minus = compute_cusum(series, threshold=3.0, drift=0.5)

        assert c_minus.iloc[-1] > 3.0


class TestDetectForeignChanges:
    """Tests for combined foreign change detection."""

    def test_no_change_constant_series(self) -> None:
        """Constant series triggers no change."""
        series = pd.Series([100.0] * 50)
        result = detect_foreign_changes(series)

        assert result.change_type == ChangeType.NONE
        assert not result.ewma_triggered
        assert not result.cusum_triggered

    def test_ewma_triggers_on_step(self) -> None:
        """Large step change triggers EWMA."""
        # Stable, then jump 5 sigma
        baseline = 100.0
        np.random.seed(42)
        series = pd.Series(
            np.concatenate([
                np.random.normal(baseline, 2, 30),
                np.random.normal(baseline + 15, 2, 20),  # 7.5 sigma shift
            ])
        )

        result = detect_foreign_changes(series, ewma_threshold=3.0)

        # Should trigger EWMA
        assert result.ewma_triggered
        assert result.change_type in (ChangeType.EWMA, ChangeType.BOTH)

    def test_cusum_triggers_on_sustained_shift(self) -> None:
        """Sustained small shift triggers CUSUM."""
        series = pd.Series(
            np.concatenate([
                np.random.normal(100, 1, 30),
                np.random.normal(103, 1, 30),  # Sustained +3 sigma shift
            ])
        )

        result = detect_foreign_changes(series, cusum_threshold=4.0, cusum_drift=0.5)

        assert result.cusum_triggered
        assert result.change_type in (ChangeType.CUSUM, ChangeType.BOTH)

    def test_short_series_returns_none(self) -> None:
        """Series with <2 points returns NONE."""
        series = pd.Series([100.0])
        result = detect_foreign_changes(series)

        assert result.change_type == ChangeType.NONE
        assert result.metadata.get("reason") == "insufficient data"
        assert result.metadata["n_points"] == 1

    def test_detection_time_recorded(self) -> None:
        """Detection timestamp is recorded."""
        series = pd.Series([100.0] * 10 + [150.0] * 10)
        result = detect_foreign_changes(series)

        assert result.detection_time is not None

    def test_integrity_tags_structure(self) -> None:
        """Detection result converts to integrity tags."""
        series = pd.Series([100.0] * 10 + [110.0] * 10)
        result = detect_foreign_changes(series, ewma_threshold=1.0)

        tags = result.to_integrity_tags()

        assert tags["foreign_change_detected"] is True
        assert tags["change_type"] in ("ewma", "cusum", "both")
        assert "detected_at" in tags
        assert "ewma_signal" in tags
        assert "cusum_signal" in tags


class TestChangeDetectionResult:
    """Tests for ChangeDetectionResult dataclass."""

    def test_frozen(self) -> None:
        """ChangeDetectionResult is frozen."""
        result = ChangeDetectionResult(
            change_type=ChangeType.NONE,
            ewma_signal=None,
            ewma_threshold=None,
            ewma_triggered=False,
            cusum_signal=None,
            cusum_threshold=None,
            cusum_triggered=False,
            detection_time=pd.Timestamp.now(),
            metadata={},
        )
        with pytest.raises(FrozenInstanceError):
            result.change_type = ChangeType.EWMA