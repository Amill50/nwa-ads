# NWA Ads — Test Coverage

**Last updated:** 2026-06-10
**Test runner:** Playwright (E2E) + Node.js built-in test runner (unit)

---

## Test Structure

```
tests/
├── unit/
│   ├── pricing.test.js       — RATE_CONFIG pricing math
│   ├── scheduling.test.js    — Custom schedule day counting
│   └── csv-import.test.js    — Lamar CSV parsing + fuzzy matching
└── e2e/
    ├── booking-flow.spec.js  — Full 4-step booking wizard
    ├── admin.spec.js         — Admin console flows
    └── proposal.spec.js      — Proposal link generation + round-trip
```

---

## Unit Test Coverage

### pricing.test.js

| Test | Status | Description |
|---|---|---|
| daily rate with daily_premium | ✅ | `(mo_rate/28) * 1.10` |
| weekly rate no premium | ✅ | `mo_rate/4 * 1.00` |
| monthly rate with premium | ✅ | `mo_rate * 1.083` |
| markup under $10K | ✅ | 20% markup applied |
| markup over $10K | ✅ | 15% markup applied |
| custom schedule total | ✅ | `daily_with_markup * day_count` |
| cart grand total standard mode | ✅ | `unit_rate * qty` |
| cart grand total custom mode | ✅ | `unit_rate * 1` (total already baked in) |
| zero rate edge case | ✅ | Returns 0, no divide-by-zero |
| fractional CPM rounding | ✅ | `Math.round()` applied correctly |

### scheduling.test.js

| Test | Status | Description |
|---|---|---|
| Mon+Tue over 11 weeks = 22 days | ✅ | Core acceptance criterion |
| Single day over 4 weeks | ✅ | 4 occurrences |
| All days selected = total days in range | ✅ | |
| No days selected = 0 | ✅ | |
| End before start = 0 | ✅ | Edge case |
| Same day start and end | ✅ | 1 day if that DOW selected |
| Leap year boundary | ✅ | Feb 29 counted correctly |
| 52-week window | ✅ | Large range performance |

### csv-import.test.js

| Test | Status | Description |
|---|---|---|
| Detects Lamar format (header at row 5) | ✅ | |
| Detects admin export format (header at row 0) | ✅ | |
| Strips BOM character | ✅ | Excel exports |
| Normalizes CRLF line endings | ✅ | |
| Parses quoted fields with commas | ✅ | e.g. `"I-49 W/S, AT MM 70..."` |
| Strips $ and commas from numbers | ✅ | |
| Derives CPM from mo_rate/wkly_impr when blank | ✅ | Core Lamar fix |
| Fuzzy match: city + word overlap ≥ 2 | ✅ | |
| Skips legend/total/footer rows | ✅ | |
| Reports unmatched screen names | ✅ | |
| Handles empty rows | ✅ | |

---

## E2E Test Coverage

### booking-flow.spec.js

| Test | Viewport | Status | Description |
|---|---|---|---|
| Landing page loads | Desktop | ✅ | Nav, hero, CTA visible |
| Goal card selection | Desktop | ✅ | Card highlights, sub-intents appear |
| Budget slider moves | Desktop | ✅ | Value updates correctly |
| Standard flight: select weekly 4 | Desktop | ✅ | Duration shows "4 weeks" |
| Custom days: Mon+Tue 11 weeks = 22 days | Desktop | ✅ | Summary line correct |
| Map loads with screens | Desktop | ✅ | Markers visible, filters work |
| Add screen to cart | Desktop | ✅ | Cart updates, total shown |
| Cart pricing: custom schedule | Desktop | ✅ | Total = daily×22, not weekly×qty |
| 10% discount NOT applied | Desktop | ✅ | Removed from all surfaces |
| Campaign summary modal | Desktop | ✅ | Shows schedule, no discount row |
| Creative upload step | Desktop | ✅ | Drop zone, skip option |
| Checkout form | Desktop | ✅ | Fields, order summary, proposal section |
| Submit booking | Desktop | ✅ | Confirmation shown |
| Landing page loads | Mobile (390px) | ✅ | Responsive |
| Custom days picker | Mobile | ✅ | Tappable day buttons |
| Screen list no overflow | Mobile | ✅ | Cards don't overlap label |
| Cart scrolls naturally | Mobile | ✅ | No nested scroll conflict |

### admin.spec.js

| Test | Status | Description |
|---|---|---|
| Gate blocks wrong passphrase | ✅ | |
| Gate accepts correct passphrase | ✅ | `nwaads2026` |
| Campaign queue loads from localStorage | ✅ | |
| Delete single campaign | ✅ | Confirm prompt, removes row |
| Clear test data | ✅ | Removes 6 seed IDs only |
| Clear all campaigns | ✅ | Confirm prompt, empties queue |
| Inventory & rates tab loads | ✅ | 82 screens shown |
| Edit CPM inline | ✅ | Field highlights orange |
| Export CSV downloads | ✅ | File triggered |
| Import CSV: Lamar format | ✅ | Rates update, summary alert |
| Import CSV: wrong format | ✅ | Error message shown |

### proposal.spec.js

| Test | Status | Description |
|---|---|---|
| Generate proposal link | ✅ | URL appears with base64 param |
| Copy link button | ✅ | Clipboard write, ✓ confirmation |
| Load proposal URL | ✅ | Jumps to Step 4, cart populated |
| Proposal banner visible | ✅ | Yellow banner at top |
| "Book this campaign" CTA | ✅ | Green strip, scrolls to form |
| Corrupt proposal param | ✅ | Fails gracefully, loads Step 1 |

---

## Regression Test Checklist

Run before every release:

### Booking workflow
- [ ] All 3 goal cards selectable
- [ ] Standard flight duration updates correctly
- [ ] Custom schedule: day count = expected
- [ ] Custom schedule: pricing = daily_rate × day_count
- [ ] Map loads, screens visible
- [ ] Add/remove screens from cart
- [ ] Cart total correct (no 10% auto-discount)
- [ ] Creative upload step accessible, skip works
- [ ] Checkout form submits
- [ ] Proposal link generates and round-trips correctly

### Admin
- [ ] Passphrase gate works
- [ ] Campaign queue loads
- [ ] Campaign delete works
- [ ] Clear test data works
- [ ] Inventory & rates loads all screens
- [ ] CPM edit + save to site pushes to GitHub

### Mobile (390px viewport)
- [ ] All 4 steps reachable
- [ ] Step 2: screen cards don't overflow
- [ ] Custom schedule picker tappable
- [ ] Cart scrolls naturally

### Brand
- [ ] Green nav on all pages
- [ ] Icon mark visible
- [ ] Orange CTAs
- [ ] Fraunces headlines, Instrument Sans body

---

## Running Tests

```bash
# Install dependencies
npm install

# Unit tests
npm test

# E2E tests (requires Playwright)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Specific file
npx playwright test tests/e2e/booking-flow.spec.js
```
