// tests/e2e/admin.spec.js
// Admin is behind Supabase magic-link auth — CI tests cover the gate UI only.
// Full admin functionality tests require a signed-in session and are run manually.
const { test, expect } = require('@playwright/test');
const ADMIN = '/admin/';

test.describe('Auth gate', () => {
  test('gate shown on load at /admin/', async ({ page }) => {
    await page.goto(ADMIN);
    await expect(page.locator('#gate')).toBeVisible();
    await expect(page.locator('#app')).not.toBeVisible();
  });

  test('gate has email input (not passphrase)', async ({ page }) => {
    await page.goto(ADMIN);
    await expect(page.locator('#gate-email')).toBeVisible();
    await expect(page.locator('input[type="password"]')).not.toBeVisible();
  });

  test('invalid email shows error', async ({ page }) => {
    await page.goto(ADMIN);
    await page.locator('#gate-email').fill('notanemail');
    await page.locator('.gate-btn').click();
    await expect(page.locator('#gate-error')).toBeVisible();
    await expect(page.locator('#gate')).toBeVisible();
  });

  test('non-allowlisted email shows error', async ({ page }) => {
    await page.goto(ADMIN);
    await page.locator('#gate-email').fill('stranger@example.com');
    await page.locator('.gate-btn').click();
    await expect(page.locator('#gate-error')).toBeVisible();
    await expect(page.locator('#gate')).toBeVisible();
  });

  test('/admin.html redirects to /admin/', async ({ page }) => {
    const res = await page.goto('/admin.html');
    expect(page.url()).toContain('/admin/');
  });
});
