# tools/check-contract-graph.ps1 -- PowerShell twin of check-contract-graph.sh (the T03
# contract-spine LEAF assertion, 24 section 2 + CLAUDE.md section 4). Identical logic for
# Windows CI/locals where bash is not the shell. Run from repo root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-contract-graph.ps1
# exit 0 = leaf-only; exit 1 = a forbidden reverse arrow printed.
# ASCII-only on purpose: PowerShell 5.1 reads UTF-8-without-BOM as ANSI, so non-ASCII
# (em-dash) would mangle + break the string parsing. Cites: 24 section 2 + section 4; T03.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot/..").Path
$Contracts = Join-Path $Root 'pkg/contracts'
if (-not (Test-Path $Contracts)) { Write-Error "FAIL: $Contracts not found"; exit 1 }

$fail = 0

# 1) proto import statements into services/libs/web
$protoHits = Get-ChildItem -Path (Join-Path $Contracts 'proto') -Recurse -Filter *.proto |
  Select-String -Pattern '^\s*import\s+"(([^"]*/)?(services|libs|web)/[^"]*)"'

# 2) TS/JS relative imports into services/libs/web (exclude generated/node_modules)
$tsHits = @()
Get-ChildItem -Path $Contracts -Recurse -Include *.ts,*.tsx,*.js,*.mjs,*.cjs -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(generated|node_modules|dist)\\' } |
  ForEach-Object {
    $m = Select-String -Path $_.FullName -Pattern "['""](\./|\.\./)+(services|libs|web)/"
    if ($m) { $script:tsHits += $m }
  }

# 3) Go imports of services/libs/web
$goHits = Get-ChildItem -Path $Contracts -Recurse -Filter *.go -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(generated|node_modules)\\' } |
  Select-String -Pattern '"(github\.com/engenox/)?(services|libs|web)/[^"]*"'

# 4) Python imports into engenox.services|libs|web
$pyHits = Get-ChildItem -Path $Contracts -Recurse -Filter *.py -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(generated|node_modules)\\' } |
  Select-String -Pattern '^\s*(from\s+(engenox\.)?(services|libs|web)[./]|import\s+(engenox\.)?(services|libs|web)[./])'

foreach ($hits in @($protoHits, $tsHits, $goHits, $pyHits)) {
  if ($hits) {
    Write-Host "FAIL -- pkg/contracts imports an app module (the spine must be leaf-only, 24 section 2 / CLAUDE.md section 4):" -ForegroundColor Red
    $hits | ForEach-Object { Write-Host ("  " + $_.ToString()) }
    $fail = 1
  }
}
if ($fail -eq 0) { Write-Host 'ok: pkg/contracts is leaf-only (imports nothing in services/libs/web)' }
exit $fail
