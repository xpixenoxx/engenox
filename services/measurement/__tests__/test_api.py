"""Tests for Measurement Service API — M4-thin."""

import pandas as pd
from fastapi.testclient import TestClient
import pytest

# This test requires the app to be importable
# Skip if dependencies not available
try:
    from engenox.measurement.main import app
    from engenox.measurement.config.settings import get_settings

    APP_AVAILABLE = True
except ImportError:
    APP_AVAILABLE = False


@pytest.mark.skipif(not APP_AVAILABLE, reason="Measurement app not available")
class TestMeasurementAPI:
    """Integration tests for Measurement Service API endpoints."""

    def setup_method(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        """Health check endpoint returns OK."""
        response = self.client.get("/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "measurement"

    def test_scm_estimate_endpoint(self):
        """SCM estimation endpoint accepts valid request."""
        # Create simple synthetic data
        dates = [d.isoformat() for d in pd.date_range("2024-01-01", periods=20, freq="D")]
        treated_series = [{"timestamp": d, "value": 100 + i} for i, d in enumerate(dates)]
        control_panel = {
            "c1": [{"timestamp": d, "value": 95 + i} for i, d in enumerate(dates)],
            "c2": [{"timestamp": d, "value": 105 + i} for i, d in enumerate(dates)],
        }

        response = self.client.post(
            "/v1/estimate/scm",
            json={
                "treated_series": treated_series,
                "control_panel": control_panel,
                "treatment_start_index": 10,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ("ok", "fallback")

    def test_dml_estimate_endpoint(self):
        """DML estimation endpoint accepts valid request."""
        import numpy as np
        n = 100
        x = np.random.randn(n, 3).tolist()
        d = np.random.randint(0, 2, n).tolist()
        y = (1.5 * np.array(d) + np.random.randn(n)).tolist()

        response = self.client.post(
            "/v1/estimate/dml",
            json={
                "outcome": y,
                "treatment": d,
                "covariates": x,
                "n_folds": 3,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ("ok", "fallback")

    def test_foreign_change_detection_endpoint(self):
        """Foreign change detection endpoint works."""
        import numpy as np
        dates = [d.isoformat() for d in pd.date_range("2024-01-01", periods=30, freq="D")]
        series = [{"timestamp": d, "value": 100 + np.random.normal(0, 1)} for d in dates]

        response = self.client.post(
            "/v1/detect/foreign-change",
            json={"series": series},
        )

        assert response.status_code == 200
        data = response.json()
        assert "combined_signal" in data
        assert data["combined_signal"] in ("CLEAR", "WARNING", "ALERT")

    def test_conformal_calibration_endpoint(self):
        """Conformal calibration endpoint works."""
        response = self.client.post(
            "/v1/calibrate/conformal",
            json={
                "estimate": 10.0,
                "se": 0.5,
                "alpha": 0.1,
                "n_calibration": 0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "lower" in data
        assert "upper" in data
        assert data["method"] == "placeholder-se-corrected"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])