# Dependency-direction rules — the architecture's arrows made physical

> **Editable enforcement doc (Tier-3).** The human-readable companion to the lint this
> describes. NOT a frozen blueprint doc — update it as the boundary evolves. The frozen
> authority is `24` §3 (the boundary table) + `24` §4 (the lint). When a lint fires, the
> blocked importer reads this doc + the cited section.

## The single rule that holds

`pkg/contracts/` is the **only** cross-language type source. Every other arrow routes the way
the diagram reads. A forbidden import is a **CI-blocked failure**, not a review-discussion
item (`24` §4).

## The arrows (the authoritative table — `24` §3)

| From | May import | May NOT import |
|---|---|---|
| `web` | `design-system`, `@engenox/contracts` | any `services/*` internal |
| `services/control-plane` | `@engenox/contracts` (the generated gRPC client for each service), `libs/{kg,verifier,cedar,crypto,otel}` | `services/{perception,decision,action,measurement}` internals (it calls them via the client, `24` §4) |
| `services/perception` | `@engenox/contracts`, `libs/{kg,otel}` | `services/{decision,action,gateway,control-plane,measurement}` internals |
| `services/decision` | `@engenox/contracts`, `libs/{kg,verifier,cedar}` | `services/{perception,action,gateway,control-plane,measurement}` internals |
| `services/action` | `@engenox/contracts`, `libs/{kg,cedar,crypto}` | `services/{perception,decision,gateway,control-plane,measurement}` internals |
| `services/measurement` | `@engenox/contracts`, `libs/{kg,verifier}` (+ the estimate/conformal/federated packages it owns) | `services/{perception,decision,action,gateway,control-plane}` internals |
| `services/gateway` | the provider/LiteLLM SDK, `@engenox/contracts`, the verifier | **any other module's internals** (gateway is leaf-only; it is the SOLE importer of the provider SDK, CLAUDE.md §5) |
| `libs/*` | `@engenox/contracts`, stdlib, third-party | **any `services/*`** (libs sit BELOW the service layer) |
| `pkg/contracts` | googleapis proto, the `engenox` proto namespace (its own internal type refs) | **nothing in `services/`, `libs/`, or `web/`** (leaf-only, the fan-IN root) |

### How control-plane reaches another service

`control-plane` does **not** `import {something} from "../../perception/internal"`. It imports
the gRPC client generated from `pkg/contracts/proto/service/v1/*.proto` and calls the RPC:

```ts
// services/control-plane — the ONLY way to reach perception (24 §3 + §4)
import { PerceptionServiceClient } from "@engenox/contracts/service/v1";
const client = new PerceptionServiceClient(...);
const res = await client.assert({ node, idempotencyKey }, { /* jwt-derived tenant_id */ });
```

The `tenant_id` on the wire is injected from the JWT at the service edge (CLAUDE.md §8 — a
`tenant_id` accepted from a client request is a watchdog hit); the client never supplies it.

## The tools (and why these, not the ticket's literal naming)

| Language | Tool | What it blocks | Cites |
|---|---|---|---|
| TS boundary | **dependency-cruiser** (`.dependency-cruiser.cjs`) | cross-service internal, gateway-leaf, libs→service, no-utils, control-plane-via-contracts | 24 §4, 29 §6 |
| TS style | Biome (replaces ESLint+Prettier) | `utils.ts` style + format | 29 §6 |
| Go boundary | **golangci-lint v2 depguard** (`.golangci.yaml`) | cross-service module import, self-import | 24 §4, 29 §6 |
| Python boundary | **import-linter** (`[tool.importlinter]` in root `pyproject.toml`) | measurement's estimator/conformal/federated package boundaries | 24 §4 |
| Contract-graph | **`tools/check-contract-graph.{sh,ps1}`** | `pkg/contracts/` importing an app module (the leaf assertion) | 24 §2, CLAUDE.md §4 |
| No-utils filename | **`tools/check-no-utils.{sh,ps1}`** | `utils.*`/`helpers.*`/`misc.*`/`shared.*` catch-alls at creation | 22 §6 |

### Why dependency-cruiser, not `nx enforce-module-boundaries`

`24` §4 names "the dependency-direction lint"; the M0 ticket named `nx enforce-module-
boundaries` as the carrier. That carrier ships **only** via `@nx/eslint-plugin`, which demands
**ESLint** — and ESLint is banned (Biome replaces it, CLAUDE.md §2; the stack-drift watchdog's
`eslint` rule is non-overridable, CLAUDE.md §8). dependency-cruiser is **eslint-free** and is
the same tool the ticket names for the contract-graph assertion — so one eslint-free tool
carries both the TS boundary rules and the contract-graph leaf assertion, keeping the stack
clean (29 §6) while delivering the identical CI-blocked enforcement the frozen doc mandates.
The **intent** (24 §4: a forbidden import is a CI failure) is the invariant; the tool is
implementation. This is the documented technology's faithful eslint-free realization, not an
ADR-bearing swap of a documented technology.

### Why a central `.golangci.yaml` depguard, not `.depguard.yml` per service dir

The pinned golangci-lint is **v2** (mise.toml). depguard is configured **centrally** in
`.golangci.yaml` with per-source `files:` rules (a v2 form), not as one `.depguard.yml` per
service dir (the depguard **1.x** pattern the ticket named). The boundary table is unchanged;
the carrier moved with the v2 pin. Same architecture, stack-faithful form.

## The negative tests (the lint must FIRE)

A configured lint that never fires is untested. `tools/check-lint-fires.{sh,ps1}` runs each
forbidden fixture through its lint and asserts a **non-zero exit** (a violation is caught).
The fixtures live under `tools/lint-fixtures/forbidden/`:

- `cross-service/` — `services/perception` importing `services/decision` → `no-cross-service-internal` fires.
- `leaf-misuse/` — a non-gateway service importing `services/gateway` → `gateway-leaf-only` fires.
- `libs-service/` — `libs/kg` importing `services/decision` → `libs-import-no-service` fires.
- `no-utils/` — an `import "./utils"` → `no-utils-ts` fires (and `check-no-utils` catches the file).
- `contract-imports-service/` — a proto `import "services/decision/plan.proto"` → `check-contract-graph` fires.

The green path: dependency-cruiser over the real tree + `check-contract-graph` +
`check-no-utils` all exit 0 (a clean scaffold + the contracts package is leaf-only).

## When a lint fires

1. Read the rule `comment` (it cites the section) + this doc's row.
2. If the import is genuinely forbidden → restructure the call to route through the
   contract (`control-plane` → gRPC client), move the code into a lib, or split the module.
3. **Do not suppress.** A bare `// nolint` / `eslint-disable` / `# noqa` is a stack-drift
   watchdog hit (category 4) — the suppression is the bigger problem than the import.
