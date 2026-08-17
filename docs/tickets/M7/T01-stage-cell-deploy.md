# T01 — Stage Cell Deploy (Extend Dev Cell for Stage Workload)

> **Depends on:** M6 complete (E43), T04 (dev cell)
> **Enables:** T02–T07

---

## Objective

Provision a **stage environment** in the founder's GCP project, isolated from the dev cell, with:
- Dedicated CNPG cluster (Postgres + AGE + pgvector + RLS)
- Dedicated Temporal namespace (self-hosted Postgres backend)
- Dedicated Redpanda topic prefix (`stage.*`)
- **R2 bucket `engenox-corpus` with Object-Lock Compliance mode (7-year retention)**
- Cloudflare Workers for edge auth proxy (WorkOS → Vault)
- All outputs as secret-refs (no credentials in TF state)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  GCP Project: engenox-stage                                      │
│  Region: us-central1 (same as dev for cost; separate VPC subnet) │
├─────────────────────────────────────────────────────────────────┤
│  GKE Cluster: engenox-stage-cell                                 │
│   ├─ Node pool: workload=database (tainted, 3× n2-standard-4)   │
│   ├─ CNPG Cluster: stage-pg (PG17 + AGE 1.6 + pgvector 0.8.2)  │
│   ├─ Temporal: temporal-stage (namespace, Postgres backend)     │
│   ├─ Redpanda: stage-redpanda (topic prefix: stage.*)           │
│   ├─ Memorystore Valkey 9.0: stage-valkey                       │
│   └─ Cloud KMS: stage-keyring + stage-kek                       │
├─────────────────────────────────────────────────────────────────┤
│  Cloudflare Account: engenox                                     │
│   ├─ R2 Bucket: engenox-corpus (Object-Lock Compliance, 7y)    │
│   ├─ Workers: stage-auth-proxy (WorkOS JWT validation)          │
│   └─ KV: stage-config (feature flags, dial defaults)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Terraform Structure

```
infra/tofu/envs/stage/primary/
├── main.tf              # module "cell" + stage-specific resources
├── providers.tf         # google, kubernetes, cloudflare, kms
├── variables.tf         # stage-specific vars
├── versions.tf          # pinned providers
└── backend.tf           # GCS backend (separate from dev)
```

**Key differences from dev:**
| Resource | Dev | Stage |
|---|---|---|
| CNPG cluster name | `dev-pg` | `stage-pg` |
| Temporal namespace | `temporal-dev` | `temporal-stage` |
| Redpanda topics | `dev.*` | `stage.*` |
| R2 bucket | `engenox-corpus-dev` (no lock) | `engenox-corpus` (Object-Lock Compliance) |
| KMS keyring | `dev-keyring` | `stage-keyring` |
| Replicas | 1 (cost) | 3 (HA) |
| Backup retention | 7 days | 30 days |

---

## R2 Object-Lock Setup (Critical Path)

```hcl
# infra/tofu/modules/r2/main.tf (new module, called from stage env)
resource "cloudflare_r2_bucket" "corpus" {
  account_id = var.cloudflare_account_id
  name       = "engenox-corpus"
  location   = "WNAM"  # or EU for GDPR tenants

  object_lock_configuration {
    object_lock_enabled = "Enabled"
    rule {
      default_retention {
        mode  = "COMPLIANCE"
        days  = 2555  # 7 years
      }
    }
  }

  lifecycle_rule {
    enabled = true
    abort_incomplete_multipart_upload_days = 7
  }
}
```

**Verify:** `wrangler r2 bucket info engenox-corpus` → `ObjectLockEnabled = true`, `DefaultRetentionMode = COMPLIANCE`

---

## Two-Phase Apply (Same Pattern as T04)

```bash
# Phase 1: Google resources only (no kubeconfig needed)
cd infra/tofu/envs/stage/primary
tofu init
tofu apply -target=module.cell.google_container_cluster.primary \
              -target=module.cell.google_storage_bucket.pitr \
              -target=module.cell.google_kms_key_ring.stage \
              -target=module.cell.google_kms_crypto_key.kek \
              -target=module.cell.google_memorystore_instance.valkey \
              -target=cloudflare_r2_bucket.corpus \
              -target=cloudflare_worker_script.auth_proxy

# Phase 2: Kubernetes manifests (needs live GKE kubeconfig)
gcloud container clusters get-credentials engenox-stage-cell --region=us-central1
tofu apply  # applies kubernetes_manifest resources
```

---

## Outputs (Secret-Refs Only)

| Output | Value | Consumed By |
|---|---|---|
| `stage_pg_app_secret` | `stage-pg-app` (CNPG Secret name) | All services via Vault/SecretManager |
| `stage_temporal_namespace` | `temporal-stage` | Temporal client config |
| `stage_valkey_host` | `stage-valkey.xxx.us-central1.memorystore.google.com` | Gateway, Control-plane |
| `stage_r2_bucket` | `engenox-corpus` | Measurement corpus writer |
| `stage_kms_kek_name` | `projects/engenox-stage/locations/us-central1/keyRings/stage-keyring/cryptoKeys/stage-kek` | Envelope encryption |
| `stage_auth_proxy_url` | `https://stage-auth.engenox.workers.dev` | Web, Control-plane |

---

## Verification Gates

```bash
# 1. TF format + validate
tofu fmt -check -recursive
tofu validate

# 2. Check AGE compat (same as T04)
./tools/check-age-compat.sh

# 3. No AlloyDB / Warpstream in stage
grep -r alloydb infra/tofu/envs/stage/ && exit 1
grep -r warpstream infra/tofu/envs/stage/ && exit 1

# 4. Plan test (requires ADC + kubeconfig for phase 2)
./tools/check-cell-plan.sh stage primary

# 5. Post-apply: verify CNPG cluster ready
kubectl -n postgresql get cluster stage-pg -o jsonpath='{.status.phase}'  # → ClusterReady
kubectl -n postgresql get pod -l postgresql=stage-pg --field-selector=status.phase=Running  # → 3 pods

# 6. Verify R2 Object-Lock
wrangler r2 bucket info engenox-corpus | grep -E "ObjectLockEnabled|DefaultRetentionMode"
```

---

## Candor Flags

- [ ] Object-Lock **Compliance** mode (not Governance) — immutable even by root
- [ ] CNPG `enableSuperuserAccess=false` enforced
- [ ] Backup encryption uses stage KEK (not dev KEK)
- [ ] Temporal namespace isolation verified (no cross-namespace visibility)
- [ ] Stage apply does NOT touch dev resources (separate state backend)

---

## Files to Create/Modify

```
infra/tofu/modules/r2/                # NEW module
  ├── main.tf
  ├── variables.tf
  ├── outputs.tf
  └── README.md

infra/tofu/envs/stage/primary/        # NEW env
  ├── main.tf
  ├── providers.tf
  ├── variables.tf
  ├── versions.tf
  ├── backend.tf
  └── README.md

tools/check-cell-plan.sh              # EXTEND for stage env
tools/check-cell-plan.ps1             # EXTEND for stage env
```

---

## Acceptance Criteria

- [ ] `tofu apply` completes for both phases (green)
- [ ] CNPG cluster `stage-pg` shows `ClusterReady` with 3 replicas
- [ ] R2 bucket `engenox-corpus` has Object-Lock Compliance + 7y retention
- [ ] Temporal namespace `temporal-stage` accessible via `temporal` CLI
- [ ] All outputs are secret-refs (no plaintext credentials in TF state)
- [ ] `check-cell-plan.sh stage primary` exits 0
- [ ] Gates: contract-compat, lint, tests, dep-direction, security-scan, stack-drift all pass