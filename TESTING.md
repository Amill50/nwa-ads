# NWA Ads — Testing Guide

## Overview

The test suite covers the full NWA Ads booking platform with two layers:

| Layer | Files | Tests | Status |
|-------|-------|-------|--------|
| Unit | `tests/unit/` | 60 | ✅ Passing |
| E2E (Playwright) | `tests/e2e/` | 46 | ✅ Passing |

All 106 tests pass in CI across desktop-chrome, mobile-chrome, and mobile-safari.

---

## Running Tests Locally

### Prerequisites

```bash
cd ~/your-nwa-ads-folder
npm install
npx playwright install chromium webkit
```

### Unit Tests

```bash
npm test
```

Covers: pricing calculations, scheduling logic, CSV import with fuzzy matching.

### E2E Tests (against live site)

```bash
npx playwright test --project=desktop-chrome
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari
```

### E2E Tests (against local server)

```bash
TEST_URL=http://localhost:3000 npx playwright test
```

### View HTML Report

```bash
npx playwright show-report
```

---

## Test Structure

### Unit Tests (`tests/unit/`)

| File | What it tests |
|------|---------------|
| `pricing.test.js` | CPM calculations, markup tiers, daily premium, discount logic |
| `scheduling.test.js` | Standard/custom flight day counting, date range validation |
| `csv-import.test.js` | Lamar rate CSV parsing, fuzzy name matching, CPM derivation |

### E2E Tests (`tests/e2e/`)

| File | What it tests |
|------|---------------|
| `smoke.spec.js` | Page loads, goal cards render, screen list renders after goTo(2) |
| `booking-flow.spec.js` | Full 4-step booking wizard: goal → screens → creative → checkout |
| `admin.spec.js` | Admin gate auth, campaign queue, inventory & rates, navigation |
| `proposal.spec.js` | Proposal link generation, base64 round-trip, edge cases |

---

## CI/CD Pipeline

Tests run automatically on every push to `main` via GitHub Actions (`.github/workflows/test.yml`).

**Jobs:**
1. **Unit Tests** — runs first, fast (~10s)
2. **E2E Tests** — runs in parallel across 3 browser projects after unit tests pass

**Configuration:**
- Local runs: tests against `https://nwa-ads.com` by default
- CI runs: tests against a local `http-server` instance on port 3000
- Timeouts: 60s per test, 20s per assertion

---

## Admin Passphrase

The admin console at `/admin.html` uses passphrase: `nwaads2026`

---

## Known Fixes Applied (June 2026)

During test development, two mobile CSS bugs were discovered and fixed:

1. **`admin.html`** — Sidebar was `display:none` on viewports under 900px. Fixed with a horizontal scrollable nav bar.
2. **`book.html`** — Step 4 checkout heading collapsed to 0px on mobile due to `flex-direction` being applied to a `display:grid` container. Fixed by adding `display:flex` to the mobile override rule.
