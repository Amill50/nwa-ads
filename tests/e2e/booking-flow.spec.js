// tests/e2e/booking-flow.spec.js
// End-to-end tests for the NWA Ads 4-step booking wizard
// Covers desktop and mobile viewports

const { test, expect } = require('@playwright/test');

const BOOK_URL = '/book.html';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function selectGoal(page, goalText) {
  await page.getByText(goalText).first().click();
}

async function setCustomSchedule(page, days, startDate, endDate) {
  await page.getByText('Custom days').click();
  await expect(page.locator('#custom-sched-wrap')).toBeVisible();
  for (const day of days) {
    await page.locator(`.day-btn[data-day="${day}"]`).click();
  }
  await page.locator('#sched-start').fill(startDate);
  await page.locator('#sched-end').fill(endDate);
}

// ── Step 1: Goal & Schedule ───────────────────────────────────────────────────

test.describe('Step 1 — Goal & Schedule', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOK_URL);
    await expect(page).toHaveTitle(/NWA Ads/);
  });

  test('Page loads with 3 goal cards', async ({ page }) => {
    await expect(page.locator('.goal-card')).toHaveCount(3);
  });

  test('Selecting a goal card highlights it', async ({ page }) => {
    const card = page.getByText('Build your brand across NWA').first();
    await card.click();
    await expect(page.locator('.goal-card.selected, .goal-card.on').first()).toBeVisible();
  });

  test('Budget slider is interactive', async ({ page }) => {
    await expect(page.locator('input[type=range]').first()).toBeVisible();
  });

  test('Standard flight: 2 weeks is default', async ({ page }) => {
    await expect(page.locator('#dur-summary')).toContainText('2 weeks');
  });

  test('Standard flight: switching to 4 weeks updates label', async ({ page }) => {
    await page.locator('.dur-pill').filter({ hasText: '4' }).click();
    await expect(page.locator('#dur-summary')).toContainText('4 weeks');
  });

  test('Custom days tab appears and opens picker', async ({ page }) => {
    await page.getByText('Custom days').click();
    await expect(page.locator('#custom-sched-wrap')).toBeVisible();
    await expect(page.locator('.day-btn')).toHaveCount(7);
  });

  test('Custom schedule: Mon+Tue over 11 weeks = 22 days', async ({ page }) => {
    await setCustomSchedule(page, [1, 2], '2026-06-23', '2026-09-07');
    await expect(page.locator('#custom-day-count')).toContainText('22');
    await expect(page.locator('#sched-summary-text')).toContainText('Mon + Tue');
    await expect(page.locator('#sched-summary-text')).toContainText('22 total ad days');
  });

  test('Custom schedule: end before start shows error, not count', async ({ page }) => {
    await setCustomSchedule(page, [1], '2026-09-07', '2026-06-23');
    await expect(page.locator('#custom-day-count')).toContainText('—');
  });

  test('"Show me available screens" button advances to Step 2', async ({ page }) => {
    await selectGoal(page, 'Build your brand');
    await page.getByText('Show me available screens').click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 10000 });
  });
});

// ── Step 2: Map & Screen Picker ───────────────────────────────────────────────

test.describe('Step 2 — Map & Screen Picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.getByText('Build your brand').first().click();
    await page.getByText('Show me available screens').click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 10000 });
  });

  test('Map renders with screen markers', async ({ page }) => {
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 8000 });
  });

  test('Format filter buttons are visible', async ({ page }) => {
    await expect(page.getByText('Billboard')).toBeVisible();
    await expect(page.getByText('Gas Station')).toBeVisible();
    await expect(page.getByText('Airport')).toBeVisible();
    await expect(page.getByText('Cinema')).toBeVisible();
  });

  test('Cart starts empty', async ({ page }) => {
    await expect(page.getByText('No screens added yet')).toBeVisible();
  });

  test('Adding a screen updates cart', async ({ page }) => {
    // Click first + button in available screens list
    const addBtn = page.locator('.sc-add-btn, button:has-text("+")').first();
    await addBtn.click();
    await expect(page.getByText('No screens added yet')).not.toBeVisible();
  });

  test('10% multi-screen discount is NOT shown', async ({ page }) => {
    await expect(page.getByText('10% off')).not.toBeVisible();
    await expect(page.getByText('unlock 10% off')).not.toBeVisible();
  });

  test('Custom schedule duration shows in cart header', async ({ page }) => {
    // Navigate with custom schedule pre-set
    await page.goto(BOOK_URL);
    await page.getByText('Build your brand').first().click();
    await page.getByText('Custom days').click();
    await page.locator('.day-btn[data-day="1"]').click();
    await page.locator('.day-btn[data-day="2"]').click();
    await page.locator('#sched-start').fill('2026-06-23');
    await page.locator('#sched-end').fill('2026-09-07');
    await page.getByText('Show me available screens').click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#cb-dur')).toContainText('22');
  });

  test('"Review campaign" is disabled with empty cart', async ({ page }) => {
    const btn = page.locator('#btn-s2');
    await expect(btn).toBeDisabled();
  });
});

// ── Step 3: Creative Upload ───────────────────────────────────────────────────

test.describe('Step 3 — Creative Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.getByText('Build your brand').first().click();
    await page.getByText('Show me available screens').click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 10000 });
    // Add a screen then navigate to step 3
    const addBtn = page.locator('.sc-add-btn, button:has-text("+")').first();
    await addBtn.click();
    // Open summary modal and proceed
    await page.locator('#btn-s2').click();
    await expect(page.getByText('Campaign summary')).toBeVisible();
    await page.getByText('Looks good').click();
    await expect(page.getByText('Upload your creative')).toBeVisible({ timeout: 5000 });
  });

  test('Creative upload step shows spec cards', async ({ page }) => {
    await expect(page.getByText('1920 × 640 px')).toBeVisible();
  });

  test('Drop zone is visible', async ({ page }) => {
    await expect(page.getByText('Drop your file here')).toBeVisible();
  });

  test('Skip option is available', async ({ page }) => {
    await expect(page.getByText("Skip")).toBeVisible();
  });

  test('"Continue to checkout" advances to Step 4', async ({ page }) => {
    await page.getByText('Continue to checkout').click();
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 5000 });
  });
});

// ── Step 4: Checkout & Proposal ───────────────────────────────────────────────

test.describe('Step 4 — Checkout', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('Order summary shows screen and total', async ({ page }) => {
    await expect(page.locator('#os-grand')).toBeVisible();
  });

  test('Proposal section is visible', async ({ page }) => {
    await page.locator('.proposal-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.proposal-section')).toBeVisible();
  });

  test('Generate proposal link creates a URL', async ({ page }) => {
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const input = page.locator('#proposal-link-input');
    await expect(input).toBeVisible();
    const value = await input.inputValue();
    await expect(value).toContain('?proposal=');
    await expect(value).toContain('nwa-ads.com');
  });

  test('Copy link button confirms copy', async ({ page }) => {
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    await page.locator('#btn-copy-link').click();
    await expect(page.locator('#btn-copy-link')).toContainText('✓');
  });

  test('Submit booking button is present', async ({ page }) => {
    await expect(page.getByText('Submit booking request')).toBeVisible();
  });
});

// ── Mobile viewport ───────────────────────────────────────────────────────────

test.describe('Mobile — Step 2 screen list', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Screen cards do not overlap "Available screens" label', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.getByText('Build your brand').first().click();
    await page.getByText('Show me available screens').click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 10000 });

    const label = page.locator('#screen-list-label');
    const firstCard = page.locator('.sc-row').first();
    await expect(label).toBeVisible();
    await expect(firstCard).toBeVisible();

    // Verify label is above first card (no overlap)
    const labelBox = await label.boundingBox();
    const cardBox  = await firstCard.boundingBox();
    if (labelBox && cardBox) {
      expect(cardBox.y).toBeGreaterThanOrEqual(labelBox.y + labelBox.height - 2);
    }
  });

  test('Cart section is reachable by scrolling', async ({ page }) => {
    await page.goto(BOOK_URL);
    await page.getByText('Build your brand').first().click();
    await page.getByText('Show me available screens').click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 10000 });
    await page.locator('.cart-summary').scrollIntoViewIfNeeded();
    await expect(page.locator('.cart-summary')).toBeVisible();
  });
});
