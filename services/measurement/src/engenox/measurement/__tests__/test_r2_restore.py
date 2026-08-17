"""
services/measurement/__tests__/test_r2_restore.py — R2 WORM bucket restore test (M7 T06).

Verifies R2 WORM bucket can be written and read back correctly (10/10 objects match).
Cites: M7 T06; 26 §4 (WORM corpus integrity).
"""

import hashlib
import json
import os

import boto3  # type: ignore[import-not-found]
import pytest  # type: ignore[import-not-found]

# --- Fixtures ----------------------------------------------------------------

@pytest.fixture(scope="session")
def r2_client():
    endpoint = os.getenv("R2_TEST_ENDPOINT")
    access = os.getenv("R2_TEST_ACCESS_KEY")
    secret = os.getenv("R2_TEST_SECRET_KEY")
    if not (endpoint and access and secret):
        pytest.skip("R2 test credentials not configured")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access,
        aws_secret_access_key=secret,
        region_name="auto",
    )


@pytest.fixture(scope="session")
def r2_bucket():
    return os.getenv("R2_TEST_BUCKET", "engenox-corpus-test")


# --- Tests -------------------------------------------------------------------

class TestR2Restore:
    """Verify R2 WORM bucket can be written and read back correctly (10/10)."""

    @pytest.fixture(autouse=True)
    def setup_teardown(self, r2_client, r2_bucket):
        self.client = r2_client
        self.bucket = r2_bucket
        self.prefix = "restore-test/test-r2-restore-"
        yield
        # Cleanup
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix="restore-test/"):
            for obj in page.get("Contents", []):
                self.client.delete_object(Bucket=self.bucket, Key=obj["Key"])

    def test_write_and_verify_10_objects(self):
        """Write 10 test objects, read back, verify all 10 match."""
        n = 10

        for i in range(n):
            key = f"{self.prefix}{i:04d}.json"
            content = {
                "test_id": i,
                "tenant_id": "r2-restore-test-tenant",
                "corpus_row_id": f"restore-test-row-{i:04d}",
                "lift_estimate": 0.1 + i * 0.001,
                "integrity_tags": {"tenant_consent": True, "test": "r2-restore"},
            }
            body = json.dumps(content, sort_keys=True).encode()
            expected_hash = hashlib.sha256(body).hexdigest()

            self.client.put_object(
                Bucket=self.bucket, Key=key, Body=body,
                Metadata={"content-sha256": expected_hash, "test": "true"},
                ContentType="application/json",
            )

        # Read back and verify
        passed = 0
        for i in range(n):
            key = f"{self.prefix}{i:04d}.json"
            resp = self.client.get_object(Bucket=self.bucket, Key=key)
            body = resp["Body"].read()
            actual_hash = hashlib.sha256(body).hexdigest()
            expected_hash = resp["Metadata"].get("content-sha256", "")

            assert actual_hash == expected_hash, f"Hash mismatch for {key}"
            passed += 1

        assert passed == n, f"Only {passed}/{n} objects verified"