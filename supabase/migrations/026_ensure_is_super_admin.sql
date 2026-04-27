-- Ensure is_super_admin() exists and is pinned to a safe search_path

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check active membership with SUPER_ADMIN role
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = TRUE
      AND r.name = 'SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback: legacy users table role column
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role::text = 'SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'Returns TRUE when current auth user is SUPER_ADMIN by membership or legacy role.';
