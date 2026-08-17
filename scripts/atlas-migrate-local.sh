#!/usr/bin/env bash
# scripts/atlas-migrate-local.sh — Run Atlas migrations against local Postgres
# Usage: ./scripts/atlas-migrate-local.sh

set -euo pipefail

DATABASE_URL="postgresql://engenox:engenox@localhost:5432/engenox?sslmode=disable"
MIGRATION_DIR="libs/kg/migrations/atlas"

echo "🔄 Running Atlas migrations on local Postgres..."
echo "   DB: $DATABASE_URL"
echo "   Migrations: $MIGRATION_DIR"

# Check atlas is installed
if ! command -v atlas &> /dev/null; then
    echo "❌ atlas not found. Install: https://atlasgo.io/getting-started"
    exit 1
fi

# Apply migrations
cd "$MIGRATION_DIR"
atlas migrate apply --env dev -u "$DATABASE_URL"

echo "✅ Migrations applied successfully"

# Run RLS introspection test (verifies policies exist)
if [ -f "../../scripts/rls_introspection.py" ]; then
    echo "🔍 Running RLS introspection..."
    python3 ../../scripts/rls_introspection.py --url "$DATABASE_URL"
fi