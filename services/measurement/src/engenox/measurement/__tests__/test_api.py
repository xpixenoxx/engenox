"""Tests for Measurement Service API Routes — M4-thin.

Cites: 25 §3 M4, 13 §4 (corpus API), 26 §4 (candor endpoints).
"""

from fastapi.testclient import TestClient

from engenox.measurement.api.main import app

# Test headers for F1 (tenant from header) and F2 (idempotency key)
TEST_HEADERS = {
    "x-tenant-id": "test-tenant",
    "idempotency-key": "test-idem-key-123",
}


class TestHealthEndpoint:
    """Tests for /v1/health endpoint."""

    def test_health_returns_ok(self) -> None:
        """Health endpoint returns healthy status."""
        with TestClient(app) as client:
            response = client.get("/v1/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "measurement"
        assert "service_version" in data


class TestSCMEstimation:
    """Tests for POST /v1/estimate/scm."""

    def test_scm_basic_request(self) -> None:
        """Basic SCM request returns structured response."""
        request = {
            "treated_series": [
                {"timestamp": "2026-01-01T00:00:00Z", "value": 100.0},
                {"timestamp": "2026-01-02T00:00:00Z", "value": 101.0},
                {"timestamp": "2026-01-03T00:00:00Z", "value": 102.0},
                {"timestamp": "2026-01-04T00:00:00Z", "value": 103.0},
                {"timestamp": "2026-01-05T00:00:00Z", "value": 104.0},
                {"timestamp": "2026-01-06T00:00:00Z", "value": 105.0},
                {"timestamp": "2026-01-07T00:00:00Z", "value": 106.0},
                {"timestamp": "2026-01-08T00:00:00Z", "value": 107.0},
                {"timestamp": "2026-01-09T00:00:00Z", "value": 108.0},
                {"timestamp": "2026-01-10T00:00:00Z", "value": 109.0},
                {"timestamp": "2026-01-11T00:00:00Z", "value": 110.0},
            ],
            "control_panel": {
                "ctrl_a": [
                    {"timestamp": "2026-01-01T00:00:00Z", "value": 99.0},
                    {"timestamp": "2026-01-02T00:00:00Z", "value": 99.5},
                    {"timestamp": "2026-01-03T00:00:00Z", "value": 100.0},
                    {"timestamp": "2026-01-04T00:00:00Z", "value": 100.5},
                    {"timestamp": "2026-01-05T00:00:00Z", "value": 101.0},
                    {"timestamp": "2026-01-06T00:00:00Z", "value": 101.5},
                    {"timestamp": "2026-01-07T00:00:00Z", "value": 102.0},
                    {"timestamp": "2026-01-08T00:00:00Z", "value": 102.5},
                    {"timestamp": "2026-01-09T00:00:00Z", "value": 103.0},
                    {"timestamp": "2026-01-10T00:00:00Z", "value": 103.5},
                    {"timestamp": "2026-01-11T00:00:00Z", "value": 104.0},
                ],
            },
            "treatment_start_index": 8,
        }

        with TestClient(app) as client:
            response = client.post("/v1/estimate/scm", json=request, headers=TEST_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ("ok", "fallback", "infeasible")

    def test_scm_validate_inputs(self) -> None:
        """Invalid SCM request returns 422."""
        request = {
            "treated_series": [],  # Empty
            "control_panel": {},
            "treatment_start_index": 0,
        }

        with TestClient(app) as client:
            response = client.post("/v1/estimate/scm", json=request, headers=TEST_HEADERS)

        # Should fail validation
        assert response.status_code == 422


class TestDMLEstimation:
    """Tests for POST /v1/estimate/dml."""

    def test_dml_basic_request(self) -> None:
        """Basic DML request returns structured response."""
        request = {
            "outcome": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
            "treatment": [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            "covariates": [
                [1.0, 2.0],
                [1.5, 2.5],
                [2.0, 3.0],
                [2.5, 3.5],
                [3.0, 4.0],
                [3.5, 4.5],
                [4.0, 5.0],
                [4.5, 5.5],
                [5.0, 6.0],
                [5.5, 6.5],
            ],
        }

        with TestClient(app) as client:
            response = client.post("/v1/estimate/dml", json=request, headers=TEST_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ("ok", "fallback")

    def test_dml_validate_binary_treatment(self) -> None:
        """Non-binary treatment rejected."""
        request = {
            "outcome": [1.0, 2.0],
            "treatment": [0, 2],  # Invalid
            "covariates": [[1.0], [2.0]],
        }

        with TestClient(app) as client:
            response = client.post("/v1/estimate/dml", json=request, headers=TEST_HEADERS)

        assert response.status_code == 422


class TestForeignChangeDetection:
    """Tests for POST /v1/detect/foreign-change."""

    def test_detection_basic(self) -> None:
        """Basic foreign change detection works."""
        request = {
            "series": [
                {"timestamp": f"2026-01-{i:02d}T00:00:00Z", "value": 100.0}
                for i in range(1, 21)
            ]
        }

        with TestClient(app) as client:
            response = client.post("/v1/detect/foreign-change", json=request, headers=TEST_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert "ewma" in data
        assert "cusum" in data
        assert "combined_signal" in data


class TestConformalCalibration:
    """Tests for POST /v1/calibrate/conformal."""

    def test_conformal_basic(self) -> None:
        """Basic conformal calibration works."""
        request = {"estimate": 5.0, "se": 1.0, "alpha": 0.1, "n_calibration": 30}

        with TestClient(app) as client:
            response = client.post("/v1/calibrate/conformal", json=request, headers=TEST_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert "lower" in data
        assert "upper" in data
        assert data["lower"] < 5.0 < data["upper"]
        # F4 fix: candor_floor present
        assert "candor_floor" in data
        assert data["candor_floor"] == "alpha_carried_through_CI_present_never_zero_width_MVP"


class TestCorpusWrite:
    """Tests for POST /v1/corpus/write."""

    def test_write_requires_signing_key(self) -> None:
        """Corpus write fails without signing key configured."""
        request = {
            "intervention_id": "test-int",
            "estimator": "scm",
            "lift": 0.05,
            "lift_ci_lower": 0.02,
            "lift_ci_upper": 0.08,
            "status": "ok",
            "integrity_tags": {"estimator": "scm"},
        }

        headers = {**TEST_HEADERS, "idempotency-key": "test-idem-requires-key"}
        with TestClient(app) as client:
            response = client.post("/v1/corpus/write", json=request, headers=headers)

        # Returns 503 when signing key not configured
        assert response.status_code == 503
        assert "Signing key not configured" in response.json()["detail"]

    def test_write_with_foreign_change_tags(self) -> None:
        """Corpus write accepts foreign change tags."""
        request = {
            "intervention_id": "test-int",
            "estimator": "dml",
            "lift": 0.03,
            "lift_ci_lower": 0.01,
            "lift_ci_upper": 0.05,
            "status": "ok",
            "integrity_tags": {"estimator": "dml"},
            "foreign_change_tags": {"foreign_change_detected": True, "change_type": "ewma"},
        }

        headers = {**TEST_HEADERS, "idempotency-key": "test-idem-foreign-change-tags"}
        with TestClient(app) as client:
            response = client.post("/v1/corpus/write", json=request, headers=headers)

        # Still 503 (no key), but accepted foreign_change_tags
        assert response.status_code == 503


class TestMeasurementLifecycle:
    """Tests for measurement lifecycle endpoints."""

    def test_start_measurement(self) -> None:
        """Start measurement returns outcome ID."""
        request = {
            "intervention_id": "int-1",
            "merge_commit_sha": "abc123",
            "idempotency_key": "idem-1",
        }

        with TestClient(app) as client:
            response = client.post("/v1/measurements/start", json=request, headers=TEST_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert "outcome_id" in data
        assert "treatment_time" in data
        assert "test-tenant" in data["outcome_id"]
        assert "int-1" in data["outcome_id"]

    def test_record_measurement(self) -> None:
        """Record measurement acknowledges receipt."""
        request = {
            "outcome_id": "test-outcome",
            "surface_id": "CHATGPT",
            "value": 150.0,
            "idempotency_key": "idem-record",
        }

        with TestClient(app) as client:
            response = client.post("/v1/measurements/record", json=request, headers=TEST_HEADERS)

        assert response.status_code == 200
        data = response.json()
        assert data["recorded"] is True

    def test_get_outcome_returns_placeholder(self) -> None:
        """Get outcome returns candid placeholder with microcopy."""
        with TestClient(app) as client:
            response = client.get(
                "/v1/measurements/outcome/test-outcome",
                headers={"x-tenant-id": "test-tenant"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["outcome_id"] == "test-outcome"
        assert data["conformal_coverage"]["candor_microcopy"] == (
            "preliminary — calibration in flight (M4-thin placeholder)"
        )

    def test_list_outcomes_empty(self) -> None:
        """List outcomes returns empty list in thin mode."""
        with TestClient(app) as client:
            response = client.get(
                "/v1/measurements/outcomes",
                headers={"x-tenant-id": "test-tenant"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["outcomes"] == []


class TestBatchCorpusWrite:
    """Tests for POST /v1/corpus/write-batch."""

    def test_batch_write_returns_count(self) -> None:
        """Batch write fails without signing key configured."""
        request = {
            "rows": [
                {
                    "intervention_id": f"int-{i}",
                    "estimator": "scm",
                    "lift": 0.05 * i,
                    "status": "ok",
                    "integrity_tags": {},
                }
                for i in range(3)
            ]
        }

        with TestClient(app) as client:
            response = client.post("/v1/corpus/write-batch", json=request, headers=TEST_HEADERS)

        # Returns 503 when signing key not configured (M4-thin)
        assert response.status_code == 503
        assert "Signing key not configured" in response.json()["detail"]