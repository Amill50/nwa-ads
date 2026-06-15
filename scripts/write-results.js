#!/usr/bin/env node
// scripts/write-results.js
// Reads playwright-results.json, prints summary, pushes tiny txt to repo via PAT

const fs = require('fs');
const path = require('path');
const https = require('https');

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
          const err = (result?.error?.message || result?.error?.value || 'No error')
            .replace(/\u001b\[[0-9;]*m/g, '')
            .substring(0, 800);
          failures.push({ title: spec.title, file: f, status: result?.status, duration: result?.duration, error: err });
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
  '---'
];
failures.forEach((f, i) => {
  lines.push(`\nFAIL [${i+1}/${failures.length}]: ${f.title}`);
  lines.push(`FILE: ${f.file}`);
  lines.push(`STATUS: ${f.status} (${f.duration}ms)`);
  lines.push(`ERROR:\n${f.error}`);
});
if (!failures.length) lines.push('ALL PASSED ✅');

const summary = lines.join('\n');
console.log('\n' + summary + '\n');

// Push to repo using PAT (has contents:write)
const TOKEN = process.env.PAT_TOKEN;
if (!TOKEN) { console.log('No PAT_TOKEN — skipping repo push'); process.exit(0); }

const filePath = `ci-results/${project}.txt`;
const encoded = Buffer.from(summary).toString('base64');

function apiRequest(method, apiPath, body, cb) {
  const opts = {
    hostname: 'api.github.com',
    path: apiPath,
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
    res.on('end', () => { try { cb(res.statusCode, JSON.parse(data)); } catch(e) { cb(res.statusCode, {}); } });
  });
  req.on('error', e => { console.error('API error:', e.message); process.exit(0); });
  if (body) req.write(JSON.stringify(body));
  req.end();
}

// Get current SHA of file (if exists)
apiRequest('GET', `/repos/Amill50/nwa-ads/contents/${filePath}`, null, (status, data) => {
  const payload = {
    message: `ci: ${project} results [skip ci]`,
    content: encoded,
    branch: 'main'
  };
  if (status === 200 && data.sha) payload.sha = data.sha;

  apiRequest('PUT', `/repos/Amill50/nwa-ads/contents/${filePath}`, payload, (s, r) => {
    if (s === 200 || s === 201) {
      console.log(`✅ Results pushed to ci-results/${project}.txt`);
    } else {
      console.log(`❌ Push failed: HTTP ${s}`, JSON.stringify(r).substring(0, 200));
    }
  });
});
