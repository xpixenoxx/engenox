# tools/check-toolchain.ps1 — T01's toolchain-repro test (the local Windows dev path).
# PowerShell twin of check-toolchain.sh. Asserts mise resolves each pinned tool (mise.toml)
# at the expected version. A drift is a CI failure.  Cites: 29 §6 · ADR-0001 · mise.toml · T01 Tests.
# Exit 0 = all tools present at expected versions; 1 = drift or missing. Run AFTER `mise install`.

$expected = @(
  @{ tool = 'node';          prefix = '22' },
  @{ tool = 'pnpm';          prefix = '11' },
  @{ tool = 'go';            prefix = '1.24' },
  @{ tool = 'python';        prefix = '3.13' },
  @{ tool = 'uv';            prefix = '' },
  @{ tool = 'buf';           prefix = '1.50' },
  @{ tool = 'biome';         prefix = '2' },
  @{ tool = 'ruff';          prefix = '0.15' },
  @{ tool = 'golangci-lint'; prefix = '2' },
  @{ tool = 'atlas';         prefix = '0.30' },
  @{ tool = 'opentofu';      prefix = '1.9' },
  @{ tool = 'argo-cd';       prefix = '2.13' }
)

$fail = 0
foreach ($e in $expected) {
  $actual = $null
  try { $actual = (mise current $e.tool 2>$null) } catch { $actual = $null }
  if ([string]::IsNullOrEmpty($actual)) {
    [Console]::Error.WriteLine("FAIL: $($e.tool) not installed (mise current empty)")
    $fail = 1
    continue
  }
  if ([string]::IsNullOrEmpty($e.prefix)) {
    Write-Host "ok: $($e.tool)=$actual (latest; present check)"
    continue
  }
  if ($actual.StartsWith($e.prefix)) {
    Write-Host "ok: $($e.tool)=$actual (expected $($e.prefix)*)"
  } else {
    [Console]::Error.WriteLine("FAIL: $($e.tool) expected $($e.prefix)* but got $actual")
    $fail = 1
  }
}
exit $fail
