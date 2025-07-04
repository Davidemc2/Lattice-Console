import { test, expect } from '@playwright/test';

test.describe('Workload Dashboard E2E', () => {
  test('Deploy Postgres and MinIO workloads, check status and credentials', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Open deploy modal
    await page.click('[data-testid="deploy-workload-btn"]');
    await expect(page.locator('[data-testid="deploy-modal-title"]')).toHaveText('Deploy New Workload');

    // Deploy Postgres
    await page.selectOption('[data-testid="deploy-type"]', 'POSTGRES');
    await page.fill('[data-testid="deploy-name"]', 'e2e-postgres');
    await page.click('[data-testid="deploy-submit"]');
    await expect(page.locator('[data-testid="deploy-success"]')).toHaveText('Workload deployed!');
    await page.click('[data-testid="deploy-cancel"]');

    // Wait for status to become running
    await expect(page.locator('[data-testid="workload-row"] [data-testid="workload-name"]', { hasText: 'e2e-postgres' }).locator('..').locator('[data-testid="workload-status"] span.text-green-600')).toHaveText('running', { timeout: 60000 });

    // Check credentials
    await expect(page.locator('[data-testid="workload-row"] [data-testid="workload-name"]', { hasText: 'e2e-postgres' }).locator('..').locator('[data-testid="workload-credentials"]')).toContainText('User:');

    // Deploy MinIO
    await page.click('[data-testid="deploy-workload-btn"]');
    await page.selectOption('[data-testid="deploy-type"]', 'MINIO');
    await page.fill('[data-testid="deploy-name"]', 'e2e-minio');
    await page.click('[data-testid="deploy-submit"]');
    await expect(page.locator('[data-testid="deploy-success"]')).toHaveText('Workload deployed!');
    await page.click('[data-testid="deploy-cancel"]');
    await expect(page.locator('[data-testid="workload-row"] [data-testid="workload-name"]', { hasText: 'e2e-minio' }).locator('..').locator('[data-testid="workload-status"] span.text-green-600')).toHaveText('running', { timeout: 60000 });
    await expect(page.locator('[data-testid="workload-row"] [data-testid="workload-name"]', { hasText: 'e2e-minio' }).locator('..').locator('[data-testid="workload-credentials"]')).toContainText('Key:');
  });

  test('Error handling: missing name shows error', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="deploy-workload-btn"]');
    await page.selectOption('[data-testid="deploy-type"]', 'POSTGRES');
    await page.fill('[data-testid="deploy-name"]', '');
    await page.click('[data-testid="deploy-submit"]');
    await expect(page.locator('[data-testid="deploy-error"]')).toBeVisible();
    await page.click('[data-testid="deploy-cancel"]');
  });

  test('Modal open/close works', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="deploy-workload-btn"]');
    await expect(page.locator('[data-testid="deploy-modal-title"]')).toHaveText('Deploy New Workload');
    await page.click('[data-testid="deploy-cancel"]');
    await expect(page.locator('[data-testid="deploy-modal-title"]')).not.toBeVisible();
  });
}); 