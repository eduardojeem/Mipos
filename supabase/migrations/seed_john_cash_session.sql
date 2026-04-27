DO $$
DECLARE org UUID; u UUID; s1 UUID; v_sale1 TEXT; expected NUMERIC; closing NUMERIC;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  SELECT id INTO u FROM public.users WHERE email='johneduardoespinoza95@gmail.com';
  IF org IS NULL OR u IS NULL THEN RETURN; END IF;

  INSERT INTO public.cash_sessions (organization_id, opened_by, opening_amount, status, opened_at, notes)
  VALUES (org, u, 500, 'OPEN', now() - interval '1 day', 'Sesión demo JE')
  RETURNING id INTO s1;

  SELECT id INTO v_sale1 FROM public.sales WHERE organization_id=org AND payment_method='CASH' ORDER BY date ASC LIMIT 1;
  IF v_sale1 IS NOT NULL THEN
    INSERT INTO public.cash_movements (organization_id, session_id, type, amount, reason, reference_type, reference_id, created_by, created_at)
    SELECT org, s1, 'SALE', s.total, 'Venta en efectivo', 'SALE', s.id, u, s.date
    FROM public.sales s WHERE s.id = v_sale1;
  END IF;

  INSERT INTO public.cash_movements (organization_id, session_id, type, amount, reason, reference_type, reference_id, created_by, created_at)
  VALUES (org, s1, 'OUT', 20, 'Compra de insumos', 'ADJUSTMENT', NULL, u, now() - interval '12 hours');

  -- Conteo
  INSERT INTO public.cash_counts (organization_id, session_id, denomination, quantity, total)
  VALUES (org, s1, 100, 3, 300), (org, s1, 50, 3, 150), (org, s1, 20, 5, 100), (org, s1, 5, 1, 5), (org, s1, 2, 1, 2);

  -- Cierre con pequeña discrepancia
  SELECT 500 + COALESCE((SELECT SUM(amount) FROM public.cash_movements WHERE session_id=s1 AND type IN ('IN','SALE')),0)
         - COALESCE((SELECT SUM(amount) FROM public.cash_movements WHERE session_id=s1 AND type IN ('OUT','RETURN','ADJUSTMENT')),0)
    INTO expected;
  SELECT expected - 1 INTO closing;
  UPDATE public.cash_sessions
    SET closing_amount = closing,
        system_expected = expected,
        discrepancy_amount = closing - expected,
        status = 'CLOSED',
        closed_by = u,
        closed_at = now()
  WHERE id = s1;

  INSERT INTO public.cash_discrepancies (organization_id, session_id, type, amount, explained, explanation, reported_by)
  VALUES (org, s1, 'SHORTAGE', 1, false, 'Falta menor al cierre', u);
END $$;
