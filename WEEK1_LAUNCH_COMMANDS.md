#!/usr/bin/env bash
# =============================================================================
# WEEK 1 LAUNCH — 2-TERMINAL PARALLEL EXECUTION
# Project: engenox-stage | Region: us-central1 | Cluster: engenox-primary-dev-gke
# Domain: engenox.pixenox.com
# =============================================================================
# RUN THESE IN TWO SEPARATE TERMINALS SIMULTANEOUSLY
# =============================================================================

# =============================================================================
# TERMINAL 1 — INFRASTRUCTURE (R2 → Observability → ClickHouse → Tables)
# =============================================================================

# ---- T1 Step 0: Prerequisites & Auth ----------------------------------------
gcloud config set project engenox-stage
export TEMP=/d/temp_gcloud
export TMP=/d/temp_gcloud
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# ---- T1 Step 1: Get GKE Credentials ------------------------------------------
gcloud container clusters get-credentials engenox-primary-dev-gke --region us-central1 --project engenox-stage

# ---- T1 Step 2: ENABLE R2 IN CLOUDFLARE DASHBOARD (MANUAL - DO FIRST) -------
# OPEN IN BROWSER: https://dash.cloudflare.com/0246fb31ab2959d61406ac7accdd9687/r2
# CLICK: "Enable R2" if prompted
# WAIT for confirmation, THEN continue to Step 3

# ---- T1 Step 3: Deploy R2 Bucket (Object-Lock configured post-apply) --------
cd /d/Engenox/infra/tofu/envs/stage/primary
/c/Users/Chinn/bin/tofu.exe apply -target=module.r2_corpus -auto-approve

# ---- T1 Step 4: Deploy Observability Stack (Mimir, Loki, Tempo, Grafana) ------
cd /d/Engenox/infra/kustomize/overlays/dev/observability
kubectl apply -k .

# ---- T1 Step 5: Verify Observability Pods ------------------------------------
kubectl get pods -n monitoring -w
# Wait for: mimir-0, loki-0, tempo-xxx, grafana-xxx, promtail-xxx, otel-collector-xxx → All Running

# ---- T1 Step 6: Deploy ClickHouse --------------------------------------------
cd /d/Engenox/infra/kustomize/overlays/dev/clickhouse
kubectl apply -k .

# ---- T1 Step 7: Verify ClickHouse --------------------------------------------
kubectl get pods -n clickhouse -w
kubectl exec -it engenox-chi-engenox-cluster-0-0 -n clickhouse -- clickhouse-client --query "SELECT 1"

# ---- T1 Step 8: Create CIO Corpus Tables -------------------------------------
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
SETTINGS index_granularity = 8192;"

# ---- T1 Step 9: Post-Apply R2 Object-Lock (MANUAL - After bucket created) ---
# OPEN IN BROWSER:
# https://dash.cloudflare.com/0246fb31ab2959d61406ac7accdd9687/r2/buckets/engenox-corpus/settings
# → Object Lock → Enable "Compliance" mode, 2555 days retention
# SAVE

# ---- T1 Step 10: Create R2 API Token (MANUAL) --------------------------------
# Cloudflare Dashboard → My Profile → API Tokens → Create Token
# → Custom Token → R2 Read/Write → engenox-corpus bucket
# COPY: Access Key ID + Secret Access Key

# =============================================================================
# TERMINAL 2 — APPLICATION (Argo CD → Secrets → Sync → Verify)
# =============================================================================

# ---- T2 Step 1: Install Argo CD ----------------------------------------------
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# ---- T2 Step 2: Wait for Argo CD ---------------------------------------------
kubectl get pods -n argocd -w
# Wait for: argocd-server, argocd-repo-server, argocd-application-controller, argocd-dex-server, argocd-redis → All Running

# ---- T2 Step 3: Get Argo CD Admin Password -----------------------------------
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
# COPY THE OUTPUT PASSWORD

# ---- T2 Step 4: Port-forward Argo CD (KEEP RUNNING) --------------------------
kubectl port-forward svc/argocd-server -n argocd 8080:443
# LEAVE THIS RUNNING — open NEW TAB/WINDOW for next steps →

# =============================================================================
# TERMINAL 2b — Argo CD CLI (after port-forward is running)
# =============================================================================

# ---- T2b Step 1: Login to Argo CD --------------------------------------------
# REPLACE <ARGOCD_PASSWORD> with output from T2 Step 3
argocd login localhost:8080 --username admin --password <ARGOCD_PASSWORD> --insecure

# ---- T2b Step 2: Register Git Repository -------------------------------------
# REPLACE <GITHUB_PAT> with your GitHub Personal Access Token (repo scope)
argocd repo add https://github.com/pixenox/engenox.git --username <GITHUB_PAT> --password <GITHUB_PAT>

# ---- T2b Step 3: Create Engenox Project --------------------------------------
argocd proj create engenox \
  --description "Engenox AI Visibility OS" \
  --dest https://kubernetes.default.svc,engenox \
  --dest https://kubernetes.default.svc,clickhouse \
  --dest https://kubernetes.default.svc,monitoring \
  --dest https://kubernetes.default.svc,engenox-system \
  --dest https://kubernetes.default.svc,temporal \
  --src https://github.com/pixenox/engenox.git

# ---- T2b Step 4: Allow Cluster Resources -------------------------------------
argocd proj allow-cluster-resource engenox Namespace "*"
argocd proj allow-cluster-resource engenox Application "*"
argocd proj allow-cluster-resource engenox ClickHouseInstallation "*"

# ---- T2b Step 5: Apply Argo CD Applications ----------------------------------
kubectl apply -f /d/Engenox/infra/argocd/applications/dev.yaml

# ---- T2b Step 6: Sync Applications -------------------------------------------
argocd app sync engenox-dev-infra
argocd app sync engenox-dev-observability
argocd app sync engenox-dev-clickhouse
argocd app sync engenox-dev-apps

# ---- T2b Step 7: Store R2 Secrets in GCP Secret Manager ----------------------
# REPLACE <R2_ACCESS_KEY> and <R2_SECRET_KEY> from T1 Step 10
gcloud secrets create engenox-r2-endpoint --data-file=- --project=engenox-stage <<'EOF'
https://0246fb31ab2959d61406ac7accdd9687.r2.cloudflarestorage.com
EOF

gcloud secrets create engenox-r2-bucket --data-file=- --project=engenox-stage <<'EOF'
engenox-corpus
EOF

gcloud secrets create engenox-r2-access-key --data-file=- --project=engenox-stage <<'EOF'
<R2_ACCESS_KEY>
EOF

gcloud secrets create engenox-r2-secret-key --data-file=- --project=engenox-stage <<'EOF'
<R2_SECRET_KEY>
EOF

# ---- T2b Step 8: Apply Kustomize Secrets -------------------------------------
cd /d/Engenox/infra/kustomize/overlays/dev/infra
kustomize build . | kubectl apply -f -

# ---- T2b Step 9: Verify All Services -----------------------------------------
kubectl get pods -n engenox-system
kubectl get pods -n engenox
kubectl get pods -n monitoring
kubectl get pods -n clickhouse
kubectl get pods -n temporal
kubectl get pods -n redpanda

# =============================================================================
# VERIFICATION CHECKLIST (after both terminals complete)
# =============================================================================
# [ ] R2 bucket: engenox-corpus exists, Object-Lock Compliance 2555 days
# [ ] Observability: Mimir, Loki, Tempo, Grafana all Running
# [ ] ClickHouse: Cluster healthy, cio_corpus table created
# [ ] Argo CD: 4 apps synced (infra, observability, clickhouse, apps)
# [ ] Secrets: All R2 secrets in GCP Secret Manager (no CHANGE_ME)
# [ ] Services: All pods Running in engenox, engenox-system, temporal, redpanda
# [ ] Grafana: Accessible at http://localhost:3000 (port-forward), dashboards load
# =============================================================================

# =============================================================================
# NEXT STEPS (Week 1 Day 2-4) — Run after verification passes
# =============================================================================
# Day 2: Build/push 7 service images, deploy via Argo CD, test connectivity
# Day 3: Configure DNS/SSL for engenox.pixenox.com, deploy web app
# Day 4: Run integration tests, E2E smoke tests, create runbooks, Go/No-Go
# =============================================================================