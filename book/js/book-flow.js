/* cache-bust: 2026-07-13 */
function goToPanel(step) {
  updateNavSel();
  for (let i=1;i<=8;i++) {
    document.getElementById('panel-'+i)?.classList.remove('active');
    const nav = document.getElementById('nav-s'+i);
    const dot = document.getElementById('dot-'+i);
    if (!nav) continue;
    nav.classList.remove('active','done');
    if (i<step) { nav.classList.add('done'); if(dot) dot.textContent='✓'; }
    else if (i===step) { nav.classList.add('active'); if(dot) dot.textContent=i; }
    else { if(dot) dot.textContent=i; }
  }
  const panel = document.getElementById('panel-'+step);
  if (panel) panel.classList.add('active');
  window.scrollTo(0,0);
}

function goTo(step) {
  // Require a signed-in account before leaving Step 2 (Details) — campaign
  // & contact info should tie to a real account, not just live in the form.
  if (step >= 3 && !AUTH_SESSION) {
    AUTH_PENDING_STEP = step;
    openAuthModal();
    return;
  }
  // Require business + contact details (Step 2) before advancing to Step 3+
  if (step >= 3) {
    const reqFields = [
      {id:'advertiser-name', ph:'Please enter your business name to continue'},
      {id:'f-fname', ph:'Please enter your first name'},
      {id:'f-lname', ph:'Please enter your last name'},
      {id:'f-email', ph:'Please enter a valid email', email:true},
    ];
    let firstInvalid = null;
    reqFields.forEach(f => {
      const el = document.getElementById(f.id);
      if (!el) return;
      const val = (el.value||'').trim();
      const invalid = !val || (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
      el.style.borderColor = invalid ? '#c8440a' : '#e2ddd6';
      if (invalid) {
        el.placeholder = f.ph;
        el.style.animation = 'shake 0.3s ease';
        setTimeout(() => { el.style.animation = ''; }, 400);
        if (!firstInvalid) firstInvalid = el;
      }
    });
    if (firstInvalid) {
      goToPanel(2);
      firstInvalid.focus();
      return;
    }
    ST.advertiserName = document.getElementById('advertiser-name').value.trim();
  }

  goToPanel(step);

  if (step===3) {
    initBudgetSlider();
    const isWalmart = ST.goal === "Reach Walmart & Sam's Club buyers";
    const isFoot    = ST.goal === 'Drive customers through your door';
    const isTech    = ST.goal === 'Reach the NWA Tech & Startup Scene';

    const p3walmart = document.getElementById('p3-walmart-timing');
    const p3foot    = document.getElementById('p3-foot-timing');
    const p3tech    = document.getElementById('p3-tech-timing');

    if (p3walmart) p3walmart.style.display = isWalmart ? '' : 'none';
    if (p3foot)    p3foot.style.display    = isFoot    ? '' : 'none';
    if (p3tech)    p3tech.style.display    = isTech    ? '' : 'none';

    if (isWalmart && p3walmart) {
      p3walmart.querySelectorAll('.ft-status-pill').forEach(p => {
        p.classList.toggle('on', p.textContent.trim() === ST.subIntent);
      });
      if (ST.subIntent) renderWalmartSubflow(ST.subIntent);
      else { ST.subIntent = 'Line review season'; renderWalmartSubflow('Line review season'); }
    }
    if (isFoot && p3foot) {
      p3foot.querySelectorAll('.ft-status-pill').forEach(p => {
        p.classList.toggle('on', p.textContent.trim() === ST.subIntent);
      });
      if (ST.subIntent) renderFootSubflow(ST.subIntent);
      else { ST.subIntent = 'Store opening or coming soon'; renderFootSubflow('Store opening or coming soon'); }
    }
    if (isTech && p3tech) {
      p3tech.querySelectorAll('.ft-status-pill').forEach(p => {
        p.classList.toggle('on', p.textContent.trim() === ST.subIntent);
      });
      if (ST.subIntent) renderTechSubflow(ST.subIntent);
      else { ST.subIntent = 'General brand awareness'; renderTechSubflow('General brand awareness'); }
    }
  }

  if (step===4) {
    document.getElementById('cb-goal').textContent = ST.goal||'—';
    const incShort = {'daily':'day','weekly':'wk','monthly':'mo'};
    document.getElementById('cb-bud').textContent = '$'+ST.budget.toLocaleString()+'/'+incShort[ST.inc];
    document.getElementById('cb-dur').textContent = durLabel();

    // Goal-contextual Step 2 header
    const s2title = document.getElementById('s2-title-text');
    const s2hint  = document.getElementById('s2-hint-text');
    renderTargetingLine();
    if (ST.goal === "Reach Walmart & Sam's Club buyers") {
      if (s2title) s2title.textContent = 'Screens near Walmart & Sam\'s Club HQ';
      if (s2hint)  s2hint.textContent  = 'Screens filtered to 3 buyer zones: Home Office area, Downtown Bentonville, and Pinnacle Hills — billboard, cinema, gym, dining, sports & recreation';
      ST.filter = 'walmart_hq_2mi';
    } else if (ST.goal === 'Drive customers through your door') {
      if (s2title) s2title.textContent = 'Screens closest to your location';
      if (s2hint)  s2hint.textContent  = 'Sorted by proximity to your business — nearest screens first';
      ST.filter = 'all';
    } else if (ST.goal === 'Reach the NWA Tech & Startup Scene') {
      if (s2title) s2title.textContent = 'NWA Tech & Innovation Corridor';
      if (s2hint)  s2hint.textContent  = 'Billboard-first plan across Bentonville, Rogers & Fayetteville — gym & dining screens fill remaining budget';
      ST.filter = 'all';
    } else {
      if (s2title) s2title.textContent = 'Pick your screens';
      if (s2hint)  s2hint.textContent  = '';
      ST.filter = 'all';
    }

    updateBreadcrumb();
    renderHeaderZonePills();
    updateNavCartSummary();

    renderList();
    renderCart();
    initMap();
    // Idempotent: re-run every time step 2 becomes active (not just on first
    // map init) so the marker set always matches the current goal/filter and
    // the map is never left blank on repeat visits.
    refreshMarkers();
    setView('map');
    showOptimizer();
    // Invalidate map size after layout settles on mobile
    setTimeout(() => { if (map) map.invalidateSize(true); }, 300);
    // Render heatmap + auto-suggest recommendations for all goals
    setTimeout(() => {
      renderWmtHeatmap();
      const recs = fallbackRecommend();
      if (recs.length > 0) {
        optRecommended = recs;
        const total = recs.reduce((t, s) => t + screenRate(s), 0);
        const pct   = Math.round(total / (ST.budget||1) * 100);
        const el    = document.getElementById('opt-reason');
        if (el && !el.querySelector('div')) {
          el.textContent = recs.length + ' screen'
            + (recs.length !== 1 ? 's' : '')
            + ' recommended · $' + total.toLocaleString()
            + '/wk (' + pct + '% of your $'
            + (ST.budget||0).toLocaleString() + ' budget)';
        }
        renderOptimizerBasket();
        const results  = document.getElementById('opt-results');
        const thinking = document.getElementById('opt-thinking');
        if (results)  results.classList.add('visible');
        if (thinking) thinking.classList.remove('visible');
      }
    }, 500);

    // Auto-draw proximity ring for foot traffic / event if target already set
    if ((ST.goal === 'Drive customers through your door') && ST.proximityTarget) {
      setTimeout(() => { drawProximityRing(ST.proximityTarget); renderList(); }, 400);
    }
    // Auto-draw Walmart HQ ring for Walmart goal
    if (ST.goal === "Reach Walmart & Sam's Club buyers") {
      setTimeout(() => {
        const walmartHQ = { lat: 36.3729, lng: -94.2192, name: 'Walmart Home Office', icon: '🏢' };
        drawProximityRing(walmartHQ);
        map.flyTo([36.3729, -94.2192], 13, { duration: 0.8 });
      }, 400);
    }
  }
  if (step===5) renderCart();
  if (step===6) updateCreativeSummary();
  if (step===7) {
    renderSummary();
    const coAdv = document.getElementById('co-advertiser-display');
    if (coAdv) coAdv.textContent = ST.advertiserName || 'Campaign summary';
    renderCheckoutRecap();
  }
  if (step===8) renderConfirm();
}

function renderCheckoutRecap() {
  const fname = document.getElementById('f-fname')?.value.trim() || '';
  const lname = document.getElementById('f-lname')?.value.trim() || '';
  const email = document.getElementById('f-email')?.value.trim() || '';
  const company = document.getElementById('advertiser-name')?.value.trim() || '';
  const nameEl = document.getElementById('co-recap-name');
  const companyEl = document.getElementById('co-recap-company');
  const emailEl = document.getElementById('co-recap-email');
  if (nameEl) nameEl.textContent = (fname || lname) ? (fname + ' ' + lname).trim() : '—';
  if (companyEl) companyEl.textContent = company || '—';
  if (emailEl) emailEl.textContent = email || '—';
}

/* ══════════════ VIEW TOGGLE (map ↔ list) ══════════════ */
function setTab(tab) { /* stub */ }
function setView(v) {
  ST.view = v;

  const mapBtn  = document.getElementById('vt-map');
  const listBtn = document.getElementById('vt-list');
  if (mapBtn)  mapBtn.classList.toggle('on',  v === 'map');
  if (listBtn) listBtn.classList.toggle('on', v === 'list');

  const sidebar = document.querySelector('.s2-side');
  const mapWrap = document.getElementById('map');
  const optPanel = document.getElementById('opt-panel');

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // Mobile: hide one panel, show the other
    if (sidebar) sidebar.style.display = v === 'list' ? 'flex' : 'none';
    if (mapWrap) mapWrap.style.display = v === 'map'  ? 'block' : 'none';
    if (v === 'map' && map) setTimeout(() => map.invalidateSize(true), 50);
  } else {
    if (v === 'list') {
      if (mapWrap) mapWrap.style.display = 'none';
      if (sidebar) { sidebar.style.display = 'flex'; sidebar.style.width = '100%'; sidebar.style.borderLeft = 'none'; }
      showState('browse');
    } else {
      if (mapWrap) mapWrap.style.display = 'block';
      if (sidebar) { sidebar.style.display = 'flex'; sidebar.style.width = '380px'; sidebar.style.borderLeft = '1px solid var(--border)'; }
      showState('rec');
      if (map) setTimeout(() => map.invalidateSize(true), 100);
    }
  }
}

/* ══════════════ INIT ══════════════ */
renderList();

/* ══════════════ DETAIL DRAWER ══════════════ */
let drawerScreenId = null;

function openDrawer(id) {
  drawerScreenId = id;
  const s = INV.find(x => x.id === id);
  if (!s) return;
  renderDrawer(s);
  document.getElementById('detail-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('detail-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  document.body.style.overflow = '';
  drawerScreenId = null;
}

function drawerToggleCart() {
  if (!drawerScreenId) return;
  toggleScreen(drawerScreenId);
  // Update button state
  const s = INV.find(x => x.id === drawerScreenId);
  if (s) updateDrawerAddBtn(s);
}

function updateDrawerAddBtn(s) {
  const btn = document.getElementById('btn-dd-add');
  if (!btn) return;
  const inCart = !!ST.cart[s.id];
  btn.textContent = inCart ? '✓ Added to campaign — remove' : '+ Add to campaign';
  btn.classList.toggle('added', inCart);
}

function renderDrawer(s) {
  const inCart = !!ST.cart[s.id];

  // Photo
  const img = document.getElementById('dd-photo');
  const fallback = document.getElementById('dd-photo-fallback');
  const photoSrc = resolveScreenImg(s);
  if (photoSrc) {
    img.style.display = 'block';
    fallback.style.display = 'none';
    img.src = photoSrc;
    img.alt = s.name;
  } else {
    img.style.display = 'none';
    fallback.style.display = 'flex';
    document.getElementById('dd-fallback-icon').textContent = s.icon;
    document.getElementById('dd-fallback-label').textContent = s.venue_type;
  }

  // Badges
  const _ddBadgeEl = document.getElementById('dd-type-badge');
  const _ddBadgeText = s.venue_type || s.label || s.type;
  const _ddVenueKey = s.venue_type || s.type;
  _ddBadgeEl.innerHTML = makeIconHtml(_ddVenueKey, 18) + '<span style="margin-left:5px">' + _ddBadgeText + '</span>';
  _ddBadgeEl.style.cssText = 'display:inline-flex;align-items:center;background:' + venueColor(_ddVenueKey) + 'dd;color:#fff;font-size:10px;font-weight:700;padding:3px 8px 3px 4px;border-radius:20px;letter-spacing:0.3px;';
  document.getElementById('dd-owner-badge').style.display = "none";

  // Rate confirmation badge — green "Confirmed rate" for rate_source values
  // ending in "_confirmed" or the exact scraped-real-impressions source;
  // everything else (venue-type averages, unconfirmed models) is an estimate.
  const rateBadgeEl = document.getElementById('dd-rate-badge');
  if (rateBadgeEl) {
    const rs = s.rate_source || '';
    const isConfirmedRate = rs.endsWith('_confirmed') || rs === 'lamar_scraped_real_impressions';
    rateBadgeEl.textContent = isConfirmedRate ? '✓ Confirmed rate' : '≈ Estimated rate';
    rateBadgeEl.className = 'dd-pbadge ' + (isConfirmedRate ? 'rate-confirmed' : 'rate-estimate');
  }

  // Header
  document.getElementById('dd-venue-type').textContent = s.venue_type;
  const descEl = document.getElementById('dd-desc');
  descEl.textContent = s.description || '';
  descEl.style.display = s.description ? 'block' : 'none';
  document.getElementById('dd-name').textContent = s.full_name || s.name;
  // Corridor + HQ distance lines now always render (previously gated behind
  // the specific Walmart/proximity goal), plus the goal-specific proximity
  // line stays on top when that goal is active.
  const goalDistStr = (ST.goal==='Drive customers through your door')&&ST.proximityTarget
    ? ' · 📍 ' + distLabel(haversineMiles(ST.proximityTarget.lat,ST.proximityTarget.lng,s.lat,s.lng)) + ' from ' + ST.proximityTarget.name.split('–')[0].trim()
    : '';
  const hqDist = distLabel(haversineMiles(WALMART_HQ.lat,WALMART_HQ.lng,s.lat,s.lng));
  const corridorDist = distLabel(haversineMiles(WMT_ZONES[1].lat,WMT_ZONES[1].lng,s.lat,s.lng));
  const alwaysDistStr = ' · 🏢 ' + hqDist + ' from Walmart HQ · 📍 ' + corridorDist + ' from Residential Corridor';
  document.getElementById('dd-area').textContent = s.area + (s.zip ? ' · ' + s.zip : '') + goalDistStr + alwaysDistStr;

  // Links
  const linksEl = document.getElementById('dd-links');
  linksEl.innerHTML = `
    <a class="dd-link" href="${s.sv_url}" target="_blank" rel="noopener">
      📍 Street View
    </a>
    <a class="dd-link" href="${s.maps_url}" target="_blank" rel="noopener">
      🗺 Google Maps
    </a>
    ${(s.video === true || s.video === 'Y') ? '<span class="dd-link">▶ Video supported</span>' : ''}
    ${(s.audio === true || s.audio === 'Y') ? '<span class="dd-link">🔊 Audio supported</span>' : ''}
  `;

  // Stats
  const statsEl = document.getElementById('dd-stats');
  const weeklyImprFmt = s.wkly_impr >= 1000 ? Math.round(s.wkly_impr/1000) + 'K+' : s.wkly_impr.toLocaleString();
  const dailyImprFmt  = s.daily_impr >= 1000 ? Math.round(s.daily_impr/1000) + 'K+' : s.daily_impr.toLocaleString();
  statsEl.innerHTML = `
    <div class="dd-stat"><span class="dsv">${dailyImprFmt}</span><span class="dsl">Daily impressions</span></div>
    <div class="dd-stat"><span class="dsv">${weeklyImprFmt}</span><span class="dsl">Weekly impressions</span></div>
    <div class="dd-stat"><span class="dsv">$${s.cpm.toFixed(2)}</span><span class="dsl">CPM</span></div>
  `;

  // Rates — highlight active increment
  const ratesEl = document.getElementById('dd-rates');
  ratesEl.innerHTML = `
    <div class="dd-rate ${ST.inc==='daily'?'active':''}">
      <span class="drv">$${s.daily_rate.toLocaleString()}</span>
      <span class="drl">Per day</span>
    </div>
    <div class="dd-rate ${ST.inc==='weekly'?'active':''}">
      <span class="drv">$${s.wkly_rate.toLocaleString()}</span>
      <span class="drl">Per week</span>
    </div>
    <div class="dd-rate ${ST.inc==='monthly'?'active':''}">
      <span class="drv">$${s.mo_rate.toLocaleString()}</span>
      <span class="drl">Per month</span>
    </div>
  `;

  // Nearby landmarks — computed live from NWA_POIS via haversine distance
  // (previously a static free-text `s.pois` list per record; now real
  // distance-ranked landmarks so it stays correct regardless of the
  // inventory data source). "Landmarks first" = closest results first.
  const poisEl = document.getElementById('dd-pois');
  const nearestPois = NWA_POIS
    .map(p => ({ ...p, dist: haversineMiles(s.lat, s.lng, p.lat, p.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6);
  poisEl.innerHTML = nearestPois.map(p => {
    return `<div class="dd-poi"><span class="dd-poi-icon">${p.icon || '📍'}</span> ${p.name} <span style="color:var(--muted)">· ${distLabel(p.dist)}</span></div>`;
  }).join('');

  // Specs
  const specsEl = document.getElementById('dd-specs');
  specsEl.innerHTML = `
    <div class="dd-spec"><div class="dsk">Resolution</div><div class="dsv2">${s.spec_res || (s.w && s.h ? s.w + '×' + s.h + 'px' : '—')}</div></div>
    <div class="dd-spec"><div class="dsk">Ad duration</div><div class="dsv2">${s.spec_dur || (s.ad_duration ? s.ad_duration + 's' : (s.duration ? s.duration + 's' : '—'))}</div></div>
    <div class="dd-spec"><div class="dsk">Loop frequency</div><div class="dsv2">${s.spec_loop || '—'}</div></div>
    <div class="dd-spec"><div class="dsk">Screens / faces</div><div class="dsv2">${s.faces || 1} ${(s.faces || 1) > 1 ? 'screens' : 'face'}</div></div>
    <div class="dd-spec"><div class="dsk">Video</div><div class="dsv2">${(s.video === true || s.video === 'Y') ? '✓ Supported' : '✗ Static only'}</div></div>
    <div class="dd-spec"><div class="dsk">Audio</div><div class="dsv2">${(s.audio === true || s.audio === 'Y') ? '✓ Supported' : '✗ No audio'}</div></div>
  `;

  // CTA button
  updateDrawerAddBtn(s);
}


/* ══════════════ FOOT TRAFFIC / PROXIMITY ══════════════ */
let ftActiveCat = 'All';
let ftQuery = '';
let proximityRing = null;
let proximityMarker = null;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  return haversineKm(lat1, lng1, lat2, lng2) * 0.621371;
}

function distLabel(miles) {
  if (miles < 0.1) return '< 0.1 mi';
  if (miles < 10)  return miles.toFixed(1) + ' mi';
  return Math.round(miles) + ' mi';
}

function proxClass(miles) {
  if (miles <= 2)  return 'close';
  if (miles <= 7)  return 'medium';
  return 'far';
}

/* ── Render POI grid ── */
function ftRenderGrid() {
  // Ordered categories — most useful for advertisers first
  const catOrder = ['All','Retail','Food & Drink','Fitness','Hotel','Healthcare','Corporate',
    'Grocery','Entertainment','Sports','Arts & Culture','Outdoors','Education',
    'Auto','Real Estate','Pharmacy','Government','Religious','Airport'];
  const allCats = ['All', ...new Set(NWA_POIS.map(p => p.cat))];
  const cats = [...catOrder.filter(c => allCats.includes(c)),
                 ...allCats.filter(c => !catOrder.includes(c))];

  // Render category pills (once)
  const catEl = document.getElementById('ft-cats');
  if (!catEl.childElementCount) {
    catEl.innerHTML = cats.map(c =>
      `<div class="ft-cat${c===ftActiveCat?' on':''}" onclick="ftSetCat(this,'${c}')">${c}</div>`
    ).join('');
  }

  const q = ftQuery.toLowerCase();
  const filtered = NWA_POIS.filter(p => {
    const matchCat = ftActiveCat === 'All' || p.cat === ftActiveCat;
    const matchQ   = !q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const grid = document.getElementById('ft-poi-grid');
  const selId = ST.proximityTarget ? ST.proximityTarget.id : null;

  // Result count
  let countEl = document.getElementById('ft-result-count');
  if (!countEl) {
    countEl = document.createElement('div');
    countEl.id = 'ft-result-count';
    countEl.className = 'ft-result-count';
    grid.parentNode.insertBefore(countEl, grid);
  }
  countEl.textContent = filtered.length === NWA_POIS.length
    ? `${filtered.length} locations`
    : `${filtered.length} of ${NWA_POIS.length} locations`;

  grid.innerHTML = filtered.map(p => `
    <div class="ft-poi-card${p.id === selId ? ' selected' : ''}" onclick="ftSelectPOI('${p.id}')">
      <span class="ft-poi-icon">${p.icon}</span>
      <div>
        <div class="ft-poi-name">${p.name}</div>
        <div class="ft-poi-cat">${p.cat}</div>
      </div>
    </div>
  `).join('');
}

function ftSetCat(el, cat) {
  ftActiveCat = cat;
  document.querySelectorAll('.ft-cat').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  ftQuery = ''; // clear search when switching category
  const searchEl = document.getElementById('ft-search');
  if (searchEl) searchEl.value = '';
  ftRenderGrid();
}

/* ftFilter is defined below in the AI search section */

function ftSelectPOI(id) {
  const poi = NWA_POIS.find(p => p.id === id);
  if (!poi) return;
  ST.proximityTarget = poi;

  // Update selected bar
  document.getElementById('ft-sel-icon').textContent = poi.icon;
  document.getElementById('ft-sel-name').textContent = poi.name;
  document.getElementById('ft-selected-bar').classList.add('visible');

  ftRenderGrid(); // re-render to show selection highlight
  // If user is already on Step 2, redraw immediately
  if (map) {
    drawProximityRing(poi);
    renderList();
    refreshMarkers();
  }
}

function ftClearTarget() {
  ST.proximityTarget = null;
  document.getElementById('ft-selected-bar').classList.remove('visible');
  document.getElementById('ft-sel-name').textContent = 'No location selected';
  const metaEl = document.getElementById('ft-sel-meta');
  if (metaEl) metaEl.textContent = '';
  ftQuery = ''; ftLastQuery = '';
  const searchEl = document.getElementById('ft-search');
  if (searchEl) searchEl.value = '';
  // Reset business fields
  ['ft-custom-name','ft-custom-addr'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  ftGeocodedCoords = null;
  setGeocodeStatus('','');
  // Reset event fields
  ['ft-event-name','ft-event-addr','ft-event-date'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  ftEventCoords = null;
  setEventGeocodeStatus('','');
  hideAiResults();
  document.getElementById('ft-divider').style.display = 'none';
  ftRenderGrid();
  if (proximityRing && map) { map.removeLayer(proximityRing); proximityRing = null; }
  if (proximityMarker && map) { map.removeLayer(proximityMarker); proximityMarker = null; }
  const sortNote = document.getElementById('prox-sort-note');
  if (sortNote) sortNote.classList.remove('visible');
  renderList();
}

/* ── Show/hide foot traffic panel based on goal ── */
function updateFtPanel(goal) {
  const panel = document.getElementById('ft-panel');
  const isTraffic = goal === 'Drive customers through your door';
  const isEvent   = false; // event path merged into foot traffic sub-intent
  // Walmart and Brand goals get the insight card but not the location-pin panel
  if (!isTraffic) {
    panel.classList.remove('visible');
    return;
  }

  panel.classList.add('visible');

  // Only show traffic section
  document.getElementById('ft-traffic-section').style.display = 'block';
  document.getElementById('ft-event-section').style.display   = 'none';

  // Header copy
  document.getElementById('ft-head-icon').textContent  = '📍';
  document.getElementById('ft-head-title').textContent = 'Where are you driving traffic to?';
  document.getElementById('ft-head-sub').textContent   = 'Pin your business address — coming-soon locations welcome. Screens will be sorted by proximity.';

  ftRenderGrid();
}

/* ── Draw proximity ring on map ── */
function drawProximityRing(poi) {
  if (!map) return;
  if (proximityRing) map.removeLayer(proximityRing);
  if (proximityMarker) map.removeLayer(proximityMarker);

  // Ring at 3 miles radius
  proximityRing = L.circle([poi.lat, poi.lng], {
    radius: 4828, // 3 miles in metres
    color: '#c8440a',
    fillColor: '#c8440a',
    fillOpacity: 0.05,
    weight: 2,
    dashArray: '6 4',
    className: 'leaflet-proximity-ring'
  }).addTo(map);

  // Target marker
  const targetIcon = L.divIcon({
    className: '',
    html: `<div style="background:#c8440a;color:#fff;padding:5px 10px;border-radius:20px;font-family:'Instrument Sans',sans-serif;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff">${poi.icon} ${poi.name.split('–')[0].trim()}</div>`,
    iconAnchor: [0, 0]
  });
  proximityMarker = L.marker([poi.lat, poi.lng], { icon: targetIcon, zIndexOffset: 1000 }).addTo(map);

  map.flyTo([poi.lat, poi.lng], 12, { duration: 0.8 });
}

/* ── Sort inventory by proximity ── */
function sortedByProximity(items) {
  if (!ST.proximityTarget) return items;
  const { lat, lng } = ST.proximityTarget;
  return [...items].sort((a, b) =>
    haversineMiles(lat, lng, a.lat, a.lng) - haversineMiles(lat, lng, b.lat, b.lng)
  );
}

function sortByWalmartHQ(items) {
  return [...items].sort((a, b) =>
    haversineMiles(WALMART_HQ.lat, WALMART_HQ.lng, a.lat, a.lng) -
    haversineMiles(WALMART_HQ.lat, WALMART_HQ.lng, b.lat, b.lng)
  );
}


/* ══════════════ AI POI SEARCH (Claude API) ══════════════ */
let ftAiDebounce = null;
let ftAiResults = [];
let ftLastQuery = '';

/* Called on every keystroke in the search box */
function ftFilter(q) {
  ftQuery = q;
  ftRenderGrid(); // always update static list instantly

  clearTimeout(ftAiDebounce);

  const trimmed = q.trim();

  // Hide AI results when query is cleared
  if (!trimmed) {
    hideAiResults();
    document.getElementById('ft-divider').style.display = 'none';
    return;
  }

  // If query matches enough static results, no need for AI
  const staticMatches = NWA_POIS.filter(p =>
    p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
    p.cat.toLowerCase().includes(trimmed.toLowerCase())
  );

  if (staticMatches.length >= 4) {
    hideAiResults();
    document.getElementById('ft-divider').style.display = 'none';
    return;
  }

  // Debounce — wait 600ms after user stops typing
  ftAiDebounce = setTimeout(() => ftAiSearch(trimmed), 600);
}

function hideAiResults() {
  document.getElementById('ft-ai-loading').classList.remove('visible');
  document.getElementById('ft-ai-results').classList.remove('visible');
  ftAiResults = [];
}

async function ftAiSearch(query) {
  if (query === ftLastQuery) return;
  ftLastQuery = query;

  // Show loading state
  document.getElementById('ft-ai-loading').classList.add('visible');
  document.getElementById('ft-ai-loading-text').textContent = `Finding "${query}" in NWA…`;
  document.getElementById('ft-ai-results').classList.remove('visible');
  document.getElementById('ft-divider').style.display = 'flex';

  const goal = ST.goal || 'general advertising';
  const prompt = `You are a local business database for Northwest Arkansas (NWA), covering Bentonville, Rogers, Fayetteville, Springdale, Lowell, and surrounding areas.

A user is searching for: "${query}"
Their campaign goal is: "${goal}"

Return up to 4 real, specific local businesses or landmarks in NWA that best match this search. For each, provide:
- A real business name (as specific as possible — include the neighborhood or city if the name is generic)
- Business category (one of: Retail, Food & Drink, Fitness, Hotel, Healthcare, Corporate, Grocery, Entertainment, Sports, Arts & Culture, Outdoors, Education, Auto, Real Estate, Pharmacy, Government, Religious, Airport)
- A single emoji icon that represents the business type
- Approximate latitude and longitude coordinates within the NWA region (lat range: 36.00–36.55, lng range: -94.55 to -93.70)
- A one-line description (max 60 chars)

Respond ONLY with valid JSON array, no explanation, no markdown. Example format:
[{"name":"Onyx Coffee Lab – Bentonville","cat":"Food & Drink","icon":"☕","lat":36.3742,"lng":-94.2089,"desc":"Specialty coffee roaster, downtown Bentonville"},{"name":"Life Time Fitness – Rogers","cat":"Fitness","icon":"💪","lat":36.3089,"lng":-94.1812,"desc":"Premium fitness club, Pinnacle Hills"}]

If you cannot find real matches in NWA, return an empty array: []`;

  try {
    const response = await fetch('/.netlify/functions/anthropic-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error('proxy ' + response.status);

    const data = await response.json();
    if (!data.content) throw new Error('no content');
    const text = (data.content || []).find(b => b.type === 'text')?.text || '[]';

    // Parse JSON — strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, '').trim();
    const results = JSON.parse(clean);

    ftAiResults = results.map((r, i) => ({
      id: `ai_${Date.now()}_${i}`,
      name: r.name,
      cat: r.cat || 'Local Business',
      icon: r.icon || '📍',
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      desc: r.desc || '',
      isAi: true
    }));

    document.getElementById('ft-ai-loading').classList.remove('visible');

    if (ftAiResults.length > 0) {
      renderAiResults();
    } else {
      document.getElementById('ft-ai-results').classList.remove('visible');
      document.getElementById('ft-divider').style.display = 'none';
    }

  } catch (err) {
    console.warn('AI POI search failed:', err);
    document.getElementById('ft-ai-loading').classList.remove('visible');
    document.getElementById('ft-divider').style.display = 'none';
  }
}

function renderAiResults() {
  const container = document.getElementById('ft-ai-cards');
  const selId = ST.proximityTarget ? ST.proximityTarget.id : null;

  container.innerHTML = ftAiResults.map(p => `
    <div class="ft-ai-card${p.id === selId ? ' selected' : ''}" onclick="ftSelectAiPOI('${p.id}')">
      <span class="ft-ai-icon">${p.icon}</span>
      <div>
        <div class="ft-ai-name">${p.name}</div>
        <div class="ft-ai-sub">${p.cat}${p.desc ? ' · ' + p.desc : ''}</div>
      </div>
      <span class="ft-ai-badge">AI</span>
    </div>
  `).join('');

  document.getElementById('ft-ai-results').classList.add('visible');
}

function ftSelectAiPOI(id) {
  const poi = ftAiResults.find(p => p.id === id);
  if (!poi) return;

  // Treat exactly like a static POI selection
  ST.proximityTarget = poi;
  document.getElementById('ft-sel-icon').textContent = poi.icon;
  document.getElementById('ft-sel-name').textContent = poi.name;
  document.getElementById('ft-selected-bar').classList.add('visible');

  // Re-render AI cards to show selection
  renderAiResults();
  ftRenderGrid();

  // Update map
  if (map) {
    drawProximityRing(poi);
    renderList();
    refreshMarkers();
  }
}


/* ══════════════ CUSTOM POI ══════════════ */
let ftCustomStatus = 'open';
let ftGeocodedCoords = null;
let ftGeoDebounce = null;

const STATUS_ICONS = {
  open:        { icon: '🟢', label: 'Open' },
  coming_soon: { icon: '🔜', label: 'Coming soon' },
  pre_launch:  { icon: '🚀', label: 'Pre-launch' },
  soft_open:   { icon: '🌅', label: 'Soft open' },
};

function ftToggleCustom() {
  const toggle = document.getElementById('ft-custom-toggle');
  const panel  = document.getElementById('ft-custom-panel');
  toggle.classList.toggle('open');
  panel.classList.toggle('open');
}

function ftSetStatus(el, status) {
  ftCustomStatus = status;
  document.querySelectorAll('.ft-status-pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');

  // Show a helpful note for pre-launch statuses
  const noteEl = document.getElementById('ft-geocode-status');
  if (status !== 'open') {
    noteEl.className = 'ft-geocode-status success';
    noteEl.textContent = `${STATUS_ICONS[status].icon} "${STATUS_ICONS[status].label}" businesses still benefit from OOH — screens along commuter routes build awareness before you open.`;
    noteEl.style.display = 'block';
  } else if (!ftGeocodedCoords) {
    noteEl.style.display = 'none';
  }
}

function ftCustomAddrChanged() {
  const addr = document.getElementById('ft-custom-addr').value.trim();
  ftGeocodedCoords = null;
  clearTimeout(ftGeoDebounce);

  if (addr.length < 8) {
    setGeocodeStatus('', '');
    return;
  }

  setGeocodeStatus('loading', '🔍 Looking up address…');

  ftGeoDebounce = setTimeout(() => ftGeocode(addr), 700);
}

function setGeocodeStatus(type, msg) {
  const el = document.getElementById('ft-geocode-status');
  el.className = 'ft-geocode-status' + (type ? ' ' + type : '');
  el.textContent = msg;
  el.style.display = type ? 'block' : 'none';
}

/* Shared geocoder — Census Bureau primary, Photon fallback, no API key needed */
async function geocodeAddress(address) {
  // Ensure Arkansas context if no state mentioned
  const withState = /\b(AR|Arkansas|MO|Missouri|OK|Oklahoma)\b/i.test(address)
    ? address
    : address + ', AR';

  /* --- 1. US Census Bureau Geocoder (free, no key, great for US street addresses) --- */
  try {
    const censusUrl = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?' +
      'benchmark=Public_AR_Current&format=json&address=' + encodeURIComponent(withState);
    const r = await fetch(censusUrl);
    const d = await r.json();
    const matches = d?.result?.addressMatches;
    if (matches && matches.length > 0) {
      const m = matches[0];
      const lat = parseFloat(m.coordinates.y);
      const lng = parseFloat(m.coordinates.x);
      // Sanity-check: must be within NWA bounding box
      if (lat >= 35.9 && lat <= 36.6 && lng >= -94.6 && lng <= -93.6) {
        return { lat, lng, display: m.matchedAddress };
      }
      // Outside NWA but still a valid US address — allow it with a note
      return { lat, lng, display: m.matchedAddress };
    }
  } catch (e) { /* fall through to Photon */ }

  /* --- 2. Photon (Komoot) — OSM-based, no key, good CORS --- */
  try {
    const photonUrl = 'https://photon.komoot.io/api/?limit=1&lang=en' +
      '&bbox=-94.6,35.9,-93.6,36.6' +
      '&q=' + encodeURIComponent(withState);
    const r2 = await fetch(photonUrl);
    const d2 = await r2.json();
    const feat = d2?.features?.[0];
    if (feat) {
      const [lng, lat] = feat.geometry.coordinates;
      const p = feat.properties;
      const display = [p.name, p.street, p.city, p.state].filter(Boolean).join(', ');
      return { lat, lng, display };
    }
  } catch (e) { /* fall through */ }

  return null; // both failed
}

async function ftGeocode(address) {
  try {
    const result = await geocodeAddress(address);
    if (result) {
      ftGeocodedCoords = { lat: result.lat, lng: result.lng };
      setGeocodeStatus('success', '\u2713 Found: ' + result.display);
    } else {
      setGeocodeStatus('error', '\u26a0 Address not found \u2014 try adding city and state, e.g. "1803 S 46th St, Rogers, AR"');
    }
  } catch (err) {
    setGeocodeStatus('error', '\u26a0 Could not look up address \u2014 check your connection and try again');
  }
}

function ftPinCustom() {
  const nameVal = document.getElementById('ft-custom-name').value.trim();
  const addrVal = document.getElementById('ft-custom-addr').value.trim();

  if (!nameVal) {
    document.getElementById('ft-custom-name').focus();
    setGeocodeStatus('error', '⚠ Please enter a business name');
    return;
  }
  if (!addrVal) {
    document.getElementById('ft-custom-addr').focus();
    setGeocodeStatus('error', '⚠ Please enter an address');
    return;
  }
  if (!ftGeocodedCoords) {
    setGeocodeStatus('error', '⚠ Waiting for address lookup — try again in a moment');
    ftGeocode(addrVal);
    return;
  }

  const statusInfo = STATUS_ICONS[ftCustomStatus] || STATUS_ICONS['open'];
  const businessIcon = guessBusinessIcon(nameVal);

  const customPoi = {
    id: `custom_${Date.now()}`,
    name: nameVal + (ftCustomStatus !== 'open' ? ` (${statusInfo.label})` : ''),
    cat: 'Custom',
    icon: businessIcon,
    lat: ftGeocodedCoords.lat,
    lng: ftGeocodedCoords.lng,
    isCustom: true,
    status: ftCustomStatus,
  };

  // Select it immediately
  ST.proximityTarget = customPoi;
  document.getElementById('ft-sel-icon').textContent = customPoi.icon;
  document.getElementById('ft-sel-name').textContent = customPoi.name;
  document.getElementById('ft-selected-bar').classList.add('visible');

  // Close the custom panel
  document.getElementById('ft-custom-toggle').classList.remove('open');
  document.getElementById('ft-custom-panel').classList.remove('open');

  // Update map and screen list
  if (map) {
    drawProximityRing(customPoi);
    renderList();
    refreshMarkers();
  }

  setGeocodeStatus('success', `📌 Pinned! Screens below are now sorted by proximity to ${nameVal}.`);
}

function guessBusinessIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('coffee') || n.includes('café') || n.includes('cafe') || n.includes('brew')) return '☕';
  if (n.includes('restaurant') || n.includes('grill') || n.includes('kitchen') || n.includes('bistro')) return '🍽';
  if (n.includes('bar') || n.includes('pub') || n.includes('lounge') || n.includes('tavern')) return '🍺';
  if (n.includes('pizza') || n.includes('burger') || n.includes('taco') || n.includes('bbq')) return '🍕';
  if (n.includes('gym') || n.includes('fitness') || n.includes('crossfit') || n.includes('yoga')) return '💪';
  if (n.includes('salon') || n.includes('spa') || n.includes('beauty') || n.includes('barber')) return '✂';
  if (n.includes('medical') || n.includes('clinic') || n.includes('health') || n.includes('dental')) return '🏥';
  if (n.includes('hotel') || n.includes('inn') || n.includes('suites') || n.includes('lodge')) return '🏨';
  if (n.includes('retail') || n.includes('store') || n.includes('shop') || n.includes('boutique')) return '🛍';
  if (n.includes('auto') || n.includes('car') || n.includes('motor') || n.includes('dealership')) return '🚗';
  if (n.includes('school') || n.includes('academy') || n.includes('learning') || n.includes('university')) return '🎓';
  if (n.includes('church') || n.includes('ministry') || n.includes('chapel')) return '⛪';
  if (n.includes('real estate') || n.includes('realty') || n.includes('homes') || n.includes('apartment')) return '🏘';
  if (n.includes('tech') || n.includes('software') || n.includes('digital') || n.includes('app')) return '💻';
  if (n.includes('bank') || n.includes('credit union') || n.includes('financial')) return '🏦';
  return '📍';
}


/* ══════════════ EVENT PIN ══════════════ */
let ftEventType   = 'public';
let ftEventCoords = null;
let ftEventGeoDebounce = null;

function ftSetEventType(el, type) {
  ftEventType = type;
  document.querySelectorAll('#ft-event-type-row .ft-status-pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
}

function ftEventAddrChanged() {
  const addr = document.getElementById('ft-event-addr').value.trim();
  ftEventCoords = null;
  clearTimeout(ftEventGeoDebounce);
  if (addr.length < 5) { setEventGeocodeStatus('', ''); return; }
  setEventGeocodeStatus('loading', '🔍 Looking up venue…');
  ftEventGeoDebounce = setTimeout(() => ftGeocodeEvent(addr), 700);
}

function setEventGeocodeStatus(type, msg) {
  const el = document.getElementById('ft-event-geocode-status');
  el.className = 'ft-geocode-status' + (type ? ' ' + type : '');
  el.textContent = msg;
  el.style.display = type ? 'block' : 'none';
}

async function ftGeocodeEvent(address) {
  try {
    const result = await geocodeAddress(address);
    if (result) {
      ftEventCoords = { lat: result.lat, lng: result.lng };
      setEventGeocodeStatus('success', '\u2713 ' + result.display);
    } else {
      setEventGeocodeStatus('error', '\u26a0 Venue not found \u2014 try adding city and state, e.g. "Walmart AMP, Rogers, AR"');
    }
  } catch {
    setEventGeocodeStatus('error', '\u26a0 Could not look up venue \u2014 check your connection');
  }
}

const EVENT_SIZE_LABELS = {
  intimate:'Under 50 guests', small:'50–200 guests',
  medium:'200–1,000 guests',  large:'1,000–5,000 guests', major:'5,000+ guests'
};
const EVENT_TYPE_ICONS = { public:'🌐', private:'🔒', popup:'⚡', recurring:'🔁' };

function ftPinEvent() {
  const name  = document.getElementById('ft-event-name').value.trim();
  const addr  = document.getElementById('ft-event-addr').value.trim();
  const dateV = document.getElementById('ft-event-date').value;
  const size  = document.getElementById('ft-event-size').value;

  if (!name) { document.getElementById('ft-event-name').focus(); return; }
  if (!addr) { document.getElementById('ft-event-addr').focus(); return; }
  if (!ftEventCoords) { setEventGeocodeStatus('error','⚠ Waiting for venue lookup — try again in a moment'); ftGeocodeEvent(addr); return; }

  const typeIcon  = EVENT_TYPE_ICONS[ftEventType] || '📅';
  const dateFmt   = dateV ? new Date(dateV + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
  const sizeLabel = EVENT_SIZE_LABELS[size] || '';

  const poi = {
    id:       `event_${Date.now()}`,
    name:     name,
    cat:      'Event',
    icon:     '📅',
    lat:      ftEventCoords.lat,
    lng:      ftEventCoords.lng,
    isEvent:  true,
    eventType: ftEventType,
    eventDate: dateFmt,
    eventSize: sizeLabel,
  };

  ST.proximityTarget = poi;

  // Update selected bar
  document.getElementById('ft-sel-icon').textContent = typeIcon;
  document.getElementById('ft-sel-name').textContent  = name;
  const meta = [dateFmt, sizeLabel].filter(Boolean).join(' · ');
  document.getElementById('ft-sel-meta').textContent  = meta;
  document.getElementById('ft-selected-bar').classList.add('visible');

  if (map) { drawProximityRing(poi); renderList(); refreshMarkers(); }
  setEventGeocodeStatus('success', `📍 Pinned! Screens sorted by proximity to ${name}.`);
}

function ftLivePreview() {
  /* no-op: placeholder for future live map preview as user types */
}


/* ══════════════ SMART OPTIMIZER ══════════════ */
let optRecommended = []; // stores {id, reason} objects from Claude

function showOptimizer() {
  const panel = document.getElementById('opt-panel');
  if (panel) panel.classList.add('visible');
}

function _finishOptimizer(weeklyBudget, thinking, results) {
  if (optRecommended.length > 0) {
    renderOptimizerBasket();
    const total = optRecommended.reduce((s, sc) => s + (sc._rate != null ? sc._rate : screenRate(sc)), 0);
    const pct   = Math.round(total / (weeklyBudget || 1) * 100);
    const el    = document.getElementById('opt-reason');
    if (el && total > 0 && !el.textContent.includes('/wk')) {
      el.textContent += ' · $' + total.toLocaleString() + '/wk (' + pct + '% of budget)';
    }
    results.classList.add('visible');
  } else {
    results.classList.remove('visible');
  }
  thinking.classList.remove('visible');
  const diag = diagnoseOptimizer(optRecommended, weeklyBudget);
  if (diag) showOptimizerConstraintCard(diag);
}

async function runOptimizer() {
  const btn = document.getElementById('btn-optimize');
  const thinking = document.getElementById('opt-thinking');
  const results = document.getElementById('opt-results');

  btn.classList.add('loading');
  btn.textContent = '…';
  thinking.classList.add('visible');
  results.classList.remove('visible');
  dismissConstraintCard();

  // Build a proximity+budget scored inventory summary for Claude
  const weeklyBudget = toWeeklyBudget(ST.budget, ST.inc) || 2000;
  const HQ = WALMART_HQ;
  const tLat = ST.proximityTarget?.lat || HQ.lat;
  const tLng = ST.proximityTarget?.lng || HQ.lng;
  const scoredInv = INV
    .filter(s => isVisible(s))
    .map(s => {
      const rate = s.wkly_rate || Math.round((s.cpm||0)*(s.weekly_imp||0)/1000);
      const dist = haversineMiles(tLat, tLng, s.lat, s.lng);
      const budgetPct = rate > 0 ? Math.round((rate/weeklyBudget)*100) : 0;
      return { ...s, _rate: rate, _dist: dist, _budgetPct: budgetPct };
    })
    .filter(s => s._rate > 0 && s._rate <= weeklyBudget * 1.1)
    .sort((a, b) => {
      const proxA = Math.max(0, 50 - a._dist*10);
      const proxB = Math.max(0, 50 - b._dist*10);
      const fitA  = a._budgetPct >= 10 && a._budgetPct <= 35 ? 50 : 25;
      const fitB  = b._budgetPct >= 10 && b._budgetPct <= 35 ? 50 : 25;
      return (proxB+fitB) - (proxA+fitA);
    })
    .slice(0, 30);
  const invSummary = scoredInv.map(s =>
    `${s.id}|${s.name}|${s.area||s.city}|${s.type}|$${s._rate}/wk|${s._dist.toFixed(1)}mi|${s._budgetPct}% of budget`
  ).join('\n');

  const prompt = `You are an OOH media planning expert for Northwest Arkansas.
Screens below are pre-ranked by budget+proximity scoring. Select the best 3-5
that together maximize reach within budget.

Advertiser: ${ST.advertiserName || 'Not specified'}
Campaign goal: "${ST.goal || 'General advertising'}"
Weekly budget: $${weeklyBudget}
Duration: ${durLabel()}
${ST.proximityTarget ? `Target: ${ST.proximityTarget.name} (${ST.proximityTarget.lat?.toFixed(4)}, ${ST.proximityTarget.lng?.toFixed(4)})` : ''}

RULES:
1. Total weekly spend ≤ $${Math.round(weeklyBudget*1.05)}
2. Maximize total weekly impressions within budget
3. Prefer screens closest to target (dist column)
4. Include format diversity if budget allows
5. Never pick a screen whose rate alone exceeds the full budget
${ST.goal === "Reach Walmart & Sam's Club buyers"
  ? '6. MUST include at least 1 digitalbillboard. Airport only if budget remains after digitalbillboards.'
  : ST.goal === 'Reach the NWA Tech & Startup Scene'
  ? '6. Billboard first. Gym or dining as secondary if budget allows.'
  : '6. Nearest screens to target location get priority.'}

Candidates (id|name|area|type|rate|distance|budget%):
${invSummary}

Respond ONLY with valid JSON, no markdown:
{
  "reason": "One sentence: screens chosen, total spend, and % of budget used",
  "screens": [
    {"id": "loc_xxx", "why": "Closest billboard · uses 22% of budget"}
  ]
}`;

  try {
    const resp = await fetch('/.netlify/functions/anthropic-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!resp.ok) throw new Error('proxy ' + resp.status);
    const data = await resp.json();
    if (!data.content) throw new Error('no content');
    const text = (data.content || []).find(b => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    optRecommended = (result.screens || [])
      .map(r => {
        const inv = INV.find(s => s.id === r.id);
        if (!inv) return null; // Claude hallucinated an ID — skip it
        return { ...inv, _why: r.why || '' };
      })
      .filter(Boolean);

    if (optRecommended.length === 0) {
      optRecommended = fallbackRecommend();
      document.getElementById('opt-reason').textContent = 'Picked by proximity + budget: '
        + (ST.goal === "Reach Walmart & Sam's Club buyers"
          ? 'Top-performing screens within 2 miles of Walmart HQ, sorted by impressions.'
          : 'Top screens by weekly impressions closest to your target.');
    } else {
      document.getElementById('opt-reason').textContent = result.reason || '';
    }
    _finishOptimizer(weeklyBudget, thinking, results);
  } catch (err) {
    optRecommended = fallbackRecommend();
    document.getElementById('opt-reason').textContent = 'Picked by proximity + budget: '
      + (ST.goal === "Reach Walmart & Sam's Club buyers"
        ? 'Top-performing screens within 2 miles of Walmart HQ, sorted by impressions.'
        : 'Top screens by weekly impressions closest to your target.');
    _finishOptimizer(weeklyBudget, thinking, results);
  }

  btn.classList.remove('loading');
  btn.textContent = '✦ Recommend again';
}

function handleAdvertiserInput(val) {
  ST.advertiserName = val.trim();
  const nm = ST.advertiserName.toLowerCase();
  if (/pizza|burger|taco|chicken|sandwich|cafe|coffee|deli|bistro|grill|bbq|sushi|ramen/.test(nm)) {
    ST.advertiserCategory = 'qsr';
  } else if (/fitness|gym|yoga|crossfit|planet fit|anytime/.test(nm)) {
    ST.advertiserCategory = 'fitness';
  } else if (/beer|brewery|winery|spirits|liquor|bar /.test(nm)) {
    ST.advertiserCategory = 'alcohol';
  } else {
    ST.advertiserCategory = '';
  }
  updateBreadcrumb();
}

/* ══════════════ BREADCRUMB (User / Company / Product / Goal) ══════════════ */
const GOAL_SHORT_LABELS = {
  'Drive customers through your door': 'Foot traffic',
  'Reach the NWA Tech & Startup Scene': 'Tech & Startup',
  "Reach Walmart & Sam's Club buyers": 'Walmart buyers',
};
function updateBreadcrumb() {
  const wrap = document.getElementById('nav-breadcrumb');
  if (!wrap) return;

  const fname = document.getElementById('f-fname')?.value.trim() || '';
  const lname = document.getElementById('f-lname')?.value.trim() || '';
  const userName = [fname, lname].filter(Boolean).join(' ');
  const company  = ST.advertiserName || '';
  const product  = ST.product || '';
  const goal     = ST.goal ? (GOAL_SHORT_LABELS[ST.goal] || ST.goal) : '';

  const parts = [userName, company, product, goal].filter(Boolean);
  if (parts.length === 0) { wrap.innerHTML = ''; return; }

  wrap.innerHTML = parts
    .map(p => `<span class="bc-item">${p.replace(/</g,'&lt;')}</span>`)
    .join('<span class="bc-sep">/</span>');
}

/* ══════════════ CART INDICATOR (persistent, live-updating) ══════════════ */
function updateCartIndicator() {
  const el = document.getElementById('nav-cart-indicator');
  if (!el) return;
  const keys = Object.keys(ST.cart);
  if (keys.length === 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const total = keys.reduce((a, id) => a + unitRate(ST.cart[id]), 0);
  el.style.display = 'flex';
  el.innerHTML = `<span class="nci-icon">🛒</span><span class="nci-label">${keys.length} item${keys.length !== 1 ? 's' : ''} · </span>$${Math.round(total).toLocaleString()}${rateLabel()}`;
}

function toWeeklyBudget(budget, inc) {
  const b = budget || 0;
  if (inc === 'daily')   return b * 7;
  if (inc === 'monthly') return Math.round(b / 4.33);
  return b; // weekly (default)
}

function screenRate(s) {
  if (s.cpm && s.weekly_imp) return Math.round(s.cpm * s.weekly_imp / 1000);
  if (s.wkly_rate && s.wkly_rate > 0) return s.wkly_rate;
  if (s.mo_rate   && s.mo_rate   > 0) return Math.round(s.mo_rate / 4.33);
  return 0;
}

/* ══════════════ OPTIMIZER CONSTRAINT CARD ══════════════ */

function dismissConstraintCard() {
  const el = document.getElementById('opt-constraint-card');
  if (el) el.remove();
}

function clearAllHiddenTypes() {
  hiddenTypes.clear();
  document.querySelectorAll('[data-type],[data-vtype]').forEach(cb => { cb.checked = true; });
  refreshMarkers();
  renderList();
  dismissConstraintCard();
  runOptimizer();
}

function raiseBudgetAndRun(amount) {
  ST.budget = amount;
  const bEl = document.getElementById('cb-bud');
  if (bEl) bEl.textContent = '$' + amount.toLocaleString() + '/wk';
  initBudgetSlider();
  dismissConstraintCard();
  runOptimizer();
}

function showOptimizerConstraintCard(d) {
  dismissConstraintCard();
  const mapEl = document.getElementById('map');
  if (!mapEl) return;
  const actionsHtml = (d.actions || []).map(a =>
    '<button class="opt-cc-btn' + (a.secondary ? ' secondary' : '') + '" onclick="' + a.fn + '">' + a.label + '</button>'
  ).join('');
  const card = document.createElement('div');
  card.id = 'opt-constraint-card';
  card.className = 'opt-constraint-card';
  card.innerHTML =
    '<div class="opt-cc-head">' +
    '<span class="opt-cc-icon">' + d.icon + '</span>' +
    '<span class="opt-cc-title">' + d.headline + '</span>' +
    '<button class="opt-cc-close" onclick="dismissConstraintCard()" aria-label="Dismiss">×</button>' +
    '</div>' +
    '<div class="opt-cc-body">' + d.body + '</div>' +
    (actionsHtml ? '<div class="opt-cc-actions">' + actionsHtml + '</div>' : '');
  mapEl.appendChild(card);
}

function diagnoseOptimizer(picks, weeklyBudget) {
  const ratedVisible = INV
    .filter(s => isVisible(s))
    .map(s => ({ ...s, _rate: screenRate(s) }))
    .filter(s => s._rate > 0);

  /* ── 1. Budget floor: visible screens exist but none affordable ── */
  if (ratedVisible.length > 0 && ratedVisible.every(s => s._rate > weeklyBudget * 1.1)) {
    const cheapest = ratedVisible.slice().sort((a, b) => a._rate - b._rate)[0];
    const hiddenFloors = {};
    INV.forEach(s => {
      if (isVisible(s)) return;
      const r = screenRate(s);
      if (!r) return;
      const vt = s.venue_type || s.type;
      if (!hiddenFloors[vt] || hiddenFloors[vt] > r) hiddenFloors[vt] = r;
    });
    const cheapHidden = Object.entries(hiddenFloors).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const pillsHtml = cheapHidden.length
      ? '<div class="opt-cc-pills">' + cheapHidden.map(([vt, r]) =>
          '<span class="opt-cc-pill">' + vt + ' from $' + r.toLocaleString() + '/wk</span>'
        ).join('') + '</div>'
      : '';
    return {
      icon: '⚠️',
      headline: 'Budget too low for available inventory',
      body: 'Your budget of <strong>$' + weeklyBudget.toLocaleString() + '/wk</strong> is below the least expensive available screen'
        + ' (<strong>$' + cheapest._rate.toLocaleString() + '/wk — ' + cheapest.name + '</strong>).'
        + ' Raise your weekly budget to at least <strong>$' + cheapest._rate.toLocaleString() + '</strong>,'
        + ' or re-enable more venue types.'
        + (cheapHidden.length ? '<br><br>Cheapest currently-hidden types:' + pillsHtml : ''),
      actions: [
        { label: 'Raise budget to $' + cheapest._rate.toLocaleString() + '/wk →', fn: 'raiseBudgetAndRun(' + cheapest._rate + ')' },
        ...(cheapHidden.length ? [{ label: 'Show all venue types', secondary: true, fn: 'clearAllHiddenTypes()' }] : [])
      ]
    };
  }

  /* ── 2. Flight / minimum conflicts (custom schedule only) ── */
  if (ST.schedMode === 'custom' && ST.customDayCount > 0 && picks.length > 0) {
    const PLATFORM_MIN = 500;
    const campaignTotal = picks.reduce((sum, s) => {
      const dailyR = Math.round(((s.mo_rate || 0) / 28) * RATE_CONFIG.daily_premium);
      return sum + dailyR * ST.customDayCount;
    }, 0);
    if (campaignTotal > 0 && campaignTotal < PLATFORM_MIN) {
      const minDays = Math.ceil(PLATFORM_MIN / (campaignTotal / ST.customDayCount));
      const extra = minDays - ST.customDayCount;
      return {
        icon: '📅',
        headline: ST.customDayCount + '‑day flight is below the $' + PLATFORM_MIN + ' platform minimum',
        body: 'Your custom flight totals <strong>$' + campaignTotal.toLocaleString() + '</strong>'
          + ' — below the <strong>$' + PLATFORM_MIN + ' platform minimum</strong>.'
          + ' Extend to at least <strong>' + minDays + ' ad days</strong>'
          + ' (' + extra + ' more ' + (extra === 1 ? 'day' : 'days') + ').',
        actions: []
      };
    }
    let flightWeeks = 1;
    if (ST.schedStart && ST.schedEnd) {
      const ms = new Date(ST.schedEnd + 'T00:00:00') - new Date(ST.schedStart + 'T00:00:00');
      flightWeeks = Math.max(1, Math.ceil(ms / (7 * 86400000)));
    }
    const ceiling = weeklyBudget * flightWeeks;
    if (campaignTotal > ceiling * 1.1) {
      const over = Math.round(campaignTotal - ceiling);
      return {
        icon: '⚠️',
        headline: 'Flight cost $' + over.toLocaleString() + ' over ' + flightWeeks + '‑week budget',
        body: 'Your ' + ST.customDayCount + '‑day campaign totals <strong>$' + campaignTotal.toLocaleString() + '</strong>'
          + ' — <strong>$' + over.toLocaleString() + '</strong> above your'
          + ' ' + flightWeeks + '‑week budget of <strong>$' + ceiling.toLocaleString() + '</strong>.'
          + ' Try fewer days per week or remove a screen.',
        actions: []
      };
    }
  }

  /* ── 3. Location / filter emptiness: no visible screens at all ── */
  if (ratedVisible.length === 0) {
    const tLat = ST.proximityTarget?.lat || WALMART_HQ.lat;
    const tLng = ST.proximityTarget?.lng || WALMART_HQ.lng;
    const nearest = INV
      .map(s => ({ ...s, _rate: screenRate(s), _dist: haversineMiles(tLat, tLng, s.lat, s.lng) }))
      .filter(s => s._rate > 0)
      .sort((a, b) => a._dist - b._dist)[0];
    const targetName = (ST.proximityTarget?.name || '').split('–')[0].trim() || 'your area';
    const typeLabel = hiddenTypes.size > 0 ? 'checked venue types' : 'selected venue types';
    return {
      icon: '🗺',
      headline: 'No screens match your current filter',
      body: 'No <strong>' + typeLabel + '</strong> screens are visible near <strong>' + targetName + '</strong>.'
        + (nearest ? ' Nearest match: <strong>' + nearest.name + '</strong> (' + nearest.venue_type + ', ' + distLabel(nearest._dist) + ' away).' : '')
        + ' Try expanding your venue types or moving your pin.',
      actions: [
        { label: 'Show all venue types', fn: 'clearAllHiddenTypes()' }
      ]
    };
  }

  /* ── 4. Over-budget compromise ── */
  if (picks.length > 0) {
    const spent = picks.reduce((t, s) => t + (s._rate != null ? s._rate : screenRate(s)), 0);
    if (spent > weeklyBudget * 1.05) {
      const over = Math.round(spent - weeklyBudget);
      return {
        icon: '⚠️',
        headline: 'Slightly over budget — closest available screens',
        body: 'The nearest matching screens total <strong>$' + Math.round(spent).toLocaleString() + '/wk</strong>'
          + ' — <strong>$' + over.toLocaleString() + '</strong> above your'
          + ' <strong>$' + weeklyBudget.toLocaleString() + '/wk</strong> budget.'
          + ' These are the best options near your target. Adjust your budget or remove a screen.',
        actions: [
          { label: 'Raise budget to $' + Math.round(spent).toLocaleString() + '/wk →', fn: 'raiseBudgetAndRun(' + Math.round(spent) + ')' }
        ]
      };
    }
  }

  return null;
}

function fallbackRecommend() {
  const goal   = ST.goal;
  const budget = toWeeklyBudget(ST.budget, ST.inc) || 2000;

  function d(s, lat, lng) {
    return haversineMiles(lat, lng, s.lat, s.lng);
  }

  /* Greedy fill — always returns at least 1 screen.
     First pick respects budget cap (1.05x); only force-adds if every candidate
     exceeds budget (inventory too expensive — better to show 1 over-budget
     screen than nothing). Keeps adding until 85-105% utilization or max screens. */
  function greedyFill(candidates, maxScreens) {
    if (!candidates || candidates.length === 0) return [];
    maxScreens = maxScreens || 6;
    const picks = [];
    let spent = 0;
    const anyFits = candidates.some(s => s._rate <= budget * 1.05);
    for (const s of candidates) {
      if (picks.length >= maxScreens) break;
      if (picks.length === 0) {
        if (anyFits && s._rate > budget * 1.05) continue;
        picks.push(s); spent += s._rate; continue;
      }
      if (spent + s._rate <= budget * 1.05) {
        picks.push(s); spent += s._rate;
      }
      if (spent >= budget * 0.85) break;
    }
    return picks;
  }

  /* ── OBJECTIVE 1: Reach Walmart & Sam's Club buyers ── */
  if (goal === "Reach Walmart & Sam's Club buyers") {
    const HQ = WALMART_HQ;
    const inTargetZone = inWmtTargetZone;

    // Candidate pool: every WMT_ALLOWED_TYPES screen that falls inside any
    // WMT_ZONES zone (or the 5mi HQ radius) — not just billboards.
    function zoneOf(s) {
      if (typeof WMT_ZONES === 'undefined') return null;
      const z = WMT_ZONES.find(z => haversineMiles(z.lat, z.lng, s.lat, s.lng) <= z.radius);
      return z ? z.name : (haversineMiles(HQ.lat, HQ.lng, s.lat, s.lng) <= 5.0 ? 'Walmart Home Office' : null);
    }

    let candidates = INV
      .filter(s => WMT_ALLOWED_TYPES.has(s.type) && inTargetZone(s))
      .map(s => ({ ...s, _rate: screenRate(s), _dist: d(s, HQ.lat, HQ.lng), _zone: zoneOf(s) }))
      .filter(s => s._rate > 0);

    // Expand billboards to 10mi if the zone-restricted pool is empty
    if (candidates.length === 0) {
      candidates = INV
        .filter(s => s.type === 'digitalbillboard')
        .map(s => ({ ...s, _rate: screenRate(s), _dist: d(s, HQ.lat, HQ.lng), _zone: null }))
        .filter(s => s._rate > 0 && s._dist <= 10.0);
    }

    // Sort: priority units first, then by distance
    candidates.sort((a, b) => {
      if (a._priority && !b._priority) return -1;
      if (!a._priority && b._priority) return 1;
      return a._dist - b._dist;
    });

    const picks = [];
    let spent = 0;
    const usedIds = new Set();
    function tryPick(s, cap) {
      if (usedIds.has(s.id)) return false;
      const first = picks.length === 0;
      if (first || spent + s._rate <= budget * cap) {
        picks.push(s); spent += s._rate; usedIds.add(s.id);
        return true;
      }
      return false;
    }

    // Pass 1: reserve one slot per WMT_ZONES zone (simple 1-per-zone fill)
    if (typeof WMT_ZONES !== 'undefined') {
      for (const zone of WMT_ZONES) {
        const best = candidates.find(s => s._zone === zone.name && !usedIds.has(s.id));
        if (best) tryPick(best, 0.70);
      }
    }

    // Pass 2: fill remaining budget with nearest/priority candidates (max 3 total)
    for (const s of candidates) {
      if (picks.length >= 3) break;
      tryPick(s, 0.70);
    }

    // Add 1 airport screen with remaining budget
    const airports = INV
      .filter(s => s.type === 'airport')
      .map(s => ({ ...s, _rate: screenRate(s) }))
      .filter(s => s._rate > 0)
      .sort((a, b) => (b.weekly_imp||0) - (a.weekly_imp||0));

    for (const s of airports) {
      if (picks.length >= 5) break;
      if (spent + s._rate <= budget * 1.05) {
        picks.push(s); spent += s._rate; break;
      }
    }

    return picks;
  }

  /* ── OBJECTIVE 2: Drive customers through your door ── */
  if (goal === 'Drive customers through your door') {

    // Format conflict exclusions based on advertiser category
    const cat = (ST.advertiserCategory || '').toLowerCase();
    function hasConflict(s) {
      if (cat.includes('qsr') || cat.includes('fast food') ||
          cat.includes('restaurant')) {
        if (['casualdining','quickservicerestaurant'].includes(s.type)) return true;
      }
      if (cat.includes('alcohol') || cat.includes('beer') ||
          cat.includes('wine') || cat.includes('spirits')) {
        if (s.type === 'doctorsoffice') return true;
      }
      if (cat.includes('fitness') || cat.includes('gym')) {
        if (s.type === 'gym') return true;
      }
      return false;
    }

    const pool = INV
      .filter(s => isVisible(s) && !hasConflict(s))
      .map(s => ({ ...s, _rate: screenRate(s) }))
      .filter(s => s._rate > 0);

    if (ST.proximityTarget) {
      const tLat = ST.proximityTarget.lat;
      const tLng = ST.proximityTarget.lng;

      const byDist = pool
        .map(s => ({ ...s, _dist: d(s, tLat, tLng) }))
        .sort((a, b) => a._dist - b._dist);

      // Expanding radius until 2+ candidates
      let candidates = [];
      for (const radius of [1, 3, 5, 10, 9999]) {
        candidates = byDist.filter(s => s._dist <= radius);
        if (candidates.length >= 2) break;
      }
      if (candidates.length === 0) candidates = byDist;

      const picks = greedyFill(candidates, 6);
      return picks;
    }

    // No POI — highest impressions within budget
    const byImpr = pool.sort((a, b) => (b.weekly_imp||0) - (a.weekly_imp||0));
    const picks = greedyFill(byImpr, 5);
    return picks;
  }

  /* ── OBJECTIVE 3: Reach the NWA Tech & Startup Scene ── */
  if (goal === 'Reach the NWA Tech & Startup Scene') {
    const HUBS = [
      { lat: 36.3729, lng: -94.2192 },
      { lat: 36.0626, lng: -94.1574 },
      { lat: 36.3320, lng: -94.1185 },
    ];

    function minDistToHubs(s) {
      return Math.min(...HUBS.map(h => d(s, h.lat, h.lng)));
    }

    // Billboards sorted by closest hub — priority units first
    let billPool = INV
      .filter(s => s.type === 'digitalbillboard' && isVisible(s))
      .map(s => ({ ...s, _rate: screenRate(s), _dist: minDistToHubs(s) }))
      .filter(s => s._rate > 0)
      .sort((a, b) => {
        if (a._priority && !b._priority) return -1;
        if (!a._priority && b._priority) return 1;
        return a._dist - b._dist;
      });

    // Expand if no digitalbillboards found near hubs
    if (billPool.length === 0) {
      billPool = INV
        .filter(s => s.type === 'digitalbillboard')
        .map(s => ({ ...s, _rate: screenRate(s), _dist: minDistToHubs(s) }))
        .filter(s => s._rate > 0)
        .sort((a, b) => a._dist - b._dist);
    }

    const secondary = INV
      .filter(s => ['gym','casualdining','quickservicerestaurant'].includes(s.type) && isVisible(s))
      .map(s => ({ ...s, _rate: screenRate(s), _dist: minDistToHubs(s) }))
      .filter(s => s._rate > 0)
      .sort((a, b) => a._dist - b._dist);

    // Fill to 70% with billboards
    const picks = [];
    let spent = 0;
    for (const s of billPool) {
      if (picks.length >= 3) break;
      if (picks.length === 0) {
        picks.push(s); spent += s._rate; continue;
      }
      if (spent + s._rate <= budget * 0.70) {
        picks.push(s); spent += s._rate;
      }
    }

    // Fill remaining 30% with gym/dining
    for (const s of secondary) {
      if (picks.length >= 6) break;
      if (spent + s._rate <= budget * 1.05) {
        picks.push(s); spent += s._rate;
      }
      if (spent >= budget * 0.85) break;
    }

    return picks;
  }

  /* ── DEFAULT ── */
  const pool = INV
    .filter(s => isVisible(s))
    .map(s => ({ ...s, _rate: screenRate(s) }))
    .filter(s => s._rate > 0)
    .sort((a, b) => (b.weekly_imp||0) - (a.weekly_imp||0));
  const picks = greedyFill(pool, 5);
  return picks;
}
function renderOptimizerBasket() {
  const container = document.getElementById('opt-basket');
  if (!container) return;
  container.innerHTML = optRecommended.map(s => {
    // Always resolve against real INV so id is guaranteed valid
    const inv = INV.find(x => x.id === s.id) || s;
    const id = inv.id;
    if (!id) return '';
    const inCart = !!ST.cart[id];
    const unitP = Math.round(unitRate(inv));
    return `
      <div class="opt-item${inCart ? ' selected' : ''}" id="opt-item-${id}"
           onclick="toggleOptItem('${id}')" style="cursor:pointer">
        <div class="opt-item-check">${inCart ? '✓' : '+'}</div>
        <div class="opt-item-icon">${inv.icon || '📍'}</div>
        <div class="opt-item-info">
          <div class="opt-item-name">${inv.name || '—'}</div>
          <div class="opt-item-why">${s._why || ''}</div>
        </div>
        <div class="opt-item-price">$${unitP.toLocaleString()}<span style="font-size:9px;color:var(--muted);font-family:'Instrument Sans',sans-serif">${rateLabel()}</span></div>
      </div>`;
  }).filter(Boolean).join('');
}

function toggleOptItem(id) {
  if (!id) return;
  const inv = INV.find(x => x.id === id);
  if (!inv) return;
  if (ST.cart[id]) {
    delete ST.cart[id];
  } else {
    ST.cart[id] = inv;
  }
  renderList();
  renderCart();
  refreshMarkers();
  updateNavSel();
  renderOptimizerBasket();
  updateBasketPreview();
}

function addOptimizedToCart() {
  optRecommended.forEach(s => {
    const inv = INV.find(x => x.id === s.id) || s;
    if (inv && inv.id && !ST.cart[inv.id]) {
      ST.cart[inv.id] = inv;
    }
  });
  renderList();
  renderCart();
  refreshMarkers();
  updateNavSel();
  renderOptimizerBasket();
  const _c = document.querySelector('.cart-cta') || document.getElementById('btn-s2');
  if (_c) _c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ══════════════ BASKET PREVIEW ══════════════ */
function updateBasketPreview() { /* removed — renderCart handles this */ }


/* ══════════════ CAMPAIGN SUMMARY MODAL ══════════════ */
function showSummary() {
  const keys = Object.keys(ST.cart);
  if (!keys.length) return; // nothing to show

  const overlay = document.getElementById('summary-overlay');

  // ── Stats row ──
  const totalWklyImpr = keys.reduce((a, id) => a + (ST.cart[id]?.wkly_impr || 0), 0);
  const imprFormatted = totalWklyImpr >= 1000
    ? Math.round(totalWklyImpr / 1000) + 'K+'
    : totalWklyImpr.toLocaleString();

  let subUnit = keys.reduce((a, id) => a + unitRate(ST.cart[id]), 0);
  const grand = Math.round(subUnit * ST.qty);

  document.getElementById('sum-stats').innerHTML = [
    { val: keys.length,       lbl: 'Screens',            cls: '' },
    { val: imprFormatted,     lbl: 'Weekly impressions',  cls: '' },
    { val: '$' + grand.toLocaleString(), lbl: 'Est. total (' + durLabel() + ')', cls: 'accent' },
  ].map(s => `
    <div class="sum-stat">
      <span class="sum-stat-val ${s.cls}">${s.val}</span>
      <span class="sum-stat-lbl">${s.lbl}</span>
    </div>`).join('');

  // ── Detail row (goal + timeframe) ──
  const goalIcon = {
    'Drive customers through your door': '🏪',
    'Reach the NWA Tech & Startup Scene': '💡',
    "Reach Walmart & Sam's Club buyers": '🎯',
  }[ST.goal] || '📢';

  document.getElementById('sum-details').innerHTML = `
    <div class="sum-detail-card">
      <div class="sum-detail-label">Campaign goal</div>
      <div class="sum-detail-val">${goalIcon} ${ST.goal || 'General advertising'}</div>
    </div>
    <div class="sum-detail-card">
      <div class="sum-detail-label">Schedule</div>
      <div class="sum-detail-val">${durLabel()} · ${ST.inc === 'daily' ? 'Daily' : ST.inc === 'weekly' ? 'Weekly' : 'Monthly'} billing</div>
    </div>
    <div class="sum-detail-card">
      <div class="sum-detail-label">Budget</div>
      <div class="sum-detail-val">$${ST.budget.toLocaleString()} / ${ST.inc === 'daily' ? 'day' : ST.inc === 'weekly' ? 'week' : 'month'}</div>
    </div>
  `;

  // ── Screen list ──
  document.getElementById('sum-screen-list').innerHTML = keys.map(id => {
    const s   = ST.cart[id];
    const unitP = Math.round(unitRate(s));
    const typeLabels = { digital:'Billboard', billboard:'Billboard', gasstation:'Gas Station', airport:'Airport', cinema:'Cinema', healthcare:'Healthcare', dining:'Dining', grocery:'Grocery', gym:'Gym', rideshare:'Rideshare', residential:'Residential', sports:'Sports & Entertainment', recreation:'Recreation', retail:'Retail', education:'Campus', office:'Office' };
    return `
      <div class="sum-screen-row">
        <span class="sum-screen-icon">${s.icon}</span>
        <div class="sum-screen-info">
          <div class="sum-screen-name">${s.name}</div>
          <div class="sum-screen-meta">${s.area} · ${typeLabels[s.type] || s.type} · ${s.impr}</div>
        </div>
        <div class="sum-screen-price">$${unitP.toLocaleString()}<span style="font-size:9px;color:var(--muted);font-family:'Instrument Sans',sans-serif;font-weight:400">${rateLabel()}</span></div>
      </div>`;
  }).join('');

  // ── Total ──
  document.getElementById('sum-total').textContent = '$' + grand.toLocaleString();

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSummary() {
  document.getElementById('summary-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function updateCreativeSummary() {
  const keys = Object.keys(ST.cart);
  const recap = document.getElementById('s3-campaign-recap');
  if (!recap) return;
  if (!keys.length) { recap.style.display = 'none'; return; }
  const subUnit = keys.reduce((a, id) => a + unitRate(ST.cart[id]), 0);
  const effQty = (ST.schedMode === 'custom' && ST.customDayCount > 0) ? 1 : ST.qty;
  const grand = Math.round(subUnit * effQty);
  const countEl = document.getElementById('s3-screen-count');
  const totalEl = document.getElementById('s3-total');
  if (countEl) countEl.textContent = keys.length + ' screen' + (keys.length !== 1 ? 's' : '');
  if (totalEl) totalEl.textContent = '$' + grand.toLocaleString();
  recap.style.display = 'flex';
  renderSpecCards();
}

/* ── Creative spec cards — pull real dimensions/duration/video support from
   the screens actually in the cart instead of a static, possibly-wrong
   generic list. Falls back to the generic specs when the cart is empty. */
function renderSpecCards() {
  const grid = document.getElementById('specs-grid');
  if (!grid) return;
  const keys = Object.keys(ST.cart);
  if (!keys.length) {
    grid.innerHTML = `
      <div class="spec-card"><div class="sc-lbl">Roadside digital</div><div class="sc-val">1920 × 640 px</div><div class="sc-note">JPEG or PNG · max 2MB · 8-sec loop</div></div>
      <div class="spec-card"><div class="sc-lbl">Roadside static</div><div class="sc-val">14 × 48 ft artwork</div><div class="sc-note">PDF · 300 DPI · bleed included</div></div>
      <div class="spec-card"><div class="sc-lbl">Airport digital (XNA)</div><div class="sc-val">1920 × 1080 px</div><div class="sc-note">JPEG, PNG, or MP4 · 10-sec spot</div></div>
      <div class="spec-card"><div class="sc-lbl">Not sure?</div><div class="sc-val">Free design review</div><div class="sc-note">Upload anything — we'll confirm specs before launch</div></div>`;
    return;
  }
  const groups = {};
  keys.forEach(id => {
    const s = ST.cart[id];
    if (!s) return;
    const key = [s.venue_type || s.label || s.type, s.w, s.h, s.duration, s.video].join('|');
    if (!groups[key]) {
      groups[key] = { label: s.venue_type || s.label || s.type, w: s.w, h: s.h, duration: s.duration, video: s.video, count: 0 };
    }
    groups[key].count++;
  });
  const cards = Object.values(groups).map(g => {
    const dims = g.w && g.h ? `${g.w} × ${g.h} px` : 'Contact us for dimensions';
    const fileTypes = g.video ? 'JPEG, PNG, or MP4' : 'JPEG or PNG';
    const noteBits = [];
    if (g.duration) noteBits.push(`${g.duration}-sec loop`);
    noteBits.push('max 2MB');
    const countLbl = g.count > 1 ? ` (${g.count} screens)` : '';
    return `<div class="spec-card"><div class="sc-lbl">${g.label}${countLbl}</div><div class="sc-val">${dims}</div><div class="sc-note">${fileTypes} · ${noteBits.join(' · ')}</div></div>`;
  });
  cards.push(`<div class="spec-card"><div class="sc-lbl">Not sure?</div><div class="sc-val">Free design review</div><div class="sc-note">Upload anything — we'll confirm specs before launch</div></div>`);
  grid.innerHTML = cards.join('');
}

// Close on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('summary-overlay');
  if (ov) ov.addEventListener('click', e => { if (e.target === ov) closeSummary(); });
  renderBudgetHints();
  loadPhotoOverrides(sbClient);
});


/* ══════════════ STEP 1 — GOAL / BUDGET / DURATION ══════════════ */

function selGoal(el, g) {
  document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  ST.goal = g;
  updateBreadcrumb();

  // Show insight panel
  const insightWrap = document.getElementById('goal-insight');
  if (insightWrap) insightWrap.style.display = 'block';
  ['insight-traffic','insight-walmart','insight-brand'].forEach(id => {
    const el2 = document.getElementById(id);
    if (el2) el2.style.display = 'none';
  });
  if (g === 'Drive customers through your door') {
    const t = document.getElementById('insight-traffic');
    if (t) t.style.display = 'block';
    ST.walmartMode = false;
  } else if (g === "Reach Walmart & Sam's Club buyers") {
    const w = document.getElementById('insight-walmart');
    if (w) w.style.display = 'block';
    ST.walmartMode = true;
  } else if (g === 'Reach the NWA Tech & Startup Scene') {
    const b = document.getElementById('insight-brand');
    if (b) b.style.display = 'block';
    ST.walmartMode = false;
    const s2t = document.getElementById('s2-title-text');
    const s2h = document.getElementById('s2-hint-text');
    if (s2t) s2t.textContent = 'NWA Tech & Innovation Corridor';
    if (s2h) s2h.textContent = 'Billboard-first plan across Bentonville, Rogers & Fayetteville — gym & dining screens fill remaining budget';
  }

  updateFtPanel(g);
}

function selSubIntent(el, group) {
  el.closest('.ft-status-row').querySelectorAll('.ft-status-pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  ST.subIntent = el.textContent.trim();
  if (group === 'walmart') renderWalmartSubflow(ST.subIntent);
  else if (group === 'foot') renderFootSubflow(ST.subIntent);
  else if (group === 'tech') renderTechSubflow(ST.subIntent);
  renderTargetingLine();
}

/* ── Walmart sub-intent micro-flows ──
   Each Walmart timing pill drives a small contextual follow-up so the
   schedule actually reflects *why* the advertiser is targeting Walmart
   buyers, instead of leaving them to re-derive dates by hand. */
function fmtFlowDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function toISODate(d) { return d.toISOString().slice(0, 10); }

// Nearest upcoming window from a list of {startMonth,startDay,endMonth,endDay} ranges (year-agnostic, rolls to next year if the window already passed this year)
function nearestUpcomingWindow(ranges) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const candidates = [];
  ranges.forEach(r => {
    [thisYear, thisYear + 1].forEach(y => {
      const start = new Date(y, r.startMonth - 1, r.startDay);
      const end = new Date(y, r.endMonth - 1, r.endDay);
      if (end >= now) candidates.push({ start, end });
    });
  });
  candidates.sort((a, b) => a.start - b.start);
  return candidates[0];
}

function applyWalmartFlightDates(start, end) {
  setSchedMode('custom');
  document.querySelectorAll('.day-btn').forEach(b => b.classList.add('on'));
  ST.customDays = [0, 1, 2, 3, 4, 5, 6];
  const startEl = document.getElementById('sched-start');
  const endEl = document.getElementById('sched-end');
  if (startEl) startEl.value = toISODate(start);
  if (endEl) endEl.value = toISODate(end);
  updateCustomSched();
}

function renderWalmartSubflow(intent) {
  const wrap = document.getElementById('walmart-subflow');
  if (!wrap) return;

  if (intent === 'Line review season') {
    // Walmart supplier Line Review cycles run twice a year, roughly mid-Feb
    // through mid-Mar and mid-Aug through mid-Sep.
    const win = nearestUpcomingWindow([
      { startMonth: 2, startDay: 15, endMonth: 3, endDay: 15 },
      { startMonth: 8, startDay: 15, endMonth: 9, endDay: 15 },
    ]);
    applyWalmartFlightDates(win.start, win.end);
    wrap.innerHTML = `<div class="walmart-subflow-note">Flight auto-set to next Line Review season: <strong>${fmtFlowDate(win.start)} – ${fmtFlowDate(win.end)}</strong>. You can override the dates below.</div>`;
  } else if (intent === 'Year-round presence') {
    selInc(document.querySelector('#inc-pills .dur-pill:nth-child(3)'), 'monthly');
    selQty(document.querySelector('#qty-pills .dur-pill:nth-child(5)'), 12);
    wrap.innerHTML = `<div class="walmart-subflow-note">Duration set to <strong>12 months</strong> for continuous year-round presence with Walmart &amp; Sam's Club decision-makers.</div>`;
  } else if (intent === 'Shareholders Week') {
    // Walmart's Annual Shareholders Meeting week is traditionally the first
    // full week of June.
    const win = nearestUpcomingWindow([{ startMonth: 6, startDay: 1, endMonth: 6, endDay: 7 }]);
    applyWalmartFlightDates(win.start, win.end);
    wrap.innerHTML = `<div class="walmart-subflow-note">Dates auto-set to Shareholders Week: <strong>${fmtFlowDate(win.start)} – ${fmtFlowDate(win.end)}</strong>, when the highest volume of visiting executives, investors &amp; press pass through NWA.</div>`;
  } else if (intent === 'Product launch') {
    wrap.innerHTML = `<div class="walmart-subflow-note">Enter your product launch date:
      <input type="date" id="walmart-launch-date" onchange="walmartLaunchDateChanged(this.value)"></div>`;
  } else {
    wrap.innerHTML = '';
  }
}

function walmartLaunchDateChanged(val) {
  if (!val) return;
  const launch = new Date(val + 'T00:00:00');
  const start = new Date(launch); start.setDate(start.getDate() - 14);
  const end = new Date(launch); end.setDate(end.getDate() + 28);
  applyWalmartFlightDates(start, end);
  const wrap = document.getElementById('walmart-subflow');
  const note = document.createElement('div');
  note.className = 'walmart-subflow-note';
  note.style.marginTop = '8px';
  note.textContent = `Flight centered on your launch: ${fmtFlowDate(start)} – ${fmtFlowDate(end)}.`;
  if (wrap && !wrap.querySelector('.launch-confirm')) {
    note.classList.add('launch-confirm');
    wrap.appendChild(note);
  }
}

/* ── Goal 2: Drive customers through your door — sub-intent micro-flows ── */
function renderFootSubflow(intent) {
  const wrap = document.getElementById('foot-subflow');
  if (!wrap) return;
  const today = new Date();

  if (intent === 'Store opening or coming soon') {
    setSchedMode('custom');
    wrap.innerHTML = `<div class="walmart-subflow-note">Enter your opening date:<br>
      <input type="date" id="foot-opening-date" style="margin-top:6px" onchange="footOpeningDateChanged(this.value)"></div>`;
  } else if (intent === 'Drive ongoing foot traffic') {
    const start = new Date(today);
    const end   = new Date(today); end.setDate(end.getDate() + 28);
    applyWalmartFlightDates(start, end);
    wrap.innerHTML = `<div class="walmart-subflow-note">Your campaign will run for <strong>4 weeks</strong> starting <strong>${fmtFlowDate(start)}</strong>. You can override the dates below.</div>`;
  } else if (intent === 'Run a promotion') {
    setSchedMode('custom');
    wrap.innerHTML = `<div class="walmart-subflow-note">Enter your promotion dates:
      <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap">
        <div><label style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Start</label><br>
          <input type="date" id="foot-promo-start" style="margin-top:4px" onchange="footPromoDateChanged()"></div>
        <div><label style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">End</label><br>
          <input type="date" id="foot-promo-end" style="margin-top:4px" onchange="footPromoDateChanged()"></div>
      </div></div>`;
  } else {
    wrap.innerHTML = '';
  }
}

function footOpeningDateChanged(val) {
  if (!val) return;
  const opening = new Date(val + 'T00:00:00');
  const start = new Date(opening); start.setDate(start.getDate() - 14);
  const end   = new Date(opening); end.setDate(end.getDate() + 28);
  applyWalmartFlightDates(start, end);
  const wrap = document.getElementById('foot-subflow');
  if (wrap) wrap.innerHTML = `<div class="walmart-subflow-note">Enter your opening date:<br>
    <input type="date" id="foot-opening-date" value="${val}" style="margin-top:6px" onchange="footOpeningDateChanged(this.value)">
    <div style="margin-top:6px">Flight: 2 weeks before through 4 weeks after: <strong>${fmtFlowDate(start)} – ${fmtFlowDate(end)}</strong>. You can override the dates below.</div></div>`;
}

function footPromoDateChanged() {
  const s = document.getElementById('foot-promo-start');
  const e = document.getElementById('foot-promo-end');
  if (s && e && s.value && e.value) {
    applyWalmartFlightDates(new Date(s.value + 'T00:00:00'), new Date(e.value + 'T00:00:00'));
  }
}

function footEventDateChanged(val) {
  if (!val) return;
  const evt   = new Date(val + 'T00:00:00');
  const start = new Date(evt); start.setDate(start.getDate() - 7);
  const end   = new Date(evt); end.setDate(end.getDate() + 3);
  applyWalmartFlightDates(start, end);
  const wrap = document.getElementById('foot-subflow');
  if (wrap) wrap.innerHTML = `<div class="walmart-subflow-note">Enter your event date:<br>
    <input type="date" id="foot-event-date" value="${val}" style="margin-top:6px" onchange="footEventDateChanged(this.value)">
    <div style="margin-top:6px">Flight: 1 week before through 3 days after: <strong>${fmtFlowDate(start)} – ${fmtFlowDate(end)}</strong>. You can override the dates below.</div></div>`;
}

/* ── Goal 3: NWA Tech & Startup Scene — sub-intent micro-flows ── */
function renderTechSubflow(intent) {
  const wrap = document.getElementById('tech-subflow');
  if (!wrap) return;
  const today = new Date();

  if (intent === 'General brand awareness') {
    const start = new Date(today);
    const end   = new Date(today); end.setDate(end.getDate() + 56);
    applyWalmartFlightDates(start, end);
    wrap.innerHTML = `<div class="walmart-subflow-note">Your campaign will run for <strong>8 weeks</strong> starting <strong>${fmtFlowDate(start)}</strong>. You can override the dates below.</div>`;
  } else if (intent === 'Hiring or recruiting') {
    const start = new Date(today);
    const end   = new Date(today); end.setDate(end.getDate() + 28);
    applyWalmartFlightDates(start, end);
    wrap.innerHTML = `<div class="walmart-subflow-note">Your campaign will run for <strong>4 weeks</strong> starting <strong>${fmtFlowDate(start)}</strong>. You can override the dates below.</div>`;
  } else if (intent === 'Product or service launch') {
    setSchedMode('custom');
    wrap.innerHTML = `<div class="walmart-subflow-note">Enter your launch date:<br>
      <input type="date" id="tech-launch-date" style="margin-top:6px" onchange="techLaunchDateChanged(this.value)"></div>`;
  } else if (intent === 'Event or activation') {
    setSchedMode('custom');
    wrap.innerHTML = `<div class="walmart-subflow-note">Enter your event date:<br>
      <input type="date" id="tech-event-date" style="margin-top:6px" onchange="techEventDateChanged(this.value)"></div>`;
  } else {
    wrap.innerHTML = '';
  }
}

function techLaunchDateChanged(val) {
  if (!val) return;
  const launch = new Date(val + 'T00:00:00');
  const start  = new Date(launch); start.setDate(start.getDate() - 14);
  const end    = new Date(launch); end.setDate(end.getDate() + 28);
  applyWalmartFlightDates(start, end);
  const wrap = document.getElementById('tech-subflow');
  if (wrap) wrap.innerHTML = `<div class="walmart-subflow-note">Enter your launch date:<br>
    <input type="date" id="tech-launch-date" value="${val}" style="margin-top:6px" onchange="techLaunchDateChanged(this.value)">
    <div style="margin-top:6px">Flight: 2 weeks before through 4 weeks after: <strong>${fmtFlowDate(start)} – ${fmtFlowDate(end)}</strong>. You can override the dates below.</div></div>`;
}

function techEventDateChanged(val) {
  if (!val) return;
  const evt   = new Date(val + 'T00:00:00');
  const start = new Date(evt); start.setDate(start.getDate() - 7);
  const end   = new Date(evt); end.setDate(end.getDate() + 7);
  applyWalmartFlightDates(start, end);
  const wrap = document.getElementById('tech-subflow');
  if (wrap) wrap.innerHTML = `<div class="walmart-subflow-note">Enter your event date:<br>
    <input type="date" id="tech-event-date" value="${val}" style="margin-top:6px" onchange="techEventDateChanged(this.value)">
    <div style="margin-top:6px">Flight: 1 week before through 1 week after: <strong>${fmtFlowDate(start)} – ${fmtFlowDate(end)}</strong>. You can override the dates below.</div></div>`;
}

function toggleInsightWhy(btn) {
  const open = btn.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  const body = btn.nextElementSibling;
  if (body && body.classList.contains('insight-why-body')) {
    body.classList.toggle('open', open);
  }
}

/* ── Dynamic "Inventory targeting…" line — templated by goal + product so
   the Step 2 header explains *what* the current inventory selection is
   optimized for, not just the goal name. ── */
function renderTargetingLine() {
  const el = document.getElementById('s2-targeting-line');
  if (!el) return;
  const product = (ST.product || '').trim();
  const productPhrase = product ? ` for “${product}”` : '';
  let line = '';
  if (ST.goal === "Reach Walmart & Sam's Club buyers") {
    line = `Inventory targeting: Walmart & Sam's Club decision-makers${productPhrase}${ST.subIntent ? ' · ' + ST.subIntent : ''}`;
  } else if (ST.goal === 'Drive customers through your door') {
    line = `Inventory targeting: nearby foot traffic${productPhrase}${ST.subIntent ? ' · ' + ST.subIntent : ''}`;
  } else if (ST.goal === 'Reach the NWA Tech & Startup Scene') {
    line = `Inventory targeting: NWA tech & startup audience${productPhrase}${ST.subIntent ? ' · ' + ST.subIntent : ''}`;
  } else if (ST.goal === 'Promote an event') {
    line = `Inventory targeting: event-area awareness${productPhrase}`;
  } else if (ST.goal) {
    line = `Inventory targeting: ${ST.goal}${productPhrase}`;
  }
  el.textContent = line;
}

function fmtBudgetK(n) {
  return n >= 1000 ? '$' + Math.round(n/1000) + 'K' : '$' + n;
}

/* Log-scale helpers — single source of truth for slider ↔ dollar mapping.
   Slider input range is 0–100; dollars snap to $250 increments. */
function budgetFromPos(pos) {
  const raw = BUDGET_MIN * Math.pow(BUDGET_MAX / BUDGET_MIN, pos / 100);
  return Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, Math.round(raw / 250) * 250));
}
function posFromBudget(dollars) {
  const clamped = Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, dollars));
  return Math.round(Math.log(clamped / BUDGET_MIN) / Math.log(BUDGET_MAX / BUDGET_MIN) * 100);
}

function renderBudgetHints() {
  const el = document.getElementById('budget-hints');
  if (!el) return;
  const pctStarter     = posFromBudget(BUDGET_STARTER);
  const pctRecommended = posFromBudget(BUDGET_RECOMMENDED);
  el.innerHTML =
    `<span style="left:0%">${fmtBudgetK(BUDGET_MIN)} min</span>` +
    `<span style="left:${pctStarter}%">${fmtBudgetK(BUDGET_STARTER)} starter</span>` +
    `<span style="left:${pctRecommended}%">${fmtBudgetK(BUDGET_RECOMMENDED)} recommended</span>` +
    `<span style="right:0%;left:auto">No max</span>`;
}

function _applySliderFill(slider, pos) {
  slider.style.background =
    `linear-gradient(to right,var(--accent) 0%,var(--accent) ${pos}%,var(--border) ${pos}%)`;
}

function updBudget(inp) {
  const dollars = budgetFromPos(parseInt(inp.value));
  ST.budget = dollars;
  const lbl = ST.inc === 'daily' ? 'Daily budget'
            : ST.inc === 'weekly' ? 'Weekly budget' : 'Monthly budget';
  const labelEl = document.getElementById('budget-label');
  if (labelEl) labelEl.textContent = lbl;
  const bdisp = document.getElementById('bdisp');
  if (bdisp) bdisp.textContent = '$' + dollars.toLocaleString();
  const customEl = document.getElementById('b-custom');
  if (customEl) customEl.value = dollars;
  _applySliderFill(inp, parseInt(inp.value));
}

function updBudgetCustom(inp) {
  const dollars = parseInt(inp.value);
  if (!dollars || dollars < BUDGET_MIN) return;
  ST.budget = Math.min(dollars, BUDGET_MAX);
  const bdisp = document.getElementById('bdisp');
  if (bdisp) bdisp.textContent = '$' + ST.budget.toLocaleString();
  const slider = document.getElementById('bslider');
  if (slider) {
    const pos = posFromBudget(ST.budget);
    slider.value = pos;
    _applySliderFill(slider, pos);
  }
}

function initBudgetSlider() {
  const slider = document.getElementById('bslider');
  if (!slider) return;
  slider.value = posFromBudget(ST.budget || BUDGET_STARTER);
  updBudget(slider);
  renderBudgetHints();
}

function selInc(el, inc) {
  ST.inc = inc;
  document.querySelectorAll('#inc-pills .dur-pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  const lbl = inc === 'daily' ? 'Daily budget'
            : inc === 'weekly' ? 'Weekly budget' : 'Monthly budget';
  const labelEl = document.getElementById('budget-label');
  if (labelEl) labelEl.textContent = lbl;
  const dur = document.getElementById('dur-summary');
  if (dur) dur.textContent = durLabel();
  // Re-render cart with new billing if screens selected
  if (Object.keys(ST.cart).length) renderCart();
}

function selQty(el, qty) {
  ST.qty = qty;
  document.querySelectorAll('#qty-pills .dur-pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  const dur = document.getElementById('dur-summary');
  if (dur) dur.textContent = durLabel();
  if (Object.keys(ST.cart).length) renderCart();
}


/* ══════════════ STEP 3 — CREATIVE UPLOAD ══════════════ */

function handleCreativeUpload(input) {
  if (!input.files || !input.files[0]) return;
  processCreativeFile(input.files[0]);
}

function handleCreativeDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) processCreativeFile(file);
}

function processCreativeFile(file) {
  // Store on ST so it carries through to checkout
  ST.creativeFile = file;

  const zone    = document.getElementById('upload-zone');
  const preview = document.getElementById('creative-preview');
  const thumb   = document.getElementById('preview-thumb');
  const nameEl  = document.getElementById('preview-name');
  const metaEl  = document.getElementById('preview-meta');
  const icon    = document.getElementById('uz-icon');
  const title   = document.getElementById('uz-title');
  const sub     = document.getElementById('uz-sub');

  const sizeMB  = (file.size / 1024 / 1024).toFixed(1);
  const ext     = file.name.split('.').pop().toUpperCase();
  const isImage = ['JPG','JPEG','PNG','GIF','WEBP'].includes(ext);
  const isVideo = ['MP4','MOV'].includes(ext);

  // Show preview panel
  nameEl.textContent = file.name;
  metaEl.textContent = `${ext} · ${sizeMB} MB`;

  if (isImage) {
    const reader = new FileReader();
    reader.onload = e => {
      thumb.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  } else if (isVideo) {
    thumb.innerHTML = '🎬';
  } else if (ext === 'PDF') {
    thumb.innerHTML = '📄';
  } else {
    thumb.innerHTML = '📁';
  }

  preview.style.display = 'block';

  // Update zone to show uploaded state
  zone.classList.add('has-file');
  icon.textContent = '✓';
  title.textContent = 'File ready — click to replace';
  sub.textContent   = file.name;

  // Update continue button
  const btn = document.getElementById('btn-s3-continue');
  if (btn) btn.textContent = 'Creative uploaded — continue to checkout →';
}

function clearCreative() {
  ST.creativeFile = null;
  const input = document.getElementById('creative-file-input');
  if (input) input.value = '';
  document.getElementById('creative-preview').style.display = 'none';
  const zone = document.getElementById('upload-zone');
  zone.classList.remove('has-file');
  document.getElementById('uz-icon').textContent  = '⬆';
  document.getElementById('uz-title').textContent = 'Drop your file here';
  document.getElementById('uz-sub').innerHTML     = 'Or <span class="browse">browse to upload</span> · JPEG, PNG, PDF, MP4';
  const btn = document.getElementById('btn-s3-continue');
  if (btn) btn.innerHTML = 'Continue to checkout <span class="arr">→</span>';
}


/* ── MOBILE: invalidate map on resize/orientation change ── */
window.addEventListener('resize', () => {
  if (map) setTimeout(() => map.invalidateSize(true), 150);
});
window.addEventListener('orientationchange', () => {
  if (map) setTimeout(() => map.invalidateSize(true), 400);
});


/* ══ Walmart buyer heatmap overlay ══ */
function renderWmtHeatmap() {
  if (!map) return;
  if (window._wmtHeatLayers) {
    window._wmtHeatLayers.forEach(l => map.removeLayer(l));
  }
  window._wmtHeatLayers = [];

  if (ST.goal !== "Reach Walmart & Sam's Club buyers") return;

  WMT_ZONES.forEach((zone, i) => {
    const circle = L.circle([zone.lat, zone.lng], {
      radius: zone.radius * 1609.34,
      color: '#374151',
      fillColor: '#374151',
      fillOpacity: i === 0 ? 0.09 : 0.06,
      weight: 1.5,
      opacity: 0.28,
      dashArray: '5 4',
    }).addTo(map);

    const inner = L.circle([zone.lat, zone.lng], {
      radius: zone.radius * 1609.34 * 0.35,
      color: 'transparent',
      fillColor: '#374151',
      fillOpacity: 0.11,
      weight: 0,
    }).addTo(map);

    const label = i === 0 ? 'Walmart Home Office' : 'Executive Residential Corridor';
    circle.bindTooltip(label, { permanent: false, direction: 'top', className: 'wmt-zone-tip', offset: [0, -8] });
    inner.bindTooltip(label, { permanent: false, direction: 'top', className: 'wmt-zone-tip', offset: [0, -4] });
    // Tooltips only open on :hover by default — there's no hover on touch
    // devices, so bind a tap/click to open (and toggle closed on a second tap).
    circle.on('click', () => { circle.isTooltipOpen() ? circle.closeTooltip() : circle.openTooltip(); });
    inner.on('click', () => { inner.isTooltipOpen() ? inner.closeTooltip() : inner.openTooltip(); });

    window._wmtHeatLayers.push(circle, inner);
  });

  const bounds = L.latLngBounds(WMT_ZONES.map(z => [z.lat, z.lng])).pad(0.35);
  map.fitBounds(bounds);

  // Directional legend removed from persistent view — direction info now
  // shown on hover via marker tooltip (see makePinIcon/addMarker).
  const existingLegend = document.getElementById('dir-legend');
  if (existingLegend) existingLegend.remove();
}
