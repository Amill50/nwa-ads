// tests/e2e/admin.spec.js
// NWA Ads — admin console E2E tests
// Selectors verified against live HTML June 2026

const { test, expect } = require('@playwright/test');
const ADMIN_URL  = '/admin.html';
const PASSPHRASE = 'nwaads2026';
const WRONG_PASS = 'wrongpassword';

// ── Helper ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(ADMIN_URL);
  await expect(page.locator('#gate')).toBeVisible();
  await page.locator('#gate-pw').fill(PASSPHRASE);
  await page.locator('.gate-btn').click();
  await expect(page.locator('.topbar')).toBeVisible({ timeout: 5000 });
}

// ── Authentication ────────────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('Gate screen shown on load', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#gate')).toBeVisible();
  });

  test('Wrong passphrase does not unlock', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('#gate-pw').fill(WRONG_PASS);
    await page.locator('.gate-btn').click();
    await expect(page.locator('#gate')).toBeVisible();
  });

  test('Correct passphrase unlocks the console', async ({ page }) => {
    await login(page);
    await expect(page.getByText('Campaign queue')).toBeVisible();
  });

  test('Green topbar is visible after login', async ({ page }) => {
    await login(page);
    await expect(page.locator('.topbar')).toBeVisible();
    const bg = await page.locator('.topbar').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    // #1f3d2a = rgb(31, 61, 42)
    expect(bg).toMatch(/rgb\(31,\s*61,\s*42\)/);
  });
});

// ── Campaign Queue ────────────────────────────────────────────────────────────

test.describe('Campaign Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.removeItem('nwaads_campaigns'));
    await login(page);
  });

  test('Clear test data button is visible', async ({ page }) => {
    await expect(page.getByText('Clear test data')).toBeVisible();
  });

  test('Clear all button is visible', async ({ page }) => {
    await expect(page.getByText('Clear all')).toBeVisible();
  });

  test('Status filter chips are present', async ({ page }) => {
    // Chips include emoji prefix: "⏳ Pending", "✓ Confirmed", "🟢 Live"
    await expect(page.getByText(/Pending/)).toBeVisible();
    await expect(page.getByText(/Confirmed/)).toBeVisible();
    await expect(page.getByText(/Live/)).toBeVisible();
  });
});

// ── Inventory & Rates ─────────────────────────────────────────────────────────

test.describe('Inventory & Rates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Nav text is "Inventory & rates" with literal ampersand
    await page.getByText(/Inventory/).first().click();
    await page.waitForTimeout(500);
  });

  test('Screen count label is visible', async ({ page }) => {
    await expect(page.locator('#inv-count-label')).toBeVisible();
  });

  test('Export CSV button is visible', async ({ page }) => {
    // Button text is "↓ Export CSV"
    await expect(page.getByText(/Export/)).toBeVisible();
  });

  test('Import CSV button is visible', async ({ page }) => {
    // Label text is "↑ Import CSV"
    await expect(page.getByText(/Import/)).toBeVisible();
  });

  test('Save rates to site button is visible', async ({ page }) => {
    await expect(page.getByText('Save rates to site')).toBeVisible();
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('All nav items present', async ({ page }) => {
    await expect(page.getByText('Campaign queue')).toBeVisible();
    // Nav uses literal "Inventory & rates"
    await expect(page.getByText(/Inventory/)).toBeVisible();
    await expect(page.getByText('Revenue pipeline')).toBeVisible();
    await expect(page.getByText('Pricing manager')).toBeVisible();
    await expect(page.getByText(/Margin/)).toBeVisible();
  });

  test('Booking tool link is in topbar', async ({ page }) => {
    await expect(page.getByText('Booking tool')).toBeVisible();
  });

  test('Sign out button is present', async ({ page }) => {
    await expect(page.getByText('Sign out')).toBeVisible();
  });
});
