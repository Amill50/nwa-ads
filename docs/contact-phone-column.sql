-- NWA Ads — contact phone column
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS contact_phone text;
