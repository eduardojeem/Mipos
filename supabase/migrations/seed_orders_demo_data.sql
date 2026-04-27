-- Seed demo data for /dashboard/orders (sales + customer snapshot + address)

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_role_id text;
  v_prefix text;

  v_category_id text;
  v_product_a_id text;
  v_product_b_id text;

  v_customer_a_id text;
  v_customer_b_id text;

  v_sale_a_id text;
  v_sale_b_id text;
  v_sale_c_id text;

  v_now timestamptz := now();
BEGIN
  SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at NULLS LAST, id LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organizations found. Create an organization before seeding orders.';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.organization_members
  WHERE organization_id = v_org_id AND user_id IS NOT NULL
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.users ORDER BY created_at NULLS LAST, id LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Create a user before seeding orders.';
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM public.roles ORDER BY created_at NULLS LAST, id LIMIT 1;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
  VALUES (v_org_id, v_user_id, v_role_id, false)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  v_prefix := upper(substr(replace(v_org_id::text, '-', ''), 1, 8));

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
      'Pedidos Demo ' || v_prefix,
      'Categoría de ejemplo para órdenes en /dashboard/orders',
      v_org_id,
      true
    );
  END IF;

  INSERT INTO public.products (name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, is_active)
  VALUES (
    'Camiseta Básica (Demo)',
    'ORD_DEMO_' || v_prefix || '_A',
    v_category_id,
    'Producto de ejemplo para pedidos',
    15000,
    29900,
    50,
    5,
    ARRAY['https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=product%20photo%2C%20plain%20white%20t-shirt%20on%20neutral%20background%2C%20studio%20lighting%2C%20high%20detail&image_size=square'],
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
    'Zapatos Urbanos (Demo)',
    'ORD_DEMO_' || v_prefix || '_B',
    v_category_id,
    'Producto de ejemplo para pedidos',
    85000,
    129900,
    20,
    2,
    ARRAY['https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=product%20photo%2C%20modern%20sneakers%2C%20neutral%20background%2C%20studio%20lighting%2C%20high%20detail&image_size=square'],
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

  v_customer_a_id := gen_random_uuid()::text;
  INSERT INTO public.customers (id, name, phone, email, address, customer_code, organization_id, is_active)
  VALUES (
    v_customer_a_id,
    'María López',
    NULL,
    NULL,
    'Av. España 1234, Asunción, PY',
    'CUST_ORD_' || v_prefix || '_A',
    v_org_id,
    true
  )
  ON CONFLICT (customer_code) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    organization_id = EXCLUDED.organization_id,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_customer_a_id;

  v_customer_b_id := gen_random_uuid()::text;
  INSERT INTO public.customers (id, name, phone, email, address, customer_code, organization_id, is_active)
  VALUES (
    v_customer_b_id,
    'Carlos Benítez',
    NULL,
    NULL,
    'Ruta Mcal. López km 7, Luque, PY',
    'CUST_ORD_' || v_prefix || '_B',
    v_org_id,
    true
  )
  ON CONFLICT (customer_code) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    organization_id = EXCLUDED.organization_id,
    is_active = EXCLUDED.is_active
  RETURNING id INTO v_customer_b_id;

  IF NOT EXISTS (SELECT 1 FROM public.settings s WHERE s.organization_id = v_org_id AND s.key = 'business_config') THEN
    INSERT INTO public.settings (key, value, organization_id)
    VALUES (
      'business_config',
      jsonb_build_object('taxRate', 10, 'currency', 'PYG', 'companyName', 'Tienda Demo'),
      v_org_id
    );
  END IF;

  v_sale_a_id := gen_random_uuid()::text;
  IF NOT EXISTS (SELECT 1 FROM public.sales s WHERE s.organization_id = v_org_id AND s.order_number = 'ORD-' || v_prefix || '-0001') THEN
    INSERT INTO public.sales (
      id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes,
      organization_id, status, order_number, order_source,
      customer_name, customer_email, customer_phone, customer_address,
      shipping_cost, shipping_region, estimated_delivery_date,
      updated_by
    )
    VALUES (
      v_sale_a_id,
      v_user_id,
      v_customer_a_id,
      159800,
      0,
      'PERCENTAGE',
      15980,
      175780,
      v_now - interval '2 days',
      'CASH',
      'Pedido demo (pendiente)',
      v_org_id,
      'PENDING',
      'ORD-' || v_prefix || '-0001',
      'DASHBOARD',
      'María López',
      'maria.lopez.demo@correo.com',
      '+595 981 111 222',
      'Av. España 1234, Asunción, PY',
      0,
      'Central',
      v_now + interval '3 days',
      v_user_id
    );

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES
      (gen_random_uuid()::text, v_sale_a_id, v_product_a_id, 2, 29900),
      (gen_random_uuid()::text, v_sale_a_id, v_product_b_id, 1, 129900);

    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES
      (v_sale_a_id, 'PENDING', 'Creado desde dashboard (demo)', v_now - interval '2 days', v_user_id, v_org_id);
  END IF;

  v_sale_b_id := gen_random_uuid()::text;
  IF NOT EXISTS (SELECT 1 FROM public.sales s WHERE s.organization_id = v_org_id AND s.order_number = 'ORD-' || v_prefix || '-0002') THEN
    INSERT INTO public.sales (
      id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes,
      organization_id, status, order_number, order_source,
      customer_name, customer_email, customer_phone, customer_address,
      shipping_cost, shipping_region, estimated_delivery_date,
      shipped_at, updated_by
    )
    VALUES (
      v_sale_b_id,
      v_user_id,
      v_customer_b_id,
      59800,
      0,
      'PERCENTAGE',
      5980,
      65780,
      v_now - interval '1 day',
      'CARD',
      'Pedido demo (enviado)',
      v_org_id,
      'SHIPPED',
      'ORD-' || v_prefix || '-0002',
      'ONLINE',
      'Carlos Benítez',
      'carlos.benitez.demo@correo.com',
      '+595 982 333 444',
      'Ruta Mcal. López km 7, Luque, PY',
      10000,
      'Gran Asunción',
      v_now + interval '2 days',
      v_now - interval '20 hours',
      v_user_id
    );

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES
      (gen_random_uuid()::text, v_sale_b_id, v_product_a_id, 2, 29900);

    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES
      (v_sale_b_id, 'PROCESSING', 'Empaquetado (demo)', v_now - interval '23 hours', v_user_id, v_org_id),
      (v_sale_b_id, 'SHIPPED', 'Enviado (demo)', v_now - interval '20 hours', v_user_id, v_org_id);
  END IF;

  v_sale_c_id := gen_random_uuid()::text;
  IF NOT EXISTS (SELECT 1 FROM public.sales s WHERE s.organization_id = v_org_id AND s.order_number = 'ORD-' || v_prefix || '-0003') THEN
    INSERT INTO public.sales (
      id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes,
      organization_id, status, order_number, order_source,
      customer_name, customer_email, customer_phone, customer_address,
      shipping_cost, shipping_region,
      delivered_at, updated_by
    )
    VALUES (
      v_sale_c_id,
      v_user_id,
      v_customer_a_id,
      129900,
      0,
      'PERCENTAGE',
      12990,
      142890,
      v_now - interval '5 days',
      'TRANSFER',
      'Pedido demo (entregado)',
      v_org_id,
      'DELIVERED',
      'ORD-' || v_prefix || '-0003',
      'ONLINE',
      'María López',
      'maria.lopez.demo@correo.com',
      '+595 981 111 222',
      'Av. España 1234, Asunción, PY',
      0,
      'Central',
      v_now - interval '4 days',
      v_user_id
    );

    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES
      (gen_random_uuid()::text, v_sale_c_id, v_product_b_id, 1, 129900);

    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES
      (v_sale_c_id, 'DELIVERED', 'Entregado (demo)', v_now - interval '4 days', v_user_id, v_org_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
