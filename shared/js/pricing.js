/* ══════════════ SHARED PRICING ══════════════
   Single source of truth for ALL pricing math across the three tools
   (book, proposal, admin). RATE_CONFIG values are read by the admin
   Margin & Rate Settings panel. Do not duplicate these functions in
   tool-specific code — load /shared/js/pricing.js instead.
   Load order: after supabase.js, before inventory.js and tool JS.
   ═════════════════════════════════════════════ */
/* ══════════════ RATE CONFIG ══════════════
   Source of truth for all pricing logic.
   Daily premium and markup are set here — update when media owner
   rate sheets are confirmed. Admin panel reads/writes these values.
   ════════════════════════════════════════ */
const RATE_CONFIG = {
  daily_premium:    1.10,   // +10% above 4-week rate card for daily buys
  weekly_premium:   1.00,   // no premium on weekly
  monthly_premium:  1.083,  // +8.3% for 30-day vs 28-day commitment
  markup_under_10k: 0.20,   // 20% margin on deals under $10,000 total
  markup_over_10k:  0.15,   // 15% margin on deals $10,000+
  last_updated:     '2026-06-04',
  note: 'Daily premium is estimated pending confirmed media owner rate sheets'
};

/* Weekly rate for a screen — pure calculation, no cart state */
function screenRate(s) {
  if (s.cpm && s.weekly_imp) return Math.round(s.cpm * s.weekly_imp / 1000);
  if (s.wkly_rate && s.wkly_rate > 0) return s.wkly_rate;
  if (s.mo_rate   && s.mo_rate   > 0) return Math.round(s.mo_rate / 4.33);
  return 0;
}

function customSchedTotalCost(screenRate4wk) {
  if (ST.customDayCount === 0) return 0;
  const dailyRate = Math.round((screenRate4wk / 28) * RATE_CONFIG.daily_premium);
  return dailyRate * ST.customDayCount;
}

/* Apply markup based on cart total */
function markupRate(costPrice) {
  const cartTotal = cartGrandTotal();
  const markup = cartTotal >= 10000 ? RATE_CONFIG.markup_over_10k : RATE_CONFIG.markup_under_10k;
  return Math.round(costPrice * (1 + markup));
}

/* Cart grand total at cost (before markup) — used to determine markup tier */
function cartGrandTotal() {
  if (ST.schedMode === 'custom' && ST.customDayCount > 0) {
    return Object.values(ST.cart).reduce((sum, s) => sum + customSchedTotalCost(s.mo_rate * (1 + RATE_CONFIG.markup_under_10k)), 0);
  }
  return Object.values(ST.cart).reduce((sum, s) => sum + (costUnitRate(s) * ST.qty), 0);
}

/* Cost price (no markup) for a screen at current increment */
function costUnitRate(s) {
  const fourWk = s.mo_rate; // mo_rate = 4-week base rate from CPM × impressions
  if (ST.inc === 'daily')  return Math.round((fourWk / 28) * RATE_CONFIG.daily_premium);
  if (ST.inc === 'weekly') return Math.round((fourWk / 4)  * RATE_CONFIG.weekly_premium);
  return Math.round(fourWk * RATE_CONFIG.monthly_premium);
}

/* ── Duration helpers ── */
/* Customer-facing price = cost + markup */
function unitRate(s) {
  // Custom schedule: total cost = daily rate × number of booked days
  if (ST.schedMode === 'custom' && ST.customDayCount > 0) {
    const fourWk = s.mo_rate || s.price || 0;
    const dailyCost = Math.round((fourWk / 28) * RATE_CONFIG.daily_premium);
    return markupRate(dailyCost) * ST.customDayCount;
  }
  return markupRate(costUnitRate(s));
}
function unitRateFromPrice(mo_rate) {
  /* fallback for legacy calls — derive from monthly */
  const fourWk = mo_rate;
  let cost;
  if (ST.schedMode === 'custom' && ST.customDayCount > 0) {
    cost = customSchedTotalCost(fourWk);
  } else if (ST.inc === 'daily')  cost = Math.round((fourWk / 28) * RATE_CONFIG.daily_premium);
  else if (ST.inc === 'weekly') cost = Math.round((fourWk / 4) * RATE_CONFIG.weekly_premium);
  else cost = Math.round(fourWk * RATE_CONFIG.monthly_premium);
  const markup = RATE_CONFIG.markup_under_10k; // conservative fallback
  return Math.round(cost * (1 + markup));
}
function durLabel() {
  if (ST.schedMode === 'custom' && ST.customDayCount > 0) {
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const days = ST.customDays.map(d => dayNames[d]).join(' + ');
    return days + ' · ' + ST.customDayCount + ' days';
  }
  const u = ST.inc === 'daily' ? 'day' : ST.inc === 'weekly' ? 'week' : 'month';
  return ST.qty + ' ' + u + (ST.qty !== 1 ? 's' : '');
}
function rateLabel() {
  return ST.inc === 'daily' ? '/day' : ST.inc === 'weekly' ? '/wk' : '/mo';
}
function minSpendLabel(s) {
  const rate = costUnitRate(s);
  if (ST.inc === 'daily') {
    const minDays = Math.max(1, Math.ceil(500 / rate));
    return `$500 min · ${minDays}d`;
  }
  if (ST.inc === 'weekly') {
    const minWks = Math.max(1, Math.ceil(500 / rate));
    return `$500 min · ${minWks}wk`;
  }
  return `$500 min · 1mo`;
}

