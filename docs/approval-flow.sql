-- NWA Ads — Approval Flow DB migration
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times; all statements use IF NOT EXISTS / OR REPLACE.

-- ── 1. Add columns to campaigns ───────────────────────────────────────────────
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS final_total      numeric,
  ADD COLUMN IF NOT EXISTS final_notes      text,
  ADD COLUMN IF NOT EXISTS finalized_at     timestamptz,
  ADD COLUMN IF NOT EXISTS approval_token   uuid,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS terms_version    text;

-- ── 2. get_approval(p_id, p_token) ────────────────────────────────────────────
-- Returns the campaign row as JSON (minus user_id) when the token matches
-- AND status is 'awaiting_approval' or 'confirmed'.
-- SECURITY DEFINER + explicit search_path prevents privilege escalation.
CREATE OR REPLACE FUNCTION get_approval(p_id uuid, p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row campaigns%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM campaigns
  WHERE id = p_id
    AND approval_token = p_token
    AND status IN ('awaiting_approval', 'confirmed');

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_row) - 'user_id';
END;
$$;

-- Allow anonymous callers (the approval page is unauthenticated)
GRANT EXECUTE ON FUNCTION get_approval(uuid, uuid) TO anon;

-- ── 3. record_approval(p_id, p_token, p_name) ────────────────────────────────
-- Sets approved_at, approved_by_name, status='confirmed'
-- only when token matches, status='awaiting_approval', and name is non-empty.
-- Returns true on success, false on any validation failure.
CREATE OR REPLACE FUNCTION record_approval(p_id uuid, p_token uuid, p_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN false;
  END IF;

  UPDATE campaigns
  SET
    approved_at       = now(),
    approved_by_name  = trim(p_name),
    status            = 'confirmed'
  WHERE id            = p_id
    AND approval_token = p_token
    AND status        = 'awaiting_approval';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- Allow anonymous callers
GRANT EXECUTE ON FUNCTION record_approval(uuid, uuid, text) TO anon;
