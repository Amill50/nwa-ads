# NWA Ads — API Documentation

**Last updated:** 2026-06-10

---

## 1. GitHub Contents API

Used by: Admin "Save rates to site" button (`admin.html`)

**Base URL:** `https://api.github.com/repos/Amill50/nwa-ads/contents/{path}`

**Authentication:** Bearer token (GitHub PAT with `repo` scope)

**Required headers:**
```
Authorization: Bearer {token}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

### GET file
Fetch current file content and SHA (required for subsequent PUT).
```
GET /repos/Amill50/nwa-ads/contents/book.html
Response: { sha: string, content: base64string, ... }
```

### PUT file (create or update)
```
PUT /repos/Amill50/nwa-ads/contents/book.html
Body: {
  message: string,     // commit message
  content: string,     // base64-encoded file content
  sha: string,         // current file SHA (required for updates)
  branch: "main"
}
Response: { commit: { sha: string } }
```

**Usage pattern in admin.html:**
```javascript
// 1. Fetch SHA
const meta = await fetch(url, { headers });
const { sha, content } = await meta.json();

// 2. Decode, patch, re-encode
let html = atob(content.replace(/\n/g, ''));
// ... patch html ...
const newContent = btoa(unescape(encodeURIComponent(html)));

// 3. Push
await fetch(url, {
  method: 'PUT',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, content: newContent, sha, branch: 'main' })
});
```

**Token storage:** `localStorage['nwaads_gh_token']`
**Security note:** Token is stored in plain text. Acceptable for internal admin tool only.

---

## 2. Anthropic Messages API

Used by: Prospect Engine (`prospect-engine.html`), Smart Optimizer (`book.html`)

**Endpoint:** `https://api.anthropic.com/v1/messages`
**Method:** POST
**Model:** `claude-sonnet-4-20250514`

**Request:**
```javascript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  messages: [{ role: "user", content: string }]
}
```

**Response:**
```javascript
{
  content: [
    { type: "text", text: string },
    // or { type: "tool_use", ... }
  ]
}
```

**Used for:**
- Smart Optimizer: recommends screens based on goal + budget + inventory
- Prospect Engine: generates research prompts for brand intelligence

---

## 3. Proposal URL Schema

Not an HTTP API — state encoded in URL parameter for shareable campaign links.

**Parameter:** `?proposal={base64}`

**Decoded structure (v1):**
```javascript
{
  v: 1,                    // schema version — increment if structure changes
  goal: string | null,     // "brand" | "traffic" | "walmart" | null
  inc: string,             // "daily" | "weekly" | "monthly"
  qty: number,             // quantity of increments (standard mode)
  budget: number,          // monthly budget in dollars
  schedMode: string,       // "standard" | "custom"
  customDays: number[],    // days of week: 0=Sun, 1=Mon ... 6=Sat
  schedStart: string|null, // ISO date "YYYY-MM-DD"
  schedEnd: string|null,   // ISO date "YYYY-MM-DD"
  customDayCount: number,  // pre-calculated total booked days
  screens: string[],       // array of screen IDs from INV
  created: string          // ISO date "YYYY-MM-DD"
}
```

**Encoding:**
```javascript
const encoded = btoa(JSON.stringify(proposal));
const url = `${window.location.origin}/book.html?proposal=${encoded}`;
```

**Decoding:**
```javascript
const p = JSON.parse(atob(params.get('proposal')));
```

**Versioning:** If the schema changes, increment `v`. The loader should check `p.v` and handle migration.

---

## 4. localStorage API

Internal key-value persistence. No server. Data lives in the user's browser.

| Key | Type | Owner | Description |
|---|---|---|---|
| `nwaads_campaigns` | JSON array | admin.html | Campaign queue — booking requests |
| `nwaads_gh_token` | string | admin.html | GitHub PAT for rate pushes |
| `nwaads_rate_config` | JSON object | admin.html | RATE_CONFIG overrides |

### Campaign object schema
```javascript
{
  id: string,           // "NWA-2026-XXXX"
  status: string,       // "pending" | "creative_review" | "confirmed" | "live"
  submitted: string,    // "YYYY-MM-DD HH:MM"
  name: string,         // advertiser campaign name
  contact: string,
  email: string,
  goal: string,
  screens: string[],    // screen names (display only)
  duration: string,
  total: number,        // estimated campaign value in dollars
  creative: string,     // "pending" | "uploaded" | "approved"
  notes: string
}
```

---

## 5. Lamar Rate Package CSV Format

Used by: Admin "Import CSV" button

**File format:** CSV with CRLF line endings (Excel export)
**Header row:** Row index 5 (0-based) — detected by scanning for "Screen Location" + "City"
**Data rows:** Row 6 onwards

**Column mapping:**
| Index | Header | Notes |
|---|---|---|
| 0 | Screen Location | Used for fuzzy name matching |
| 1 | City | Used for fuzzy name matching |
| 2 | CPM ($) | Often blank — derived if missing |
| 3 | Faces | |
| 4 | Wkly Impr | Weekly impressions |
| 5 | 1 Day | Daily rate |
| 6 | 3 Days | |
| 7 | 1 Week | Weekly rate |
| 8 | 2 Weeks | |
| 9 | 4 Weeks | Primary monthly rate (`mo_rate`) |

**CPM derivation when blank:**
```
CPM = (mo_rate / (wkly_impr × 4)) × 1000
```

**Name matching algorithm:**
1. Score each INV screen against the CSV row
2. City match: +4 points if city string is contained in screen area
3. Word overlap: +1 point per shared word (>2 chars, excluding stopwords)
4. Match threshold: score ≥ 2 required
5. Ties: highest score wins

**Skip rows containing:** `total`, `legend`, `yellow`, `grey`, `rates shown`, `please`
