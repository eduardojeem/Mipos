DO $$
DECLARE
  v_org uuid;
  v_user uuid;
  v_admin text;
  v_cat_frag text;
  v_cat_acce text;
  v_prod_a text;
  v_prod_b text;
  v_prod_c text;
  v_customer text;
  v_sale1 text;
  v_sale2 text;
  v_sale_item1 text;
  v_sale_item2 text;
  v_sale_item3 text;
  v_return1 text;
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE slug = 'paravoscosmeticos-1773613448825';
  IF v_org IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_user FROM public.users WHERE email = 'analiak026@gmail.com';
  SELECT id INTO v_admin FROM public.roles WHERE name = 'ADMIN';

  -- Asegurar asociación usuario-org y rol
  IF v_user IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (v_org, v_user, v_admin, TRUE)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, is_owner = TRUE;
    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (v_user, v_admin, v_org)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Categorías adicionales
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Fragancias', 'Perfumes y colonias', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Accesorios', 'Accesorios de belleza', v_org)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_cat_frag FROM public.categories WHERE name = 'PV Fragancias' AND organization_id = v_org;
  SELECT id INTO v_cat_acce FROM public.categories WHERE name = 'PV Accesorios' AND organization_id = v_org;

  -- Productos adicionales
  IF v_cat_frag IS NOT NULL THEN
    INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'PV Perfume Floral', 'PVPERF_001', v_cat_frag, 'Notas florales', 30, 69, 80, 5, '{}'::text[], now(), now(), v_org)
    ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;
    INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'PV Perfume Amaderado', 'PVPERF_002', v_cat_frag, 'Notas amaderadas', 32, 74, 60, 5, '{}'::text[], now(), now(), v_org)
    ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;
  END IF;
  IF v_cat_acce IS NOT NULL THEN
    INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'PV Brocha Kabuki', 'PVBRSH_001', v_cat_acce, 'Brocha maquillaje', 8, 19, 150, 15, '{}'::text[], now(), now(), v_org)
    ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id, description = EXCLUDED.description, sale_price = EXCLUDED.sale_price, organization_id = EXCLUDED.organization_id;
  END IF;

  -- IDs de productos para ítems de venta
  SELECT id INTO v_prod_a FROM public.products WHERE organization_id = v_org AND sku = 'PVPERF_001' LIMIT 1;
  SELECT id INTO v_prod_b FROM public.products WHERE organization_id = v_org AND sku = 'PVPERF_002' LIMIT 1;
  SELECT id INTO v_prod_c FROM public.products WHERE organization_id = v_org AND sku = 'PVBRSH_001' LIMIT 1;

  -- Asegurar un cliente adicional
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE name = 'Cliente PV 2' AND organization_id = v_org) THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Cliente PV 2', '+595981000011', NULL, now(), now(), v_org);
  END IF;
  SELECT id INTO v_customer FROM public.customers WHERE name = 'Cliente PV 2' AND organization_id = v_org;

  -- Crear una segunda venta con ítems
  IF v_user IS NOT NULL AND v_customer IS NOT NULL THEN
    INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, v_user, v_customer, 162, 0, 'PERCENTAGE', 0, 162, now(), 'CARD', 'Venta demo PV 2', now(), now(), v_org)
    RETURNING id INTO v_sale2;
    IF v_prod_a IS NOT NULL THEN
      INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
      VALUES (gen_random_uuid()::text, v_sale2, v_prod_a, 1, 69) RETURNING id INTO v_sale_item1;
    END IF;
    IF v_prod_b IS NOT NULL THEN
      INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
      VALUES (gen_random_uuid()::text, v_sale2, v_prod_b, 1, 74) RETURNING id INTO v_sale_item2;
    END IF;
    IF v_prod_c IS NOT NULL THEN
      INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
      VALUES (gen_random_uuid()::text, v_sale2, v_prod_c, 1, 19) RETURNING id INTO v_sale_item3;
    END IF;
  END IF;

  -- Crear devolución de ejemplo sobre la primera venta si existe
  SELECT id INTO v_sale1 FROM public.sales WHERE organization_id = v_org AND notes LIKE 'Venta demo PV%' ORDER BY created_at ASC LIMIT 1;
  IF v_sale1 IS NOT NULL AND v_user IS NOT NULL THEN
    -- Buscar un ítem de esa venta (si no, tomar de la segunda)
    SELECT si.id INTO v_sale_item1 FROM public.sale_items si WHERE si.sale_id = v_sale1 LIMIT 1;
    IF v_sale_item1 IS NULL AND v_sale2 IS NOT NULL THEN
      SELECT si.id INTO v_sale_item1 FROM public.sale_items si WHERE si.sale_id = v_sale2 LIMIT 1;
    END IF;
    IF v_sale_item1 IS NOT NULL THEN
      -- Cliente asociado a la venta (si existe), sino usamos Cliente PV 2
      SELECT customer_id INTO v_customer FROM public.sales WHERE id = v_sale1;
      IF v_customer IS NULL THEN
        SELECT id INTO v_customer FROM public.customers WHERE name = 'Cliente PV 2' AND organization_id = v_org LIMIT 1;
      END IF;
      INSERT INTO public.returns (id, original_sale_id, user_id, customer_id, status, reason, refund_method, total_amount, created_at, updated_at, organization_id)
      VALUES (gen_random_uuid()::text, v_sale1, v_user, v_customer, 'PENDING', 'Cambio por fragancia', 'CASH', 69, now(), now(), v_org)
      RETURNING id INTO v_return1;
      IF v_return1 IS NOT NULL THEN
        -- Tomar el producto del ítem original
        INSERT INTO public.return_items (id, return_id, original_sale_item_id, product_id, quantity, unit_price, reason, created_at)
        SELECT gen_random_uuid()::text, v_return1, si.id, si.product_id, 1, si.unit_price, 'Preferencia de aroma', now()
        FROM public.sale_items si WHERE si.id = v_sale_item1 LIMIT 1;
      END IF;
    END IF;
  END IF;
END $$;

