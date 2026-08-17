#!/usr/bin/env bash
# tools/check-cell-plan.sh — T04/T01 the cell-template plan-test for dev AND stage.
#
# Asserts the plan shows expected resources + NO AlloyDB (ADR-0003 / WATCHDOG cat-1).
# Usage:
#   tofu -chdir=infra/tofu/envs/dev/primary plan -no-color > /tmp/cell-plan.txt
#   tools/check-cell-plan.sh /tmp/cell-plan.txt dev
#   tofu -chdir=infra/tofu/envs/stage/primary plan -no-color > /tmp/cell-plan-stage.txt
#   tools/check-cell-plan.sh /tmp/cell-plan-stage.txt stage [--with-redpanda]
# Cites: ADR-0003; 16 §2; 24 §4; STACK_DRIFT_WATCHDOG cat-1; T01; T04.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "FAIL: usage: $0 <plan-text-file> <dev|stage> [--with-redpanda]" >&2
  exit 1
fi

plan_file="$1"
env="$2"
shift 2
with_redpanda=0
for arg in "$@"; do
  case "$arg" in
    --with-redpanda) with_redpanda=1 ;;
    *) echo "FAIL: unknown arg: $arg" >&2; exit 1 ;;
  esac
done

if [ ! -f "$plan_file" ]; then
  echo "FAIL: plan file not found: $plan_file" >&2
  exit 1
fi

plan="$(cat "$plan_file")"
fail=0

# --- always-on resources (both dev and stage) ---
always_on=(
  "GKE cluster|google_container_cluster.cell"
  "data node pool|google_container_node_pool.data"
  "data-tier GSA|google_service_account.data_workload"
  "GCS PITR bucket|google_storage_bucket.pitr"
  "KMS key-ring|google_kms_key_ring.cell"
  "KMS KEK|google_kms_crypto_key.kek"
  "Memorystore-for-Valkey|google_memorystore_instance.valkey"
  "CNPG Cluster CR|kubernetes_manifest.cnpg_cluster"
  "CNPG ScheduledBackup|kubernetes_manifest.cnpg_scheduled_backup"
)

for entry in "${always_on[@]}"; do
  label="${entry%%|*}"
  needle="${entry#*|}"
  if ! printf '%s' "$plan" | grep -qF "$needle"; then
    echo "FAIL — the plan is missing the $label (needle '$needle' not found)" >&2
    fail=1
  fi
done

# --- stage-specific resources ---
if [ "$env" = "stage" ]; then
  stage_resources=(
    "R2 corpus bucket|module.r2_corpus.cloudflare_r2_bucket.corpus"
    "Auth proxy Worker|cloudflare_worker_script.auth_proxy"
    "Auth proxy Worker route|cloudflare_worker_route.auth_proxy"
  )
  for entry in "${stage_resources[@]}"; do
    label="${entry%%|*}"
    needle="${entry#*|}"
    if ! printf '%s' "$plan" | grep -qF "$needle"; then
      echo "FAIL — the plan is missing the $label (needle '$needle' not found)" >&2
      fail=1
    fi
  done

  # Stage should have 3 CNPG instances (HA)
  if ! printf '%s' "$plan" | grep -qF 'instances.*=.*3'; then
    echo "FAIL — stage plan should show cnpg_instances = 3 (HA)" >&2
    fail=1
  fi

  # Stage should have backup_retention_days = 30
  if ! printf '%s' "$plan" | grep -qF 'backup_retention_days.*=.*30'; then
    echo "FAIL — stage plan should show backup_retention_days = 30" >&2
    fail=1
  fi

  # Stage should have valkey_tier = STANDARD_HA
  if ! printf '%s' "$plan" | grep -qF 'valkey_tier.*=.*"STANDARD_HA"'; then
    echo "FAIL — stage plan should show valkey_tier = STANDARD_HA" >&2
    fail=1
  fi
fi

# --- conditional: redpanda (enabled at stage, optional at dev) ---
if [ "$with_redpanda" -eq 1 ]; then
  if ! printf '%s' "$plan" | grep -qF "kubernetes_manifest.redpanda_interim"; then
    echo "FAIL — --with-redpanda was set but the plan is missing kubernetes_manifest.redpanda_interim" >&2
    fail=1
  fi
fi

# --- WATCHDOG gate: ZERO alloydb in the plan (ADR-0003; WATCHDOG cat-1) ---
alloydb_hits="$(printf '%s' "$plan" | grep -iE 'alloydb' || true)"
if [ -n "$alloydb_hits" ]; then
  echo "FAIL — the cell plan contains 'alloydb' (AlloyDB is forbidden per ADR-0003; WATCHDOG cat-1):" >&2
  printf '%s\n' "$alloydb_hits" >&2
  fail=1
fi

# --- WATCHDOG gate: NO WarpStream (ADR-0004; cat-1) ---
warpstream_hits="$(printf '%s' "$plan" | grep -iE 'warpstream' || true)"
if [ -n "$warpstream_hits" ]; then
  echo "FAIL — the cell plan contains 'warpstream' (WarpStream is forbidden per ADR-0004; WATCHDOG cat-1):" >&2
  printf '%s\n' "$warpstream_hits" >&2
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "ok: the $env cell plan shows expected resources + no AlloyDB/WarpStream"
fi
exit "$fail"