#!/bin/bash
# local-up.sh — Start Engenox local development stack
# Usage: ./scripts/local-up.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"

echo "=== Engenox Local Development Stack ==="
echo "Starting services from $COMPOSE_FILE"
echo ""

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check for .env.local
if [[ ! -f "$ROOT_DIR/.env.local" ]]; then
    echo "WARNING: .env.local not found. Copying from .env.example..."
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local"
    echo "Please edit .env.local with your API keys before running services."
    echo ""
fi

# Pull latest images
echo "Pulling images..."
docker-compose -f "$COMPOSE_FILE" pull --quiet

# Start core infrastructure first
echo "Starting core infrastructure (Postgres, Valkey, Redpanda)..."
docker-compose -f "$COMPOSE_FILE" up -d postgres valkey redpanda

# Wait for Postgres to be healthy
echo "Waiting for Postgres..."
for i in {1..30}; do
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U engenox -d engenox >/dev/null 2>&1; then
        echo "Postgres is ready!"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

# Start Temporal (depends on Temporal Postgres)
echo "Starting Temporal..."
docker-compose -f "$COMPOSE_FILE" up -d temporal-postgres temporal temporal-ui

# Wait for Temporal
echo "Waiting for Temporal..."
for i in {1..30}; do
    if docker-compose -f "$COMPOSE_FILE" exec -T temporal tctl --address temporal:7233 cluster health >/dev/null 2>&1; then
        echo "Temporal is ready!"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

# Start observability stack
echo "Starting observability stack (MinIO, ClickHouse, OTel, Grafana, Langfuse)..."
docker-compose -f "$COMPOSE_FILE" up -d minio minio-init clickhouse otel-collector mimir loki tempo grafana langfuse

# Wait for Grafana
echo "Waiting for Grafana..."
for i in {1..20}; do
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "Grafana is ready!"
        break
    fi
    echo "  Waiting... ($i/20)"
    sleep 2
done

# Wait for Langfuse
echo "Waiting for Langfuse..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/public/health >/dev/null 2>&1; then
        echo "Langfuse is ready!"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

# Start Nginx
echo "Starting Nginx reverse proxy..."
docker-compose -f "$COMPOSE_FILE" up -d nginx

echo ""
echo "=== All Services Started ==="
echo ""
echo "Service Endpoints:"
echo "  Postgres (AGE/pgvector):  localhost:5432"
echo "  Valkey (Redis):           localhost:6379"
echo "  Redpanda (Kafka):         localhost:9092"
echo "  Temporal gRPC:            localhost:7233"
echo "  Temporal UI:              http://localhost:8233"
echo "  MinIO S3 API:             http://localhost:9000"
echo "  MinIO Console:            http://localhost:9001 (minioadmin/minioadmin123)"
echo "  ClickHouse:               http://localhost:8123"
echo "  Grafana:                  http://localhost:3000 (admin/admin)"
echo "  Langfuse:                 http://localhost:3001"
echo "  Nginx Proxy:              http://localhost"
echo ""
echo "Next steps:"
echo "  1. Run Atlas migrations:  docker-compose -f $COMPOSE_FILE exec postgres psql -U engenox -d engenox -f /docker-entrypoint-initdb.d/01-init-age.sql"
echo "  2. Run: mise exec -- pnpm migrate:atlas"
echo "  3. Start services:        mise exec -- nx run-many -t serve"
echo ""
echo "To view logs: docker-compose -f $COMPOSE_FILE logs -f <service>"
echo "To stop:      ./scripts/local-down.sh"