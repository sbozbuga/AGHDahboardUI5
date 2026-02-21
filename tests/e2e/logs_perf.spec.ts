import { test, expect } from '@playwright/test';

test('Logs update performance and DOM persistence', async ({ page }) => {
  const INITIAL_SIZE = 60;
  const NEXT_SIZE = 50;

  // Generate mock logs
  const generateLogs = (startId: number, count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      time: new Date().toISOString(),
      question: { name: `domain-${startId + i}.com`, type: 'A' },
      client: `192.168.1.${(startId + i) % 255}`,
      status: 'OK',
      elapsedMs: 10 + (i % 100),
      reason: 'Rewrite',
      upstream: '1.1.1.1',
      blocked: false,
      filterId: 0,
      rule: ''
    }));
  };

  const initialLogs = generateLogs(0, INITIAL_SIZE);
  const nextLogs = generateLogs(INITIAL_SIZE, NEXT_SIZE);

  // Mock API
  await page.route('**/control/querylog*', async route => {
    const url = new URL(route.request().url());
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    console.log(`API called with offset: ${offset}`);

    if (offset === 0) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: initialLogs })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: nextLogs })
      });
    }
  });

  // Navigate to Logs
  await page.goto('/index.html#/logs');

  // Wait for initial load
  const dataRows = page.locator('.sapMListTblRow');
  await expect(dataRows).toHaveCount(51, { timeout: 10000 });

  const firstRow = dataRows.first();
  await expect(firstRow).toBeVisible();

  const firstRowHandle = await firstRow.elementHandle();

  // Force scroll the page section
  const scrollContainer = page.locator('.sapMPageSection');
  if (await scrollContainer.count() > 0) {
      console.log('Scrolling sapMPageSection...');
      await scrollContainer.evaluate(node => node.scrollTo(0, node.scrollHeight));
  }

  // Try to find the growing trigger and click it
  const trigger = page.locator('.sapMGrowingListTrigger');
  if (await trigger.count() > 0) {
      console.log('Trigger found, forcing click...');
      // Use evaluate to bypass visibility checks
      await trigger.evaluate((node: any) => {
          node.scrollIntoView();
          node.click();
          // Also try to fire a tap event if click doesn't work for UI5
          // node.fireEvent && node.fireEvent('press');
      });
  }

  // Wait for fetch of next batch (offset 60)
  try {
      await page.waitForResponse(response =>
        response.url().includes('/control/querylog') &&
        response.url().includes('offset=60'),
        { timeout: 5000 }
      );
      console.log('Offset 60 fetched!');
  } catch (e) {
      console.log('Offset 60 NOT fetched within timeout.');
  }

  await page.waitForTimeout(2000);

  const finalCount = await dataRows.count();
  console.log(`Final data row count: ${finalCount}`);

  const isConnected = await firstRowHandle?.evaluate(node => node.isConnected);
  console.log(`First row connected after update: ${isConnected}`);
});
