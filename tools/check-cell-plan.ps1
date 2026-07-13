# tools/check-cell-plan.ps1 -- PowerShell twin of check-cell-plan.sh (the T04 cell-template
# plan-test, 24 section 4 / ADR-0003 / STACK_DRIFT_WATCHDOG category 1). Identical logic for Windows
# CI/locals where bash is not the shell. Run from repo root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-cell-plan.ps1 <plan-text-file> [-WithRedpanda]
# exit 0 = the plan shows the expected cell (no AlloyDB); exit 1 = a missing resource OR an alloydb hit.
# ASCII-only on purpose: PowerShell 5.1 reads UTF-8-without-BOM as ANSI (em-dash mangles). Cites:
# ADR-0003; 16 section 2; 24 section 4; STACK_DRIFT_WATCHDOG category 1; T04 Tests.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$PlanFile,
  [switch]$WithRedpanda
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $PlanFile)) { Write-Error "FAIL: plan file not found: $PlanFile"; exit 1 }
$plan = Get-Content -Raw $PlanFile

# the always-on resources (provisioned independent of the redpanda flag). The needle is the dotted
# resource address tofu's plan emits (`<type>.<name>`).
$alwaysOn = @(
  @{ label='GKE cluster';            needle='google_container_cluster.cell' },
  @{ label='data node pool';         needle='google_container_node_pool.data' },
  @{ label='data-tier GSA';          needle='google_service_account.data_workload' },
  @{ label='GCS PITR bucket';        needle='google_storage_bucket.pitr' },
  @{ label='KMS key-ring';           needle='google_kms_key_ring.cell' },
  @{ label='KMS KEK';                needle='google_kms_crypto_key.kek' },
  @{ label='Memorystore-for-Valkey'; needle='google_memorystore_instance.valkey' },
  @{ label='CNPG Cluster CR';        needle='kubernetes_manifest.cnpg_cluster' },
  @{ label='CNPG ScheduledBackup';   needle='kubernetes_manifest.cnpg_scheduled_backup' }
)

$fail = 0
foreach ($e in $alwaysOn) {
  if ($plan -notlike "*$($e.needle)*") {
    [Console]::Error.WriteLine("FAIL -- the plan is missing the $($e.label) (needle '$($e.needle)' not found)")
    $fail = 1
  }
}

if ($WithRedpanda) {
  if ($plan -notlike '*kubernetes_manifest.redpanda_interim*') {
    [Console]::Error.WriteLine("FAIL -- -WithRedpanda was set but the plan is missing kubernetes_manifest.redpanda_interim")
    $fail = 1
  }
}

# the watchdog gate: ZERO alloydb in the plan (ADR-0003; WATCHDOG category 1).
if ($plan -match '(?i)alloydb') {
  [Console]::Error.WriteLine("FAIL -- the cell plan contains 'alloydb' (AlloyDB is forbidden per ADR-0003; WATCHDOG cat-1)")
  $fail = 1
}

if ($fail -eq 0) { Write-Host 'ok: the cell plan shows the expected resources (GKE, GCS PITR, KMS, Valkey, CNPG CR + backup) + no AlloyDB' }
exit $fail
