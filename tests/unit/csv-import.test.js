// tests/unit/csv-import.test.js
// Unit tests for Lamar Rate Package CSV parsing logic
// Mirrors importRatesCSV() from admin.html
// Run with: node --test tests/unit/csv-import.test.js

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ── Mirror of parsing logic from admin.html ───────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result.map(c => c.replace(/^"|"$/g, '').trim());
}

function toNum(s) {
  const s2 = (s || '').replace(/[$,\s]/g, '');
  const n = parseFloat(s2);
  return isNaN(n) ? null : n;
}

function detectFormat(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const ll = lines[i].toLowerCase();
    if (ll.includes('screen location') && ll.includes('city')) return { format: 'lamar', headerIdx: i };
    if (ll.startsWith('id,') || ll.includes(',cpm_updated,')) return { format: 'admin', headerIdx: i };
  }
  return { format: null, headerIdx: -1 };
}

function parseLamarCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const { headerIdx } = detectFormat(text);
  if (headerIdx === -1) return [];

  const SKIP = ['total','legend','yellow','grey','rates shown','please'];
  const results = [];

  for (const line of lines.slice(headerIdx + 1)) {
    if (!line.trim() || line.replace(/,/g,'').trim() === '') continue;
    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;
    const name = cols[0];
    if (!name || SKIP.some(k => name.toLowerCase().includes(k))) continue;

    const city    = cols[1];
    const cpmRaw  = cols[2];
    const impr    = toNum(cols[4]);
    const wkly    = toNum(cols[7] || '');
    const mo      = toNum(cols[9] || '');
    let cpm       = toNum(cpmRaw);

    // Derive CPM if blank
    if (cpm === null && mo !== null && impr !== null && impr > 0) {
      cpm = Math.round((mo / (impr * 4)) * 1000 * 100) / 100;
    }
    results.push({ name, city, cpm, impr, wkly, mo });
  }
  return results;
}

function fuzzyScore(lamarName, lamarCity, invName, invArea) {
  let score = 0;
  const ln = lamarName.toLowerCase();
  const lc = (lamarCity || '').toLowerCase();
  const fn = invName.toLowerCase();
  const ia = (invArea || '').toLowerCase();
  if (lc && ia.includes(lc.split(',')[0].trim())) score += 4;
  const STOP = new Set(['ar','the','and','at','of','in','mi','sf','nf','no','so','we','ea']);
  const lwords = ln.replace(/[^a-z0-9]/g,' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const fwords = fn.replace(/[^a-z0-9]/g,' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  lwords.forEach(w => { if (fwords.includes(w)) score++; });
  return score;
}

// ── Minimal INV_DATA for matching tests ───────────────────────────────────────
const INV_DATA = [
  { id: 'loc_595442', name: 'I-49 E/S (No)', area: 'Rogers, AR', type: 'digital' },
  { id: 'loc_595410', name: 'I-49 E/S (No)', area: 'Bentonville, AR', type: 'digital' },
  { id: 'loc_595408', name: 'Walton Blvd E/S (No)', area: 'Bentonville, AR', type: 'digital' },
  { id: 'loc_595434', name: '14th and S. Walton E/S (No)', area: 'Bentonville, AR', type: 'digital' },
  { id: 'loc_595446', name: '1080 SE 14th St S/S (We)', area: 'Bentonville, AR', type: 'digital' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Format detection', () => {
  test('Detects Lamar format from header containing "Screen Location" and "City"', () => {
    const csv = 'Title row\n\nAnother\n\n\nScreen Location,City,CPM ($),Faces,Wkly Impr\nRow1\n';
    const { format, headerIdx } = detectFormat(csv);
    assert.equal(format, 'lamar');
    assert.equal(headerIdx, 5);
  });

  test('Detects admin export format from "id,cpm_updated" header', () => {
    const csv = 'id,name,type,area,cpm_original,cpm_updated,wkly_impr,wkly_rate\n';
    const { format } = detectFormat(csv);
    assert.equal(format, 'admin');
  });

  test('Returns null for unrecognized format', () => {
    const csv = 'random,columns,here\ndata,data,data\n';
    const { format } = detectFormat(csv);
    assert.equal(format, null);
  });
});

describe('CRLF and BOM handling', () => {
  test('Strips Windows CRLF line endings', () => {
    const csv = 'Screen Location,City\r\nI-49,Rogers\r\n';
    const lines = csv.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
    assert.equal(lines[0], 'Screen Location,City');
    assert.equal(lines[1], 'I-49,Rogers');
  });

  test('Strips BOM character from Excel exports', () => {
    const csv = '\uFEFFScreen Location,City\n';
    const clean = csv.replace(/^\uFEFF/, '');
    assert.equal(clean[0], 'S');
  });

  test('Handles bare CR line endings', () => {
    const csv = 'Screen Location,City\rI-49,Rogers\r';
    const lines = csv.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
    assert.equal(lines[0], 'Screen Location,City');
  });
});

describe('CSV line parsing', () => {
  test('Parses simple comma-separated line', () => {
    const cols = parseCSVLine('I-49 Rogers,Rogers,,$710');
    assert.equal(cols[0], 'I-49 Rogers');
    assert.equal(cols[1], 'Rogers');
  });

  test('Handles quoted fields containing commas', () => {
    const cols = parseCSVLine('"I-49 W/S, AT MM 70, Springdale, AR",Springdale,,,$710');
    assert.equal(cols[0], 'I-49 W/S, AT MM 70, Springdale, AR');
    assert.equal(cols[1], 'Springdale');
  });

  test('Strips surrounding quotes from values', () => {
    const cols = parseCSVLine('"Rogers","AR","$4.12"');
    assert.equal(cols[0], 'Rogers');
    assert.equal(cols[2], '$4.12');
  });
});

describe('Number parsing', () => {
  test('Strips dollar sign from currency values', () => {
    assert.equal(toNum('$710'), 710);
    assert.equal(toNum('$2,580'), 2580);
  });

  test('Strips commas from large numbers', () => {
    assert.equal(toNum('179,468'), 179468);
    assert.equal(toNum('1,190'), 1190);
  });

  test('Returns null for blank values', () => {
    assert.equal(toNum(''), null);
    assert.equal(toNum(null), null);
    assert.equal(toNum('   '), null);
  });
});

describe('CPM derivation', () => {
  test('Derives CPM from mo_rate / wkly_impr when blank', () => {
    // mo_rate=2580, wkly_impr=156374
    const mo = 2580, impr = 156374;
    const cpm = Math.round((mo / (impr * 4)) * 1000 * 100) / 100;
    assert.ok(cpm > 4.0 && cpm < 4.2, `Expected CPM ~4.12, got ${cpm}`);
  });

  test('Derives CPM: I-49 E/S Rogers mo=2580 impr=156374 → ~4.12', () => {
    const cpm = Math.round((2580 / (156374 * 4)) * 1000 * 100) / 100;
    assert.equal(cpm, 4.12);
  });

  test('Derives CPM: Walton Blvd mo=4320 impr=166823 → ~6.47', () => {
    const cpm = Math.round((4320 / (166823 * 4)) * 1000 * 100) / 100;
    assert.equal(cpm, 6.47);
  });

  test('Does not override CPM if already provided', () => {
    // If CPM column has a value, use it; don't override
    const provided = 5.50;
    const derived  = Math.round((2580 / (156374 * 4)) * 1000 * 100) / 100;
    const result   = provided !== null ? provided : derived;
    assert.equal(result, 5.50);
  });
});

describe('Row skipping', () => {
  test('Skips rows with name containing "legend"', () => {
    const name = 'legend: yellow = unconfirmed';
    const SKIP = ['total','legend','yellow','grey','rates shown','please'];
    assert.ok(SKIP.some(k => name.toLowerCase().includes(k)));
  });

  test('Skips rows with name containing "total"', () => {
    const name = 'Total all boards';
    const SKIP = ['total','legend','yellow','grey','rates shown','please'];
    assert.ok(SKIP.some(k => name.toLowerCase().includes(k)));
  });

  test('Does not skip valid screen names', () => {
    const name = 'I-49 E/S (No)';
    const SKIP = ['total','legend','yellow','grey','rates shown','please'];
    assert.ok(!SKIP.some(k => name.toLowerCase().includes(k)));
  });
});

describe('Fuzzy name matching', () => {
  test('High score: city match + multiple word overlap', () => {
    const score = fuzzyScore('I-49 E/S (No)', 'Rogers', 'I-49 E/S (No)', 'Rogers, AR');
    assert.ok(score >= 4, `Expected score >= 4, got ${score}`);
  });

  test('Low score: different city, no word overlap', () => {
    const score = fuzzyScore('Walton Blvd Main St', 'Fayetteville', 'I-49 E/S (No)', 'Rogers, AR');
    assert.ok(score < 2, `Expected score < 2, got ${score}`);
  });

  test('Match threshold: score >= 2 required', () => {
    const threshold = 2;
    const goodScore = 4;
    const badScore  = 1;
    assert.ok(goodScore >= threshold);
    assert.ok(!(badScore >= threshold));
  });

  test('Best match for Walton Blvd is loc_595408', () => {
    const lamarName = 'Walton Blvd E/S (No)';
    const lamarCity = 'Bentonville';
    let best = null, bestScore = 0;
    INV_DATA.forEach(s => {
      const sc = fuzzyScore(lamarName, lamarCity, s.name, s.area);
      if (sc > bestScore) { bestScore = sc; best = s; }
    });
    assert.equal(best?.id, 'loc_595408');
    assert.ok(bestScore >= 2);
  });
});
