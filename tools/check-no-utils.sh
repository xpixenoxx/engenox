#!/usr/bin/env bash
# tools/check-no-utils.sh — T03 the no-utils filename rule (22 §6 + CODING_STANDARDS §4).
#
# A module is a domain-bounded vertical slice owning its types + persistence + external
# boundary + tests; there is no utils/helpers/misc/shared bucket (22 §6). The banned
# catch-all filenames are caught at CREATION here (dependency-cruiser's no-utils-ts rule
# catches them at the IMPORT edge — both run).
#
# Scans services/, libs/, pkg/, and web/ (the source-bearing trees). Infra/scripts/tools/
# datasets are excluded — infra is OpenTofu; a helper script under tools/ is fine. The
# git-ignored generated/ tree (the codegen output) is excluded. exit 0 = none found;
# exit 1 = offenders printed.
#
# Cites: 22 §6 (no utils.ts / helpers.go / misc.py); CODING_STANDARDS §4 (the no-utils rule);
#        CLAUDE.md §5 (the module boundaries); T03.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0

OFFENDERS="$(find "$ROOT/services" "$ROOT/libs" "$ROOT/pkg" "$ROOT/web" \
  -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \
     -o -name '*.go' -o -name '*.py' \) \
  ! -path '*/node_modules/*' \
  ! -path '*/generated/*' \
  ! -path '*/dist/*' \
  ! -path '*/.venv/*' \
  ! -path '*/.keep' \
  2>/dev/null \
  | grep -E '/(utils|helpers|misc|shared)\.(ts|tsx|js|mjs|cjs|go|py)$' \
  || true)"

if [ -n "$OFFENDERS" ]; then
  echo "FAIL — banned catch-all filenames found (22 §6 / CODING_STANDARDS §4):" >&2
  echo "       a module is a domain vertical, not a bucket. Rename to a domain name:" >&2
  printf '%s\n' "$OFFENDERS" >&2
  fail=1
else
  echo "ok: no utils/helpers/misc/shared catch-alls in services/libs/pkg/web"
fi

exit "$fail"
