#!/usr/bin/env node
// scripts/summarize-results.js
// Reads playwright-results.json and prints failures to stdout
// Used in CI to surface test errors without needing artifact download access

const fs = require('fs');
const path = require('path');

const resultsPath = path.join(process.cwd(), 'playwright-results.json');
if (!fs.existsSync(resultsPath)) {
  console.log('No playwright-results.json found');
  process.exit(0);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

let passed = 0, failed = 0;
const failures = [];

function walk(suites) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.[test.results.length - 1];
        if (result?.status === 'passed') {
          passed++;
        } else {
          failed++;
          failures.push({
            title: spec.title,
            error: result?.error?.message || 'Unknown error',
            duration: result?.duration
          });
        }
      }
    }
    walk(suite.suites);
  }
}

walk(results.suites);

console.log(`\n===== PLAYWRIGHT RESULTS =====`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`==============================\n`);

if (failures.length > 0) {
  console.log('FAILURES:');
  failures.forEach((f, i) => {
    console.log(`\n[${i+1}] ${f.title}`);
    // Print first 300 chars of error
    console.log(f.error.substring(0, 300));
  });
}
