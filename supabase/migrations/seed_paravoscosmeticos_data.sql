DO $$
DECLARE v_user RECORD; v_user_id UUID; v_org UUID; v_admin_role_id TEXT; v_sale_id TEXT; v_customer_id TEXT; v_cat1 TEXT; v_cat2 TEXT; v_prod1 TEXT; v_prod2 TEXT;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE email = 'analiak026@gmail.com';
  IF v_user.id IS NOT NULL THEN v_user_id := v_user.id; END IF;

  SELECT id INTO v_org FROM public.organizations WHERE slug = 'paravoscosmeticos-1773613448825';
  IF v_org IS NULL THEN
    INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
    VALUES ('Paravos Cosméticos', 'paravoscosmeticos-1773613448825', 'STARTER', 'ACTIVE')
    RETURNING id INTO v_org;
  END IF;

  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'ADMIN';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (v_org, v_user_id, v_admin_role_id, TRUE)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = v_admin_role_id, is_owner = TRUE;

    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (v_user_id, v_admin_role_id, v_org)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Maquillaje', 'Productos de maquillaje', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Cuidado', 'Cuidado personal y piel', v_org)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_cat1 FROM public.categories WHERE name = 'PV Maquillaje' AND organization_id = v_org;
  SELECT id INTO v_cat2 FROM public.categories WHERE name = 'PV Cuidado' AND organization_id = v_org;

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Base Líquida', 'PVBASE_001', v_cat1, 'Base de cobertura media', 25, 59, 120, 8, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Crema Hidratante', 'PVCREM_001', v_cat2, 'Crema facial nutritiva', 18, 45, 150, 10, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;

  SELECT id INTO v_prod1 FROM public.products WHERE sku = 'PVBASE_001' AND organization_id = v_org;
  SELECT id INTO v_prod2 FROM public.products WHERE sku = 'PVCREM_001' AND organization_id = v_org;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'Cliente PV 1' AND organization_id = v_org) THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Cliente PV 1', '+595981000010', NULL, now(), now(), v_org);
  END IF;
  SELECT id INTO v_customer_id FROM public.customers WHERE name = 'Cliente PV 1' AND organization_id = v_org;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, v_user_id, v_customer_id, 104, 0, 'PERCENTAGE', 0, 104, now(), 'CASH', 'Venta demo PV (sin items)', now(), now(), v_org)
    RETURNING id INTO v_sale_id;
  END IF;
END $$;
