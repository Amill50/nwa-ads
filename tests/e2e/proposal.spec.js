// tests/e2e/proposal.spec.js
// End-to-end tests for the proposal link generation and round-trip load

const { test, expect } = require('@playwright/test');

const BOOK_URL = '/book.html';

// Known good proposal — encodes: custom Mo+Tu schedule, 22 days, loc_237536
const VALID_PROPOSAL_URL = '/book.html?proposal=eyJ2IjoxLCJnb2FsIjpudWxsLCJpbmMiOiJ3ZWVrbHkiLCJxdHkiOjIsImJ1ZGdldCI6MjAwMCwic2NoZWRNb2RlIjoiY3VzdG9tIiwiY3VzdG9tRGF5cyI6WzEsMl0sInNjaGVkU3RhcnQiOiIyMDI2LTA2LTIzIiwic2NoZWRFbmQiOiIyMDI2LTA5LTA3IiwiY3VzdG9tRGF5Q291bnQiOjIyLCJzY3JlZW5zIjpbImxvY18yMzc1MzYiXSwiY3JlYXRlZCI6IjIwMjYtMDYtMDgifQ==';

// ── Proposal Generation ───────────────────────────────────────────────────────

test.describe('Proposal Link Generation', () => {
  async function reachCheckout(page) {
    await page.goto(BOOK_URL);
    await page.getByText('Build your brand').first().click();
    await page.getByText('Show me available screens').click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 10000 });
    const addBtn = page.locator('.sc-add-btn, button:has-text("+")').first();
    await addBtn.click();
    await page.locator('#btn-s2').click();
    await expect(page.getByText('Campaign summary')).toBeVisible();
    await page.getByText('Looks good').click();
    await page.getByText('Continue to checkout').click();
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 5000 });
  }

  test('Proposal section is visible on checkout page', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.proposal-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.proposal-section')).toBeVisible();
    await expect(page.getByText('Send as Proposal')).toBeVisible();
  });

  test('Generate proposal link button is present', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await expect(page.locator('.btn-gen-proposal')).toBeVisible();
  });

  test('Clicking generate creates a URL with proposal param', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const input = page.locator('#proposal-link-input');
    await expect(input).toBeVisible();
    const url = await input.inputValue();
    expect(url).toContain('?proposal=');
    expect(url).toContain('nwa-ads.com/book.html');
  });

  test('Generated URL contains valid base64 JSON', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const url = await page.locator('#proposal-link-input').inputValue();
    const encoded = url.split('?proposal=')[1];
    const decoded = JSON.parse(atob(encoded));
    expect(decoded).toHaveProperty('v', 1);
    expect(decoded).toHaveProperty('screens');
    expect(Array.isArray(decoded.screens)).toBeTruthy();
    expect(decoded.screens.length).toBeGreaterThan(0);
  });

  test('Copy link button shows confirmation', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    await page.locator('#btn-copy-link').click();
    await expect(page.locator('#btn-copy-link')).toContainText('✓');
  });

  test('Copy confirmation resets after 2.5 seconds', async ({ page }) => {
    await reachCheckout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    await page.locator('#btn-copy-link').click();
    await expect(page.locator('#btn-copy-link')).toContainText('✓');
    await page.waitForTimeout(3000);
    await expect(page.locator('#btn-copy-link')).toContainText('Copy link');
  });
});

// ── Proposal Round-trip ───────────────────────────────────────────────────────

test.describe('Proposal Round-trip (load from URL)', () => {
  test('Proposal URL loads directly to Step 4 (checkout)', async ({ page }) => {
    await page.goto(VALID_PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    // Should be on step 4 — checkout visible
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 8000 });
  });

  test('Proposal banner is shown', async ({ page }) => {
    await page.goto(VALID_PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#proposal-banner')).toBeVisible({ timeout: 8000 });
  });

  test('Proposal CTA strip is shown with Book button', async ({ page }) => {
    await page.goto(VALID_PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#proposal-cta')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Book this campaign')).toBeVisible();
  });

  test('Cart is pre-populated with the proposal screen', async ({ page }) => {
    await page.goto(VALID_PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#os-grand')).toBeVisible({ timeout: 8000 });
    const total = await page.locator('#os-grand').textContent();
    expect(total).not.toBe('$0');
  });

  test('Custom schedule label shown in order summary', async ({ page }) => {
    await page.goto(VALID_PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#os-sched-note')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#os-sched-note')).toContainText('Mon');
  });

  test('"Book this campaign" button hides CTA strip', async ({ page }) => {
    await page.goto(VALID_PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    await page.getByText('Book this campaign →').click();
    await expect(page.locator('#proposal-cta')).not.toBeVisible();
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────────────

test.describe('Proposal Edge Cases', () => {
  test('Corrupt proposal param fails gracefully and loads Step 1', async ({ page }) => {
    await page.goto(`${BOOK_URL}?proposal=this_is_not_valid_base64!!!`);
    await page.waitForLoadState('networkidle');
    // Should fall through to Step 1, not crash
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
  });

  test('Empty screens array in proposal still loads', async ({ page }) => {
    const empty = btoa(JSON.stringify({ v: 1, screens: [], schedMode: 'standard', inc: 'weekly', qty: 2 }));
    await page.goto(`${BOOK_URL}?proposal=${empty}`);
    await page.waitForLoadState('networkidle');
    // Should load checkout with empty cart
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 8000 });
  });

  test('No proposal param loads Step 1 normally', async ({ page }) => {
    await page.goto(BOOK_URL);
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#proposal-banner')).not.toBeVisible();
  });
});
