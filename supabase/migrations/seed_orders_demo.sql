DO $$
DECLARE
  v_email text := 'johneduardoespinoza95@gmail.com';
  v_user_id uuid;
  v_org_id uuid;
  cust_ids text[];
  prod_ids text[];
  prod_prices numeric[];
  i integer;
  items integer;
  idx integer;
  v_cust text;
  v_sale_id text;
  v_subtotal numeric;
  v_tax numeric;
  v_total numeric;
  v_date timestamptz;
  pay_method text;
  p_index integer;
  p_id text;
  p_price numeric;
  qty integer;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email);
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT organization_id INTO v_org_id FROM public.organization_members WHERE user_id = v_user_id LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  -- Collect customers and products for the org
  SELECT array_agg(id) INTO cust_ids FROM public.customers WHERE organization_id = v_org_id;
  SELECT array_agg(id), array_agg(sale_price) INTO prod_ids, prod_prices FROM public.products WHERE organization_id = v_org_id;
  IF cust_ids IS NULL OR array_length(cust_ids,1) IS NULL THEN RETURN; END IF;
  IF prod_ids IS NULL OR array_length(prod_ids,1) IS NULL THEN RETURN; END IF;

  -- Insert 12 demo orders over the last 14 days
  FOR i IN 1..12 LOOP
    v_cust := cust_ids[1 + floor(random() * (array_length(cust_ids,1)))::int];
    v_subtotal := 0;
    items := 1 + floor(random() * 3)::int; -- 1..3 items
    v_date := now() - make_interval(days := floor(random() * 14)::int, hours := floor(random()*24)::int);
    pay_method := (ARRAY['CASH','CARD','TRANSFER'])[1 + floor(random()*3)::int];

    -- Create sale shell
    v_tax := 0; v_total := 0;
    INSERT INTO public.sales (user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, organization_id)
    VALUES (v_user_id, v_cust, 0, 0, 'PERCENTAGE'::discount_type, 0, 0, v_date, pay_method::payment_method, 'Pedido demo', v_org_id)
    RETURNING id INTO v_sale_id;

    -- Add items
    FOR idx IN 1..items LOOP
      -- pick random product
      p_index := 1 + floor(random() * (array_length(prod_ids,1)))::int;
      p_id := prod_ids[p_index];
      p_price := COALESCE(prod_prices[p_index], 0);
      qty := 1 + floor(random() * 2)::int; -- 1..2
      v_subtotal := v_subtotal + (qty * p_price);
      INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
      VALUES (v_sale_id, p_id, qty, p_price);
    END LOOP;

    -- finalize totals (IVA 10%)
    v_tax := ROUND(v_subtotal * 0.10);
    v_total := v_subtotal + v_tax;
    UPDATE public.sales SET subtotal = v_subtotal, tax = v_tax, total = v_total WHERE id = v_sale_id;
  END LOOP;
END $$;
