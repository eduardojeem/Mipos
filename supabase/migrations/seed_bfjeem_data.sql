DO $$
DECLARE v_user RECORD; v_user_id UUID; v_org UUID; v_admin_role_id TEXT; v_sale_id TEXT; v_customer_id TEXT; v_cat1 TEXT; v_cat2 TEXT; v_prod1 TEXT; v_prod2 TEXT; v_sale_item1 TEXT; v_sale_item2 TEXT; v_plan UUID;
BEGIN
  -- Ensure user exists in public.users
  SELECT * INTO v_user FROM public.users WHERE email = 'bfjeem@gmail.com';
  IF v_user.id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users WHERE role::text = 'SUPER_ADMIN' LIMIT 1;
    -- If still null, we will skip sales/returns
  ELSE
    v_user_id := v_user.id;
    UPDATE public.users SET full_name = COALESCE(public.users.full_name, 'BF Jeem') WHERE id = v_user_id;
  END IF;

  -- Create/get organization
  SELECT id INTO v_org FROM public.organizations WHERE slug = 'bfjeem-org';
  IF v_org IS NULL THEN
    INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
    VALUES ('Empresa BF Jeem', 'bfjeem-org', 'STARTER', 'ACTIVE')
    RETURNING id INTO v_org;
  END IF;

  -- Ensure ADMIN role id
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'ADMIN';

  -- Member and owner
  -- Attach member only if the target user exists
  IF v_user.id IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (v_org, v_user_id, v_admin_role_id, TRUE)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = v_admin_role_id, is_owner = TRUE;
  END IF;

  -- Assign user_roles
  IF v_user.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (v_user_id, v_admin_role_id, v_org)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Subscription (choose starter/premium)
  SELECT id INTO v_plan FROM public.saas_plans WHERE slug = 'starter';
  IF v_plan IS NULL THEN SELECT id INTO v_plan FROM public.saas_plans LIMIT 1; END IF;
  INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle)
  VALUES (v_org, v_plan, 'active', 'monthly')
  ON CONFLICT (organization_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active';

  -- Categories
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'BFJ Belleza', 'Cosméticos y maquillaje', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'BFJ Cuidado', 'Cuidado personal', v_org)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_cat1 FROM public.categories WHERE name = 'BFJ Belleza' AND organization_id = v_org;
  SELECT id INTO v_cat2 FROM public.categories WHERE name = 'BFJ Cuidado' AND organization_id = v_org;

  -- Products
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'BFJ Labial Mate', 'BFJLAB_001', v_cat1, 'Labial de larga duración', 20, 49, 200, 10, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'BFJ Crema Hidratante', 'BFJCRE_001', v_cat2, 'Crema facial hidratante', 15, 39, 150, 10, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;

  SELECT id INTO v_prod1 FROM public.products WHERE sku = 'BFJLAB_001' AND organization_id = v_org;
  SELECT id INTO v_prod2 FROM public.products WHERE sku = 'BFJCRE_001' AND organization_id = v_org;

  -- Customers
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'Cliente BFJ 1' AND organization_id = v_org) THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Cliente BFJ 1', '+595981000001', NULL, now(), now(), v_org);
  END IF;
  SELECT id INTO v_customer_id FROM public.customers WHERE name = 'Cliente BFJ 1' AND organization_id = v_org;

  -- Sale
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, v_user_id, v_customer_id, 88, 0, 'PERCENTAGE', 0, 88, now(), 'CASH', 'Venta demo BFJ', now(), now(), v_org)
    RETURNING id INTO v_sale_id;

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES (gen_random_uuid()::text, v_sale_id, v_prod1, 1, 49)
    RETURNING id INTO v_sale_item1;

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES (gen_random_uuid()::text, v_sale_id, v_prod2, 1, 39)
    RETURNING id INTO v_sale_item2;

    INSERT INTO public.returns (id, original_sale_id, user_id, customer_id, status, reason, refund_method, total_amount, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, v_sale_id, v_user_id, v_customer_id, 'PENDING', 'Producto defectuoso', 'CASH', 39, now(), now(), v_org);

    INSERT INTO public.return_items (id, return_id, original_sale_item_id, product_id, quantity, unit_price, reason, created_at)
    SELECT gen_random_uuid()::text, r.id, v_sale_item2, v_prod2, 1, 39, 'Envase dañado', now()
    FROM public.returns r WHERE r.original_sale_id = v_sale_id LIMIT 1;
  END IF;

  -- Promotion
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='promotions') THEN
    INSERT INTO public.promotions (id, name, description, start_date, end_date, discount_type, discount_value, is_active, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'BFJ 10% OFF', 'Descuento de bienvenida', now(), now() + interval '30 days', 'PERCENTAGE', 10, TRUE, now(), now(), v_org)
    ON CONFLICT DO NOTHING;

    -- Skip promotions_products link because products are skipped
  END IF;
END $$;
