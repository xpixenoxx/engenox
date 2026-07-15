"""Foreign-Change Quarantine Guard — M4-thin.

Implements the safety-net guard that flags measurement rows when foreign
changes (EWMA/CUSUM breaches) are detected. Quarantined rows are excluded
from the main corpus write path and routed to a review queue.

Per 26 §4: the foreign-change detector ships WITH the loop, not after.
The quarantine guard ensures detected foreign changes don't silently
contaminate the causal corpus — they require human review or explicit override.

References: 13 §4 (corpus integrity), 26 §2.4 (foreign_change_status tag),
25 §3 M4 (foreign-change-quarantine guard).
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Protocol

import pandas as pd

from engenox.measurement.detectors.foreign_change import (
    ChangeDetectionResult,
    ChangeType,
    detect_foreign_changes,
)


class QuarantineSettingsProtocol(Protocol):
    """Protocol for settings object with quarantine configuration."""
    ewma_threshold: float
    ewma_lambda: float
    cusum_threshold: float
    cusum_drift: float


class QuarantineStatus(StrEnum):
    """Quarantine disposition for a measurement row."""

    CLEAN = "clean"              # No foreign change detected
    QUARANTINED = "quarantined"  # Foreign change detected, row held
    OVERRIDDEN = "overridden"    # Human approved despite foreign change
    REJECTED = "rejected"        # Human rejected (not written to corpus)


@dataclass(frozen=True, slots=True)
class QuarantineDecision:
    """Result of quarantine guard check."""

    status: QuarantineStatus
    change_detection: ChangeDetectionResult | None
    allowed: bool
    reason: str
    metadata: dict[str, Any]

    def to_integrity_tags(self) -> dict[str, Any]:
        """Convert decision to integrity tags for corpus row."""
        tags: dict[str, Any] = {
            "foreign_change_quarantine_status": self.status.value,
            "foreign_change_allowed": self.allowed,
        }
        if self.change_detection:
            tags.update(self.change_detection.to_integrity_tags())
        if self.reason:
            tags["quarantine_reason"] = self.reason
        return tags


class ForeignChangeQuarantineGuard:
    """
    Quarantine guard for foreign changes in measurement pipeline.

    When EWMA or CUSUM detects a foreign change in the outcome series,
    the affected measurement window is quarantined:
    - Row not written to main CIO corpus
    - Row written to quarantine table with foreign_change tags
    - Requires human review or explicit override to enter corpus
    """

    def __init__(
        self,
        *,
        ewma_threshold: float = 3.0,
        ewma_lambda: float = 0.2,
        cusum_threshold: float = 5.0,
        cusum_drift: float = 0.5,
        auto_quarantine: bool = True,
    ) -> None:
        """
        Initialize quarantine guard.

        Args:
            ewma_threshold: EWMA control limit multiplier (default 3 sigma)
            ewma_lambda: EWMA smoothing parameter
            cusum_threshold: CUSUM threshold
            cusum_drift: CUSUM drift parameter
            auto_quarantine: If True, auto-quarantine on detection; if False, only flag
        """
        self.ewma_threshold = ewma_threshold
        self.ewma_lambda = ewma_lambda
        self.cusum_threshold = cusum_threshold
        self.cusum_drift = cusum_drift
        self.auto_quarantine = auto_quarantine

    def check_series(self, series: pd.Series) -> QuarantineDecision:
        """
        Check a metric time series for foreign changes.

        Args:
            series: Time series of metric values (e.g., daily impressions)

        Returns:
            QuarantineDecision with status and integrity tags
        """
        if len(series) < 2:
            return QuarantineDecision(
                status=QuarantineStatus.CLEAN,
                change_detection=None,
                allowed=True,
                reason="insufficient_data",
                metadata={"n_points": len(series)},
            )

        # Run foreign change detection
        change_result = detect_foreign_changes(
            series,
            ewma_lambda=self.ewma_lambda,
            ewma_threshold=self.ewma_threshold,
            cusum_threshold=self.cusum_threshold,
            cusum_drift=self.cusum_drift,
        )

        # Determine quarantine status
        if change_result.change_type == ChangeType.NONE:
            return QuarantineDecision(
                status=QuarantineStatus.CLEAN,
                change_detection=change_result,
                allowed=True,
                reason="no_foreign_change_detected",
                metadata={"change_type": change_result.change_type.value},
            )

        # Foreign change detected
        if self.auto_quarantine:
            return QuarantineDecision(
                status=QuarantineStatus.QUARANTINED,
                change_detection=change_result,
                allowed=False,
                reason=f"auto_quarantine: {change_result.change_type.value} triggered",
                metadata={
                    "change_type": change_result.change_type.value,
                    "ewma_triggered": change_result.ewma_triggered,
                    "cusum_triggered": change_result.cusum_triggered,
                },
            )
        else:
            # Flag but allow (for observability without blocking)
            return QuarantineDecision(
                status=QuarantineStatus.CLEAN,  # Not quarantined, just flagged
                change_detection=change_result,
                allowed=True,
                reason=f"flagged_not_quarantined: {change_result.change_type.value} triggered",
                metadata={
                    "change_type": change_result.change_type.value,
                    "ewma_triggered": change_result.ewma_triggered,
                    "cusum_triggered": change_result.cusum_triggered,
                },
            )

    def override_quarantine(
        self,
        decision: QuarantineDecision,
        override: bool,
        reviewer: str,
        justification: str,
    ) -> QuarantineDecision:
        """
        Override a quarantine decision (human review).

        Args:
            decision: Original quarantine decision
            override: True to allow despite foreign change, False to reject
            reviewer: Identity of reviewer
            justification: Reason for override

        Returns:
            Updated QuarantineDecision with OVERRIDDEN or REJECTED status
        """
        if decision.status != QuarantineStatus.QUARANTINED:
            raise ValueError("Can only override QUARANTINED decisions")

        if override:
            return QuarantineDecision(
                status=QuarantineStatus.OVERRIDDEN,
                change_detection=decision.change_detection,
                allowed=True,
                reason=f"overridden_by_{reviewer}: {justification}",
                metadata={
                    **decision.metadata,
                    "overridden_by": reviewer,
                    "justification": justification,
                    "overridden_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
                },
            )
        else:
            return QuarantineDecision(
                status=QuarantineStatus.REJECTED,
                change_detection=decision.change_detection,
                allowed=False,
                reason=f"rejected_by_{reviewer}: {justification}",
                metadata={
                    **decision.metadata,
                    "rejected_by": reviewer,
                    "justification": justification,
                    "rejected_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
                },
            )


def create_quarantine_guard_from_settings(
    settings: QuarantineSettingsProtocol, auto_quarantine: bool = True
) -> ForeignChangeQuarantineGuard:
    """
    Factory to create quarantine guard from settings object.

    Args:
        settings: Configuration object with ewma/cusum parameters
        auto_quarantine: Whether to enforce quarantine on detection

    Returns:
        Configured ForeignChangeQuarantineGuard instance
    """
    return ForeignChangeQuarantineGuard(
        ewma_threshold=getattr(settings, "ewma_threshold", 3.0),
        ewma_lambda=getattr(settings, "ewma_lambda", 0.2),
        cusum_threshold=getattr(settings, "cusum_threshold", 5.0),
        cusum_drift=getattr(settings, "cusum_drift", 0.5),
        auto_quarantine=auto_quarantine,
    )