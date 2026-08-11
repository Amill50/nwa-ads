# UX Audit — "Your package on the map" (Step 4)
**File audited:** `reach-walmart-buyers-packages-flow.html`
**Reviewer stance:** senior UX designer, interactive maps & location products
**Benchmark set:** Google Maps, Airbnb, Zillow, Transit, Uber

This is a critical audit, not a validation pass. Findings are graded by severity and, where possible, backed by numbers pulled directly from the code (contrast ratios, pixel sizes, coordinate collisions) rather than impressions.

---

## Executive summary

The current Step 4 experience is not an interactive map — it's a static, server-rendered-looking SVG diagram with no hover, click, focus, zoom, or pan behavior anywhere. That's a legitimate design choice for reliability (it replaced a Leaflet map that failed to load for the user), but it was evaluated here as if it were a map product, per the brief, and against that bar it under-delivers on nearly every dimension: it hides real data (multiple devices literally stack on identical coordinates and render as one dot), it has a broken CSS binding that leaves the single most important stat row unstyled, it collapses three distinct asset types into one indistinguishable blue hue, and it has zero keyboard accessibility on its primary selection controls. None of this is visible in the "ideal" 3-6 device screenshots we validated it against earlier — it only shows up once you stress-test with Package 3/4's 14-18 devices, several of which share exact GPS coordinates.

**Severity breakdown:** 3 critical (data-hiding/broken), 6 high, 7 medium, 4 low.

---

## Critical severity

### C1. Overlapping devices at identical coordinates render as a single dot — data silently disappears
Package 2/3/4 contain multiple physical devices that share the **exact same lat/lng** because they're two faces of the same billboard structure, or (for Package 4) all four XNA airport gate screens:

- `14th & S. Walton (N face)` / `(S face)` → both `36.35672137, -94.21256944`
- `401 SE Walton (W face)` / `(E face)` → both `36.33566111, -94.20545833`
- `1080 SE 14th St (W face)` / `(E face)` → both `36.35646027, -94.19786173`
- All four XNA gate screens (`2422408`, `2422857`, `2421754`, `2423021`) → all `36.278333, -94.306111`

The renderer (`buildStaticMapSVG`) draws one `<circle r="6">` per device with no de-duplication or offset logic, so these draw perfectly on top of each other. In Package 4, **4 of ~18 devices (the entire airport line item) are visually represented by a single dot** — a buyer scanning the map would have no idea 4 separate gate screens exist there. This is the map actively contradicting the "What's included" list right below it. Any mapping product — Google Maps, Airbnb, Zillow — offsets or clusters coincident pins specifically to prevent this. Here nothing does.

### C2. `.mapstatrow` / `.mapstat` CSS classes don't exist — the headline stats render unstyled
The HTML (`<div class="mapstatrow" id="mapStatRow">`) and the JS (`renderMapStats()`, which builds `<div class="mapstat">...`) both reference these two classes. Neither is defined anywhere in the `<style>` block — confirmed by a full-text search of the stylesheet. The three numbers this row is supposed to surface — **device count, average distance to a Walmart target, and monthly price** — are arguably the most decision-relevant content on the entire panel, and they currently render as three plain stacked `<div>`s with no grid layout, no pill background, no size hierarchy between the number and its label. This is a functional regression, not a matter of taste.

### C3. Two distinct asset types are visually identical — `Retail screen` and `In-store screen` share one hex value
`TYPE_STYLE` maps both `'Retail screen'` and `'In-store screen'` to `#4f46e5`. This isn't a "hard to tell apart at small size" problem, it's a literal 1:1 color collision baked into the data — the map cannot distinguish these two categories under any zoom or lighting condition because the code never gave them different colors.

---

## High severity

### H1. No hover, selected, active, or focus states exist for any marker
There is no mouseover/mouseenter handler, no `:hover` rule, no "selected" class, and no keyboard focus handling anywhere in the map code — because markers aren't interactive elements at all, just static SVG shapes injected via `innerHTML`. Every benchmark product treats a pin as a first-class stateful object (Google Maps: hover raises + shows a tooltip; Airbnb: hovering a listing card highlights its pin and vice versa; Zillow: clicking a pin opens a summary card). Here, nothing happens when you interact with a marker, because you can't — there's no listener to interact with.

### H2. Marker hit targets are far below usable size, and there's no hit-area padding
Device markers are drawn at `r="6"` and POI markers at `r="13–15"` **in the SVG's 1040×460 viewBox coordinate space**, not in rendered pixels. Since the SVG scales to `width:100%` inside a content column that's roughly 550–600px wide on a typical laptop (the `.frame` sits inside a 1180px-max page with 28px panel padding), the effective scale factor is ~0.53–0.58×. A `r="6"` device dot renders at roughly **6–7px actual diameter** on a laptop, and proportionally smaller on a phone. Apple HIG and Google Material both specify a 44×44pt / 48×48dp minimum touch target; even the desktop mouse-hit convention (WCAG 2.5.5, 24×24 CSS px) isn't met. This matters more once interactivity is added (see H1) — right now it's moot because nothing is clickable, but it constrains how any redesign has to build hit-areas (invisible padded hit zones, not the visible dot itself).

### H3. Clustering doesn't exist at any density — 5+ markers within a 40px box in Package 3/4
Rendering Package 4's coordinates through the current projection puts five separate markers (the Home Office cluster: two billboard faces, a gas-station screen, and two adjacent POI markers) inside roughly a 40×60px region of the 1040×460 canvas, with **zero clustering, spreading, or zoom affordance**. On a real map product this density triggers cluster badges ("5") that expand on click/zoom. Here the markers simply overlap and there's no way to separate them — you cannot zoom in, because there's no zoom.

### H4. Color is the *only* differentiator between asset types — three of six types collapse into "a blue dot"
Computed RGB distance between the three blue-family type colors (`Retail/In-store #4f46e5`, `Gym #4a5da8`, `Airport #0071CE`) is 65–93 on a 0–441 scale — visually close even for full-color vision at small size, and this ignores C2 above (two of those are literally the same color). No shape, icon, or pattern differentiates types — everything is a plain filled circle. This fails for colorblind users (deuteranopia/protanopia specifically compress blue/indigo/purple distinctions) and for anyone viewing the map in bright light or on a lower-quality display.

### H5. Zero map/list synchronization
The zone cards below the diagram (`renderZoneCards`) and the diagram itself (`buildStaticMapSVG`) are two independent render passes with no shared state. Hovering or clicking a zone-card row does nothing to the map above it; there's no equivalent hover-back from map to card. This is a core, expected pattern in every benchmark product (Airbnb and Zillow both treat "hover listing → highlight pin" as table-stakes) and its absence makes the two panels feel like unrelated content rather than one view of the same data.

### H6. `.pkg-card` and `.step` are `<div onclick>`, not real interactive elements — package selection is not keyboard accessible
```html
<div class="pkg-card ..." onclick="selectPkg('p1')">
```
A `<div>` is not natively focusable and has no default keyboard activation (Enter/Space). A keyboard-only user cannot Tab to a package card and select it — full stop. Same problem on the step-tracker circles (`<div class="step" onclick="goStep(n)">`). There is also no `tabindex`, `role`, or `aria-*` attribute anywhere in the file (confirmed by search) and no `.pkg-card:focus` style. The `.radiomark` pseudo-radio-button is purely decorative — it has no `role="radio"`/`aria-checked`, so a screen reader announces nothing about selection state at all.

---

## Medium severity

### M1. Zero responsive breakpoints — confirmed, not assumed
A full search of the stylesheet turns up **no `@media` query anywhere in the file.** `.pkg-grid`, `.form-grid`, and `.review-grid` are hard-coded two-column grids; `.zc-row` is a hard-coded three-column grid (`1.8fr 0.8fr 0.8fr`). On a 375px phone viewport that leaves roughly 100–110px per column inside `.zc-row` — device names like "PlanetFitness (Rockbot)" plus a wrapped subtype line ("Gym screen · #1447318") sitting next to right-aligned "0.46 mi" and "$583/mo" will visibly cramp or wrap unpredictably. There's no mobile layout for the map panel at all — same 1040×460 canvas, same three-column stat row, same fixed-width legend.

### M2. Faint accent-on-accent-light text fails AA at the sizes it's used
Computed contrast for `--accent (#c8440a)` on `--accent-light (#fdf1eb)` is **4.42:1**, which fails WCAG AA for normal text (4.5:1 required) and only clears the bar if treated as "large text" (18.66px+ bold). This combination is used for the `.goalpill` label and `.countchip` text, both well under that size threshold in practice.

### M3. The connector lines on the map have no legend entry
Each device is joined to its nearest Walmart target point by a thin, semi-transparent colored line. Nothing in the legend or panel copy explains what these lines mean — a first-time viewer has to infer "line = assigned to this zone" with no key. Every other visual encoding on the map (zone color, marker color) gets a legend row; this one doesn't.

### M4. POI codes are 9px text — below comfortable reading size regardless of contrast
`HQ`, `SC`, `SAM`, `NM`, `SR`, `AIR` render at `font-size="9"` inside the marker circles. Contrast against their fill colors is fine (4.7–11.9:1, computed), but 9px absolute is below the ~12–14px floor most style guides set for UI text — and it shrinks further under the SVG's ~0.55× viewBox scaling on a laptop, putting the rendered size close to 5px.

### M5. Redundant, verbose zone-card headers
Card headers read "Neighborhood Market zone — nearest to Neighborhood Market" — the zone label and the POI name are near-duplicates of each other, adding width and reading time without adding information. On the narrow `.zc-name` (flex:1, no `text-overflow` handling) this is also a wrapping risk on mobile per M1.

### M6. No way to tell "available/selected package inventory" apart from "surrounding context" at a glance
POI markers (Walmart's own locations) and device markers (what you're buying) use completely different visual languages (13–15px labeled circle vs. 6px plain dot) which is actually the right instinct, but there's no on-map legend distinguishing "these are targets, these are what you're buying" — a user has to read the two `<div class="lg-group">` rows below the map and mentally connect them back up, rather than reading it directly off the canvas the way a map legend normally works (in-context, not below-the-fold).

### M7. Orientation is thin — only a compass rose, no named geography
There's a north arrow and a scale bar (both good instincts, genuinely better than the honeycomb approach it replaced), but nothing else anchors the viewer geographically — no road names, no "Bentonville, AR" label, no city context. For Package 4, the airport marker sits ~7 miles southwest of the cluster with nothing to explain *why* it's drawn there beyond the dashed distance rings. A user unfamiliar with the area has scale but not place.

---

## Low severity

### L1. Package price shown three different ways with three different rounding/format conventions
`$5,153/mo` (package card) vs. `$5,153` in `.mapstat` vs. `$5,153/mo` in zone cards — consistent in this case, but nothing enforces it structurally; worth a single shared formatter if more package variants get added later.

### L2. `.subchoice` cards for Package 1 use the same visual language (bordered card + radio) as the top-level package cards, one level down — mild hierarchy confusion on first read (is this a package or a sub-option?).

### L3. `.toggle-devs` button copy is static ("What's included ▾") regardless of expanded/collapsed state — no chevron flip, no "Hide" label change, so the affordance doesn't confirm what will happen or what just happened.

### L4. `#map-heading` / `#map-sub` text is rewritten via `textContent` on every render — fine functionally, but the sub-copy is identical every time (doesn't vary by package), so the "personalization" promised by the step name ("Your map") is limited to which dots appear, not the surrounding language.

---

## Stress test results

| Scenario | Result |
|---|---|
| **Package 4, many markers (18 devices)** | 4 airport devices fully overlap into 1 dot (C1); 5+ markers crowd into a 40px cluster near the Home Office with no way to separate them (H3) |
| **Dense cluster (Home Office corridor, Pkg 3/4)** | Confirmed via rendered coordinates: multiple markers within single-digit pixels of each other, several exact duplicates |
| **Sparse/rural (XNA Airport, Pkg 4)** | Handled reasonably well — dashed rings and scale bar correctly communicate "this is ~7 miles away," which is the one thing this design does better than its predecessor |
| **Multiple overlapping markers** | No offset, no cluster badge, no z-order strategy — confirmed via projection math (C1) |
| **Long location names** | Avoided directly on the canvas (good), but zone-card headers get verbose/redundant (M5) and have no truncation safeguard |
| **Small laptop (~1280×800, ~560px content column)** | SVG scales down ~0.55×, pushing already-small markers toward ~6px rendered (H2) |
| **Mobile (375px)** | No breakpoints exist anywhere in the stylesheet (M1); `.zc-row` 3-column grid will cramp; map canvas and legend don't reflow |
| **Zoomed far out / far in** | Not applicable — there is no zoom capability at all, at any package size |
| **Multiple filters active** | Not applicable — this flow has no map filtering; the only "filter" is the package selection itself, one at a time |
| **Selection with many nearby items visible** | Not applicable — nothing is selectable on the map; only the zone cards present data, with no link back to the canvas (H5) |

---

## Benchmark comparison

| Capability | This design | Google Maps | Airbnb | Zillow |
|---|---|---|---|---|
| Marker hover state | None | Raise + label | Card highlight | Price bubble scale-up |
| Marker click/selected state | None | Info window | Card sync + scroll | Detail panel |
| Overlapping-point handling | None (stacks silently) | Cluster badge | Cluster badge / spiderfy | Cluster badge |
| Map/list sync | None | N/A (single view) | Bidirectional hover | Bidirectional hover |
| Zoom/pan | None | Full | Full | Full |
| Type differentiation | Color only (2 types share 1 color) | Icon + color | Price-bubble only (single type) | Icon + color |
| Geographic orientation | Scale bar + compass only | Full basemap | Full basemap | Full basemap |
| Keyboard accessibility | None (div onclick) | Full | Full | Full |
| Responsive layout | None (0 media queries) | Full | Full | Full |

The one place this design legitimately does something better than a basemap-driven approach: it can never fail to load (no tiles, no CDN dependency), and the scale bar makes distance verifiable rather than implied — both real, valid wins carried over from the redesign brief. But "reliable and honest about distance" and "usable as an interactive map" are different bars, and the current build only clears the first one.

---

## Priority fix list (informs the updated prototype)

1. De-duplicate/offset coincident markers so no device is ever fully hidden behind another (C1)
2. Fix the missing `.mapstat`/`.mapstatrow` CSS (C2)
3. Give every asset type a unique color **and** shape, not color alone (C3, H4)
4. Add real hover/selected/focus states to every marker, with a tooltip (H1)
5. Enlarge hit targets independent of visual marker size (H2)
6. Add clustering/spread behavior for dense areas, plus zoom so users can separate them (H3)
7. Bi-directional map ⇄ zone-card sync (H5)
8. Make package cards and step-tracker items real, keyboard-operable, focus-visible controls (H6)
9. Add mobile breakpoints for the map panel and the surrounding grids (M1)
10. Fix the sub-AA accent-on-accent-light text pairing (M2)
11. Add a legend entry for the connector lines (M3)
