// Creates a Stripe Checkout Session for upfront, full-amount credit-card
// payment when an advertiser approves final campaign pricing.
//
// NWA Ads does not offer invoiced or net-30 terms — the full approved total
// is collected by card before a campaign is marked confirmed. Confirmation
// itself happens in stripe-webhook.js on checkout.session.completed, never
// here, so a campaign can never be marked confirmed without payment.
//
// POST /.netlify/functions/create-checkout-session
// Body: { id: campaignId, token: approvalToken, name: signerName }
//
// Required env vars:
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
//   STRIPE_SECRET_KEY         — Stripe secret (or restricted) key

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const SUPABASE_URL = 'https://etytgvxkjqjnriflktzv.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!serviceKey || !stripeKey) {
    console.error('create-checkout-session: missing SUPABASE_SERVICE_ROLE_KEY or STRIPE_SECRET_KEY');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { id, token, name } = payload;
  const sigName = (name || '').trim();
  if (!id || !token || !sigName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id, token, or name' }) };
  }

  const sb = createClient(SUPABASE_URL, serviceKey);

  // Re-validate server-side — never trust the client's price or status.
  const { data: campaign, error } = await sb
    .from('campaigns')
    .select('id, company_name, contact_email, final_total, approval_token, status')
    .eq('id', id)
    .eq('approval_token', token)
    .eq('status', 'awaiting_approval')
    .maybeSingle();

  if (error) {
    console.error('create-checkout-session: supabase error', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Lookup failed' }) };
  }
  if (!campaign) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Campaign not found, already approved, or link invalid' }) };
  }

  const amountCents = Math.round(Number(campaign.final_total) * 100);
  if (!amountCents || amountCents <= 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Campaign has no final total set' }) };
  }

  const origin = event.headers.origin || `https://${event.headers.host}`;
  const returnParams = `id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;

  const stripe = Stripe(stripeKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: campaign.contact_email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `NWA Ads campaign — ${campaign.company_name || 'Campaign'}`,
            description: 'Full upfront payment for approved out-of-home advertising campaign',
          },
        },
        quantity: 1,
      }],
      metadata: {
        campaign_id: id,
        approval_token: token,
        approved_by_name: sigName,
      },
      payment_intent_data: {
        metadata: {
          campaign_id: id,
          approval_token: token,
          approved_by_name: sigName,
        },
      },
      success_url: `${origin}/proposal/approve?${returnParams}&paid=1`,
      cancel_url: `${origin}/proposal/approve?${returnParams}`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('create-checkout-session: stripe error', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not start checkout' }) };
  }
};
