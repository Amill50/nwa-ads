NWA Ads Platform
==============================

Three independently managed tools sharing one shared/ data layer.

DIRECTORY MAP
─────────────
  book/           Self-serve booking wizard
  proposal/       Client-facing campaign proposal viewer
  admin/          Internal admin console (auth-gated)
  shared/         Source of truth for all cross-tool data
    js/env.js         Runtime environment config + STAGING ribbon
    js/supabase.js    Supabase client init
    js/pricing.js     screenRate(), RATE_CONFIG, all pricing functions
    js/inventory.js   INV array, BUDGET_* constants
    js/poi-data.js    NWA_POIS point-of-interest data
    js/venue-type-img.js  VENUE_TYPE_IMG photo map
    css/base.css      Design tokens (:root vars, fonts, button primitives)
    venue_photos/     Venue photo assets

SHARED-LAYER RULE
─────────────────
Inventory, pricing, POI, and Supabase changes go in shared/ only.
Never duplicate these in tool-specific code.

URL STRUCTURE
─────────────
  nwa-ads.com              → Marketing landing page
  nwa-ads.com/home         → Full homepage
  nwa-ads.com/book/        → Self-serve booking wizard
  nwa-ads.com/proposal/    → Proposal viewer (Supabase ?id= lookup)
  nwa-ads.com/proposal/view?id=<uuid>  → Same viewer (canonical URL)
  nwa-ads.com/admin/       → Admin console (Supabase magic-link auth)

LEGACY REDIRECTS (all 301)
───────────────────────────
  /book.html    → /book/
  /proposal.html → /proposal/view
  /admin.html   → /admin/

STAGING WORKFLOW
────────────────
  feature branch → PR → Netlify deploy preview → merge to staging
  → verify staging URL → merge staging → main (production)

  shared/js/env.js detects the environment by hostname:
    nwa-ads.com       → production
    *.netlify.app     → staging (injects visible STAGING ribbon)
    localhost         → staging

ADMIN ACCESS
────────────
  /admin/ requires Supabase magic-link sign-in from an allowlisted email.
  Currently allowlisted: andrew@nwa-ads.com, andrewjmiller50@gmail.com
