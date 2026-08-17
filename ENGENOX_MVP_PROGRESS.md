# Engenox MVP Deployment Progress

**Last Updated**: 2026-07-25 (Session saved for continuation)
**Workspace**: `/d/Engenox` (D: drive, 81GB free)
**GCP Project**: `engenox-stage` | **Region**: `us-central1` | **Zone**: `us-central1-a`

---

## ✅ PHASE 1: GCP INFRASTRUCTURE - COMPLETED

| Resource | Status | Details |
|----------|--------|---------|
| GKE Cluster | ✅ Done | `engenox-primary-dev-gke` - 3 nodes e2-small, us-central1-a |
| GCS Bucket | ✅ Done | `engenox-primary-dev-pitr` (PITR backups) |
| KMS Key Ring + KEK | ✅ Done | `engenox-cell-kek` / `engenox-kek` |
| Valkey (Memorystore) | ✅ Done | `engenox-primary-dev-valkey` |
| CNPG CRDs + RBAC | ✅ Done | v1.25.4 |
| CNPG Operator | ✅ Deployed | v1.25.4 with fixes applied |

### CNPG Operator Fixes Applied
1. **Added `/run/secrets` emptyDir mount** - fixes "mkdir /run/secrets: read-only file system"
2. **Patched deployment args**: `--webhook-port=0` (disables webhook)
3. **Changed probes**: HTTP on port 8080 (was HTTPS on 9443)
4. **Removed TLS volumes**: No webhook cert mounts
5. **Created ConfigMap + Secret**: `cnpg-controller-manager-config` (empty required config)
6. **Strategy**: Changed to Recreate to avoid rolling updates

---

## ⚠️ CURRENT BLOCKER - PHASE 2

### Operator Status (as of last check)
```bash
# Current pods (run this tomorrow to verify):
kubectl get pods -n cnpg-system -l app.kubernetes.io/name=cloudnative-pg -o wide
```

| Pod | Status | Issue |
|-----|--------|-------|
| `cnpg-controller-manager-5dc7968b98-2dh9j` | CrashLoopBackOff | Old RS, "mkdir /run/secrets: read-only file system" |
| `cnpg-controller-manager-65cb4dff56-x49gk` | CrashLoopBackOff | Old RS, same issue |
| `cnpg-controller-manager-76dbc4c95b-bttkz` | Error | New pod with `/run/secrets` mount but failing PKI setup |

**Root Cause**: CNPG operator v1.25.4 still crashes on startup with "mkdir /run/secrets: read-only file system" even with emptyDir mount at `/run/secrets`. The PKI initialization in controller.go:390 tries to create `/run/secrets` directory before volume mounts are fully ready.

**Latest Log Error**:
```
{"level":"error","ts":"2026-07-24T21:09:32.99239191Z","logger":"setup","msg":"unable to setup PKI infrastructure","error":"mkdir /run/secrets: read-only file system","stacktrace":"github.com/cloudnative-pg/machinery/pkg/log.(*logger).Error\n\tpkg/mod/github.com/cloudnative-pg/machinery@v0.3.1/pkg/log/log.go:125\ngithub.com/cloudnative-pg/cloudnative-pg/internal/cmd/manager/controller.ensurePKI\n\tinternal/cmd/manager/controller/controller.go:390\n..."}
```

### Postgres Cluster Status
```bash
kubectl get cluster -n cnpg-system engenox-primary-dev
```
| Name | Age | Instances | Ready | Status | Primary |
|------|-----|-----------|-------|--------|---------|
| engenox-primary-dev | 21m | 1 | | Waiting for the instances to become active | |

**Certificates spec removed** from cluster to allow auto-generation with IP SANs for pod CIDR (10.80.0.0/14).

**No Postgres pods exist** - operator not ready to create them.

---

## 📋 REMAINING TASKS TO MVP LAUNCH

### Phase 2: K8s Manifests (After Operator Ready) ⏱️ ~30 min
| Task | Command / Action |
|------|------------------|
| Get operator Running + Ready | Fix `/run/secrets` read-only issue (see Options below) |
| Apply CNPG Cluster + ScheduledBackup | Already applied via `tofu apply` - will create pods once operator ready |
| Verify 3/3 Postgres replicas Ready | `kubectl get cluster -n cnpg-system engenox-primary-dev` |
| Verify AGE + pgvector extensions | `kubectl exec -n cnpg-system engenox-primary-dev-1 -- psql -c "SELECT * FROM pg_extension;"` |
| Install Temporal | Helm chart (PostgreSQL backend) |
| Install Redpanda | Helm chart (dev: single broker) |
| Apply Atlas migration | `atlas migrate apply --dir file://libs/kg/migrations/atlas` |
| Seed consent fixtures | Run seed script in `datasets/` |

### Phase 3: Service Deployments ⏱️ ~2-3 hours
| Service | Language | Deploy Method |
|---------|----------|---------------|
| Gateway | TS/Go | K8s Deployment + Service |
| Perception | Go | K8s Deployment + Service |
| Decision | TS | K8s Deployment + Service |
| Action | Go | K8s Deployment + Service |
| Measurement | Python/FastAPI | K8s Deployment + Service |
| Control Plane | TS/Hono | K8s Deployment + Service |
| Temporal Worker | TS | K8s Deployment |

**Prerequisites**: `buf generate` in `pkg/contracts/` → imports `@engenox/contracts`, Go module, Python package

### Phase 4: Integration & Validation ⏱️ ~1-2 hours
| Task | Description |
|------|-------------|
| AtlasCycle E2E | Full perception → decision → action → measurement cycle |
| M3-VAL-01 | Kill Temporal worker → verify replay correctness |
| Contract compat tests | `buf breaking` in CI |
| RLS canary tests | Verify tenant isolation |

### Phase 5: Web + Concierge ⏱️ ~2-3 hours
| Task | Description |
|------|-------------|
| Next.js 16 web deploy | Vercel or GKE + Cloudflare |
| Concierge cohort onboarding | First 10 pilot brands |
| Provenance Audit Hover | Candor UI verification |

### Phase 6: Launch Validation ⏱️ ~1 hour
| Gate | Criteria |
|------|----------|
| Green CI | All gates pass (contract-compat, RLS, idempotency, dial-props, golden-probe, Trivy, secret-scan, lints) |
| Conformal CI coverage | ≥90% by segment |
| Warm canary divergence | <5% drift |
| Dial default `propose` | No auto-merge in MVP |

---

## 🚀 QUICK START TOMORROW

```bash
# 1. Switch to workspace
cd /d/Engenox

# 2. Check operator status
kubectl get pods -n cnpg-system -l app.kubernetes.io/name=cloudnative-pg

# 3. FIX OPERATOR - Try these options in order:

# OPTION A: Check if current pod with /run/secrets mount just needs time
kubectl logs -n cnpg-system cnpg-controller-manager-76dbc4c95b-bttkz

# OPTION B: If still failing, check if volume mount timing issue
# The emptyDir at /run/secrets exists but operator tries mkdir before mount ready
# Try adding postStart hook or initContainer to create dir first

# OPTION C: Downgrade to v1.25.0 (was working before webhook issues)
# kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.25/releases/cnpg-1.25.0.yaml
# Then re-apply patches (--webhook-port=0, HTTP probes, tolerations, /run/secrets emptyDir)

# OPTION D: Disable PKI in operator config (if supported in v1.25.4)
# Check if operator can run without PKI setup

# 4. Once operator is 1/1 Ready, Postgres pods should auto-create:
kubectl get pods -n cnpg-system -l postgresql=engenox-primary-dev

# 5. Verify cluster:
kubectl get cluster -n cnpg-system engenox-primary-dev
kubectl get pods -n cnpg-system -l postgresql=engenox-primary-dev
```

---

## 🔑 KEY ENVIRONMENT INFO

| Item | Value |
|------|-------|
| kubeconfig | `~/.kube/config` (already merged) |
| GCP auth | `gcloud auth application-default login` (done) |
| CNPG version | 1.25.4 (release-1.25) |
| Postgres image | `ghcr.io/cloudnative-pg/postgresql:18.0-system-trixie` |
| Node pool | e2-small, 2 vCPU, 2GB, pd-standard, 3 nodes |
| Taints | `workload=database:NoSchedule` on all nodes |
| Pod CIDR | 10.80.0.0/14 |

---

## 📌 NOTES FOR CONTINUATION

- **Do NOT reinstall CNPG operator from scratch** - fixes are applied to existing deployment
- **Webhook configs deleted** - operator runs with `--webhook-port=0`, webhooks not needed for dev
- **ConfigMap + Secret created**: `cnpg-controller-manager-config` (empty, required by operator)
- **Certificates spec removed** from cluster - will auto-generate with IP SANs
- **If kubectl logs fails** ("No agent available"): Use gcloud SSH to node + `crictl logs <container-id>`
- **Tofu state** is remote/local - safe to re-run apply
- **All source code** in `/d/Engenox` - no C: drive dependencies
- **Postgres cluster already created** via tofu - just needs operator to reconcile it
- **PVC exists**: `engenox-primary-dev-1` (100Gi, standard-rwo)

---

## 🐛 KNOWN ISSUES TO FIX TOMORROW

1. **Operator CrashLoopBackOff**: `/run/secrets: read-only file system` - emptyDir mount exists but operator tries mkdir before mount ready
   - Fix: Try initContainer, postStart hook, or check if CNPG 1.25.4 has a config flag to disable PKI

2. **Operator version**: 1.25.4 uses Postgres 18 image (unexpected), 1.25.0 used 17.5
   - May need to pin Postgres image in cluster spec: `imageName: ghcr.io/cloudnative-pg/postgresql:17.5`

3. **Postgres pods not created**: Waiting for operator to become Ready

---

*File created for session continuity. Resume from Phase 2 blocker resolution (operator PKI setup).*