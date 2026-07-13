#!/usr/bin/env bash
# tools/check-cell-plan.sh — T04 the cell-template plan-test (assert the plan shows the expected
# resources + NO AlloyDB, 24 §4 / ADR-0003 / STACK_DRIFT_WATCHDOG category 1).
#
# Reads a captured `tofu plan` output (text) + asserts the always-on resource types are present
# (GKE cluster + node pool, the data-tier GSA, the GCS PITR bucket, the KMS key-ring + KEK, the
# Memorystore-for-Valkey instance, the CNPG `Cluster` CR + `ScheduledBackup` via kubernetes_manifest)
# + HARD-FAILS if any `alloydb` token appears (ADR-0003 — AlloyDB is forbidden; a clone w/o the gate
# would silently regress). The interim Redpanda resource is conditional (redpanda_enabled); pass
# --with-redpanda to also assert it, else it is feature-gated out of the dev plan.
#
# Usage:
#   tofu -chdir=infra/tofu/envs/dev/primary plan -no-color > /tmp/cell-plan.txt
#   tools/check-cell-plan.sh /tmp/cell-plan.txt                # core asserts (+ no alloydb)
#   tools/check-cell-plan.sh /tmp/cell-plan-with-bus.txt --with-redpanda   # + the redpanda assert
#
# exit 0 = the plan shows the expected cell; exit 1 = a missing resource OR an alloydb hit.
# Cites: ADR-0003; 16 §2; 24 §4; STACK_DRIFT_WATCHDOG category 1; T04 Tests (the plan-test).
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "FAIL: usage: $0 <plan-text-file> [--with-redpanda]" >&2
  exit 1
fi
plan_file="$1"
shift
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

# --- the always-on resources (provisioned independent of the redpanda flag) -----------------
# Each entry is `label|needle` — the needle is the dotted resource address tofu's plan emits.
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

fail=0
for entry in "${always_on[@]}"; do
  label="${entry%%|*}"
  needle="${entry#*|}"
  if ! printf '%s' "$plan" | grep -qF "$needle"; then
    echo "FAIL — the plan is missing the $label (needle '$needle' not found)" >&2
    fail=1
  fi
done

if [ "$with_redpanda" -eq 1 ]; then
  if ! printf '%s' "$plan" | grep -qF "kubernetes_manifest.redpanda_interim"; then
    echo "FAIL — --with-redpanda was set but the plan is missing kubernetes_manifest.redpanda_interim" >&2
    fail=1
  fi
fi

# --- the watchdog gate: ZERO alloydb in the plan (ADR-0003; WATCHDOG category 1) -------------
alloydb_hits="$(printf '%s' "$plan" | grep -iE 'alloydb' || true)"
if [ -n "$alloydb_hits" ]; then
  echo "FAIL — the cell plan contains 'alloydb' (AlloyDB is forbidden per ADR-0003; WATCHDOG cat-1):" >&2
  printf '%s\n' "$alloydb_hits" >&2
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "ok: the cell plan shows the expected resources (GKE, GCS PITR, KMS, Valkey, CNPG CR + backup) + no AlloyDB"
fi
exit "$fail"
