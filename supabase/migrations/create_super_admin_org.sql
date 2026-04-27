DO $$
DECLARE super_email TEXT := 'jeem101595@gmail.com'; org_id UUID; super_role_id TEXT;
BEGIN
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'super-admin-org';
  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
    VALUES ('Super Admin Org', 'super-admin-org', 'ENTERPRISE', 'ACTIVE')
    RETURNING id INTO org_id;
  END IF;

  SELECT id INTO super_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';

  -- Agregar miembro y rol en user_roles
  INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
  SELECT org_id, u.id, super_role_id, TRUE FROM public.users u WHERE u.email = super_email
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, is_owner = TRUE;

  INSERT INTO public.user_roles (user_id, role_id, organization_id)
  SELECT u.id, super_role_id, org_id FROM public.users u WHERE u.email = super_email
  ON CONFLICT DO NOTHING;

  -- Suscripción premium si existe
  IF EXISTS (SELECT 1 FROM public.saas_plans WHERE slug = 'premium') THEN
    INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle)
    SELECT org_id, p.id, 'active', 'monthly' FROM public.saas_plans p WHERE p.slug = 'premium'
    ON CONFLICT (organization_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active';
  END IF;
END $$;

