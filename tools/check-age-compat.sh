#!/usr/bin/env bash
# tools/check-age-compat.sh — T04 the AGE↔Postgres compatibility cite (the live evidence that the
# pinned `age_version` is compatible with the pinned `postgres_major`, WATCHDOG category 5).
#
# The AGE-in-transaction invariant (00 §2) depends on AGE + the relational tier running in ONE
# cluster, so the AGE↔PG major compatibility is a tracked invariant (the cite is a LINK to the AGE
# release notes — not a recollection). This script asserts the cell's `variables.tf` carries:
# (a) the AGE release-notes URL cite;
# (b) the AGE↔PG compat-matrix comment (the 1.6.0 -> PG 14-17 line);
# (c) the pinned `age_version = 1.6.0` + `postgres_major = 17` (the documented 1.6.0/1.7.0 overlap).
# A pin that drifts from the cite is a category-5 drift.
#
# Usage: tools/check-age-compat.sh [path/to/variables.tf]
# exit 0 = the cite is present + the pins are the documented overlap; exit 1 = drift.
# Cites: ADR-0003; 00 §2; STACK_DRIFT_WATCHDOG category 5; T04 Tests (the AGE-compat cite).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VARS="${1:-$ROOT/infra/tofu/modules/cell/variables.tf}"

if [ ! -f "$VARS" ]; then
  echo "FAIL: $VARS not found" >&2
  exit 1
fi
src="$(cat "$VARS")"

fail=0

# (a) the AGE release-notes URL cite (the live evidence — a link, never a recollection).
if ! printf '%s' "$src" | grep -qF 'https://github.com/apache/age/releases'; then
  echo "FAIL — variables.tf is missing the AGE release-notes URL cite (WATCHDOG cat-5: the compat evidence is a LINK, github.com/apache/age/releases)" >&2
  fail=1
fi

# (b) the AGE↔PG compat-matrix comment (the inline matrix line).
if ! printf '%s' "$src" | grep -qE 'AGE 1\.6\.0 -> PG 14, 15, 16, 17'; then
  echo "FAIL — variables.tf is missing the AGE↔PG compat-matrix comment (the 1.6.0 -> PG 14-17 line)" >&2
  fail=1
fi

# (c) the pinned age_version = 1.6.0 (the documented stable line for PG17).
if ! printf '%s' "$src" | grep -qE 'default[[:space:]]*=[[:space:]]*"1\.6\.0"'; then
  echo "FAIL — age_version is not pinned to 1.6.0 (the documented stable line for PG17)" >&2
  fail=1
fi

# (c) the pinned postgres_major = 17 (the 1.6.0/1.7.0 AGE overlap).
if ! printf '%s' "$src" | grep -qE 'default[[:space:]]*=[[:space:]]*17[[:space:]]*$'; then
  echo "FAIL — postgres_major is not pinned to 17 (the 1.6.0/1.7.0 AGE overlap)" >&2
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "ok: the AGE↔PG compat cite is present (1.6.0 + PG17, the documented overlap, github.com/apache/age/releases)"
fi
exit "$fail"
