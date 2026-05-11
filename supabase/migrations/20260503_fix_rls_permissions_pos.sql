-- ============================================================
-- Fix: Re-grant EXECUTE on RLS helpers after they were
-- recreated by 020_fix_get_my_org_ids.sql without grants.
-- This restores the `authenticated` role's ability to read
-- products, customers, categories, and sales via RLS policies.
--
-- Safe to run regardless of whether migration 20260501 was applied.
-- ============================================================

-- 1. Recreate get_my_org_ids - compatible with and without the 'status' column
--    The status column is added by migration 20260501 which may not be applied yet.
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = 'public'
AS $$
DECLARE
  ids uuid[]         := '{}'::uuid[];
  has_status boolean := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '{}'::uuid[];
  END IF;

  -- Detect whether organization_members.status column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'organization_members'
      AND column_name  = 'status'
  ) INTO has_status;

  IF public.is_super_admin() THEN
    -- Super admins see all orgs
    SELECT COALESCE(array_agg(o.id), '{}'::uuid[])
    INTO ids
    FROM public.organizations o;

  ELSIF has_status THEN
    -- When the status column exists, only include ACTIVE memberships
    EXECUTE '
      SELECT COALESCE(array_agg(om.organization_id), ARRAY[]::uuid[])
      FROM public.organization_members om
      WHERE om.user_id = $1
        AND om.status = ''ACTIVE'''
    INTO ids
    USING auth.uid();

  ELSE
    -- status column not present yet: return all memberships
    SELECT COALESCE(array_agg(om.organization_id), '{}'::uuid[])
    INTO ids
    FROM public.organization_members om
    WHERE om.user_id = auth.uid();
  END IF;

  RETURN ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO anon;

-- 2. Ensure is_super_admin is callable by all relevant roles
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;

-- 3. Grant is_org_owner only if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_org_owner'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO service_role';
  END IF;
END $$;

-- 4. Verify
SELECT
  '✅ RLS permissions restored' AS result,
  count(*) AS total_members
FROM public.organization_members;
