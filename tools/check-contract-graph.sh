#!/usr/bin/env bash
# tools/check-contract-graph.sh — T03 the contract-spine LEAF assertion (24 §2 + CLAUDE.md §4).
#
# Asserts pkg/contracts/ imports NOTHING in services/, libs/, or web/. The contract package
# is the fan-IN root (leaf-only): it is the ONLY cross-language type source, so it must never
# depend on a producer — an arrow from a contract INTO an app module is a structural spine
# breach. This is the structural backstop for the contract-spine-first rule (CLAUDE.md §4):
# if a contract ever imports a service, this fires.
#
# Distinguished from dependency-cruiser's no-cross-service-internal (which catches a SERVICE
# importing another service's internals). Both run.
#
# Scans the proto SOURCES + hand-authored engenox.* ts/go/py — NOT the git-ignored generated/
# tree (the codegen output is produced, not the spine). exit 0 = leaf-only (green);
# exit 1 = a forbidden reverse arrow printed with its file:line:path.
#
# Cites: 24 §2 (pkg/contracts is the fan-IN root) + §4 (the leaf assertion); CLAUDE.md §4;
#        ADR-0001; T03 (the contract-graph assertion).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS="$ROOT/pkg/contracts"
fail=0
hits=""

if [ ! -d "$CONTRACTS" ]; then
  echo "FAIL: $CONTRACTS not found" >&2
  exit 1
fi

# 1) Proto import statements only (^\s*import "..."). A contract proto may import only
#    google/* or engenox/* — importing services/libs/web/* is the breach. Comment lines
#    ("// ... services/control-plane ...") are NOT import statements and are skipped by the
#    ^\s*import anchor (the proto headers cite services in prose — intentionally allowed).
proto_hits="$(grep -rnE '^[[:space:]]*import[[:space:]]+"(([^"]*/)?(services|libs|web)/[^"]*)"' \
  "$CONTRACTS/proto" 2>/dev/null || true)"

# 2) TS/JS import-from statements referencing a RELATIVE app module (./ or ../ into
#    services/libs/web). node_modules/.keep/generated are excluded by find.
ts_hits="$(find "$CONTRACTS" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) \
  ! -path '*/generated/*' ! -path '*/node_modules/*' ! -path '*/dist/*' \
  -exec grep -HnE "(from[[:space:]]+['\"](\.[^'\"]*/)*)?['\"](\.\./)+(services|libs|web)/" {} \; \
  2>/dev/null | grep -E "['\"](\./|\.\./)+(services|libs|web)/" || true)"

# 3) Go import statements (an import line whose quoted path lands in a services/libs/web path
#    under an engenox module — the contracts Go module must not reach a producer).
go_hits="$(find "$CONTRACTS" -type f -name '*.go' ! -path '*/generated/*' ! -path '*/node_modules/*' \
  -exec grep -HnE '"(github\.com/engenox/)?(services|libs|web)/[^"]*"' {} \; 2>/dev/null || true)"

# 4) Python import statements (from/import into an engenox.services|libs|web subpackage — at
#    M0 none exist; the hand-authored scripts import engenox.* generated + google.protobuf).
py_hits="$(find "$CONTRACTS" -type f -name '*.py' ! -path '*/generated/*' ! -path '*/node_modules/*' \
  -exec grep -HnE '^[[:space:]]*(from[[:space:]]+(engenox\.)?(services|libs|web)[./]|import[[:space:]]+(engenox\.)?(services|libs|web)[./])' {} \; 2>/dev/null || true)"

for kind in proto_hits ts_hits go_hits py_hits; do
  val="${!kind}"
  if [ -n "$val" ]; then
    echo "FAIL — pkg/contracts imports an app module (the spine must be leaf-only, 24 §2 / CLAUDE.md §4):" >&2
    printf '%s\n' "$val" >&2
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "ok: pkg/contracts is leaf-only (imports nothing in services/libs/web)"
fi
exit "$fail"
