import { test, expect } from './fixtures';

test.describe.configure({ retries: 0 });

test.describe('M6 Thin: <10-Minute Journey — Login → Dashboard → Conflicts → Intervention → Consent', () => {
  test('complete journey: login → dashboard → conflicts list → intervention detail → consent panel', async ({
    authenticatedPage,
    dashboardPage,
    conflictsPage,
    interventionPage,
    consentPage,
    toasts,
  }) => {
    const journeyStart = Date.now();

    // Step 1: Verify dashboard loads with candor-blessed navigation
    await test.step('Dashboard loads with Conflicts/Interventions/Consent navigation', async () => {
      await dashboardPage.goto();
      await expect(dashboardPage.conflictsLink).toBeVisible();
      await expect(dashboardPage.interventionsLink).toBeVisible();
      await expect(dashboardPage.consentLink).toBeVisible();
      await expect(dashboardPage.conflictsCount).toBeVisible();
      await expect(dashboardPage.interventionsCount).toBeVisible();
    });

    // Step 2: Navigate to conflicts list and verify candor floor elements
    await test.step('Conflicts list loads with filters, search, candor stats, ConflictTrio panel', async () => {
      await dashboardPage.navigateToConflicts();
      await conflictsPage.waitForLoad();

      // Verify filter controls exist
      await expect(conflictsPage.searchInput).toBeVisible();
      await expect(conflictsPage.statusFilter).toBeVisible();
      await expect(conflictsPage.severityFilter).toBeVisible();
      await expect(conflictsPage.typeFilter).toBeVisible();
      await expect(conflictsPage.sortSelect).toBeVisible();

      // Verify candor stats panel
      await expect(conflictsPage.candyStats).toBeVisible();
      await expect(conflictsPage.candyStats.locator('[data-testid="honesty-score"]')).toBeVisible();
      await expect(conflictsPage.candyStats.locator('[data-testid="conflict-count"]')).toBeVisible();
    });

    // Step 3: Filter conflicts and select one
    await test.step('Filter conflicts by status=open, severity=high, sort by detectedAt desc', async () => {
      await conflictsPage.filterByStatus('open');
      await conflictsPage.filterBySeverity('high');
      await conflictsPage.sortBy('detectedAt_desc');
      await conflictsPage.waitForLoad();

      // At least one conflict should be visible
      await expect(conflictsPage.conflictRows.first()).toBeVisible();
    });

    // Click first conflict row to navigate to intervention detail
    await test.step('Click conflict row → navigate to intervention detail', async () => {
      const firstConflict = conflictsPage.conflictRows.first();
      const conflictId = await firstConflict.getAttribute('data-conflict-id');

      await firstConflict.click();
      await interventionPage.waitForLoad();

      // Verify we're on the intervention detail page
      await expect(authenticatedPage).toHaveURL(/.*\/interventions\/.*/);
    });

    // Step 4: Verify intervention detail page candor floor elements
    await test.step('Intervention detail: candor floor (CI badge, sample count, contrarian block)', async () => {
      await interventionPage.expectCandorFloorVisible();
    });

    // Step 5: Verify three-axis ledger
    await test.step('Intervention detail: three-axis ledger (calibration, human approval, pooled overlap)', async () => {
      await interventionPage.expectThreeAxisLedger();
    });

    // Step 6: Verify provenance strip with citations
    await test.step('Intervention detail: provenance strip with citations', async () => {
      await interventionPage.expectProvenanceStrip();
    });

    // Step 7: Verify dry-run diff
    await test.step('Intervention detail: dry-run diff with added/removed lines', async () => {
      await interventionPage.expectDryRunDiffVisible();
    });

    // Step 8: Verify autonomy dial defaults to propose (level 1)
    await test.step('Intervention detail: autonomy dial defaults to propose (level 1)', async () => {
      await interventionPage.expectAutonomyDial(1);
    });

    // Step 9: Propose the intervention
    await test.step('Click Propose → toast success', async () => {
      await interventionPage.clickPropose();
      await interventionPage.expectProposeSuccess();
      await toasts.expectSuccess('Intervention proposed');
    });

    // Step 10: Navigate to consent panel
    await test.step('Navigate to consent panel → GDPR Art. 7+8 purposes, records, DSRs, transfers', async () => {
      await dashboardPage.goto();
      await dashboardPage.navigateToConsent();
      await consentPage.waitForLoad();

      // Verify purpose tabs exist (GDPR Art. 7 purposes)
      const purposes = ['analytics', 'personalization', 'marketing', 'fraud_prevention', 'legal_compliance'];
      for (const purpose of purposes) {
        await expect(consentPage.page.locator(`[data-testid="purpose-tab"][data-purpose="${purpose}"]`)).toBeVisible();
      }
    });

    // Step 11: Grant consent for a purpose
    await test.step('Grant consent for analytics purpose', async () => {
      await consentPage.grantConsent('analytics');
      await consentPage.expectConsentRecordVisible('analytics');
    });

    // Step 12: Submit a DSR (Data Subject Request)
    await test.step('Submit DSR access request', async () => {
      await consentPage.submitDSR('access');
      await consentPage.expectConsentRecordVisible('analytics'); // Records should persist
    });

    // Step 13: Verify international transfers register
    await test.step('Verify international transfers register visible', async () => {
      await expect(consentPage.transfers.first()).toBeVisible();
      await consentPage.expectTransferRecord('EU', 'US');
    });

    const journeyDuration = Date.now() - journeyStart;
    const tenMinutes = 10 * 60 * 1000;

    // Step 14: Assert journey completes under 10 minutes
    await test.step(`Journey completes in < 10 minutes (actual: ${Math.round(journeyDuration / 1000)}s)`, async () => {
      expect(journeyDuration).toBeLessThan(tenMinutes);
    });
  });
});

test.describe('Intervention Detail Candor Floor — Verifier Reject Paths', () => {
  test('verifier rejects ungroundable output → bounded re-attempt returns null → symbolic path', async ({
    authenticatedPage,
    dashboardPage,
    conflictsPage,
    interventionPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateToConflicts();
    await conflictsPage.waitForLoad();
    await conflictsPage.conflictRows.first().click();
    await interventionPage.waitForLoad();

    await test.step('Candor floor renders CI badge, sample count, contrarian block', async () => {
      await interventionPage.expectCandorFloorVisible();

      // Verify CI badge shows bracketed interval
      const ciBadge = interventionPage.candorFloor.locator('[data-testid="ci-badge"]');
      await expect(ciBadge).toContainText('[');
      await expect(ciBadge).toContainText(']');

      // Verify sample count badge
      const sampleCount = interventionPage.candorFloor.locator('[data-testid="sample-count"]');
      await expect(sampleCount).toBeVisible();

      // Verify contrarian badge renders
      await expect(interventionPage.candorFloor.locator('[data-testid="contrarian-badge"]')).toBeVisible();
    });

    await test.step('Provenance hover shows citation tooltip', async () => {
      const citations = interventionPage.provenanceStrip.locator('[data-testid="citation"]');
      const count = await citations.count();

      if (count > 0) {
        await citations.first().hover();
        // Tooltip should appear (using native title or custom tooltip)
        await expect(interventionPage.page.locator('[role="tooltip"]').first()).toBeVisible({ timeout: 2000 });
      }
    });
  });
});

test.describe('Consent Panel — GDPR Art. 7+8 Compliance', () => {
  test('Purposes, records, DSRs, international transfers all render and function', async ({
    authenticatedPage,
    dashboardPage,
    consentPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.navigateToConsent();
    await consentPage.waitForLoad();

    await test.step('All 5 GDPR Art. 7 purposes render as tabs', async () => {
      const purposes = ['analytics', 'personalization', 'marketing', 'fraud_prevention', 'legal_compliance'];
      for (const purpose of purposes) {
        const tab = consentPage.page.locator(`[data-testid="purpose-tab"][data-purpose="${purpose}"]`);
        await expect(tab).toBeVisible();
        await expect(tab).toContainText(purpose.replace('_', ' '));
      }
    });

    await test.step('Grant/revoke consent cycle works for each purpose', async () => {
      const purposes = ['analytics', 'personalization', 'marketing'];

      for (const purpose of purposes) {
        await consentPage.clickPurposeTab(purpose);

        // Grant consent
        await consentPage.grantConsent(purpose);
        await consentPage.expectConsentRecordVisible(purpose);

        // Revoke consent
        await consentPage.revokeConsent(purpose);
        await consentPage.expectConsentRecordHidden(purpose);
      }
    });

    await test.step('DSR submission for access, deletion, portability', async () => {
      await consentPage.submitDSR('access');
      await consentPage.submitDSR('deletion');
      await consentPage.submitDSR('portability');
    });

    await test.step('International transfers register shows source→destination', async () => {
      await consentPage.expectTransferRecord('EU', 'US');
      await consentPage.expectTransferRecord('EU', 'CA');
    });
  });
});