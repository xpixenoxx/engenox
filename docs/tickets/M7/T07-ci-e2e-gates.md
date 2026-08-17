# M7-T07: M7 CI/E2E Gates — Stage Deployment + Pilot Journey

**Status:** ⬜ NOT STARTED  
**Milestone:** M7 (Gate C–D)  
**Owner:** DevOps / QA (founder acting as)  
**Depends on:** T01–T06

---

## Objective

Wire all M7 jobs into the CI gate chain so that **every PR to `main`** validates:
1. Stage cell deploys cleanly (tofu apply)
2. AtlasCycle completes end-to-end in stage (<10 min)
3. Warm-canary divergence <15% (48h soak)
4. Concierge pilot onboarding smoke test
5. Three-sinks reconciliation (fixture test)
6. R2 WORM restore test (fixture test)

**Gate-status** aggregates all jobs → single required check on branch protection.

---

## Extended CI Orchestrator

```yaml
# .github/workflows/ci-orchestrator.yaml (additions)
jobs:
  # Existing: contract-gate → lint/tests/dep-direction/security-scan/stack-drift → gate-status
  
  stage-deploy:
    name: "Stage Cell Deploy"
    runs-on: ubuntu-latest
    needs: contract-gate
    if: github.ref == 'refs/heads/main'
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - name: Setup mise + tofu
        uses: ./.github/actions/setup-mise-tofu
      - name: Configure GCP ADC
        uses: google-github-actions/auth@v2
        with: { credentials_json: ${{ secrets.GCP_STAGE_SA_KEY }} }
      - name: Configure kubectl
        run: gcloud container clusters get-credentials engenox-stage-cell --region us-central1
      - name: Apply stage cell (phase 1)
        working-directory: infra/tofu/envs/stage/primary
        run: |
          tofu init
          tofu apply -auto-approve \
            -target=module.cell.google_container_cluster.primary \
            -target=module.cell.google_storage_bucket.pitr \
            -target=module.cell.google_kms_key_ring.stage \
            -target=module.cell.google_kms_crypto_key.kek \
            -target=module.cell.google_memorystore_instance.valkey \
            -target=cloudflare_r2_bucket.corpus \
            -target=cloudflare_worker_script.auth_proxy
      - name: Apply stage cell (phase 2)
        working-directory: infra/tofu/envs/stage/primary
        run: tofu apply -auto-approve

  atlascycle-e2e-stage:
    name: "AtlasCycle E2E Stage"
    runs-on: ubuntu-latest
    needs: stage-deploy
    if: github.ref == 'refs/heads/main'
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - name: Setup mise
        uses: ./.github/actions/setup-mise
      - name: Seed fixtures
        run: |
          export DATABASE_URL="postgresql://user:pass@stage-pg:5432/engenox"
          mise exec -- atlas migrate apply --dir file://libs/kg/migrations/atlas
          mise exec -- python scripts/seed-consent-stage.py --env=stage
          mise exec -- python scripts/seed-conflict-stage.py --tenant=pilot-tenant-001
      - name: Trigger AtlasCycle
        run: |
          curl -X POST https://stage.api.engenox.dev/v1/atlas-cycle/start \
            -H "Authorization: Bearer ${{ secrets.WORKOS_STAGE_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"tenant_id": "pilot-tenant-001", "surfaces": ["chatgpt", "perplexity", "gemini"]}'
      - name: Wait + Verify
        run: |
          # Poll Temporal for completion (max 10 min)
          python scripts/wait_atlas_cycle.py --tenant=pilot-tenant-001 --timeout=600
      - name: Verify Corpus Row
        run: |
          python scripts/verify_corpus_row.py --tenant=pilot-tenant-001

  warm-canary-divergence:
    name: "Warm-Canary Divergence (48h)"
    runs-on: ubuntu-latest
    needs: stage-deploy
    if: github.ref == 'refs/heads/main' && github.event_name == 'schedule'
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Query 48h divergence
        run: python scripts/check_warm_canary_divergence.py --hours=48 --threshold=0.15

  concierge-pilot-smoke:
    name: "Concierge Pilot Smoke"
    runs-on: ubuntu-latest
    needs: atlascycle-e2e-stage
    if: github.ref == 'refs/heads/main'
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - name: Onboard test pilot tenant
        run: |
          python scripts/onboard_concierge_tenant.py \
            --tenant=smoke-test-tenant \
            --email=founder+smoke@engenox.dev \
            --surfaces=chatgpt,perplexity,gemini
      - name: Wait for first cycle
        run: python scripts/wait_atlas_cycle.py --tenant=smoke-test-tenant --timeout=900
      - name: Verify PR opened
        run: |
          python scripts/verify_action_pr.py --tenant=smoke-test-tenant --dial-level=propose

  reconciliation-test:
    name: "Three-Sinks Reconciliation"
    runs-on: ubuntu-latest
    needs: contract-gate
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Run reconciliation fixture test
        run: |
          cd services/measurement
          uv run pytest src/engenox/measurement/__tests__/test_reconciliation.py -xvs

  r2-restore-test:
    name: "R2 WORM Restore Test"
    runs-on: ubuntu-latest
    needs: contract-gate
    if: env.R2_TEST_ENDPOINT != ''
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Run R2 restore fixture test
        run: |
          cd services/measurement
          uv run pytest src/engenox/measurement/__tests__/test_r2_restore.py -xvs
        env:
          R2_TEST_ENDPOINT: ${{ secrets.R2_TEST_ENDPOINT }}
          R2_TEST_ACCESS_KEY: ${{ secrets.R2_TEST_ACCESS_KEY }}
          R2_TEST_SECRET_KEY: ${{ secrets.R2_TEST_SECRET_KEY }}

  gate-status:
    name: "Gate Status"
    runs-on: ubuntu-latest
    needs: 
      - lint
      - tests
      - dependency-direction
      - security-scan
      - stack-drift-watchdog
      - [M7 jobs below, conditional]
      - atlascycle-e2e-stage
      - warm-canary-divergence
      - concierge-pilot-smoke
      - reconciliation-test
      - r2-restore-test
    if: always()
    steps:
      - name: Check all required jobs passed
        run: |
          REQUIRED=(
            "lint" "tests" "dependency-direction" "security-scan" 
            "stack-drift-watchdog" "atlascycle-e2e-stage" 
            "warm-canary-divergence" "concierge-pilot-smoke"
            "reconciliation-test" "r2-restore-test"
          )
          for job in "${REQUIRED[@]}"; do
            RESULT="${{ needs.$job.result }}"
            if [[ "$RESULT" != "success" ]]; then
              echo "::error::Required job $job failed: $RESULT"
              exit 1
            fi
          done
          echo "All gates passed"
```

---

## E2E Journey Test (Playwright)

```typescript
// e2e/tests/concierge-pilot-journey.test.ts
import { test, expect } from '@playwright/test';

test.describe.configure({ retries: 0 }); // flaky? fail loud

test('Concierge pilot journey: invite → onboard → conflict → PR → measure → report', async ({ page }) => {
  // 1. Accept invite (WorkOS magic link)
  await page.goto('/onboarding/concierge?token=test-invite-token');
  await expect(page.locator('text=Welcome to Engenox Concierge Pilot')).toBeVisible();
  
  // 2. Consent panel (pre-filled RCT_ELIGIBLE)
  await expect(page.locator('[data-testid=consent-strategy]')).toHaveValue('RCT_ELIGIBLE');
  await page.click('[data-testid=consent-accept]');
  
  // 3. Connect data sources (mock tokens)
  await page.fill('[data-testid=gsc-token]', 'test-gsc-token');
  await page.fill('[data-testid=ga4-token]', 'test-ga4-token');
  await page.click('[data-testid=connect-sources-continue]');
  
  // 4. Select surfaces
  await page.check('[data-testid=surface-chatgpt]');
  await page.check('[data-testid=surface-perplexity]');
  await page.click('[data-testid=confirm-onboard]');
  
  // 5. Wait for dashboard → first conflict detected
  await page.waitForURL('/pilot/**/dashboard', { timeout: 60000 });
  await expect(page.locator('[data-testid=conflict-list]')).toContainText('chatgpt');
  
  // 6. Open intervention detail → verify 6 provenance panels
  await page.click('[data-testid=conflict-row] >> nth=0');
  await expect(page.locator('[data-testid=provenance-extract]')).toBeVisible();
  await expect(page.locator('[data-testid=provenance-draft]')).toBeVisible();
  await expect(page.locator('[data-testid=provenance-adjudicate]')).toBeVisible();
  await expect(page.locator('[data-testid=provenance-critique]')).toBeVisible();
  await expect(page.locator('[data-testid=provenance-measure]')).toBeVisible();
  await expect(page.locator('[data-testid=provenance-lift]')).toBeVisible();
  
  // 7. Verify PR opened at Action service (dial=propose)
  await expect(page.locator('[data-testid=pr-status]')).toHaveText('Proposed');
  await expect(page.locator('[data-testid=dial-level]')).toHaveText('Co-pilot');
  
  // 8. Open Candor Report → verify lift CI + contrarian block
  await page.goto('/pilot/test-tenant/reports');
  await expect(page.locator('[data-testid=lift-estimate]')).toBeVisible();
  await expect(page.locator('[data-testid=lift-ci]')).toContainText('CI:');
  await expect(page.locator('[data-testid=contrarian-block]')).toBeVisible();
});
```

Add to `.github/workflows/e2e.yaml`:
```yaml
jobs:
  concierge-pilot-journey:
    runs-on: ubuntu-latest
    needs: build-web
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-mise
      - name: Install Playwright
        run: mise exec -- pnpm playwright install --with-deps chromium
      - name: Run concierge pilot journey
        run: mise exec -- pnpm e2e --project=chromium e2e/tests/concierge-pilot-journey.test.ts
        env:
          PLAYWRIGHT_BASE_URL: https://stage.app.engenox.dev
          WORKOS_TEST_TOKEN: ${{ secrets.WORKOS_STAGE_TOKEN }}
```

---

## Gate-Status Aggregation Logic

The `gate-status` job **must require all M7 jobs to succeed** on `main`:
- Contract-compat (buf lint/breaking/generate + 3-lang compile)
- Lint (Biome/Ruff/golangci-lint + dep-direction)
- Tests (vitest + go test + pytest incl. M7 fixtures)
- Security-scan (Trivy + secret-scan)
- Stack-drift-watchdog (3 rules)
- **AtlasCycle E2E Stage** (<10 min)
- **Warm-Canary Divergence** (<15%, 48h)
- **Concierge Pilot Smoke** (onboard + cycle + PR)
- **Reconciliation Test** (fixture zero-mismatch)
- **R2 Restore Test** (fixture 10/10 pass)

**A skipped job = FAIL** (no conditional bypasses for M7 gates on `main`).

---

## Required Secrets (GitHub Actions)

| Secret | Scope | Source |
|---|---|---|
| `GCP_STAGE_SA_KEY` | Stage deploy | Founder GCP project (JSON key, Editor + KMS Admin + Memorystore Admin) |
| `WORKOS_STAGE_TOKEN` | AtlasCycle trigger / E2E | WorkOS stage environment |
| `R2_TEST_ENDPOINT` | R2 restore test | R2 test bucket (LocalStack or dedicated) |
| `R2_TEST_ACCESS_KEY` / `R2_TEST_SECRET_KEY` | R2 restore test | Test bucket credentials |
| `CF_API_TOKEN_STAGE` | Cloudflare Workers deploy | Cloudflare API token (Zone.DNS + Workers + R2) |

---

## Candor Flags

- [ ] `gate-status` **fails on skipped jobs** (no silent bypass)
- [ ] Stage deploy uses **real GCP credentials** (not mock) — cost tracked
- [ ] AtlasCycle E2E timeout **hard 10 min** (not extended to pass)
- [ ] Warm-canary job runs **on schedule** (not every PR) — 48h window
- [ ] R2 restore test uses **separate test bucket** (not stage/prod)
- [ ] All M7 jobs **documented in ticket closure** with run IDs + timestamps

---

## Files to Create/Modify

```
.github/workflows/ci-orchestrator.yaml          # EXTEND with M7 jobs
.github/workflows/e2e.yaml                      # EXTEND concierge journey
.github/actions/setup-mise-tofu/                # NEW composite action
scripts/wait_atlas_cycle.py                     # NEW
scripts/verify_corpus_row.py                    # NEW
scripts/verify_action_pr.py                     # NEW
scripts/check_warm_canary_divergence.py         # EXTEND (from T03)
scripts/onboard_concierge_tenant.py             # EXTEND (from T04)
e2e/tests/concierge-pilot-journey.test.ts       # NEW
```

---

## Acceptance Criteria

- [ ] `ci-orchestrator.yaml` includes all 6 M7 jobs with correct `needs:` chain
- [ ] `gate-status` fails if ANY required job fails/skips (verified by test PR)
- [ ] `atlascycle-e2e-stage` completes <10 min on clean `main` (verified by run)
- [ ] `warm-canary-divergence` scheduled daily + passes threshold
- [ ] `concierge-pilot-smoke` onboards test tenant + verifies PR
- [ ] `reconciliation-test` + `r2-restore-test` pass in CI (fixtures)
- [ ] E2E concierge journey runs + passes in `e2e.yaml`
- [ ] All required secrets configured in GitHub Actions
- [ ] Candor flags documented; no silent deferrals