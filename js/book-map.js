function initMap() {
  if (map) { setTimeout(()=>map.invalidateSize(),100); return; }
  map = L.map('map', { center:[36.28, -94.21], zoom:11, zoomControl:true });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:'&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom:19
  }).addTo(map);

  // MarkerCluster group — styled to match NWA Ads design
  markerCluster = L.markerClusterGroup({
    maxClusterRadius: 60,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    spiderfyOnMaxZoom: true,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      const size = count >= 20 ? 44 : count >= 10 ? 38 : 32;
      return L.divIcon({
        html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#1a1714;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,0.25);font-family:Instrument Sans,sans-serif">' + count + '</div>',
        className: '',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
      });
    }
  });
  map.addLayer(markerCluster);

  /* Legend */
  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = function() {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'background:#fff;padding:12px 16px;border-radius:12px;border:1px solid #e2ddd6;font-family:Instrument Sans,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.12);min-width:160px;max-height:calc(100vh - 200px);overflow-y:auto';
    div.innerHTML = buildLegendHtml();
    // (legend HTML is generated dynamically above)
    if (false) { div.innerHTML = `
      <label style="display:none"><!-- placeholder kept for linter -->
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Gas Station">
        <input type="checkbox" checked data-type="gasstation" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#b45309;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#b45309;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Gas Station</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Dining">
        <input type="checkbox" checked data-type="dining" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#b91c1c;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#b91c1c;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Dining</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Healthcare">
        <input type="checkbox" checked data-type="healthcare" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#0e7490;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#0e7490;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Healthcare</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Gym">
        <input type="checkbox" checked data-type="gym" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#1d4ed8;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#1d4ed8;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Gym</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Cinema">
        <input type="checkbox" checked data-type="cinema" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#6b21a8;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#6b21a8;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Cinema</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Grocery">
        <input type="checkbox" checked data-type="grocery" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#15803d;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#15803d;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Grocery</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Airport">
        <input type="checkbox" checked data-type="airport" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#1a3d6a;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#1a3d6a;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Airport</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Rideshare">
        <input type="checkbox" checked data-type="rideshare" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#374151;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#374151;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Rideshare</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Residential">
        <input type="checkbox" checked data-type="residential" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#92400e;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#92400e;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Residential</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Sports">
        <input type="checkbox" checked data-type="sports" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#be185d;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#be185d;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Sports</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Retail">
        <input type="checkbox" checked data-type="retail" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#4f46e5;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4f46e5;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Retail</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Campus">
        <input type="checkbox" checked data-type="education" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#0369a1;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#0369a1;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Campus</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Recreation">
        <input type="checkbox" checked data-type="recreation" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#a21caf;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#a21caf;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Recreation</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle Office">
        <input type="checkbox" checked data-type="office" onchange="toggleVenueType(this)"
          style="width:13px;height:13px;accent-color:#57534e;cursor:pointer;flex-shrink:0">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#57534e;flex-shrink:0"></span>
        <span style="font-size:12px;color:#1a1714">Office</span>
      </label>
      </label>
    `; } // end placeholder
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  legend.addTo(map);

  INV.forEach(s => addMarker(s));
  setTimeout(()=>map.invalidateSize(),200);
}

/* ══════════════ VENUE ICON SYSTEM ══════════════ */
const VENUE_COLORS = {
  // Full venue_type strings (new inventory schema)
  'Digital Billboard':        '#c8440a',
  'Grocery Store':            '#1f3d2a',
  'Cinema (In-Theater)':      '#8b5cf6',
  'Gym':                      '#4a5da8',
  'Casual Dining':            '#b5843c',
  'Quick Service Restaurant': '#b5843c',
  'Bar/Restaurant TV':        '#b5843c',
  'Sports Entertainment':     '#2a8a5c',
  'Recreational (NEW)':       '#2a8a5c',
  'Airport':                  '#0d7377',
  'Doctors Office':           '#e07830',
  'Taxi / Rideshare Interior':'#6b6560',
  'Salon & Spa':              '#6b6560',
  'Gas Station':              '#b45309',
  'Convenience Store':        '#b45309',
  'Apartment Building':       '#92400e',
  'College Campus':           '#0369a1',
  'School (NEW)':             '#0369a1',
  'Office Building (NEW)':    '#57534e',
  // Short-code aliases (backward compat)
  billboard:  '#c8440a', digital: '#c8440a', static: '#c8440a',
  grocery:    '#1f3d2a',
  cinema:     '#8b5cf6',
  gym:        '#4a5da8',
  dining:     '#b5843c',
  sports:     '#2a8a5c', recreation: '#2a8a5c',
  airport:    '#0d7377',
  healthcare: '#e07830',
  rideshare:  '#6b6560',
  gasstation: '#b45309',
  residential:'#92400e',
  retail:     '#4f46e5',
  education:  '#0369a1',
  office:     '#57534e',
};

const VENUE_SVG = {
  'Digital Billboard':        '<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1.5" width="3" height="2" rx="0.5" fill="white" stroke="none"/><rect x="12.5" y="1.5" width="3" height="2" rx="0.5" fill="white" stroke="none"/><rect x="22" y="1.5" width="3" height="2" rx="0.5" fill="white" stroke="none"/><rect x="2" y="3.5" width="24" height="13" rx="1"/><line x1="8" y1="16.5" x2="8" y2="24"/><line x1="20" y1="16.5" x2="20" y2="24"/><line x1="8" y1="20" x2="20" y2="20"/><line x1="5" y1="24" x2="11" y2="24"/><line x1="17" y1="24" x2="23" y2="24"/></svg>',
  'Grocery Store':            '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  'Cinema (In-Theater)':      '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
  'Gym':                      '<svg viewBox="0 0 28 28" fill="white" stroke="none"><rect x="1" y="9" width="4" height="10" rx="1.5"/><rect x="5" y="11" width="2.5" height="6" rx="1"/><rect x="7.5" y="12.5" width="13" height="3" rx="1"/><rect x="20.5" y="11" width="2.5" height="6" rx="1"/><rect x="23" y="9" width="4" height="10" rx="1.5"/></svg>',
  'Casual Dining':            '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h2Zm0 0v7"/></svg>',
  'Quick Service Restaurant': '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h2Zm0 0v7"/></svg>',
  'Bar/Restaurant TV':        '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h2Zm0 0v7"/></svg>',
  'Sports Entertainment':     '<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="5.5"/><path d="M5.5 7.5 Q8 8.5 10.5 7.5"/><path d="M5.5 10 Q8 11 10.5 10"/><circle cx="8.5" cy="20.5" r="4.5"/><path d="M6.5 18 C7 19 7 22 6.5 23"/><path d="M10.5 18 C10 19 10 22 10.5 23"/><circle cx="20" cy="15" r="7"/><line x1="13" y1="15" x2="27" y2="15"/><path d="M17 8.5 Q20 12 20 15 Q20 18 17 21.5"/><path d="M23 8.5 Q20 12 20 15 Q20 18 23 21.5"/></svg>',
  'Recreational (NEW)':       '<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="5.5"/><path d="M5.5 7.5 Q8 8.5 10.5 7.5"/><path d="M5.5 10 Q8 11 10.5 10"/><circle cx="8.5" cy="20.5" r="4.5"/><path d="M6.5 18 C7 19 7 22 6.5 23"/><path d="M10.5 18 C10 19 10 22 10.5 23"/><circle cx="20" cy="15" r="7"/><line x1="13" y1="15" x2="27" y2="15"/><path d="M17 8.5 Q20 12 20 15 Q20 18 17 21.5"/><path d="M23 8.5 Q20 12 20 15 Q20 18 23 21.5"/></svg>',
  'Airport':                  '<svg viewBox="0 0 28 28" fill="white" stroke="none"><path d="M13 24 L16 8 C16.3 6.5 15.5 5 14 5 C12.5 5 11.7 6.5 12 8 Z"/><path d="M5 19 L14 14 L23 19 L21 20 L14 17 L7 20 Z"/><path d="M10 23 L14 20 L18 23 L17 24 L14 22 L11 24 Z"/></svg>',
  'Doctors Office':           '<svg viewBox="0 0 28 28" fill="white" stroke="none"><circle cx="14" cy="6.5" r="4"/><path d="M7 28 V20 C7 15.5 10 13 14 13 C18 13 21 15.5 21 20 V28 Z"/><path d="M10.5 15.5 C8 16 7 18 7 20" fill="none" stroke="#e07830" stroke-width="1.8" stroke-linecap="round"/><path d="M10.5 15.5 C9.5 17 9.5 19 11 20.5" fill="none" stroke="#e07830" stroke-width="1.8" stroke-linecap="round"/><circle cx="11" cy="21.5" r="1.8" fill="#e07830"/></svg>',
  'Taxi / Rideshare Interior':'<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="14" rx="1.5"/><line x1="6" y1="16" x2="8" y2="16"/><line x1="12" y1="11" x2="17" y2="11"/><polyline points="15,8.5 17.5,11 15,13.5"/><rect x="17" y="16" width="10" height="6" rx="1.2"/><path d="M19 16 L20.5 13 L24.5 13 L26 16"/><circle cx="20" cy="22" r="1.2" fill="white"/><circle cx="25" cy="22" r="1.2" fill="white"/></svg>',
  'Salon & Spa':              '<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="14" rx="1.5"/><line x1="6" y1="16" x2="8" y2="16"/><line x1="12" y1="11" x2="17" y2="11"/><polyline points="15,8.5 17.5,11 15,13.5"/><rect x="17" y="16" width="10" height="6" rx="1.2"/><path d="M19 16 L20.5 13 L24.5 13 L26 16"/><circle cx="20" cy="22" r="1.2" fill="white"/><circle cx="25" cy="22" r="1.2" fill="white"/></svg>',
  'Gas Station':              '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M15 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2"/><path d="M3 22h12"/><rect x="6" y="9" width="5" height="4" rx="1"/></svg>',
  'Convenience Store':        '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M15 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2"/><path d="M3 22h12"/><rect x="6" y="9" width="5" height="4" rx="1"/></svg>',
  'Apartment Building':       '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  'College Campus':           '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  'School (NEW)':             '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  'Office Building (NEW)':    '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  // Short-code aliases
  billboard:  '<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1.5" width="3" height="2" rx="0.5" fill="white" stroke="none"/><rect x="12.5" y="1.5" width="3" height="2" rx="0.5" fill="white" stroke="none"/><rect x="22" y="1.5" width="3" height="2" rx="0.5" fill="white" stroke="none"/><rect x="2" y="3.5" width="24" height="13" rx="1"/><line x1="8" y1="16.5" x2="8" y2="24"/><line x1="20" y1="16.5" x2="20" y2="24"/><line x1="8" y1="20" x2="20" y2="20"/><line x1="5" y1="24" x2="11" y2="24"/><line x1="17" y1="24" x2="23" y2="24"/></svg>',
  grocery:    '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  cinema:     '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
  gym:        '<svg viewBox="0 0 28 28" fill="white" stroke="none"><rect x="1" y="9" width="4" height="10" rx="1.5"/><rect x="5" y="11" width="2.5" height="6" rx="1"/><rect x="7.5" y="12.5" width="13" height="3" rx="1"/><rect x="20.5" y="11" width="2.5" height="6" rx="1"/><rect x="23" y="9" width="4" height="10" rx="1.5"/></svg>',
  dining:     '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h2Zm0 0v7"/></svg>',
  sports:     '<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="5.5"/><path d="M5.5 7.5 Q8 8.5 10.5 7.5"/><path d="M5.5 10 Q8 11 10.5 10"/><circle cx="8.5" cy="20.5" r="4.5"/><path d="M6.5 18 C7 19 7 22 6.5 23"/><path d="M10.5 18 C10 19 10 22 10.5 23"/><circle cx="20" cy="15" r="7"/><line x1="13" y1="15" x2="27" y2="15"/><path d="M17 8.5 Q20 12 20 15 Q20 18 17 21.5"/><path d="M23 8.5 Q20 12 20 15 Q20 18 23 21.5"/></svg>',
  airport:    '<svg viewBox="0 0 28 28" fill="white" stroke="none"><path d="M13 24 L16 8 C16.3 6.5 15.5 5 14 5 C12.5 5 11.7 6.5 12 8 Z"/><path d="M5 19 L14 14 L23 19 L21 20 L14 17 L7 20 Z"/><path d="M10 23 L14 20 L18 23 L17 24 L14 22 L11 24 Z"/></svg>',
  healthcare: '<svg viewBox="0 0 28 28" fill="white" stroke="none"><circle cx="14" cy="6.5" r="4"/><path d="M7 28 V20 C7 15.5 10 13 14 13 C18 13 21 15.5 21 20 V28 Z"/><path d="M10.5 15.5 C8 16 7 18 7 20" fill="none" stroke="#e07830" stroke-width="1.8" stroke-linecap="round"/><path d="M10.5 15.5 C9.5 17 9.5 19 11 20.5" fill="none" stroke="#e07830" stroke-width="1.8" stroke-linecap="round"/><circle cx="11" cy="21.5" r="1.8" fill="#e07830"/></svg>',
  rideshare:  '<svg viewBox="0 0 28 28" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="14" rx="1.5"/><line x1="6" y1="16" x2="8" y2="16"/><line x1="12" y1="11" x2="17" y2="11"/><polyline points="15,8.5 17.5,11 15,13.5"/><rect x="17" y="16" width="10" height="6" rx="1.2"/><path d="M19 16 L20.5 13 L24.5 13 L26 16"/><circle cx="20" cy="22" r="1.2" fill="white"/><circle cx="25" cy="22" r="1.2" fill="white"/></svg>',
  gasstation: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M15 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2"/><path d="M3 22h12"/><rect x="6" y="9" width="5" height="4" rx="1"/></svg>',
  residential:'<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  retail:     '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  education:  '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  office:     '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  recreation: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>',
};

function venueColor(typeOrVenueType) {
  return VENUE_COLORS[typeOrVenueType] || '#4a4540';
}

function makeIconHtml(typeOrVenueType, size) {
  const s = size || 36;
  const svgSz = Math.round(s * 0.58);
  const color = venueColor(typeOrVenueType);
  const svgRaw = VENUE_SVG[typeOrVenueType] || VENUE_SVG.billboard;
  const svg = svgRaw.replace('<svg ', '<svg style="pointer-events:none" width="' + svgSz + '" height="' + svgSz + '" ');
  return '<div style="width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + color
       + ';border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 3px 14px rgba(0,0,0,0.28)'
       + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none">' + svg + '</div>';
}

function makeIcon(typeOrVenueType, size) {
  const s = size || 36;
  return L.divIcon({
    className:   '',
    html:        makeIconHtml(typeOrVenueType, s),
    iconSize:    [s, s],
    iconAnchor:  [s / 2, s / 2],
    popupAnchor: [0, -(s / 2 + 4)],
  });
}

function buildLegendHtml() {
  const types = [
    { key: 'Digital Billboard',        label: 'Billboard' },
    { key: 'Gas Station',              label: 'Gas Station' },
    { key: 'Casual Dining',            label: 'Casual Dining' },
    { key: 'Quick Service Restaurant', label: 'QSR' },
    { key: 'Doctors Office',           label: 'Healthcare' },
    { key: 'Gym',                      label: 'Gym' },
    { key: 'Cinema (In-Theater)',       label: 'Cinema' },
    { key: 'Grocery Store',            label: 'Grocery' },
    { key: 'Airport',                  label: 'Airport' },
    { key: 'Taxi / Rideshare Interior',label: 'Rideshare' },
    { key: 'Sports Entertainment',     label: 'Sports' },
    { key: 'Recreational (NEW)',       label: 'Recreation' },
    { key: 'Salon & Spa',              label: 'Salon & Spa' },
    { key: 'Bar/Restaurant TV',        label: 'Bar TV' },
    { key: 'College Campus',           label: 'Campus' },
    { key: 'Apartment Building',       label: 'Residential' },
    { key: 'Office Building (NEW)',    label: 'Office' },
    { key: 'Convenience Store',        label: 'Convenience' },
  ];
  return '<div style="font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#6b6560;margin-bottom:8px">Venue type</div>'
    + types.map(function(t) {
      return '<label style="display:flex;align-items:center;gap:7px;cursor:pointer;padding:2px 0;user-select:none" title="Toggle ' + t.label + '">'
        + '<input type="checkbox" checked data-vtype="' + t.key.replace(/"/g,'&quot;') + '" onchange="toggleVenueType(this)" style="width:13px;height:13px;accent-color:' + venueColor(t.key) + ';cursor:pointer;flex-shrink:0">'
        + makeIconHtml(t.key, 18)
        + '<span style="font-size:12px;color:#1a1714">' + t.label + '</span>'
        + '</label>';
    }).join('')
    + '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2ddd6;font-size:10px;color:#6b6560">Click to filter map &amp; list</div>';
}

function pinClass(type) {
  const MAP = {
    billboard:'billboard', digital:'billboard',
    gasstation:'gasstation', cinema:'cinema', airport:'airport',
    healthcare:'healthcare', dining:'dining', grocery:'grocery',
    gym:'gym', rideshare:'rideshare', residential:'residential',
    sports:'sports', retail:'retail', education:'education',
    office:'office', recreation:'recreation',
  };
  return MAP[type] || 'billboard';
}

function makePinIcon(s) {
  if ((s.venue_type === 'Digital Billboard' || s.type === 'billboard') &&
      ST.goal === "Reach Walmart & Sam's Club buyers" &&
      s._direction) {
    const arrow = s._direction === 'inbound' ? '▶ HQ' : '◀ Home';
    const badge = s._priority ? '⭐ ' : '';
    const color = s._direction === 'inbound' ? '#1f3d2a' : '#c8440a';
    return L.divIcon({
      className: '',
      html: '<div style="background:' + color + ';color:#fff;border-radius:10px;padding:3px 8px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);font-family:inherit;line-height:1.4;border:2px solid #fff;pointer-events:none;">'
        + badge
        + '<br><span style="font-size:8px;font-weight:400;opacity:0.85">' + arrow + '</span></div>',
      iconSize:   [60, 32],
      iconAnchor: [30, 16],
    });
  }
  return makeIcon(s.venue_type || s.type, 36);
}

function addMarker(s) {
  const m = L.marker([s.lat, s.lng], { icon: makePinIcon(s) });
  m.on('click', () => openPopup(s, m));
  bindDirectionTooltip(s, m);
  markers[s.id] = m;
  if (markerCluster) markerCluster.addLayer(m);
  else m.addTo(map);
}

function bindDirectionTooltip(s, m) {
  if (m.getTooltip()) m.unbindTooltip();
  if (s.type !== 'billboard' || !s._direction) return;
  if (ST.goal !== "Reach Walmart & Sam's Club buyers") return;
  const arrow = s._direction === 'inbound' ? '▶ HQ' : '◀ Home';
  const color = s._direction === 'inbound' ? '#1f3d2a' : '#c8440a';
  const label = s._direction === 'inbound' ? 'Inbound to Home Office' : 'Outbound to residential';
  const priorityRow = s._priority
    ? '<div style="display:flex;align-items:center;gap:6px;margin-top:4px">'
      + '<span style="font-size:11px">⭐</span>'
      + '<span style="font-size:10px;color:#1a1714">Priority unit (Exit 86 / SE Walton)</span></div>'
    : '';
  const html = '<div style="font-family:inherit;padding:2px 2px">'
    + '<div style="display:flex;align-items:center;gap:6px">'
    + '<span style="background:' + color + ';color:#fff;border-radius:6px;'
    + 'padding:2px 6px;font-size:10px;font-weight:700">' + arrow + '</span>'
    + '<span style="font-size:11px;color:#1a1714">' + label + '</span></div>'
    + priorityRow
    + '</div>';
  m.bindTooltip(html, { direction: 'top', offset: [0, -18], className: 'billboard-dir-tip', opacity: 1 });
}

function refreshMarkers() {
  if (!markerCluster) return;
  // Rebuild cluster from scratch on each refresh — most reliable approach
  markerCluster.clearLayers();
  const toAdd = [];
  INV.forEach(s => {
    const m = markers[s.id];
    if (!m) return;
    m.setIcon(makePinIcon(s));
    bindDirectionTooltip(s, m);
    if (isVisible(s)) toAdd.push(m);
  });
  // Hard fallback: the map must never render empty. If goal/filter logic
  // ever computes zero visible screens, fall back to showing full inventory
  // rather than a blank map.
  if (toAdd.length === 0 && INV.length > 0) {
    INV.forEach(s => { const m = markers[s.id]; if (m) toAdd.push(m); });
  }
  markerCluster.addLayers(toAdd);
}



function openPopup(s, m) {
  const cls = pinClass(s.type);
  const badgeTxtMap = {digital:'🛣 Billboard',billboard:'🛣 Billboard',cinema:'🎬 Cinema',gasstation:'⛽ Gas Station',airport:'✈ Airport',healthcare:'🏥 Healthcare',dining:'🍽️ Dining',grocery:'🛒 Grocery',gym:'🏋️ Gym',rideshare:'🚗 Rideshare',residential:'🏢 Residential',sports:'🏟️ Sports & Entertainment',recreation:'🎳 Recreation',retail:'🏪 Retail',education:'🎓 Campus',office:'🏢 Office'};
  const badgeTxt = badgeTxtMap[s.type] || s.type;
  const inCart = !!ST.cart[s.id];
  const popupPrice = Math.round(unitRate(s));
  const popup = L.popup({ maxWidth:260, closeButton:true })
    .setContent(`
      <div class="popup-inner">
        <span class="popup-badge ${cls}">${badgeTxt}</span>
        <div class="popup-name">${s.name}</div>
        <div class="popup-area">${s.area} · ${s.venue_type || s.label || ''}</div>
      </div>
      <div class="popup-stats">
        <div class="popup-stat"><span class="ps-val">${s.impr}</span><span class="ps-lbl">Impressions</span></div>
        <div class="popup-stat"><span class="ps-val">$${s.cpm.toFixed(2)}</span><span class="ps-lbl">CPM</span></div>
        <div class="popup-stat"><span class="ps-val">${(s.video===true||s.video==='Y')?'Video':'Static'}</span><span class="ps-lbl">Format</span></div>
      </div>
      <div class="popup-footer" style="flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <div class="popup-price">$${popupPrice.toLocaleString()} <small>${rateLabel()}</small></div>
          <button class="popup-add${inCart?' added':''}" id="popup-btn-${s.id}" onclick="toggleFromPopup('${s.id}')">${inCart?'✓ Added':'+ Add'}</button>
        </div>
        <button onclick="map.closePopup();openDrawer('${s.id}')" style="width:100%;padding:7px;background:none;border:1px solid #e2ddd6;border-radius:6px;font-family:'Instrument Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;color:#4a4540;transition:all 0.15s" onmouseover="this.style.borderColor='#c8440a';this.style.color='#c8440a'" onmouseout="this.style.borderColor='#e2ddd6';this.style.color='#4a4540'">View full details →</button>
      </div>
    `);

  m.bindPopup(popup).openPopup();
  openPopupId = s.id;

  /* Scroll card into view */
  setTimeout(()=>{
    const card = document.querySelector(`.sc-card[data-id="${s.id}"]`);
    if (card) { card.classList.add('focused'); card.scrollIntoView({behavior:'smooth',block:'nearest'}); setTimeout(()=>card.classList.remove('focused'),1200); }
  }, 100);
}

function toggleFromPopup(id) {
  toggleScreen(id);
  const btn = document.getElementById('popup-btn-'+id);
  if (btn) { const inCart = !!ST.cart[id]; btn.textContent = inCart ? '✓ Added' : '+ Add'; btn.classList.toggle('added', inCart); }
}

/* ══════════════ SCREEN LIST ══════════════ */
function renderList() {
  const container = document.getElementById('tab-screens-content');
  container.innerHTML = '';

  // For Walmart goal, force 2-mile filter
  if (ST.goal === "Reach Walmart & Sam's Club buyers" && ST.filter !== 'walmart_hq_2mi') {
    ST.filter = 'walmart_hq_2mi';
    // Update chips
    document.querySelectorAll('.f-chip').forEach(c => c.classList.remove('on'));
    const wChip = document.getElementById('chip-walmart-2mi');
    if (wChip) { wChip.style.display = 'inline-flex'; wChip.classList.add('on'); }
  } else if (ST.goal !== "Reach Walmart & Sam's Club buyers") {
    // Hide walmart 2mi chip for other goals
    const wChip = document.getElementById('chip-walmart-2mi');
    if (wChip) wChip.style.display = 'none';
  }

  let visible = INV.filter(s => isVisible(s));

  // Sort by proximity if foot traffic / event goal + target set
  const hasProxTarget = (ST.goal === 'Drive customers through your door') && ST.proximityTarget;
  if (hasProxTarget) visible = sortedByProximity(visible);

  // For Walmart goal, sort by distance from HQ
  if (ST.goal === "Reach Walmart & Sam's Club buyers") {
    visible = visible.sort((a,b) =>
      haversineMiles(WALMART_HQ.lat, WALMART_HQ.lng, a.lat, a.lng) -
      haversineMiles(WALMART_HQ.lat, WALMART_HQ.lng, b.lat, b.lng)
    );
  }

  const countSuffix = ST.goal === "Reach Walmart & Sam's Club buyers"
    ? ' · in Walmart buyer zones'
    : hasProxTarget ? ' · sorted by proximity' : ' across NWA';
  const _scEl = document.getElementById('screen-count');
  if (_scEl) _scEl.textContent = visible.length + ' screens' + countSuffix;
  document.getElementById('s2-count').textContent = visible.length + ' screens' + countSuffix;
  const sortNote = document.getElementById('prox-sort-note');
  if (sortNote) sortNote.classList.toggle('visible', hasProxTarget);

  const _allVisible = INV.filter(s => isVisible(s));
  const _inBudget   = _allVisible.filter(s => {
    const r = s.wkly_rate || Math.round((s.cpm||0)*(s.weekly_imp||0)/1000);
    return r > 0 && r <= (ST.budget||2000) * 1.1;
  });
  const _listEl = document.getElementById('tab-screens-content');

  if (_allVisible.length > 0 && _inBudget.length === 0 && _listEl) {
    const cheapestVisible = _allVisible
      .map(s => ({ ...s, _r: s.wkly_rate || Math.round((s.cpm||0)*(s.weekly_imp||0)/1000) }))
      .filter(s => s._r > 0).sort((a,b) => a._r - b._r)[0];
    _listEl.innerHTML = `
      <div style="padding:28px 16px;text-align:center">
        <div style="font-size:36px;margin-bottom:10px">💸</div>
        <div style="font-size:14px;font-weight:600;color:#1a1714;margin-bottom:6px">
          No screens match your budget
        </div>
        <div style="font-size:12px;color:#6b6560;line-height:1.5;margin-bottom:16px">
          ${_allVisible.length} screen${_allVisible.length!==1?'s':''} available for this
          objective, but none fit your <strong>$${(ST.budget||0).toLocaleString()}/wk</strong> budget.
          ${cheapestVisible ? `The lowest-cost option is <strong>${cheapestVisible.name}</strong>
          at <strong>$${cheapestVisible._r.toLocaleString()}/wk</strong>.` : ''}
        </div>
        <button onclick="goTo(3)"
          style="background:transparent;border:1.5px solid #c8440a;color:#c8440a;
          border-radius:20px;padding:8px 18px;font-size:12px;font-weight:600;
          cursor:pointer;font-family:inherit">
          ← Adjust budget
        </button>
      </div>`;
    return;
  }

  if (_allVisible.length === 0 && _listEl) {
    _listEl.innerHTML = `
      <div style="padding:28px 16px;text-align:center">
        <div style="font-size:36px;margin-bottom:10px">📍</div>
        <div style="font-size:14px;font-weight:600;color:#1a1714;margin-bottom:6px">
          No screens in this area
        </div>
        <div style="font-size:12px;color:#6b6560;line-height:1.5">
          No inventory matches your current filters or objective.
          Try a different goal or remove a filter.
        </div>
      </div>`;
    return;
  }

  visible.forEach(s => {
    const sel = !!ST.cart[s.id];
    const cls = pinClass(s.type);
    const badgeLabels = {
      'Digital Billboard':'🪧 Billboard', digital:'🪧 Billboard', billboard:'🪧 Billboard',
      'Cinema (In-Theater)':'🎬 Cinema', cinema:'🎬 Cinema',
      'Gas Station':'⛽ Gas Station', gasstation:'⛽ Gas Station',
      'Airport':'✈️ Airport', airport:'✈️ Airport',
      'Doctors Office':'🏥 Healthcare', healthcare:'🏥 Healthcare',
      'Casual Dining':'🍽️ Casual Dining', 'Quick Service Restaurant':'🍽️ QSR',
      'Bar/Restaurant TV':'🍽️ Bar TV', dining:'🍽️ Dining',
      'Grocery Store':'🛒 Grocery', grocery:'🛒 Grocery',
      'Gym':'🏋️ Gym', gym:'🏋️ Gym',
      'Taxi / Rideshare Interior':'🚗 Rideshare', 'Salon & Spa':'💆 Salon & Spa', rideshare:'🚗 Rideshare',
      'Sports Entertainment':'🏟️ Sports & Entertainment', sports:'🏟️ Sports & Entertainment',
      'Recreational (NEW)':'🎳 Recreation', recreation:'🎳 Recreation',
      'Apartment Building':'🏢 Apartments', residential:'🏢 Residential',
      'College Campus':'🎓 Campus', education:'🎓 Campus',
      'Office Building (NEW)':'🏢 Office', office:'🏢 Office',
      'Convenience Store':'🏪 Convenience', 'School (NEW)':'🏫 School',
    };
    const badgeCss = {
      'Digital Billboard':'dig', digital:'dig', billboard:'dig',
      'Cinema (In-Theater)':'cin', cinema:'cin',
      'Airport':'air', airport:'air',
      'Doctors Office':'hlt', healthcare:'hlt',
      'Casual Dining':'din', 'Quick Service Restaurant':'din', 'Bar/Restaurant TV':'din', dining:'din',
      'Grocery Store':'', grocery:'',
      'Gym':'gym', gym:'gym',
      'Taxi / Rideshare Interior':'rid', 'Salon & Spa':'rid', rideshare:'rid',
    };
    const _vk = s.venue_type || s.type;
    const typeColor = venueColor(_vk);
    const tagHtml = [
      `<span class="sc-tag ${badgeCss[_vk]||''}" style="display:inline-flex;align-items:center;gap:4px;">${makeIconHtml(_vk,14)}${badgeLabels[_vk]||_vk}</span>`,
      s.tags.includes('walmart') ? '<span class="sc-tag wmt">Near Walmart HQ</span>' : '',
      `<span class="sc-tag">${s.area}</span>`
    ].join('');
    const displayPrice = Math.round(unitRate(s));

    const metaText = [
      s.area,
      badgeLabels[s.type] || s.type,
      (s.impr || (s.weekly_imp >= 1000 ? Math.round(s.weekly_imp/1000)+'K wkly impr' : (s.weekly_imp ? s.weekly_imp+' wkly impr' : '')))
    ].filter(Boolean).join(' · ');
    // Corridor + HQ distance badges now always render on every card
    // (previously only shown when the active goal was Walmart-related).
    // The goal-specific proximity badge (custom business location) still
    // shows first when that goal is active.
    const goalBadge = (ST.goal==='Drive customers through your door') && ST.proximityTarget
      ? `<span class="sc-badge">📍 ${distLabel(haversineMiles(ST.proximityTarget.lat,ST.proximityTarget.lng,s.lat,s.lng))} from ${ST.proximityTarget.name.split('–')[0].trim()}</span>`
      : '';
    const hqBadge = `<span class="sc-badge">🏢 ${distLabel(haversineMiles(WALMART_HQ.lat,WALMART_HQ.lng,s.lat,s.lng))} from Walmart HQ</span>`;
    const corridorBadge = `<span class="sc-badge">📍 ${distLabel(haversineMiles(WMT_ZONES[1].lat,WMT_ZONES[1].lng,s.lat,s.lng))} from Residential Corridor</span>`;
    const badge = goalBadge + hqBadge + corridorBadge;

    const card = document.createElement('div');
    card.id = 'sc-' + s.id;
    card.className = 'sc' + (sel ? ' added' : '');
    card.innerHTML = `
      <div class="sc-ico">${s.icon}</div>
      <div class="sc-body">
        <div class="sc-name">${s.name}</div>
        <div class="sc-meta">${metaText}</div>
        ${badge}
      </div>
      <div class="sc-right">
        <div class="sc-price">$${displayPrice.toLocaleString()}<span class="sc-unit">/wk</span></div>
        ${(() => { const _conf = (s.rate_source||'').endsWith('_confirmed') || s.rate_source==='lamar_scraped_real_impressions'; return `<span class="sc-rate-badge ${_conf?'verified':'estimated'}">${_conf?'✓ Verified':'≈ Est.'}</span>`; })()}
        <div class="sc-btns">
          <button class="sc-x${sel ? ' show' : ''}" id="scx-${s.id}" onclick="event.stopPropagation();toggleScreen('${s.id}')">✕</button>
          <button class="sc-add sc-add-btn${sel ? ' added' : ''}" id="sca-${s.id}" data-id="${s.id}" onclick="event.stopPropagation();toggleScreen('${s.id}')">${sel ? '✓ Added' : '+ Add'}</button>
        </div>
      </div>
    `;
    card.onclick = (e) => {
      if (e.target.closest('button')) return;
      if (markers[s.id] && map) { map.flyTo([s.lat, s.lng], 14, {duration:0.6}); }
      openDrawer(s.id);
    };
    container.appendChild(card);
  });
}

/* ══════════════ TOGGLE SCREEN ══════════════ */
