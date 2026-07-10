#!/usr/bin/env bash
# tools/check-lint-fires.sh — T03 the NEGATIVE-test runner (23 testing strategy + 24 §4).
#
# A configured lint that never fires is untested. This scans each deliberately-forbidden
# fixture through its lint and asserts a VIOLATION is caught + the expected rule name
# appears in the output. exit 0 = every rule fired on its fixture (the lints are live);
# exit 1 = a rule failed to fire (a silent lint — the bigger problem than a noisy one).
#
# The fixtures live under tools/lint-fixtures/forbidden/ (excluded from the real scan via
# .dependency-cruiser.cjs `exclude: tools/.*`). This runner cwd's INTO that dir so the
# reported paths are `services/<svc>/...` (matching the `^services/` regexes in the config).
#
# Cites: 23 (the failing-mode is tested); 24 §4 (the arrows enforced, not advisory); T03.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIX="$ROOT/tools/lint-fixtures/forbidden"
fail=0

if [ ! -d "$FIX" ]; then
  echo "FAIL: fixture dir not found: $FIX" >&2
  exit 1
fi

cd "$FIX"

# depcruiser the fixture dirs; assert the named rule fires (the rule name is in err output).
# The mjs-config: passed by absolute path so it resolves regardless of cwd.
depcruise() {
  mise exec -- pnpm exec dependency-cruise -c "$ROOT/.dependency-cruiser.cjs" \
    --output-type err -- "$@" 2>&1 || true
}

assert_fires() {
  local rule="$1"; shift
  local out
  out="$(depcruise "$@")"
  # dependency-cruiser err format: `  error <rule>: <from> → <to>` (indented, "<rule>:").
  # The rule names are globally distinct + appear followed by `:` ONLY on violation lines,
  # so matching `error ${rule}` (substring; the leading space swallows the 2-space indent)
  # is specific + robust. grep without -q so the human-readable violations show on failure.
  if printf '%s' "$out" | grep -E " error ${rule}:" >/dev/null; then
    echo "ok: rule '${rule}' FIRES on [$*]"
  else
    echo "FAIL: rule '${rule}' did NOT fire on [$*]" >&2
    printf '%s\n' "$out" >&2
    fail=1
  fi
}

assert_fires no-cross-service-internal   services/perception services/decision
assert_fires gateway-leaf-only           services/decision services/gateway
assert_fires libs-import-no-service       libs/kg services/decision
assert_fires no-utils-ts                  no-utils

# — contract-graph: the REAL tree is green (already proven in check-contract-graph); the
# fixture proto must match the forbidden import pattern (the structural backstop fires).
proto_fixture="$FIX/contract-imports-service/entity.proto"
if grep -qE '^[[:space:]]*import[[:space:]]+"(([^"]*/)?(services|libs|web)/[^"]*)"' "$proto_fixture" 2>/dev/null; then
  echo "ok: check-contract-graph pattern matches the forbidden proto fixture"
else
  echo "FAIL: forbidden proto fixture did not match the contract-graph pattern" >&2
  fail=1
fi

# /sanity check (real tree clean — depcruiser over pkg/contracts fires nothing):
echo "--- sanity: real-tree depcruiser (expect clean) ---"
cd "$ROOT"
if mise exec -- pnpm exec dependency-cruise -c .dependency-cruiser.cjs --output-type err \
    pkg/contracts services libs web 2>&1 | grep -qE '^(error|warning)'; then
  echo "FAIL: the real tree tripped a boundary rule — the fixtures are leaking into the scan" >&2
  fail=1
else
  echo "ok: real tree clean (no fixture leakage)"
fi

exit "$fail"
