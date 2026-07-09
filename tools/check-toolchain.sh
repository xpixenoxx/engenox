#!/usr/bin/env bash
# tools/check-toolchain.sh — T01's toolchain-repro test.
# Asserts that mise resolves each pinned tool (mise.toml) at the expected version.
# A drift between mise.toml + the resolved `mise current` is a CI failure (the point of the test).
# Run in CI from T06 onward, AFTER `mise install`.  Cites: 29 §6 · ADR-0001 · mise.toml · T01 Tests.
set -euo pipefail

# The expected toolchain — mirror of mise.toml. Two sources of truth is the point:
# this script FAILS if they drift. uv is "latest"; for uv we assert presence only (prefix empty).
# Format: "tool|version-prefix"
expected=(
  "node|22"
  "pnpm|11"
  "go|1.24"
  "python|3.13"
  "uv|"
  "buf|1.50"
  "biome|2"
  "ruff|0.15"
  "golangci-lint|2"
  "atlas|0.30"
  "opentofu|1.9"
  "argo-cd|2.13"
)

fail=0
for entry in "${expected[@]}"; do
  tool="${entry%%|*}"
  prefix="${entry##*|}"
  actual="$(mise current "${tool}" 2>/dev/null || true)"
  if [ -z "${actual}" ]; then
    echo "FAIL: ${tool} not installed (mise current empty)" >&2
    fail=1
    continue
  fi
  if [ -z "${prefix}" ]; then
    echo "ok: ${tool}=${actual} (latest; present check)"
    continue
  fi
  if [[ "${actual}" == "${prefix}"* ]]; then
    echo "ok: ${tool}=${actual} (expected ${prefix}*)"
  else
    echo "FAIL: ${tool} expected ${prefix}* but got ${actual}" >&2
    fail=1
  fi
done

exit "${fail}"
