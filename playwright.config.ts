import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/apps/**/tests/**', '**/packages/**/src/**/__tests__/**', '**/apps/**/src/**/__tests__/**'],
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}); 