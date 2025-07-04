import { test, expect } from '@playwright/test';

test.describe('LogViewer /dev/logs page', () => {
  test('renders logs and UI features', async ({ page }) => {
    await page.goto('/dev/logs');
    // Check for log lines
    await expect(page.getByTestId('log-line')).toContainText('Workload started');
    // Check for Load more button
    await expect(page.getByRole('button', { name: /load more/i })).toBeVisible();
    // Check for Download logs button
    await expect(page.getByRole('button', { name: /download logs/i })).toBeVisible();
    // Check for Copy button
    await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
  });
}); 