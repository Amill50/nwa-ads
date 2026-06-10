# NWA Ads — Change Log

**Format:** `[YYYY-MM-DD] COMMIT — Description`

---

## 2026-06-10

`1700915d42` **Admin: Save rates to site**
- Added "✦ Save rates to site" button to Inventory & Rates toolbar
- Button fetches book.html from GitHub, patches all `editedRates` values (CPM, daily_rate, wkly_rate, mo_rate, wkly_impr) using regex, commits and pushes via GitHub API
- GitHub token prompted on first use, stored in localStorage
- Clears `editedRates` after successful push; logs commit SHA

`12336eaef9` **Fix: Mobile Step 2 screen card overflow (root fix)**
- Removed nested scroll container (`.screen-list-wrap max-height: 280px; overflow-y: auto`) — was causing card bleed outside container on mobile
- Screen list now flows at full height; page scrolls naturally via `.s2-body`
- Disabled `position: sticky` on `.screen-list-label` on mobile — no fixed-height container to stick inside

`9a61532166` **Fix: Mobile Step 2 screen card overlap (first attempt)**
- Added `scroll-padding-top`, bumped `.screen-list-label` z-index to 2
- Did not fully resolve — superseded by `12336eaef9`

---

## 2026-06-08

`da7f70978c` **Fix: Proposal loader — correct INV variable**
- `loadProposalFromURL()` was referencing `INVENTORY` and `INV_DATA` (undefined)
- Inventory array in book.html is named `INV` — corrected all references

`b257adf55f` **Fix: Critical JS crash — duplicate const rl**
- `const rl = document.getElementById('os-rate-label')` was declared twice in the order summary update block
- `SyntaxError` crashed the entire JS module, making the page non-functional
- Removed duplicate; consolidated into single declaration with custom schedule logic

`502d01ab05` **Fix: unitRate custom schedule in wrong function**
- Custom schedule daily×day_count logic was accidentally placed in `unitRateFromPrice()` instead of `unitRate()`
- Moved to correct function

`722d1d805e` **Fix: Custom schedule cart grand total**
- Cart grand total was using `ST.qty` as multiplier even in custom schedule mode
- Added `effQty` — uses 1 in custom mode (total already baked in by `unitRate`), `ST.qty` in standard mode
- Removed hardcoded 10% multi-screen discount from cart, summary modal, and order summary
- Fixed `durLabel()` to return "Mon + Tue · 22 days" in custom mode

`15d8bd6c77` **Rates: Update impression display strings**
- Updated `impr` and `daily_impr_str` display strings for 12 Lamar screens
- Was: "35K+ weekly" for all screens
- Now: actual counts e.g. "223K+ weekly", "343K+ weekly"

`91e826c190` / `0dbc6b4aff` **Rates: Apply Lamar confirmed rate package**
- Applied confirmed rates from `NWAAds_Lamar_Rate_Package-2.csv` to 12 digital billboard screens
- I-49 corridor (9 screens): wkly_rate=$710, mo_rate=$2,580, CPM $2–$4.53
- Walton Blvd / 14th St / SE 14th (3 screens): wkly_rate=$1,190, mo_rate=$4,320, CPM $5–$9

`ceffc4df15` **Fix: Admin CSV import — CRLF + CPM derivation**
- Excel CSVs use `\r\n` — JS was splitting on `\n` only, breaking header detection
- CPM column is blank in Lamar sheet — added derivation: `CPM = (mo_rate / (wkly_impr × 4)) × 1000`

`cb8944c805` **Admin: Lamar Rate Package CSV import**
- `importRatesCSV()` now auto-detects format: Lamar Rate Package vs admin export
- Lamar format: finds header row by scanning for "Screen Location" + "City"
- Fuzzy name matching: score by city overlap + word overlap (threshold ≥ 2)
- Reports matched/skipped/unmatched counts with screen names

`78d435db2a` **Feature: Custom day scheduling + Proposal link**
- Custom days: day-of-week picker, date range, live day count, "Mon + Tue · 11 week window · 22 total ad days" summary
- Pricing: `daily_rate × custom_day_count` when in custom mode
- Proposal link: base64-encodes full cart state into shareable URL
- Recipient view: proposal banner, green CTA strip, "Book this campaign →" scrolls to form
- `loadProposalFromURL()` runs on DOMContentLoaded — restores cart, schedule, and goal

`06c39edbdd` **Admin: Campaign management**
- Campaigns persisted to `localStorage['nwaads_campaigns']`
- Per-row ✕ delete button; ✕ Delete in detail panel
- "Clear test data" removes 6 original dummy campaign IDs
- "Clear all" wipes all with confirm prompt
- `saveCampaigns()` called on every mutation

`010abc3fae` **Brand: admin.html refresh**
- Gate screen: solid forest green bg, frosted glass card
- Topbar: forest green, reversed lockup with icon mark
- Active nav: green highlight (was orange)
- CSS vars aligned to brand system; DM Sans → Instrument Sans

`81df12b255` **Brand: home.html refresh**
- Alias vars `--clay`/`--forest`/`--night` mapped to brand tokens
- Green nav with icon mark; orange CTAs

`4333b4727d` **Brand: book.html refresh**
- Green nav, icon mark, reversed lockup
- Color vars patched; Instrument Sans throughout

`c456440f54` **Brand: index.html refresh**
- Full brand system: green nav, icon mark, Fraunces headlines, Instrument Sans body
- Orange CTAs, warm color tokens throughout

`2b661b2841` **Brand guidelines published**
- `brand-guidelines.html` — full token reference, typography scale, component examples

`f63bac1feb` **Prospect engine: passcode-gated template**
- Replaced API-key version with prompt template generator
- Passcode: `nwaads2026`
- Generates structured Claude prompt for paste into claude.ai with web search
- Queue saves last 20 brands to localStorage

`d9dcc06fe4` **Feature: OOH Prospect Intelligence Engine**
- `prospect-engine.html` — Anthropic API powered prospect research tool

---

## 2026-06-04

`9e395b3241` / `16b2072f99` **Pricing: Daily premium + markup tiers**
- `RATE_CONFIG`: daily_premium=1.10, weekly_premium=1.00, monthly_premium=1.083
- Markup tiers: 20% under $10K, 15% over $10K
- Admin Margin & Rate Settings panel

`8b441cda4a` **Wizard redesign: goal cards + sub-intent pills**
- 3 goal cards with icons and descriptions
- Sub-intent pills per goal
- Strategy copy updated
- Expanded NWA POI database

---

## 2026-06-03

`8f4b3d03fa` **Initial upload**
- Base site files uploaded
