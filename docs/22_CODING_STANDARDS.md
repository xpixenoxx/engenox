# 22 — Coding Standards

> **Status: FROZEN.** The across-language code-level discipline that the polyglot enterprise survives: **typed everywhere, no `any`, no untyped escape hatches**, the **typed error model** (a `Result`-shaped discipline — no exceptions-into-the-void, no swallowed errors), **immutability-first data**, the **no-silent-upgrade / strict-mode** toolchain, the **parallel-naming-across-polyglot** rule (same concept = same name in TS/Go/Python), the **provenance-every-line** comment discipline (a non-obvious line links the doc section that justifies it), and the contract-package as the single source of every cross-language type. Authored against `09_BACKEND_ARCHITECTURE.md` (the contract spine + the Buf codegen), `21_DEVELOPMENT_GUIDELINES.md`, and `_FOUNDATION_TECH.md` Layer 16. **The bar: a newcomer reads a service file and can trace every type to the contract, every non-obvious line to a doc, every error to a typed handler.**

---

## 1. The single rule

**Every value has a type that traces to the contract; every error is a typed value handled at the boundary that owns its consequence; every non-obvious line carries a doc-pointer comment.** The polyglot enterprise dies by `any`, by `catch (e) {}`, by an untyped `Object` slipped across a service boundary, by a magic number with no link to the doc that justifies it. These standards exist to make the closed loop's invariants *unenforceable to violate at the type level* — the type system is the architecture's first line of defense, ahead of the reviewer.

This section defines the typed discipline, the error model, the immutability-first, the polyglot parallel-naming, the comment convention, and the lints that enforce them.

---

## 2. Typed everywhere, no `any`, no untyped escape hatches

- **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride`, `noFallthroughCasesInSwitch`). The strict tsconfig is the floor, not the ceiling.
- **No `any`, no `unknown`-without-a-refinement, no `as` casts outside a typed boundary.** An `any` slips the type-checker off; it is the gateway to a cross-tenant bug (a `tenant_id` cast to `any` is a `pg_policies` bypass waiting on a refactor). The Biome/ESLint rule `@typescript-eslint/no-explicit-any` is `error`; a genuine need for `unknown` is handled with a type-guard refinement (`is` predicate) at the boundary.
- **The contract package is the only type source across the polyglot tiers** (09 §4). A TS `Intervention` type, a Go `Intervention` struct, a Python `Intervention` pydantic model are all Buf-generated from the one Protobuf/JSON-Schema definition. **No hand-written cross-language type.** A TS dev cannot "add a field" to the local type; the contract PR adds it, codegen regenerates everywhere, forward-compatibility is CI-gated (17 §4).
- **Python:** full type hints, `mypy --strict` (or `pyright` strict — the toolchain decision, `_FOUNDATION_TECH.md` Layer 16) at CI; no bare `dict` / `Any` in signature; pydantic on every model that crosses a boundary (the FastAPI endpoints' request/response, the estimator's IO).
- **Go:** no `interface{}`/`any` in domain types (the `any` alias is acknowledged; the domain types are concrete); the protobuf-generated structs bind the wire; the `error` return is the typed-error channel (§3); the `context.Context` is the cancellation carrier.
- **`Result<T, E>` over throw** (TS) / explicit `error` (Go) / typed exceptions (Python) — see §3.

### The few legitimate escape hatches
- **The DB-driver row** (a Postgres result row) is untyped at the driver boundary; it is refined to a domain type by a typed mapper **at the repository boundary**, never propagated. The mapper has tests proving the mapping (the contract ↔ schema test, `23`).
- **The LLM-gateway's raw JSON** (before the schema-constrained decoding round; the constrained output is typed, but a developer-mode diagnostic may see the raw) is `unknown`-as-`string` explicitly, refined by the verifier (11 §2c) before it ever promotes to a typed seam output. The raw-JSON transit is logged (Langfuse), never typed domain.

---

## 3. The typed error model (no exceptions-into-the-void)

### TypeScript — `Result<T, E>` discipline
- The library: `neverthrow` or a `Result`-shaped pair (the option from `_FOUNDATION_TECH.md` Layer 16, or a hand-rolled discriminated union `{ ok: true, value } | { ok: false, error }`). The discipline: a function that can fail returns `Result`; a function that throws is reserved for **programmer error** (an invariant violation — `assertNever`, a malformed state that should be unreachable).
- **`catch (e) {}` is forbidden.** A swallowed error is a CI-blocked lint. A caught error must either (a) re-throw as a typed domain error after wrapping, (b) return a typed `Result.err`, or (c) be explicitly logged + escalated with a trace_id (§5 observability).
- **The typed error catalog** mirrors the API's `ErrorCode` (18 §7): `VerifierReject`, `DialDenied`, `PlanNotGuess`, `ForeignChangeQuarantined`, `BudgetExhausted`, `IdempotencyConflict`. A domain function returns one of these typed errors; the surface layer maps it to the API's `code` + the `trace_id`.

### Go — the explicit `error` return
- The conventional `func (...) (T, error)` — the caller **must** handle or explicitly `_`-discard (and a `_`-discard is a lint smell; the `errcheck` lint flags it).
- The error is **wrapped** with `fmt.Errorf("%w: <context>", err)` at each boundary; the root cause is traceable via `errors.Is/As`. A `return nil, err` that loses the context is rejected at review.
- The typed error enums (`var ErrVerifierReject = errors.New("verifier reject")` or a sentinel + a typed `VerifierRejectError` struct) are the catalog; the surface layer maps.

### Python — typed exceptions
- A pair of base classes (`EngenoxError` for expected/typed, `EngenoxInvariantError` for programmer-error/invariant-violation). The FastAPI handlers map `EngenoxError` to the typed `code`; an `EngenoxInvariantError` is a 500 + the trace_id + the alert (an invariant violation is a bug, not a customer-facing error).
- `except Exception: pass` is forbidden (the `ruff` rule `BLE001` + a custom rule); a caught exception must re-raise as a typed `EngenoxError` subclass or be explicitly escalated.

### The contract: typed errors travel to the surface; the surface renders candor
A `PlanNotGuess` (budget exhausted) reaching the API surface renders as the candor microcopy (19 §9): "Your daily plan budget is exhausted; the symbolic-only plan ran instead." The error is *part of the contract*, not an afterthought; the typed catalog is the floor.

---

## 4. Immutability-first data

- **TS:** `readonly` on every array/property that isn't mutated; `Readonly<T>` / `as const` on configs and fixtures; `immer` or structural-sharing updates for the rare mutation (the dial-ledger's append, the corpus-row's append). A function that mutates its argument is rejected at review unless it documents the alias.
- **Go:** the `struct` is mutable by default; the discipline is "no cross-goroutine mutation without a documented owner" + the `sync`/`atomic` primitives + the `go vet -copylocks` lint. The Temporal-activity payloads are passed by value (the workflow-history's deterministic replay requires it).
- **Python:** frozen `dataclass` (`@dataclass(frozen=True)`) for every domain type that crosses a boundary; pydantic models are immutable post-construction (`model_config = ConfigDict(frozen=True)`). The estimator's sufficient-statistics are immutable snapshots; the immutable-first is the bi-temporal model's *runtime* form (13 §4 — no destructive update).
- **The data plane is append-mostly + supersession-only** (08, 13): the code-level immutability mirrors the schema-level immutability. A ` tenants.update(...)` is rare + audited; the常态is `insert (... )` + a supersession link.

### The "no silent upgrade" toolchain
- Every dependency is pinned (the `package.json` / `pyproject.toml` / `go.mod` lockfile is committed; `latest` / `*` is forbidden); the Renovate/Dependabot bot opens *review* PRs, never auto-merges; the SBOM (15 §10) is regenerated every release.
- The major-bump of a dependency is an ADR (the cost: a react-19 → 20 bump is a Storybook-review + an RSC-discipline re-check + a security-review; it's not a semaphore-green merge).

---

## 5. The comment + provenance discipline

- **Comments explain the *why***, not the *what* (the *what* is the code, the *why* is the architecture). A comment that paraphrases the code ("// increment i") is noise; a comment that links the doc ("// the in-transaction RLS set: see 15 §3 — the connection-reuse stale-read bug") is the architecture's footprint in the code.
- **Doc-pointer comments are the convention for non-obvious lines.** A blast-radius computation that caps at `canonical`-band below `guarded`-level carries `// Cedar two-pass, 09 §6: canonical is auto-merge-eligible only at autonomous`. A reader finding that line can click the doc.
- **The provenance of a number** — a magic threshold that isn't a token (`20`) and isn't a doc-cited constant is a discipline violation. `if (alerts >= 3)` — the `3` is either a named constant (`DIAL_DEMOTION_ALERT_THRESHOLD` from a config with a doc-reference) or it is bad. The "no magic numbers" rule extends from the design-system tokens to the codebase constants.
- **TODOs are typed:** `// TODO(ADR-NN, <owner>): <what>` — a TODO without an ADR + an owner is `// ???` and is rejected by lint. A TODO is a decision-deferred, not a decision-avoided.
- **The architecture-doc cross-references in code use the doc number + section** (e.g., `// 11 §2c`, `// 08 §5`) — the docs are numbered + frozen, the references are stable.

---

## 6. The parallel-naming-across-polyglot rule

- The same concept has the **same name** across TS/Go/Python, modulo the language's casing convention:
  - `KnowledgeConflict` (TS) / `KnowledgeConflict` (Go) / `KnowledgeConflict` (Python) — the types are identical because Buf-generated.
  - `tenantId` (TS) / `tenant_id` (Go) / `tenant_id` (Python) — the casing differs per language convention; the *name* is identical.
- The discipline is enforced by the Buf codegen (the names come from the Protobuf field names), but **a hand-written domain concept** in one language must be reflected in the others if it crosses a boundary — the lint is "a domain concept present in one language but not the others, when it crosses the boundary, is a refactor PR."
- **No abbreviations except the universal** (`id`, `url`, `ts`, `ci`, `cfg`); `mgr` / `svc` / `px` are forbidden — the reviewer's cognitive load is the cost.
- The closed-loop's domain nouns are **the named vocabulary** (per `06_DOMAIN_MODEL.md`): `AssertedNode`, `SurfaceAssertion`, `KnowledgeConflict`, `Intervention`, `ActionRecord`, `Outcome`, `ProvenanceRef`. These are the *only* names for these things (`AnswerEvent` is not "the response"; `Intervention` is not "the action" — the vocabulary is precise + the code uses it).

---

## 7. The function + module discipline

- **Functions are small + do one thing + are named for what they return or assert** (not for what they do — `hasBudgetExhausted(t)` over `checkBudget(t)`).
- **Modules are bounded by domain, not by layer** — the `intervention` module owns the `Intervention` type + its validation + its persistence + its serialization, *not* "the models" + "the services" + "the utils" layered dirs (the project structure, `24`, is domain-bounded with a per-domain vertical slice). The closed-loop's the domain — `perception`, `decision`, `action`, `measurement`, `governance`, `memory`, `gateway` — are the module boundaries.
- **No `utils.ts` / `helpers.go` / `misc.py`.** A bag of unrelated functions is a missing module; a function in `utils` is re-homed to the domain that owns its concept. `formatCandorStat` belongs in the design-system (a pattern, `20`), not `utils`.

---

## 8. The test-code standards (forward-ref `23`)

- **Tests are typed too.** A test's arrange/act/assert uses the domain types; a test with `as any` fixture is rejected — the fixture builders are typed (the ` TestData.Builder` pattern).
- **Tests assert behavior, not implementation** (a closed-loop invariant is tested as "the cycle emits a corpus row tagged `foreign_change_status=period-invalid` when the EWMA trips," not as "the `quarantine` private method was called"). The implementation can refactor; the invariant is stable.
- **The fixtures are the source of the tests' determinism** (`21` §5); a test depending on a live surface is a CI-blocked smell (the live-surface test runs in the nightly integration env, not the unit suite).
- **Property tests over example tests where the invariant is a property** (the dial-escalation requires all 3 axes — a property test generates random ledger states + asserts the escalation decision; more thorough than 3 hand-written examples).

---

## 9. The lints that enforce the standards (CI-blocked)

| Standard | Lint / tool |
|---|---|
| TS strict + no `any` | `tsconfig` strict + `@typescript-eslint/no-explicit-any` Biome/ESLint rule |
| No `catch {}` swallow | `@typescript-eslint/no-useless-catch` + a custom rule for empty catch |
| No magic numbers in UI | Tailwind v4 `@theme` (no inline tokens); `20` |
| No magic numbers in code | A custom lint flagging numeric literals outside a named-constant + a config |
| TS frozen data | `readonly` lint + `prefer-readonly` |
| Python strict typing | `mypy`/`pyright` strict; `ruff` |
| Python no bare except / no `Any` | `ruff` `BLE001`, `ANN`, a custom `no-Any` rule |
| Go `errcheck` + `copylocks` + `gofmt` | `golangci-lint` |
| No `latest` dependencies | Renovate range-strict + a CI check |
| TODOs must link an ADR | A custom Biome/`grep` rule on TODO + ADR id |
| Conventional commits | `commitlint` |
| Cross-language name parity | The Buf codegen (the contract is the single source) + a CI assertion on the generated-package consistency |

---

## 10. The coding-standards invariants

1. **Typed everywhere; no `any`/`unknown`-without-refinement/`as` casts; the contract package is the only cross-language type source.** Hand-written cross-language types are a discipline violation.
2. **Typed error model: `Result` in TS, explicit `error` in Go, typed exceptions in Python; no swallowed errors; the typed error catalog mirrors the API `ErrorCode`.**
3. **Immutability-first: `readonly` / frozen dataclasses / pass-by-value in Temporal; the code-level immutability mirrors the schema's append-mostly + supersession-only.**
4. **No silent upgrades: dependencies pinned; Renovate PRs not auto-merge; major-bumps are ADRs.**
5. **Comments explain the *why*; non-obvious lines carry a doc-pointer (`// 11 §2c`); TODOs are typed (`TODO(ADR-NN, owner)`); no magic numbers.**
6. **Parallel-naming across polyglot: same concept = same name (modulo casing); the domain vocabulary (`06`) is the only name for each thing; no abbreviations except universal; no `utils.ts`/`helpers.go`.**
7. **Modules are domain-bounded vertical slices (perception / decision / action / measurement / governance / memory / gateway), not layer-bounded directories.**
8. **Tests are typed, assert behavior not implementation, use deterministic fixtures, prefer property tests for invariants.**
9. **The lints above are CI-blocked, not advisory.**

---

*End of coding standards. Next: `23_TESTING_STRATEGY.md` — the test pyramid + the closed-loop invariants' tests (RLS canary-row, idempotency, dial property, verifier-reject, foreign-change-quarantine, golden-probe regression, three-sinks reconciliation, the restore test, the warm-canary eval divergence).*
