# tools/check-age-compat.ps1 -- PowerShell twin of check-age-compat.sh (the T04 AGE<->Postgres
# compatibility cite, WATCHDOG category 5). Identical logic for Windows. Run from repo root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-age-compat.ps1 [path\to\variables.tf]
# exit 0 = the cite is present + the pins are the documented overlap; exit 1 = drift.
# ASCII-only on purpose (PS 5.1 reads UTF-8-without-BOM as ANSI). Cites: ADR-0003; 00 section 2;
# STACK_DRIFT_WATCHDOG category 5; T04 Tests.
[CmdletBinding()]
param(
  [string]$Vars
)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot/..").Path
if (-not $Vars) { $Vars = Join-Path $Root 'infra\tofu\modules\cell\variables.tf' }
if (-not (Test-Path $Vars)) { Write-Error "FAIL: $Vars not found"; exit 1 }
$src = Get-Content -Raw $Vars
$fail = 0

# (a) the AGE release-notes URL cite (the live evidence -- a link, never a recollection).
if ($src -notlike '*https://github.com/apache/age/releases*') {
  [Console]::Error.WriteLine('FAIL -- variables.tf is missing the AGE release-notes URL cite (WATCHDOG cat-5: the compat evidence is a LINK)')
  $fail = 1
}

# (b) the AGE<->PG compat-matrix comment (the 1.6.0 -> PG 14-17 line).
if ($src -notmatch 'AGE 1\.6\.0 -> PG 14, 15, 16, 17') {
  [Console]::Error.WriteLine('FAIL -- variables.tf is missing the AGE<->PG compat-matrix comment (the 1.6.0 -> PG 14-17 line)')
  $fail = 1
}

# (c) the pinned age_version = 1.6.0 (the documented stable line for PG17).
if ($src -notmatch 'default\s*=\s*"1\.6\.0"') {
  [Console]::Error.WriteLine('FAIL -- age_version is not pinned to 1.6.0 (the documented stable line for PG17)')
  $fail = 1
}

# (c) the pinned postgres_major = 17 (the 1.6.0/1.7.0 AGE overlap). End-of-line anchored so it does
# not match a substring of the container-image string (`...age1.6.0-vector0.8.2` has no bare `= 17`).
if ($src -notmatch '(?m)default\s*=\s*17\s*$') {
  [Console]::Error.WriteLine('FAIL -- postgres_major is not pinned to 17 (the 1.6.0/1.7.0 AGE overlap)')
  $fail = 1
}

if ($fail -eq 0) { Write-Host 'ok: the AGE<->PG compat cite is present (1.6.0 + PG17, the documented overlap, github.com/apache/age/releases)' }
exit $fail
