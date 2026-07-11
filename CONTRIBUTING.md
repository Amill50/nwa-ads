# Contributing to NWA Ads

## Branch strategy

All feature work must follow this pattern:

1. **Create a branch** from `main` in GitHub or Netlify, make changes only to the relevant module file(s), test on the Netlify branch preview URL, then merge to `main` only after confirmed working.
2. **Edit only the relevant module file(s)** — never edit multiple unrelated modules in one PR.
3. **Test locally** against the dev server at `localhost:3000`.
4. **Push the branch** and confirm the Netlify branch preview URL works end-to-end.
5. **Merge to `main` only** after the Netlify preview is confirmed working.

## File structure

```
/book.html          <- shell only — HTML + script/link tags, no JS or CSS
/css/
  book.css          <- all styles (extracted verbatim from book.html)
/js/
  book-state.js     <- ST object and global state
  book-supabase.js  <- Supabase client, auth, campaign DB calls
  book-inventory.js <- INV data, pricing config, card rendering, filtering
  book-ui.js        <- nav bar state, breadcrumb helpers
  book-map.js       <- Leaflet map, pins, overlays, legend
  book-cart.js      <- cart logic, pricing, proposal link generation
  book-flow.js      <- panel navigation, step progression, targeting flow
```

## Rules

- **One module per concern.** If a fix touches cart pricing, edit `book-cart.js` only.
- **No inline script or style in `book.html`.** All code belongs in the module files.
- **Preserve load order.** Scripts in `book.html` load in dependency order — do not reorder them.
- **Zero regressions.** Before merging, walk through the full booking flow (Goal → Details → Setup → Pick Screens → Cart → Creative → Checkout) and confirm no console errors.
- **Never use the heredoc pattern** when pushing files via the GitHub API. Always use the here-string approach to pipe base64 content.

## Regression checklist (run before every merge to main)

- [ ] `book.html` loads with zero console errors
- [ ] Panel 1 (Goal) — all 3 goal cards visible and selectable
- [ ] Panel 2 (Details) — form fields render and accept input
- [ ] Panel 3 (Setup) — budget slider works; sub-intent widget shows for Walmart goal
- [ ] Panel 4 (Pick Screens) — map loads, pins visible, clicking pin opens detail card, legend visible
- [ ] Panel 5 (Cart) — items render with correct icons and pricing
- [ ] Panel 6 (Creative) — page renders correctly
- [ ] Panel 7 (Checkout) — page renders correctly
- [ ] Nav bar — account + cart container correct
- [ ] `https://nwa-ads.com/design-system.html` — all 8 items pass
