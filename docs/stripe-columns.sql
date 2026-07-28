-- NWA Ads — Stripe upfront-payment columns
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id   text,
  ADD COLUMN IF NOT EXISTS paid_at                     timestamptz;
