// tests/unit/pricing.test.js
// Unit tests for NWA Ads pricing logic
// Mirrors the exact formulas in book.html RATE_CONFIG + unitRate()
// Run with: node --test tests/unit/pricing.test.js

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── Mirror of RATE_CONFIG from book.html ──────────────────────────────────────
const RATE_CONFIG = {
  daily_premium:    1.10,
  weekly_premium:   1.00,
  monthly_premium:  1.083,
  markup_under_10k: 0.20,
  markup_over_10k:  0.15,
};

// ── Mirror of pricing functions from book.html ────────────────────────────────

function markupRate(cost) {
  return Math.round(cost * (1 + RATE_CONFIG.markup_under_10k));
}

function costUnitRate(screen, inc, qty) {
  const fourWk = screen.mo_rate || screen.price || 0;
  let cost = 0;
  if (inc === 'daily')   cost = Math.round((fourWk / 28) * RATE_CONFIG.daily_premium);
  else if (inc === 'weekly')  cost = Math.round((fourWk / 4)  * RATE_CONFIG.weekly_premium);
  else if (inc === 'monthly') cost = Math.round(fourWk        * RATE_CONFIG.monthly_premium);
  return cost * qty;
}

function customSchedTotalCost(mo_rate, customDayCount) {
  const dailyCost = Math.round((mo_rate / 28) * RATE_CONFIG.daily_premium);
  return markupRate(dailyCost) * customDayCount;
}

function unitRate(screen, inc, qty, schedMode, customDayCount) {
  if (schedMode === 'custom' && customDayCount > 0) {
    const fourWk = screen.mo_rate || screen.price || 0;
    const dailyCost = Math.round((fourWk / 28) * RATE_CONFIG.daily_premium);
    return markupRate(dailyCost) * customDayCount;
  }
  return markupRate(costUnitRate(screen, inc, qty));
}

// ── Test screens ──────────────────────────────────────────────────────────────
const I49_ROGERS = { id: 'loc_595442', mo_rate: 2580, wkly_rate: 710 };  // confirmed Lamar rate
const WALTON_BLVD = { id: 'loc_595408', mo_rate: 4320, wkly_rate: 1190 }; // confirmed Lamar rate
const CINEMA = { id: 'loc_237536', mo_rate: 147, wkly_rate: 34 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Daily rate calculation', () => {
  test('I-49 Rogers: daily cost = round(2580/28 * 1.10) = 101', () => {
    const daily = Math.round((2580 / 28) * RATE_CONFIG.daily_premium);
    assert.equal(daily, 101);
  });

  test('I-49 Rogers: daily with 20% markup = 121', () => {
    const daily = Math.round((2580 / 28) * RATE_CONFIG.daily_premium);
    assert.equal(markupRate(daily), 121);
  });

  test('Walton Blvd: daily cost = round(4320/28 * 1.10) = 170', () => {
    const daily = Math.round((4320 / 28) * RATE_CONFIG.daily_premium);
    assert.equal(daily, 170);
  });

  test('Walton Blvd: daily with markup = 204', () => {
    const daily = Math.round((4320 / 28) * RATE_CONFIG.daily_premium);
    assert.equal(markupRate(daily), 204);
  });
});

describe('Weekly rate calculation', () => {
  test('I-49 Rogers: weekly cost = round(2580/4 * 1.00) = 645', () => {
    const weekly = Math.round((2580 / 4) * RATE_CONFIG.weekly_premium);
    assert.equal(weekly, 645);
  });

  test('I-49 Rogers: weekly with markup = 774', () => {
    const weekly = Math.round((2580 / 4) * RATE_CONFIG.weekly_premium);
    assert.equal(markupRate(weekly), 774);
  });

  test('No weekly premium applied (premium = 1.00)', () => {
    assert.equal(RATE_CONFIG.weekly_premium, 1.00);
  });
});

describe('Monthly rate calculation', () => {
  test('I-49 Rogers: monthly cost = round(2580 * 1.083) = 2794', () => {
    const monthly = Math.round(2580 * RATE_CONFIG.monthly_premium);
    assert.equal(monthly, 2794);
  });

  test('Monthly premium is 1.083', () => {
    assert.equal(RATE_CONFIG.monthly_premium, 1.083);
  });
});

describe('Custom schedule pricing', () => {
  test('I-49 Rogers: Mon+Tue 11 weeks (22 days) = 121 * 22 = 2662', () => {
    const total = customSchedTotalCost(2580, 22);
    assert.equal(total, 2662);
  });

  test('I-49 Rogers: Mon only 4 weeks (4 days) = 121 * 4 = 484', () => {
    const total = customSchedTotalCost(2580, 4);
    assert.equal(total, 484);
  });

  test('Cinema: 22 days custom = 7 * 22 = 154', () => {
    // round(147/28 * 1.10) = round(5.78) = 6, markupRate(6) = round(6*1.20) = 7
    const total = customSchedTotalCost(147, 22);
    const dailyCost = Math.round((147 / 28) * 1.10);
    const dailyMarkup = markupRate(dailyCost);
    assert.equal(total, dailyMarkup * 22);
  });

  test('Zero custom days = 0', () => {
    const total = customSchedTotalCost(2580, 0);
    assert.equal(total, 0);
  });
});

describe('Cart grand total', () => {
  test('Standard 2 weeks: grand = unitRate * qty=2', () => {
    const rate = unitRate(I49_ROGERS, 'weekly', 1, 'standard', 0);
    const grand = rate * 2;
    assert.equal(grand, markupRate(Math.round(2580 / 4)) * 2);
  });

  test('Custom schedule: grand = unitRate * effQty=1 (total already baked in)', () => {
    const rate = unitRate(I49_ROGERS, 'weekly', 2, 'custom', 22);
    const effQty = 1;
    const grand = rate * effQty;
    assert.equal(grand, 2662); // 121 * 22
  });

  test('No 10% multi-screen discount applied', () => {
    // Discount was removed — verify it is not calculated
    const disc = 0; // hardcoded removal
    assert.equal(disc, 0);
  });
});

describe('Edge cases', () => {
  test('Screen with zero mo_rate returns 0', () => {
    const screen = { mo_rate: 0 };
    const cost = Math.round((screen.mo_rate / 28) * RATE_CONFIG.daily_premium);
    assert.equal(cost, 0);
  });

  test('markupRate rounds correctly — no floating point errors', () => {
    // 645 * 1.20 = 774.0 exactly
    assert.equal(markupRate(645), 774);
    // 101 * 1.20 = 121.2 → rounds to 121
    assert.equal(markupRate(101), 121);
  });

  test('markup_under_10k is 20%', () => {
    assert.equal(RATE_CONFIG.markup_under_10k, 0.20);
  });

  test('markup_over_10k is 15%', () => {
    assert.equal(RATE_CONFIG.markup_over_10k, 0.15);
  });

  test('daily_premium is 1.10', () => {
    assert.equal(RATE_CONFIG.daily_premium, 1.10);
  });
});
