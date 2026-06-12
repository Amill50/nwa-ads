// tests/e2e/proposal.spec.js
// NWA Ads — proposal link E2E tests

const { test, expect } = require('@playwright/test');
const BOOK_URL = '/book.html';

const VALID_PROPOSAL = '/book.html?proposal=eyJ2IjoxLCJnb2FsIjpudWxsLCJpbmMiOiJ3ZWVrbHkiLCJxdHkiOjIsImJ1ZGdldCI6MjAwMCwic2NoZWRNb2RlIjoiY3VzdG9tIiwiY3VzdG9tRGF5cyI6WzEsMl0sInNjaGVkU3RhcnQiOiIyMDI2LTA2LTIzIiwic2NoZWRFbmQiOiIyMDI2LTA5LTA3IiwiY3VzdG9tRGF5Q291bnQiOjIyLCJzY3JlZW5zIjpbImxvY18yMzc1MzYiXSwiY3JlYXRlZCI6IjIwMjYtMDYtMDgifQ==';

// ── Generation ────────────────────────────────────────────────────────────────

test.describe('Proposal Generation', () => {
  async function reachCheckout(page) {
    await page.goto(BOOK_URL);
    await page.locator('.goal-card').first().click();
    await page.locator('.btn-next').first().click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });
    await page.locator('#tab-list').click();
    await page.waitForTimeout(500);
    await page.locator('.sc-add-btn').first().click();
    await page.locator('#btn-s2').click();
    await expect(page.getByText('Campaign summary')).toBeVisible({ timeout: 5000 });
    await page.getByText('Looks good').click();
    await page.getByText('Continue to checkout').click();
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 5000 });
  }

  test('Proposal section is present on checkout', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.proposal-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.proposal-section')).toBeVisible();
  });

  test('Generate button creates a URL with proposal param', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    await expect(page.locator('#proposal-link-input')).toBeVisible();
    const val = await page.locator('#proposal-link-input').inputValue();
    expect(val).toContain('?proposal=');
    expect(val).toContain('nwa-ads.com');
  });

  test('Generated URL decodes to valid JSON with screens array', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const url = await page.locator('#proposal-link-input').inputValue();
    const encoded = url.split('?proposal=')[1];
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString());
    expect(decoded.v).toBe(1);
    expect(Array.isArray(decoded.screens)).toBeTruthy();
    expect(decoded.screens.length).toBeGreaterThan(0);
  });
});

// ── Round-trip ────────────────────────────────────────────────────────────────

test.describe('Proposal Round-trip', () => {
  test('Loads directly to checkout (Step 4)', async ({ page }) => {
    await page.goto(VALID_PROPOSAL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 10000 });
  });

  test('Proposal banner is shown', async ({ page }) => {
    await page.goto(VALID_PROPOSAL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#proposal-banner')).toBeVisible({ timeout: 10000 });
  });

  test('Proposal CTA strip with Book button is shown', async ({ page }) => {
    await page.goto(VALID_PROPOSAL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#proposal-cta')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Book this campaign')).toBeVisible();
  });

  test('Order summary has a non-zero total', async ({ page }) => {
    await page.goto(VALID_PROPOSAL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#os-grand')).toBeVisible({ timeout: 10000 });
    const total = await page.locator('#os-grand').textContent();
    expect(total).not.toBe('$0');
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────────────

test.describe('Edge Cases', () => {
  test('Corrupt proposal param falls back to Step 1', async ({ page }) => {
    await page.goto(`${BOOK_URL}?proposal=notvalidbase64!!!`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#proposal-banner')).not.toBeVisible();
  });

  test('No proposal param loads Step 1 normally', async ({ page }) => {
    await page.goto(BOOK_URL);
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#proposal-banner')).not.toBeVisible();
  });
});
