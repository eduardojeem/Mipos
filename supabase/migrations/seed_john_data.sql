DO $$
DECLARE v_user RECORD; v_user_id UUID; v_org UUID; v_admin_role_id TEXT; v_sale_id TEXT; v_customer_id TEXT; v_cat1 TEXT; v_cat2 TEXT; v_prod1 TEXT; v_prod2 TEXT; v_sale_item1 TEXT; v_sale_item2 TEXT;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE email = 'johneduardoespinoza95@gmail.com';
  IF v_user.id IS NOT NULL THEN v_user_id := v_user.id; END IF;

  SELECT id INTO v_org FROM public.organizations WHERE slug = 'john-espinoza-org';
  IF v_org IS NULL THEN
    INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
    VALUES ('Empresa John Espinoza', 'john-espinoza-org', 'PREMIUM', 'ACTIVE')
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
  VALUES (gen_random_uuid()::text, 'JE Belleza', 'Cosméticos y maquillaje', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Cuidado', 'Cuidado personal', v_org)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_cat1 FROM public.categories WHERE name = 'JE Belleza' AND organization_id = v_org;
  SELECT id INTO v_cat2 FROM public.categories WHERE name = 'JE Cuidado' AND organization_id = v_org;

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Labial Satinado', 'JELAB_001', v_cat1, 'Labial satinado', 18, 45, 100, 10, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Serum Hidratante', 'JESER_001', v_cat2, 'Serum hidratante', 22, 59, 80, 8, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;

  SELECT id INTO v_prod1 FROM public.products WHERE sku = 'JELAB_001' AND organization_id = v_org;
  SELECT id INTO v_prod2 FROM public.products WHERE sku = 'JESER_001' AND organization_id = v_org;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'Cliente JE 1' AND organization_id = v_org) THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Cliente JE 1', '+595981000002', NULL, now(), now(), v_org);
  END IF;
  SELECT id INTO v_customer_id FROM public.customers WHERE name = 'Cliente JE 1' AND organization_id = v_org;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, v_user_id, v_customer_id, 104, 0, 'PERCENTAGE', 0, 104, now(), 'CARD', 'Venta demo JE', now(), now(), v_org)
    RETURNING id INTO v_sale_id;

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES (gen_random_uuid()::text, v_sale_id, v_prod1, 1, 45)
    RETURNING id INTO v_sale_item1;

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES (gen_random_uuid()::text, v_sale_id, v_prod2, 1, 59)
    RETURNING id INTO v_sale_item2;

    INSERT INTO public.returns (id, original_sale_id, user_id, customer_id, status, reason, refund_method, total_amount, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, v_sale_id, v_user_id, v_customer_id, 'PENDING', 'Cambio de producto', 'CARD', 45, now(), now(), v_org);

    INSERT INTO public.return_items (id, return_id, original_sale_item_id, product_id, quantity, unit_price, reason, created_at)
    SELECT gen_random_uuid()::text, r.id, v_sale_item1, v_prod1, 1, 45, 'Color no deseado', now()
    FROM public.returns r WHERE r.original_sale_id = v_sale_id LIMIT 1;
  END IF;
END $$;

