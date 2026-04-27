DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_role_id text;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE lower(email) = lower('analiak026@gmail.com');
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado: %', 'analiak026@gmail.com';
    RETURN;
  END IF;

  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'paravoscosmeticos-1773613448825';
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Organizacion no encontrada: %', 'paravoscosmeticos-1773613448825';
    RETURN;
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE upper(name) = 'ADMIN';
  IF v_role_id IS NULL THEN
    INSERT INTO public.roles (id, name, description)
    VALUES (gen_random_uuid()::text, 'ADMIN', 'Administrador de la organizacion')
    RETURNING id INTO v_role_id;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
  VALUES (v_org_id, v_user_id, v_role_id, TRUE)
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET role_id = EXCLUDED.role_id, is_owner = TRUE;

  INSERT INTO public.user_roles (user_id, role_id, organization_id)
  VALUES (v_user_id, v_role_id, v_org_id)
  ON CONFLICT DO NOTHING;
END $$;

