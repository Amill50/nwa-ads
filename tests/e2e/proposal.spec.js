// tests/e2e/proposal.spec.js
const { test, expect } = require('@playwright/test');
const URL = '/book.html';
const VALID = '/book.html?proposal=eyJ2IjoxLCJnb2FsIjpudWxsLCJpbmMiOiJ3ZWVrbHkiLCJxdHkiOjIsImJ1ZGdldCI6MjAwMCwic2NoZWRNb2RlIjoiY3VzdG9tIiwiY3VzdG9tRGF5cyI6WzEsMl0sInNjaGVkU3RhcnQiOiIyMDI2LTA2LTIzIiwic2NoZWRFbmQiOiIyMDI2LTA5LTA3IiwiY3VzdG9tRGF5Q291bnQiOjIyLCJzY3JlZW5zIjpbImxvY18yMzc1MzYiXSwiY3JlYXRlZCI6IjIwMjYtMDYtMDgifQ==';

async function checkout(page) {
  page.on('pageerror', e => console.log('JS ERROR:', e.message));
  await page.goto(URL);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.goal-card').first().click();
  await page.locator('.btn-next').first().click();
  await expect(page.locator('.sc-add-btn').first()).toBeVisible({ timeout: 15000 });
  await page.locator('.sc-add-btn').first().click();
  await page.locator('#btn-s2').click();
  await expect(page.locator('.summary-modal-title')).toBeVisible({ timeout: 8000 });
  await page.getByText(/Looks good/).click();
  await page.locator('#btn-s3-continue').click();
  await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 8000 });
}

test.describe('Proposal Generation', () => {
  test('proposal section on checkout', async ({ page }) => {
    await checkout(page);
    await page.locator('.proposal-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.proposal-section')).toBeVisible();
  });

  test('generate link produces ?proposal= URL', async ({ page }) => {
    await checkout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const val = await page.locator('#proposal-link-input').inputValue();
    expect(val).toContain('?proposal=');
  });

  test('generated URL is valid base64 JSON with screens', async ({ page }) => {
    await checkout(page);
    await page.locator('.btn-gen-proposal').scrollIntoViewIfNeeded();
    await page.locator('.btn-gen-proposal').click();
    const url = await page.locator('#proposal-link-input').inputValue();
    const encoded = url.split('?proposal=')[1];
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString());
    expect(decoded.v).toBe(1);
    expect(decoded.screens.length).toBeGreaterThan(0);
  });
});

test.describe('Proposal Round-trip', () => {
  test('loads to checkout', async ({ page }) => {
    page.on('pageerror', e => console.log('JS ERROR:', e.message));
    await page.goto(VALID);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#panel-4.active')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Almost live.')).toBeVisible({ timeout: 5000 });
  });

  test('proposal banner shown', async ({ page }) => {
    await page.goto(VALID);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#panel-4.active')).toBeVisible({ timeout: 15000 });
    // Banner uses classList.add('visible') not display — check for class
    await expect(page.locator('#proposal-banner.visible')).toBeVisible({ timeout: 5000 });
  });

  test('CTA with Book button shown', async ({ page }) => {
    await page.goto(VALID);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#panel-4.active')).toBeVisible({ timeout: 15000 });
    // CTA uses classList.add('visible') 
    await expect(page.locator('#proposal-cta.visible')).toBeVisible({ timeout: 5000 });
  });

  test('order total is non-zero', async ({ page }) => {
    await page.goto(VALID);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#panel-4.active')).toBeVisible({ timeout: 15000 });
    const total = await page.locator('#os-grand').textContent();
    expect(total).not.toBe('$0');
  });
});

test.describe('Edge Cases', () => {
  test('corrupt proposal falls back to step 1', async ({ page }) => {
    await page.goto(URL + '?proposal=INVALID!!!');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#proposal-banner')).not.toBeVisible();
  });

  test('no proposal param shows step 1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByText("What's your")).toBeVisible({ timeout: 8000 });
  });
});
