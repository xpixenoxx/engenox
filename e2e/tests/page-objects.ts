import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.signInButton = page.locator('[data-testid="signin-button"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/signin');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    await this.page.waitForURL('/dashboard*');
  }
}

export class DashboardPage {
  readonly page: Page;
  readonly conflictsLink: Locator;
  readonly interventionsLink: Locator;
  readonly consentLink: Locator;
  readonly conflictsCount: Locator;
  readonly interventionsCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.conflictsLink = page.locator('[data-testid="nav-conflicts"]');
    this.interventionsLink = page.locator('[data-testid="nav-interventions"]');
    this.consentLink = page.locator('[data-testid="nav-consent"]');
    this.conflictsCount = page.locator('[data-testid="conflicts-count"]');
    this.interventionsCount = page.locator('[data-testid="interventions-count"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToConflicts(): Promise<void> {
    await this.conflictsLink.click();
    await this.page.waitForURL('**/conflicts');
  }

  async navigateToInterventions(): Promise<void> {
    await this.interventionsLink.click();
    await this.page.waitForURL('**/interventions');
  }

  async navigateToConsent(): Promise<void> {
    await this.consentLink.click();
    await this.page.waitForURL('**/consent');
  }
}

export class ConflictsPage {
  readonly page: Page;
  readonly conflictRows: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly severityFilter: Locator;
  readonly typeFilter: Locator;
  readonly sortSelect: Locator;
  readonly conflictTrio: Locator;
  readonly candyStats: Locator;

  constructor(page: Page) {
    this.page = page;
    this.conflictRows = page.locator('[data-testid="conflict-row"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.statusFilter = page.locator('[data-testid="status-filter"]');
    this.severityFilter = page.locator('[data-testid="severity-filter"]');
    this.typeFilter = page.locator('[data-testid="type-filter"]');
    this.sortSelect = page.locator('[data-testid="sort-select"]');
    this.conflictTrio = page.locator('[data-testid="conflict-trio"]');
    this.candyStats = page.locator('[data-testid="candor-stats"]');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.conflictRows.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.waitFor({ state: 'visible' });
    await this.statusFilter.click();
    await this.page.locator(`[data-value="${status}"]`).click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterBySeverity(severity: string): Promise<void> {
    await this.severityFilter.waitFor({ state: 'visible' });
    await this.severityFilter.click();
    await this.page.locator(`[data-value="${severity}"]`).click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByType(type: string): Promise<void> {
    await this.typeFilter.waitFor({ state: 'visible' });
    await this.typeFilter.click();
    await this.page.locator(`[data-value="${type}"]`).click();
    await this.page.waitForLoadState('networkidle');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForLoadState('networkidle');
  }

  async sortBy(sortBy: string): Promise<void> {
    await this.sortSelect.selectOption(sortBy);
    await this.page.waitForLoadState('networkidle');
  }

  async clickConflict(id: string): Promise<void> {
    await this.page.locator(`[data-testid="conflict-row"][data-conflict-id="${id}"]`).click();
    await this.page.waitForURL(`**/interventions/${id}`);
  }

  async expectConflictVisible(id: string): Promise<void> {
    await expect(this.page.locator(`[data-testid="conflict-row"][data-conflict-id="${id}"]`)).toBeVisible();
  }

  async expectConflictCount(count: number): Promise<void> {
    await expect(this.conflictRows).toHaveCount(count);
  }
}

export class InterventionDetailPage {
  readonly page: Page;
  readonly candorFloor: Locator;
  readonly threeAxisLedger: Locator;
  readonly provenanceStrip: Locator;
  readonly dryRunDiff: Locator;
  readonly autonomyDial: Locator;
  readonly proposeButton: Locator;
  readonly dialSlider: Locator;
  readonly ledgerAxes: Locator;

  constructor(page: Page) {
    this.page = page;
    this.candorFloor = page.locator('[data-testid="candor-floor"]');
    this.threeAxisLedger = page.locator('[data-testid="three-axis-ledger"]');
    this.provenanceStrip = page.locator('[data-testid="provenance-strip"]');
    this.dryRunDiff = page.locator('[data-testid="dry-run-diff"]');
    this.autonomyDial = page.locator('[data-testid="autonomy-dial"]');
    this.proposeButton = page.locator('[data-testid="propose-button"]');
    this.dialSlider = page.locator('[data-testid="dial-slider"]');
    this.ledgerAxes = page.locator('[data-testid="ledger-axis"]');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.candorFloor.waitFor({ state: 'visible', timeout: 10000 });
  }

  async expectCandorFloorVisible(): Promise<void> {
    await expect(this.candorFloor).toBeVisible();
    await expect(this.candorFloor.locator('[data-testid="ci-badge"]')).toBeVisible();
    await expect(this.candorFloor.locator('[data-testid="sample-count"]')).toBeVisible();
    await expect(this.candorFloor.locator('[data-testid="contrarian-badge"]')).toBeVisible();
  }

  async expectThreeAxisLedger(): Promise<void> {
    await expect(this.threeAxisLedger).toBeVisible();
    const axes = this.threeAxisLedger.locator('[data-testid="ledger-axis"]');
    await expect(axes).toHaveCount(3);
    await expect(axes.nth(0)).toContainText('Calibration Coverage');
    await expect(axes.nth(1)).toContainText('Human Approval Rate');
    await expect(axes.nth(2)).toContainText('Pooled Overlap');
  }

  async expectProvenanceStrip(): Promise<void> {
    await expect(this.provenanceStrip).toBeVisible();
    await expect(this.provenanceStrip.locator('[data-testid="citation"]')).toHaveCountGreaterThan(0);
  }

  async expectDryRunDiffVisible(): Promise<void> {
    await expect(this.dryRunDiff).toBeVisible();
    await expect(this.dryRunDiff.locator('[data-testid="diff-added"]').first()).toBeVisible();
    await expect(this.dryRunDiff.locator('[data-testid="diff-removed"]').first()).toBeVisible();
  }

  async expectAutonomyDial(defaultLevel: number = 1): Promise<void> {
    await expect(this.autonomyDial).toBeVisible();
    await expect(this.dialSlider).toHaveAttribute('aria-valuenow', String(defaultLevel));
  }

  async clickPropose(): Promise<void> {
    await this.proposeButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async setAutonomyDial(level: number): Promise<void> {
    await this.dialSlider.fill(String(level));
    await this.page.waitForLoadState('networkidle');
  }

  async expectProposeSuccess(): Promise<void> {
    await expect(this.page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
  }
}

export class ConsentPage {
  readonly page: Page;
  readonly purposeTabs: Locator;
  readonly consentRecords: Locator;
  readonly dsrRequests: Locator;
  readonly transfers: Locator;
  readonly grantButton: Locator;
  readonly revokeButton: Locator;
  readonly dsrSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.purposeTabs = page.locator('[data-testid="purpose-tab"]');
    this.consentRecords = page.locator('[data-testid="consent-record"]');
    this.dsrRequests = page.locator('[data-testid="dsr-request"]');
    this.transfers = page.locator('[data-testid="transfer-record"]');
    this.grantButton = page.locator('[data-testid="grant-consent-btn"]');
    this.revokeButton = page.locator('[data-testid="revoke-consent-btn"]');
    this.dsrSubmitButton = page.locator('[data-testid="submit-dsr-btn"]');
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.purposeTabs.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickPurposeTab(purpose: string): Promise<void> {
    await this.page.locator(`[data-testid="purpose-tab"][data-purpose="${purpose}"]`).click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectConsentRecordHidden(purpose: string): Promise<void> {
    await expect(this.page.locator(`[data-testid="consent-record"][data-purpose="${purpose}"]`)).toBeHidden();
  }

  async expectConsentRecordVisible(purpose: string): Promise<void> {
    await expect(this.page.locator(`[data-testid="consent-record"][data-purpose="${purpose}"]`)).toBeVisible();
  }

  async grantConsent(purpose: string): Promise<void> {
    await this.page.locator(`[data-testid="grant-consent-btn"][data-purpose="${purpose}"]`).click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
  }

  async revokeConsent(purpose: string): Promise<void> {
    await this.page.locator(`[data-testid="revoke-consent-btn"][data-purpose="${purpose}"]`).click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
  }

  async submitDSR(type: 'access' | 'deletion' | 'portability'): Promise<void> {
    await this.page.locator(`[data-testid="dsr-type-${type}"]`).click();
    await this.dsrSubmitButton.click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 5000 });
  }

  async expectTransferRecord(source: string, destination: string): Promise<void> {
    await expect(this.page.locator(`[data-testid="transfer-record"][data-source="${source}"][data-destination="${destination}"]`)).toBeVisible();
  }
}

export class ToastNotifications {
  readonly page: Page;
  readonly container: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="toaster"]');
  }

  async expectSuccess(message: string): Promise<void> {
    await expect(this.container.locator(`[data-testid="toast-success"]:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
  }

  async expectError(message: string): Promise<void> {
    await expect(this.container.locator(`[data-testid="toast-error"]:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
  }

  async expectWarning(message: string): Promise<void> {
    await expect(this.container.locator(`[data-testid="toast-warning"]:has-text("${message}")`)).toBeVisible({ timeout: 5000 });
  }

  async dismissAll(): Promise<void> {
    const dismissButtons = this.container.locator('[data-testid="toast-dismiss"]');
    const count = await dismissButtons.count();
    for (let i = 0; i < count; i++) {
      await dismissButtons.nth(i).click();
    }
  }
}