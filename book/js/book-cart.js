function toggleScreen(id) {
  const s = INV.find(x => x.id === id);
  if (!s) return;

  if (ST.cart[id]) { delete ST.cart[id]; } else { ST.cart[id] = s; }
  const inCart = !!ST.cart[id];

  renderCart();
  updateNavSel();

  // Update add button (new sca- id or legacy data-id selector)
  const btn = document.getElementById('sca-' + id) || document.querySelector('.sc-add-btn[data-id="' + id + '"]');
  if (btn) {
    btn.classList.toggle('added', inCart);
    btn.textContent = inCart ? '✓ Added' : '+ Add';
  }
  // Show/hide X button
  const xb = document.getElementById('scx-' + id);
  if (xb) xb.classList.toggle('show', inCart);
  // Card tint
  const cardEl = document.getElementById('sc-' + id);
  if (cardEl) cardEl.classList.toggle('added', inCart);

  // Update map marker
  if (markers[id] && map) { markers[id].setIcon(makePinIcon(s)); }

  // Update drawer add button if open on this screen
  if (typeof drawerScreenId !== 'undefined' && drawerScreenId === id) {
    if (typeof updateDrawerAddBtn === 'function') updateDrawerAddBtn(s);
  }
}

/* ══════════════ TOGGLE CART (alias) ══════════════ */
function toggleCart(id) { toggleScreen(id); }

/* ══════════════ SIDEBAR STATE ══════════════ */
function showState(state) {
  const rec = document.getElementById('sb-rec');
  const browse = document.getElementById('sb-browse');
  if (rec)        rec.style.display        = state === 'rec'    ? 'flex' : 'none';
  if (browse)     browse.style.display     = state === 'browse' ? 'flex' : 'none';

  if (state === 'browse') {
    const countEl = document.getElementById('sb-browse-count');
    if (countEl) {
      const n = document.querySelectorAll('#tab-screens-content .sc').length;
      if (n) countEl.textContent = n + ' screens available';
    }
  }
}

/* ══════════════ RENDER CART (unified — tested) ══════════════ */
function renderCart() {
  const keys = Object.keys(ST.cart);

  const tableWrap = document.getElementById('cart-table-wrap');
  const totalsEl  = document.getElementById('cart-totals');
  const clearEl   = document.getElementById('cs-clear');
  const csTitle   = document.getElementById('cs-title');
  const noteEl    = document.getElementById('cart-cta-note');
  const reviewBtn = document.getElementById('btn-s2');
  const chDisc    = document.getElementById('ch-discount');
  const propSection = document.getElementById('proposal-section-wrap');
  if (propSection) propSection.style.display = keys.length ? 'block' : 'none';

  if (!keys.length) {
    if (tableWrap) tableWrap.innerHTML = `
      <div class="cart-empty-state">
        <span class="cei">🛒</span>
        Tap <strong>+</strong> on any screen to add it to your campaign.
      </div>`;
    if (totalsEl)  totalsEl.style.display  = 'none';
    if (clearEl)   clearEl.style.display   = 'none';
    if (reviewBtn) reviewBtn.disabled      = true;
    if (noteEl)    noteEl.textContent      = 'Add at least one screen to continue';
    if (csTitle)   csTitle.textContent     = 'Campaign cart';
    if (chDisc)    chDisc.style.display    = 'none';
    updateCartHeader();
    return;
  }

  const TYPE_LABELS = {digital:'Billboard',billboard:'Billboard',gasstation:'Gas Station',airport:'Airport',cinema:'Cinema',healthcare:'Healthcare',dining:'Dining',grocery:'Grocery',gym:'Gym',rideshare:'Rideshare',residential:'Residential',sports:'Sports & Entertainment',recreation:'Recreation',retail:'Retail',education:'Campus',office:'Office'};
  let subUnit = 0, totalWklyImpr = 0;

  if (tableWrap) tableWrap.innerHTML = keys.map(id => {
    const s = ST.cart[id];
    if (!s) return '';
    const rate = unitRate(s);
    subUnit += rate;
    totalWklyImpr += s.wkly_impr || 0;
    return `
      <div class="ct-row">
        <span class="ct-icon">${s.icon}</span>
        <div class="ct-info">
          <div class="ct-name">${s.name}</div>
          <div class="ct-area">${s.area} · ${TYPE_LABELS[s.type]||s.type}</div>
        </div>
        <span class="ct-price">$${Math.round(rate).toLocaleString()}<small>${rateLabel()}</small></span>
        <button class="ct-rm" onclick="removeFromCart('${id}')" title="Remove">×</button>
      </div>`;
  }).filter(Boolean).join('');

  const disc  = 0; // Volume discounts applied manually — removed auto 3-screen discount
  // For custom schedule, grand = subUnit already includes all days (customSchedTotalCost)
  // For standard, grand = subUnit * qty
  const effQty = (ST.schedMode === 'custom' && ST.customDayCount > 0) ? 1 : ST.qty;
  const grand = Math.round((subUnit - disc) * effQty);
  const imprStr = totalWklyImpr >= 1000
    ? Math.round(totalWklyImpr/1000)+'K+' : totalWklyImpr.toLocaleString();

  if (totalsEl)  totalsEl.style.display = 'block';
  if (clearEl)   clearEl.style.display  = 'inline';
  if (reviewBtn) reviewBtn.disabled     = false;
  if (chDisc)    chDisc.style.display   = 'none';
  const subEl = document.getElementById('ct-sub');
  if (subEl) subEl.textContent = '$' + Math.round(subUnit).toLocaleString() + rateLabel();
  const moEl = document.getElementById('ct-mo');
  if (moEl) moEl.textContent = durLabel();
  const grandEl = document.getElementById('ct-grand');
  if (grandEl) grandEl.textContent = '$' + grand.toLocaleString();

  if (csTitle) csTitle.textContent = keys.length + ' screen' + (keys.length!==1?'s':'') +
    ' · ' + imprStr + ' wkly impr';
  if (noteEl) noteEl.textContent = '';

  updateCartHeader();
  updateNavSel();
}

function removeFromCart(id) {
  delete ST.cart[id];
  renderList();
  renderCart();
  refreshMarkers();
  updateNavSel();
}

function clearAllCart() {
  ST.cart = {};
  renderList();
  renderCart();
  refreshMarkers();
  updateNavSel();
}

function updateNavCartSummary() {
  const el  = document.getElementById('nav-cart-label');
  const row = document.getElementById('nav-cart-row');
  if (!el) return;
  const keys = Object.keys(ST.cart);
  if (!keys.length) {
    el.textContent = 'No screens added yet';
    if (row) { row.style.opacity = '0.55'; row.style.cursor = 'default'; row.onclick = null; }
    return;
  }
  const total = keys.reduce((a, id) => a + unitRate(ST.cart[id]), 0);
  el.textContent = keys.length + ' screen' + (keys.length !== 1 ? 's' : '') + ' · $' + Math.round(total).toLocaleString() + rateLabel();
  if (row) { row.style.opacity = '1'; row.style.cursor = 'pointer'; row.onclick = openCartSidebar; }
}

function openCartSidebar() {
  const panel = document.getElementById('panel-4');
  const isPanel4 = panel && panel.classList.contains('active');
  if (isPanel4) {
    const sidebar = document.getElementById('sb-cart');
    if (sidebar) {
      sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setView('list');
  } else {
    goTo(5);
  }
}

/* Minimal HTML escaper — prevents XSS when inserting user-typed values */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHeaderZonePills() {
  const container = document.getElementById('header-zone-pills');
  if (!container) return;
  const goal    = ST.goal || '';
  const product = (ST.product || '').trim();
  const subInt  = (ST.subIntent || '').trim();
  let html = '';
  if (goal === "Reach Walmart & Sam's Club buyers") {
    const zones = [
      { label: 'Home Office',          color: '#1f3d2a' },
      { label: 'Downtown Bentonville', color: '#c8440a' },
      { label: 'Pinnacle Hills',       color: '#c8440a' },
    ];
    html += '<span class="s2-row2-sep">·</span>';
    html += zones.map(z => `<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:100px;padding:4px 10px;font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.85);white-space:nowrap"><span style="width:7px;height:7px;border-radius:50%;background:${z.color};display:inline-block;flex-shrink:0"></span>${z.label}</div>`).join('');
  } else if (goal === 'Drive customers through your door' && ST.proximityTarget) {
    const rawName = (ST.proximityTarget.name || '').split('–')[0].trim() || ST.advertiserName;
    if (rawName) {
      html += '<span class="s2-row2-sep">·</span>';
      html += `<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.35);border-radius:100px;padding:4px 10px;font-size:11.5px;font-weight:600;color:rgba(190,160,255,0.95);white-space:nowrap"><span style="width:7px;height:7px;border-radius:50%;background:#7c3aed;display:inline-block;flex-shrink:0"></span>${escHtml(rawName)}</div>`;
    }
  }
  if (product && subInt) {
    html += '<span class="s2-row2-sep">·</span>';
    html += `<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(200,68,10,0.2);border:1px solid rgba(200,68,10,0.4);border-radius:100px;padding:4px 10px;font-size:11.5px;font-weight:600;color:#e8935f;white-space:nowrap">🎯 ${escHtml(product)} · ${escHtml(subInt)}</div>`;
  }
  container.innerHTML = html;
}

function updateCartHeader() {
  const n = Object.keys(ST.cart).length;
  const badge    = document.getElementById('cart-icon-badge');
  const sub      = document.getElementById('ch-sub');
  const countEl  = document.getElementById('sbf-count');
  if (badge) { badge.textContent = n; badge.style.display = n ? 'flex' : 'none'; }
  if (countEl) countEl.textContent = n ? n + ' screen' + (n!==1?'s':'') : '0 screens';
  updateNavCartSummary();
  if (!sub) return;
  if (!n) { sub.textContent = 'No screens added yet'; return; }
  const total = Object.values(ST.cart).reduce((a,s) => a+unitRate(s), 0);
  sub.textContent = n + ' screen' + (n!==1?'s':'') + ' · $' + Math.round(total).toLocaleString() + rateLabel();
}

function renderSummary() {
  const keys = Object.keys(ST.cart);
  let subUnit = 0;
  document.getElementById('os-items').innerHTML = keys.map(id=>{
    const s = ST.cart[id];
    const uRate = unitRate(s);
    subUnit += uRate;
    const lineTotal = Math.round(uRate * ST.qty);
    return `<div class="os-item"><div><div class="name">${s.icon} ${s.name}</div><div class="meta">${s.area} · ${s.impr} · ${durLabel()}</div></div><div class="price">$${lineTotal.toLocaleString()}</div></div>`;
  }).join('');
  const effQty2 = (ST.schedMode === 'custom' && ST.customDayCount > 0) ? 1 : ST.qty;
  const grand = subUnit * effQty2;
  document.getElementById('os-grand').textContent = '$' + Math.round(grand).toLocaleString();
  // Update order summary sub-total and rate label
  document.getElementById('os-sub').textContent = '$' + Math.round(subUnit * effQty2).toLocaleString();
  const rl = document.getElementById('os-rate-label');
  if (rl) {
    if (ST.schedMode === 'custom' && ST.customDayCount > 0) {
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const days = ST.customDays.map(d => dayNames[d]).join('+');
      rl.textContent = days + ' · ' + ST.customDayCount + ' days';
    } else {
      rl.textContent = ST.inc;
    }
  }
}

/* ══════════════ CONFIRM + DASHBOARD ══════════════ */
function renderConfirm() {
  const keys = Object.keys(ST.cart);
  document.getElementById('conf-screens').textContent = keys.length + ' screen' + (keys.length!==1?'s':'');
  document.getElementById('conf-dur').textContent = durLabel();
  let subUnit = keys.reduce((a,id)=>a+unitRate(ST.cart[id]),0);
  const grand = Math.round(subUnit * ST.qty);
  document.getElementById('conf-total').textContent = '$' + grand.toLocaleString();

  // Show creative status in Step 4
  const creativeSection = document.getElementById('f-creative-status');
  if (creativeSection) {
    if (ST.creativeFile) {
      creativeSection.textContent = '✓ ' + ST.creativeFile.name;
      creativeSection.style.color = 'var(--green,#1a7a3a)';
    } else {
      creativeSection.textContent = 'Not uploaded yet — you can send it after booking';
      creativeSection.style.color = 'var(--muted)';
    }
  }

  // Fill campaign goal on Step 4
  const goalInput = document.getElementById('f-goal');
  if (goalInput) goalInput.value = ST.goal || '—';

  // Dashboard stat cards
  const totalWklyImpr = keys.reduce((a,id)=>a+(ST.cart[id]?.wkly_impr||0),0);
  const statsEl = document.getElementById('dash-stats');
  if (statsEl) {
    statsEl.innerHTML = [
      { val: keys.length, lbl: 'Screens booked', icon: '📍' },
      { val: (totalWklyImpr>=1000 ? Math.round(totalWklyImpr/1000)+'K+' : totalWklyImpr.toLocaleString()), lbl: 'Weekly impressions', icon: '👁' },
      { val: durLabel(), lbl: 'Campaign length', icon: '📅' },
      { val: '$'+grand.toLocaleString(), lbl: 'Campaign value', icon: '💰' },
    ].map(s => `
      <div style="border:1px solid var(--border);border-radius:8px;padding:16px;background:var(--white);text-align:center">
        <div style="font-size:22px;margin-bottom:6px">${s.icon}</div>
        <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:3px">${s.val}</div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">${s.lbl}</div>
      </div>`).join('');
  }

  // Screen rows in dashboard
  const rowsEl = document.getElementById('dash-screen-rows');
  if (rowsEl) {
    rowsEl.innerHTML = keys.map(id => {
      const s = ST.cart[id];
      const unitP = Math.round(unitRate(s));
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)">
          <span style="font-size:20px">${s.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;margin-bottom:1px">${s.name}</div>
            <div style="font-size:11px;color:var(--muted)">${s.area} · ${s.impr} · ${s.venue_type||s.type}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'Fraunces',serif;font-size:15px;font-weight:700;color:var(--accent)">$${unitP.toLocaleString()}<span style="font-size:9px;color:var(--muted);font-family:'Instrument Sans',sans-serif">${rateLabel()}</span></div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">CPM $${s.cpm?.toFixed(2)||'—'}</div>
          </div>
          <div style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:10px;background:var(--border);color:var(--muted);flex-shrink:0">Pending</div>
        </div>`;
    }).join('') + `<div style="padding:12px 20px;font-size:11px;color:var(--muted);background:var(--off-white,#f5f0e8)">Status updates once campaign is confirmed and payment received.</div>`;
  }
}


/* ══════════════ CUSTOM SCHEDULE ══════════════ */
function setSchedMode(mode) {
  ST.schedMode = mode;
  document.getElementById('sched-standard').classList.toggle('on', mode==='standard');
  document.getElementById('sched-custom').classList.toggle('on', mode==='custom');
  document.getElementById('standard-sched-wrap').style.display = mode==='standard' ? '' : 'none';
  document.getElementById('custom-sched-wrap').classList.toggle('visible', mode==='custom');
  updateCustomSched();
}

function toggleDay(el) {
  el.classList.toggle('on');
  ST.customDays = [...document.querySelectorAll('.day-btn.on')].map(b => parseInt(b.dataset.day));
  updateCustomSched();
}

function updateCustomSched() {
  const start = document.getElementById('sched-start')?.value;
  const end   = document.getElementById('sched-end')?.value;
  ST.schedStart = start || null;
  ST.schedEnd   = end   || null;

  if (!start || !end || ST.customDays.length === 0) {
    document.getElementById('custom-day-count').textContent = '—';
    document.getElementById('sched-summary-text').textContent = '';
    ST.customDayCount = 0;
    return;
  }

  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  if (e < s) {
    document.getElementById('sched-summary-text').textContent = 'End date must be after start date';
    return;
  }

  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    if (ST.customDays.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }

  ST.customDayCount = count;
  document.getElementById('custom-day-count').textContent = count;

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const selected = ST.customDays.map(d => dayNames[d]).join(' + ');
  const weeks = Math.ceil((e - s) / (7 * 24 * 60 * 60 * 1000));
  document.getElementById('sched-summary-text').textContent =
    `${selected} · ${weeks} week window · ${count} total ad days`;

  // Re-render cart totals
  renderCart();
  updateNavSel();
}

/* customSchedTotalCost moved to /shared/js/pricing.js */


/* ══════════════ PROPOSAL LINK ══════════════ */
async function generateProposalLink() {
  const cartKeys = Object.keys(ST.cart);
  if (cartKeys.length === 0) { alert('Add at least one screen to generate a proposal.'); return; }

  const btn    = document.getElementById('btn-gen-proposal');
  const errEl  = document.getElementById('proposal-link-error');
  const origText = btn ? btn.textContent : '';
  if (btn)   { btn.textContent = 'Generating…'; btn.disabled = true; }
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  const proposalId = crypto.randomUUID();

  // Build cart: inject weeklyRate per screen so the proposals page can display prices
  const cartWithRates = {};
  cartKeys.forEach(id => {
    const s = ST.cart[id];
    cartWithRates[id] = Object.assign({}, s, { weeklyRate: Math.round(unitRate(s)) });
  });

  const payload = {
    id:            proposalId,
    status:        'draft',
    company_name:  ST.advertiserName || '',
    contact_email: AUTH_SESSION?.user?.email || document.getElementById('f-email')?.value?.trim() || '',
    product:       ST.product || '',
    goal:          ST.goal || '',
    sub_intent:    ST.subIntent || '',
    flight_start:  ST.schedStart || null,
    flight_end:    ST.schedEnd   || null,
    budget:        ST.budget     || null,
    cart:          cartWithRates,
    inc:           ST.inc        || 'weekly',
    qty:           ST.qty        || 2,
    sched_mode:    ST.schedMode  || 'standard',
    custom_days:   ST.customDays || [],
    custom_day_count: ST.customDayCount || 0,
  };
  console.log('Proposal payload:', JSON.stringify(payload, null, 2));

  const { error } = await sbClient.from('campaigns').insert(payload);

  if (btn) { btn.textContent = origText; btn.disabled = false; }

  if (error) {
    console.error('Proposal save error:', JSON.stringify(error, null, 2));
    if (errEl) {
      errEl.textContent = 'Could not save proposal: ' + (error.code || '') + (error.code && error.message ? ' — ' : '') + (error.message || 'unknown error');
      errEl.style.display = 'block';
    }
    return;
  }

  const url = 'https://proposals.nwa-ads.com?id=' + proposalId;
  document.getElementById('proposal-link-input').value = url;
  if (btn) btn.style.display = 'none';
  document.getElementById('proposal-link-wrap').style.display = 'flex';
}

function copyProposalLink() {
  const input = document.getElementById('proposal-link-input');
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.getElementById('btn-copy-link');
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy link'; btn.classList.remove('copied'); }, 2500);
  });
}

function loadProposalFromURL() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('proposal');
  if (!encoded) return;

  try {
    const p = JSON.parse(atob(encoded));

    // Restore state
    ST.goal     = p.goal;
    ST.inc      = p.inc      || 'weekly';
    ST.qty      = p.qty      || 2;
    ST.budget   = p.budget   || 2000;
    ST.schedMode      = p.schedMode      || 'standard';
    ST.customDays     = p.customDays     || [];
    ST.schedStart     = p.schedStart     || null;
    ST.schedEnd       = p.schedEnd       || null;
    ST.customDayCount = p.customDayCount || 0;

    // Restore cart
    ST.cart = {};
    (p.screens || []).forEach(id => {
      const s = INV.find(x => x.id === id);
      if (s) ST.cart[id] = s;
    });

    // Show proposal UI
    document.getElementById('proposal-banner').classList.add('visible');
    document.getElementById('proposal-cta').classList.add('visible');

    // Jump to checkout step (proposal view)
    goTo(7);
    populateCheckoutFromProposal(p);

  } catch(e) {
    console.error('Failed to load proposal:', e);
  }
}

function populateCheckoutFromProposal(p) {
  // Pre-fill goal
  const goalEl = document.getElementById('f-goal');
  if (goalEl) goalEl.value = p.goal || '';

  // Show schedule note if custom
  const schedNote = document.getElementById('os-sched-note');
  if (schedNote && p.schedMode === 'custom' && p.customDayCount > 0) {
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const days = (p.customDays||[]).map(d => dayNames[d]).join(' + ');
    schedNote.textContent = `Custom schedule: ${days} · ${p.customDayCount} days`;
    schedNote.style.display = 'block';
  }
  renderCart();
  updateNavSel();
}

function bookFromProposal() {
  // Clear proposal param, scroll to checkout form
  document.getElementById('proposal-cta').style.display = 'none';
  document.getElementById('proposal-banner').style.display = 'none';
  document.getElementById('f-fname')?.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Load proposal on page load
window.addEventListener('DOMContentLoaded', () => {
  loadProposalFromURL();
});
async function submitBooking() {
  // Validate basic fields
  const email = document.getElementById('f-email')?.value.trim();
  const fname = document.getElementById('f-fname')?.value.trim();
  const lname = document.getElementById('f-lname')?.value.trim();
  const company = document.getElementById('advertiser-name')?.value.trim();
  if (!fname || !email) {
    alert('Please fill in your name and email to continue.');
    return;
  }
  if (!AUTH_SESSION) {
    AUTH_PENDING_STEP = 7;
    openAuthModal();
    return;
  }

  const btn = document.querySelector('#panel-7 .btn-next[onclick="submitBooking()"]');
  const btnOrigText = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Submitting…'; }

  const { error } = await sbClient.from('campaigns').insert({
    user_id: AUTH_SESSION.user.id,
    status: 'pending_confirmation',
    company_name: company || null,
    contact_name: [fname, lname].filter(Boolean).join(' '),
    contact_email: email,
    screens: ST.cart,
    budget: ST.budget || null,
    flight_start: ST.schedStart || null,
    flight_end: ST.schedEnd || null,
  });

  if (error) {
    if (btn) { btn.disabled = false; btn.innerHTML = btnOrigText; }
    alert('We couldn\'t submit your booking request: ' + error.message + '\nPlease try again.');
    return;
  }

  goTo(8);
}

