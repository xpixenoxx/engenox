# T12 — Golden-path exemplar: Python / FastAPI service

> **Tier:** 2 (an exemplar — the reference the AI author copies) | **Status:** pending | **Milestone:** M0
> **Cites:** `28` §4 (golden-path exemplars) · `22_CODING_STANDARDS.md` · `CODING_STANDARDS.md` (E07) · `24` §2 (`services/<name>/` shape) · `CLAUDE.md` §4 + §6 (Python: `mypy --strict` + `pydantic frozen` + `returns`) · `ADR-0001` (Python 3.12/3.13 + FastAPI) · T02/T03/T06

## Objective

Ship the **Python / FastAPI golden-path exemplar** — one reviewed reference service (likely `services/measurement/` or `services/decision/`) that encodes every Python pattern the AI author copies: contract-spine-first imports from the `buf`-generated Python package, `mypy --strict` + `pyright` clean, `pydantic(frozen=True)` for every model, `Result` (the `returns` library) at every fallible boundary — **no `try/except` swallowed errors** (`LOG_ERROR`/`EngenoxError` vs `EngenoxInvariantError`), structured logging via `structlog` with OTEL spans, the error mapping to the wire contract, `ruff check` + `ruff format` + `mypy --strict` green, and a passing contract-gate. The real Python services (measurement, decision) copy this skeleton at M1+.

## Dependencies

- **Tickets:** T02 (the contract package — the `buf`-generated `engenox_*_v1` Python package), T03 (the dep-direction lint — `lint-imports`/`import-linter` for Python), T06 (the CI gates).
- **External:** Python 3.12/3.13 (T01's mise), FastAPI, `pydantic` 2, `returns`, `structlog`, `@opentelemetry/api`, `uv` (the package manager from T01), `ruff` + `mypy`.

## Files

- `services/measurement/pyproject.toml` — the service package; declares the dep on the generated contracts package (`engenox-contracts` per T02's `uv` publish), FastAPI, pydantic 2, `returns`, structlog, OTEL; the dev-deps `ruff` + `mypy` + `pytest`; **no service-to-service deps** (T03's contract-leaf rule).
- `services/measurement/src/engenox_measurement/__init__.py` — the package marker; re-exports nothing internal across the boundary.
- `services/measurement/src/engenox_measurement/app.py` — the FastAPI app factory; wires the OTEL + structlog + the route; `app = FastAPI(title="engenox-measurement", version="0.1.0")` (the version is the contract version - verify FastAPI's current factory shape via context7 per T09).
- `services/measurement/src/engenox_measurement/routes/measure.py` — one contract-typed route (`POST /v1/measurement:record`): takes the `RecordRequest` from the generated contracts, returns `Result[RecordResponse, AppError]`. The route never raises an internal exception to the wire — the `Result` carries the error; a `@app.exception_handler(AppError)` maps it to the wire contract enum.
- `services/measurement/src/engenox_measurement/domain/record.py` — the (stub) domain function: `def record(req: RecordRequest) -> Result[RecordResponse, AppError]: return Success(...)`. Pure, no I/O; the stub returns `Success` on the golden path. M1+ fills the real measurement-write (the corpus row).
- `services/measurement/src/engenox_measurement/errors.py` — the error contract: a frozen-pydantic `AppError` discriminated union (`PERCEPTION_FAILED`/`CONTRACT_VIOLATION`/`INSTRUMENTATION_MISSING`) — the contract enum on the wire. **`EngenoxError` (recoverable, domain) vs `EngenoxInvariantError` (a moatbreach, must-escalate)** per `CODING_STANDARDS.md` (E07) §3.
- `services/measurement/src/engenox_measurement/models.py` — the `pydantic(frozen=True)` models — every model immutable; the generated-contract types are re-exported (the contract is the source of truth, not a re-declaration).
- `services/measurement/tests/test_record.py` — the golden-path test: a green path returns 200 + the contract body; a contract violation returns the 4xx + the contract error code; the test asserts the wire shape.
- `services/measurement/ruff.toml` — imports the repo-root `ruff` config (T01); no per-service overrides that weaken (a per-service override is a watchdog-category-4 smell).
- `services/measurement/mypy.ini` — `strict = true`, `disallow_untyped_defs = true`, `disallow_any_explicit = true`, `warn_return_any = true`; the `# type: ignore` is forbidden without a rule code + reason (watchdog category 4 — the bare-`type: ignore` rule the scanner catches).
- `services/measurement/README.md` — the "how to copy this exemplar" doc: the file-by-file walkthrough, the patterns to copy (`pydantic frozen`, `Result`, `EngenoxError`/`EngenoxInvariantError`, `mypy --strict`, `ruff`), the patterns NOT to copy (no bare `# type: ignore`, no sibling import, no `try/except Exception: pass`, no mutability).

## Acceptance criteria

- [ ] `ruff check services/measurement` is green + `ruff format --check` is clean (Biome-equivalent for Python).
- [ ] `mypy --strict services/measurement` is green with zero bare `# type: ignore` (every `# type: ignore[code]` carries a reason).
- [ ] No `try/except Exception: pass` (the swallowed-error pattern — watchdog category 4).
- [ ] Every `pydantic` model is `frozen=True` (immutability-first — `CODING_STANDARDS.md` (E07) §6).
- [ ] The error path returns `Result[..., AppError]`; an internal exception is NOT raised to the wire — the `exception_handler` maps `AppError` to the contract enum.
- [ ] The contract import compiles: `from engenox_measurement_v1 import RecordRequest` (the path the `buf` Python plugin produces per T02) resolves.
- [ ] `EngenoxError` vs `EngenoxInvariantError` are both present + documented in `errors.py` (the recoverable-domain vs the moatbreach-must-escalate distinction from `22` §2 — E07 §3).
- [ ] The exemplar passes T03's dep-direction lint (`lint-imports`/`import-linter`): no `from engenox_decision import …` (a leaf imports contracts + libs, not siblings).
- [ ] The exemplar runs green through the T06 CI chain (contract-gate first; then `ruff`/`mypy`/`pytest`).
- [ ] structured logging (structlog) is present + OTEL spans on the handler path.
- [ ] The route is versioned `/v1/…`.
- [ ] The README walks the copy-pattern.

## Tests

- **Format + lint green:** `ruff format --check` clean; `ruff check` passes with zero `# noqa` without a rule + reason (watchdog category 4).
- **Typecheck green:** `mypy --strict` clean.
- **Golden-path test:** `test_record.py` — a green path returns 200 + the contract body; a contract violation returns the 4xx + the contract error code.
- **No-leak test:** a forced internal error does NOT surface exception details in the response body (assert the body has only the contract `kind`).
- **No-swallow test:** grep-assertion: no `except Exception:` followed by `pass` anywhere in the service source.
- **Immutability test:** every `BaseModel` subclass in `models.py` + `errors.py` has `model_config = ConfigDict(frozen=True)` (assert via inspection).
- **Dep-lint green:** `lint-imports`/`import-linter` passes — the exemplar is a contract-leaf.
- **Contract-gate green:** the exemplar's CI run through T06's `contract-gate` is green.

## Definition of Done

- [ ] Every acceptance criterion closed; the format/lint/typecheck/golden-path/no-leak/no-swallow/immutability/dep-lint/contract-gate tests green.
- [ ] Coding standard met: the exemplar is `CODING_STANDARDS.md` (E07) §1–§7 embodied for Python; `pydantic frozen` + `Result` + `EngenoxError`/`EngenoxInvariantError` + `mypy --strict` patterns shown once.
- [ ] Review passed at Tier 2 (single adversarial reviewer + the watchdog): Correctness (the route works; the `Result` is correct), Architecture-alignment (the exemplar matches `24` §2 + `CLAUDE.md` §6), Stack-drift (FastAPI's current shape per context7 — not a stale FastAPI 0.10 pattern; Python 3.12 idiom, not 3.9), Security (no internal leak; the error contract is tight; no swallowed errors), Candor-floor (the stub is labeled a stub).
- [ ] The AI author can copy this exemplar for M1+ Python services (measurement, decision copy this skeleton).
- [ ] Stack-drift watchdog green: no `try/except Exception: pass`, no bare `# type: ignore`, no `# noqa` without a rule + reason, no mutable `pydantic` model, no sibling import.
- [ ] Docs updated: the `services/measurement/README.md` (the copy-pattern doc); `CLAUDE.md` §11 points to this exemplar as the Python golden path.
- [ ] Checkpoint written; commit-ready (`feat(exemplar): T12 — the Python/FastAPI golden-path exemplar (pydantic frozen, Result, mypy --strict)` with `Refs: 22, CLAUDE.md §6, ADR-0001`).

## Estimated complexity

**L — ~1.5 days.** The risk is `mypy --strict` zero-suppressions (Python's strict mode catches a lot; the exemplar must be clean without `# type: ignore` escape hatches) + the `returns` `Result` library idiom (less common than TS's `neverthrow`). The mitigation: the generated `buf` Python package is typed (T02); `mypy` should accept it cleanly.

## Notes for the implementer

- **The exemplar is the measurement seam's skeleton.** The measurement seam writes the corpus row (`26` §6). The exemplar's stub `record` returns `Success`; M1+ fills the real bi-temporal write (the `libs/kg` `assertion_view` path — `13` §3). Do not build the real KG write here — that's M1 (the `libs/kg/`).
- **Use context7 (T09) to verify the current FastAPI shape.** FastAPI's app factory + the `Annotated` dependency shape + `lifespan` (the new shape vs the old `on_event("startup")`) — verify before writing. A FastAPI 0.10 idiom is a watchdog category-2 (stale API) hit. Python 3.12 `Annotated`/PEP-695 generics where applicable.
- **The `returns` library's `Result` is the Python `Result<T,E>`.** `from returns.result import Success, Failure` — the `Result[RecordResponse, AppError]` is the type. The exemplar documents this in the README so the AI author copies the import, not a hand-rolled union.
- **`EngenoxError` vs `EngenoxInvariantError` is a load-bearing distinction.** A recoverable domain error (`EngenoxError`) maps to a 4xx + a contract enum; a moatbreach (`EngenoxInvariantError` — e.g., a `tenant_id` from a client request) escalates, never returns a 4xx. Encode both in `errors.py`; the reviewer (Security lens) checks the distinction.
- **No bare `# type: ignore`.** The watchdog (T07 category 4) catches `# type: ignore` without a rule code; the exemplar uses `# type: ignore[attr-defined]  # reason: <…>` where unavoidable (rare — the generated contracts are typed). A bare `# type: ignore` in the exemplar propagates to every Python service — the exemplar must be clean.
- **`pydantic` frozen is non-negotiable.** A mutable `pydantic` model in the exemplar would let the AI author copy a mutable contract type — a contract-spine violation (the contract is the immutable source of truth). `model_config = ConfigDict(frozen=True)` on every model.
- **The `import-linter` contract is exemplar-driven.** T03 authors the `import-linter` `forbidden`/`layers` rules; this exemplar is the positive case that proves they pass. If the exemplar fails `import-linter`, the rule is misconfigured (T03), not the exemplar wrong.
- **No `try/except Exception: pass`.** The swallowed-error pattern is a watchdog hit (category 4) + a candor-floor violation (an error swallowed is a defect hidden). The exemplar's `errors.py` documents the "no swallow" rule; the no-swallow test asserts it.
- **The exemplar is Tier 2 but the patterns it teaches are moat-load-bearing** (the measurement seam writes the corpus, which is the moat). Review the pattern-correctness lenses as if Tier-1.
