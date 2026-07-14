/* ══════════════ ENVIRONMENT ══════════════
   Runtime environment detection by hostname. Production = nwa-ads.com.
   Everything else (deploy previews, staging--*.netlify.app, localhost)
   is treated as STAGING: a visible ribbon is injected and, once a
   staging Supabase project exists, its keys swap in below (one-line change).
   Must be the FIRST local script loaded on every page.
   ══════════════════════════════════════════ */
(function () {
  var host = window.location.hostname;
  var isProd = host === 'nwa-ads.com' || host === 'www.nwa-ads.com';
  window.APP_ENV = isProd ? 'production' : 'staging';

  window.ENV_CONFIG = isProd ? {
    supabaseUrl: 'https://etytgvxkjqjnriflktzv.supabase.co',
    supabaseKey: 'sb_publishable_6T9Ikbmq5ldlzNB_Bncheg_C8K52sB8',
  } : {
    // STAGING — currently points at the production Supabase project.
    // When a staging Supabase project is created, change these two lines only.
    supabaseUrl: 'https://etytgvxkjqjnriflktzv.supabase.co',
    supabaseKey: 'sb_publishable_6T9Ikbmq5ldlzNB_Bncheg_C8K52sB8',
  };

  if (!isProd) {
    document.addEventListener('DOMContentLoaded', function () {
      var r = document.createElement('div');
      r.textContent = 'STAGING';
      r.setAttribute('style',
        'position:fixed;bottom:14px;left:14px;z-index:99999;background:#c8440a;color:#fff;' +
        'font:700 11px/1 system-ui,sans-serif;letter-spacing:2px;padding:6px 12px;' +
        'border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.3);pointer-events:none;opacity:0.92');
      document.body.appendChild(r);
    });
  }
})();
