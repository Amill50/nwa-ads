  // Supabase config — publishable/anon key only. Safe to expose client-side;
  // access is enforced server-side via Row Level Security policies.
  window.SUPABASE_CONFIG = window.ENV_CONFIG ? {
    url: window.ENV_CONFIG.supabaseUrl,
    publishableKey: window.ENV_CONFIG.supabaseKey,
  } : {
    url: 'https://etytgvxkjqjnriflktzv.supabase.co',
    publishableKey: 'sb_publishable_6T9Ikbmq5ldlzNB_Bncheg_C8K52sB8',
  };

/* ══════════════ AUTH (Supabase) ══════════════ */
const sbClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey);
let AUTH_SESSION = null;
let AUTH_PENDING_STEP = null; // step user was trying to reach when login was required

function renderNavAccount() {
  const el = document.getElementById('nav-account');
  if (!el) return;
  if (AUTH_SESSION) {
    const email = AUTH_SESSION.user.email || '';
    const initial = email ? email[0].toUpperCase() : '?';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${initial}</div>
          <div>
            <div style="font-size:11px;color:rgba(255,255,255,0.85);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;line-height:1.3">${email}</div>
            <div style="display:flex;gap:8px">
              <a style="font-size:9px;color:rgba(255,255,255,0.65);text-decoration:underline;cursor:pointer" onclick="showMyCampaigns()">My campaigns</a>
              <a style="font-size:9px;color:rgba(255,255,255,0.65);text-decoration:underline;cursor:pointer" onclick="signOut()">Sign out</a>
            </div>
          </div>
        </div>
        <div id="nav-cart-row" style="display:flex;align-items:center;gap:6px;background:#c8440a;border-radius:16px;padding:5px 11px;cursor:pointer;flex-shrink:0" onclick="openCartSidebar()">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span id="nav-cart-label" style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap">No screens added yet</span>
        </div>
      </div>
    `;
    updateNavCartSummary();
  } else {
    el.innerHTML = `<button class="nav-account-link" onclick="openAuthModal()">Sign in</button>`;
  }
}

function openAuthModal() {
  document.getElementById('auth-modal-overlay').classList.add('open');
  document.getElementById('auth-modal-body').innerHTML = `
    <h2>Sign in</h2>
    <p class="auth-sub">We'll email you a secure link — no password needed. Your campaigns are tied to your account so you can come back and check on them anytime.</p>
    <input type="email" id="auth-email-input" placeholder="jane@yourbusiness.com" autocomplete="email" />
    <button class="auth-modal-btn" id="auth-send-btn" onclick="sendMagicLink()">Send magic link</button>
    <div class="auth-modal-status" id="auth-modal-status"></div>
  `;
  setTimeout(() => document.getElementById('auth-email-input')?.focus(), 50);
}

function closeAuthModal() {
  document.getElementById('auth-modal-overlay').classList.remove('open');
  AUTH_PENDING_STEP = null;
}

async function sendMagicLink() {
  const input = document.getElementById('auth-email-input');
  const status = document.getElementById('auth-modal-status');
  const btn = document.getElementById('auth-send-btn');
  const email = (input?.value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.textContent = 'Please enter a valid email address.';
    status.className = 'auth-modal-status error';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Sending…';
  status.textContent = '';
  status.className = 'auth-modal-status';
  try {
    const { error } = await sbClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
    document.getElementById('auth-modal-body').innerHTML = `
      <h2>Check your email</h2>
      <p class="auth-sub">We sent a sign-in link to <strong>${email}</strong>. Click it to come back here signed in — you can close this window.</p>
    `;
  } catch (err) {
    status.textContent = err.message || 'Something went wrong sending your link. Please try again.';
    status.className = 'auth-modal-status error';
    btn.disabled = false;
    btn.textContent = 'Send magic link';
  }
}

async function signOut() {
  await sbClient.auth.signOut();
}

// Called after login succeeds (fresh sign-in or restored session) to resume
// whatever the user was doing before the auth gate interrupted them.
function onAuthReady() {
  renderNavAccount();
  if (AUTH_SESSION && AUTH_PENDING_STEP) {
    const step = AUTH_PENDING_STEP;
    AUTH_PENDING_STEP = null;
    closeAuthModal();
    goToPanel(step);
  }
}

sbClient.auth.onAuthStateChange((_event, session) => {
  AUTH_SESSION = session;
  onAuthReady();
});

sbClient.auth.getSession().then(({ data }) => {
  AUTH_SESSION = data.session;
  renderNavAccount();
});

/* ══════════════ MY CAMPAIGNS ══════════════ */
const CAMPAIGN_STATUS_LABELS = {
  draft: 'Draft',
  pending_confirmation: 'Pending confirmation',
  confirmed: 'Confirmed',
  live: 'Live',
  completed: 'Completed',
};
let MY_CAMPAIGNS_CACHE = [];

async function showMyCampaigns() {
  if (!AUTH_SESSION) { AUTH_PENDING_STEP = 'mc'; openAuthModal(); return; }
  for (let i=1;i<=10;i++) document.getElementById('panel-'+i)?.classList.remove('active');
  document.getElementById('panel-9').classList.add('active');
  window.scrollTo(0,0);
  const list = document.getElementById('mc-list');
  list.innerHTML = '<div class="mc-empty">Loading your campaigns…</div>';
  const { data, error } = await sbClient
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    list.innerHTML = `<div class="mc-empty">Couldn't load your campaigns: ${error.message}</div>`;
    return;
  }
  MY_CAMPAIGNS_CACHE = data || [];
  if (!MY_CAMPAIGNS_CACHE.length) {
    list.innerHTML = '<div class="mc-empty">No campaigns yet. Book your first one to see it here.</div>';
    return;
  }
  list.innerHTML = MY_CAMPAIGNS_CACHE.map(c => {
    const dates = (c.flight_start && c.flight_end) ? `${c.flight_start} – ${c.flight_end}` : 'Dates TBD';
    const budget = c.budget ? '$' + Number(c.budget).toLocaleString() + '/wk' : '—';
    const statusKey = CAMPAIGN_STATUS_LABELS[c.status] ? c.status : 'draft';
    return `
      <div class="mc-row" onclick="showCampaignDetail('${c.id}')">
        <div class="mc-row-main">
          <div class="mc-row-name">${c.company_name || 'Untitled campaign'}</div>
          <div class="mc-row-meta">${budget} · ${dates} · Created ${new Date(c.created_at).toLocaleDateString()}</div>
        </div>
        <span class="campaign-badge ${statusKey}">${CAMPAIGN_STATUS_LABELS[statusKey]}</span>
      </div>
    `;
  }).join('');
}

function closeMyCampaigns() {
  for (let i=1;i<=10;i++) document.getElementById('panel-'+i)?.classList.remove('active');
  document.getElementById('panel-1').classList.add('active');
  window.scrollTo(0,0);
}

function showCampaignDetail(id) {
  const c = MY_CAMPAIGNS_CACHE.find(x => x.id === id);
  if (!c) return;
  const detail = document.getElementById('mc-detail');
  const statusKey = CAMPAIGN_STATUS_LABELS[c.status] ? c.status : 'draft';
  const screens = c.screens && typeof c.screens === 'object' ? Object.values(c.screens) : [];
  detail.innerHTML = `
    <h1 class="s1-title">${c.company_name || 'Untitled campaign'}</h1>
    <div style="margin:12px 0 24px"><span class="campaign-badge ${statusKey}">${CAMPAIGN_STATUS_LABELS[statusKey]}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
      <div><div style="font-size:11px;text-transform:uppercase;color:#6b6560;font-weight:600;margin-bottom:4px">Contact</div><div>${c.contact_name || '—'}<br>${c.contact_email || ''}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:#6b6560;font-weight:600;margin-bottom:4px">Budget</div><div>${c.budget ? '$'+Number(c.budget).toLocaleString()+'/wk' : '—'}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:#6b6560;font-weight:600;margin-bottom:4px">Flight dates</div><div>${c.flight_start && c.flight_end ? c.flight_start + ' – ' + c.flight_end : '—'}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:#6b6560;font-weight:600;margin-bottom:4px">Submitted</div><div>${new Date(c.created_at).toLocaleString()}</div></div>
    </div>
    <div style="font-size:11px;text-transform:uppercase;color:#6b6560;font-weight:600;margin-bottom:10px">Screens (${screens.length})</div>
    ${screens.length ? screens.map(s => {
      const _vti = typeof VENUE_TYPE_IMG !== 'undefined' ? VENUE_TYPE_IMG : {};
      const imgSrc = (s && (s.img || s.image_url || _vti[s.venue_type] || _vti[s.type])) || '';
      const photoHtml = imgSrc
        ? `<img src="${imgSrc}" alt="" style="width:56px;height:42px;object-fit:cover;border-radius:6px;flex-shrink:0;margin-right:12px" onerror="this.style.display='none'">`
        : '';
      return `<div class="mc-row" style="cursor:default;display:flex;align-items:center">
        ${photoHtml}<div class="mc-row-main"><div class="mc-row-name">${(s && (s.name||s.label)) || 'Screen'}</div>${s && s.venue_type ? `<div class="mc-row-meta">${s.venue_type}</div>` : ''}</div>
      </div>`;
    }).join('') : '<div class="mc-empty">No screen snapshot saved for this campaign.</div>'}
  `;
  for (let i=1;i<=10;i++) document.getElementById('panel-'+i)?.classList.remove('active');
  document.getElementById('panel-10').classList.add('active');
  window.scrollTo(0,0);
}

/* RATE_CONFIG moved to /shared/js/pricing.js */

