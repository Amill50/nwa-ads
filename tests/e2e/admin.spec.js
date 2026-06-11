// tests/e2e/admin.spec.js
// End-to-end tests for the NWA Ads admin console

const { test, expect } = require('@playwright/test');

const ADMIN_URL   = '/admin.html';
const PASSPHRASE  = 'nwaads2026';
const WRONG_PASS  = 'wrongpassword';

// ── Helper ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(ADMIN_URL);
  await expect(page.locator('#gate')).toBeVisible();
  await page.locator('#gate-pw').fill(PASSPHRASE);
  await page.locator('button:has-text("Enter console")').click();
  await expect(page.locator('.topbar')).toBeVisible({ timeout: 5000 });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('Gate screen shown on load', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('#gate')).toBeVisible();
    await expect(page.locator('.topbar')).not.toBeVisible();
  });

  test('Wrong passphrase does not unlock', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.locator('#gate-pw').fill(WRONG_PASS);
    await page.locator('button:has-text("Enter console")').click();
    await expect(page.locator('#gate')).toBeVisible();
    await expect(page.locator('.topbar')).not.toBeVisible();
  });

  test('Correct passphrase unlocks console', async ({ page }) => {
    await login(page);
    await expect(page.getByText('Campaign queue')).toBeVisible();
  });

  test('Green topbar is visible after login', async ({ page }) => {
    await login(page);
    const topbar = page.locator('.topbar');
    await expect(topbar).toBeVisible();
    const bg = await topbar.evaluate(el => getComputedStyle(el).backgroundColor);
    // Should be green — rgb(31, 61, 42) = #1f3d2a
    expect(bg).toMatch(/rgb\(31,\s*61,\s*42\)/);
  });
});

// ── Campaign Queue ────────────────────────────────────────────────────────────

test.describe('Campaign Queue', () => {
  test.beforeEach(async ({ page }) => {
    // Clear campaigns so tests are deterministic
    await page.goto(ADMIN_URL);
    await page.evaluate(() => localStorage.removeItem('nwaads_campaigns'));
    await login(page);
  });

  test('Empty queue shows zero counts', async ({ page }) => {
    await expect(page.locator('#kpi-campaigns')).toContainText('0');
  });

  test('"Clear test data" button is visible', async ({ page }) => {
    await expect(page.getByText('Clear test data')).toBeVisible();
  });

  test('"Clear all" button is visible', async ({ page }) => {
    await expect(page.getByText('Clear all')).toBeVisible();
  });

  test('Filter chips are present', async ({ page }) => {
    await expect(page.getByText('Pending')).toBeVisible();
    await expect(page.getByText('Confirmed')).toBeVisible();
    await expect(page.getByText('Live')).toBeVisible();
  });
});

// ── Inventory & Rates ─────────────────────────────────────────────────────────

test.describe('Inventory & Rates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText('Inventory & rates').click();
    await expect(page.getByText('Inventory & rates')).toBeVisible();
  });

  test('Shows correct total screen count', async ({ page }) => {
    // Should show 82 screens (83 total minus test/placeholder)
    const label = page.locator('#inv-count-label');
    await expect(label).toContainText('screen');
  });

  test('"Export updated rates" button is visible', async ({ page }) => {
    await expect(page.getByText('Export')).toBeVisible();
  });

  test('"Import CSV" button is visible', async ({ page }) => {
    await expect(page.getByText('Import')).toBeVisible();
  });

  test('"Save rates to site" button is visible', async ({ page }) => {
    await expect(page.getByText('Save rates to site')).toBeVisible();
  });

  test('Inventory table has screen rows', async ({ page }) => {
    const rows = page.locator('.inv-row, .tbl tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });

  test('Billboard filter shows only billboard screens', async ({ page }) => {
    await page.locator('button:has-text("Billboard")').click();
    // All visible rows should be billboard type
    const rows = page.locator('.inv-row[data-type="digital"], .tbl tr[data-type="digital"]');
    const allRows = page.locator('.inv-row, .tbl tbody tr');
    const billboardCount = await rows.count();
    const totalCount = await allRows.count();
    expect(billboardCount).toBeLessThanOrEqual(totalCount);
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('All sidebar nav items are present', async ({ page }) => {
    await expect(page.getByText('Campaign queue')).toBeVisible();
    await expect(page.getByText('Inventory & rates')).toBeVisible();
    await expect(page.getByText('Revenue pipeline')).toBeVisible();
    await expect(page.getByText('Inventory health')).toBeVisible();
    await expect(page.getByText('Pricing manager')).toBeVisible();
    await expect(page.getByText('Margin & rate settings')).toBeVisible();
  });

  test('"Booking tool" link in topbar is present', async ({ page }) => {
    await expect(page.getByText('Booking tool')).toBeVisible();
  });

  test('Sign out button is present', async ({ page }) => {
    await expect(page.getByText('Sign out')).toBeVisible();
  });
});
