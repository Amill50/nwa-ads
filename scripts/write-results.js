#!/usr/bin/env node
// scripts/write-results.js
// Reads playwright-results.json, writes compact failure summary to ci-results/latest.txt
// That file is committed back to the repo so Claude can read it via GitHub API

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

function walk(suites, file) {
  for (const suite of suites || []) {
    const f = suite.file || file || '';
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.[test.results.length - 1];
        if (result?.status === 'passed') {
          passed++;
        } else {
          failed++;
          failures.push({
            file: f,
            title: spec.title,
            status: result?.status,
            duration: result?.duration,
            error: result?.error?.message || result?.error?.value || 'No error message',
            stdout: (result?.stdout || []).map(s => s.text).join('').trim().substring(0, 500)
          });
        }
      }
    }
    walk(suite.suites, suite.file || file);
  }
}

walk(results.suites);

const project = process.env.PROJECT || 'unknown';
const lines = [
  `PROJECT: ${project}`,
  `RUN: ${new Date().toISOString()}`,
  `PASSED: ${passed}  FAILED: ${failed}`,
  `---`
];

if (failures.length === 0) {
  lines.push('ALL TESTS PASSED');
} else {
  failures.forEach((f, i) => {
    lines.push(`\nFAIL [${i+1}/${failures.length}]: ${f.title}`);
    lines.push(`FILE: ${f.file}`);
    lines.push(`STATUS: ${f.status} (${f.duration}ms)`);
    // Clean up error message — first 400 chars
    const err = f.error.replace(/\u001b\[[0-9;]*m/g, '').substring(0, 400);
    lines.push(`ERROR: ${err}`);
    if (f.stdout) lines.push(`STDOUT: ${f.stdout}`);
  });
}

const out = lines.join('\n');
console.log(out);

// Write to ci-results/
const dir = path.join(process.cwd(), 'ci-results');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
fs.writeFileSync(path.join(dir, 'latest.txt'), out);
fs.writeFileSync(path.join(dir, `${project}.txt`), out);
console.log(`\nWrote results to ci-results/${project}.txt`);
