# T04 — IaC cell template: CNPG (not AlloyDB) + GKE + Valkey + Redpanda + KMS

> **Tier:** 1 (the truth-spine substrate; ADR-0003 M0-critical — the most consequential M0 ticket) | **Status:** pending | **Milestone:** M0
> **Cites:** `ADR-0003` (the swap — **the authority for this ticket**) · `16` §2 (the cell abstraction) · `24` §2 (`infra/tofu/modules/cell`) · `29` §3 Swap 2 (the AlloyDB→CNPG reasoning) · `00` §2 (the AGE-in-transaction invariant) · `STACK_VERIFICATION_CHECKLIST.md` M0 (the ADR-0003 confirmation rows)

## Objective

Provision the **cell template** (`infra/tofu/modules/cell`) — the parameterized abstraction that an SRE instantiates per cohort (`primary` / `privacy` / `whale`) × environment (`dev` / `stage` / `prod`). The cell provisions a **CNPG `Cluster` CR (not an AlloyDB instance)** with Apache AGE + pgvector + RLS enabled in one cluster, the backup + PITR policy, GKE, Valkey (Memorystore-for-Valkey-9.0 interim), Redpanda (interim, AutoMQ-bound per ADR-0004), and Cloud KMS. This is the substrate for the truth spine (`07`/`08`); the AGE-in-transaction invariant (`00` §2) is preserved by construction because AGE + the relational tier + pgvector + RLS share one cluster. This ticket *is* the M0 closure work ADR-0003 names.

## Dependencies

- **Tickets:** T01 (the workspace — `mise.toml` pins OpenTofu + the CNPG operator + AGE versions; `infra/` is a workspace root).
- **External:** OpenTofu (pinned in T01); the CloudNativePG operator (a pinned version — `STACK_VERIFICATION_CHECKLIST.md` M0); Apache AGE (a pinned version compatible with the pinned Postgres major — `STACK_VERIFICATION_CHECKLIST.md` M0); pgvector; a GCP project + the founder's `gcloud` auth (the `dev/primary` instantiation runs against a real GCP project — the founder provisions this outside the ticket).

## Files

- `infra/tofu/modules/cell/versions.tf` — the OpenTofu + provider version pins (GCP, CNPG operator via the kubectl/CRD provider).
- `infra/tofu/modules/cell/variables.tf` — the cell parameters: `cohort` (`primary`/`privacy`/`whale`), `environment` (`dev`/`stage`/`prod`), `postgres_major` (pinned, with the AGE-compat matrix cite), `age_version`, `pgvector_version`, `region`, the GKE node shape, the Valkey tier, the Redpanda tier, KMS key-ring refs.
- `infra/tofu/modules/cell/main.tf` — **no `alloydb` provider or resource anywhere** (ADR-0003 + `STACK_DRIFT_WATCHDOG.md` category 1). The provision:
  - the GKE cluster (the cell's compute).
  - the **CNPG `Cluster` CR** (`postgres_major` pinned) — the heart of the cell. The CR's `extensions` bootstrap includes AGE + pgvector; the `backup` schedule + the `recoveryWindow` (PITR) policy; the `bootstrap` init SQL that creates the RLS roles (`STACK_VERIFICATION_CHECKLIST.md` M0 — "extension bootstrap AGE, pgvector" + "backup/PITR drill").
  - the AGE extension bootstrap (the `CREATE EXTENSION age` in the CNPG init SQL, with the AGE↔Postgres compatibility matrix checked against the AGE release notes — `STACK_DRIFT_WATCHDOG.md` category 5).
  - the Valkey instance (Memorystore for Valkey 9.0, `29` §2) — interim; the Memorystore tier per cohort.
  - the Redpanda instance — interim, ADR-0004's graduation target is AutoMQ; the resource is named with the `// ADR-0004 PROPOSED: interim-bus, graduation-target=automq` comment (`STACK_DRIFT_WATCHDOG.md` category 1 — WarpStream forbidden, Redpanda interim, AutoMQ the future).
  - the Cloud KMS key-ring + the KEK — the envelope-encryption root (`16` §6; ADR-0003 closure "KMS HSM + the KEK").
- `infra/tofu/modules/cell/outputs.tf` — the cell's exports (the CNPG cluster's connection string secret ref, the Valkey endpoint, the Redpanda brokers, the KMS key-ring id) for the downstream M1 migrations + the M2 gateway.
- `infra/tofu/modules/cell/README.md` — the cell template's runbook: how an SRE instantiates a cell, the AGE-compat matrix, the backup/PITR drill procedure, the `ADR-0003` cite, and the **infrastructure/SRE first-hire touchstone** (the closure-work pointer below).
- A minimal `infra/tofu/envs/dev/primary/main.tf` (the `dev/primary` instantiation calling the module) — so `tofu plan` has a real target. (The full per-env overlay set is T05; T04 ships enough to plan the dev cell.)

## Acceptance criteria

- [ ] `tofu fmt -check` + `tofu validate` on `infra/tofu/modules/cell` are green.
- [ ] `tofu plan` on the `dev/primary` workspace is green (the plan shows: a GKE cluster, a CNPG `Cluster` CR with AGE + pgvector in the extensions bootstrap, backup + PITR, a Valkey instance, a Redpanda instance, a KMS key-ring + KEK).
- [ ] **`grep -ri alloydb infra/` returns zero hits** outside `adr/0003-*` + `docs/29_STACK_VERIFICATION.md` + `docs/enforcement/STACK_DRIFT_WATCHDOG.md` + the cell README's `ADR-0003` cite (`STACK_DRIFT_WATCHDOG.md` category 1 — the watchdog confirms this).
- [ ] The CNPG operator version is pinned + the CloudNativePG CRD version matches it (`STACK_VERIFICATION_CHECKLIST.md` M0 — "CNPG operator version pinned").
- [ ] The AGE version is pinned + its compatibility with the pinned Postgres major is cited in a comment pointing at the AGE release notes (`STACK_DRIFT_WATCHDOG.md` category 5 — the AGE↔Postgres compat matrix is a tracked invariant).
- [ ] The pgvector version is pinned + compatible with the pinned Postgres major.
- [ ] The CNPG `Cluster` CR includes the backup schedule + the PITR (`recoveryWindow`) policy + the extension bootstrap (AGE, pgvector) (`ADR-0003` closure — "backup schedule + PITR policy + extension bootstrap").
- [ ] The Redpanda resource is the interim bus, commented with the `ADR-0004 PROPOSED: graduation-target=automq` pointer; no `warpstream` reference (`STACK_DRIFT_WATCHDOG.md` category 1).
- [ ] The KMS key-ring + the KEK are provisioned (the envelope-encryption root; `16` §6).
- [ ] The cell README cites `ADR-0003` + names the AGE-in-transaction invariant it preserves + records the infra/SRE first-hire touchstone (below).
- [ ] No frozen doc edited; the change is confined to `infra/`.

## Tests

- **Plan-test (no live apply at M0):** `tofu plan` on `dev/primary` is green + the plan's resource list is asserted against an expected set (the CNPG Cluster, GKE, Valkey, Redpanda, KMS — five resources, no AlloyDB). The assert is a `tools/check-cell-plan.{sh,ps1}` script that greps the plan output for the expected resource types + fails on `alloydb`.
- **Watchdog-pattern test:** the stack-drift watchdog (T07) on this ticket's diff returns `clean` — no `alloydb`, no `warpstream`, no unratified swap. (T04's own acceptance incl. the grep above is the local form; T07's CI job is the recurring form.)
- **AGE-compat cite test:** the AGE version comment in `main.tf` cites the AGE release-notes URL + the compatible Postgres major — a `tools/check-age-compat.{sh,ps1}` asserts the comment + the version match.
- **PITR-config test:** the CNPG `Cluster` CR's `backup.recoveryWindow` is set (a non-empty value); the plan shows the backup schedule. (The *restore drill* is M1 — `STACK_VERIFICATION_CHECKLIST.md` M1 — not M0; T04 ships the *config*, M1 proves it.)

## Definition of Done

- [ ] Every acceptance criterion closed; `tofu plan` green + the plan-test asserts the expected resources + the watchdog-clean verdict.
- [ ] Coding standard met: the OpenTofu is `tofu fmt`'d + `tofu validate`'d; the variables are typed; the comments cite the ADR + the doc-pointers.
- [ ] Review passed at Tier 1: the **full adversarial panel** — Correctness (the CNPG CR is well-formed; the extensions bootstrap is correct), Security (the KMS + the RLS-ready roles; no credential in the TF state — the connection secret is a secret-ref, not a plaintext output), Architecture-alignment (the cell matches `16` §2; the AGE-in-transaction invariant is preserved by the single-cluster design), Contract-spine (N/A — infra, but the cell's outputs feed M1's contracts), Stack-drift (the watchdog is clean — no AlloyDB/WarpStream), Provenance (the cluster's writes will be reproducible; the backup/PITR config is in place), AI-Intelligence (N/A — no LLM seam), Dial-CI (N/A).
- [ ] The `ADR-0003` closure items this ticket owns (cell-template provision, AGE/pgvector bootstrap, backup/PITR config, the watchdog AGE-compat matrix) are closed *by this ticket*; the `TODO(ADR-0003, infra/sre)` items this ticket does **not** own (the M1 backup/PITR drill, the M1 infra/SRE hire plan) are recorded as pointers in the cell README.
- [ ] Stack-drift watchdog green (category 1 — no AlloyDB/WarpStream/Quickwit; category 5 — the AGE-compat cite is present).
- [ ] Docs updated: the cell README cites `ADR-0003` + the AGE-in-transaction invariant + the infra/SRE first-hire touchstone; `_RECOVERY.md` reflects the M0 state.
- [ ] Checkpoint written; commit-ready (`feat(infra): T04 — the cell template (CNPG + GKE + Valkey + Redpanda + KMS, per ADR-0003)` with `Refs: ADR-0003, 16 §2, 00 §2 invariant, 29 §3 Swap 2`).

## Estimated complexity

**L — ~2 days.** The risk is the CNPG operator's CR shape (the `Cluster` CR's `spec.postgresql.extensions` bootstrap syntax + the `backup.barmanObjectStore` config for the GCS-backed PITR) + the AGE↔Postgres version matrix. The mitigation: the AGE release-notes cite is the live evidence; the plan-test catches a misconfigured CR before apply.

## Notes for the implementer

- **This is the M0-critical ADR-0003 ticket.** Read `adr/0003-self-managed-postgres-cnpg-not-alloydb.md` *before* coding (`AI_USAGE_RULES.md` §A). The ADR's Decision + Closure-work are the spec; the ADR is the authority. Cell template provisions CNPG — if the diff contains `alloydb`, it's wrong.
- **The AGE-in-transaction invariant is preserved by the single-cluster design**, not asserted by it. The single CNPG cluster with AGE + the relational tier + pgvector + RLS is the design choice that preserves it; the *demonstration* (a graph query joining relational rows in one transaction) is M1 (`STACK_VERIFICATION_CHECKLIST.md` M1). T04 ships the substrate; M1 demonstrates the invariant on it.
- **Infra/SRE first-hire touchstone (record, do not execute, in T04):** ADR-0003 makes the infra/SRE hire non-deferrable at M1 (founder-funding-conditional per `28` §7). T04 *records* the touchstone in the cell README — "M1 closure: the one-page infra/SRE hiring plan ahead of M1; the hire lands before the M2 scale path" — as a `TODO(ADR-0003, infra/sre): m1-hire-plan` pointer. T04 does *not* write the hiring plan (that's an M1 pre-work item, not M0 work); it points to it.
- **Do not apply the cell to prod.** T04 ships the *template* + the `dev/primary` instantiation; `tofu plan` is green. A live apply to `dev/primary` is the M0 closure condition (`25` §3 — "the dev cell is up"), and it runs on the founder's GCP project — coordinate the apply with the founder; the apply itself is not a T04 code artifact, it's the M0 deployment event.
- **The Redpanda resource is interim.** Comment it `// ADR-0004 PROPOSED: interim-bus, graduation-target=automq` (`STACK_DRIFT_WATCHDOG.md` category 1). The AutoMQ swap lands at the Phase-2 graduation trigger (`ADR-0004`), not M0.
- **No `:latest` image tags.** The CNPG operator + the sidecars are pinned by digest/version per the audit (`29` §6); the `:latest` tag is impossible by construction (`24` §6).
