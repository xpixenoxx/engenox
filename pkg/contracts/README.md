# `@engenox/contracts` — the contract spine

> The ONLY cross-language type source in Engenox (24 §2). Generated from Protobuf by
> `buf generate`; imported as the typed surface by services + web. The output
> (`generated/`) is git-ignored — produced here, published from here, never hand-written
> and never checked in (24 §6).
>
> Consume via the versioned subpath (there is no barrel `index.ts` - `protoc-gen-es`
> emits per-file `*_pb.ts` only):
> `import { AssertedNodeSchema } from "@engenox/contracts/entity/v1"`.

This is the **contract-spine-first** discipline in its concrete form (CLAUDE.md §4): the
foundation's first ditch against AI type-drift. A new entity / event / service / policy
type is a `.proto` under `proto/engenox/<ns>/v1/` → `buf generate` → import the generated
type. **Never hand-write a cross-language type.**

## Layout

```
pkg/contracts/
├── buf.yaml              # the Buf module config (lint: STANDARD, breaking: FILE)
├── buf.gen.yaml          # the codegen pipeline (TS es / Go + go-grpc / Python)
├── proto/engenox/
│   ├── entity/v1/        # AssertedNode (06 §2) - the truth-spine root
│   ├── event/v1/         # AssertionEvent (14 §3) - the only bus event shape
│   ├── service/v1/       # Perception.Assert (24 §3) - the cross-service exemplar
│   └── policy/v1/        # DialLevel + BlastRadiusBand (12 §4 / §3)
├── package.json          # @engenox/contracts (TS, workspace-internal)
├── go.mod                # github.com/engenox/contracts
├── pyproject.toml        # engenox-contracts
├── tsconfig.json         # the strict TS gate (tsc --noEmit)
├── __tests__/            # the round-trip test (vitest)
└── generated/            # git-ignored codegen output (TS / Go / Python)
```

## The four v1 namespaces (M0)

| Namespace | First type | Doc |
|---|---|---|
| `engenox.entity.v1` | `AssertedNode` (+ `TimeInterval`, `Distribution`, `ProvenanceRef`, `EntityType`, `ProvenanceSourceType`) | 06 §2 / 13 §2 |
| `engenox.event.v1` | `AssertionEvent` (+ `Assertion`, `IntegrityTags`, `IdentificationStrategy`, `ForeignChangeStatus`) | 14 §3 |
| `engenox.service.v1` | `PerceptionService.Assert(AssertRequest) -> AssertResponse` | 24 §3 |
| `engenox.policy.v1` | `DialLevel` (7 symbolic levels) + `BlastRadiusBand` (5 bands) | 12 §4 / §3 |

These are the **golden-path exemplars** (28 §4): a later type lands at M1 as a new member
of its namespace and copies the header structure, the doc-pointer comments, and the
strict-add-only `v1` discipline.

## The add-a-type flow

```bash
# 1. add the .proto (NEW file, or an additive field to an existing v1 file):
$ edit proto/engenox/<ns>/v1/<name>.proto
# 2. regenerate the three languages:
$ pnpm --filter @engenox/contracts gen   # == buf generate
# 3. the gates (run before a PR):
$ pnpm --filter @engenox/contracts lint       # buf lint (STANDARD)
$ pnpm --filter @engenox/contracts breaking   # buf breaking --against .git#branch=main,subdir=pkg/contracts (FILE)
$ pnpm --filter @engenox/contracts build      # tsc --noEmit (strict)
$ pnpm --filter @engenox/contracts test       # vitest (the round-trip)
$ go build ./generated/...                    # Go services compile against the output
$ mypy --strict generated/python              # the measurement tier compiles
```

## Strict-add-only (`v1`)

A `v1` namespace accepts additive changes only (14 §5 + 18 §8):

- ✅ Add an **optional** field (a new field number).
- ✅ Add an **enum value** (a new field number on the enum).
- ✅ Add a new `.proto` file to the namespace.
- ❌ Remove / rename / retype a field — a `FILE`-level break; the contract-compat CI gate
  (T06) rejects it.
- ❌ Reuse a field number.

A breaking change is a **`v2` namespace** — a major-version migration, not an in-place
edit. The v2 lands alongside v1; consumers migrate; v1 is deprecated then removed on a
timeline (18 §8).

## The codegen plugins

Pinned for reproducibility (CLAUDE.md §2; the pins are the live form of ADR-0001):
- **TS** — `@bufbuild/protoc-gen-es` (npm, this package's devDeps) → the
  `@engenox/contracts` surface. `target=ts`, `import_extension=.js` (NodeNext-correct).
- **Go** — `protoc-gen-go` + `protoc-gen-go-grpc` (`go install`-ed) → the Go services.
  `paths=source_relative`.
- **Python** — the Buf-managed `buf.build/protocolbuffers/python` → the measurement tier.

A plugin bump is a **stack-drift-watchdog category-1 hit** (CLAUDE.md §8) — it is an
ADR, not a silent edit.

## Dependency direction (enforced at T03)

```
service ──▶ entity
event   ──▶ entity
policy    (leaf; no imports)
```

Unidirectional, asserted by the contract-graph check (T03): `service → entity`,
`event → entity`; `policy` is a leaf. `control-plane → services` only via the gRPC client
generated from `service.proto` (24 §4 — never a direct internal-package import).

## Cites

24 §2 (pkg/contracts root) · 24 §6 (generated-artifact discipline) · 06 §2 (entity
taxonomy) · 13 §2 + §4 (bi-temporal supersession) · 14 §3 + §5 (the envelope +
compatibility) · 12 §4 + §3 (the dial + the band) · 00 §2 invariant 8 (reproducible from
a signed node) · ADR-0001 (the Buf stack pin) · T02 (the contract spine).
