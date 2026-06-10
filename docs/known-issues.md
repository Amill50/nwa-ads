# NWA Ads — Known Issues

**Last updated:** 2026-06-10

Severity levels: **Critical** | **High** | **Medium** | **Low**

---

## Open Issues

### MEDIUM — GitHub token stored in localStorage
**File:** `admin.html`
**Description:** The GitHub PAT used by "Save rates to site" is stored in `localStorage['nwaads_gh_token']` in plain text. Any XSS vulnerability or browser extension with storage access could read it.
**Impact:** Admin-only tool, single user. Acceptable risk at current scale.
**Mitigation plan:** Move to a serverless proxy function (Netlify Function) when platform scales beyond internal use.
**Status:** Open — deferred

---

### MEDIUM — Admin passphrase is client-side only
**File:** `admin.html`
**Description:** The admin gate passphrase (`nwaads2026`) is hardcoded in client-side JS. It can be bypassed by inspecting source or calling `unlock()` from the console.
**Impact:** Admin-only tool. No sensitive financial data stored server-side so risk is limited to viewing/editing internal config.
**Mitigation plan:** Implement Netlify Identity or a backend auth layer when the platform goes to multi-user.
**Status:** Open — deferred

---

### MEDIUM — Stripe integration not implemented
**File:** `book.html`
**Description:** All payment CTAs are placeholder text ("coming soon"). Booking requests are manually fulfilled by email.
**Impact:** No revenue processing capability. All bookings require manual follow-up.
**Status:** Open — next major milestone

---

### MEDIUM — No error monitoring
**Files:** All pages
**Description:** No Sentry, LogRocket, or equivalent. The admin `log()` function writes to an in-page console visible only while admin session is active.
**Impact:** Production errors are invisible unless the user reports them.
**Mitigation plan:** Add a lightweight error boundary that catches uncaught exceptions and writes to localStorage, surfaced in admin console.
**Status:** Open — planned

---

### LOW — `book.html` is 343KB single file
**File:** `book.html`
**Description:** All HTML, CSS, JS, and the full 83-screen inventory JSON are in one file. Load time is acceptable (~1.1s on 4G) but will degrade as inventory grows.
**Impact:** Low now, high at 200+ screens.
**Mitigation plan:** Extract `INV` array to a separate `inventory.json` fetched on page load when file exceeds 500KB.
**Status:** Open — deferred

---

### LOW — Mobile: goal card not pre-selected on proposal load
**File:** `book.html`
**Description:** When loading a proposal URL, the cart and schedule restore correctly but the goal card visual selection state doesn't highlight.
**Impact:** Cosmetic only — the goal value is correctly stored in `ST.goal`.
**Status:** Open — low priority

---

### LOW — `35K+ weekly` impression placeholder remains on non-Lamar screens
**File:** `book.html`
**Description:** Screens not in the Lamar rate package (Siloam Springs, Farmington, Huntsville area billboards) still show `35K+ weekly` as a placeholder impression figure.
**Impact:** CPM displayed to advertiser may be inaccurate for these screens.
**Mitigation plan:** Flag these screens visually in the booking tool as "impressions estimated" until verified data is available.
**Status:** Open — needs Lamar data

---

## Resolved Issues

| Date | Severity | Description | Commit |
|---|---|---|---|
| 2026-06-10 | High | Mobile Step 2: screen card overlapping "AVAILABLE SCREENS" label due to nested scroll container conflict | `12336eaef9` |
| 2026-06-10 | High | Admin: "Save rates" only exported CSV, did not push changes to book.html | `1700915d42` |
| 2026-06-08 | Critical | `SyntaxError: Identifier 'rl' has already been declared` — duplicate `const rl` crashed ALL JS on book.html | `b257adf55f` |
| 2026-06-08 | High | Proposal loader used `INVENTORY`/`INV_DATA` variable names — correct name is `INV` | `da7f70978c` |
| 2026-06-08 | High | Custom schedule: `unitRate()` was applying custom logic in `unitRateFromPrice()` wrong function | `502d01ab05` |
| 2026-06-08 | High | Custom schedule: cart grand total still multiplied by `ST.qty` instead of using `customDayCount` | `722d1d805e` |
| 2026-06-08 | Medium | Admin CSV import: CRLF line endings from Excel broke header row detection | `ceffc4df15` |
| 2026-06-08 | Medium | Admin CSV import: CPM column blank in Lamar sheet — needed derivation from mo_rate/impressions | `ceffc4df15` |
| 2026-06-08 | Medium | Mobile Step 2: first fix (sticky label z-index) did not resolve card overflow | `9a61532166` |
