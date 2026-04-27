DO $$
DECLARE auth_id UUID; admin_role_id TEXT; org_id UUID;
BEGIN
  SELECT id INTO auth_id FROM auth.users WHERE lower(email)=lower('johneduardoespinoza95@gmail.com');
  IF auth_id IS NULL THEN RETURN; END IF;

  UPDATE public.users SET role='ADMIN' WHERE id=auth_id AND role::text <> 'SUPER_ADMIN';

  SELECT id INTO admin_role_id FROM public.roles WHERE name='ADMIN';
  SELECT id INTO org_id FROM public.organizations WHERE slug='john-espinoza-org';

  IF admin_role_id IS NOT NULL AND org_id IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (org_id, auth_id, admin_role_id, TRUE)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = admin_role_id, is_owner = TRUE;

    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (auth_id, admin_role_id, org_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;
