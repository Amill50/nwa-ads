#!/usr/bin/env node
// ============================================================
// NWA Ads — Pre-deploy build check
// Runs before every Netlify deploy via netlify.toml
// 1. Fails the build if any JS file has a syntax error
// 2. Fails the build if any HTML page's script chain USES a
//    global that no earlier script in that page DEFINES
//    (the NWA_POIS / VENUE_TYPE_IMG bug class)
// 3. Fails if required files are missing
// ============================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const JS_FILES = [
  'shared/js/env.js',
  'shared/js/supabase.js',
  'shared/js/pricing.js',
  'shared/js/inventory.js',
  'shared/js/poi-data.js',
  'shared/js/venue-type-img.js',
  'book/js/book-state.js',
  'book/js/book-ui.js',
  'book/js/book-map.js',
  'book/js/book-cart.js',
  'book/js/book-flow.js',
];

const HTML_FILES = [
  'book/index.html',
  'proposal/index.html',
  'admin/index.html',
  'index.html',
];

// Globals defined by external CDN scripts / the browser — never flag these.
const EXTERNAL_GLOBALS = new Set([
  'L', 'supabase', 'Plotly', 'Chart',
]);

let errors = 0;

console.log('\n🔍 NWA Ads pre-deploy build check\n');

// ── Check JS files for syntax errors ──────────────────────
console.log('Checking JS modules...');
JS_FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`  ❌ ${file} — MISSING (listed in JS_FILES)`);
    errors++;
    return;
  }
  try {
    execSync(`node --check ${file}`, { stdio: 'pipe' });
    console.log(`  ✅ ${file}`);
  } catch (e) {
    console.error(`  ❌ ${file} — SYNTAX ERROR:`);
    console.error('    ' + e.stderr.toString().trim());
    errors++;
  }
});

// ── Global definition/usage cross-check per HTML page ─────
// Parses each page's local <script src> tags in order, collects
// top-level definitions from each file, then flags identifiers
// that look like project globals (UPPER_SNAKE or known names)
// used in a later file but defined in none of the page's files.
console.log('\nChecking script-chain globals per page...');

function definedGlobals(src) {
  const defs = new Set();
  const re = /^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src))) defs.add(m[1]);
  const wre = /window\.([A-Za-z_$][\w$]*)\s*=/g;
  while ((m = wre.exec(src))) defs.add(m[1]);
  return defs;
}

function stripStringsAndComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')      // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')   // line comments (not URLs)
    .replace(/`(?:[^`\\]|\\.)*`/g, '""')     // template literals
    .replace(/'(?:[^'\\]|\\.)*'/g, '""')     // single-quoted
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');    // double-quoted
}

function usedProjectGlobals(src) {
  // Project convention: shared data/config globals are UPPER_SNAKE **with an
  // underscore** (NWA_POIS, RATE_CONFIG, BUDGET_MIN, VENUE_TYPE_IMG...).
  const clean = stripStringsAndComments(src);
  const used = new Set();
  const re = /\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b/g;
  let m;
  while ((m = re.exec(clean))) used.add(m[1]);
  return used;
}

HTML_FILES.forEach(page => {
  if (!fs.existsSync(page)) return;
  const html = fs.readFileSync(page, 'utf8');
  const srcs = [...html.matchAll(/<script src="(\/[^"?]+)(?:\?[^"]*)?"/g)]
    .map(m => m[1].replace(/^\//, ''))
    .filter(p => fs.existsSync(p));
  if (srcs.length === 0) { console.log(`  ✅ ${page} (no local scripts)`); return; }

  const allDefs = new Set(EXTERNAL_GLOBALS);
  const inlineDefs = definedGlobals(html); // inline blocks, if any
  inlineDefs.forEach(d => allDefs.add(d));
  srcs.forEach(f => definedGlobals(fs.readFileSync(f, 'utf8')).forEach(d => allDefs.add(d)));

  let pageErrors = 0;
  srcs.forEach(f => {
    const src = fs.readFileSync(f, 'utf8');
    // identifiers declared ANYWHERE in this file (incl. function-local)
    const localDefs = new Set();
    let lm; const lre = /(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g;
    while ((lm = lre.exec(src))) localDefs.add(lm[1]);
    usedProjectGlobals(src).forEach(g => {
      if (localDefs.has(g)) return;
      const clean = stripStringsAndComments(src);
      const refRe = new RegExp('(?<![.\\w$])' + g + '\\b(?!\\s*:)', 'm');
      if (!allDefs.has(g) && refRe.test(clean)) {
        console.error(`  ❌ ${page} — ${f} uses "${g}" but no script on this page defines it`);
        pageErrors++;
      }
    });
  });
  if (pageErrors === 0) console.log(`  ✅ ${page} — script chain complete (${srcs.length} files)`);
  errors += pageErrors;
});

// ── Check HTML files for obvious issues ───────────────────
console.log('\nChecking HTML files...');
HTML_FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`  ⚠️  ${file} — not found (skipping)`);
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  const scriptOpens  = (content.match(/<script/g) || []).length;
  const scriptCloses = (content.match(/<\/script>/g) || []).length;
  if (scriptOpens !== scriptCloses) {
    console.error(`  ❌ ${file} — mismatched <script> tags (${scriptOpens} open, ${scriptCloses} close)`);
    errors++;
  } else {
    console.log(`  ✅ ${file}`);
  }
});

// ── Check required files exist ─────────────────────────────
console.log('\nChecking required files...');
const REQUIRED = [
  'book/index.html',
  'book/css/book.css',
  'shared/css/base.css',
  'shared/js/env.js',
  'shared/js/pricing.js',
  'shared/js/inventory.js',
  'shared/js/poi-data.js',
  'shared/js/supabase.js',
  'shared/js/venue-type-img.js',
  'book/js/book-state.js',
  'book/js/book-flow.js',
  'book/js/book-map.js',
  'book/js/book-cart.js',
  'book/js/book-ui.js',
  'design-system.html',
  'shared/venue_photos/Billboards_generic.png',
  'shared/venue_photos/QSR_FastCasual.png',
  'proposal/index.html',
  'proposal/view.html',
  'admin/index.html',
  'admin/prospects.html',
];
REQUIRED.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.error(`  ❌ ${file} — MISSING`);
    errors++;
  }
});

// ── Result ─────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
if (errors === 0) {
  console.log('✅ All checks passed — deploying\n');
  process.exit(0);
} else {
  console.error(`❌ ${errors} error(s) found — deploy blocked\n`);
  console.error('Fix all errors before pushing.\n');
  process.exit(1);
}
