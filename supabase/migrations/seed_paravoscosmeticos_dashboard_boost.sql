DO $$
DECLARE
  org UUID; u UUID; c1 TEXT; c2 TEXT;
  p_a TEXT; p_b TEXT; p_c TEXT;
  s_id TEXT;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;
  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';
  SELECT id INTO c1 FROM public.customers WHERE organization_id=org AND name='Cliente PV 1' LIMIT 1;
  SELECT id INTO c2 FROM public.customers WHERE organization_id=org AND name='Cliente PV 2' LIMIT 1;

  -- Productos para items
  SELECT id INTO p_a FROM public.products WHERE organization_id=org AND sku='PVOJO_004' LIMIT 1;
  SELECT id INTO p_b FROM public.products WHERE organization_id=org AND sku='PVLABKIT_001' LIMIT 1;
  SELECT id INTO p_c FROM public.products WHERE organization_id=org AND sku='PVCAB_005' LIMIT 1;

  -- Ventas completadas recientes (para recientes y totales)
  IF u IS NOT NULL THEN
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES
      (gen_random_uuid()::text,u,COALESCE(c1,c2),180000,0,'FIXED_AMOUNT',0,180000, now() - interval '1 hours','CASH','COMPLETED','Venta demo dashboard', now() - interval '1 hours', now() - interval '1 hours', org),
      (gen_random_uuid()::text,u,COALESCE(c2,c1),225000,0,'FIXED_AMOUNT',0,225000, now() - interval '3 hours','CARD','COMPLETED','Venta demo dashboard', now() - interval '3 hours', now() - interval '3 hours', org),
      (gen_random_uuid()::text,u,COALESCE(c1,c2),95000,0,'FIXED_AMOUNT',0,95000, now() - interval '5 hours','TRANSFER','COMPLETED','Venta demo dashboard', now() - interval '5 hours', now() - interval '5 hours', org)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Pedidos web con estados (para métricas de pedidos activos)
  IF u IS NOT NULL THEN
    -- PENDING
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,COALESCE(c1,c2),120000,0,'FIXED_AMOUNT',0,120000, now() - interval '30 minutes','OTHER','PENDING','Pedido web pendiente', now() - interval '30 minutes', now() - interval '30 minutes', org)
    RETURNING id INTO s_id;
    IF s_id IS NOT NULL AND p_a IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price)
      VALUES (gen_random_uuid()::text,s_id,p_a,1,120000);
    END IF;

    -- CONFIRMED
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,COALESCE(c2,c1),155000,0,'FIXED_AMOUNT',0,155000, now() - interval '2 hours','OTHER','CONFIRMED','Pedido web confirmado', now() - interval '2 hours', now() - interval '2 hours', org)
    RETURNING id INTO s_id;
    IF s_id IS NOT NULL AND p_b IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price)
      VALUES (gen_random_uuid()::text,s_id,p_b,1,155000);
    END IF;

    -- PREPARING
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,COALESCE(c1,c2),89000,0,'FIXED_AMOUNT',0,89000, now() - interval '90 minutes','OTHER','PREPARING','Pedido en preparación', now() - interval '90 minutes', now() - interval '90 minutes', org)
    RETURNING id INTO s_id;
    IF s_id IS NOT NULL AND p_c IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price)
      VALUES (gen_random_uuid()::text,s_id,p_c,1,89000);
    END IF;

    -- SHIPPED
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,COALESCE(c2,c1),210000,0,'FIXED_AMOUNT',0,210000, now() - interval '6 hours','OTHER','SHIPPED','Pedido enviado', now() - interval '6 hours', now() - interval '6 hours', org)
    RETURNING id INTO s_id;
    IF s_id IS NOT NULL AND p_b IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price)
      VALUES (gen_random_uuid()::text,s_id,p_b,1,210000);
    END IF;
  END IF;

  -- Forzar algunas alertas de stock (<= min_stock)
  UPDATE public.products SET stock_quantity = GREATEST(0, min_stock - 1), updated_at = now()
  WHERE organization_id = org AND sku IN ('PVOJO_005','PVCOR_004')
  AND (stock_quantity IS NULL OR stock_quantity > min_stock);
END $$;
