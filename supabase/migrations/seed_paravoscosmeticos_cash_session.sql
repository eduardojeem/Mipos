DO $$
DECLARE org UUID; u UUID; s1 UUID; v_sale1 TEXT; expected NUMERIC; closing NUMERIC;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';
  IF org IS NULL OR u IS NULL THEN RETURN; END IF;

  INSERT INTO public.cash_sessions (organization_id, opened_by, opening_amount, status, opened_at, notes)
  VALUES (org, u, 800, 'OPEN', now() - interval '6 hours', 'Sesión demo Paravos')
  RETURNING id INTO s1;

  -- Vincular una venta en efectivo si existe
  SELECT id INTO v_sale1 FROM public.sales 
    WHERE organization_id=org AND payment_method='CASH' 
    ORDER BY date ASC LIMIT 1;
  IF v_sale1 IS NOT NULL THEN
    INSERT INTO public.cash_movements (organization_id, session_id, type, amount, reason, reference_type, reference_id, created_by, created_at)
    SELECT org, s1, 'SALE', s.total, 'Venta en efectivo', 'SALE', s.id, u, s.date
    FROM public.sales s WHERE s.id = v_sale1;
  END IF;

  -- Ingreso adicional (efectivo recibido)
  INSERT INTO public.cash_movements (organization_id, session_id, type, amount, reason, reference_type, reference_id, created_by, created_at)
  VALUES (org, s1, 'IN', 50, 'Ingreso caja chica', 'ADJUSTMENT', NULL, u, now() - interval '5 hours');

  -- Egreso (gastos menores)
  INSERT INTO public.cash_movements (organization_id, session_id, type, amount, reason, reference_type, reference_id, created_by, created_at)
  VALUES (org, s1, 'OUT', 30, 'Compra de insumos', 'ADJUSTMENT', NULL, u, now() - interval '3 hours');

  -- Conteo de efectivo
  INSERT INTO public.cash_counts (organization_id, session_id, denomination, quantity, total)
  VALUES (org, s1, 100, 5, 500), (org, s1, 50, 4, 200), (org, s1, 20, 3, 60);

  -- Cierre con leve diferencia
  SELECT 800 + COALESCE((SELECT SUM(amount) FROM public.cash_movements WHERE session_id=s1 AND type IN ('IN','SALE')),0)
         - COALESCE((SELECT SUM(amount) FROM public.cash_movements WHERE session_id=s1 AND type IN ('OUT','RETURN','ADJUSTMENT')),0)
    INTO expected;
  SELECT expected - 2 INTO closing;
  UPDATE public.cash_sessions
    SET closing_amount = closing,
        system_expected = expected,
        discrepancy_amount = closing - expected,
        status = 'CLOSED',
        closed_by = u,
        closed_at = now()
  WHERE id = s1;

  INSERT INTO public.cash_discrepancies (organization_id, session_id, type, amount, explained, explanation, reported_by)
  VALUES (org, s1, 'SHORTAGE', 2, false, 'Descuadre menor en cierre', u);
END $$;

