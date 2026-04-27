-- Ensure legacy helpers referenced by policies exist and are pinned to empty search_path

CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_ids UUID[];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  SELECT ARRAY_AGG(organization_id) INTO org_ids
  FROM public.organization_members
  WHERE user_id = auth.uid();
  RETURN COALESCE(org_ids, ARRAY[]::UUID[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO service_role;

CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND COALESCE(om.is_owner, FALSE) = TRUE
  ) INTO v_is_owner;
  RETURN COALESCE(v_is_owner, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO service_role;

