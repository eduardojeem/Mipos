-- Seed new PENDING orders with full shipping snapshot for analiak026@gmail.com organization

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_role_id text;
  v_prefix text;

  v_category_id text;
  v_product_a_id text;
  v_product_b_id text;

  v_customer_id text;

  v_sale_1_id text;
  v_sale_2_id text;

  v_now timestamptz := now();
  v_order_1 text;
  v_order_2 text;
BEGIN
  SELECT u.id,
         COALESCE(
           u.organization_id,
           (
             SELECT om.organization_id
             FROM public.organization_members om
             WHERE om.user_id = u.id AND om.organization_id IS NOT NULL
             ORDER BY om.created_at NULLS LAST
             LIMIT 1
           )
         )
  INTO v_user_id, v_org_id
  FROM public.users u
  WHERE lower(u.email) = 'analiak026@gmail.com'
  ORDER BY u.created_at NULLS LAST
  LIMIT 1;

  IF v_org_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'User analiak026@gmail.com or organization not found';
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM public.roles ORDER BY created_at NULLS LAST, id LIMIT 1;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
  VALUES (v_org_id, v_user_id, v_role_id, false)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  v_prefix := upper(substr(replace(v_org_id::text, '-', ''), 1, 8));
  v_order_1 := 'ORD-' || v_prefix || '-P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_order_2 := 'ORD-' || v_prefix || '-P' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  SELECT id INTO v_category_id
  FROM public.categories
  WHERE organization_id = v_org_id
  ORDER BY created_at NULLS LAST, id
  LIMIT 1;

  IF v_category_id IS NULL THEN
    v_category_id := gen_random_uuid()::text;
    INSERT INTO public.categories (id, name, description, organization_id, is_active)
    VALUES (
      v_category_id,
      'Categoría Pedidos ' || v_prefix,
      'Categoría de ejemplo para pedidos',
      v_org_id,
      true
    );
  END IF;

  INSERT INTO public.products (name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, is_active)
  VALUES (
    'Auriculares Inalámbricos (Demo)',
    'A026_ORD_' || v_prefix || '_A',
    v_category_id,
    'Producto de ejemplo para orden pendiente',
    60000,
    99000,
    15,
    2,
    ARRAY['https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=product%20photo%2C%20wireless%20earbuds%2C%20neutral%20background%2C%20studio%20lighting%2C%20high%20detail&image_size=square'],
    v_org_id,
    true
  )
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    sale_price = EXCLUDED.sale_price,
    cost_price = EXCLUDED.cost_price,
    stock_quantity = EXCLUDED.stock_quantity,
    organization_id = EXCLUDED.organization_id,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_product_a_id;

  INSERT INTO public.products (name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, is_active)
  VALUES (
    'Mochila Urbana (Demo)',
    'A026_ORD_' || v_prefix || '_B',
    v_category_id,
    'Producto de ejemplo para orden pendiente',
    90000,
    149900,
    10,
    1,
    ARRAY['https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=product%20photo%2C%20urban%20backpack%2C%20neutral%20background%2C%20studio%20lighting%2C%20high%20detail&image_size=square'],
    v_org_id,
    true
  )
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    sale_price = EXCLUDED.sale_price,
    cost_price = EXCLUDED.cost_price,
    stock_quantity = EXCLUDED.stock_quantity,
    organization_id = EXCLUDED.organization_id,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_product_b_id;

  v_customer_id := gen_random_uuid()::text;
  INSERT INTO public.customers (id, name, phone, email, address, customer_code, organization_id, is_active)
  VALUES (
    v_customer_id,
    'Ana Alcaraz',
    NULL,
    NULL,
    'Calle 15 de Agosto 456, Asunción, PY',
    'A026_CUST_' || v_prefix,
    v_org_id,
    true
  )
  ON CONFLICT (customer_code) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    organization_id = EXCLUDED.organization_id,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_customer_id;

  v_sale_1_id := gen_random_uuid()::text;
  IF NOT EXISTS (SELECT 1 FROM public.sales s WHERE s.organization_id = v_org_id AND s.order_number = v_order_1) THEN
    INSERT INTO public.sales (
      id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes,
      organization_id, status, order_number, order_source,
      customer_name, customer_email, customer_phone, customer_address,
      shipping_cost, shipping_region, estimated_delivery_date,
      updated_by
    )
    VALUES (
      v_sale_1_id,
      v_user_id,
      v_customer_id,
      248900,
      0,
      'PERCENTAGE',
      24890,
      273790,
      v_now,
      'CARD',
      'Orden pendiente (demo) con datos completos de envío',
      v_org_id,
      'PENDING',
      v_order_1,
      'ONLINE',
      'Ana Alcaraz',
      'ana.alcaraz@example.com',
      '+595981111222',
      'Calle 15 de Agosto 456, Asunción, PY',
      15000,
      'Asunción',
      v_now + interval '2 days',
      v_user_id
    );

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES
      (gen_random_uuid()::text, v_sale_1_id, v_product_a_id, 1, 99000),
      (gen_random_uuid()::text, v_sale_1_id, v_product_b_id, 1, 149900);

    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES
      (v_sale_1_id, 'PENDING', 'Creado (demo)', v_now, v_user_id, v_org_id);
  END IF;

  v_sale_2_id := gen_random_uuid()::text;
  IF NOT EXISTS (SELECT 1 FROM public.sales s WHERE s.organization_id = v_org_id AND s.order_number = v_order_2) THEN
    INSERT INTO public.sales (
      id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes,
      organization_id, status, order_number, order_source,
      customer_name, customer_email, customer_phone, customer_address,
      shipping_cost, shipping_region, estimated_delivery_date,
      updated_by
    )
    VALUES (
      v_sale_2_id,
      v_user_id,
      v_customer_id,
      198000,
      0,
      'PERCENTAGE',
      19800,
      217800,
      v_now - interval '3 hours',
      'TRANSFER',
      'Orden pendiente (demo) con notas para el mensajero',
      v_org_id,
      'PENDING',
      v_order_2,
      'DASHBOARD',
      'Ana Alcaraz',
      'ana.alcaraz@example.com',
      '+595981111222',
      'Calle 15 de Agosto 456, Asunción, PY (Casa 2, timbre azul)',
      0,
      'Central',
      v_now + interval '1 day',
      v_user_id
    );

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES
      (gen_random_uuid()::text, v_sale_2_id, v_product_a_id, 2, 99000);

    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES
      (v_sale_2_id, 'PENDING', 'Creado (demo)', v_now - interval '3 hours', v_user_id, v_org_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

