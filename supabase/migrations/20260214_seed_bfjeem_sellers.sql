DO $$
DECLARE v_org UUID; v_cashier_role TEXT; v_u1 UUID; v_u2 UUID;
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE slug = 'bfjeem-org';
  IF v_org IS NULL THEN
    INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
    VALUES ('Empresa BF Jeem', 'bfjeem-org', 'STARTER', 'ACTIVE')
    RETURNING id INTO v_org;
  END IF;

  SELECT id INTO v_cashier_role FROM public.roles WHERE name = 'CASHIER';
  IF v_cashier_role IS NULL THEN
    INSERT INTO public.roles (id, name, display_name, description, is_system_role, is_active, created_at, updated_at)
    VALUES (gen_random_uuid()::text, 'CASHIER', 'Cajero', 'Rol de vendedor/cajero', true, true, now(), now())
    RETURNING id INTO v_cashier_role;
  END IF;

  INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
  VALUES (gen_random_uuid(), 'vendedor1@bfjeem.com', 'Vendedor 1', 'CASHIER', now(), now())
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = now()
  RETURNING id INTO v_u1;

  INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
  VALUES (gen_random_uuid(), 'vendedor2@bfjeem.com', 'Vendedor 2', 'CASHIER', now(), now())
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = now()
  RETURNING id INTO v_u2;

  INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
  VALUES (v_org, v_u1, v_cashier_role, FALSE)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
  VALUES (v_org, v_u2, v_cashier_role, FALSE)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role_id, organization_id)
  VALUES (v_u1, v_cashier_role, v_org)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role_id, organization_id)
  VALUES (v_u2, v_cashier_role, v_org)
  ON CONFLICT DO NOTHING;
END $$;
