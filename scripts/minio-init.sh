#!/bin/bash
# minio-init.sh — Initialize MinIO buckets with Object Lock (simulates R2 WORM)
# Runs as init container

set -euxo pipefail

MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin123}"
MINIO_BUCKET="${MINIO_BUCKET:-engenox-corpus}"

# Wait for MinIO to be ready
until mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null; do
    echo "Waiting for MinIO..."
    sleep 2
done

# Create bucket with Object Lock (WORM)
# --with-lock requires versioning to be enabled
mc mb --with-lock "local/${MINIO_BUCKET}" 2>/dev/null || true

# Enable versioning (required for Object Lock)
mc version enable "local/${MINIO_BUCKET}" 2>/dev/null || true

# Create folder structure for three-sinks reconciliation
mc mb "local/${MINIO_BUCKET}/corpus" 2>/dev/null || true
mc mb "local/${MINIO_BUCKET}/audit" 2>/dev/null || true
mc mb "local/${MINIO_BUCKET}/provenance" 2>/dev/null || true

# Set bucket lifecycle (optional - for local cleanup)
# mc ilm add --expiry-days 90 "local/${MINIO_BUCKET}"

echo "MinIO initialized:"
echo "  Bucket: ${MINIO_BUCKET} (Object Lock enabled)"
echo "  S3 Endpoint: http://localhost:9000"
echo "  Console: http://localhost:9001"
echo "  Access Key: ${MINIO_ROOT_USER}"