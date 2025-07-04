import { test, expect } from '@playwright/test';

test('smoke test', async ({ page }) => {
  expect(1 + 1).toBe(2);
}); 