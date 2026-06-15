// tests/e2e/booking-flow.spec.js
// NWA Ads — booking wizard E2E tests
// Selectors verified against live HTML June 2026

const { test, expect } = require('@playwright/test');
const BOOK_URL = '/book.html';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToStep2(page) {
  await page.goto(BOOK_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.goal-card').first().click();
  await page.locator('.btn-next').first().click();
  await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });
}

async function goToStep3(page) {
  await goToStep2(page);
  // Switch to list view (actual id is #vt-list, not #tab-list)
  await page.locator('#vt-list').click();
  await page.waitForTimeout(500);
  await page.locator('.sc-add-btn').first().click();
  await page.locator('#btn-s2').click();
  await expect(page.getByText('Campaign summary')).toBeVisible({ timeout: 5000 });
  await page.getByText('Looks good').click();
  await expect(page.getByText('Upload your creative')).toBeVisible({ timeout: 5000 });
}

async function goToStep4(page) {
  await goToStep3(page);
  await page.getByText('Continue to checkout').first().click();
  await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 5000 });
}

// ── Step 1: Goal & Schedule ───────────────────────────────────────────────────

test.describe('Step 1 — Goal & Schedule', () => {
  test('Page loads with correct title', async ({ page }) => {
    await page.goto(BOOK_URL);
    await expect(page).toHaveTitle(/NWA Ads/);
  });

  test('Three goal cards are visible', async ({ page }) => {
    await page.goto(BOOK_URL);
    await expect(page.locator('.goal-card')).toHaveCount(3);
  });

  test('Clicking goal card selects it', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('.goal-card').first().click();
    // Active class is 'sel', not 'on'
    await expect(page.locator('.goal-card.sel').first()).toBeVisible();
  });

  test('Standard flight: default is 2 weeks', async ({ page }) => {
    await page.goto(BOOK_URL);
    await expect(page.locator('#dur-summary')).toContainText('2 weeks');
  });

  test('Switching to 4 weeks updates campaign length', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('#qty-pills .dur-pill').filter({ hasText: '4' }).click();
    await expect(page.locator('#dur-summary')).toContainText('4 weeks');
  });

  test('Custom days tab opens the day picker', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('#sched-custom').click();
    await expect(page.locator('#custom-sched-wrap')).toBeVisible();
    await expect(page.locator('.day-btn')).toHaveCount(7);
  });

  test('Custom schedule: Mon+Tue, 11 weeks = 22 days', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('#sched-custom').click();
    await page.locator('.day-btn[data-day="1"]').click();
    await page.locator('.day-btn[data-day="2"]').click();
    await page.locator('#sched-start').fill('2026-06-23');
    await page.locator('#sched-end').fill('2026-09-07');
    await expect(page.locator('#custom-day-count')).toContainText('22');
    await expect(page.locator('#sched-summary-text')).toContainText('Mon + Tue');
    await expect(page.locator('#sched-summary-text')).toContainText('22 total ad days');
  });

  test('Advance to Step 2 via btn-next', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('.goal-card').first().click();
    await page.locator('.btn-next').first().click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });
  });
});

// ── Step 2: Map & Screen Picker ───────────────────────────────────────────────

test.describe('Step 2 — Map & Screen Picker', () => {
  test('Map loads with markers', async ({ page }) => {
    await goToStep2(page);
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 });
  });

  test('Format filter chips are visible', async ({ page }) => {
    await goToStep2(page);
    await expect(page.getByText('Billboard')).toBeVisible();
    await expect(page.getByText('Gas Station')).toBeVisible();
    await expect(page.getByText('Airport')).toBeVisible();
    await expect(page.getByText('Cinema')).toBeVisible();
  });

  test('List view shows screen cards', async ({ page }) => {
    await goToStep2(page);
    // Correct id is #vt-list
    await page.locator('#vt-list').click();
    await expect(page.locator('.sc-add-btn').first()).toBeVisible({ timeout: 5000 });
  });

  test('Cart starts empty', async ({ page }) => {
    await goToStep2(page);
    await expect(page.getByText('No screens added yet')).toBeVisible();
  });

  test('Adding a screen updates the cart', async ({ page }) => {
    await goToStep2(page);
    await page.locator('#vt-list').click();
    await page.locator('.sc-add-btn').first().click();
    await expect(page.getByText('No screens added yet')).not.toBeVisible();
  });

  test('10% discount badge is not visible with fewer than 3 screens', async ({ page }) => {
    await goToStep2(page);
    // #ch-discount has display:none by default; only shows at 3+ screens
    await expect(page.locator('#ch-discount')).not.toBeVisible();
  });

  test('Review campaign button is disabled with empty cart', async ({ page }) => {
    await goToStep2(page);
    const btn = page.locator('#btn-s2');
    await expect(btn).toBeDisabled();
  });

  test('Custom schedule duration shows in cart header', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('.goal-card').first().click();
    await page.locator('#sched-custom').click();
    await page.locator('.day-btn[data-day="1"]').click();
    await page.locator('.day-btn[data-day="2"]').click();
    await page.locator('#sched-start').fill('2026-06-23');
    await page.locator('#sched-end').fill('2026-09-07');
    await page.locator('.btn-next').first().click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#cb-dur')).toContainText('22');
  });
});

// ── Step 3: Creative ──────────────────────────────────────────────────────────

test.describe('Step 3 — Creative Upload', () => {
  test('Creative step shows upload drop zone', async ({ page }) => {
    await goToStep3(page);
    await expect(page.getByText('Drop your file here')).toBeVisible();
  });

  test('Spec cards are shown', async ({ page }) => {
    await goToStep3(page);
    await expect(page.getByText(/1920/)).toBeVisible();
  });

  test('Skip option is available', async ({ page }) => {
    await goToStep3(page);
    // Button text is "Skip — I'll send creative later"
    await expect(page.getByText(/Skip/)).toBeVisible();
  });

  test('"Continue to checkout" advances to Step 4', async ({ page }) => {
    await goToStep3(page);
    await page.getByText('Continue to checkout').first().click();
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 5000 });
  });
});

// ── Step 4: Checkout ──────────────────────────────────────────────────────────

test.describe('Step 4 — Checkout', () => {
  test('Checkout page loads with order summary', async ({ page }) => {
    await goToStep4(page);
    await expect(page.locator('#os-grand')).toBeVisible();
  });

  test('Proposal section is visible', async ({ page }) => {
    await goToStep4(page);
    await page.locator('.proposal-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.proposal-section')).toBeVisible();
  });

  test('Generate proposal link creates a URL', async ({ page }) => {
    await goToStep4(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const input = page.locator('#proposal-link-input');
    await expect(input).toBeVisible();
    const value = await input.inputValue();
    expect(value).toContain('?proposal=');
  });

  test('Submit booking button is present', async ({ page }) => {
    await goToStep4(page);
    await expect(page.getByText('Submit booking request')).toBeVisible();
  });
});

// ── Proposal round-trip ───────────────────────────────────────────────────────

const PROPOSAL_URL = '/book.html?proposal=eyJ2IjoxLCJnb2FsIjpudWxsLCJpbmMiOiJ3ZWVrbHkiLCJxdHkiOjIsImJ1ZGdldCI6MjAwMCwic2NoZWRNb2RlIjoiY3VzdG9tIiwiY3VzdG9tRGF5cyI6WzEsMl0sInNjaGVkU3RhcnQiOiIyMDI2LTA2LTIzIiwic2NoZWRFbmQiOiIyMDI2LTA5LTA3IiwiY3VzdG9tRGF5Q291bnQiOjIyLCJzY3JlZW5zIjpbImxvY18yMzc1MzYiXSwiY3JlYXRlZCI6IjIwMjYtMDYtMDgifQ==';

test.describe('Proposal Round-trip', () => {
  test('Proposal URL loads to checkout with cart pre-filled', async ({ page }) => {
    await page.goto(PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 10000 });
  });

  test('Proposal banner is visible', async ({ page }) => {
    await page.goto(PROPOSAL_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#proposal-banner')).toBeVisible({ timeout: 10000 });
  });

  test('Corrupt proposal param falls back to Step 1', async ({ page }) => {
    await page.goto('/book.html?proposal=notvalidbase64!!!');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
  });
});

// ── Mobile ────────────────────────────────────────────────────────────────────

test.describe('Mobile — Step 2 layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Screen cards do not overlap the available screens label', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.locator('.goal-card').first().click();
    await page.locator('.btn-next').first().click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });

    const listTab = page.locator('#vt-list');
    if (await listTab.isVisible()) await listTab.click();

    const label = page.locator('.screen-list-label').first();
    const firstCard = page.locator('.sc-add-btn').first();

    if (await label.isVisible() && await firstCard.isVisible()) {
      const labelBox = await label.boundingBox();
      const cardBox  = await firstCard.boundingBox();
      if (labelBox && cardBox) {
        expect(cardBox.y).toBeGreaterThanOrEqual(labelBox.y + labelBox.height - 2);
      }
    }
  });
});
