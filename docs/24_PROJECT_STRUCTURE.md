# 24 — Project Structure

> **Status: FROZEN.** The polyglot monorepo layout that survives the closed loop's complexity: the **domain-bounded module boundaries** (perception / decision / action / measurement / governance / memory / gateway / frontend / design-system) over the per-language workspaces (TS / Go / Python), the **`pkg/contracts/` contract spine** at the root of the fan-in, the **`infra/` cell template** (OpenTofu + Kustomize + the Argo CD app-of-apps), the **`docs/` source-of-truth + `adr/` decision records**, the `datasets/` golden-probe fixtures, the `e2e/` Playwright harness, and the **dependency-direction lint** that keeps the architecture's arrows honest (the contract → every tier; the design-system → frontend-only; no service imports from another service's domain — only via the contract or an explicit anti-corruption layer). Authored against `09_BACKEND_ARCHITECTURE.md` (the polyglot tiers), `10_FRONTEND_ARCHITECTURE.md`, `16_INFRASTRUCTURE.md`, `21_DEVELOPMENT_GUIDELINES.md`, `22_CODING_STANDARDS.md`, and `_FOUNDATION_TECH.md` Layer 15–16. **The layout is the architecture made physical: a newcomer reads the tree and infers the module boundaries; a lint they did not write refuses their wrong-direction import.**

---

## 1. The single rule

**The repo's tree mirrors the architecture's modules, and the dependency arrows are enforced by lint, not by convention.** A bounded module owns its type, its store access, its external boundary; it exposes only the contract's shape to other modules. The contract package is the fan-in root; the design-system is the frontend-only leaf; no domain module imports another domain module's internals, only the contract or a gRPC client generated from it. The repo is a polyglot enterprise with one build orchestrator (`nx`), three language workspaces, and a layout that says "perception lives here, decision lives there, the contract they share lives up top."

This section defines the tree, the module boundaries, the dependency rules, and the lint.

---

## 2. The top-level tree

```
engenox/
├── docs/                          # the blueprint (01–27) + foundational triad; FROZEN + ADR-soft-frozen
│   ├── 00_FOUNDATION_FINAL.md
│   ├── _FOUNDATION_TECH.md
│   ├── _FOUNDATION_CRITIQUES.md
│   ├── 01_PROJECT_VISION.md
│   ├── ...
│   └── 27_FUTURE_ROADMAP.md
├── adr/                           # architecture decision records (the post-STOP-CONDITION change-propagation log)
│   ├── 0001-no-llm-tiebreaker.md
│   └── ...
├── pkg/contracts/                 # the contract spine — Buf Protobuf/JSON-Schema; codegen'd to every tier
│   ├── buf.yaml
│   ├── buf.gen.yaml               # the codegen plugins (TS/Go/Python)
│   ├── proto/
│   │   ├── engenox/
│   │   │   ├── entity/v1/         # AssertedNode, KnowledgeConflict, Intervention, ActionRecord, Outcome …
│   │   │   ├── event/v1/         # AssertionEvent, ProbeEvent, InterventionLifecycleEvent …
│   │   │   ├── service/v1/       # the gRPC service definitions (Decision, Perception, Action, Measurement, Gateway)
│   │   │   └── policy/v1/        # the Cedar policy types + the dial levels + the blast-radius bands
│   │   └── ...
│   └── generated/                 # git-ignored; produced by `buf generate`; published as a package
├── infra/                         # the cell template + the deployment manifests
│   ├── tofu/                      # OpenTofu modules
│   │   ├── modules/cell/         # the cell abstraction (16 §2): GKE + Postgres + Valkey + Redpanda + KMS
│   │   ├── modules/r2/           # the WORM bucket + Object-Lock config
│   │   ├── modules/cloudflare/   # edge + Workers + KV
│   │   └── envs/{dev,stage,prod}/{primary,privacy,whale}/  # per-cell, per-env workspaces
│   ├── kustomize/
│   │   ├── base/                  # the per-service manifests
│   │   └── overlays/{dev,stage,canary,prod}/{primary,privacy,whale}/
│   ├── argocd/                    # the app-of-apps root per cell
│   └── policies/                  # OPA Gatekeeper admission policies (the sigstore-verify, the no-:latest, the no-egress-for-privacy)
├── services/                      # the polyglot service implementations (post-STOP-CONDITION)
│   ├── control-plane/            # TS/Hono — the GraphQL+BFF, the auth-session entry, the Cedar gate's first pass
│   ├── perception/               # Go — the probe fleet, the connector pulls, the crawler
│   ├── decision/                 # TS — the Planner/Critic/Specialist orchestration (Temporal workflows)
│   ├── action/                   # Go — the GitHub-App PR, the blast-radius, the allow-list-glob, the rule-based diff-review, the signed manifest, the rollback-hash
│   ├── measurement/              # Python/FastAPI — the causal estimator, the conformal calibrator, the EWMA/CUSUM, the federated refit
│   ├── gateway/                  # TS/Go — the LLM gateway (LiteLLM-routing + constrained decoding + re-grounding + cost-control + tracing)
│   ├── temporal/                 # the Temporal workflow definitions shared across Decision + Action + Measurement
│   └── workers/                   # the per-service Temporal-activity host processes
├── libs/                          # the shared libraries (the intra-organization collaborators)
│   ├── kg/                       # the assertion_view library + the bi-temporal helpers (the only KG read path, 13 §3)
│   ├── verifier/                 # the symbolic verifier (openCypher + SHACL/Datalog) — shared by the gateway + the Critic
│   ├── cedar/                    # the Cedar policy binding + the compiled-cache
│   ├── crypto/                   # the KEK/DEK envelope + the signing + the webhook-sig
│   ├── otel/                     # the OpenTelemetry + Langfuse wiring (the trace spine)
│   └── fixtures/                  # the golden-probe fixtures + the fixture-provider (the dev-mode deterministic probes, 21 §5)
├── web/                           # the frontend (Next.js 15 App Router)
│   ├── app/                      # the routes (10 §4)
│   ├── components/               # the app's composition of the design-system primitives
│   └── ...
├── design-system/                # the tokens + the primitives + the patterns (20); published as a versioned package
│   ├── tokens/
│   ├── primitives/
│   ├── patterns/
│   └── .storybook/
├── e2e/                           # the Playwright harness (the <10-minute journey, the 1-click PR, the candor report)
├── datasets/                     # the golden-probe fixtures + the consented-panel fixture slice + the eval-held-out-trajectory split
├── scripts/                       # the bring-up scripts, the migration runners, the chaos runner, the restore-test runner
├── tools/                        # the repo's own tooling (the Buf plugins' thin wrappers, the lint runners)
├── .github/workflows/            # the CI gate chain (17 §4)
├── nx.json                        # the build orchestrator config
├── pnpm-workspace.yaml
├── go.work
├── pyproject.toml (root, for the uv workspace)
├── mise.toml                     # the pinned toolchain
└── ...
```

### Commentary on the tree
- **`pkg/contracts/` is the root of the fan-in** (09 §4) — every language tier imports from it; the codegen generates TS/Go/Python from the same `.proto`. Nothing else is the source of cross-language types.
- **`services/` is the polyglot landing** — one dir per bounded service, each owning its `package.json`/`go.mod`/`pyproject.toml`, each in its language. The `22` no-`utils` rule extends: no `services/shared/`.
- **`libs/` is the intra-organization shared code** — the `kg` library (the `assertion_view`), the `verifier`, the `cedar` binding, the `crypto`. These cross the language tiers (a `libs/kg-go` + a `libs/kg-ts` + a `libs/kg-py`, each a thin per-language binding over the contract's KG types) — the duplication is *intentional + codegen-driven*, not hand-written.
- **`infra/` mirrors the cell abstraction** — the `tofu/modules/cell` is the parameterized template; the `envs/` dirs are the per-cohort instantiations; `kustomize/overlays/` carries the privacy-tier no-egress network policies (15 §8). An SRE standing up a cell is reading `infra/`, not `services/`.
- **`docs/` + `adr/` are the architecture-of-record** — `docs/` is the FROZEN blueprint; `adr/` is the post-STOP-CONDITION change log (21 §3). A new joiner reads `docs/` first; a change-seeker reads `adr/` to see what's already been decided.

---

## 3. The module boundaries (the closed-loop's domain verticals)

Each service dir is a **vertical slice** owning its contract types (Buf-generated), its persistence layer (the repo, behind the KG library), its external boundary (the gRPC client/server), its Temporal workflows/activities, its tests. The boundaries:

| Module | Owns | Does NOT own | Depends-on (one-way) |
|---|---|---|---|
| `control-plane` | the GraphQL+BFF, the auth session, the SSE broker, the Cedar first-pass | the closed-loop's domain logic, the LLM calls, the GitHub-App token | `contracts`, `kg`, `cedar`, `crypto`, `otel` |
| `perception` | the probe fleet, the connector adapters, the crawler | the diagnosis, the action, the corpus | `contracts`, `kg` (writes assertions), `otel` |
| `decision` | the Planner/Critic/Specialist workflows, the plan DAG | the GitHub-App, the estimator's math, the corpus row commit | `contracts`, `kg`, `verifier`, `gateway` (the LLM seam calls — never the provider directly) |
| `action` | the GitHub-App PR, the allow-list-glob + the rule-based diff-review, the blast-radius, the signed manifest, the rollback-hash | the diagnosis, the estimator | `contracts`, `kg`, `cedar`, `crypto` |
| `measurement` | the SCM/DML/grf/causal-forest estimator, the conformal calibrator, the EWMA/CUSUM, the federated refit | the diagnosis, the action | `contracts`, `kg` (read-only on assertions + outcomes), `otel` |
| `gateway` | the LiteLLM routing, the constrained decoding, the re-grounding verifier, the token-budget gate, the Langfuse tracing | the closed loop's logic (it's a stateless seam) | `contracts`, `verifier`, `otel` |
| `workers` (Temporal hosts) | the activity-host processes that execute the workflows defined in `decision`/`action`/`measurement` | the workflow *definitions* (those are in the owning module) | the modules whose activities they host |

### The boundary examples
- **`decision` does not import `perception` directly**; it reads `AnswerEvents` from the KG (via `kg`'s `assertion_view`) — the perception-writing-to-KG and the decision-reading-from-KG meet at the contract, not at a function call across modules.
- **`action` does not import `decision`'s plan-DAG type**; the plan-DAG type is in `contracts` (the `PlanNode` message); both modules import the contract's shape.
- **`gateway` is the only module that imports `litellm`'s SDK** (or the provider-payload shape); the LiteLLM dependency is `gateway`-scoped, not a service-wide dep. The other modules see only the typed seam's output (an `Extract` result, an `Abduce` hypothesis set).

---

## 4. The dependency-direction lint (the arrows enforced)

### The rule
The arrows of the architecture are typed + lint-enforced:
- `web` → `design-system` (one-way; the design-system never imports the frontend).
- `web`, `services/*` → `pkg/contracts` (every consumer of the contract, one-way; the contract imports nothing).
- `services/*` → `libs/{kg,verifier,cedar,crypto,otel}` (down; the libs never import a service).
- `services/*` → `pkg/contracts` → no up (the contract is leaf-bound; nothing imports the contract from "above" because there's nothing above it).
- `services/control-plane` → `services/perception|decision|action|measurement` **only via the gRPC client generated from `contracts/proto/service/**`**; never via a direct import of the service's internal package.
- `gateway` is leaf-only; no service imports `gateway`'s internal types (only the seam's typed contract).

### The enforcement
- **`nx` project graph + the `nx-enforce-module-boundaries` lint** — a forbidden import is a CI-blocked failure (the TS half).
- **`go vet` + a custom `depguard` rule** for the Go half (the boundary rules per service contained in each module's `depguard.yml`).
- **`import-linter`** (Python) for the measurement module's internal boundaries (the estimator package, the conformal package, the federated package).
- A `dependency-cruiser` or `madge` run on the contract graph + a CI assertion that the `contracts` import-arrows are unidirectional.

### The CI discipline
A PR adding a forbidden import is blocked — the lint is the architectural review at the commit layer (`17` §4 extends to imports, not just types). The boundary lint **makes the architecture physical**, not advisory.

---

## 5. The naming conventions

- **Files**: lower-kebab (`llm-gateway.ts`, `probe-fleet.go`, `measurement_window.py` — the last is snake-per-Python-convention, the first two kebab-per-TS/Go-convention; the *module* names are kebab-case across).
- **Modules / packages**: kebab-case (`control-plane`, `decision`, `measurement`).
- **Types / components**: PascalCase, matching the domain vocabulary (`Intervention`, `AtlasCycle`, `SurfaceAssertion`, `ProvenanceRef` — the `06` taxonomy).
- **Functions**: camelCase (TS), snake_case (Python + Go) — language-convention; the *name* is parallel across polyglot (§6 of `22`).
- **Tests**: co-located (`foo.ts` → `foo.test.ts`; `foo.go` → `foo_test.go`; `foo.py` → `test_foo.py`), per language convention; the integration tests in a `__integration__/` subdir per module; the e2e in `e2e/`.
- **Contracts/files**: `entity/v1/asserted_node.proto` — the versioned namespace (`v1`, per the strict-add-only + major-version-bump discipline, `14` §5 + `18` §8); a `v2` is a major-version migration.

---

## 6. The generated-artifact discipline

- **`pkg/contracts/generated/`** is git-ignored. The codegen runs in CI; the published contract package (`@engenox/contracts` for TS, the Go module + the Python package) is published from the codegen's output. A dev runs `buf generate` locally; the output is a typed import, not a checked-in drift surface.
- **The OpenTofu plan + the Kustomize ` overlays`' generated fields** (the sigstore-signed digest, the rotated secret refs) are produced by the CD pipeline (`17` §3), not hand-edited. The `:latest` tag is innately impossible because the image is pinned by digest in the generated manifest.
- **The GraphQL schema** is generated *from* the contract's entity types (a `buf` plugin or a build-step), not hand-written in parallel (§3 of `18`).

---

## 7. The docs + adr coupling (forward-ref, `21`)

- `docs/` is FROZEN; a change post-STOP-CONDITION is `adr/NNNN-<slug>.md` + a doc-update PR (21 §3). The `adr/` number is cited in the coding comments (`22` §5: `// TODO(ADR-NN)`).
- A doc section cross-reference in code (`// 11 §2c`) is stable because the docs are numbered + frozen (a doc-update PR doesn't renumber; it edits a section in place).
- The `datasets/` and `libs/fixtures/` are version-pinned to the docs' fixture conventions (`23` §3g) — a fixture-refresh PR references the doc section.

---

## 8. The branch + monorepo tooling (forward-ref `21`)

- `nx` is the orchestrator; the `nx.json` defines the project graph + the affected-project detection (the `nx affected` command runs only the changed-services' tests; the closed loop's cross-service invariants run on every PR via the gate chain, but the service-specific unit tests run only if that service changed).
- `pnpm-workspace.yaml` lists the TS workspaces; `go.work` the Go modules; `pyproject.toml` (with the uv workspace) the Python projects. The three workspaces coexist; `nx` orchestrates across them.
- The `.github/workflows/` chain calls `nx`-targeted jobs (the contract gate first; the per-service gates next; the cross-service integration gate; the e2e gate; the invariant-test gates).

---

## 9. The project-structure invariants

1. **The tree mirrors the architecture's module boundaries** — `pkg/contracts/` fan-in root, `services/<bounded-module>`, `libs/<shared>`, `infra/<cell>`, `web/` + `design-system/`, `docs/` + `adr/`, `e2e/` + `datasets/`.
2. **`pkg/contracts/` is the only cross-language type source;** generated from Buf Protobuf/JSON-Schema by `buf generate`; published as the contracts package; never hand-written.
3. **Modules are domain-bounded vertical slices; no `utils.ts`/`helpers.go`/`misc.py`;** each module owns its types, persistence, external boundary, workflows, tests.
4. **Dependency arrows are lint-enforced: `web→design-system`, `*→contracts`, `services→libs`, `control-plane→{perception,decision,action,measurement}` only via the gRPC client;** `gateway` is leaf-only; a forbidden import is CI-blocked.
5. **Naming is language-convention but parallel across polyglot (§5 + `22` §6);** the domain vocabulary (`06`) is the only name for each thing.
6. **Generated artifacts (`generated/`, the digest-pinned manifests, the GraphQL schema) are produced by the pipeline, not hand-edited;** `:latest` is impossible by construction.
7. **`docs/` is FROZEN + `adr/` is the change log;** doc-section cross-references in code are stable across doc-updates because the docs are numbered + section-edited in place.
8. **`nx` orchestrates the polyglot build + the affected-project tests;** the three workspaces (pnpm/go-mod/uv) coexist; the CI gate chain calls `nx`-targeted jobs.

---

*End of project structure. Next: `25_IMPLEMENTATION_PLAN.md` — the milestones (each independently deployable), the readiness-closure sequence (Scalability + Security before execute-with-approval; AI-Intelligence before customer-facing lift; Production-Readiness before public self-serve), and the build-nothing-unrequired scope discipline.*
