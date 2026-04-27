BEGIN;

-- Ensure CASHIER role exists
INSERT INTO public.roles (name, display_name, is_system_role, is_active)
SELECT 'CASHIER', 'Cajero', TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE name = 'CASHIER'
);

DO $$
DECLARE v_org_id uuid;
DECLARE v_user_id uuid;
DECLARE v_cashier_role_id text;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'bfjeem-org' LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization with slug bfjeem-org not found';
  END IF;

  -- Create seller user if not exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'vendedor.bfjeem@pos.local') THEN
    INSERT INTO public.users (id, email, full_name, role, organization_id)
    VALUES (gen_random_uuid(), 'vendedor.bfjeem@pos.local', 'Vendedor BFJEEM', 'CASHIER', v_org_id)
    RETURNING id INTO v_user_id;
  ELSE
    SELECT id INTO v_user_id FROM public.users WHERE email = 'vendedor.bfjeem@pos.local' LIMIT 1;
    -- Ensure organization assignment
    UPDATE public.users SET organization_id = v_org_id, role = 'CASHIER' WHERE id = v_user_id;
  END IF;

  -- Link membership
  SELECT id INTO v_cashier_role_id FROM public.roles WHERE name = 'CASHIER' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members WHERE user_id = v_user_id AND organization_id = v_org_id
  ) THEN
    INSERT INTO public.organization_members (id, organization_id, user_id, role_id, is_owner)
    VALUES (gen_random_uuid(), v_org_id, v_user_id, v_cashier_role_id, FALSE);
  END IF;
END $$;

COMMIT;
