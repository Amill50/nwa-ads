// tests/e2e/admin.spec.js
const { test, expect } = require('@playwright/test');
const ADMIN = '/admin.html';
const PASS = 'nwaads2026';

async function login(page) {
  await page.goto(ADMIN);
  await expect(page.locator('#gate')).toBeVisible();
  // Set value directly on the input element and call checkPw() via JS
  // This bypasses any input event quirks with Playwright fill()
  await page.evaluate((pass) => {
    document.getElementById('gate-pw').value = pass;
    checkPw();
  }, PASS);
  await expect(page.locator('#app')).toBeVisible({ timeout: 8000 });
}

test.describe('Auth', () => {
  test('gate shown on load', async ({ page }) => {
    await page.goto(ADMIN);
    await expect(page.locator('#gate')).toBeVisible();
  });

  test('wrong pass stays locked', async ({ page }) => {
    await page.goto(ADMIN);
    await page.evaluate(() => {
      document.getElementById('gate-pw').value = 'wrongpass';
      checkPw();
    });
    await expect(page.locator('#gate')).toBeVisible();
  });

  test('correct pass shows app', async ({ page }) => {
    await login(page);
    await expect(page.getByText('Campaign queue')).toBeVisible();
  });

  test('topbar is green (#1f3d2a)', async ({ page }) => {
    await login(page);
    await expect(page.locator('.topbar')).toBeVisible();
    const bg = await page.locator('.topbar').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    console.log('Topbar bg:', bg);
    expect(bg).toMatch(/rgb\(31,\s*61,\s*42\)/);
  });
});

test.describe('Campaign Queue', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('clear test data button visible', async ({ page }) => {
    await expect(page.getByText('Clear test data')).toBeVisible();
  });

  test('status filter chips present', async ({ page }) => {
    await expect(page.getByText(/Pending/)).toBeVisible();
    await expect(page.getByText(/Confirmed/)).toBeVisible();
    await expect(page.getByText(/Live/)).toBeVisible();
  });
});

test.describe('Inventory & Rates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText(/Inventory/).first().click();
    await page.waitForTimeout(300);
  });

  test('screen count label visible', async ({ page }) => {
    await expect(page.locator('#inv-count-label')).toBeVisible();
  });

  test('export CSV button visible', async ({ page }) => {
    await expect(page.getByText(/Export/)).toBeVisible();
  });

  test('save rates button visible', async ({ page }) => {
    await expect(page.getByText('Save rates to site')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('all nav items present', async ({ page }) => {
    await expect(page.getByText('Campaign queue')).toBeVisible();
    await expect(page.getByText(/Inventory/)).toBeVisible();
    await expect(page.getByText('Revenue pipeline')).toBeVisible();
    await expect(page.getByText('Pricing manager')).toBeVisible();
    await expect(page.getByText('Sign out')).toBeVisible();
  });
});
