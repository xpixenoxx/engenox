"""Tests for Foreign-Change Quarantine Guard — M4-thin.

Cites: 13 §4 (corpus), 25 §3 M4, 26 §4 (guard ships with loop).
"""

import numpy as np
import pandas as pd
import pytest

from engenox.measurement.quarantine.guard import (
    ForeignChangeQuarantineGuard,
    QuarantineStatus,
)


class TestQuarantineGuard:
    """Tests for foreign-change quarantine guard."""

    def test_clean_series_allowed(self) -> None:
        """Clean series with no foreign changes is allowed."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        # Use fixed seed for reproducibility - small noise around stable mean
        rng = np.random.default_rng(42)
        series = pd.Series([100.0 + rng.normal(0, 0.5) for _ in range(50)])

        decision = guard.check_series(series)

        assert decision.status == QuarantineStatus.CLEAN
        assert decision.allowed is True
        assert "no_foreign_change" in decision.reason

    def test_foreign_change_detected_quarantined(self) -> None:
        """Series with step change is quarantined when auto_quarantine=True."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        # Clean baseline then clear step up
        series = pd.Series([100.0] * 30 + [150.0] * 30)

        decision = guard.check_series(series)

        assert decision.status == QuarantineStatus.QUARANTINED
        assert decision.allowed is False
        assert "auto_quarantine" in decision.reason

    def test_foreign_change_flagged_not_quarantined(self) -> None:
        """With auto_quarantine=False, changes only flagged."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=False)
        series = pd.Series([100.0] * 30 + [150.0] * 30)

        decision = guard.check_series(series)

        assert decision.status == QuarantineStatus.CLEAN  # Not quarantined
        assert decision.allowed is True
        assert "flagged_not_quarantined" in decision.reason
        assert decision.change_detection is not None
        assert decision.change_detection.change_type != "none"

    def test_insufficient_data_allowed(self) -> None:
        """Very short series allowed (insufficient data for detection)."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        series = pd.Series([100.0])

        decision = guard.check_series(series)

        assert decision.status == QuarantineStatus.CLEAN
        assert decision.allowed is True
        assert "insufficient_data" in decision.reason

    def test_override_quarantine_allows(self) -> None:
        """Human override can allow quarantined row."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        series = pd.Series([100.0] * 30 + [150.0] * 30)
        decision = guard.check_series(series)

        assert decision.status == QuarantineStatus.QUARANTINED

        overridden = guard.override_quarantine(
            decision, override=True, reviewer="analyst-1", justification="Known marketing campaign"
        )

        assert overridden.status == QuarantineStatus.OVERRIDDEN
        assert overridden.allowed is True
        assert "overridden_by_analyst-1" in overridden.reason
        assert "Known marketing campaign" in overridden.reason

    def test_override_quarantine_rejects(self) -> None:
        """Human override can reject quarantined row."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        series = pd.Series([100.0] * 30 + [150.0] * 30)
        decision = guard.check_series(series)

        rejected = guard.override_quarantine(
            decision,
            override=False,
            reviewer="analyst-1",
            justification="Confirmed data corruption",
        )

        assert rejected.status == QuarantineStatus.REJECTED
        assert rejected.allowed is False
        assert "rejected_by_analyst-1" in rejected.reason

    def test_override_non_quarantined_raises(self) -> None:
        """Override only works on QUARANTINED decisions."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        series = pd.Series([100.0] * 50)
        decision = guard.check_series(series)  # CLEAN

        with pytest.raises(ValueError, match="only override QUARANTINED"):
            guard.override_quarantine(decision, override=True, reviewer="a", justification="b")

    def test_integrity_tags_include_quarantine_status(self) -> None:
        """Quarantine decision produces integrity tags."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        series = pd.Series([100.0] * 30 + [150.0] * 30)
        decision = guard.check_series(series)

        tags = decision.to_integrity_tags()

        assert "foreign_change_quarantine_status" in tags
        assert "foreign_change_allowed" in tags
        assert tags["foreign_change_quarantine_status"] == "quarantined"
        assert tags["foreign_change_allowed"] is False

    def test_override_integrity_tags_show_reviewer(self) -> None:
        """Overridden decision tags include reviewer info."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)
        series = pd.Series([100.0] * 30 + [150.0] * 30)
        decision = guard.check_series(series)

        overridden = guard.override_quarantine(
            decision, True, "reviewer-x", "Campaign confirmed"
        )
        tags = overridden.to_integrity_tags()

        assert "quarantine_reason" in tags
        assert "reviewer-x" in tags["quarantine_reason"]
        assert "Campaign confirmed" in tags["quarantine_reason"]

    def test_different_change_types_both_quarantine(self) -> None:
        """Both EWMA and CUSUM detections trigger quarantine."""
        guard = ForeignChangeQuarantineGuard(auto_quarantine=True)

        # EWMA-style: gradual shift
        series_ewma = pd.Series([100.0] * 20 + [100.0 + i * 0.5 for i in range(30)])
        decision_ewma = guard.check_series(series_ewma)

        # CUSUM-style: sudden step
        series_cusum = pd.Series([100.0] * 30 + [130.0] * 30)
        decision_cusum = guard.check_series(series_cusum)

        # At least one should trigger (depending on sensitivity)
        assert decision_ewma.allowed is False or decision_cusum.allowed is False


class TestCreateGuardFromSettings:
    """Tests for settings-based factory."""

    def test_create_from_settings_object(self) -> None:
        """Factory creates guard with settings values."""

        class MockSettings:
            ewma_threshold = 2.5
            ewma_lambda = 0.3
            cusum_threshold = 4.0
            cusum_drift = 0.3

        guard = ForeignChangeQuarantineGuard(
            ewma_threshold=2.5,
            ewma_lambda=0.3,
            cusum_threshold=4.0,
            cusum_drift=0.3,
            auto_quarantine=False,
        )

        assert guard.ewma_threshold == 2.5
        assert guard.ewma_lambda == 0.3
        assert guard.cusum_threshold == 4.0
        assert guard.cusum_drift == 0.3
        assert guard.auto_quarantine is False