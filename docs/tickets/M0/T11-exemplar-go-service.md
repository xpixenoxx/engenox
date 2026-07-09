# T11 — Golden-path exemplar: Go service

> **Tier:** 2 (an exemplar — the reference the AI author copies) | **Status:** pending | **Milestone:** M0
> **Cites:** `28` §4 (golden-path exemplars) · `22_CODING_STANDARDS.md` · `CODING_STANDARDS.md` (E07) · `24` §2 (`services/<name>/` shape) · `CLAUDE.md` §4 + §6 (Go: no `interface{}`, no panics across a boundary) · `ADR-0001` (Go 1.24+) · T02/T03/T06

## Objective

Ship the **Go golden-path exemplar** — one reviewed reference service (likely `services/action/` or `services/gateway/`) that encodes every Go pattern the AI author copies: contract-spine-first imports from the `buf`-generated Go package, `(T, error)` at every fallible boundary with `errors.Is`/`errors.As` discrimination (no `interface{}` for errors), no `interface{}`/`any` where a typed contract exists, no `panic` across an API boundary, structured logging via `slog` with OTEL spans, the error mapping to the wire contract, `golangci-lint` green with `depguard` (T03) enforcing the contract-leaf rule, and a passing contract-gate. The real Go services (gateway, action) copy this skeleton at M1+.

## Dependencies

- **Tickets:** T02 (the contract package — the generated Go module `buf` produces), T03 (the dep-direction lint — `depguard` rules + the `go.work` workspace), T06 (the CI gates).
- **External:** Go 1.24+ (T01's mise), `golangci-lint`, the `buf` Go plugin, `slog`, OTEL Go SDK.

## Files

- `services/action/go.mod` — the service module (`github.com/pixenox/engenox/services/action`); declares the dep on the generated contracts module (`github.com/pixenox/engenox/pkg/contracts/go`) via the `go.work` workspace (T01); **no service-to-service deps** (T03's contract-leaf rule).
- `services/action/cmd/action/main.go` — the entrypoint; constructs the deps (`slog`, OTEL, the contract-typed handler), starts the server (`net/http` or a Hono-equivalent — verify the current Go 1.24 idiom via context7 per T09).
- `services/action/internal/server/server.go` — the HTTP server wiring; the structured handler that validates the contract request, opens a span, calls the domain, maps the `(T, error)` to the wire.
- `services/action/internal/handler/assert.go` — one contract-typed handler: takes the generated `engenox.action.v1.AssertRequest`, returns `(engenox.action.v1.AssertResponse, *AppError)`. The handler never returns a raw `error` to the wire — `*AppError` is the discriminated error type.
- `services/action/internal/domain/assert.go` — the (stub) domain function: `func Assert(ctx context.Context, req *v1.AssertRequest) (v1.AssertResponse, *AppError)`. Pure, no I/O; the stub returns `(ok, nil)` on the golden path. M1+ fills the real action-issuing logic (the action seam that can never commit — `28` §B).
- `services/action/internal/errors/errors.go` — the error contract: a typed `AppError` with `Kind` (`PerceptionFailed`/`ContractViolation`) + the `HTTPStatus()` method. No `err.Error()` string reaches the wire — the wire carries the contract enum. Uses `errors.Is`/`errors.As` for discrimination.
- `services/action/.golangci.yml` — imports the repo-root `golangci-lint` config (T01); enables `depguard` (T03) to forbid sibling-service imports + `go vet` + `staticcheck` + `errcheck` (no `// nolint` without a rule + reason — watchdog category 4) + `gocritic` + `revive`.
- `services/action/internal/handler/assert_test.go` — the golden-path test: a green-path `Assert` returns `(ok, nil)`; a contract violation returns `(zero, AppError{Kind: ContractViolation})`; the handler maps each to a 200/4xx; the test asserts the wire shape.
- `services/action/README.md` — the "how to copy this exemplar" doc: the file-by-file walkthrough, the patterns to copy (`(T, error)` discrimination, the typed contract import, `slog` + OTEL, no `interface{}`, no `panic` across boundary), the patterns NOT to copy (no sibling import, no `err.Error()` to the wire, no `// nolint` without a reason).
- An nx-target entry — `lint` (`golangci-lint run`), `test` (`go test ./...`), `build` (`go build ./...`).

## Acceptance criteria

- [ ] `go build ./...` is green; `go vet ./...` is clean.
- [ ] `golangci-lint run` is green with zero `// nolint` suppressions without a rule code + reason + doc-pointer (watchdog category 4).
- [ ] No `interface{}`/`any` where a typed contract exists; `interface{}` is permitted only where Go truly requires it (verify the `go vet` `ifacecheck`-equivalent or `gocritic` `redundantType` — the exemplar uses the typed contract everywhere it can).
- [ ] No `panic` across an API boundary (handler/domain/server) — `panic` is reserved for truly-unrecoverable init only.
- [ ] The error path returns `*AppError` (the typed discriminated error), never a bare `error` to the wire; `err.Error()` never reaches the response body.
- [ ] The contract import compiles: `import engenoxactionv1 "github.com/pixenox/engenox/pkg/contracts/go/engenox/action/v1"` (the path `buf generate` produces per T02) resolves.
- [ ] The exemplar passes T03's dep-direction lint (`depguard`): no `import "github.com/pixenox/engenox/services/perception"` (a leaf imports contracts + libs, not siblings).
- [ ] The exemplar runs green through the T06 CI chain (contract-gate first; then `go build`/`go test`/`golangci-lint`).
- [ ] `slog` structured logging is present; OTEL spans on the handler path.
- [ ] The route is versioned `/v1/…`.
- [ ] The README walks the copy-pattern — the teaching surface.

## Tests

- **Build + vet green:** `go build ./...` + `go vet ./...` clean.
- **Golden-path test:** `assert_test.go` — a green path returns 200 + the contract body; a contract violation returns 4xx + the contract error code.
- **No-leak test:** a forced internal `fmt.Errorf("…secret…")` does NOT surface that string in the response body (assert the body has only the contract `Kind`).
- **No-panic test:** no `panic(` call in `internal/handler/`, `internal/domain/`, `internal/server/` (grep-asserted).
- **Lint green:** `golangci-lint run services/action` passes with zero bare `// nolint`.
- **Dep-lint green:** `depguard` passes — the exemplar is a contract-leaf.
- **Contract-gate green:** the exemplar's CI run through T06's `contract-gate` is green.

## Definition of Done

- [ ] Every acceptance criterion closed; the build/vet/golden-path/no-leak/no-panic/lint/dep-lint/contract-gate tests green.
- [ ] Coding standard met: the exemplar is `CODING_STANDARDS.md` (E07) §1–§7 embodied for Go; the `(T, error)` + `errors.Is`/`As` + no-`interface{}` + no-`panic` patterns are all shown once.
- [ ] Review passed at Tier 2 (single adversarial reviewer + the watchdog): Correctness (the handler is correct; the error mapping is right), Architecture-alignment (the exemplar matches `24` §2 + `CLAUDE.md` §6), Stack-drift (Go 1.24 idiom — verify `slog` + the `net/http` current shape via context7 per T09), Security (no internal leak; the error contract is tight), Candor-floor (the stub is labeled a stub).
- [ ] The AI author can copy this exemplar for M1+ Go services (the gateway + the action seam copy this skeleton).
- [ ] Stack-drift watchdog green: no `interface{}` where a contract exists, no `panic` across boundary, no bare `// nolint`, no sibling import.
- [ ] Docs updated: the `services/action/README.md` (the copy-pattern doc); `CLAUDE.md` §11 points to this exemplar as the Go golden path.
- [ ] Checkpoint written; commit-ready (`feat(exemplar): T11 — the Go golden-path exemplar ((T,error), typed contracts, no-panic-across-boundary)` with `Refs: 22, CLAUDE.md §6, ADR-0001`).

## Estimated complexity

**L — ~1.5 days.** The risk is the `golangci-lint` config + the `depguard` rules (T03 owns the rule set, but the exemplar must be the canonical positive case) + the error-discrimination idiom (`errors.Is`/`As` + the typed `AppError`). The mitigation: the exemplar is the *positive* test case for T03's lint — if T03's rules pass on this exemplar, the rules are calibrated.

## Notes for the implementer

- **The exemplar is the action seam's skeleton.** The action seam is the one that can never commit (`28` §B); the exemplar's stub `Assert` returns `(ok, nil)` — never a commit. M1+ fills the real "propose, don't commit" logic. Do not build the commit path here — the constitution forbids it even in stub form.
- **Use context7 (T09) to verify Go 1.24 idioms.** Go 1.24's `slog` + `net/http` server shape + the `range-over-int` + the `go vet` analyzer list — verify the current idiom before writing. A Go 1.20 idiom is a watchdog category-2 (stale API) hit since Go is the stack's pin (`ADR-0001`).
- **The `depguard` rules are exemplar-driven.** T03 authors the rules; this exemplar is the positive case that proves they pass. If the exemplar fails `depguard`, the rule is too tight — fix the rule (T03), not the exemplar. The exemplar is the calibration target.
- **No `interface{}` where a contract exists.** The `any` (Go 1.18+ alias for `interface{}`) is permitted only for truly-generic Go stdlib APIs (`context.Context` value bags, etc.); everywhere a `buf`-generated type exists, the exemplar uses it. The reviewer (Stack-drift lens) checks this.
- **The error contract file is the most-copied.** `internal/errors/errors.go` — the `AppError` + `Kind` + `HTTPStatus()` — is the file every Go service copies. Encode it once, here, well. The contract enum on the wire mirrors the contract `.proto` error codes (T02).
- **No `panic` across an API boundary.** A `panic` in a handler/domain/server is a contract-spine violation (the wire would return a 500 with no contract shape). Reserved for `main.go` truly-unrecoverable init (e.g., a missing required env at startup).
- **The exemplar is Tier 2 but the patterns it teaches are moat-load-bearing** (the action seam + the gateway are the moat). Review the pattern-correctness lenses as if Tier-1.
