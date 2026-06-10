// tests/unit/scheduling.test.js
// Unit tests for custom day-of-week scheduling logic
// Mirrors updateCustomSched() from book.html
// Run with: node --test tests/unit/scheduling.test.js

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── Mirror of day-counting logic from book.html ───────────────────────────────

/**
 * Count days in [start, end] range that fall on any of selectedDays
 * @param {string} startStr  - "YYYY-MM-DD"
 * @param {string} endStr    - "YYYY-MM-DD"
 * @param {number[]} days    - 0=Sun, 1=Mon ... 6=Sat
 * @returns {number}
 */
function countCustomDays(startStr, endStr, days) {
  if (!startStr || !endStr || days.length === 0) return 0;
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr   + 'T00:00:00');
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    if (days.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Core acceptance criteria', () => {
  test('Mon+Tue (days 1,2) from 2026-06-23 to 2026-09-07 = 22 days', () => {
    // This was the UAT-confirmed test case from the screenshot
    const count = countCustomDays('2026-06-23', '2026-09-07', [1, 2]);
    assert.equal(count, 22);
  });

  test('Mon only from 2026-06-23 to 2026-09-07 = 11 days', () => {
    const count = countCustomDays('2026-06-23', '2026-09-07', [1]);
    assert.equal(count, 11);
  });
});

describe('Single day edge cases', () => {
  test('Single day: start = end, day selected = 1', () => {
    // 2026-06-22 is a Monday (day 1)
    const count = countCustomDays('2026-06-22', '2026-06-22', [1]);
    assert.equal(count, 1);
  });

  test('Single day: start = end, day NOT selected = 0', () => {
    // 2026-06-22 is Monday, we only select Sunday
    const count = countCustomDays('2026-06-22', '2026-06-22', [0]);
    assert.equal(count, 0);
  });

  test('End before start = 0', () => {
    const count = countCustomDays('2026-09-07', '2026-06-23', [1, 2]);
    assert.equal(count, 0);
  });

  test('No days selected = 0', () => {
    const count = countCustomDays('2026-06-23', '2026-09-07', []);
    assert.equal(count, 0);
  });

  test('No start date = 0', () => {
    const count = countCustomDays(null, '2026-09-07', [1]);
    assert.equal(count, 0);
  });

  test('No end date = 0', () => {
    const count = countCustomDays('2026-06-23', null, [1]);
    assert.equal(count, 0);
  });
});

describe('All days selected', () => {
  test('All 7 days selected over 2-week range = 14', () => {
    const count = countCustomDays('2026-06-15', '2026-06-28', [0,1,2,3,4,5,6]);
    assert.equal(count, 14);
  });

  test('Weekdays only (Mon-Fri) over 2-week range = 10', () => {
    const count = countCustomDays('2026-06-15', '2026-06-28', [1,2,3,4,5]);
    assert.equal(count, 10);
  });

  test('Weekends only (Sat-Sun) over 2-week range = 4', () => {
    const count = countCustomDays('2026-06-15', '2026-06-28', [0,6]);
    assert.equal(count, 4);
  });
});

describe('Longer windows', () => {
  test('Every day from 2026-01-05 to 2026-12-28 = 358', () => {
    // Verified: Jan 5 to Dec 28 inclusive = 358 days (not a full 52 weeks)
    const count = countCustomDays('2026-01-05', '2026-12-28', [0,1,2,3,4,5,6]);
    assert.equal(count, 358);
  });

  test('Every Monday over 52 weeks = 52', () => {
    // 2026-01-05 is a Monday
    const count = countCustomDays('2026-01-05', '2026-12-28', [1]);
    assert.equal(count, 52);
  });
});

describe('Summary line generation', () => {
  test('Summary string format for Mon+Tue', () => {
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const customDays = [1, 2];
    const selected = customDays.map(d => DAY_NAMES[d]).join(' + ');
    assert.equal(selected, 'Mon + Tue');
  });

  test('Summary string format for Mon only', () => {
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const customDays = [1];
    const selected = customDays.map(d => DAY_NAMES[d]).join(' + ');
    assert.equal(selected, 'Mon');
  });

  test('Week window calculation', () => {
    const s = new Date('2026-06-23T00:00:00');
    const e = new Date('2026-09-07T00:00:00');
    const weeks = Math.ceil((e - s) / (7 * 24 * 60 * 60 * 1000));
    assert.equal(weeks, 11);
  });
});
