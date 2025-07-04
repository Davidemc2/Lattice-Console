import { test, expect } from '@playwright/test';

test('Desktop App Onboarding Flow', async ({ page }) => {
  await page.goto('http://localhost:3002');
  await page.fill('[data-testid="hostname-input"]', 'test-node');
  await page.selectOption('[data-testid="resource-tier"]', 'small');
  await page.check('[data-testid="agree-terms"]');
  await page.click('[data-testid="complete-onboarding"]');
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
}); 