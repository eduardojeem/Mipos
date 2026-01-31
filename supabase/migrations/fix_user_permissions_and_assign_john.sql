-- Fix RPC get_user_permissions to compare UUID correctly and assign John ADMIN role

-- 1) Fix RPC: compare UUID to UUID, not text
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid uuid)
RETURNS TABLE (permission_name text, resource text, action text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- 2) Assign ADMIN role to John in user_roles (idempotente)
DO $$
DECLARE
  target_email TEXT := 'johneduardoespinoza95@gmail.com';
  john_id UUID;
  admin_role_id TEXT;
  org_id UUID;
BEGIN
  SELECT id INTO john_id FROM public.users WHERE email = target_email;
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'john-espinoza-org';

  IF john_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id, organization_id, is_active)
    VALUES (john_id, admin_role_id, org_id, true)
    ON CONFLICT (user_id, role_id) DO UPDATE SET organization_id = COALESCE(org_id, public.user_roles.organization_id), is_active = true;
  END IF;
END $$;

