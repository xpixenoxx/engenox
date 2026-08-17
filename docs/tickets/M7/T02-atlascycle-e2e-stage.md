# T02 — AtlasCycle End-to-End in Stage (Perception → Decision → Action → Measurement)

> **Depends on:** T01 (stage cell deployed)
> **Enables:** T03 (warm-canary), T04 (concierge onboarding)

---

## Objective

Deploy all 7 services + Web to the **stage cell** and execute a **full AtlasCycle** against a seeded pilot tenant. The cycle must complete in **<10 minutes wall-clock** and produce a signed `CIOCorpusRow` in Postgres with dial at `propose`.

---

## Services to Deploy

| Service | Language | Repo Path | ConnectRPC Client |
|---------|----------|-----------|-------------------|
| Perception | Go | `services/perception` | Gateway.Extract |
| Gateway | TS/Hono | `services/gateway` | — (leaf) |
| Decision | TS | `services/decision` | Gateway.Adjudicate/Draft/Critique |
| Action | Go | `services/action` | — (dial gate) |
| Measurement | Python/FastAPI | `services/measurement` | — (REST) |
| Temporal Worker | TS | `services/temporal` | All via activities |
| Control-Plane | TS | `services/control-plane` | Starts AtlasCycle workflow |
| Web | Next.js 16 | `web/` | — |

---

## Fixture Seeding (Idempotent)

```bash
# 1. Apply Atlas schema to stage Postgres
export DATABASE_URL="postgresql://user:pass@stage-pg:5432/engenox"
mise exec -- atlas migrate apply --dir file://libs/kg/migrations/atlas

# 2. Seed consent fixture (3 tenants × 5 surfaces, RCT_ELIGIBLE)
mise exec -- python scripts/seed-consent-stage.py --env=stage

# 3. Seed conflict for pilot tenant
mise exec -- python scripts/seed-conflict-stage.py --tenant=pilot-tenant-001 --surface=chatgpt
```

---

## AtlasCycle Execution

```bash
# Start all services (Argo CD or kubectl apply -k infra/kustomize/overlays/stage)
# Verify health
curl -sf https://stage.api.engenox.dev/health/perception
curl -sf https://stage.api.engenox.dev/health/gateway
curl -sf https://stage.api.engenox.dev/health/decision
curl -sf https://stage.api.engenox.dev/health/action
curl -sf https://stage.api.engenox.dev/health/measurement
curl -sf https://stage.api.engenox.dev/health/control-plane

# Trigger AtlasCycle
curl -X POST https://stage.api.engenox.dev/v1/atlas-cycle/start \
  -H "Authorization: Bearer $WORKOS_STAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "pilot-tenant-001", "surfaces": ["chatgpt", "perplexity", "gemini"]}'
```

---

## Verification Checklist

| Phase | Expected Artifact | Verification Query |
|-------|-------------------|-------------------|
| **Perception** | `AnswerEvent` rows in KG | `SELECT count(*) FROM assertions WHERE tenant_id='pilot-tenant-001' AND valid_time @> now();` |
| **Gateway** | 6 seam calls (Extract×3, Draft, Adjudicate, Critique) | Langfuse trace `atlas-cycle-perception` → spans |
| **Decision** | `ProposedIntervention` created | `SELECT * FROM interventions WHERE tenant_id='pilot-tenant-001' ORDER BY tx_time DESC LIMIT 1;` |
| **Action** | PR opened at `propose` dial level | GitHub webhook delivery + Action logs `DialGateEvaluator: propose allowed` |
| **Measurement** | `CIOCorpusRow` with lift/CI/integrity_tags | `SELECT * FROM cio_corpus WHERE tenant_id='pilot-tenant-001' ORDER BY tx_time DESC LIMIT 1;` |
| **Temporal** | Workflow `Completed` | Temporal UI: `atlas-cycle-workflow` status |

---

## Duration Gate

- **Total cycle < 10 minutes** (trigger → corpus row written)
- If >10 min: identify bottleneck (Perception fan-out? Gateway latency? Measurement pipeline?) → document

---

## Candor Flags

- [ ] Any service still using synthetic stub instead of real ConnectRPC? → Document + ADR if intentional
- [ ] Dial hardcoded to `propose`? (M7 requirement — no escalation above Co-pilot)
- [ ] Measurement using placeholder conformal? (M4-thin — validly deferred per ADR-0007)
- [ ] R2 mirror write synchronous? (T06 — if not, flag deferred)
- [ ] Any cross-service internal import violations? (`lint:boundary` must pass)

---

## Files to Create/Modify

```
services/perception/k8s/stage-deployment.yaml
services/gateway/k8s/stage-deployment.yaml
services/decision/k8s/stage-deployment.yaml
services/action/k8s/stage-deployment.yaml
services/measurement/k8s/stage-deployment.yaml
services/temporal/k8s/stage-worker.yaml
services/control-plane/k8s/stage-deployment.yaml
web/vercel.stage.json (or k8s if self-hosted)
infra/kustomize/overlays/stage/kustomization.yaml
scripts/seed-consent-stage.py
scripts/seed-conflict-stage.py
```

---

## Acceptance Criteria

- [ ] All 7 services + Web deployed to stage, health endpoints green
- [ ] Fixture seeding scripts run idempotently
- [ ] AtlasCycle triggered via Control-plane completes in <10 min
- [ ] Each phase produces verifiable artifact (AnswerEvent, ProposedIntervention, PR, CIOCorpusRow)
- [ ] Temporal workflow shows `Completed`
- [ ] All CI gates pass: contract-compat, lint:boundary, RLS canary, dep-direction, security-scan, stack-drift
- [ ] Candor flags documented; no silent deferrals