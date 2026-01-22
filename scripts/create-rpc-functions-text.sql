-- Create text-based RPC helper functions compatible with TEXT IDs in user_roles

GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- user_has_role_text(user_id_text TEXT, role_name TEXT) -> BOOLEAN
CREATE OR REPLACE FUNCTION public.user_has_role_text(user_id_text TEXT, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE has_role BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id::text = r.id::text
    WHERE ur.user_id::text = user_id_text
      AND r.name = role_name
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
  ) INTO has_role;
  RETURN has_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_role_text(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role_text(TEXT, TEXT) TO service_role;

-- get_user_roles_text(user_id_text TEXT) -> TABLE(role_name TEXT, role_display_name TEXT)
CREATE OR REPLACE FUNCTION public.get_user_roles_text(user_id_text TEXT)
RETURNS TABLE(role_name TEXT, role_display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, r.display_name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id::text = r.id::text
  WHERE ur.user_id::text = user_id_text
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_roles_text(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles_text(TEXT) TO service_role;

-- get_user_permissions_text(user_id_text TEXT) -> TABLE(permission_name TEXT, resource TEXT, action TEXT)
CREATE OR REPLACE FUNCTION public.get_user_permissions_text(user_id_text TEXT)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name, p.resource, p.action
  FROM public.permissions p
  JOIN public.role_permissions rp ON p.id::text = rp.permission_id::text
  JOIN public.user_roles ur ON rp.role_id::text = ur.role_id::text
  WHERE ur.user_id::text = user_id_text
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    AND p.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions_text(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions_text(TEXT) TO service_role;

-- Trigger PostgREST schema reload (best effort)
DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;