# Engenox Blueprint — Recovery & Checkpoint Tracker

> **Purpose:** survive upstream rate-limit interruptions without regenerating completed work. After every completed artifact: write it, mark it ✅ below, continue. If interrupted, resume from the last ✅.

## Foundational state

| Artifact | Status | File |
|---|---|---|
| Intelligence core (3 proposals + merged synthesis) | ✅ FROZEN (recovered from journal) | `00_FOUNDATION_INTELLIGENCE_CORE.md` |
| Technology evaluation (15 layers, inline regen) | ✅ DONE (8 cross-layer invariants set) | `_FOUNDATION_TECH.md` |
| Architecture hardening (8 specialist critiques, inline regen) | ✅ DONE (cross-cutting punchlist assembled) | `_FOUNDATION_CRITIQUES.md` |
| Final synthesis + 7 readiness scores | ✅ DONE (4 scores at 9.5, 3 at 9.0, 1 at 8.5 — all gaps named) | `00_FOUNDATION_FINAL.md` |

## Blueprint documents (01–27)

| # | Document | Status |
|---|---|---|
| 01 | PROJECT_VISION | ✅ |
| 02 | PRODUCT_STRATEGY | ✅ |
| 03 | COMPETITOR_RESEARCH | ✅ |
| 04 | PRODUCT_WEDGE | ✅ |
| 05 | SYSTEM_INTELLIGENCE | ✅ |
| 06 | DOMAIN_MODEL | ✅ |
| 07 | KNOWLEDGE_GRAPH | ✅ |
| 08 | DATABASE_ARCHITECTURE | ✅ |
| 09 | BACKEND_ARCHITECTURE | ✅ |
| 10 | FRONTEND_ARCHITECTURE | ✅ |
| 11 | AI_ARCHITECTURE | ✅ |
| 12 | AGENT_ARCHITECTURE | ✅ |
| 13 | MEMORY_ARCHITECTURE | ✅ |
| 14 | EVENT_ARCHITECTURE | ✅ |
| 15 | SECURITY_ARCHITECTURE | ✅ |
| 16 | INFRASTRUCTURE | ✅ |
| 17 | DEPLOYMENT | ✅ |
| 18 | API_SPECIFICATION | ✅ |
| 19 | UI_UX | ✅ |
| 20 | DESIGN_SYSTEM | ✅ |
| 21 | DEVELOPMENT_GUIDELINES | ✅ |
| 22 | CODING_STANDARDS | ✅ |
| 23 | TESTING_STRATEGY | ✅ |
| 24 | PROJECT_STRUCTURE | ✅ |
| 25 | IMPLEMENTATION_PLAN | ✅ |
| 26 | MVP_SCOPE | ✅ |
| 27 | FUTURE_ROADMAP | ✅ |

## Final report
| Engineering Readiness Report (7 scores) | ✅ DONE (3 at 9.5, 3 at 9.0, 1 at 8.5 — gates mapped to milestones) | `_ENGINEERING_READINESS_REPORT.md` |

## Execution phase (post-readiness — NO product code, enforcement environment + planning + first ticket only)

| # | Artifact | Status | Path |
|---|---|---|---|
| E01 | Execution strategy (frozen) | ✅ | `docs/28_EXECUTION_STRATEGY.md` |
| E02 | Stack verification audit (2026 research, resolves all ⚠️ items) | ✅ | `docs/29_STACK_VERIFICATION.md` |
| E03 | Root `CLAUDE.md` (pins 2026 stack + doc-pointers) | ✅ | `CLAUDE.md` |
| E04 | Engineering constitution | ✅ | `docs/enforcement/ENGINEERING_CONSTITUTION.md` |
| E05 | ADR system + ADR-0001 (stack confirmed) + ADR-0003 (M0-critical swap, accepted now) | ✅ | `adr/README.md` + `adr/0001-2026-stack-confirmed.md` + `adr/0003-self-managed-postgres-cnpg-not-alloydb.md` |
| E06 | Stack verification checklist | ✅ | `docs/enforcement/STACK_VERIFICATION_CHECKLIST.md` |
| E07 | Coding standards (execution layer) | ✅ | `docs/enforcement/CODING_STANDARDS.md` |
| E08 | Review standards (adversarial, tiered by blast radius) | ✅ | `docs/enforcement/REVIEW_STANDARDS.md` |
| E09 | Definition of Done | ✅ | `docs/enforcement/DEFINITION_OF_DONE.md` |
| E10 | AI usage rules | ✅ | `docs/enforcement/AI_USAGE_RULES.md` |
| E11 | Checkpoint & recovery workflow | ✅ | `docs/enforcement/CHECKPOINT_WORKFLOW.md` |
| E12 | Repository conventions | ✅ | `docs/enforcement/REPO_CONVENTIONS.md` |
| E13 | Folder structure (scaffolded) | ✅ | repo tree (56 skeleton dirs + `.keep`; per `24` §2) |
| E14 | Skills & subagents plan | ✅ | `docs/enforcement/SKILLS_SUBAGENTS_PLAN.md` |
| E15 | MCP configuration plan | ✅ | `docs/enforcement/MCP_PLAN.md` |
| E16 | Stack drift watchdog specification | ✅ | `docs/enforcement/STACK_DRIFT_WATCHDOG.md` |
| E17 | M0 implementation plan + tickets | ✅ | `docs/tickets/M0/` (README + T01–T15) |
| E18 | M0 ticket 1 implementation + reviews + checkpoint | ✅ (T01 closed — config complete, run-here-possible acceptances green, Tier-1 review passed; `mise install` + `go work sync` pending a mise/Go-installed environment, deterministic from the config) | `docs/tickets/M0/T01-repo-workspace-bootstrap.md` |
| E19 | M0 ticket 2 (T02) - the contract spine (Buf + first v1 protos + codegen) | ✅ (FULL 3-language verify landed under the pinned mise toolchain — buf 1.50 / node 22 / go 1.24 / python 3.13 / mypy via uv. All 7 gates green on a FRESHLY-REGENERATED tree: `buf lint`, `buf breaking`, `tsc --noEmit` strict, `go build ./...`, `mypy --strict`, `test:py` (the real-import candor gate), vitest 3/3. `buf generate` is BYTE-REPRODUCIBLE — a fresh regen reproduces the prior gencode tree with 0 source diff. THE CANDOR DEFECT closed: the Python half was green statically (mypy never imports) but RED at runtime — the BSR `protocolbuffers/python` plugin emits gencode 7.35.1 against a pinned protobuf runtime 5.29, so `import *_pb2` raised `ValidateProtobufRuntimeVersion`. Fixed STRUCTURALLY: bumped the runtime to `protobuf>=7.35,<8` to MATCH the gencode AND added `scripts/py-roundtrip.py` (run by `test:py`), a real-import + round-trip career gate so a future plugin bump that outruns the runtime RAISES THE GATE, not passes invisibly — CLAUDE.md §12 (the gencode↔runtime candor floor). Go codegen plugins now reproducible via mise `aqua:` pins (protoc-gen-go 1.36.11, protoc-gen-go-grpc 1.6.2); the prior PATH-dependent hole is closed. Plugin semver ≠ runtime lib semver (the grpc plugin's own 1.6.2 vs go.mod grpc v1.68.0); `go build` green is the compatibility proof. OPEN follow-ups tracked inline in `buf.gen.yaml` (NOT silently closed): (a) pin the BSR `protocolbuffers/python` plugin ITSELF via a `:vN.M` remote suffix + match the runtime to that pinned gencode — BSR rate-limited version enumeration at this verify; (b) git identity is provisional + unsigned (founder@engenox.local) — a DoD gap to replace with real identity + a signing key before any merged release, amendable while unpushed.) | `docs/tickets/M0/T02-contract-spine-buf-codegen.md` + `pkg/contracts/` |

## Operating rules for this build
- Intelligence core is FROZEN — never re-litigate philosophy in docs 01–27.
- The 27 blueprint documents + readiness report are FROZEN — execution-phase artifacts must ALIGN with them, never modify them.
- Stack verification (E02) may recommend swaps WITH JUSTIFICATION; an accepted swap becomes an ADR (E05+), not a silent edit to a frozen doc.
- After each ✅, the next interruption resumes from the next ⬜.
- Phase 0 builds the ENFORCEMENT ENVIRONMENT only — no product/service code until E18 (the single first M0 ticket).
