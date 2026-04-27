DO $$
DECLARE
  org UUID; u UUID; c TEXT;
  p1 TEXT; p2 TEXT;
  s_cancel TEXT; s_refund TEXT;
  si1 TEXT; si2 TEXT;
  r1 TEXT;
  ts TIMESTAMPTZ := now() - interval '2 days';
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;
  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';
  SELECT id INTO c FROM public.customers WHERE organization_id=org ORDER BY created_at ASC LIMIT 1;
  IF u IS NULL OR c IS NULL THEN RETURN; END IF;

  SELECT id INTO p1 FROM public.products WHERE organization_id=org AND sku='PVBASE_001' LIMIT 1;
  SELECT id INTO p2 FROM public.products WHERE organization_id=org AND sku='PVLABKIT_001' LIMIT 1;

  -- Venta cancelada (no impacta caja pero cuenta para estados)
  IF p1 IS NOT NULL THEN
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,c,145000,0,'FIXED_AMOUNT',0,145000, ts,'CARD','CANCELLED','Cancelada por cliente', ts, ts, org)
    RETURNING id INTO s_cancel;
    IF s_cancel IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price)
      VALUES (gen_random_uuid()::text,s_cancel,p1,1,145000)
      RETURNING id INTO si1;
    END IF;
  END IF;

  -- Venta reembolsada totalmente
  IF p1 IS NOT NULL AND p2 IS NOT NULL THEN
    ts := now() - interval '4 days';
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,c,240000,0,'FIXED_AMOUNT',0,240000, ts,'CASH','REFUNDED','Reembolso total por cambio', ts, ts, org)
    RETURNING id INTO s_refund;
    IF s_refund IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price)
      VALUES (gen_random_uuid()::text,s_refund,p1,1,115000)
      RETURNING id INTO si1;
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price)
      VALUES (gen_random_uuid()::text,s_refund,p2,1,125000)
      RETURNING id INTO si2;

      -- Registrar devolución vinculada a la venta
      INSERT INTO public.returns (id, original_sale_id, user_id, customer_id, status, reason, refund_method, total_amount, created_at, updated_at, organization_id)
      VALUES (gen_random_uuid()::text, s_refund, u, c, 'COMPLETED', 'Cambio de producto', 'CASH', 240000, ts + interval '2 hours', ts + interval '2 hours', org)
      RETURNING id INTO r1;

      IF r1 IS NOT NULL THEN
        INSERT INTO public.return_items (id, return_id, original_sale_item_id, product_id, quantity, unit_price, reason, created_at)
        SELECT gen_random_uuid()::text, r1, si1, p1, 1, 115000, 'Reembolso total', ts + interval '2 hours';
        INSERT INTO public.return_items (id, return_id, original_sale_item_id, product_id, quantity, unit_price, reason, created_at)
        SELECT gen_random_uuid()::text, r1, si2, p2, 1, 125000, 'Reembolso total', ts + interval '2 hours';
      END IF;
    END IF;
  END IF;
END $$;

