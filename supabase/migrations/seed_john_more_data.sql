DO $$
DECLARE v_user RECORD; v_user_id UUID; v_org UUID; v_cat1 TEXT; v_cat2 TEXT; v_p1 TEXT; v_p2 TEXT; v_p3 TEXT; v_p4 TEXT; v_cust1 TEXT; v_cust2 TEXT; v_cust3 TEXT; v_sale1 TEXT; v_sale2 TEXT; v_sale3 TEXT; v_si1 TEXT; v_si2 TEXT; v_si3 TEXT;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE email = 'johneduardoespinoza95@gmail.com';
  IF v_user.id IS NULL THEN RETURN; END IF; -- requiere usuario
  v_user_id := v_user.id;

  SELECT id INTO v_org FROM public.organizations WHERE slug = 'john-espinoza-org';
  IF v_org IS NULL THEN RETURN; END IF;

  -- Asegurar categorías
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Belleza', 'Cosméticos y maquillaje', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Cuidado', 'Cuidado personal', v_org)
  ON CONFLICT (name) DO NOTHING;
  SELECT id INTO v_cat1 FROM public.categories WHERE name = 'JE Belleza' AND organization_id = v_org;
  SELECT id INTO v_cat2 FROM public.categories WHERE name = 'JE Cuidado' AND organization_id = v_org;

  -- Productos adicionales
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Labial Mate Pro', 'JELAB_002', v_cat1, 'Labial mate avanzado', 20, 49, 120, 10, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, category_id=EXCLUDED.category_id, description=EXCLUDED.description, sale_price=EXCLUDED.sale_price, organization_id=EXCLUDED.organization_id;
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Delineador', 'JELIN_001', v_cat1, 'Delineador resistente al agua', 12, 29, 200, 15, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, category_id=EXCLUDED.category_id, description=EXCLUDED.description, sale_price=EXCLUDED.sale_price, organization_id=EXCLUDED.organization_id;
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Crema Nocturna', 'JECRE_002', v_cat2, 'Crema nocturna intensiva', 25, 59, 90, 8, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, category_id=EXCLUDED.category_id, description=EXCLUDED.description, sale_price=EXCLUDED.sale_price, organization_id=EXCLUDED.organization_id;
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, 'JE Serum Vitamina C', 'JESER_002', v_cat2, 'Serum con Vitamina C', 22, 55, 110, 10, '{}'::text[], now(), now(), v_org)
  ON CONFLICT (sku) DO UPDATE SET name=EXCLUDED.name, category_id=EXCLUDED.category_id, description=EXCLUDED.description, sale_price=EXCLUDED.sale_price, organization_id=EXCLUDED.organization_id;

  SELECT id INTO v_p1 FROM public.products WHERE sku='JELAB_002' AND organization_id=v_org;
  SELECT id INTO v_p2 FROM public.products WHERE sku='JELIN_001' AND organization_id=v_org;
  SELECT id INTO v_p3 FROM public.products WHERE sku='JECRE_002' AND organization_id=v_org;
  SELECT id INTO v_p4 FROM public.products WHERE sku='JESER_002' AND organization_id=v_org;

  -- Clientes válidos
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE name='Cliente JE 2' AND organization_id=v_org) THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Cliente JE 2', '+595981000010', NULL, now(), now(), v_org);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE name='Cliente JE 3' AND organization_id=v_org) THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Cliente JE 3', '+595981000011', NULL, now(), now(), v_org);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE name='Cliente JE 4' AND organization_id=v_org) THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Cliente JE 4', '+595981000012', NULL, now(), now(), v_org);
  END IF;

  SELECT id INTO v_cust1 FROM public.customers WHERE name='Cliente JE 2' AND organization_id=v_org;
  SELECT id INTO v_cust2 FROM public.customers WHERE name='Cliente JE 3' AND organization_id=v_org;
  SELECT id INTO v_cust3 FROM public.customers WHERE name='Cliente JE 4' AND organization_id=v_org;

  -- Ventas en distintas fechas y métodos
  INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, v_user_id, v_cust1, 78, 0, 'PERCENTAGE', 0, 78, now() - interval '10 days', 'CASH', 'Venta JE A', now(), now(), v_org)
  RETURNING id INTO v_sale1;
  INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
  VALUES (gen_random_uuid()::text, v_sale1, v_p1, 1, 49);
  INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
  VALUES (gen_random_uuid()::text, v_sale1, v_p2, 1, 29);

  INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, v_user_id, v_cust2, 114, 0, 'PERCENTAGE', 0, 114, now() - interval '3 days', 'CARD', 'Venta JE B', now(), now(), v_org)
  RETURNING id INTO v_sale2;
  INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
  VALUES (gen_random_uuid()::text, v_sale2, v_p3, 1, 59);
  INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
  VALUES (gen_random_uuid()::text, v_sale2, v_p4, 1, 55);

  INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, v_user_id, v_cust3, 55, 0, 'PERCENTAGE', 0, 55, now(), 'TRANSFER', 'Venta JE C', now(), now(), v_org)
  RETURNING id INTO v_sale3;
  INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
  VALUES (gen_random_uuid()::text, v_sale3, v_p4, 1, 55);

  -- Devolución de una línea de la venta 2
  INSERT INTO public.returns (id, original_sale_id, user_id, customer_id, status, reason, refund_method, total_amount, created_at, updated_at, organization_id)
  VALUES (gen_random_uuid()::text, v_sale2, v_user_id, v_cust2, 'PENDING', 'Cambio por otro', 'CARD', 55, now(), now(), v_org);
  INSERT INTO public.return_items (id, return_id, original_sale_item_id, product_id, quantity, unit_price, reason, created_at)
  SELECT gen_random_uuid()::text, r.id, si.id, v_p4, 1, 55, 'No satisfecho', now()
  FROM public.returns r JOIN public.sale_items si ON si.sale_id = v_sale2 AND si.product_id = v_p4 LIMIT 1;

  -- Promoción si existe módulo
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='promotions') THEN
    INSERT INTO public.promotions (id, name, description, start_date, end_date, discount_type, discount_value, is_active, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'JE Promo 15%', 'Quincena de descuentos', now() - interval '2 days', now() + interval '20 days', 'PERCENTAGE', 15, TRUE, now(), now(), v_org)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
