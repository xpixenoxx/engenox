import { test as base, Page } from '@playwright/test';
import { LoginPage, DashboardPage, ConflictsPage, InterventionDetailPage, ConsentPage, ToastNotifications } from './page-objects';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  conflictsPage: ConflictsPage;
  interventionPage: InterventionDetailPage;
  consentPage: ConsentPage;
  toasts: ToastNotifications;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  conflictsPage: async ({ page }, use) => {
    await use(new ConflictsPage(page));
  },
  interventionPage: async ({ page }, use) => {
    await use(new InterventionDetailPage(page));
  },
  consentPage: async ({ page }, use) => {
    await use(new ConsentPage(page));
  },
  toasts: async ({ page }, use) => {
    await use(new ToastNotifications(page));
  },
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Use test credentials from environment or localStorage mock
    await page.evaluate(() => {
      localStorage.setItem('workos:auth', JSON.stringify({
        user: {
          id: 'test-user-1',
          email: 'test@engenox.dev',
          name: 'Test User',
          role: 'admin',
          tenant_id: 'tenant-1',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
      }));
    });
    await page.reload();
    await page.waitForURL('/dashboard*');
    await use(page);
  },
});

export { expect } from '@playwright/test';