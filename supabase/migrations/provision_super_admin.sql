DO $$
DECLARE super_email TEXT := 'jeem101595@gmail.com'; super_role_id TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'SUPER_ADMIN') THEN
    INSERT INTO public.roles (name, display_name, description, is_system_role)
    VALUES ('SUPER_ADMIN', 'Super Administrador', 'Acceso global al sistema', TRUE);
  END IF;
  SELECT id INTO super_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
  UPDATE public.users SET role = 'SUPER_ADMIN' WHERE email = super_email;
  -- user_roles registro (si existe user)
  IF EXISTS (SELECT 1 FROM public.users WHERE email = super_email) THEN
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT id, super_role_id FROM public.users WHERE email = super_email
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

