#!/usr/bin/env node
// scripts/write-results.js
// Reads playwright-results.json and posts a summary to a GitHub Gist
// Gist ID is fixed so we always update the same one

const fs = require('fs');
const path = require('path');
const https = require('https');

const resultsPath = path.join(process.cwd(), 'playwright-results.json');
if (!fs.existsSync(resultsPath)) {
  console.log('No playwright-results.json found — tests may not have run');
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
          const errMsg = (result?.error?.message || result?.error?.value || 'No error message')
            .replace(/\u001b\[[0-9;]*m/g, '')  // strip ANSI
            .substring(0, 600);
          failures.push({
            title: spec.title,
            file: f,
            status: result?.status,
            duration: result?.duration,
            error: errMsg,
            stdout: (result?.stdout || []).map(s => s.text).join('').trim().substring(0, 300)
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
  `STATS: ${results.stats ? JSON.stringify(results.stats) : 'n/a'}`,
  `---`
];

if (failures.length === 0) {
  lines.push('ALL TESTS PASSED ✅');
} else {
  failures.forEach((f, i) => {
    lines.push(`\nFAIL [${i+1}/${failures.length}]: ${f.title}`);
    lines.push(`FILE: ${f.file}`);
    lines.push(`STATUS: ${f.status} (${f.duration}ms)`);
    lines.push(`ERROR:\n${f.error}`);
    if (f.stdout) lines.push(`STDOUT: ${f.stdout}`);
  });
}

const summary = lines.join('\n');
console.log('\n' + summary + '\n');

// Post to Gist
const GIST_ID = 'nwa-ads-ci-results';  // will be created/updated
const TOKEN = process.env.GIST_TOKEN || process.env.GITHUB_TOKEN;
if (!TOKEN) { console.log('No token — skipping Gist update'); process.exit(0); }

const gistPayload = JSON.stringify({
  description: `NWA Ads CI Results — ${project} — ${new Date().toISOString()}`,
  public: false,
  files: {
    [`nwa-ads-${project}.txt`]: { content: summary }
  }
});

// Try to find existing gist first, then create/update
function apiRequest(method, path, body, cb) {
  const opts = {
    hostname: 'api.github.com',
    path,
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'nwa-ads-ci',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  const req = https.request(opts, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => cb(res.statusCode, data ? JSON.parse(data) : {}));
  });
  req.on('error', e => { console.error('API error:', e); process.exit(0); });
  if (body) req.write(body);
  req.end();
}

// List gists to find existing one
apiRequest('GET', '/gists?per_page=30', null, (status, gists) => {
  const existing = Array.isArray(gists) && gists.find(g => g.description && g.description.includes('NWA Ads CI'));
  
  if (existing) {
    // Update existing gist
    apiRequest('PATCH', `/gists/${existing.id}`, gistPayload, (s, g) => {
      console.log(`Gist updated: https://gist.github.com/${g.id}`);
    });
  } else {
    // Create new gist
    apiRequest('POST', '/gists', gistPayload, (s, g) => {
      console.log(`Gist created: https://gist.github.com/${g.id}`);
    });
  }
});
