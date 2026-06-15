// tests/e2e/smoke.spec.js
// Minimal smoke — 3 facts that must be true for book.html to work at all

const { test, expect } = require('@playwright/test');

test('book.html loads', async ({ page }) => {
  const res = await page.goto('/book.html');
  expect(res.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/NWA Ads/);
});

test('goal cards render in DOM', async ({ page }) => {
  await page.goto('/book.html');
  await page.waitForLoadState('domcontentloaded');
  // Log any JS errors
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  const count = await page.locator('.goal-card').count();
  console.log('goal-card count:', count);
  expect(count).toBe(3);
});

test('screen list renders after goTo(2)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text()); });

  await page.goto('/book.html');
  await page.waitForLoadState('domcontentloaded');

  // Click first goal card then advance
  await page.locator('.goal-card').first().click();
  await page.locator('.btn-next').first().click();

  // Wait up to 10s for sc-add-btn to appear (renderList runs in goTo(2))
  await expect(page.locator('.sc-add-btn').first()).toBeVisible({ timeout: 10000 });

  // Log what we got
  const count = await page.locator('.sc-add-btn').count();
  console.log('sc-add-btn count:', count);
  console.log('JS errors:', errors);
});
