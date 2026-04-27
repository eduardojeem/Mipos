-- Pin RLS helper functions to a safe empty search_path and ensure existence

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
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

GRANT EXECUTE ON FUNCTION public.get_user_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids() TO service_role;

-- Re-pin is_super_admin (idempotent), in case previous versions used different search_path
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND COALESCE(ur.is_active, TRUE) = TRUE
      AND UPPER(COALESCE(r.name, '')) = 'SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND UPPER(COALESCE(u.role::text, '')) = 'SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;

