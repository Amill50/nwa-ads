# NWA Ads — Contributing Guidelines

Every change to this repo must follow these rules. No exceptions.

---

## 1. Mandatory first step on every session

Before writing a single line of code, open and read:

```
https://nwa-ads.com/design-system.html
```

This is the canonical reference for every component, color, font, shadow,
border-radius, and layout in the codebase. If it's not in the design system,
don't change it unless explicitly instructed.

---

## 2. Branch for everything — never push directly to main

```bash
# Start every task like this
git checkout main
git pull
git checkout -b feature/[short-description]

# Examples
git checkout -b feature/pin-click-fix
git checkout -b feature/proposal-link
git checkout -b bug/nav-container-overflow
```

**Main branch is locked.** All changes go through a branch and are only
merged after the full checklist passes.

---

## 3. One workstream per branch per push

- One branch = one logical change
- Never combine unrelated fixes in the same branch
- If you find a bug while working on a feature, note it — don't fix it in
  the same branch. Open a new branch for the bug fix.

---

## 4. Only touch files named in the prompt

If the prompt says "fix the cart pill in `book-cart.js`" — only touch
`book-cart.js`. Do not "clean up" adjacent code, adjust unrelated styles,
or refactor anything not explicitly mentioned.

**Files you must never modify unless explicitly told to:**
- `design-system.html`
- `css/book.css` (structure/tokens only — no value changes)
- `js/book-state.js` (ST schema only)
- `netlify.toml`
- `scripts/build-check.js`
- `CONTRIBUTING.md`
- `venue_photos/` (any file)

---

## 5. Module file ownership — what goes where

| File | Owns |
|------|------|
| `js/book-state.js` | ST object, setState(), reactive updates |
| `js/book-supabase.js` | All Supabase client calls, auth, DB reads/writes |
| `js/book-inventory.js` | INV array, card rendering, filtering, distance calc |
| `js/book-map.js` | Leaflet init, makeIcon(), markers, overlays, toggles |
| `js/book-cart.js` | Cart add/remove, pricing, proposal link generation |
| `js/book-ui.js` | Nav bar, breadcrumb, account container, zone pills |
| `js/book-flow.js` | Panel navigation, step progression, Continue handlers |
| `css/book.css` | All styles — copy verbatim, never modify values |

---

## 6. Mandatory pre-push checklist — all 10 must pass

Screenshot evidence required for each before merging to main:

- [ ] `book.html` loads with zero console errors
- [ ] Panel-1 Goal — all 3 goal cards visible and selectable
- [ ] Panel-2 Details — form fields render and accept input
- [ ] Panel-3 Setup — budget slider works, sub-intent widget shows for Walmart goal
- [ ] Panel-4 Pick Screens — map loads, all pins clickable, legend not cut off
- [ ] Panel-5 Cart — items render with correct icons and pricing
- [ ] Panel-6 Creative — page renders correctly
- [ ] Panel-7 Checkout — page renders correctly
- [ ] Nav bar — account+cart container correct, no A/F/M/W, no Walmart pill
- [ ] Design system regression check — all 8 items at `https://nwa-ads.com/design-system.html` pass

**Do not merge to main until all 10 pass.**

---

## 7. Standard Replit prompt opening line

Every prompt sent to Replit must begin with exactly this:

> "Read `https://nwa-ads.com/design-system.html` first. Only modify files
> explicitly named in this prompt. Create a branch named
> `feature/[description]`. Do not merge to main until all 10 checklist
> items in `CONTRIBUTING.md` pass."

---

## 8. Commit message format

```
[type]: [short description]

Types: Feature | Bug Fix | Refactor | Chore | Hotfix
```

Examples:
```
Feature: proposal link generation in book-cart.js
Bug Fix: pin click handlers — pointer-events and closure scope
Refactor: split book.html into JS/CSS modules
Hotfix: restore book.html after syntax error in book-map.js
```

---

## 9. What to do when the site goes down

1. Do NOT push more code to fix it
2. Check Netlify deploy logs first — build-check.js will show the exact error
3. If it's a syntax error: fix only that line, push hotfix branch, merge immediately
4. If it's a Netlify config issue: check `netlify.toml`
5. As a last resort: revert to the last known good commit
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 10. Branch protection rules (GitHub)

Main branch requires:
- Pull request before merging
- At least 1 passing status check (build-check.js via Netlify)
- No direct pushes

Set this up at:
`https://github.com/Amill50/nwa-ads/settings/branches`

---

*Last updated: July 11, 2026*
