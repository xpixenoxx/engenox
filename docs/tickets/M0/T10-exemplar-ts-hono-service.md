# T10 — Golden-path exemplar: TypeScript / Hono service

> **Tier:** 2 (an exemplar — cell operability + the reference the AI author copies) | **Status:** pending | **Milestone:** M0
> **Cites:** `28` §4 (golden-path exemplars — one reviewed reference of each pattern) · `22_CODING_STANDARDS.md` (the standards the exemplar encodes) · `CODING_STANDARDS.md` (E07) · `24` §2 (`services/<name>/` shape) · `CLAUDE.md` §4 (contract-spine-first) + §6 (TS strict) · `ADR-0001` (Hono 4) · T02 (the contracts the exemplar imports) · T03 (the dep lint the exemplar passes) · T06 (the CI gates the exemplar runs)

## Objective

Ship the **TypeScript / Hono golden-path exemplar** — one reviewed reference service (`services/perception/` or `services/control-plane/` — pick the lower-blast-radius one) that encodes every TS pattern the AI author must copy: contract-spine-first imports from `@engenox/contracts`, `tsc --strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`, `Result<T,E>` (neverthrow) at every fallible boundary, the structured-handler pattern, the OTEL spans, the error contract (never leak internals), the no-`utils.ts` rule, Biome 2 format/lint green, and a passing contract-gate. The AI author's M1+ services copy this skeleton, not an invention. The exemplar is reviewed, not just working.

## Dependencies

- **Tickets:** T02 (the contract package — the exemplar imports `@engenox/contracts`), T03 (the dependency-direction lint — the exemplar passes it; the exemplar is the positive case), T06 (the CI gates — the exemplar runs green through the chain).
- **External:** Hono 4, neverthrow, `@opentelemetry/api`, `@buf/protocol, the Biome 2 config from T01.

## Files

- `services/perception/package.json` — the service package (named `@engenox/perception`); declares the dep on `@engenox/contracts`, Hono 4, neverthrow, OTEL; **no service-to-service deps** (T03's contract-leaf rule — a service is a leaf; it imports contracts + libs, not siblings).
- `services/perception/tsconfig.json` — **the golden-path TS config** (the one every TS service copies): `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`, `isolatedModules: true`, the `@engenox/contracts` path alias, `verbatimModuleSyntax: true`. This is the exemplar's most-copied file.
- `services/perception/src/index.ts` — the entrypoint; `serve({ fetch: app.fetch, port })` (Hono 4's shape — verify against context7 per T09).
- `services/perception/src/routes/assert.ts` — one contract-typed route (`POST /v1/perception:assert`) that takes the `AssertRequest` from `@engenox/contracts`, returns `Result<AssertResponse, PerceptionError>`; the handler never throws across the boundary — `Result` carries the error, the error is a contract enum (`PERCEPTION_FAILED`/`CONTRACT_VIOLATION`), never an internal-message leak.
- `services/perception/src/handler.ts` — the structured handler: an `app.post('/v1/perception:assert', zValidator('json', AssertRequestSchema), async (c) => …)` that validates the request, opens an OTEL span, calls the (stub) domain logic, maps the `Result` to an HTTP response. The stub returns `Ok` for the golden path — the real logic lands at M1+.
- `services/perception/src/errors.ts` — the error contract: an `AppError` discriminated union (`{ kind: 'PERCEPTION_FAILED', ...) | { kind: 'CONTRACT_VIOLATION', ... }`) + the `toHttpStatus` map. No `Error.message` reaches the wire — the wire carries the contract enum.
- `services/perception/src/domain/assert.ts` — the (stub) domain function: `(req: AssertRequest) => Result<AssertResponse, AppError>`. Pure, no I/O; the stub is the skeleton the real logic fills.
- `services/perception/test/assert.test.ts` — the golden-path test: a green-path `.assert()` returns `Ok`; a contract-violation returns `Err(PERCEPTION_FAILED)`; the handler maps each to a 200/4xx; the test asserts the wire shape (status + body) not the internal `Result`.
- `services/perception/biome.json` — imports the repo-root Biome config; no per-service overrides that weaken (a per-service override is a watchdog-category-4 smell).
- `services/perception/README.md` — the "how to copy this exemplar" doc: the file-by-file walkthrough, the patterns to copy (Result, structured handler, error contract, contract-typed route), the patterns NOT to copy (no utils.ts, no service-to-service import, no `any`).
- A Drakefile/nx-target entry — `lint`, `test`, `typecheck` targets the T06 chain calls via `nx affected`.

## Acceptance criteria

- [ ] `tsc --noEmit` is green under the golden-path `tsconfig.json` (`strict` + `noUncheckedIndexedAccess` + the suite).
- [ ] The contract import compiles: `import { AssertRequest } from '@engenox/contracts'` (or the `@buf/protoc-gen-es` generated import per T02) resolves + the route's `zValidator` uses the contract's schema.
- [ ] No `any` in the exemplar (Biome's `noExplicitAny` is on + passes).
- [ ] No `utils.ts`/`shared.ts`/`helpers.ts` in the exemplar (watchdog category 4 — the no-utils rule).
- [ ] The handler never leaks an `Error.message` to the wire — the wire shape is the contract enum (verified by the error test).
- [ ] The exemplar passes the dependency-direction lint (T03): no `import … from '@engenox/control-plane'` (a leaf imports contracts + libs, not siblings).
- [ ] The exemplar runs green through the T06 CI chain (contract-gate first — the contracts compile; then lint/test/typecheck).
- [ ] The OTEL span is present on the handler path (the span name + the traceparent propagation).
- [ ] The structured-output route is versioned `/v1/…` (the contract-spine convention —v1 protocols match the `pkg/contracts/proto/engenox/<domain>/v1/` packages).
- [ ] The README walks the copy-pattern for the AI author + the founder — this file is the teaching surface, not just docs.

## Tests

- **Typecheck green:** `tsc --noEmit` on the exemplar is clean under strict.
- **Golden-path test:** `assert.test.ts` — a green-path assertion returns 200 + the contract body; a contract-violation returns the 4xx + the contract error code.
- **No-leak test:** a forced internal error does NOT surface `Error.message` in the response body (assert the body has only the contract enum `kind`).
- **Lint green:** `biome check services/perception` passes with zero suppressions (no `// biome-ignore` without a rule + reason).
- **Dep-lint green:** the exemplar is a contract-leaf (no sibling-service import) — T03's `import-linter`/`nx-enforce-module-boundaries` passes.
- **Contract-gate green:** the exemplar's CI run through T06's `contract-gate` is green (the contracts it imports compile + `buf breaking` against the M0 baseline holds).

## Definition of Done

- [ ] Every acceptance criterion closed; the typecheck + golden-path + no-leak + lint + dep-lint + contract-gate tests green.
- [ ] Coding standard met: the exemplar is the embodiment of `CODING_STANDARDS.md` (E07) §1–§7 — every pattern there is shown here, once.
- [ ] Review passed at Tier 2 (single adversarial reviewer + the watchdog): Correctness (the route works; the `Result` is correct), Architecture-alignment (the exemplar matches `24` §2 + `CLAUDE.md` §4 + `22`), Stack-drift (Hono 4's current shape per context7 — not a stale Hono 3 pattern), Security (no internal leak; the error contract is tight), Candor-floor (the stub is labeled a stub, not "substantially implemented").
- [ ] The AI author can copy this exemplar for M1+ TS services (`/scaffold-ticket` → copy → fill).
- [ ] Stack-drift watchdog green: no `any`, no `utils.ts`, no sibling import, no budget_tokens API shape (if the exemplar touches the LLM seam — it shouldn't here), no `:latest` image tag in any Dockerfile.
- [ ] Docs updated: the `services/perception/README.md` (the copy-pattern doc); the repo-root `CLAUDE.md` §11 points to this exemplar as the TS golden path.
- [ ] Checkpoint written; commit-ready (`feat(exemplar): T10 — the TS/Hono golden-path exemplar (contract-first, Result, no-leak, strict)` with `Refs: 22, CLAUDE.md §4, ADR-0001`).

## Estimated complexity

**L — ~1.5 days.** The risk is the exemplar's *teaching quality* — this file is the reference the AI author copies; a mediocre exemplar propagates mediocre patterns. The mitigation: review it at Tier 2 with an adversarial "would I copy this?" lens; the no-utils + no-leak + Result patterns are the three must-haves.

## Notes for the implementer

- **The exemplar is a reviewed *reference*, not a real service.** The stub domain logic returns `Ok` on the golden path; M1+ fills it. Do not build the real perception pipeline here — that's an M1 ticket (TBD). The exemplar's job is to encode the *shape* the real services copy.
- **Use context7 (T09) to verify Hono 4's current shape.** Hono 4's `app.fetch` + `zValidator` + the `serve` import have drifted from Hono 3; a stale Hono 3 pattern is a watchdog category-2 hit (stale API shape) + the whole point of the context7 install (T09). Verify before writing.
- **The error contract is the most-copied file.** Every TS service needs the "never leak `Error.message` across the boundary" pattern. Encode it once, here, well — the discriminated-union `AppError` + the `toHttpStatus` map. The AI author copies `errors.ts` verbatim into new services.
- **No `utils.ts`.** The watchdog (T07) flags `utils.ts`/`shared.ts`/`helpers.ts`; if you find yourself wanting a shared file, the answer is a named module (`errors.ts`, `domain/assert.ts`) — never `utils`. The no-utils rule (`22` §4 + E07 §4) is encoded by this exemplar's file naming.
- **The route is versioned `/v1/…`.** This matches the contract package's `proto/engenox/<domain>/v1/` convention — the wire protocol version is the contract version. A `/perception/assert` (un-versioned) route is a contract-spine violation (watchdog category 3).
- **The exemplar is Tier 2, but its review touches Tier-1 patterns.** A loose exemplar (one that leaks `Error.message`, or copies `any`, or imports a sibling service) propagates to every M1+ TS service — the blast radius is the whole TS fleet. Review it as if it were Tier-1 for the pattern-correctness lenses (Correctness, Stack-drift, Security); the Tier-2 designation reflects that the *file itself* is operability not the moat — but the patterns it teaches are moat-load-bearing.
