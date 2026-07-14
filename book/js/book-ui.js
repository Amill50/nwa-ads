function updateNavSel() {
  const el = document.getElementById('nav-sel');
  if (!el) return;

  const keys  = Object.keys(ST.cart);
  const step  = parseInt(document.querySelector('.panel.active')?.id?.replace('panel-','')) || 1;
  const goal  = ST.goal;
  const goalIcons = {
    'Drive customers through your door': '🏪',
    'Reach the NWA Tech & Startup Scene': '💡',
    "Reach Walmart & Sam's Club buyers": '🎯',
  };

  let html = '';

  // Show cart pill on step 2+ when screens are in cart
  if (keys.length > 0 && step >= 2) {
    if (html) html += `<span class="ns-divider">›</span>`;
    const subUnit = keys.reduce((a, id) => a + unitRate(ST.cart[id]), 0);
    html += `<span class="ns-pill cart">
      <span class="ns-count">${keys.length}</span>
      $${Math.round(subUnit).toLocaleString()}${rateLabel()}
    </span>`;
  }

  // Show confirmed badge on step 5
  if (step === 5) {
    html = `<span class="ns-pill confirmed">✓ Booking submitted</span>`;
  }

  el.innerHTML = html;
  updateCartIndicator();
  updateBreadcrumb();
}

/* ══════════════ NAVIGATION ══════════════ */
