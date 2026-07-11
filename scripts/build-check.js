#!/usr/bin/env node
// ============================================================
// NWA Ads — Pre-deploy build check
// Runs before every Netlify deploy via netlify.toml
// Fails the build if any JS file has a syntax error
// ============================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const JS_FILES = [
  'js/book-state.js',
  'js/book-supabase.js',
  'js/book-inventory.js',
  'js/book-ui.js',
  'js/book-map.js',
  'js/book-cart.js',
  'js/book-flow.js',
];

const HTML_FILES = [
  'book.html',
  'index.html',
];

let errors = 0;

console.log('\n🔍 NWA Ads pre-deploy build check\n');

// ── Check JS files for syntax errors ──────────────────────
console.log('Checking JS modules...');
JS_FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`  ⚠️  ${file} — not found (skipping)`);
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

// ── Check HTML files for obvious issues ───────────────────
console.log('\nChecking HTML files...');
HTML_FILES.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`  ⚠️  ${file} — not found (skipping)`);
    return;
  }
  const content = fs.readFileSync(file, 'utf8');

  // Check for unclosed script tags
  const scriptOpens  = (content.match(/<script/g) || []).length;
  const scriptCloses = (content.match(/<\/script>/g) || []).length;
  if (scriptOpens !== scriptCloses) {
    console.error(`  ❌ ${file} — mismatched <script> tags (${scriptOpens} open, ${scriptCloses} close)`);
    errors++;
  } else {
    console.log(`  ✅ ${file}`);
  }

  // Warn on inline script blocks (should be zero after module split)
  const inlineScripts = (content.match(/<script>[\s\S]*?<\/script>/g) || []);
  if (inlineScripts.length > 0) {
    console.warn(`  ⚠️  ${file} — ${inlineScripts.length} inline <script> block(s) found. Should be zero after module split.`);
  }
});

// ── Check required files exist ─────────────────────────────
console.log('\nChecking required files...');
const REQUIRED = [
  'book.html',
  'css/book.css',
  'js/book-state.js',
  'js/book-flow.js',
  'js/book-map.js',
  'js/book-inventory.js',
  'js/book-cart.js',
  'js/book-ui.js',
  'js/book-supabase.js',
  'design-system.html',
  'venue_photos/Billboards_generic.png',
  'venue_photos/QSR_FastCasual.png',
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
  console.error('Fix all errors before pushing to main.\n');
  process.exit(1);
}
