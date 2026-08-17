#!/usr/bin/env bash

# Secret Rotation Script for Engenox
# This script rotates all external secrets and updates them in GCP Secret Manager
# Run manually or via Cloud Scheduler (quarterly for KEK, monthly for DEKs)

set -euo pipefail

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-engenox-dev}"
REGION="${GCP_REGION:-us-central1}"
ENV="${ENV:-dev}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $*"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

success() {
  echo -e "${GREEN}[OK]${NC} $*"
}

# Check prerequisites
check_prereqs() {
  log "Checking prerequisites..."

  for cmd in gcloud jq openssl; do
    if ! command -v "$cmd" &> /dev/null; then
      error "Required command not found: $cmd"
      exit 1
    fi
  done

  # Verify gcloud auth
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 | grep -q .; then
    error "No active gcloud authentication. Run: gcloud auth login"
    exit 1
  fi

  # Verify project
  if ! gcloud projects describe "$PROJECT_ID" &> /dev/null; then
    error "Cannot access project: $PROJECT_ID"
    exit 1
  fi

  success "Prerequisites check passed"
}

# Generate a new KEK (Key Encryption Key) - quarterly rotation
rotate_kek() {
  local keyring="engenox-kek"
  local key="engineox-kek-$(date +%Y%m%d)"
  local location="global"

  log "Rotating KEK: creating new version in Key Ring: $keyring"

  # Create new key version
  if gcloud kms keys versions create "$key" \
    --location="$location" \
    --keyring="$keyring" \
    --project="$PROJECT_ID" \
    --algorithm=GOOGLE_SYMMETRIC_ENCRYPTION \
    --protection-level=HSM 2>/dev/null; then
    success "KEK rotation complete: $key"
    echo "$key"
  else
    error "Failed to create new KEK version"
    return 1
  fi
}

# Generate a new DEK (Data Encryption Key) per tenant - monthly rotation
rotate_dek() {
  local tenant_id="$1"
  local keyring="engenox-dek-$ENV"
  local key="dek-tenant-$tenant_id"
  local location="global"

  log "Rotating DEK for tenant: $tenant_id"

  # Create key ring if it doesn't exist
  gcloud kms keyrings describe "$keyring" \
    --location="$location" \
    --project="$PROJECT_ID" &>/dev/null || \
  gcloud kms keyrings create "$keyring" \
    --location="$location" \
    --project="$PROJECT_ID"

  # Create new key version
  if gcloud kms keys versions create "$key" \
    --location="$location" \
    --keyring="$keyring" \
    --project="$PROJECT_ID" \
    --algorithm=GOOGLE_SYMMETRIC_ENCRYPTION 2>/dev/null; then
    success "DEK rotation complete for tenant: $tenant_id"
    echo "$key"
  else
    error "Failed to create new DEK version for tenant: $tenant_id"
    return 1
  fi
}

# Rotate Cloudflare R2 API token
rotate_r2_token() {
  local account_id="${CLOUDFLARE_ACCOUNT_ID}"
  local api_token_name="engenox-r2-token-$ENV-$(date +%Y%m%d)"

  log "Rotating Cloudflare R2 API token..."

  if [[ -z "$account_id" ]]; then
    warn "CLOUDFLARE_ACCOUNT_ID not set, skipping R2 token rotation"
    return 0
  fi

  # Use Cloudflare API to create new token (requires CLOUDFLARE_API_TOKEN with appropriate permissions)
  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    local response
    response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$account_id/api_tokens" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"$api_token_name\",
        \"policies\": [
          {
            \"effect\": \"allow\",
            \"resources\": {
              \"com.cloudflare.api.account.r2.bucket.*\": \"*\"
            },
            \"permission_groups\": [
              {\"id\": \"c8fed203ed3043cba015a93ad1616f1f\"}  # R2 Read/Write
            ]
          }
        ],
        \"condition\": {
          \"request.ip\": {
            \"in\": [\"$(gcloud compute addresses describe engenox-egress-ip --region=$REGION --format='value(address)' --project=$PROJECT_ID 2>/dev/null || echo '0.0.0.0/0')\"]
          }
        }
      }")

    local new_token
    new_token=$(echo "$response" | jq -r '.result.value // empty')

    if [[ -n "$new_token" && "$new_token" != "null" ]]; then
      # Store new token in Secret Manager
      echo -n "$new_token" | gcloud secrets versions add "engenox-r2-api-token-$ENV" \
        --data-file=- \
        --project="$PROJECT_ID" &>/dev/null

      success "R2 API token rotated and stored"
      echo "$new_token"
    else
      error "Failed to create new R2 API token"
      echo "$response" | jq .
      return 1
    fi
  else
    warn "CLOUDFLARE_API_TOKEN not set, skipping R2 token rotation (manual rotation required)"
    return 0
  fi
}

# Rotate WorkOS secrets
rotate_workos_secrets() {
  log "Rotating WorkOS secrets..."

  local secrets=(
    "workos-api-key"
    "workos-client-id"
    "workos-client-secret"
  )

  for secret in "${secrets[@]}"; do
    # In production, this would use WorkOS API to rotate
    # For now, we just mark as needing manual rotation
    log "Secret $secret requires manual rotation via WorkOS dashboard"
  done

  warn "WorkOS secrets require manual rotation via WorkOS dashboard"
}

# Rotate database passwords (CNPG managed)
rotate_db_passwords() {
  log "Rotating database passwords..."

  # CNPG manages passwords automatically via the PostgresCluster CR
  # We just trigger a rotation by annotating the cluster
  local clusters=(
    "engenox-primary:engenox-system"
    "engenox-read-replica:engenox-system"
  )

  for cluster_ns in "${clusters[@]}"; do
    local cluster="${cluster_ns%:*}"
    local ns="${cluster_ns#*:}"

    log "Triggering password rotation for cluster: $cluster in namespace: $ns"
    kubectl annotate postgresql "$cluster" -n "$ns" \
      "postgresql.cnpg.io/rotate-password=$(date +%s)" --overwrite
  done

  success "Database password rotation triggered (managed by CNPG)"
}

# Store secret in GCP Secret Manager
store_secret() {
  local secret_name="$1"
  local secret_value="$2"
  local labels="${3:-env=$ENV,managed-by=secret-rotation}"

  log "Storing secret: $secret_name"

  # Create secret if it doesn't exist
  gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null || \
    gcloud secrets create "$secret_name" \
      --replication-policy="automatic" \
      --labels="$labels" \
      --project="$PROJECT_ID" &>/dev/null

  # Add new version
  echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
    --data-file=- \
    --project="$PROJECT_ID" &>/dev/null

  success "Secret stored: $secret_name"
}

# Generate new random secret value
generate_secret() {
  local length="${1:-32}"
  openssl rand -base64 "$length" | tr -d '\n'
}

# Main rotation function
main() {
  local rotation_type="${1:-monthly}"

  log "Starting secret rotation: $rotation_type"
  log "Project: $PROJECT_ID | Region: $REGION | Environment: $ENV"

  check_prereqs

  case "$rotation_type" in
    monthly)
      log "=== Monthly rotation (DEKs, DB passwords, API tokens) ==="

      # Rotate R2 token
      rotate_r2_token

      # Rotate DEKs for all tenants (in production, get tenant list from DB)
      if [[ "$ENV" == "prod" ]]; then
        # Query tenant IDs from database
        warn "Production: Query tenant IDs from database and rotate each DEK"
        # rotate_dek "tenant-id-1"
        # rotate_dek "tenant-id-2"
      else
        # Dev/stage: use sample tenant
        rotate_dek "dev-tenant-001"
      fi

      # Trigger DB password rotation
      rotate_db_passwords

      success "Monthly rotation complete"
      ;;

    quarterly)
      log "=== Quarterly rotation (KEK + monthly items) ==="

      # Run monthly rotations first
      main "monthly"

      # Rotate KEK
      rotate_kek

      # Rotate WorkOS secrets (manual)
      rotate_workos_secrets

      success "Quarterly rotation complete"
      ;;

    emergency)
      log "=== EMERGENCY ROTATION - All secrets ==="
      warn "This will rotate ALL secrets immediately!"
      read -p "Are you sure? (type 'YES' to confirm): " confirm
      if [[ "$confirm" != "YES" ]]; then
        error "Emergency rotation cancelled"
        exit 1
      fi

      main "quarterly"

      # Also rotate any additional emergency secrets
      success "Emergency rotation complete"
      ;;

    *)
      error "Unknown rotation type: $rotation_type"
      echo "Usage: $0 [monthly|quarterly|emergency]"
      exit 1
      ;;
  esac

  log "Rotation complete. Verify Argo CD sync status and application health."
}

# Run main if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi