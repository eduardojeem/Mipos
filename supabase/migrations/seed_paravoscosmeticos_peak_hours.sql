DO $$
DECLARE
  org UUID; u UUID; c TEXT;
  p1 TEXT; p2 TEXT; p3 TEXT;
  d INT;
  morning TIMESTAMPTZ; evening TIMESTAMPTZ;
  sid TEXT;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;
  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';
  SELECT id INTO c FROM public.customers WHERE organization_id=org ORDER BY created_at ASC LIMIT 1;
  IF u IS NULL OR c IS NULL THEN RETURN; END IF;

  -- Productos base
  SELECT id INTO p1 FROM public.products WHERE organization_id=org AND sku='PVBASE_001' LIMIT 1;
  SELECT id INTO p2 FROM public.products WHERE organization_id=org AND sku='PVOJO_004' LIMIT 1;
  SELECT id INTO p3 FROM public.products WHERE organization_id=org AND sku='PVLABKIT_001' LIMIT 1;

  -- Ventas en horas pico: 11:00 y 18:00 para últimos 7 días
  FOR d IN 1..7 LOOP
    morning := date_trunc('day', now() - (d || ' days')::interval) + interval '11 hours' + ((d * 5 % 45) || ' minutes')::interval;
    evening := date_trunc('day', now() - (d || ' days')::interval) + interval '18 hours' + ((d * 7 % 45) || ' minutes')::interval;

    -- 11:00 - venta rápida
    IF p2 IS NOT NULL THEN
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,95000,0,'FIXED_AMOUNT',0,95000, morning,'CASH','COMPLETED','Pico mañana', morning, morning, org)
      RETURNING id INTO sid;
      IF sid IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,sid,p2,1,95000);
      END IF;
    END IF;

    -- 18:00 - venta con mayor ticket
    IF p3 IS NOT NULL THEN
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,175000,0,'FIXED_AMOUNT',0,175000, evening,'CARD','COMPLETED','Pico tarde', evening, evening, org)
      RETURNING id INTO sid;
      IF sid IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,sid,p3,1,175000);
      END IF;
    END IF;

    -- Cada 3 días, un entregado adicional para históricos
    IF (d % 3) = 0 AND p1 IS NOT NULL THEN
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,135000,0,'FIXED_AMOUNT',0,135000, morning + interval '2 hours','TRANSFER','DELIVERED','Entrega programada', morning + interval '2 hours', morning + interval '2 hours', org)
      RETURNING id INTO sid;
      IF sid IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,sid,p1,1,135000);
      END IF;
    END IF;
  END LOOP;
END $$;

