#!/usr/bin/env python3
"""
scripts/test_r2_restore.py — R2 WORM bucket nightly restore test (M7 T06).

Writes N test objects to R2 WORM bucket, reads them back, verifies 10/10 match.
Exits 0 on full match, 1 on any mismatch.
Cites: M7 T06; 26 §4 (WORM corpus integrity).
"""

import argparse
import hashlib
import json
import os
import sys
import time

import boto3


def get_r2_client():
    endpoint = os.getenv("R2_TEST_ENDPOINT")
    access = os.getenv("R2_TEST_ACCESS_KEY")
    secret = os.getenv("R2_TEST_SECRET_KEY")
    if not (endpoint and access and secret):
        return None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access,
        aws_secret_access_key=secret,
        region_name="auto",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="R2 WORM bucket nightly restore test")
    parser.add_argument("--bucket", default=os.getenv("R2_TEST_BUCKET", "engenox-corpus-test"))
    parser.add_argument("--count", type=int, default=10, help="Number of test objects to write/verify")
    parser.add_argument("--prefix", default="restore-test/nightly-", help="Key prefix for test objects")
    args = parser.parse_args()

    client = get_r2_client()
    if not client:
        print("❌ R2 test credentials not configured (R2_TEST_ENDPOINT, R2_TEST_ACCESS_KEY, R2_TEST_SECRET_KEY)")
        return 1

    bucket = args.bucket
    n = args.count
    prefix = args.prefix

    print(f"🔄 R2 WORM restore test (bucket={bucket}, objects={n})")

    # Cleanup any existing test objects first
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            client.delete_object(Bucket=bucket, Key=obj["Key"])

    # Write N test objects
    print(f"   Writing {n} objects...")
    written = 0
    expected_hashes = {}
    for i in range(n):
        key = f"{prefix}{int(time.time())}-{i:04d}.json"
        content = {
            "test_id": i,
            "timestamp": time.time(),
            "tenant_id": "r2-restore-test-tenant",
            "corpus_row_id": f"restore-test-row-{i:04d}",
            "lift_estimate": round(0.1 + i * 0.001, 4),
            "integrity_tags": {"tenant_consent": True, "test": "r2-restore-nightly"},
        }
        body = json.dumps(content, sort_keys=True).encode()
        expected_hash = hashlib.sha256(body).hexdigest()

        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=body,
            Metadata={
                "content-sha256": expected_hash,
                "test": "true",
                "restore-test": "nightly"
            },
            ContentType="application/json",
        )
        expected_hashes[key] = expected_hash
        written += 1

    print(f"   ✅ Written {written} objects")

    # Read back and verify
    print("   Reading back and verifying...")
    passed = 0
    failed = 0
    for key, expected_hash in expected_hashes.items():
        try:
            resp = client.get_object(Bucket=bucket, Key=key)
            body = resp["Body"].read()
            actual_hash = hashlib.sha256(body).hexdigest()
            stored_hash = resp["Metadata"].get("content-sha256", "")

            if actual_hash != expected_hash:
                print(f"   ❌ HASH MISMATCH {key}: body={actual_hash[:16]}... != expected={expected_hash[:16]}...")
                failed += 1
                continue

            if stored_hash != expected_hash:
                print(f"   ❌ METADATA MISMATCH {key}: stored={stored_hash[:16]}... != expected={expected_hash[:16]}...")
                failed += 1
                continue

            passed += 1

        except Exception as e:
            print(f"   ❌ READ ERROR {key}: {e}")
            failed += 1

    # Cleanup
    for key in expected_hashes:
        client.delete_object(Bucket=bucket, Key=key)

    print(f"   Results: {passed}/{n} passed, {failed} failed")

    if failed > 0:
        print(f"❌ R2 restore test FAILED: {failed}/{n} objects did not verify")
        return 1

    print(f"✅ R2 restore test PASSED: {passed}/{n} objects verified")
    return 0


if __name__ == "__main__":
    sys.exit(main())