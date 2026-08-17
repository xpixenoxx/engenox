#!/usr/bin/env bash
# Week 1 Day 1 - Terminal Commands for 2-Terminal Parallel Execution
# Run these EXACT commands in two separate terminals
# PROJECT: engenox-stage | REGION: us-central1 | CLUSTER: engenox-primary-dev-gke

# ============================================================================
# TERMINAL 1 (T1) - INFRASTRUCTURE: R2 + Observability Stack + ClickHouse
# ============================================================================

# T1 Step 1: Prerequisites & Auth
gcloud config set project engenox-stage
gcloud auth application-default login
gcloud auth login
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# T1 Step 2: Get GKE Credentials
gcloud container clusters get-credentials engenox-primary-dev-gke --region us-central1 --project engenox-stage

# T1 Step 3: Deploy R2 Bucket with Object-Lock via OpenTofu
cd /d/Engenox/infra/tofu/envs/stage/primary
tofu init
tofu plan -target=module.r2
tofu apply -target=module.r2 -auto-approve

# T1 Step 4: Deploy Observability Stack (Mimir, Loki, Tempo, Grafana)
cd /d/Engenox/infra/kustomize/overlays/dev/observability
kubectl apply -k .

# T1 Step 5: Verify Observability Pods
kubectl get pods -n monitoring -w
# Wait for all pods: mimir-0, loki-0, tempo-xxx, grafana-xxx, promtail-xxx, otel-collector-xxx

# T1 Step 6: Deploy ClickHouse
cd /d/Engenox/infra/kustomize/overlays/dev/clickhouse
kubectl apply -k .

# T1 Step 7: Verify ClickHouse
kubectl get pods -n clickhouse -w
kubectl exec -it engenox-chi-engenox-cluster-0-0 -n clickhouse -- clickhouse-client --query "SELECT 1"

# T1 Step 8: Create ClickHouse Database & Tables for CIO Corpus
kubectl exec -it engenox-chi-engenox-cluster-0-0 -n clickhouse -- clickhouse-client --query "
CREATE DATABASE IF NOT EXISTS engenox;
CREATE TABLE IF NOT EXISTS engenox.cio_corpus (
    intervention_id UUID,
    tenant_id UUID,
    intervention_type String,
    intervention_payload String,
    outcome_metric String,
    uplift_pct Float64,
    ci_lower Float64,
    ci_upper Float64,
    p_value Float64,
    conformal_coverage Float64,
    segment String,
    ts DateTime64(3),
    integrity_hash String,
    r2_worm_synced_at DateTime64(3),
    signatory_pubkey String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (tenant_id, intervention_type, ts)
TTL ts + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;
"

# ============================================================================
# TERMINAL 2 (T2) - APPLICATION: Argo CD + Secrets + Service Verification
# ============================================================================

# T2 Step 1: Install Argo CD (if not already)
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# T2 Step 2: Wait for Argo CD
kubectl get pods -n argocd -w

# T2 Step 3: Get Argo CD Admin Password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo

# T2 Step 4: Port-forward Argo CD (keep this running)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# T2 Step 5: Login to Argo CD (in another tab/window)
argocd login localhost:8080 --username admin --password <password-from-step-4> --insecure

# T2 Step 6: Register Git Repository
argocd repo add https://github.com/pixenox/engenox.git --username <github-token> --password <github-token>

# T2 Step 7: Create Engenox Project
argocd proj create engenox \
  --description "Engenox AI Visibility OS" \
  --dest https://kubernetes.default.svc,engenox \
  --dest https://kubernetes.default.svc,clickhouse \
  --dest https://kubernetes.default.svc,monitoring \
  --dest https://kubernetes.default.svc,engenox-system \
  --dest https://kubernetes.default.svc,temporal \
  --src https://github.com/pixenox/engenox.git

# T2 Step 8: Allow Cluster Resources for Project
argocd proj allow-cluster-resource engenox Namespace "*"
argocd proj allow-cluster-resource engenox Application "*"
argocd proj allow-cluster-resource engenox ClickHouseInstallation "*"

# T2 Step 9: Apply Argo CD Applications
kubectl apply -f infra/argocd/applications/dev.yaml

# T2 Step 10: Sync Applications (or use Argo CD UI)
argocd app sync engenox-dev-infra
argocd app sync engenox-dev-observability
argocd app sync engenox-dev-clickhouse
argocd app sync engenox-dev-apps

# T2 Step 11: Create Real Secrets (MANUAL - do this before sync)
# Copy template and fill in REAL values:
cp infra/kustomize/overlays/dev/infra/.env.infra.secrets.template infra/kustomize/overlays/dev/infra/.env.infra.secrets
# Edit .env.infra.secrets with REAL values from:
# - GCP Secret Manager (run: gcloud secrets versions access latest --secret=engenox-* --project=engenox-stage)
# - Cloudflare Dashboard (R2 API token)
# - WorkOS Dashboard
# - Anthropic/OpenAI/Google Console

# T2 Step 12: Generate Kustomize Secrets
cd /d/Engenox/infra/kustomize/overlays/dev/infra
kustomize build . | kubectl apply -f -

# T2 Step 13: Verify All Services Healthy
kubectl get pods -n engenox-system
kubectl get pods -n engenox
kubectl get pods -n monitoring
kubectl get pods -n clickhouse
kubectl get pods -n temporal
kubectl get pods -n redpanda

# T2 Step 14: Test Service Connectivity
# Test Valkey
kubectl exec -it valkey-0 -n engenox-system -- valkey-cli -a $VALKEY_PASSWORD ping

# Test Redpanda
kubectl exec -it engenox-redpanda-0 -n redpanda -- rpk cluster info

# Test Temporal
kubectl exec -it engenox-temporal-xxx -n temporal -- tctl workflow list

# Test ClickHouse HTTP
kubectl port-forward svc/clickhouse -n clickhouse 8123:8123 &
curl -u default:$CLICKHOUSE_PASSWORD http://localhost:8123/ping

# T2 Step 15: Verify Grafana Dashboards
kubectl port-forward svc/grafana -n monitoring 3000:3000 &
# Open http://localhost:3000/admin -> Engenox folder

# ============================================================================
# END OF DAY 1 - VERIFICATION CHECKLIST
# ============================================================================
# [ ] R2 bucket exists with Object-Lock (retention: 2555 days)
# [ ] Mimir, Loki, Tempo, Grafana all Running
# [ ] ClickHouse cluster healthy, cio_corpus table created
# [ ] Argo CD 6 apps synced (infra, observability, clickhouse, apps, temporal)
# [ ] All secrets populated with REAL values (no CHANGE_ME)
# [ ] Valkey, Redpanda, Temporal, ClickHouse all reachable
# [ ] Grafana dashboards visible
# [ ] Prometheus scraping all targets (check /targets)