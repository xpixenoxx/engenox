# 21 — Development Guidelines

> **Status: FROZEN.** The engineering-organization operating posture: the polyglot monorepo setup + the per-language toolchain (pnpm/uv/Go/Biome/pnpm/Ruff/gofmt), the docs-until-STOP-CONDITION rule (no app code while the architecture is unfinished), the founder-acts-as-the-team operating mode + how it transitions to a real team, the branch + PR + review conventions, the local-dev story (deterministic probe fixtures, the closed-loop dry-run, the single-command bring-up), the commit + branch naming, the "code reads like the surrounding code" idiom-matching, the code-review culture, and the definition-of-done (the invariants enforced before merge). Authored against `_FOUNDATION_FINAL.md` (the readiness scores' prerequisites), `24_PROJECT_STRUCTURE.md` (forward-ref the monorepo layout), `17_DEPLOYMENT.md` (the CI gate chain), and the standing instruction set (the founder acts as the 15-role team; docs-first; STOP CONDITION).

---

## 1. The single rule

**Until every one of the 27 blueprint documents reaches production quality and the Engineering Readiness Report clears ≥9.5 on the seven scores, no application code ships.** The founder acts simultaneously as the 15-role engineering team; each architectural decision is internally reviewed before it lands in a document; the documents are the source of truth, the code is the follower. The STOP CONDITION is non-negotiable: a category-defining product is not built by writing code quickly; it is built by designing the architecture that the code can only realize.

This section defines the operating posture, the repo setup, the workflow, the review culture, and the definition-of-done.

---

## 2. The docs-until-STOP-CONDITION rule

### What is allowed now
- The 27 blueprint documents (01–27) + the foundational triad (`00_FINAL`, the intelligence core, the tech evaluation, the critiques).
- The schema-source files (the Buf Protobuf/JSON-Schema contracts in `pkg/contracts/` — see 24) — these are the contract spine in source form; they are documentation-as-code, not application code.
- The OpenTofu cell template (the IaC in `infra/`) — the infrastructure-as-documentation; standing up a cell is infra, not app behavior.
- The CI gate definitions (the `.github/workflows/` + the lint configs) — the gates' definitions precede the code they gate.
- Storybook stories for the design-system primitives' *spec* (the props + a11y contract — `20`); the primitive implementations follow at `STOP_CONDITION`.

### What is NOT allowed now
- Service implementations (the Control Plane, the Perception fleet, the Decision/Action/Measurement layers, the LLM gateway).
- The Temporal workflow bodies (`AtlasCycle`, `InterventionSaga`).
- The frontend route implementations.
- The schema migrations (the Atlas files are auth-only + the IaC's empty baseline; no business-schema alterations until `STOP_CONDITION`).

### What the rule costs + why the cost is paid
- It costs **speed-to-first-line-of-application-code.** It pays for itself by preventing the architecture-churn that would otherwise require rewriting the codebase every time a doc gets hardened (the founder's instruction: "Never optimize for writing code quickly. Optimize for building a product that could realistically become a category-defining company").
- It costs **a discipline of self-review.** Each document is authored, internally reviewed (the 15-role framing — the CTO hat checks the Principal-AI-Engineer hat's seams; the Security critique author's P0 catches the Backend author's RLS gap), then frozen. The internal review is *before* the freeze, recorded in the doc's provenance (`Authored against …`).

### The transition to code
- `STOP_CONDITION` is reached when: every document is frozen + the Engineering Readiness Report (`_ENGINEERING_READINESS_REPORT.md`) clears ≥9.5 on **Architecture, Maintainability, Competitive Moat**, and ≥9.0 on **Scalability, Security, AI Intelligence** (the gate thresholds from `00_FINAL`); **Production Readiness ≥9.5** is gated behind the SRE-readiness closure (the cell-pair DR rehearsal), which may close slightly after code begins but before public self-serve onboarding (00_FINAL §sync sequencing).
- The Implementation Plan (`25`) sequences the milestones; `26_MVP_SCOPE.md` defines the MVP's deployable-closed-loop minimum.

---

## 3. The founder-acts-as-the-15-role-team operating mode (and how it ends)

### Now
The founder is simultaneously the CTO + 14 specialist hats. The internal review is the simulation of the team: a doc is authored (the relevant hat), then re-read through every other hat's lens before freeze. The cross-cutting critiques (`_FOUNDATION_CRITIQUES.md`) are the adversarial register; each new document is checked against the punchlist (the P0/P1/P2 items) before freeze.

### The transition (when the founders hire)
- The first engineering hire **does not re-litigate the docs** — they inherit them as frozen (the standing instruction: "The intelligence core is FROZEN — never re-litigate philosophy in docs 01–27").
- The first three hires cover the three hardest-to-replicate-in-one-head axes: **infrastructure/SRE** (the cell + the GPU cost-flip + DR), **AI runtime** (the gateway + the constrained-decoding + the eval pipeline), and **frontend/design-system** (the streaming-RSC story + the candor-report UX). The founder covers the product + the closed-loop domain logic until a 4th hire.
- Each new hire owns a **bounded ADR (Architecture Decision Record) surface**; a change to a doc is a PR to the doc + a linked ADR in `docs/adr/`; the doc's freeze is soft from hire-day forward (a doc is changed by a deliberate ADR + a doc-update PR, not by a casual commit).
- The multi-agent-review practice transitions from "the founder simulates the team in their head" to **a real review-board** (the same gate disciplines: contract-compat, RLS, idempotency et al are in CI; the human-review board is for the judgment calls: should the Critic escalate to a fourth round? is the conformal coverage drift a regression or a measurement quirk?).

### Why this matters
The instruction was explicit: "Every important architectural decision must be reviewed internally before presenting the final answer. Challenge your own assumptions." The docs encode the internal review; the team inherits the decisions, not the founder's current opinion.

---

## 4. The monorepo setup + the polyglot toolchain

(`24_PROJECT_STRUCTURE.md` has the directory layout; this section is the tooling.)

- **`nx` (or `bazel` at the billion-row scale, 24)** is the build orchestrator. The workspaces:
  - `pnpm` workspaces for TS/JS (the frontend, the Control Plane, the design-system, the contracts package).
  - `uv` for the Python services (the Measurement layer).
  - `go mod` per Go service (the Perception fleet, the Action layer, the LLM-gateway Go half) with a workspace-level `go.work`.
- **The toolchain versions** are pinned per-workspace (the `.tool-versions` / `mise.toml` for pnpm/uv/Go/Bun); the CI uses the same versions; the toolchain drift is a CI failure.
- **Biome** for TS/JS lint + format (the 2026 fast, unified, no-config-drift choice; Biome replaces ESLint + Prettier in one tool, the `_FOUNDATION_TECH.md` Layer 16 recommendation — though note Biome is still maturing on plugin/rules ⚠️-verify; the fallback is ESLint + Prettier flat-config).
- **Ruff** for Python lint + format; **gofmt + golangci-lint** for Go; the polyglot surface has one tool per language, not a bag of mixed.
- **The contract package** (`pkg/contracts/`) is the root of the dependency fan-in: every service depends on the generated package; the contract's CI gate (`09` §4) is the first gate that runs.

### The single-command bring-up (the developer-experience floor)
- `make dev` (or `nx run dev`) brings up: the local Postgres (Docker + AGE + pgvector + a seed schema), the local Valkey, the local Redpanda (or a mock for the dev env), the Control Plane on `:3000`, the Perception fleet's local mock (deterministic fixtures, §5), the LLM gateway with the **flag-routed provider** (in dev: a deterministic stub; in stage: the real provider behind a tenant-token budget isolated from prod).
- The bring-up is **idempotent + fast** (the CTO-hat floor: under 90s on a warm laptop, under 3min on a cold one). The DevEx critique in `_FOUNDATION_FOUNDATION_FINAL.md` is that the closed loop's complexity must not cost the developer a 20-minute boot.

---

## 5. The local-dev story (deterministic probe fixtures — the testability moat)

The biggest DevEx risk: the closed loop depends on live AI-surface probes, which are non-deterministic + rate-limited + against the platform ToS to scrape repeatedly. The local-dev story:

- **Deterministic probe fixtures** (the golden-probe regression suite's `23` fixtures, used in local dev): a `dev` flag routes the Perception fleet to a fixture provider — a set of frozen probe answers (the same fixtures the eval suite uses). A developer runs `AtlasCycle` against the fixtures; the cycle is reproducible run-to-run, debuggable, and free.
- **The closed-loop dry-run** runs end-to-end in dev: perception → decision → critic → action (the GitHub-App replaced with a mock Git provider that stages PRs to a local scratch repo) → measurement (the estimator against the fixture's pre-baked outcomes) → tag-integrity → the corpus row. The closed loop is exercised in dev, not just in prod.
- **The fork in the dial** — the dev profile sets the autonomy dial to `recommend` by default (no PR-even-mock is opened without an explicit developer toggle); the developer opts into `propose` locally with a `DEV_DIAL=propose` flag for the dry-run/commit flow.
- **The fixture refresh cadence** — the fixtures are refreshed quarterly (or on a surface-shape change detected by the EWMA/CUSUM, 12 §8); stale fixtures are a bug, not a convenience. The `23` golden-probe assertions are over the pipeline's behavior, not the surface outputs, so a fixture refresh doesn't rot the suite.

---

## 6. The branch + PR + review conventions

### Branching
- **Trunk-based** (not git-flow; the trunk is `main`, short-lived feature branches `<author>/<scope>-<short>`). A branch lives <2 days; >2 days is a rebase-is-needed signal.
- **The STOP-CONDITION carve-out:** while no app code ships, the trunk receives **only doc changes**; the branches are `<author>/docs/<nn>-<slug>`. After `STOP_CONDITION`, the trunk discipline flips to code + the ADR-driven doc-soft-freeze (§3).

### Commits
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, the `!` for breaking). The commit hash links to the doc or the ADR it implements. The body explains the *why* (the code/decision shows the what).
- **Atomic + legible.** A commit is one decision, reviewable as one diff. A 5,000-line commit is a broken commit; a "fix typo + restructure the kernel" combo is two commits.
- **Code reads like the surrounding code** — the matched-comment-density, the matched-naming, the matched-idiom discipline (the standing instruction "Write code that reads like the surrounding code"). A Python file full of Go idioms is wrong; a TS file that imports `lodash` where the repo uses native is wrong.

### PRs
- **One PR per doc** (now) / **one PR per milestone-fragment** (after `STOP_CONDITION`). The PR's description links to the doc + the relevant critiques it satisfies + any ADR.
- **The PR template** prompts: "Which doc(s) does this implement? Which invariants (cite the doc section)? Which CI gates pass? Which gates are *added* by this PR? What's the rollback?"
- **Reviewers:** now, the founder-as-team self-review (the multiple hats) + the freeze-record; after hire-day, ≥2 reviewers (one in-domain, one cross-domain for the cross-cutting invariants — e.g., a frontend PR needs an infra-side review for the SSE-contract impact). The reviewer mandate is **adversarial** (the standing instruction: "Never automatically agree"; challenge assumptions, not the author).
- **The Definition of Done (§8)** is the merge gate; a PR that clears CI + DoD merges; a PR that needs a round of changes is **not** merged "to unblock."

### Merge
- **Squash-merge** to keep `main` linear + one-commit-per-PR traceable; the squash-message preserves the conventional-commit header + the body + the co-author.

---

## 7. The "code reads like the surrounding code" discipline — concretely

- The matched-comment-density: a file in a heavily-commented module gets comments; a one-liner in a terse module doesn't get an essay.
- The matched-naming: the repo uses camelCase in TS, snake_case in Python + Go, PascalCase for types + components; the local file's convention is followed, not re-introduced.
- The matched-idiom: the repo's chosen optional-chaining, the repo's chosen error-result-vs-throw, the repo's chosen dataloader pattern — a PR introducing a third idiom is rejected (or it's a deliberate refactor PR with an ADR).
- The matched-test-style: the repo's chosen test layout (vitest co-located + the playwright e2e + the pytest module-level) — a PR with a different test style is rebased to the style.
- **The rule:** novelty in *architecture* is encouraged; novelty in *micro-style* is rejected. The repo's velocity + the reviewer's cognitive load depend on this.

---

## 8. The Definition of Done (the invariants enforced before merge)

A PR merges when **all** hold:

1. **All CI gates pass** (the 17 §4 gate chain: contract-compat, RLS-introspection, canary-row, idempotency, diff-review-blocker, dial property, golden-probe, unit/integration, Trivy SBOM, secret-scan, Biome/lint, the Storybook axe).
2. **The relevant doc's invariants are encoded** — a PR touching the LLM gateway encodes the six-seams invariants (11 §8); a PR touching the Action layer encodes the allow-list-glob + the rule-based diff-review (15 §5). The PR description cites the doc sections.
3. **The tests cover the failing-mode** — not just the happy path; the verifier-reject, the dial-denied, the foreign-change-quarantine, the budget-exhausted fallback all have tests (the test strategy, `23`).
4. **The rollback is identified** — for an app deploy, the image-revert; for a migration, the expand/contract step; for a data-plane change, the duel-write-window + the flip-back; for an IaC change, the `tofu apply` of the prior state.
5. **The observability is added** — a new user-facing surface gets an OTel span + a Langfuse trace link; a new error code gets an alert routing; a new metric gets a dashboard.
6. **The doc is updated** — a behavior change updates the relevant doc; a frozen-doc change includes an ADR (the soft-freeze discipline, post-hire).
7. **The candor is preserved** — a PR that introduced a vanity score, a hidden CI, an opaque error, or a UI without provenance where provenance is required is **rejected at review**, even if the CI passes. This is the human gate the CI cannot express, owned by the reviewer.

---

## 9. The blameless-postmortem + the post-incident doc-update discipline

- An incident is **a doc update + an ADR**, not just a fix — the incident's root cause is traced to a doc gap or a doc-violation, and the doc is updated (the soft-freeze path). The architecture is the source of truth; the incident is evidence the architecture moved.
- The postmortem is blameless (the founder's culture — the review indicts the *decision*, not the *decider*).
- The "near-miss" (the canary caught it; the rollback worked) is also a postmortem + a doc update + an ADR — the near-miss is the architecture paying off; record it so the payoff is not a fluke.

---

## 10. The meeting-free cadence (the docs-as-the-standup)

- The docs are the source of truth; the conversations happen in PRs (the review) + the ADRs (the decisions) + the postmortems (the incidents). There are no architecture "meetings" whose outcome is not also a doc.
- The weekly review is a doc-diff review + a readiness-score check + the `05` open-questions register's progress (the intelligence core's open questions are tracked to closure; each closure is an ADR + a doc-update).
- This cadence is what makes the founder-acts-as-the-team mode viable — the decisions are asynchronous + recorded + reviewable; the founder doesn't have to "remember" the architecture (the docs remember it; the code follows).

---

## 11. The development-guidelines invariants

1. **Docs-until-STOP-CONDITION: no application code while docs are unfinished;** the STOP CONDITION is the readiness scores + the document-freeze.
2. **The founder acts as the 15-role team now; the team inherits the frozen docs on hire-day, not the founder's current opinion;** doc changes post-hire are ADR-gated.
3. **Trunk-based, short branches, Conventional Commits, squash-merge;** one PR per doc (now) / per milestone-fragment (later).
4. **Single-command bring-up <90s/3min;** deterministic probe fixtures in dev; the closed-loop dry-run runs end-to-end locally.
5. **Code reads like the surrounding code** — matched comment density, naming, idiom, test-style; novelty in architecture is encouraged; novelty in micro-style is rejected.
6. **The Definition of Done is the merge gate: CI passes + the doc invariants encoded + the failing-mode tested + the rollback identified + the observability added + the doc updated + the candor preserved (the human gate).**
7. **Incidents + near-misses are doc updates + ADRs** — the architecture is the source of truth; the docs remember the decision the code follows.
8. **The cadence is docs-as-the-standup;** no architecture-meeting whose outcome is not also a doc.

---

*End of development guidelines. Next: `22_CODING_STANDARDS.md` — the typed-everywhere discipline, the error model (no exceptions-into-the-void; the typed Result), the immutable-first data discipline, the no-any / no-untyped-escape lints, the polyglot parallel naming, the comment + provenance conventions.*
