#!/usr/bin/env bash
# Week 1 Day 4 - Terminal Commands for 2-Terminal Parallel Execution
# Focus: Web App Deploy + Launch Readiness + Monitoring/Alerting + Runbook
# PROJECT: engenox-stage | REGION: us-central1 | CLUSTER: engenox-stage

# ============================================================================
# TERMINAL 1 (T1) - WEB APP: Build, Deploy, Verify Frontend
# ============================================================================

# T1 Step 1: Build Next.js 16 App
cd /d/Engenox/web
npm ci
npm run build

# T1 Step 2: Build & Push Web Docker Image
docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/web:dev-$(date +%Y%m%d-%H%M) .
docker push us-central1-docker.pkg.dev/engenox-stage/engenox/web:dev-$(date +%Y%m%d-%H%M)

# T1 Step 3: Deploy Web via Argo CD (create web app in argocd)
argocd app create engenox-dev-web \
  --repo https://github.com/pixenox/engenox.git \
  --path web \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace engenox-web \
  --project engenox \
  --sync-policy automated

argocd app sync engenox-dev-web

# T1 Step 4: Verify Web Deployment
kubectl get pods -n engenox-web -w

# T1 Step 5: Configure Web Environment Variables
kubectl create configmap web-config -n engenox-web \
  --from-literal=NEXT_PUBLIC_API_URL=https://api.engenox.pixenox.com \
  --from-literal=NEXT_PUBLIC_GRAFANA_URL=https://grafana.engenox.pixenox.com \
  --from-literal=NEXT_PUBLIC_TEMPORAL_URL=https://temporal.engenox.pixenox.com \
  --dry-run=client -o yaml | kubectl apply -f -

# T1 Step 6: Test Web App Health
kubectl port-forward -n engenox-web svc/web 3000:3000 &
curl -I http://localhost:3000/health

# T1 Step 7: Test Public URL
curl -I https://engenox.pixenox.com
curl -s https://engenox.pixenox.com | grep -c "Engenox"

# T1 Step 8: Verify Authentication Flow (WorkOS)
# Open https://engenox.pixenox.com/login in browser
# Test: Sign up -> Email verification -> Dashboard loads

# ============================================================================
# TERMINAL 2 (T2) - LAUNCH READINESS: Monitoring, Alerting, Runbooks, Go/No-Go
# ============================================================================

# T2 Step 1: Configure Grafana Alerting (Alertmanager)
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
    route:
      group_by: ['alertname', 'tenant']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'pagerduty'
      routes:
        - match:
            severity: critical
          receiver: 'pagerduty'
          continue: true
        - match:
            severity: warning
          receiver: 'slack'
    receivers:
      - name: 'pagerduty'
        pagerduty_configs:
          - service_key: \${PAGERDUTY_KEY}
      - name: 'slack'
        slack_configs:
          - api_url: \${SLACK_WEBHOOK_URL}
            channel: '#engenox-alerts'
            send_resolved: true
EOF

# T2 Step 2: Create Critical Alert Rules
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: engenox-critical-alerts
  namespace: monitoring
  labels:
    prometheus: mimir
spec:
  groups:
    - name: engenox-critical
      rules:
        - alert: ServiceDown
          expr: up{job=~"engeno.*"} == 0
          for: 2m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "Service {{ \$labels.job }} is down"
            description: "{{ \$labels.job }} has been down for 2 minutes"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/service-down.md"

        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{job=~"engeno.*",code=~"5.."}[5m])) by (job)
            /
            sum(rate(http_requests_total{job=~"engeno.*"}[5m])) by (job)
            > 0.05
          for: 5m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "High error rate on {{ \$labels.job }}"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/high-error-rate.md"

        - alert: DatabaseConnectionsHigh
          expr: |
            pg_stat_activity_count / pg_settings_max_connections > 0.8
          for: 5m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "PostgreSQL connections > 80%"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/db-connections-high.md"

        - alert: ClickHouseDiskSpace
          expr: |
            (disk_free_bytes / disk_total_bytes) < 0.15
          for: 10m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "ClickHouse disk space < 15%"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/clickhouse-disk-space.md"

        - alert: ConformalCoverageDropped
          expr: |
            measurement_conformal_coverage < 0.85
          for: 15m
          labels:
            severity: critical
            team: measurement
          annotations:
            summary: "Conformal coverage dropped below 85%"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/conformal-coverage-dropped.md"

        - alert: QuarantineRateSpike
          expr: |
            rate(measurement_quarantine_total[5m]) > 10
          for: 5m
          labels:
            severity: warning
            team: measurement
          annotations:
            summary: "Quarantine rate spike detected"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/quarantine-rate-spike.md"

        - alert: R2WormSyncLag
          expr: |
            cio_r2_worm_sync_lag_seconds > 3600
          for: 10m
          labels:
            severity: critical
            team: measurement
          annotations:
            summary: "R2 WORM sync lag > 1 hour"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/r2-worm-sync-lag.md"

        - alert: TemporalQueueBacklog
          expr: |
            temporal_task_queue_backlog > 1000
          for: 10m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "Temporal task queue backlog > 1000"
            runbook_url: "https://github.com/pixenox/engenox/blob/main/docs/runbooks/temporal-backlog.md"
EOF

# T2 Step 3: Create Runbook Documentation
mkdir -p /d/Engenox/docs/runbooks
cat > /d/Engenox/docs/runbooks/service-down.md <<'RBEOF'
# Service Down Runbook

## Symptoms
- `ServiceDown` alert firing
- Service pods not Running
- Health checks failing

## Diagnosis
```bash
# Check pod status
kubectl get pods -n engenox -l app.kubernetes.io/name=<service>

# Check logs
kubectl logs -n engenox -l app.kubernetes.io/name=<service> --tail=100

# Check events
kubectl get events -n engenox --sort-by='.lastTimestamp'
```

## Common Causes & Fixes
1. **CrashLoopBackOff**: Check logs for panic/error, fix code, rebuild image
2. **ImagePullBackOff**: Verify image tag exists in Artifact Registry
3. **OOMKilled**: Increase memory limits in Kustomize
4. **Pending**: Check node resources, PVC binding

## Escalation
- If not resolved in 15 min: Page on-call
- If data loss risk: Freeze deployments, snapshot DB
RBEOF

cat > /d/Engenox/docs/runbooks/high-error-rate.md <<'RBEOF'
# High Error Rate Runbook

## Symptoms
- `HighErrorRate` alert firing
- >5% 5xx errors on service

## Diagnosis
```bash
# Check error patterns
kubectl logs -n engenox -l app.kubernetes.io/name=<service> | grep -i error | tail -50

# Check recent deployments
kubectl rollout history deployment/<service> -n engenox

# Check dependencies
curl -s http://<dependency>:8080/health
```

## Common Causes & Fixes
1. **Downstream dependency failing**: Check dependency health, restart if needed
2. **Bad deploy**: Rollback `kubectl rollout undo deployment/<service> -n engenox`
3. **Resource exhaustion**: Check CPU/memory, scale up
4. **Config error**: Check ConfigMap/Secret values

## Escalation
- If rollback needed: Execute immediately
- If dependency issue: Escalate to dependency owner
RBEOF

cat > /d/Engenox/docs/runbooks/conformal-coverage-dropped.md <<'RBEOF'
# Conformal Coverage Dropped Runbook

## Symptoms
- `ConformalCoverageDropped` alert firing
- Coverage < 85% for any segment

## Diagnosis
```bash
# Check current coverage
curl -s http://engineox-measurement:8080/metrics | grep conformal_coverage

# Check calibration data
kubectl exec -it clickhouse-0 -n clickhouse -- \
  clickhouse-client --query "SELECT * FROM engenox.conformal_calibration ORDER BY window_end DESC LIMIT 10"

# Check quarantine rate
curl -s http://engineox-measurement:8080/metrics | grep quarantine
```

## Common Causes & Fixes
1. **Distribution shift**: New segment not in calibration - add to calibration window
2. **Quarantine spike**: Too many rejections - investigate rejection reasons
3. **Model drift**: Recalibrate conformal predictor with fresh data
4. **Insufficient calibration data**: Wait for more samples or lower threshold temporarily

## Escalation
- If coverage < 80%: Page measurement team immediately
- If model drift suspected: Trigger manual recalibration
RBEOF

cat > /d/Engenox/docs/runbooks/r2-worm-sync-lag.md <<'RBEOF'
# R2 WORM Sync Lag Runbook

## Symptoms
- `R2WormSyncLag` alert firing
- Sync lag > 1 hour

## Diagnosis
```bash
# Check sync status
curl -s http://engineox-measurement:8080/metrics | grep r2_worm_sync

# Check R2 bucket
gcloud storage ls gs://engenox-corpus-stage/

# Check measurement service logs
kubectl logs -n engenox -l app.kubernetes.io/name=measurement | grep -i r2
```

## Common Causes & Fixes
1. **R2 credential expired**: Rotate R2 API token in Secret Manager
2. **Network issue**: Check VPC/firewall, verify egress IP allowlisted
3. **Large backlog**: Increase sync batch size/worker count
4. **Object Lock compliance mode**: Verify bucket retention policy

## Escalation
- If credentials: Run secret rotation script immediately
- If network: Engage cloud/network team
RBEOF

# T2 Step 4: Create Launch Go/No-Go Checklist
cat > /d/Engenox/LAUNCH_GO_NOGO_CHECKLIST.md <<'EOF'
# Launch Go/No-Go Checklist - Week 1 Complete

## Infrastructure ✅
- [ ] R2 bucket with Object-Lock (2555 day retention) - VERIFIED
- [ ] CNPG cluster (PG17+AGE+pgvector) - 3 nodes healthy
- [ ] Valkey 9.0 - Running, <5ms latency
- [ ] Redpanda - 3 brokers, topics created
- [ ] ClickHouse - Cluster healthy, cio_corpus schema deployed
- [ ] Temporal - Cluster healthy, workflows registering
- [ ] Argo CD - 6 apps synced (infra, observability, clickhouse, apps, temporal, web)

## Observability ✅
- [ ] Mimir - Ingesting metrics, 30d retention
- [ ] Loki - Ingesting logs, 30d retention
- [ ] Tempo - Ingesting traces, 24h retention
- [ ] Grafana - Dashboards loaded, datasources connected
- [ ] Promtail - Shipping all pod logs
- [ ] OTEL Collector - Receiving from all services
- [ ] ServiceMonitors - All targets UP in Prometheus

## Services ✅
- [ ] Perception - Probes executing, consent checks passing
- [ ] Decision - Dial states correct, critic integrated
- [ ] Action - Diff review working, PR creation tested
- [ ] Measurement - SCM/DML/Conformal/ForeignChange/Quarantine all tested
- [ ] Gateway - LLM routing, constrained decoding, verifier working
- [ ] Control Plane - API responding, tenant isolation verified
- [ ] Temporal Workers - AtlasCycle workflow executable

## Networking ✅
- [ ] Global LB IP reserved
- [ ] Cloudflare DNS configured (proxied)
- [ ] GCP Managed SSL certificate ACTIVE
- [ ] HTTPS endpoints accessible (engenox.pixenox.com, api.engenox.pixenox.com)
- [ ] Path routing: /api/*, /control-plane/*, /temporal/*, /grafana/*

## Web App ✅
- [ ] Next.js 16 build successful
- [ ] Deployed to engenox-web namespace
- [ ] Authentication flow (WorkOS) working
- [ ] Dashboard loads with real data

## Security ✅
- [ ] All secrets in GCP Secret Manager (no CHANGE_ME in cluster)
- [ ] RLS policies active on all tenant tables
- [ ] Cedar policies loaded, <2ms p99
- [ ] Network policies restricting inter-service
- [ ] Workload Identity configured for GCP access

## Data Integrity ✅
- [ ] CIO corpus writes to ClickHouse
- [ ] R2 WORM sync completing <1hr lag
- [ ] Integrity verification passing (signatures, hashes)
- [ ] Conformal coverage ≥90% overall
- [ ] Quarantine rate <5%

## Launch Readiness ✅
- [ ] Runbooks published (service-down, high-error-rate, conformal-coverage, r2-worm-sync)
- [ ] Alert rules deployed and firing correctly
- [ ] On-call rotation configured (PagerDuty)
- [ ] Slack alerting channel (#engenox-alerts) receiving test alerts
- [ ] Rollback procedures documented and tested
- [ ] Chaos engineering: pod kill, node drain tested

## GO / NO-GO DECISION
**Go Criteria (ALL must pass):**
- [ ] Zero critical alerts firing
- [ ] All services healthy >30 min
- [ ] E2E Atlas Cycle completes successfully
- [ ] Conformal coverage ≥90%
- [ ] R2 WORM sync <30 min lag
- [ ] SSL certificate valid
- [ ] DNS resolving globally

**No-Go Criteria (ANY blocks):**
- [ ] Critical alert firing
- [ ] Service crash looping
- [ ] Data integrity failure
- [ ] SSL/Network issues
- [ ] On-call not configured

**Decision:** □ GO  □ NO-GO
**Signed:** _________________ **Date:** _________________
EOF

# T2 Step 5: Final Verification - Run All Checks
echo "=== FINAL WEEK 1 VERIFICATION ==="

# Check all services
kubectl get pods -A | grep -E "(Running|Error|CrashLoop)" | grep -v Running

# Check Argo CD sync status
argocd app list

# Check SSL certificate
gcloud compute ssl-certificates describe engenox-cert --global --project=engenox-stage

# Check DNS
dig engenox.pixenox.com A +short

# Check public endpoints
curl -s -o /dev/null -w "%{http_code}" https://engenox.pixenox.com/health
curl -s -o /dev/null -w "%{http_code}" https://api.engenox.pixenox.com/health

# Check ClickHouse
kubectl exec -it clickhouse-0 -n clickhouse -- clickhouse-client --query "SELECT count() FROM engenox.cio_corpus"

# Check R2 sync
kubectl exec -n engenox deploy/engenox-measurement -- curl -s localhost:8080/metrics | grep r2_worm_sync

# Check conformal coverage
kubectl exec -n engenox deploy/engenox-measurement -- curl -s localhost:8080/metrics | grep conformal_coverage

echo "=== WEEK 1 COMPLETE - Review Go/No-Go Checklist ==="