# Development Process

## Before pushing any change that touches HTML structure, IDs, classes, or text content:

1. Run the full local test suite first:
   ```bash
   npm test
   npx playwright test --project=desktop-chrome
   ```
2. If both pass, push to main.
3. If a test fails because of an intentional change (e.g. new element ID,
   changed button text), update the corresponding spec in tests/e2e/ in the
   SAME commit as the product change — never push a product change and fix
   the test in a follow-up commit.
4. After pushing, confirm the GitHub Actions run on the new commit is green
   before considering the work done. Check via:
   ```bash
   gh run list --limit 1
   gh run watch
   ```
5. CSS-only changes (color, spacing, z-index) with no markup/JS changes are
   lower risk but should still get a local desktop-chrome run before pushing
   if there's any doubt about whether a selector or visible-text assertion
   could be affected.

## Why this matters

On June 15-18 2026, we spent most of a day debugging CI failures with zero
visibility into actual error messages, because pushes went out before local
verification and CI environment issues (YAML errors, webServer config, live
site vs local server) compounded with real test bugs. Running tests locally
first separates "is my product change correct" from "is my CI environment
working," which makes failures vastly easier to diagnose.

## Current test suite (as of June 18 2026)

- 60 unit tests (tests/unit/) — pricing, scheduling, CSV import
- 46 E2E tests (tests/e2e/) — booking flow, admin, proposal links, smoke
- All passing across desktop-chrome, mobile-chrome, mobile-safari

See TESTING.md for full details on running and structure.
