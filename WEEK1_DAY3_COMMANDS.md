#!/usr/bin/env bash
# Week 1 Day 3 - Terminal Commands for 2-Terminal Parallel Execution
# Focus: Temporal Workflows + Integration Tests + E2E Smoke Tests

# ============================================================================
# TERMINAL 1 (T1) - TEMPORAL WORKFLOWS: Deploy & Verify Pipeline
# ============================================================================

# T1 Step 1: Verify Temporal Cluster
kubectl get pods -n temporal
kubectl exec -it engenox-temporal-xxx -n temporal -- tctl cluster health

# T1 Step 2: Register Temporal Workflows (via temporal-workers deployment)
# The temporal-workers service registers workflows on startup
kubectl logs -n engenox deploy/engenox-temporal-workers --tail=50

# T1 Step 3: Test Temporal Client Connection
kubectl exec -n engenox deploy/engenox-gateway -- \
  python3 -c "
from temporalio.client import Client
import asyncio
async def test():
    client = await Client.connect('engenox-temporal.temporal.svc.cluster.local:7233')
    print('Connected to Temporal')
    workflows = await client.list_workflows()
    print(f'Workflows: {workflows}')
asyncio.run(test())
"

# T1 Step 4: Deploy Atlas Cycle Workflow (trigger a test cycle)
kubectl exec -n engenox deploy/engenox-temporal-workers -- \
  tctl workflow start --workflow_id test-atlas-cycle-$(date +%s) \
  --task_queue engenox-atlas-cycle \
  AtlasCycleWorkflow '{"tenant_id": "dev-tenant-001"}'

# T1 Step 5: Monitor Workflow Execution
kubectl exec -n engenox deploy/engenox-temporal-workers -- \
  tctl workflow list --workflow_type AtlasCycleWorkflow

# T1 Step 6: Verify Workflow Activities Complete
# Check each activity in the cycle:
# 1. perception.probe
# 2. decision.plan
# 3. action.diff_review
# 4. measurement.record_cio

# T1 Step 7: Check Workflow History
kubectl exec -n engenox deploy/engenox-temporal-workers -- \
  tctl workflow show --workflow_id test-atlas-cycle-XXX

# ============================================================================
# TERMINAL 2 (T2) - INTEGRATION TESTS: Cross-Service + E2E
# ============================================================================

# T2 Step 1: Run Perception Integration Tests
cd /d/Engenox/services/perception
go test -v ./internal/... -run Integration -count=1

# T2 Step 2: Run Decision Integration Tests
cd /d/Engenox/services/decision
npm test -- --testPathPattern=integration

# T2 Step 3: Run Measurement Integration Tests
cd /d/Engenox/services/measurement
uv run pytest tests/integration/ -v

# T2 Step 4: Run Cross-Service Integration (Action PR creation)
cd /d/Engenox/services/action
go test -v ./internal/... -run Integration -count=1

# T2 Step 5: Run Gateway Integration Tests
cd /d/Engenox/services/gateway
npm test -- --testPathPattern=integration

# T2 Step 6: Run E2E Smoke Tests (Playwright)
cd /d/Engenox/e2e
npx playwright install --with-deps
npx playwright test smoke.spec.ts --reporter=line

# T2 Step 7: Run Load Test (light - 5 min)
cd /d/Engenox/e2e
npx playwright test load.spec.ts --reporter=line

# T2 Step 8: Verify All CI Gates Pass Locally
# buf contract compat
buf check breaking --against-input '.git#branch=main'

# dependency-cruiser
npx depcruise --validate .dependency-cruiser.cjs

# ============================================================================
# END OF DAY 3 - VERIFICATION CHECKLIST
# ============================================================================
# [ ] Temporal cluster healthy
# [ ] Atlas Cycle workflow registered and executable
# [ ] Test workflow completes all 4 activities
# [ ] All integration tests pass (Perception, Decision, Measurement, Action, Gateway)
# [ ] E2E smoke tests pass
# [ ] Load test completes without errors
# [ ] Contract compatibility check passes
# [ ] Dependency direction lint passes
# [ ] Data flows: perception -> decision -> action -> measurement
# [ ] CIO corpora rows written to ClickHouse
# [ ] Integrity verification logs in ClickHouse