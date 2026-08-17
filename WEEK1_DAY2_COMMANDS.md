#!/usr/bin/env bash
# Week 1 Day 2 - Terminal Commands for 2-Terminal Parallel Execution
# Focus: Service Deployment + Domain/Certificates + API Gateway + Load Balancer
# PROJECT: engenox-stage | REGION: us-central1 | CLUSTER: engenox-stage

# ============================================================================
# TERMINAL 1 (T1) - SERVICE DEPLOYMENT: Build & Deploy All 7 Services
# ============================================================================

# T1 Step 1: Auth & Setup
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
gcloud container clusters get-credentials engenox-stage --region us-central1 --project engenox-stage

# T1 Step 2: Build & Push All Service Images to Artifact Registry
# Run these in parallel (background jobs) to save time
cd /d/Engenox/services/perception && docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/perception:dev-$(date +%Y%m%d-%H%M) . &
cd /d/Engenox/services/decision && docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/decision:dev-$(date +%Y%m%d-%H%M) . &
cd /d/Engenox/services/action && docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/action:dev-$(date +%Y%m%d-%H%M) . &
cd /d/Engenox/services/measurement && docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/measurement:dev-$(date +%Y%m%d-%H%M) . &
cd /d/Engenox/services/gateway && docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/gateway:dev-$(date +%Y%m%d-%H%M) . &
cd /d/Engenox/services/control-plane && docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/control-plane:dev-$(date +%Y%m%d-%H%M) . &
cd /d/Engenox/services/temporal && docker build -t us-central1-docker.pkg.dev/engenox-stage/engenox/temporal-workers:dev-$(date +%Y%m%d-%H%M) . &
wait  # Wait for all builds to complete

# Push all images
for svc in perception decision action measurement gateway control-plane temporal-workers; do
  docker push us-central1-docker.pkg.dev/engenox-stage/engenox/$svc:dev-$(date +%Y%m%d-%H%M) &
done
wait

# T1 Step 3: Update Kustomize Image Tags
cd /d/Engenox/infra/kustomize/overlays/dev
TAG=dev-$(date +%Y%m%d-%H%M)
kustomize edit set image us-central1-docker.pkg.dev/engenox-stage/services/perception=us-central1-docker.pkg.dev/engenox-stage/engenox/perception:$TAG
kustomize edit set image us-central1-docker.pkg.dev/engenox-stage/services/decision=us-central1-docker.pkg.dev/engenox-stage/engenox/decision:$TAG
kustomize edit set image us-central1-docker.pkg.dev/engenox-stage/services/action=us-central1-docker.pkg.dev/engenox-stage/engenox/action:$TAG
kustomize edit set image us-central1-docker.pkg.dev/engenox-stage/services/measurement=us-central1-docker.pkg.dev/engenox-stage/engenox/measurement:$TAG
kustomize edit set image us-central1-docker.pkg.dev/engenox-stage/services/gateway=us-central1-docker.pkg.dev/engenox-stage/engenox/gateway:$TAG
kustomize edit set image us-central1-docker.pkg.dev/engenox-stage/services/control-plane=us-central1-docker.pkg.dev/engenox-stage/engenox/control-plane:$TAG
kustomize edit set image us-central1-docker.pkg.dev/engenox-stage/services/temporal=us-central1-docker.pkg.dev/engenox-stage/engenox/temporal-workers:$TAG

# T1 Step 4: Prepare Secrets (MANUAL - copy template and fill REAL values)
cp .env.dev.secrets.template .env.dev.secrets
# EDIT .env.dev.secrets with REAL values from GCP Secret Manager:
# gcloud secrets versions access latest --secret=engenox-db-password-stage --project=engenox-stage
# gcloud secrets versions access latest --secret=engenox-anthropic-api-key-stage --project=engenox-stage
# etc.

# T1 Step 5: Deploy Services via Argo CD
argocd app sync engenox-dev-apps --prune

# T1 Step 6: Verify All Services
kubectl get pods -n engenox -w
# Wait for all 7: perception, decision, action, measurement, gateway, control-plane, temporal-workers

# T1 Step 7: Health Checks
for svc in perception decision action measurement gateway control-plane temporal-workers; do
  echo "=== $svc ==="
  kubectl exec -n engenox deploy/engenox-$svc -- curl -s localhost:8080/health 2>/dev/null || echo "  Health check failed"
  kubectl logs -n engenox deploy/engenox-$svc --tail=10
done

# T1 Step 8: Test Service-to-Service Communication
kubectl exec -n engenox deploy/engenox-gateway -- curl -s http://engenox-perception:8080/health
kubectl exec -n engenox deploy/engenox-gateway -- curl -s http://engenox-decision:8080/health
kubectl exec -n engenox deploy/engenox-gateway -- curl -s http://engenox-action:8080/health

# ============================================================================
# TERMINAL 2 (T2) - NETWORKING: Domain, Certs, Global LB, DNS
# ============================================================================

# T2 Step 1: Reserve Global Static IP
gcloud compute addresses create engenox-lb-ip --global --project=engenox-stage
LB_IP=$(gcloud compute addresses describe engenox-lb-ip --global --format="value(address)" --project=engenox-stage)
echo "LB IP: $LB_IP"

# T2 Step 2: Create Cloudflare DNS Records (via API or UI)
# In Cloudflare Dashboard for pixenox.com:
# Type  Name                        Content         Proxy   TTL
# A     engenox.pixenox.com         $LB_IP          On      Auto
# A     api.engenox.pixenox.com     $LB_IP          On      Auto
# CNAME temporal.engenox.pixenox.com engenox.pixenox.com On   Auto
# CNAME grafana.engenox.pixenox.com  engenox.pixenox.com On   Auto
# CNAME clickhouse.engenox.pixenox.com engenox.pixenox.com On Auto

# T2 Step 3: Create GCP Managed SSL Certificate
gcloud compute ssl-certificates create engenox-cert \
  --domains=engenox.pixenox.com,api.engenox.pixenox.com,temporal.engenox.pixenox.com,grafana.engenox.pixenox.com,clickhouse.engenox.pixenox.com \
  --global --project=engenox-stage

# T2 Step 4: Wait for Certificate (can take 10-60 min)
gcloud compute ssl-certificates describe engenox-cert --global --project=engenox-stage --format="value(managedStatus.status)"
# Wait until: MANAGED_STATUS_ACTIVE

# T2 Step 5: Create Health Checks
gcloud compute health-checks create http gateway-hc \
  --port=8080 --request-path=/health --global --project=engenox-stage
gcloud compute health-checks create http control-plane-hc \
  --port=8080 --request-path=/health --global --project=engenox-stage

# T2 Step 6: Create Backend Services
gcloud compute backend-services create engenox-gateway \
  --protocol=HTTP2 --health-checks=gateway-hc --global --project=engenox-stage
gcloud compute backend-services create engenox-control-plane \
  --protocol=HTTP2 --health-checks=control-plane-hc --global --project=engenox-stage

# T2 Step 7: Create URL Map & Path Matchers
gcloud compute url-maps create engenox-lb \
  --default-service=engenox-gateway --global --project=engenox-stage

gcloud compute url-maps add-path-matcher engenox-lb \
  --path-matcher-name=api-paths \
  --default-service=engenox-gateway \
  --path-rules="/api/*=engenox-gateway,/control-plane/*=engenox-control-plane,/temporal/*=engenox-temporal,/grafana/*=engenox-grafana,/clickhouse/*=engenox-clickhouse" \
  --global --project=engenox-stage

# T2 Step 8: Create HTTPS Proxy
gcloud compute target-https-proxies create engenox-https-proxy \
  --url-map=engenox-lb --ssl-certificates=engenox-cert --global --project=engenox-stage

# T2 Step 9: Create Forwarding Rule
gcloud compute forwarding-rules create engenox-https-lb \
  --global --target-https-proxy=engenox-https-proxy --address=engenox-lb-ip --ports=443 --project=engenox-stage

# T2 Step 10: Create NEGs for GKE Services (for Cloud Load Balancing)
# Each service needs a NEG in the same region as the GKE cluster
for svc in gateway control-plane; do
  gcloud compute network-endpoint-groups create engenox-${svc}-neg \
    --region=us-central1 --network-endpoint-type=GCE_VM_IP_PORT \
    --project=engenox-stage
done

# T2 Step 11: Attach NEGs to Backend Services (requires GKE services with cloud.google.com/neg annotation)
# This is done via Service annotations in Kustomize - see below

# T2 Step 12: Verify DNS & SSL
dig engenox.pixenox.com A +short
curl -I https://engenox.pixenox.com/health
curl -I https://api.engenox.pixenox.com/health

# ============================================================================
# END OF DAY 2 - VERIFICATION CHECKLIST
# ============================================================================
# [ ] All 7 services deployed and Running
# [ ] All health endpoints return 200 OK
# [ ] Services can communicate internally (gateway -> perception, decision, action)
# [ ] Global static IP reserved
# [ ] Cloudflare DNS records created and proxied
# [ ] GCP Managed SSL certificate ACTIVE
# [ ] Global HTTPS LB forwarding rule created
# [ ] Backend services with health checks configured
# [ ] URL map with path-based routing configured
# [ ] NEGs created for gateway and control-plane
# [ ] https://engenox.pixenox.com/health returns 200
# [ ] https://api.engenox.pixenox.com/health returns 200
# [ ] https://temporal.engenox.pixenox.com loads Temporal UI
# [ ] https://grafana.engenox.pixenox.com loads Grafana