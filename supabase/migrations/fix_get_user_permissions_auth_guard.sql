-- Restringe get_user_permissions: solo puede consultar permisos propios,
-- salvo ADMIN/SUPER_ADMIN.

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid uuid)
RETURNS TABLE (permission_name text, resource text, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller uuid;
  caller_is_admin boolean;
BEGIN
  caller := auth.uid();

  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF caller <> user_uuid THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.is_active = true
        AND ur.user_id = caller
        AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    ) INTO caller_is_admin;

    IF NOT caller_is_admin THEN
      RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT p.name AS permission_name, p.resource, p.action
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.is_active = true
    AND ur.user_id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated, service_role;
