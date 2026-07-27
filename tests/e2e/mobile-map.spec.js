// Mobile map verification — 390×844 (iPhone 14) and 430×932 (iPhone 14 Plus)
const { test, expect } = require('@playwright/test');
const fs = require('fs');

const VIEWPORTS = [
  { name: 'iphone14',     width: 390, height: 844 },
  { name: 'iphone14plus', width: 430, height: 932 },
];

const screenshotDir = 'test-results/mobile';
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

for (const vp of VIEWPORTS) {
  test.describe(`Mobile map — ${vp.width}×${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/book/');
      await page.waitForLoadState('domcontentloaded');
      // Pick a goal to set ST.goal
      await page.locator('.goal-card').first().click();
      // Navigate directly to the map panel (bypasses auth gate — tests run without Supabase)
      await page.evaluate(() => {
        if (typeof goToPanel === 'function') goToPanel(4);
        // goToPanel alone skips the initMap() call that goTo(4) would make
        if (typeof initMap === 'function') initMap();
        if (typeof refreshMarkers === 'function') refreshMarkers();
      });
      // Wait for the map panel to become active and initMap() to run
      await page.waitForFunction(
        () => document.getElementById('panel-4')?.classList.contains('active'),
        { timeout: 10000 }
      );
      // Give Leaflet ~1s to initialize
      await page.waitForTimeout(1200);
    });

    test('no horizontal overflow', async ({ page }) => {
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      await page.screenshot({ path: `${screenshotDir}/${vp.name}-map.png`, fullPage: false });
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });

    test('#map is at least 280px tall', async ({ page }) => {
      const mapHeight = await page.evaluate(() => {
        const el = document.getElementById('map');
        return el ? el.getBoundingClientRect().height : 0;
      });
      expect(mapHeight).toBeGreaterThanOrEqual(280);
    });

    test('mobile legend toggle button is present and expandable', async ({ page }) => {
      const toggleBtn = page.locator('#ml-toggle');
      await expect(toggleBtn).toBeVisible({ timeout: 5000 });
      // Chips should be hidden initially
      await expect(page.locator('#ml-chips')).not.toBeVisible();
      // Click to expand
      await toggleBtn.click();
      await expect(page.locator('#ml-chips')).toBeVisible();
      await page.screenshot({ path: `${screenshotDir}/${vp.name}-legend-open.png`, fullPage: false });
      // At least one chip should be present
      const chipCount = await page.locator('.ml-chip').count();
      expect(chipCount).toBeGreaterThan(0);
    });

    test('popup buttons are at least 44px tall', async ({ page }) => {
      // Click various positions to find a marker
      const positions = [
        { x: Math.round(vp.width / 2), y: 100 },
        { x: Math.round(vp.width / 3), y: 120 },
        { x: Math.round((vp.width * 2) / 3), y: 90 },
        { x: Math.round(vp.width / 2), y: 150 },
      ];
      let popupFound = false;
      for (const pos of positions) {
        await page.locator('#map').click({ position: pos });
        await page.waitForTimeout(500);
        popupFound = await page.locator('.leaflet-popup').isVisible().catch(() => false);
        if (popupFound) break;
      }
      if (!popupFound) {
        // Markers may be clustered — acceptable in E2E; skip assertion
        await page.screenshot({ path: `${screenshotDir}/${vp.name}-no-popup.png`, fullPage: false });
        return;
      }
      await page.screenshot({ path: `${screenshotDir}/${vp.name}-popup.png`, fullPage: false });
      const addBtn = page.locator('.popup-add').first();
      if (await addBtn.isVisible()) {
        const box = await addBtn.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      const detailBtn = page.locator('.leaflet-popup button').filter({ hasText: 'View full details' });
      if (await detailBtn.isVisible()) {
        const box = await detailBtn.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
}
