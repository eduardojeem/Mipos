-- =============================================================================
-- Migration: Lock TTL on sale_id to prevent concurrent return creation
-- Date: 2026-05-15
--
-- Context: Two cashiers can simultaneously open the same sale and both
-- start a return for it. Each one's qty validation passes (using DB
-- snapshot at read time), both inserts succeed, and the same units end
-- up returned twice → stock duplicated, cash drained twice. The audit
-- flagged this as 🔴 #2.
--
-- This adds a short-lived lock per sale_id (5 min TTL) that the POST
-- /returns handler acquires before validating qty. If another cashier
-- already holds the lock, the second POST gets a 409 with the lock
-- holder's name so the UI can show "Esa venta está siendo devuelta por
-- <user>". Locks expire automatically; a periodic cleanup also removes
-- stale ones to keep the table small.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.return_sale_locks (
  sale_id     text PRIMARY KEY,
  locked_by   uuid REFERENCES public.users(id) ON DELETE CASCADE,
  locked_at   timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Sweep stale locks fast.
CREATE INDEX IF NOT EXISTS return_sale_locks_expires_idx
  ON public.return_sale_locks(expires_at);

-- Helper: try to acquire a lock. Returns the holder if someone else
-- holds it, NULL if we got it. Atomic via INSERT ... ON CONFLICT.
CREATE OR REPLACE FUNCTION public.try_acquire_return_lock(
  p_sale_id text,
  p_user_id uuid,
  p_ttl_seconds int DEFAULT 300
) RETURNS TABLE (
  acquired       boolean,
  locked_by      uuid,
  locked_by_name text,
  expires_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing_holder uuid;
  v_existing_expires timestamptz;
  v_existing_name text;
BEGIN
  -- Try insert; if conflict, check if expired.
  INSERT INTO return_sale_locks (sale_id, locked_by, expires_at)
  VALUES (p_sale_id, p_user_id, NOW() + (p_ttl_seconds || ' seconds')::interval)
  ON CONFLICT (sale_id) DO NOTHING
  RETURNING locked_by, expires_at
    INTO v_existing_holder, v_existing_expires;

  IF v_existing_holder IS NOT NULL THEN
    -- We got the new insert.
    RETURN QUERY SELECT true, p_user_id, NULL::text, v_existing_expires;
    RETURN;
  END IF;

  -- Lock already exists. If expired, steal it. If not, return holder.
  SELECT l.locked_by, l.expires_at, COALESCE(u.full_name, u.email, 'otro cajero')
    INTO v_existing_holder, v_existing_expires, v_existing_name
    FROM return_sale_locks l
    LEFT JOIN users u ON u.id = l.locked_by
   WHERE l.sale_id = p_sale_id;

  IF v_existing_expires < NOW() THEN
    UPDATE return_sale_locks
       SET locked_by = p_user_id,
           locked_at = NOW(),
           expires_at = NOW() + (p_ttl_seconds || ' seconds')::interval
     WHERE sale_id = p_sale_id;
    RETURN QUERY SELECT true, p_user_id, NULL::text, NOW() + (p_ttl_seconds || ' seconds')::interval;
    RETURN;
  END IF;

  -- Held by someone else.
  RETURN QUERY SELECT false, v_existing_holder, v_existing_name, v_existing_expires;
END;
$$;

-- Release lock (best-effort; called after the return create succeeds or
-- explicitly fails). Only the holder can release their own lock.
CREATE OR REPLACE FUNCTION public.release_return_lock(
  p_sale_id text,
  p_user_id uuid
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  DELETE FROM return_sale_locks
   WHERE sale_id = p_sale_id AND locked_by = p_user_id;
$$;

-- Sweep expired locks. Call from a cron or nightly job; cheap query
-- thanks to the expires_at index.
CREATE OR REPLACE FUNCTION public.sweep_expired_return_locks() RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH deleted AS (
    DELETE FROM return_sale_locks WHERE expires_at < NOW() RETURNING 1
  )
  SELECT COUNT(*)::int FROM deleted;
$$;

COMMENT ON TABLE public.return_sale_locks IS
  'Short-lived locks (5 min default) preventing concurrent return creation against the same sale. Auto-expire; cleaned by sweep_expired_return_locks().';
