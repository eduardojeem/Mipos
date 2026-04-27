DO $$
DECLARE u RECORD; admin_role_id TEXT; org_id UUID; plan_id UUID; slug TEXT;
BEGIN
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';
  FOR u IN SELECT * FROM public.users WHERE role::text <> 'SUPER_ADMIN' LOOP
    slug := 'org-' || regexp_replace(u.email, '@.*$', '', 'i');
    SELECT id INTO org_id FROM public.organizations WHERE slug = slug;
    IF org_id IS NULL THEN
      INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
      VALUES ('Empresa ' || u.full_name, slug, 'STARTER', 'ACTIVE')
      RETURNING id INTO org_id;
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (org_id, u.id, admin_role_id, TRUE)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = admin_role_id, is_owner = TRUE;

    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (u.id, admin_role_id, org_id)
    ON CONFLICT DO NOTHING;

    SELECT id INTO plan_id FROM public.saas_plans WHERE slug IN (
      CASE (abs(mod(hashtext(u.email), 5)))
        WHEN 0 THEN 'free'
        WHEN 1 THEN 'starter'
        WHEN 2 THEN 'professional'
        WHEN 3 THEN 'premium'
        ELSE 'enterprise'
      END
    );
    IF plan_id IS NULL THEN SELECT id INTO plan_id FROM public.saas_plans LIMIT 1; END IF;

    INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle)
    VALUES (org_id, plan_id, 'active', 'monthly')
    ON CONFLICT (organization_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active';

    UPDATE public.users SET role = 'ADMIN' WHERE id = u.id AND role::text <> 'SUPER_ADMIN';
  END LOOP;
END $$;

