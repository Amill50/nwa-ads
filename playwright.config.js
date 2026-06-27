// playwright.config.js
const { execSync } = require('child_process');
const { defineConfig, devices } = require('@playwright/test');

// Playwright's bundled Chromium is not patchelf'd for NixOS — use the system Chromium instead.
// Setting PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is the most reliable override (takes priority
// over executablePath in use/launchOptions, which Playwright 1.61 ignores for headless shell).
let systemChromium;
try { systemChromium = execSync('which chromium').toString().trim(); } catch { systemChromium = undefined; }
if (systemChromium && !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = systemChromium;
}

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
    baseURL: process.env.TEST_URL || process.env.REPLIT_URL || 'http://localhost:3000',
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
      use: {
        ...devices['Desktop Chrome'],
        ...(systemChromium ? { executablePath: systemChromium } : {}),
      },
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
