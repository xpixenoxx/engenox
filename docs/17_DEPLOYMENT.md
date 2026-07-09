# 17 — Deployment

> **Status: FROZEN.** GitOps for infra + app config (OpenTofu + Argo CD), the CI gate chain (Buf contract-compat · RLS-introspection · idempotency · diff-review-blocker · SBOM/Trivy · Sigstore-signed OCI), the staged-promotion environments (dev → stage → canary-cell → prod), the blue/green cell cutover at the Cloudflare edge, the expand/contract DB migration discipline, and the rollback procedure (both the deploy-rollback and the data-rollback — separate). Authored against `16_INFRASTRUCTURE.md` (the cell), `15_SECURITY_ARCHITECTURE.md`, `09_BACKEND_ARCHITECTURE.md` (contract/CI gates), and `_FOUNDATION_TECH.md` Layer 14. **The repo is the source of truth for production; `kubectl apply` in prod is a discipline violation, not a shortcut.**

---

## 1. The single rule

**Every change to production — infrastructure, app config, DB schema, model routing — flows through one pipeline: a git commit → CI gates → a signed artifact → Argo CD reconciles.** No console clicks in prod; no `kubectl apply -f` in prod; no migration run by hand. The cone-of-deployment is GitOps from end to end; the audit log of "what is in prod right now" is the git log (commit + signed artifact + Argo CD sync history), not a person's memory.

This section defines the IaC + CD layers, the CI gates, the promotion environments, the cutover, and the rollback.

---

## 2. The IaC layer (OpenTofu — the cell template)

- **OpenTofu** (the Linux-Foundation Terraform fork, the 2026 OSS choice that avoids the BSL relicense) is the IaC engine.
- **The cell template** (16 §2) is a parameterized OpenTofu module — `module "cell" { source = "./modules/cell"; region = var.region; class = var.class; cohort_size = var.cohort_size }`. Standing up a new cell = `tofu apply` on a new workspace; the module provisions the GKE Autopilot cluster, the AlloyDB/Postgres instance, the Valkey, the Redpanda, the Cloud KMS key, the Vault namespace, the Cloudflare-edge routing rule.
- **State** in GCS (or GCS-equivalent) with state-lock; the state is itself per-cell (per-workspace); a corrupted state is recoverable from the `import` against the live resources + the git module.
- **The provider stack:** Google (GCP), Cloudflare (edge + R2 + Workers), Vault (secrets), Redpanda/Kafka (wire-up), Buf (schema registry wire-up for the event contract).

### Why OpenTofu over Pulumi/SST/AWS-CDK
- Pulumi/CDK entangle infra with the language runtime (a Python/TS program is the source of truth); OpenTofu keeps it declarative + reviewable as a diff, which is the audit posture a security-reviewed product needs. The Infra critique's "infrastructure should be readable as a diff in a PR" is the OpenTofu argument.
- SST's higher-level abstractions are nice but hide the cell shape from the reviewer; the cell is the unit of scale + isolation (16 §1), and the infra diff must surface it.
- OpenTofu is the upgrade path from any Terraform expertise + the wider ecosystem of providers; the БСЛ/license risk is acknowledged + the 2027 relicense is evaluable (per `_FOUNDATION_TECH.md` Layer 14).

---

## 3. The CD layer (Argo CD — the reconciliation)

- **Argo CD** is the K8s reconciler. The pattern is **app-of-apps**: a root app per cell points to a directory of service apps (Control Plane, Perception, Decision, Action, Measurement, LLM Gateway, Temporal workers); updating one service is one commit to its manifest dir; Argo CD syncs.
- **Manifests:** Kustomize with overlays per env (dev / stage / canary / prod) × per cell-class (primary / privacy / whale). The privacy overlay has the no-egress network policies baked in (15 §8) — the overlay cannot apply to a non-privacy cell.
- **Sync policy:** auto-sync for non-prod; **manual sync for prod** (a human approves the prod sync in Argo CD with the deploy-id); the rollback is one click to a prior sync.
- **DNS / routing:** Cloudflare Workers handle the per-cell routing at the edge (16 §2); the cutover is a weight flip at Cloudflare (§6), not a DNS propagation wait.

### Why Argo CD over Flux
- Comparable in capability; Argo CD's UI + the multi-tenant app-of-apps pattern + the manual-sync-for-prod posture is a cleaner fit for the cell abstraction. Flux's pull model is fine; the choice is reversible (the manifests are Kustomize; both consume them).

---

## 4. The CI pipeline (the gate chain)

Every PR runs the gate chain; a failing gate blocks the merge. The gates map directly to the invariants in the prior docs:

| Gate | What it asserts | Failing = blocked | Source |
|---|---|---|---|
| **Buf contract-compat** | the contract package's Protobuf/JSON-Schema change is `BACKWARD`-compatible (events) / strict-add-only (entities) | incompatible PR blocked | 09 §4, 14 §5 |
| **RLS-introspection** | every new Postgres table has an RLS policy; no SUPERUSER in the app pool | table-without-RLS blocked | 15 §3 |
| **canary-row test** | tenant `canary_b` sees zero rows from `canary_a` across the schema | cross-tenant visibility blocked | 15 §3 |
| **idempotency test** | every external-side-effect activity re-execution produces no duplicate side-effect (re-PR, re-webhook sends exactly once) | non-idempotent activity blocked | 09 §2 |
| **diff-review-blocker test** | the rule-based diff-review's own test cases (the deny-list + allow-list logic) pass; an off-allow-list path is blocked | regression in the blocker blocked | 15 §5 |
| **dial property tests** | escalation requires all 3 axes clear; demotion-on-alert fires on N alerts; no escalation bypasses the ledger | dial-bypass blocked | 12 §5, §7 |
| **golden-probe regression** | the frozen probe fixtures' assertions hold (pipeline behavior, not surface outputs) | regression blocked | 11 §7, 23 |
| **Vitest / Go test / pytest** | unit + integration across the polyglot tiers | failing test blocked | 23 |
| **Trivy SBOM scan** | no critical CVE in a prod dependency unpatched | critical CVE blocked | 15 §10 |
| **secret-scan** | no secret in the repo | secret commit blocked | 15 §10 |
| **Biome+lint** | the code-style gate; the type strictness gate | lint error blocked | 22 |

The pipeline is the **enforcement of the architecture's invariants**, not a formality. A PR that breaks the contract, leaves a table without RLS, or ships a non-idempotent activity **cannot reach prod** — the gate chain is the one-way valve.

---

## 5. The staged-promotion environments

| Env | Tenant cohort | Data | Purpose | Promote trigger |
|---|---|---|---|---|
| **dev** | synthetic / ephemeral | mocked surfaces, deterministic probe fixtures | every PR; the unit + integration suite; the closed-loop dry-run | (every PR merges to dev) |
| **stage** | a multi-tenant slice of synthetic + a **subset of the consented panel** (13 §6) | real surfaces (probed), synthetic tenancy | the integration env; the closed loop runs end-to-end; the conformal-coverage + the dial-ledger tests | weekly cadence; or any prod-bump PR |
| **canary-cell** | a small production cohort (1% of a cell) | live | the gated release: 1% → 10% → 50% → 100%; the canary's degradation-alert/EWMA + the eval divergence is monitored before the next step | the prior step's metrics are clean for the dwell window |
| **prod** | the cell cohort | live | the served cohort | the canary's metrics are clean through 100% |

- **The canary's "clean" criteria** are explicit + numeric: EWMA/CUSUM degradation alerts under threshold, eval divergence (the warm-canary's LLM-path-vs-symbolic-path divergence, 11 §6) under threshold, p99 latency within the budget, the dial-ledger demotion count under threshold. A canary that fails the criteria **auto-rolls back** to the prior image; the deploy-id is alerted.
- **The dwell window** is per-tier: short for a low-risk Control-Plane change (hours), long for a Measurement/estimator change (a full InterventionSaga cycle, weeks — the estimator's effect is only visible on a measured outcome). The promotion policy encodes the dwell by changed-component.

---

## 6. The blue/green cell cutover

A new cell (or a cell-pair DR, or a graduation cutover) is **blue/green at the edge**:
1. The new cell stands up (OpenTofu apply) alongside the old; both are live; only the old receives traffic.
2. Cloudflare Worker routing weight flips 1% → 10% → 50% → 100% over the cutover window.
3. At each step, the new cell's metrics (latency, error, the closed-loop's cycle time, the dial-ledger demotion rate) must match or beat the old's; if not, the weight flips back (the rollback = a Cloudflare config commit).
4. At 100% + the dwell window clean, the old cell drains + decommissions.

The duel-write window for a data-plane graduation (Postgres → Citus, per 16 §8) runs *before* the cutover — the new store is fed in parallel, the nightly three-sinks reconciliation (08 §5) is the validation; only when reconciliation is clean for N cycles does the read cutover flip.

### Why blue/green not rolling
- The cell is the unit; a rolling update would mix versions within a cell, breaking the closed-loop's per-cycle determinism (a partial-version AtlasCycle would be untraceable). Blue/green keeps a cell's services version-coherent; the cut is at the cell boundary.

---

## 7. The release artifacts (signed OCI)

- Every service build produces an **OCI image** in Artifact Registry (or ghcr.io for the dev-tier); the image is **signed via Sigstore/cosign** with the build's OIDC identity (keyless signing).
- The Argo CD Application manifest pins the image by **digest** (not tag — tags are mutable; `:latest` is forbidden in prod). The signature verification is an Argo CD app-side check (or an OPA Gatekeeper admission policy in the cluster).
- The commit → image → digest → sync chain is the audit artifact: a deploy is attributable to a commit, a commit to an author, an author to a review (the PR merge). The Provenance Audit Hover's "this number came from this deploy" is a typed join in the audit log.

---

## 8. The rollback procedure (two kinds — keep them separate)

There are **two kinds of rollback** and conflating them is a classic incident cause:

### (a) Deploy rollback (revert the version)
- Argo CD `app rollback` to the prior sync; the image-digest reverts; Argo CD reconciles.
- A git revert is the source-of-truth counterpart; the deploy-rollback + the git-revert together restore the audit chain.
- **This does not revert data.** A reverted version of the service reads the same Postgres as before; the bi-temporal model (13 §4) means the reverted service sees the *current* `valid_time` state — which may include rows the old version never wrote. The expand/contract migration discipline (§10) ensures the new version's writes don't break the old version's reads.

### (b) Data rollback (revert the intervention — the closed loop's own rollback)
- The regret-rollback (12 §7) is *data* rollback: it reverts a merged PR on the customer's site via the pre-staged rollback-hash. This is **per-intervention, per-tenant**, not per-deploy.
- A deploy-rollback cannot undo a regretted intervention (the intervention is on the customer's site, not in our cluster); a regret-rollback cannot undo a bad deploy (the bad deploy is in our cluster, not on the customer's site). The two procedures are owned by different on-call roles and run independently.

### The canary's auto-rollback triggers (a); the regret-detector triggers (b). Both are automated; both are audited; they are never confused.

---

## 9. Secrets + config (External Secrets Operator → Vault)

- **External Secrets Operator** is the K8s binding; the manifest references a `SecretStore` pointing at Vault; the operator materializes the secret into a K8s Secret (or, for the GPU-bound services, into the runtime via Vault Agent sidecars).
- **No secret in git.** The manifest has the *name*; the *value* is in Vault under the per-env, per-cell namespace.
- **Rotation** (15 §4): the Vault-rotated DEK / signing-key is picked up by the ExternalSecret refresh; the per-tenant rotation job is a Temporal workflow (idempotent, audit-logged).

---

## 10. DB migrations (expand/contract — never destructive in-place)

- The migration engine is **Atlas** (or sqitch — the choice is the one that enforces the lint; ⚠️-verify Atlas's Postgres bi-temporal support) for the schema changes; Prisma for the typed app-level access (or Drizzle — `_FOUNDATION_TECH.md` Layer 7).
- **Expand/contract discipline:**
  1. **Expand:** add the new column/ table with the new shape (nullable, default-null); deploy the new version that writes both shapes.
  2. **Populate:** a backfill job (a Temporal activity, idempotent) fills the new shape for historical rows.
  3. **Use:** deploy the version that reads the new shape.
  4. **Contract:** after the dual-write cohort is stable + the old shape is unused, a separate migration drops the old column.
- **The destructive ALTER is split across deploys:** the `DROP COLUMN` is a *later* PR, after the cohort confirms the new shape is the only read path. The CI gate (15 §3, "no DROP COLUMN" lint for the bi-temporal model) blocks a destructive ALTER in the same PR as the expand.
- **Reversibility:** any expand step is reversible without data loss (the old shape is still there; the new shape is ignored on rollback). The contract step (drop) is the only forward-only one, and it runs only after the cohort confirms the irreversibility is safe.

---

## 11. The deployment invariants

1. **GitOps end-to-end; no prod `kubectl apply` by hand.** OpenTofu + Argo CD; the repo is the source of truth.
2. **The CI gate chain blocks every invariant-breaking PR** (contract-compat, RLS, idempotency, diff-review, dial, golden-probe, SBOM, secret-scan). The gates are the architecture's enforcement.
3. **Promotion is staged (dev → stage → canary-cell → prod) with explicit numeric "clean" criteria at each step;** a canary that fails auto-rolls back to the prior image.
4. **Cells are blue/green at the Cloudflare edge;** the cutover is a weight flip; the cell's services are version-coherent within it.
5. **OCI images are Sigstore-signed + pinned by digest in prod;** `:latest` is forbidden.
6. **Deploy-rollback (the version) and data-rollback (the intervention) are separate procedures owned by separate roles;** they are never confused.
7. **DB migrations are expand/contract; destructive ALTERs are split across deploys and gated by the cohort's confirmation;** the bi-temporal model forbids `DROP COLUMN` in the same PR as the expand.
8. **Secrets in Vault via External Secrets Operator; never in git; rotation is a Temporal workflow.**

---

*End of deployment. Next: `18_API_SPECIFICATION.md` — the GraphQL+BFF surface, the REST webhook-out + the AI-referral pixel endpoint, the SSE/subscription contract, the typed-auth envelope, and the Buf-generated client contract.*
