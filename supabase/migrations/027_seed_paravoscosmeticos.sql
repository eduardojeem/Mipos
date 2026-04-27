-- Seed data for organization 'paravoscosmeticos-1773613448825' and user 'analiak026@gmail.com'

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_cat_rostro uuid;
  v_cat_ojos uuid;
  v_cat_labios uuid;
  v_cat_unas uuid;
  v_supp_dist uuid;
  v_cust_maria uuid;
  v_prod_base uuid;
  v_prod_rimel uuid;
  v_prod_labial uuid;
  v_sale_id uuid;
BEGIN
  -- 1. Get Organization ID
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'paravoscosmeticos-1773613448825';
  
  -- 2. Get User ID
  SELECT id INTO v_user_id FROM public.users WHERE email = 'analiak026@gmail.com';

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Organization not found. Skipping seed.';
    RETURN;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found. Using current auth.uid() or skipping if null.';
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
     RAISE NOTICE 'No user found to assign sales. Skipping sales generation.';
  END IF;

  -- 3. Insert Categories
  INSERT INTO public.categories (organization_id, name, description)
  VALUES (v_org_id, 'Rostro', 'Productos para el cuidado y maquillaje del rostro')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_cat_rostro;

  IF v_cat_rostro IS NULL THEN SELECT id INTO v_cat_rostro FROM public.categories WHERE organization_id = v_org_id AND name = 'Rostro'; END IF;

  INSERT INTO public.categories (organization_id, name, description)
  VALUES (v_org_id, 'Ojos', 'Máscaras, delineadores y sombras')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_cat_ojos;
  
  IF v_cat_ojos IS NULL THEN SELECT id INTO v_cat_ojos FROM public.categories WHERE organization_id = v_org_id AND name = 'Ojos'; END IF;

  INSERT INTO public.categories (organization_id, name, description)
  VALUES (v_org_id, 'Labios', 'Labiales, brillos y bálsamos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_cat_labios;

  IF v_cat_labios IS NULL THEN SELECT id INTO v_cat_labios FROM public.categories WHERE organization_id = v_org_id AND name = 'Labios'; END IF;

  INSERT INTO public.categories (organization_id, name, description)
  VALUES (v_org_id, 'Uñas', 'Esmaltes y cuidado de uñas')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_cat_unas;

  -- 4. Insert Suppliers
  INSERT INTO public.suppliers (organization_id, name, contact_info)
  VALUES (v_org_id, 'Distribuidores Cosméticos SA', '{"phone": "555-0101", "email": "contacto@distcosmeticos.com"}'::jsonb)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_supp_dist;

  IF v_supp_dist IS NULL THEN SELECT id INTO v_supp_dist FROM public.suppliers WHERE organization_id = v_org_id AND name = 'Distribuidores Cosméticos SA'; END IF;

  -- 5. Insert Customers
  INSERT INTO public.customers (organization_id, name, email, phone)
  VALUES (v_org_id, 'María Pérez', 'maria.perez@example.com', '555-1234')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_cust_maria;

  IF v_cust_maria IS NULL THEN SELECT id INTO v_cust_maria FROM public.customers WHERE organization_id = v_org_id AND name = 'María Pérez'; END IF;

  -- 6. Insert Products
  -- Rostro
  INSERT INTO public.products (organization_id, category_id, supplier_id, name, description, sku, cost_price, sale_price, stock_quantity, min_stock)
  VALUES (v_org_id, v_cat_rostro, v_supp_dist, 'Base Líquida Mate', 'Base de alta cobertura tono medio', 'FACE-001', 150.00, 300.00, 50, 5)
  RETURNING id INTO v_prod_base;

  INSERT INTO public.products (organization_id, category_id, supplier_id, name, description, sku, cost_price, sale_price, stock_quantity, min_stock)
  VALUES (v_org_id, v_cat_rostro, v_supp_dist, 'Corrector de Ojeras', 'Corrector líquido larga duración', 'FACE-002', 80.00, 160.00, 40, 5);

  -- Ojos
  INSERT INTO public.products (organization_id, category_id, supplier_id, name, description, sku, cost_price, sale_price, stock_quantity, min_stock)
  VALUES (v_org_id, v_cat_ojos, v_supp_dist, 'Máscara Volumen', 'Pestañas con volumen extremo', 'EYE-001', 120.00, 250.00, 60, 10)
  RETURNING id INTO v_prod_rimel;

  -- Labios
  INSERT INTO public.products (organization_id, category_id, supplier_id, name, description, sku, cost_price, sale_price, stock_quantity, min_stock)
  VALUES (v_org_id, v_cat_labios, v_supp_dist, 'Labial Rojo Mate', 'Larga duración, color intenso', 'LIP-001', 100.00, 200.00, 100, 10)
  RETURNING id INTO v_prod_labial;

  -- 7. Insert Sales (Pedidos)
  -- Venta 1
  INSERT INTO public.sales (organization_id, user_id, customer_id, total, subtotal, tax, status, payment_method, date)
  VALUES (v_org_id, v_user_id, v_cust_maria, 550.00, 550.00, 0, 'COMPLETED', 'CASH', now())
  RETURNING id INTO v_sale_id;

  INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
  VALUES 
    (v_sale_id, v_prod_base, 1, 300.00),
    (v_sale_id, v_prod_rimel, 1, 250.00);

  -- Venta 2
  INSERT INTO public.sales (organization_id, user_id, customer_id, total, subtotal, tax, status, payment_method, date)
  VALUES (v_org_id, v_user_id, v_cust_maria, 200.00, 200.00, 0, 'COMPLETED', 'CARD', now() - interval '1 day');
  
  -- Assuming getting the last sale id is safe in this block context or we can just capture it if we needed items
  -- But here just inserting another sale header is enough for example
  
  RAISE NOTICE 'Seed data inserted successfully for organization %', v_org_id;

END $$;
