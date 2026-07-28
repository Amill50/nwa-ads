// Handles Stripe webhook events. On checkout.session.completed, marks the
// campaign confirmed and paid — this is the ONLY place a campaign's status
// flips to 'confirmed', so a campaign can never be confirmed without a
// verified successful payment.
//
// POST /.netlify/functions/stripe-webhook
//
// Required env vars:
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
//   STRIPE_SECRET_KEY         — Stripe secret (or restricted) key
//   STRIPE_WEBHOOK_SECRET     — whsec_... signing secret for this endpoint

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const SUPABASE_URL = 'https://etytgvxkjqjnriflktzv.supabase.co';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!serviceKey || !stripeKey || !webhookSecret) {
    console.error('stripe-webhook: missing required env vars');
    return { statusCode: 500, body: 'Server not configured' };
  }

  const stripe = Stripe(stripeKey);

  const sig = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed', err.message);
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'ok (ignored event type)' };
  }

  const session = stripeEvent.data.object;
  if (session.payment_status !== 'paid') {
    console.warn('stripe-webhook: session completed but not paid', session.id, session.payment_status);
    return { statusCode: 200, body: 'ok (not paid)' };
  }

  const { campaign_id: campaignId, approval_token: approvalToken, approved_by_name: approvedByName } = session.metadata || {};
  if (!campaignId || !approvalToken) {
    console.error('stripe-webhook: session missing campaign metadata', session.id);
    return { statusCode: 200, body: 'ok (no metadata)' };
  }

  const sb = createClient(SUPABASE_URL, serviceKey);

  const { data, error } = await sb
    .from('campaigns')
    .update({
      status: 'confirmed',
      approved_at: new Date().toISOString(),
      approved_by_name: approvedByName || null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent || null,
      paid_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('approval_token', approvalToken)
    .eq('status', 'awaiting_approval')
    .select('id');

  if (error) {
    console.error('stripe-webhook: supabase update failed', error.message);
    // Return 500 so Stripe retries the webhook.
    return { statusCode: 500, body: 'Database update failed' };
  }

  if (!data || data.length === 0) {
    // Already confirmed (duplicate delivery) or token/id mismatch — either
    // way, do not retry.
    console.warn('stripe-webhook: no matching awaiting_approval row', campaignId);
    return { statusCode: 200, body: 'ok (no-op)' };
  }

  return { statusCode: 200, body: 'ok (confirmed)' };
};
