// tests/e2e/smoke.spec.js
// Diagnostic smoke test — logs actual DOM state to identify failures

const { test, expect } = require('@playwright/test');
const BOOK_URL = '/book.html';

test('SMOKE: page title', async ({ page }) => {
  await page.goto(BOOK_URL);
  await page.waitForLoadState('domcontentloaded');
  const title = await page.title();
  console.log('PAGE TITLE:', title);
  await expect(page).toHaveTitle(/NWA Ads/);
});

test('SMOKE: goal cards present', async ({ page }) => {
  await page.goto(BOOK_URL);
  await page.waitForLoadState('domcontentloaded');
  const count = await page.locator('.goal-card').count();
  console.log('GOAL CARD COUNT:', count);
  expect(count).toBe(3);
});

test('SMOKE: navigate to step 2 and check DOM', async ({ page }) => {
  await page.goto(BOOK_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.goal-card').first().click();
  await page.locator('.btn-next').first().click();
  
  // Wait a bit and log what's visible
  await page.waitForTimeout(3000);
  
  const mapVisible = await page.locator('#map').isVisible();
  const panelActive = await page.locator('#panel-2.active').count();
  const screenContent = await page.locator('#tab-screens-content').innerHTML();
  const addBtnCount = await page.locator('.sc-add-btn').count();
  
  console.log('MAP VISIBLE:', mapVisible);
  console.log('PANEL-2 ACTIVE COUNT:', panelActive);
  console.log('TAB-SCREENS-CONTENT innerHTML length:', screenContent.length);
  console.log('SC-ADD-BTN COUNT:', addBtnCount);
  console.log('First 200 chars of screen content:', screenContent.substring(0, 200));
  
  expect(mapVisible).toBe(true);
  expect(addBtnCount).toBeGreaterThan(0);
});
