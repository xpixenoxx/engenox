# T02 — Contract spine: Buf + first protos + codegen

> **Tier:** 1 (the contract spine — the #1 anti-rework surface) | **Status:** pending | **Milestone:** M0
> **Cites:** `24` §2 (`pkg/contracts/` fan-in root) + §3 (the module boundaries) + §6 (generated-artifact discipline) · `09` §4 (the contract as fan-in) · `18` §8 (the versioned-namespace discipline) · `14` §5 (strict add-only) · `CLAUDE.md` §4 (contract-spine-first) · `ADR-0001` (the Buf stack pin)

## Objective

Ship `pkg/contracts/` — the Buf contract package that is the **only** cross-language type source — with the first `.proto` in each of the four versioned namespaces (entity / event / service / policy `v1`), and `buf generate` producing TS / Go / Python outputs that compile in each language. The first protos are authored to **golden-path exemplar quality** (`28` §4): they are the reference the AI *copies* when it adds a later contract type, not a pattern it improvises. The contract-compat CI gate fires for the first time on this ticket.

## Dependencies

- **Tickets:** T01 (the workspace — `pkg/contracts/` is a pnpm/uv/go.work root).
- **External:** the Buf CLI (pinned in `mise.toml` by T01); the TypeScript / Go / Python Buf codegen plugins (the versions pinned in `buf.gen.yaml`).

## Files

- `pkg/contracts/buf.yaml` — the Buf module config (`name: engenox/contracts`, `deps` empty at M0 — no external proto deps yet).
- `pkg/contracts/buf.gen.yaml` — the codegen plugins: `protoc-gen-es` (TS, `@bufbuild/protoc-gen-es` → `@engenox/contracts`), `protoc-gen-go` (Go), `protoc-gen-python-*` (Python, the Buf-managed Python plugin). The plugin versions pinned.
- `pkg/contracts/proto/engenox/entity/v1/entity.proto` — the first **entity** proto: the `AssertedNode` message (`06` §2 domain vocabulary) — the unit of the truth spine. Fields per `06` §2 (the bi-temporal `valid_time`/`tx_time`, the `ProvenanceRef`, the integrity tag). Authored to exemplar quality: the doc-pointer comments cite `06` §2 + `13` §2 (bi-temporal) + `00` §2 invariant 8 (reproducible from a signed node).
- `pkg/contracts/proto/engenox/event/v1/event.proto` — the first **event** proto: the `AssertionEvent` (`24` §2). Exemplar quality.
- `pkg/contracts/proto/engenox/service/v1/service.proto` — the first **service** proto: one trivial gRPC service definition (a `Perception` service with one `Assert` RPC that takes an `AssertedNode` + returns an `Ack`) — the reference shape for `services/control-plane → services/perception` cross-service calls (`24` §3). Exemplar quality.
- `pkg/contracts/proto/engenox/policy/v1/policy.proto` — the first **policy** proto: the `DialLevel` enum (the `Co-pilot`/`Specialist`/... levels) + the `BlastRadiusBand` (`24` §2; `12` for the dial). Exemplar quality.
- `pkg/contracts/package.json` (TS publish config — `@engenox/contracts`), `pkg/contracts/go.mod` (the Go module `github.com/engenox/contracts`), `pkg/contracts/pyproject.toml` (the Python package `engenox_contracts`) — so the codegen outputs are publishable per `24` §6.
- `pkg/contracts/generated/` — **git-ignored** (per `.gitignore` from T01). The codegen runs in CI; the published packages are built from it.
- `pkg/contracts/README.md` — the contract-package README: how to add a type (the `/contract-shape` skill flow, `SKILLS_SUBAGENTS_PLAN.md` E14), the strict-add-only `v1` discipline, the four-language publish story.

## Acceptance criteria

- [ ] `buf lint` passes on `pkg/contracts/proto/`.
- [ ] `buf breaking --against .git#branch=main` (or an empty baseline at M0) passes — no breaking change on the (empty) baseline.
- [ ] `buf generate` produces TS, Go, and Python outputs in `pkg/contracts/generated/` (git-ignored).
- [ ] The TS output compiles: `tsc --noEmit` in `pkg/contracts/` is green (strict).
- [ ] The Go output compiles: `go build ./...` in `pkg/contracts/` is green.
- [ ] The Python output compiles: `mypy --strict pkg/contracts/generated/python/` is green (or the generated stubs pass `mypy`).
- [ ] The four `v1` namespaces exist with the first proto in each (`entity/v1/entity.proto` with `AssertedNode`; `event/v1/event.proto` with `AssertionEvent`; `service/v1/service.proto` with the `Perception.Assert` RPC; `policy/v1/policy.proto` with `DialLevel` + `BlastRadiusBand`).
- [ ] The first protos cite their frozen-doc provenance in proto comments (`// 06 §2`, `// 13 §2`, `// 24 §2`) — the doc-pointer convention in proto, mirroring `CODING_STANDARDS.md` §5.
- [ ] `pkg/contracts/generated/` is git-ignored (confirmed by `git check-ignore`); the published package configs (`package.json`/`go.mod`/`pyproject.toml`) are committed.
- [ ] No frozen doc edited; the change is confined to `pkg/contracts/`.

## Tests

- **Contract-gate test (the M0 gate fires):** a CI step (landed in T06) runs `buf lint` + `buf breaking` + `buf generate` + the three-language compile. This is the contract-compat gate (`25` §3 — "the contract-compat CI gate fires for the first time"). T02's test is the *local* run of that chain; T06 wires it into CI.
- **Exemplar-quality review test:** the four first protos are reviewed against the blueprint (`06` §2 for `AssertedNode`, `24` §3 for the service shape, `12` for the dial levels) — the review record (`REVIEW_STANDARDS.md`, E08) confirms the field set matches the doc, not a free improvisation.
- **Strict-add-only test:** `buf breaking` against the M0 baseline passes (the baseline is the first commit; a later removal/rename fails this gate — `14` §5 + `18` §8).
- **Round-trip test:** a trivial TS snippet imports `@engenox/contracts`'s `AssertedNode`, constructs one, serializes, deserializes, asserts equality — confirms the codegen produces a usable TS surface. (This snippet lives in `pkg/contracts/__tests__/`.)

## Definition of Done (per `DEFINITION_OF_DONE.md`, E09)

- [ ] Every acceptance criterion closed; the tests green (incl. the contract-gate local run).
- [ ] Coding standard met: the protos follow the doc-pointer convention; the generated outputs compile in all three languages; `buf lint` green.
- [ ] Contract spine intact: `pkg/contracts/` is the only cross-language type source; no hand-written cross-language type exists; the dependency direction is downward (contracts imports nothing in-repo). (Enforced structurally by T03's lint.)
- [ ] Review passed at Tier 1: the **full adversarial panel** — Correctness (the field set matches `06` §2), Contract-spine (the spine is leaf-only, `buf breaking` green, no hand-written type), Architecture-alignment (the versioned namespaces + strict-add-only), Provenance (the `AssertedNode` carries the bi-temporal + the integrity tag + the `ProvenanceRef`, per `00` §2 invariant 8), Stack-drift (the Buf + plugin pins match `29` §6).
- [ ] The M0-critical CI gate (contract-compat) fires for the first time — this is the M0 gate `25` §3 names.
- [ ] Stack-drift watchdog green: no `alloydb`/`warpstream`/`quickwit` references; no hand-written cross-language type; the Buf pin matches ADR-0001.
- [ ] Docs updated: `pkg/contracts/README.md` documents the add-a-type flow + the strict-add-only discipline; `/contract-shape` skill (T08) references this README.
- [ ] Checkpoint written; commit-ready (`feat(contracts): T02 — the contract spine + first v1 protos + codegen` with `Refs: 24 §2, 06 §2, 14 §5, ADR-0001`).

## Estimated complexity

**L — ~1.5 days.** The risk is the cross-language codegen matrix (the TS `@bufbuild/protoc-gen-es` + Go `protoc-gen-go` + Python plugin versions must be mutually compatible with the Buf CLI version pinned in T01). The mitigation: pin the Buf-recommended plugin triplet; the round-trip test catches a mismatch.

## Notes for the implementer

- **The first protos are the golden-path exemplar for contracts** (`28` §4 — "a contract proto"). Author them to the quality the *rest* of the contracts should match: the doc-pointer comments, the field naming (PascalCase matching `06` §2), the strict-add-only `v1` namespace, the versioned package path. A later contract type copies these.
- **Do not author the full `06` taxonomy here.** T02 ships *one* entity (`AssertedNode`), *one* event (`AssertionEvent`), *one* service (the trivial `Perception.Assert`), *one* policy shape (`DialLevel` + `BlastRadiusBand`). The full taxonomy (`Intervention`, `ActionRecord`, `Outcome`, `KnowledgeConflict`, etc. — `24` §2) lands at M1+ as the services that need them land. T02 is the exemplar, not the inventory.
- **Do not hand-write the TS/Go/Python types.** The codegen is the source; a hand-written type alongside the generated one is a watchdog hit (category 3).
- **The `pkg/contracts/generated/` directory is git-ignored** — confirmed by T01's `.gitignore`. Do not commit the generated outputs.
- **No `v2` namespaces at M0.** `v1` is strict-add-only; a `v2` is a future major-version migration (`18` §8) — not in M0.
