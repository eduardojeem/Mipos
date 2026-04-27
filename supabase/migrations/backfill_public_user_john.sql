DO $$
DECLARE auth_id UUID; org_id UUID; admin_role_id TEXT;
BEGIN
  SELECT id INTO auth_id FROM auth.users WHERE lower(email) = lower('johneduardoespinoza95@gmail.com');
  IF auth_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (auth_id, 'johneduardoespinoza95@gmail.com', 'John Espinoza', 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(public.users.full_name, EXCLUDED.full_name);

    SELECT id INTO org_id FROM public.organizations WHERE slug = 'john-espinoza-org';
    IF org_id IS NULL THEN
      INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
      VALUES ('Empresa John Espinoza', 'john-espinoza-org', 'PREMIUM', 'ACTIVE')
      RETURNING id INTO org_id;
    END IF;

    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';

    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (org_id, auth_id, admin_role_id, TRUE)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = admin_role_id, is_owner = TRUE;

    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (auth_id, admin_role_id, org_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

