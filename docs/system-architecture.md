# NWA Ads — System Architecture

**Last updated:** 2026-06-10
**Version:** 1.0.0

---

## Overview

NWA Ads is a self-serve OOH (Out-of-Home) advertising marketplace for Northwest Arkansas. It connects local advertisers with digital billboard, gas station, cinema, and airport screen inventory across the Bentonville/Rogers/Fayetteville corridor.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Hosting | Netlify (static) | Auto-deploys from GitHub main branch |
| Source control | GitHub — `Amill50/nwa-ads` | Single-branch (`main`) deploy |
| Frontend | Vanilla HTML/CSS/JS | No framework, no build step |
| Maps | Leaflet.js + CARTO tiles | Loaded via CDN |
| Fonts | Google Fonts | Fraunces (display), Instrument Sans (body), Geist Mono (data) |
| Persistence | Browser localStorage | No backend database |
| Admin auth | Client-side passphrase | `nwaads2026` — stored in sessionStorage |
| Rate config | Hardcoded in `book.html` | `RATE_CONFIG` constant, editable via Admin |
| AI features | Anthropic Claude API | Prospect engine, smart optimizer |
| Payments | Stripe (not yet integrated) | CTAs in place, placeholder flows |
| DNS | Cloudflare | Domain at Namecheap, DNS managed in Cloudflare |
| Email | Google Workspace | `andrew@nwa-ads.com`, MX/SPF/DKIM/DMARC configured |

---

## Pages

| File | Route | Purpose |
|---|---|---|
| `index.html` | `/` | Marketing landing page |
| `home.html` | `/home` | Alternative landing / teaser |
| `book.html` | `/book` | 4-step booking wizard (primary product) |
| `admin.html` | `/admin` | Internal operations console |
| `brand-guidelines.html` | `/brand-guidelines` | Brand system reference |
| `prospect-engine.html` | `/prospect-engine` | AI-powered prospect intelligence tool |

---

## Booking Workflow (`book.html`)

```
Step 1 — Goal & Schedule
  ├── Goal selection (3 cards: Drive traffic / Reach Walmart buyers / Brand)
  ├── Sub-intent pills (varies by goal)
  ├── Budget slider ($500–unlimited)
  └── Duration: Standard flight OR Custom days (day-of-week + date range)

Step 2 — Pick Screens
  ├── Leaflet map with clustered markers
  ├── Format filters (All / Billboard / Gas Station / Airport / Cinema)
  ├── Screen cards with CPM, impressions, daily rate
  ├── Smart Optimizer (AI-assisted screen recommendation)
  └── Campaign cart (real-time pricing)

Step 3 — Creative Upload
  └── Drop zone (JPEG/PNG/PDF/MP4), skip option, spec cards

Step 4 — Checkout
  ├── Contact form (name, company, email, phone)
  ├── Campaign details (start date, goal notes)
  ├── Order summary (custom schedule aware)
  ├── Send as Proposal (base64-encoded shareable URL)
  └── Submit booking request (→ admin queue)
```

---

## Admin Console (`admin.html`)

| Section | Function |
|---|---|
| Campaign Queue | View/manage/advance/delete booking requests. Persisted in localStorage. |
| Inventory & Rates | View all 83 screens, edit CPM inline, import Lamar CSV, save rates to site via GitHub API |
| Revenue Pipeline | Aggregate pipeline value, by-goal and by-status breakdowns |
| Inventory Health | CPM vs benchmark analysis, flag anomalies |
| Pricing Manager | Tier-based CPM config by format type |
| Margin & Rate Settings | `RATE_CONFIG` editor — daily/weekly/monthly premiums, markup tiers |

---

## Data Architecture

### Inventory (`INV` array in `book.html`)

```javascript
{
  id: "loc_595442",          // Unique screen ID (Lamar: loc_XXXXXX, XNA: xna_*, Adomni: loc_XXXXXX)
  name: "I-49 E/S (No)",
  area: "Rogers, AR",
  type: "digital",           // digital | gasstation | cinema | airport
  venue_type: "Digital Billboard",
  cpm: 4.12,                 // CPM in dollars
  faces: 1,
  wkly_impr: 156374,         // Weekly verified impressions
  daily_rate: 101,           // Pre-markup daily cost
  wkly_rate: 710,            // Pre-markup weekly cost
  mo_rate: 2580,             // Pre-markup 4-week cost (primary rate)
  icon: "🛣",
  video: "N",
  audio: "N",
  spec_res: "1400×400 px",
  spec_dur: "8s",
  image_url: "https://..."
}
```

### Rate Config (`RATE_CONFIG` in `book.html`)

```javascript
{
  daily_premium:    1.10,   // +10% for daily buys vs 4-week rate
  weekly_premium:   1.00,   // no premium on weekly
  monthly_premium:  1.083,  // +8.3% for 30-day
  markup_under_10k: 0.20,   // 20% markup on campaigns under $10K
  markup_over_10k:  0.15,   // 15% markup on campaigns $10K+
}
```

### Pricing Formula

```
unit_cost   = mo_rate / 28 * daily_premium          (for daily increment)
unit_cost   = mo_rate / 4  * weekly_premium         (for weekly)
unit_cost   = mo_rate      * monthly_premium        (for monthly)
markup      = unit_cost * markup_under_10k (or _over_10k)
displayed   = unit_cost + markup
```

For custom schedules:
```
total = (mo_rate / 28 * daily_premium * markup_rate) * custom_day_count
```

### localStorage Schema

| Key | Owner | Contents |
|---|---|---|
| `nwaads_campaigns` | admin.html | JSON array of campaign objects |
| `nwaads_gh_token` | admin.html | GitHub PAT for rate pushes (sensitive) |
| `nwaads_rate_config` | admin.html | Overridden RATE_CONFIG values |

---

## Proposal Link System

Proposal state is encoded as base64 JSON in the URL parameter `?proposal=`:

```javascript
{
  v: 1,                        // schema version
  goal: "brand",
  inc: "weekly",
  qty: 2,
  budget: 2000,
  schedMode: "custom",         // "standard" | "custom"
  customDays: [1, 2],          // 0=Sun, 1=Mon ... 6=Sat
  schedStart: "2026-06-23",
  schedEnd: "2026-09-07",
  customDayCount: 22,
  screens: ["loc_595442"],     // array of screen IDs
  created: "2026-06-08"
}
```

---

## GitHub API Push Pattern

Used by Admin "Save rates to site" to update `book.html` directly:

```
1. GET  /repos/Amill50/nwa-ads/contents/book.html  → fetch current SHA + content
2. Decode base64 content → patch rate fields via regex
3. PUT  /repos/Amill50/nwa-ads/contents/book.html  → push with SHA + commit message
4. Netlify detects push → auto-deploys in ~30 seconds
```

Token stored in `localStorage['nwaads_gh_token']`. Requires `repo` scope.

---

## Deployment Pipeline

```
Developer / Admin → GitHub (main branch) → Netlify webhook → Build → Deploy → nwa-ads.com
                                                              (~30s)
```

No build step. Netlify serves static files directly.

---

## Brand System

| Token | Value | Usage |
|---|---|---|
| `--green` | `#1f3d2a` | Primary brand, nav, CTAs |
| `--green-m` | `#2d5a3d` | Hover states |
| `--green-d` | `#163020` | Dark variant |
| `--green-l` | `#eaf2ec` | Light backgrounds |
| `--orange` | `#c8440a` | Accent, prices, CTAs |
| `--orange-r` | `#f0905a` | Reversed/light contexts |
| `--gold` | `#9a7b00` | Callout highlights |
| `--ink` | `#0e1a0e` | Body text |
| `--cream` | `#fffef9` | Page background |
| `--muted` | `#7a7570` | Secondary text |

Fonts: `Fraunces` (headlines), `Instrument Sans` (body/UI), `Geist Mono` (data/code)

---

## Known Constraints

1. **No backend** — all state is client-side. No server-side validation, no database, no auth system beyond the passphrase gate.
2. **No payment processing** — Stripe CTAs are placeholders. Booking requests are manual fulfilment via email.
3. **Single-page HTML files** — each page is one large HTML file with embedded CSS and JS. No module system, no bundler.
4. **GitHub token in localStorage** — the admin GitHub PAT is stored unencrypted in browser localStorage. Acceptable for internal single-user tool but should be moved to a backend proxy when the platform scales.
5. **Rate changes require GitHub push** — there is no CMS or database. Rate updates go via the GitHub API and require a deploy cycle.
6. **No error monitoring** — no Sentry/LogRocket. The admin `log()` function is the only observability layer.
