/* ══════════════ PHOTO OVERRIDES ══════════════
   Shared resolver for per-screen photo overrides stored in Supabase.
   Load order: after supabase.js and venue-type-img.js, before tool JS.
   ═══════════════════════════════════════════ */

let _photoOverridesPromise = null;

async function loadPhotoOverrides(client) {
  if (_photoOverridesPromise) return _photoOverridesPromise;
  _photoOverridesPromise = (async () => {
    const sb = client;
    if (!sb) { window.PHOTO_OVERRIDES = new Map(); return window.PHOTO_OVERRIDES; }
    const { data } = await sb.from('screen_photo_overrides').select('*');
    window.PHOTO_OVERRIDES = new Map((data || []).map(r => [r.screen_id, r]));
    return window.PHOTO_OVERRIDES;
  })();
  return _photoOverridesPromise;
}

function refreshPhotoOverrides(client) {
  _photoOverridesPromise = null;
  window.PHOTO_OVERRIDES = null;
  return loadPhotoOverrides(client);
}

function resolveScreenImg(s) {
  if (!s) return null;
  const ov = window.PHOTO_OVERRIDES && window.PHOTO_OVERRIDES.get(s.id);
  if (ov && ov.image_url) return ov.image_url;
  if (s.img) return s.img;
  const vti = typeof VENUE_TYPE_IMG !== 'undefined' ? VENUE_TYPE_IMG : {};
  return vti[s.venue_type] || vti[s.type] || null;
}
