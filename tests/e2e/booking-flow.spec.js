// tests/e2e/booking-flow.spec.js
const { test, expect } = require('@playwright/test');
const URL = '/book.html';

async function step2(page) {
  page.on('pageerror', e => console.log('JS ERROR:', e.message));
  await page.goto(URL);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.goal-card').first().click();
  await page.locator('.btn-next').first().click();
  await expect(page.locator('.sc-add-btn').first()).toBeVisible({ timeout: 15000 });
}

async function step3(page) {
  await step2(page);
  await page.locator('.sc-add-btn').first().click();
  await page.locator('#btn-s2').click();
  await expect(page.locator('.summary-modal-title')).toBeVisible({ timeout: 8000 });
  await page.getByText(/Looks good/).click();
  await expect(page.getByText('Upload your creative')).toBeVisible({ timeout: 8000 });
}

async function step4(page) {
  await step3(page);
  // Button text: "Continue to checkout →" — use the btn id to be precise
  await page.locator('#btn-s3-continue').click();
  await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 8000 });
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
test.describe('Step 1 — Goal & Schedule', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto(URL);
    await expect(page).toHaveTitle(/NWA Ads/);
  });

  test('three goal cards visible', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.goal-card')).toHaveCount(3);
  });

  test('clicking goal card marks it selected (class: sel)', async ({ page }) => {
    await page.goto(URL);
    await page.locator('.goal-card').first().click();
    await expect(page.locator('.goal-card.sel')).toHaveCount(1);
  });

  test('default schedule shows 2 weeks', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#dur-summary')).toContainText('2 weeks');
  });

  test('switching to 4-week pill updates summary', async ({ page }) => {
    await page.goto(URL);
    await page.locator('#qty-pills .dur-pill').filter({ hasText: '4' }).click();
    await expect(page.locator('#dur-summary')).toContainText('4 weeks');
  });

  test('custom schedule tab opens day picker', async ({ page }) => {
    await page.goto(URL);
    await page.locator('#sched-custom').click();
    await expect(page.locator('#custom-sched-wrap')).toBeVisible();
    await expect(page.locator('.day-btn')).toHaveCount(7);
  });

  test('custom schedule: Mon+Tue over 11 weeks = 22 days', async ({ page }) => {
    await page.goto(URL);
    await page.locator('#sched-custom').click();
    await page.locator('.day-btn[data-day="1"]').click();
    await page.locator('.day-btn[data-day="2"]').click();
    await page.locator('#sched-start').fill('2026-06-23');
    await page.locator('#sched-end').fill('2026-09-07');
    await expect(page.locator('#custom-day-count')).toContainText('22');
    await expect(page.locator('#sched-summary-text')).toContainText('Mon + Tue');
    await expect(page.locator('#sched-summary-text')).toContainText('22 total ad days');
  });
});

// ── Step 2 ────────────────────────────────────────────────────────────────────
test.describe('Step 2 — Screen Picker', () => {
  test('map is visible', async ({ page }) => {
    page.on('pageerror', e => console.log('JS ERROR:', e.message));
    await page.goto(URL);
    await page.locator('.goal-card').first().click();
    await page.locator('.btn-next').first().click();
    await expect(page.locator('#map')).toBeVisible({ timeout: 15000 });
  });

  test('screen add buttons render', async ({ page }) => {
    await step2(page);
    const count = await page.locator('.sc-add-btn').count();
    console.log('sc-add-btn count:', count);
    expect(count).toBeGreaterThan(0);
  });

  test('cart starts empty', async ({ page }) => {
    await step2(page);
    await expect(page.getByText('No screens added yet')).toBeVisible();
  });

  test('review button disabled with empty cart', async ({ page }) => {
    await step2(page);
    await expect(page.locator('#btn-s2')).toBeDisabled();
  });

  test('adding screen enables review button', async ({ page }) => {
    await step2(page);
    await page.locator('.sc-add-btn').first().click();
    await expect(page.locator('#btn-s2')).not.toBeDisabled();
  });

  test('discount badge hidden with < 3 screens', async ({ page }) => {
    await step2(page);
    await expect(page.locator('#ch-discount')).not.toBeVisible();
  });

  test('custom schedule duration shown in cart bar', async ({ page }) => {
    page.on('pageerror', e => console.log('JS ERROR:', e.message));
    await page.goto(URL);
    await page.locator('.goal-card').first().click();
    await page.locator('#sched-custom').click();
    await page.locator('.day-btn[data-day="1"]').click();
    await page.locator('.day-btn[data-day="2"]').click();
    await page.locator('#sched-start').fill('2026-06-23');
    await page.locator('#sched-end').fill('2026-09-07');
    await page.locator('.btn-next').first().click();
    await expect(page.locator('.sc-add-btn').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#cb-dur')).toContainText('22');
  });
});

// ── Step 3 ────────────────────────────────────────────────────────────────────
test.describe('Step 3 — Creative', () => {
  test('upload drop zone visible', async ({ page }) => {
    await step3(page);
    await expect(page.getByText('Drop your file here')).toBeVisible();
  });

  test('skip button available', async ({ page }) => {
    await step3(page);
    // Button is class="skip-btn" with text "Skip — I'll send creative later"
    await expect(page.locator('.skip-btn')).toBeVisible();
  });

  test('continue to checkout advances to step 4', async ({ page }) => {
    await step4(page);
    await expect(page.getByText('Almost live.')).toBeVisible();
  });
});

// ── Step 4 ────────────────────────────────────────────────────────────────────
test.describe('Step 4 — Checkout', () => {
  test('order summary grand total visible', async ({ page }) => {
    await step4(page);
    await expect(page.locator('#os-grand')).toBeVisible();
  });

  test('proposal section visible', async ({ page }) => {
    await step4(page);
    await page.locator('.proposal-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.proposal-section')).toBeVisible();
  });

  test('generate proposal link produces ?proposal= URL', async ({ page }) => {
    await step4(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const val = await page.locator('#proposal-link-input').inputValue();
    expect(val).toContain('?proposal=');
  });

  test('submit booking button present', async ({ page }) => {
    await step4(page);
    await expect(page.getByText('Submit booking request')).toBeVisible();
  });
});

// ── Proposal round-trip ───────────────────────────────────────────────────────
const PROPOSAL = '/book.html?proposal=eyJ2IjoxLCJnb2FsIjpudWxsLCJpbmMiOiJ3ZWVrbHkiLCJxdHkiOjIsImJ1ZGdldCI6MjAwMCwic2NoZWRNb2RlIjoiY3VzdG9tIiwiY3VzdG9tRGF5cyI6WzEsMl0sInNjaGVkU3RhcnQiOiIyMDI2LTA2LTIzIiwic2NoZWRFbmQiOiIyMDI2LTA5LTA3IiwiY3VzdG9tRGF5Q291bnQiOjIyLCJzY3JlZW5zIjpbImxvY18yMzc1MzYiXSwiY3JlYXRlZCI6IjIwMjYtMDYtMDgifQ==';

test.describe('Proposal Round-trip', () => {
  test('proposal URL loads directly to checkout', async ({ page }) => {
    page.on('pageerror', e => console.log('JS ERROR:', e.message));
    await page.goto(PROPOSAL);
    await page.waitForLoadState('domcontentloaded');
    // goTo(4) called by loadProposalFromURL on DOMContentLoaded
    // wait for panel-4 to become active
    await expect(page.locator('#panel-4.active')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 5000 });
  });

  test('proposal banner shown', async ({ page }) => {
    await page.goto(PROPOSAL);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#panel-4.active')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#proposal-banner')).toBeVisible({ timeout: 5000 });
  });

  test('corrupt proposal param falls back to step 1', async ({ page }) => {
    await page.goto('/book.html?proposal=INVALID!!!');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
  });
});
