# Stack Verification Checklist

> **Status: FROZEN.** The running form of `29_STACK_VERIFICATION.md`. The audit (E02) is the point-in-time evidence the foundation holds *today*; this checklist is the *recurring* drill that confirms it still holds at each milestone gate. Authored against `29` §2 (confirmed stack), §4 (model roster + API drift), §5 (verify-at-milestone items), §7 (ADRs), and the milestone-gate sequencing in `_ENGINEERING_READINESS_REPORT.md` §3.

---

## How this checklist is used

- **Morning-of-the-milestone.** Before the milestone gate closes, the founder (or the stack-drift-watchdog subagent, E16) runs the milestone's section below. Every box must be either confirmed ✅ or recorded as a new ADR. There is no "substantially done" — a box is checked or it isn't (`ENGINEERING_CONSTITUTION.md` process rule).
- **PR-time vs milestone-time.** This checklist is the *milestone-time* human drill. The *PR-time* enforcement is the stack-drift watchdog (E16) — the lint-tier forbidden-pattern check on every PR. They are complementary: the watchdog catches drift at the diff; this checklist catches drift at the gate. Neither replaces the other.
- **A drift is an ADR, not a silent edit.** If a version, SDK shape, or vendor ownership has moved since the audit, the resolution is recorded as an ADR that supercedes the audited choice by reference (`adr/README.md`). The checklist never edits a frozen doc; it produces an ADR.
- **Evidence is a link.** Every "still the best 2026 choice?" box is closed with a dated source URL, not a recollection. "Confirmed" without a source is not a confirmation.

## The symbol legend

- ✅ confirmed at audit time (`29` §2) — re-confirm at the milestone.
- ⚠️ verify-at-milestone (`29` §5) — not closed at audit time; this is the scheduled confirmation.
- 🔄 ADR-bound — the choice is governed by a named ADR; re-confirm the ADR is still in force, then re-run its evidence.

---

## Every-milestone preamble (run before every gate)

These apply at M0 onward; they are the ambient checks that never stop.

- [ ] Re-run the stack-drift watchdog (E16) on the milestone's cumulative diff. Zero forbidden-pattern hits. Non-zero is a blocker.
- [ ] The contract package `pkg/contracts/` is the only cross-language type source; `buf generate` is green in all four languages; the dependency-direction lint is green. (`CLAUDE.md` §4)
- [ ] No service imports another service's internals; gateway is leaf-only. (`CLAUDE.md` §4, §5)
- [ ] The frozen blueprint docs (00–27) are unchanged since the freeze — `git log -- docs/0*_*.html docs/[0-2][0-9]_*.md` shows no edits. A frozen doc was not edited; any change is an ADR.
- [ ] The ADR index (`adr/README.md`) matches the ADR files on disk; no ADR number was reused; deprecated/rejected ADRs are still on disk with a Status line.
- [ ] No new dependency was added to any `go.mod` / `package.json` / `pyproject.toml` / `Cargo.toml` without a verify pass in this checklist's per-language sections below.
- [ ] The candor floor held through the milestone: the weekly written review named what was blocked and what slipped; no gate was reported closed before it closed.

## The model roster + API-shape watch (run at every milestone that touches an LLM seam — M2 onward)

Authors against `29` §4 + ADR-0006.

- [ ] The cross-family Critic is still cross-family — the Critic call hits a model family *different* from the seam it critiques. The cross-family property is the invariant; a same-family Critic is a blocker.
- [ ] `thinking: {type: "adaptive"}` is the active shape on Opus 4.8 / Sonnet 5 / Fable 5 calls. The old `{type: "enabled", budget_tokens: N}` is absent — it is rejected with a 400 on Fable 5 / Sonnet 5 / Opus 4.8 / 4.7. (`29` §4)
- [ ] Fable 5 (if in use) omits the `thinking` parameter entirely (always-on). No `{type: "disabled"}` or `budget_tokens` is sent on Fable 5 calls.
- [ ] The Fable 5 `fallbacks` parameter (server-side fallback to Opus 4.8) is wired wherever Fable 5 is called, unless explicitly declined. (`29` §4)
- [ ] `web_search` / `web_fetch` server-tool variants match the model: `web_search_20260209` / `web_fetch_20260209` on Opus 4.8 / 4.7 / 4.6 / Sonnet 5 / Sonnet 4.6; the basic variants on older models; Vertex AI is basic-only. (`29` §4)
- [ ] The seam→model assignments (`29` §4) still hold: Haiku 4.5 for Extract / Draft / Embed / coarse triage; Opus 4.8 for the Planner (1M context); GPT-5-class + Gemini 3-class for the cross-family Critic; Opus 4.8 (+ optional Fable 5) for Abduce; Sonnet 5 for Specialist. A reassignment is ADR-0006 (or a successor).
- [ ] No LLM holds a credential; no LLM commits; a client never supplies `tenant_id`. (`CLAUDE.md` §8; the candor-floor non-negotiables)

---

## M0 — Contracts + IaC + CI gates + golden-path exemplars

Authors against `29` §2, §3 Swap 2 (ADR-0003), §6.

### The M0-critical ADR-0003 confirmation (this is the most consequential M0 check)

- [ ] 🔄 `infra/tofu/modules/cell` provisions a **CNPG** `Cluster` CR, not an AlloyDB instance. Run `grep -ri alloydb infra/` — expect zero hits outside this ADR and the audit doc.
- [ ] 🔄 CNPG operator version is pinned and current; the cell template references the pinned `CloudNativePG` operator version. Confirmed against the CNPG release page <link at drill time>.
- [ ] 🔄 Apache AGE version is pinned and its compatibility with the pinned Postgres major is confirmed against the AGE release notes. (ADR-0003 closure work.)
- [ ] 🔄 pgvector version is pinned and compatible with the pinned Postgres major.
- [ ] 🔄 The CNPG cluster CR includes backup schedule + PITR policy + extension bootstrap (AGE, pgvector). ADR-0003 closure.
- [ ] 🔄 The AGE↔Postgres major compatibility matrix is recorded in the stack-drift-watchdog spec (E16) as a tracked invariant.

### The language + toolchain M0 pins

- [ ] ✅ Node runtime: Node 22 LTS is the MVP target (Bun remains a verify-at-milestone spike, see ⚠️ below). Pinned in `mise.toml` / `package.json` engines.
- [ ] ✅ pnpm + Nx + Biome 2 versions pinned (`29` §6). `biome --version` matches.
- [ ] ✅ Go 1.24+ toolchain pinned in `go.work` / `mise.toml`; `golangci-lint` version pinned.
- [ ] ✅ Python 3.12–3.13 pinned; `uv` version pinned; `ruff` + `mypy` pinned. `uv sync` is green.
- [ ] ✅ Buf is the contract toolchain; `buf.yaml` / `buf.gen.yaml` exist; `buf generate` produces the four-language contract packages. (`CLAUDE.md` §4)
- [ ] ✅ OpenTofu + Argo CD versions pinned in the infra module.
- [ ] ✅ Atlas migration toolchain pinned; the baseline migration is idempotent (apply / re-apply is a no-op).

### The verify-at-milestone ⚠️ items scheduled at M0

- [ ] ⚠️ **JS runtime — Bun vs Node 22 LTS for the MVP.** Run the Bun spike against a representative build + a representative Hono service; record p95 latency, build time, and ecosystem-compat. The MVP runs Node 22 LTS *unless* the spike closes the compat gaps with evidence. Decision recorded as an ADR if Bun is adopted.
- [ ] ⚠️ **Modal privacy-tier isolation — reaffirmed as a spike tier.** Modal is *not* on the MVP critical path; it is the privacy-isolation spike for the Abduce seam. Confirm the spike scope is M2-bound, not M0.

---

## M1 — Truth spine + RLS + KG

- [ ] ✅ CNPG cluster from M0 is live and accepting writes; failover drill completed (CNPG automated failover verified, not assumed).
- [ ] ✅ AGE extension is installed in the cluster and a graph query joins relational rows inside one transaction (the AGE-in-transaction invariant is *demonstrated*, not asserted). (ADR-0003)
- [ ] ✅ RLS roles + the first RLS policy templates are in place; the RLS-introspection CI gate (a client never supplies `tenant_id`) is green. (`CLAUDE.md` §7)
- [ ] ✅ pgvector is installed and the dial's three-axis ledger schema is migrated; the conformal-coverage CI gate is green where applicable.
- [ ] ✅ Atlas is the migration path; no ad-hoc DDL outside migrations.
- [ ] 🔄 Backup + PITR drill completed: restore to a point-in-time recovers a known write set. This is the operational cost ADR-0003 accepted; the drill confirms the cost is paid.
- [ ] 🔄 **Infra/SRE hire plan exists** (ADR-0003 closure work); if founder-funding-conditional, the funding-status + the constrained-M1 fallback (`28` §7) are recorded. The hire is non-deferrable at M1 *for the M2 scale path* — confirm the status honestly.

### M1 verify-at-milestone

- [ ] ⚠️ **Cedar vs OPA — reaffirmed Cedar.** Re-confirm the <2 ms p99 policy-decision benchmark holds with the M1 policy set size. If the benchmark slipped, this is an ADR, not a silent switch to OPA.
- [ ] ⚠️ **The AGE↔Postgres compatibility** still holds against any Postgres patch released between M0 and M1.

---

## M2 — The gateway + the verifier

- [ ] ✅ The custom LLM gateway is live; LiteLLM is the routing layer; the six bounded seams (Extract, Draft, Adjudicate, Embed, Abduce, Critique) are the *only* LLM call sites. (`11_AI_ARCHITECTURE.md`)
- [ ] ✅ Constrained decoding is wired on every seam that emits structured output: Outlines / XGrammar / GBNF per the seam. No unconstrained JSON parsing. (`CLAUDE.md` §7)
- [ ] ✅ The re-grounding gate is in place: a seam's output is re-grounded before it becomes a commit-to-state.
- [ ] ✅ The cross-family Critic is live (the model-roster watch above applies). ADR-0006 ratified.
- [ ] ✅ Argilla is the ground-truth tool; LLM-as-judge is coarse triage only, never the eval verdict. (`23_TESTING_STRATEGY.md`)
- [ ] ✅ OpenTelemetry + Langfuse + Phoenix are wired on every seam; the trace round-trips seam → tool → output. (`CLAUDE.md` §7)

### M2 verify-at-milestone

- [ ] ⚠️ **The 2026 open frontier model.** Watch, don't pin. If an open model enters the Critic rotation, it enters as an ADR (it changes the cross-family property).
- [ ] ⚠️ **The Prolific-class human-eval panel vendor.** Selected + contracted by M2; the panel is the ground-truth-for-humans source the Argilla ground truth is Calibrated against.

---

## M3 — Temporal + Action + the Dial (the PR-touches-repo hinge)

- [ ] ✅ Temporal owns the closed loop (perceive → diagnose → propose → open-PR → measure). The event bus is the *tap*, not the *spine*; Temporal is the spine's closure. (`00` §2; `14_EVENT_ARCHITECTURE.md`)
- [ ] ✅ The Dial's three-axis ledger writes to ClickHouse; the canary-row + warm-canary divergence CI gates are green. (`CLAUDE.md` §7)
- [ ] ✅ The dial denies an unearned escalation beyond `Co-pilot` (P2.1-gated). The dial-property CI gate is green. (`_ENGINEERING_READINESS_REPORT.md` §3)
- [ ] ✅ The Security gate + the AI-Intelligence gate are **closed** before the PR-touches-repo moment. This is the readiness-report sequencing; a gate not closed is reported as not-closed. (`_ENGINEERING_READINESS_REPORT.md` §3)
- [ ] ✅ The idempotency gate is green on every Temporal activity. (`CLAUDE.md` §7)
- [ ] ✅ The diff-review-blocker CI gate is live; a Temporal workflow change that alters the closed-loop contract is reviewed at Tier 1.

---

## M4 ‖ M5 — Measurement, corpus, decision

- [ ] ✅ The counterfactual uplift estimator is live on the signed integrity-tagged CIO corpus; the two-spine design's ACTION spine is wired. (`05_SYSTEM_INTELLIGENCE.md`)
- [ ] ✅ The corpus WORM layout (Cloudflare R2 WORM) is in place; the provenance-audit-hover works end-to-end. (`26` §4)
- [ ] ✅ The Provenance Audit Hover renders; the CI is never omitted; the contrarian block renders. (candor floor, product-side)

---

## M6 — Frontend (web)

- [ ] 🔄 **ADR-0002 ratified: Next.js 16 over 15.** The version jump happens here, not earlier. Ratification flips ADR-0002 from PROPOSED to ACCEPTED with the date and the post-upgrade test results.
- [ ] ✅ React 19.2 + Tailwind v4 + Radix versions match the audit pins. (`29` §2)
- [ ] ✅ The dependency-direction lint is green on the web module; the web module never imports a service's internals.
- [ ] ✅ TanStack 5 (Query/Router) versions match the audit pins.
- [ ] ✅ Playwright + Vitest pinned; the design-system Storybook is in sync with `20_DESIGN_SYSTEM.md` (Tier-3 review tier).

---

## M7 — The closed loop E2E + the AI-Intelligence eval half

- [ ] ✅ The closed loop is end-to-end demoable: perceive → diagnose → propose → open-PR → measure → corpus → render-candor. (`01_PROJECT_VISION.md`)
- [ ] ✅ The AI-Intelligence readiness gate is **closed** before the customer-facing-lift moment. (`_ENGINEERING_READINESS_REPORT.md` §3)
- [ ] ✅ The conformal-coverage gate is green at the M7 coverage target; the dial's CI is honest.

---

## M8 — Scalability + Production-Readiness + DR

- [ ] ✅ The Scalability gate + the Production-Readiness gate are **closed** before public self-serve. (`_ENGINEERING_READINESS_REPORT.md` §3) — these are the two 9.0 / 8.5 dimensions; closing them is the M8 work.
- [ ] ✅ DR drill completed: a region failure fails over via the one-cloud+edge design; RTO / RPO measured, not asserted.
- [ ] ✅ The bus graduation is evaluated: Redpanda → AutoMQ (ADR-0004) is ratified *if the graduation trigger fired*; if the trigger did not fire, ADR-0004 stays PROPOSED and Redpanda continues — record the status honestly.
- [ ] ✅ The verbatim-FTS tier is evaluated: Postgres FTS continues *if the corpus-search trigger did not fire*; ADR-0005 ratified *if it did*.

---

## M9 — MVP live

- [ ] ✅ All milestone-gate dimensions closed (Architecture, Maintainability, Competitive Moat at 9.5; Scalability, Security, AI-Intelligence at 9.0; Production-Readiness at 8.5 — or the closure that raised them).
- [ ] ✅ The stack-drift watchdog is green on the M9 cumulative diff.
- [ ] ✅ The candor floor held through the build — the weekly reviews, the honest gate statuses, the blameless postmortems, the ADRs where the stack moved.

---

## What this checklist is not

- It is **not** a substitute for the audit (`29`) — the audit is the evidence; this is the recurring confirmation.
- It is **not** the PR-time check — that is the stack-drift watchdog (E16).
- It is **not** a way to edit a frozen doc — a drift found here becomes an ADR.
- It is **not** a score inflator — a gate not closed is recorded as not-closed with its closure list, never as "substantially done."

---

*End of checklist. Next enforcement artifact: coding standards (E07, `docs/enforcement/CODING_STANDARDS.md`).*
