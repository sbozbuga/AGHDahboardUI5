import { test, expect } from '@playwright/test';

test('Dashboard loads and displays key elements', async ({ page }) => {
  // Mock API responses
  await page.route('**/control/stats', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        num_dns_queries: 1234,
        num_blocked_filtering: 56,
        avg_processing_time: 0.123,
        top_queried_domains: [{ domain: 'example.com', count: 100 }],
        top_blocked_domains: [{ domain: 'malware.com', count: 5 }],
        top_clients: [{ ip: '192.168.1.100', count: 500 }]
      })
    });
  });

  await page.route('**/control/querylog*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: []
      })
    });
  });

  // Navigate to the dashboard
  // UI5 serve might serve index.html at root or via redirect
  await page.goto('/index.html');

  // Check for title
  await expect(page).toHaveTitle(/UI5 AGH Dashboard/);

  // Check for specific text from i18n
  // Note: Playwright might not see the resolved i18n text immediately if loading is slow
  // But we can check for "Total Queries" which we added to i18n
  // Wait, we replaced "Total Queries" with "{i18n>totalQueries}".
  // If i18n works, we should see "Total Queries" on the screen.

  await expect(page.getByText('Total Queries')).toBeVisible();
  await expect(page.getByText('Blocked Queries')).toBeVisible();

  // Check if stats are rendered
  await expect(page.locator('.sapMNCValue').first()).toBeVisible();
});
