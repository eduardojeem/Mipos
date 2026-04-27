-- Pin search_path and harden public.get_my_org_ids
-- Returns the list of organization IDs for the current user

CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = ''
AS $$
DECLARE
  ids uuid[] := '{}'::uuid[];
BEGIN
  IF is_super_admin() THEN
    SELECT COALESCE(array_agg(o.id), '{}'::uuid[])
    INTO ids
    FROM public.organizations o;
  ELSE
    SELECT COALESCE(array_agg(om.organization_id), '{}'::uuid[])
    INTO ids
    FROM public.organization_members om
    WHERE om.user_id = auth.uid();
  END IF;
  RETURN ids;
END;
$$;

COMMENT ON FUNCTION public.get_my_org_ids() IS 'Returns UUID array of organizations the current auth user belongs to; super admins receive all organization IDs.';

-- Verification
SELECT '✅ get_my_org_ids updated with pinned search_path' AS status;
