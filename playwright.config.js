// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list']
  ],

  use: {
    // Locally: run against live site. In CI: use local server.
    baseURL: process.env.TEST_URL || (isCI ? 'http://localhost:3000' : 'https://nwa-ads.com'),
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'off',
  },

  // Only spin up local server in CI
  ...(isCI ? {
    webServer: {
      command: 'node_modules/.bin/http-server . -p 3000 -c-1 --silent',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 60000,
    }
  } : {}),

  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
