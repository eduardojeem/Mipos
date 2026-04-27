-- Provisionar SUPER_ADMIN y organizaciones para usuarios existentes

DO $$
DECLARE
  super_email TEXT := 'jeem101595@gmail.com';
  admin_role_id TEXT;
  super_role_id TEXT;
  u RECORD;
  org_id UUID;
  plan_id UUID;
  chosen_slug TEXT;
BEGIN
  -- Asegurar rol SUPER_ADMIN en tabla roles
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'SUPER_ADMIN') THEN
    INSERT INTO public.roles (name, display_name, description, is_system_role)
    VALUES ('SUPER_ADMIN', 'Super Administrador', 'Acceso global al sistema', TRUE);
  END IF;

  -- Obtener ids de roles
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';
  SELECT id INTO super_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';

  -- Promover SUPER_ADMIN
  UPDATE public.users SET role = 'SUPER_ADMIN' WHERE email = super_email;
  IF EXISTS (SELECT 1 FROM public.users WHERE email = super_email) THEN
    -- Asignar user_roles SUPER_ADMIN en alguna organización si existiese
    -- Crear org para el super admin si no existe
    SELECT id INTO org_id FROM public.organizations WHERE slug = 'super-admin-org';
    IF org_id IS NULL THEN
      INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
      VALUES ('Super Admin Org', 'super-admin-org', 'ENTERPRISE', 'ACTIVE')
      RETURNING id INTO org_id;
    END IF;
    -- Miembro y rol
    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    SELECT org_id, u.id, super_role_id, TRUE
    FROM public.users u
    WHERE u.email = super_email
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, is_owner = TRUE;
    -- user_roles
    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    SELECT u.id, super_role_id, org_id FROM public.users u WHERE u.email = super_email
    ON CONFLICT DO NOTHING;
  END IF;

  -- Sembrar suscripción para Super Admin Org (premium si existe)
  SELECT id INTO plan_id FROM public.saas_plans WHERE slug = 'premium';
  IF plan_id IS NULL THEN
    SELECT id INTO plan_id FROM public.saas_plans LIMIT 1;
  END IF;
  IF plan_id IS NOT NULL THEN
    INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle)
    VALUES (org_id, plan_id, 'active', 'monthly')
    ON CONFLICT (organization_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active';
  END IF;

  -- Para otros usuarios: crear organizaciones y suscripciones
  FOR u IN SELECT * FROM public.users WHERE email <> super_email LOOP
    -- slug basado en email
    chosen_slug := 'org-' || regexp_replace(u.email, '@.*$', '', 'i');
    -- Crear org si no existe
    SELECT id INTO org_id FROM public.organizations WHERE slug = chosen_slug;
    IF org_id IS NULL THEN
      INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
      VALUES ('Empresa ' || u.full_name, chosen_slug, 'STARTER', 'ACTIVE')
      RETURNING id INTO org_id;
    END IF;

    -- Miembro y dueño con rol ADMIN
    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (org_id, u.id, admin_role_id, TRUE)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = admin_role_id, is_owner = TRUE;

    -- user_roles ADMIN
    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (u.id, admin_role_id, org_id)
    ON CONFLICT DO NOTHING;

    -- Elegir plan distinto por usuario (rotación simple)
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

    -- Asegurar rol visible en users (no enum conflict): si no es SUPER_ADMIN, poner ADMIN
    UPDATE public.users SET role = 'ADMIN' WHERE id = u.id AND role::text <> 'SUPER_ADMIN';
  END LOOP;
END $$;

