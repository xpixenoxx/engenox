# ENGENOX — CLOUD INFRASTRUCTURE SETUP FOR NEW LAPTOP

> **Run this AFTER the main context prompt.** This covers GCP, OpenTofu, Argo CD, and secrets for cloud deployment.

---

## ☁️ CLOUD ARCHITECTURE (FROM FROZEN BLUEPRINT)

| Component | Choice | Purpose |
|-----------|--------|---------|
| **Primary Cloud** | **GCP** | All managed services + GKE |
| **Edge** | **Cloudflare** | R2 (WORM), Workers, KV, CDN, Turnstile |
| **IaC** | **OpenTofu** (not Terraform) | `infra/tofu/` — cell abstraction |
| **CD** | **Argo CD** (GitOps) | `infra/argocd/` — apps for dev/stage/prod |
| **K8s** | **GKE Autopilot** | CNPG operator for self-managed Postgres |
| **Containers** | **Artifact Registry** | Docker images per service |
| **Secrets** | **HashiCorp Vault** (or GCP Secret Manager) | KEK/DEK, API keys, DB passwords |

---

## 📁 INFRASTRUCTURE LAYOUT (IN REPO)

```
infra/
├── tofu/
│   ├── modules/
│   │   ├── cell/              # Reusable cell template (M0 target: T04)
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── r2/                # Cloudflare R2 module (WORM buckets)
│   ├── envs/
│   │   ├── dev/primary/       # Dev environment (current focus)
│   │   │   ├── main.tf
│   │   │   ├── providers.tf
│   │   │   ├── variables.tf
│   │   │   ├── terraform.tfvars  ⚠️ SECRETS - NOT IN GIT
│   │   │   └── backend.tf
│   │   ├── stage/primary/
│   │   └── prod/primary/
├── kustomize/
│   ├── base/                  # Base K8s manifests
│   │   ├── configmap.yaml
│   │   ├── ingress.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       └── dev/               # Dev overlay
├── argocd/
│   ├── applications/
│   │   ├── dev.yaml
│   │   ├── stage.yaml
│   │   └── prod.yaml
│   └── install/
│       └── kustomization.yaml
└── policies/                  # OPA/Gatekeeper policies
```

---

## 🔐 SECRETS YOU NEED (NOT IN GIT — CREATE ON NEW LAPTOP)

### 1. OpenTofu Variables (`infra/tofu/envs/dev/primary/terraform.tfvars`)

```hcl
# GCP
project_id        = "your-gcp-project-id"
region            = "us-central1"
zone              = "us-central1-a"

# GKE
cluster_name      = "engenox-dev"
node_pool_name    = "default-pool"

# Cloudflare
cloudflare_api_token = "cf-token-with-zone-read-r2-edit"
cloudflare_account_id = "your-account-id"
cloudflare_zone_id    = "your-zone-id"

# Cloudflare R2 (WORM buckets for corpus)
r2_access_key_id     = "r2-access-key"
r2_secret_access_key = "r2-secret-key"

# Postgres (CNPG will manage, but initial superuser)
postgres_superuser_password = "generate-strong-password"

# Vault (for KEK/DEK management)
vault_addr           = "https://vault.yourdomain.com"
vault_token          = "vault-token"

# WorkOS (Auth)
workos_client_id     = "client_id"
workos_api_key       = "sk_..."
workos_organization_id = "org_..."

# LLM Providers (for gateway)
anthropic_api_key    = "sk-ant-..."
openai_api_key       = "sk-..."
google_api_key       = "AIza..."

# Langfuse
langfuse_secret      = "generate-strong-secret"
langfuse_salt        = "generate-salt"
langfuse_encryption  = "generate-32-byte-hex"

# Argo CD
argocd_admin_password = "bcrypt-hash-of-password"
```

### 2. GCP Authentication

```bash
# On new laptop:
gcloud auth login                    # User creds
gcloud auth application-default login # ADC for tofu/terraform
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs (one-time per project)
gcloud services enable \
  container.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudkms.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com
```

### 3. Cloudflare Authentication

```bash
# Option A: API Token (recommended for CI)
# Cloudflare Dashboard → My Profile → API Tokens → Create Token
# Permissions: Zone:Read, R2:Edit, Account:Read
export CLOUDFLARE_API_TOKEN="cf-token-here"

# Option B: Global API Key (legacy)
export CLOUDFLARE_EMAIL="you@example.com"
export CLOUDFLARE_API_KEY="global-key"
```

### 4. Vault Setup (for Crypto/KEK)

```bash
# If using Vault (recommended for dual-canonical two-fence)
vault login token=...

# Enable transit engine for KEK
vault secrets enable -path=transit transit
vault write -f transit/keys/engenox-kek type=aes256-gcm96

# Store DEKs per-tenant (envelope encryption)
# This is done by services/crypto at runtime
```

---

## 🛠️ TOOLS TO INSTALL ON NEW LAPTOP (CLOUD)

```bash
# mise will install these from mise.toml, but verify:
tofu --version      # OpenTofu ≥ 1.8
kubectl version --client
gcloud --version
argocd version
helm version

# If not using mise, manual install:
# OpenTofu: https://opentofu.org/docs/intro/install/
# gcloud: https://cloud.google.com/sdk/docs/install
# argocd: https://argo-cd.readthedocs.io/en/stable/getting_started/
# kubectl: https://kubernetes.io/docs/tasks/tools/
```

---

## 🚀 DEPLOYMENT COMMANDS (FOR REFERENCE)

### Dev Cell Bring-Up (T04 — First M0 Ticket)

```bash
cd infra/tofu/envs/dev/primary

# 1. Initialize (downloads providers, modules)
tofu init

# 2. Plan (review what will be created)
tofu plan -out=tfplan

# 3. Apply (creates GKE cluster, CNPG, R2 buckets, etc.)
tofu apply tfplan

# 4. Verify
kubectl get nodes
kubectl get pods -n cnpg-system
kubectl get clusters.postgresql.cnpg.io -A
```

### Argo CD Bootstrap

```bash
# Install Argo CD to cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Or use the repo's kustomize:
kubectl apply -k infra/argocd/install/

# Access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Login: admin / (password from terraform.tfvars or secret)
```

### Deploy Services via Argo CD

```bash
# Applications are in infra/argocd/applications/
# They point to infra/kustomize/overlays/dev/

# Sync manually (or auto-sync enabled in app spec)
argocd app sync engenox-dev
argocd app sync engenox-dev-control-plane
argocd app sync engenox-dev-perception
# ... etc
```

### Build & Push Container Images

```bash
# Configure Docker for Artifact Registry
gcloud auth configure-docker REGION-docker.pkg.dev

# Build each service (example for action)
cd services/action
docker build -t REGION-docker.pkg.dev/PROJECT/REPO/action:latest .
docker push REGION-docker.pkg.dev/PROJECT/REPO/action:latest

# Or use Cloud Build (cloudbuild.yaml files exist per service)
gcloud builds submit --config cloudbuild.yaml .
```

---

## 📋 CLOUD SETUP CHECKLIST FOR NEW LAPTOP

| Step | Command/Action | Done? |
|------|----------------|-------|
| 1. GCP project exists & billing enabled | Console → Billing | ⬜ |
| 2. Required APIs enabled | `gcloud services enable ...` | ⬜ |
| 3. `gcloud auth login` + `application-default login` | Run both | ⬜ |
| 4. Cloudflare API token created | Dashboard → API Tokens | ⬜ |
| 5. Vault running & transit engine enabled | `vault secrets enable transit` | ⬜ |
| 6. WorkOS organization configured | Dashboard → Organization | ⬜ |
| 7. LLM provider API keys obtained | Anthropic/OpenAI/Google consoles | ⬜ |
| 8. `terraform.tfvars` created with all secrets | `infra/tofu/envs/dev/primary/` | ⬜ |
| 9. `tofu init` succeeds | Run in dev/primary | ⬜ |
| 10. `tofu plan` shows valid plan | No errors | ⬜ |
| 11. GKE cluster created (after apply) | `kubectl get nodes` | ⬜ |
| 12. CNPG operator running | `kubectl get pods -n cnpg-system` | ⬜ |
| 13. Argo CD installed & accessible | Port-forward + login | ⬜ |
| 14. Artifact Registry repo created | `gcloud artifacts repositories create` | ⬜ |
| 15. Container images built & pushed | For all 7 services | ⬜ |
| 16. Argo CD apps synced | All services healthy | ⬜ |

---

## ⚠️ CRITICAL NOTES

### Dual-Canonical Two-Fence (ADR-0003, `25` §2)

> **DB clone w/o KEK = unintelligible. R2 clone w/o sig = unverifiable.**

- **KEK** in Vault (HSM-backed) → encrypts per-tenant **DEK**
- **DEK** encrypts Postgres data (via CNPG volume encryption) + R2 objects (SSE-C)
- **Signatures** on R2 objects → verify integrity without KEK
- **Quarterly rotation** of DEKs; KEK rotated annually

### Cell Abstraction (`infra/tofu/modules/cell/`)

Each environment (dev/stage/prod) = **one cell** containing:
- GKE cluster (Autopilot)
- CNPG Postgres cluster (primary + replicas)
- Redis/Valkey (Memorystore)
- Kafka/Redpanda (or AutoMQ at graduation)
- Temporal (separate Postgres)
- MinIO/R2 gateway
- ClickHouse
- Grafana stack
- Langfuse

**M0 Target (T04):** Bring up **dev cell** completely via OpenTofu.

### R2 WORM Buckets (Corpus Mirror)

```hcl
# Created by infra/tofu/modules/r2/
resource "cloudflare_r2_bucket" "corpus" {
  name              = "engenox-corpus"
  location          = "WNAM"
  object_lock_enabled = true  # WORM compliance
}
```

---

## 🔗 QUICK REFERENCE — CLOUD FILES IN REPO

| File | Purpose |
|------|---------|
| `infra/tofu/modules/cell/main.tf` | Cell template (M0 target) |
| `infra/tofu/envs/dev/primary/main.tf` | Dev cell instantiation |
| `infra/tofu/envs/dev/primary/providers.tf` | GCP, Cloudflare, Helm, K8s providers |
| `infra/tofu/modules/r2/main.tf` | R2 WORM buckets |
| `infra/kustomize/base/` | Base K8s manifests (deployments, services, configmaps) |
| `infra/kustomize/overlays/dev/` | Dev-specific patches (replicas, resources, env vars) |
| `infra/argocd/applications/dev.yaml` | Argo CD app pointing to dev overlay |
| `services/*/cloudbuild.yaml` | Cloud Build configs per service |
| `docker-compose.dev.yml` | Local dev stack (mirrors cloud services) |

---

## 🆘 TROUBLESHOOTING

| Issue | Fix |
|-------|-----|
| `tofu init` fails on provider download | Check GCP auth: `gcloud auth application-default print-access-token` |
| CNPG pods stuck in Pending | Check GKE node pool has capacity; check PVC storage class |
| Argo CD apps stuck in `Progressing` | Check `argocd app get APP -o yaml` for conditions; usually image pull secret missing |
| R2 bucket creation fails | Cloudflare token needs `R2:Edit` permission on account |
| Vault transit encrypt fails | Ensure `transit` engine enabled; check token has `write` on `transit/encrypt/engenox-kek` |

---

**Run this after main context prompt.** The cloud setup is **separate from local dev** — local uses `docker-compose.dev.yml`, cloud uses OpenTofu + Argo CD. Both configs are in repo.