# Coding Standards (execution layer)

> **Status: FROZEN.** The execution-layer coding standards. It does **not** re-derive the standards — those live in the frozen `22_CODING_STANDARDS.md` (each §N is stable). It **operationalizes** them: the lint stack, the contract-codegen workflow, the per-language Result pattern, the doc-pointer convention in code, the escape-hatch policy. Authored against `22` (frozen standards) + `CLAUDE.md` §4/§5/§6 (the condensed root form) + `29_STACK_VERIFICATION.md` §6 (the toolchain pins) + `24_PROJECT_STRUCTURE.md` §2 (the polyglot module boundaries).

---

## The relationship: this doc points, `22` governs

- **`22_CODING_STANDARDS.md`** is the frozen standard — the *what* and the *why*.
- **`CLAUDE.md` §6** is the condensed form the agent reads every session.
- **This doc** is the *how it's enforced* — the lint config, the workflow, the convention-in-code, the escape-hatch gate. When this doc and `22` overlap, `22` governs; this doc adds the execution teeth.

A code-style debate ends at `22`. An enforcement gap ends here.

---

## §1. Contract-spine-first (the load-bearing rule)

The contract package `pkg/contracts/` is the **only** cross-language type source. (`CLAUDE.md` §4)

- Cross-language types are authored once in `pkg/contracts/proto/**/*.proto` (or `.fbs`, whichever the M0 Buf schema settles) and generated into all four languages via `buf generate`. A hand-written cross-language type is a blocker.
- The dependency direction is **downward only**: `services/*` and `apps/*` depend on `pkg/contracts`; `pkg/contracts` depends on nothing in the repo. The dependency-direction lint enforces this on every PR.
- `services/*` never imports another service's internals — a service boundary is a contract boundary. Cross-service calls go through the contract types + an interface the gateway mediates.
- The LLM gateway is **leaf-only**: it calls the LLM providers and the Constrained-decode lib; nothing calls the gateway except the seams. No service imports the gateway's internals.
- `buf breaking` runs on every PR against the last released contract — a breaking change to a contract that a deployed service consumes is a Tier-1 review item (`20`/`24` boundary), not a silent edit.

## §2. Typed everywhere — per language

The frozen invariant is *no untyped seams* (`22` §3). Execution form, per language:

- **TypeScript:** `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. `any` is a lint error; the legitimate escape hatch (`§9`) is `unknown` + a narrowing function, never `any`. Inference is preferred; explicit annotations only on public-API surfaces and where inference widens. (`29` §6)
- **Go:** types are the language; the standard is *no `interface{}`/`any` in public APIs* unless the contract-codegen produced it, and *no panics across a service boundary* — a panic is confined to the package that owns the invariant (`22` §3). Generics are used where they remove a hand-rolled equivalent.
- **Python:** `mypy --strict` is the typecheck gate; `pyproject.toml` pins it. No `Any` in public API; where unavoidable (FFI, third-party untyped libs) the `Any` is annotated `# type: ignore[...]  # 11 §2c` with the reason + doc-pointer. `from __future__ import annotations` everywhere. (`29` §6)
- **Rust (if/where introduced):** the contract-codegen output dictates the type surface; `clippy` is green at the `-D warnings` level.

A type gap closes at the gate, not in review-by-debate: the lint fails, the author fixes, the reviewer verifies.

## §3. Errors as values — Result<T, E> everywhere it isn't idiomatic

The invariant (`22` §4): **errors are values, not control flow.** Exceptions/panics do not cross a service boundary; a boundary returns a typed error the caller handles.

- **TypeScript:** `neverthrow` (`Result<T, E>`, `ResultAsync<T, E>`) for operations that can fail at a boundary. `throw` is reserved for *programmer* errors (a violated invariant the code cannot recover from), not *domain* errors. No `try/catch` that swallows; a catch must either rethrow, convert to a `Result.err`, or log+propagate with the error typed.
- **Go:** idiomatic `(T, error)` is the Result pattern; `errors.Is`/`errors.As` for typed errors; `errors.Join` for accumulation. A returned `err` is never ignored (`if err != nil` or `// 11 §2c explicitly-ok: <reason>`). The `golangci-lint` `errcheck` + `errorlint` lint set is green.
- **Python:** the `returns` library (`Result[T, E]`, `Maybe`) for boundary operations. `raise` is reserved for programmer errors and unrecoverable invariant violations; a domain failure is a `Result.failure`, not an exception. `mypy` verifies the Result is consumed.
- **The error type is structured.** A boundary error carries a stable code + a human-readable message + the originating doc-pointer/ADR cite, so the trace (Langfuse/OTel, `25`/`29` §6) round-trips a failure to its seam.

## §4. Naming + the no-utils rule

- **No `utils.ts` / `helpers.go` / `misc.py` / `shared.ts` catch-alls** (`CLAUDE.md` §5). A file named for a grab-bag is a file with no invariants. A function lives in a module named for its concern; if you can't name the module, the function belongs elsewhere or doesn't exist yet.
- **Naming is stable across languages for contract types** — the `buf generate` output uses the same surface names in TS/Go/Python/Rust so a contract type is recognizable across the polyglot tree.
- **Booleans name the true case:** `isVerified`, `shouldCommit`, `hasContrarianBlock` — never `flag` or `status` (a boolean named `status` is a magic-number-in-waiting).
- **Distance from the truth tx tier is named in the type:** an `AssertionView` (the only bi-temporal read path, `13`) is not a `Row`; naming the projection apart from the source prevents the drift where a reader mistakes a view for the spine.

## §5. Comments — the doc-pointer, the ADR cite, the explain-why

- **Comments explain *why*, not *what*; the *what* is the code.** A comment that restates the code is removed; a comment that records a non-obvious constraint stays.
- **A doc-pointer is stable across doc edits**: `// 11 §2c` points to `11_AI_ARCHITECTURE.md` §2c, and stays valid because docs are numbered + section-edited in place (`21` §3, `24` §7). Frozen docs are never rewritten, so the pointer is a contract.
- **An ADR citation is added in code as `// ADR-NN`** when the code follows a choice an ADR supercedes, or `TODO(ADR-NN, owner)` when the ADR's closure work is not yet done (`22` §5). A `TODO(ADR-0003, infra/sre)` on the cell template marks the closure-work the ADR created.
- **No magic numbers.** A constant is named + its provenance cited: `const MAX_CRITIQUE_LATENCY_MS = 1200; // 25 §4 (the <2ms p99 invariant decomposed; the Critic budget is half)` — not `1200`.
- **Removed code is removed; deleted code is not commented out.** Git is the history.

## §6. Immutability + the data-on-the-wire rules

- **Immutability-first** (`22` §6). Inputs to a seam are `readonly` (TS `Readonly<T>` / `as const`; Go — prefer value types + slices-as-args-not-mutated; Python — `frozen=True` dataclasses, `tuple` over `list` for inputs). A seam mutates nothing it was not the owner of.
- **The wire is immutable.** A contract type round-trips through `buf generate`; its serialization is stable. A field is added, not renamed; a renamed field goes through `buf breaking` + a Tier-1 review.
- **Time is bi-temporal** (`13`/`06`). A write carries `valid_from` / `valid_to` (the assertion's real-world validity) and `tx_time` (when the assertion entered the spine). "Now" is never an implicit column; the system records when it believed a thing and when that thing was true, separately.

## §7. Public-API surface rules

- **A service exposes a contract API and an internal tree; the internal tree is not importable across services.** The dependency-direction lint is the backstop.
- **A public function publishes its failure modes in its signature** (the `E` in the `Result<T, E>`, or the typed `error` in Go). A function that can fail in a way the caller cannot see from the signature is wrong.
- **No silent coercion across the seam.** An LLM seam that emits structured output parses it via the constrained-decoding schema (`§1`); a `JSON.parse`-then-pray on an LLM output is a blocker. The seam either succeeds with a schema-valid object or returns a typed `Result.err`.

## §8. The lint / format / test stack (per language) — enforced on every PR

| Language | Format | Lint | Typecheck | Tests |
|---|---|---|---|---|
| TypeScript / web | Biome 2 (`biome format`) | Biome 2 (`biome lint --error-on-warnings`) + the dependency-direction lint | `tsc --noEmit` strict | Vitest + Playwright |
| Go | `gofmt` (via `gofumpt`) | `golangci-lint` (errcheck, errorlint, staticcheck, gosec, depguard for the no-cross-import rule) | the compiler | `testify` + `go test -race` |
| Python | `ruff format` | `ruff` (E, F, I, UP, ANN, RET, SIM; the `ruff` rule set pinned in `pyproject.toml`) | `mypy --strict` | `pytest` |
| Rust (if introduced) | `rustfmt` | `clippy -D warnings` | the compiler | `cargo test` |

- **Pre-commit runs the format + the dependency-direction lint; CI runs the full stack.** Format-only fixes never block; lint failures always block.
- **A skipped lint is a recorded skip, not a silent one** — the suppression cites the doc-pointer or the ADR (`// ADR-NN`), and the stack-drift watchdog (E16) flags any unsuppressed-skip pattern.
- **The contract gate** (`buf breaking` + `buf generate` clean across all four languages) is the *first* CI step; nothing else runs until the contract spine is intact.

## §9. The escape-hatch policy (deviating legitimately)

A frozen standard + a verified stack means deviation is the exception, and the exception is **documented**, not smuggled.

- **A legitimate escape hatch names the invariant it suspends, the ADR that authorizes it, and the date it retires.** `// ADR-NN, owner: <reason>, retires <date-or-never>`. An escape hatch without an ADR is technical debt that failed the gate; an escape hatch without a retirement path is a permanent downgrade misnamed as temporary.
- **The harness `dangerouslyDisableSandbox`-equivalent is not used in product code.** Forced-tool bypasses are for the enforcement environment's own scripts, not for the service tree.
- **A `// type: ignore`, a `// nolint`, a `# noqa`** must carry the rule code + the reason: `# type: ignore[arg-type]  # 11 §2c: third-party untyped FFI`. A bare `# noqa` is a blocker.
- **The escape hatch is reviewable at the tier of the thing it breaches** (`REVIEW_STANDARDS.md`, E08): an escape hatch in contracts / action / gateway / verifier / cedar / crypto / kg / RLS / migrations is a Tier-1 review item, always.

## §10. What this doc is not

- It is **not** a re-derivation of `22` — the *why* lives there.
- It is **not** the review standard — that is `REVIEW_STANDARDS.md` (E08). This doc defines the *gate*; the review standard defines the *judgement* applied at the gate.
- It is **not** the Definition of Done — that is `DEFINITION_OF_DONE.md` (E09). A change can meet the coding standard and still be not-done.
- It is **not** static — the lint rule sets are pinned in the per-language config files; a rule-set bump is a PR with this doc's table updated (the version pin is part of the freeze).

---

*End of coding standards. Next enforcement artifact: review standards (E08, `docs/enforcement/REVIEW_STANDARDS.md`).*
