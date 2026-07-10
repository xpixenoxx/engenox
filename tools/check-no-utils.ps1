# tools/check-no-utils.ps1 -- PowerShell twin of check-no-utils.sh (the T03 no-utils
# filename rule, 22 section 6 + CODING_STANDARDS section 4). Scans services/libs/pkg/web
# for banned catch-all filenames. exit 0 = none; exit 1 = offenders printed.
# ASCII-only on purpose (PS 5.1 reads UTF-8-without-BOM as ANSI; em-dash would mangle).
# Cites: 22 section 6; T03.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot/..").Path
$dirs = 'services','libs','pkg','web' | ForEach-Object { Join-Path $Root $_ }
$fail = 0

$offenders = Get-ChildItem -Path $dirs -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    ($_.FullName -notmatch '\\(node_modules|generated|dist)\\') -and
    ($_.Name -match '^(utils|helpers|misc|shared)\.(ts|tsx|js|mjs|cjs|go|py)$')
  }
if ($offenders) {
  Write-Host "FAIL -- banned catch-all filenames found (22 s6 / CODING_STANDARDS s4):" -ForegroundColor Red
  Write-Host "       a module is a domain vertical, not a bucket. Rename to a domain name:"
  $offenders | ForEach-Object { Write-Host ("  " + $_.FullName) }
  $fail = 1
} else {
  Write-Host 'ok: no utils/helpers/misc/shared catch-alls in services/libs/pkg/web'
}
exit $fail
