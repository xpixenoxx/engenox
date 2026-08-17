#!/bin/bash
# local-down.sh — Stop Engenox local development stack
# Usage: ./scripts/local-down.sh [--volumes] [--remove-orphans]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"

REMOVE_VOLUMES=false
REMOVE_ORPHANS=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --volumes|-v)
            REMOVE_VOLUMES=true
            shift
            ;;
        --remove-orphans|-o)
            REMOVE_ORPHANS=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--volumes] [--remove-orphans]"
            echo "  --volumes, -v         Remove named volumes (data loss!)"
            echo "  --remove-orphans, -o  Remove containers for services not in compose file"
            exit 0
            ;;
    esac
done

echo "=== Stopping Engenox Local Stack ==="

COMPOSE_ARGS=("-f" "$COMPOSE_FILE" "down")

if [[ "$REMOVE_ORPHANS" == true ]]; then
    COMPOSE_ARGS+=("--remove-orphans")
fi

if [[ "$REMOVE_VOLUMES" == true ]]; then
    echo "WARNING: Removing volumes - ALL DATA WILL BE LOST!"
    read -p "Are you sure? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Aborted."
        exit 1
    fi
    COMPOSE_ARGS+=("-v")
fi

docker-compose "${COMPOSE_ARGS[@]}"

if [[ "$REMOVE_VOLUMES" == true ]]; then
    echo ""
    echo "All volumes removed. Next start will be a fresh stack."
else
    echo ""
    echo "Stack stopped. Volumes preserved. Start with ./scripts/local-up.sh"
fi