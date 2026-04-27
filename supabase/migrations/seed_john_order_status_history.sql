DO $$
DECLARE org UUID; u UUID; rec RECORD;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  SELECT id INTO u FROM public.users WHERE email='johneduardoespinoza95@gmail.com';
  IF org IS NULL OR u IS NULL THEN RETURN; END IF;

  FOR rec IN SELECT id, date FROM public.sales WHERE organization_id=org ORDER BY date ASC LIMIT 2 LOOP
    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES (rec.id, 'CONFIRMED', 'Pedido confirmado', rec.date, u, org);
    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES (rec.id, 'PREPARING', 'Preparando pedido', rec.date + interval '1 hour', u, org);
    INSERT INTO public.order_status_history (order_id, status, notes, changed_at, changed_by, organization_id)
    VALUES (rec.id, 'DELIVERED', 'Entregado al cliente', rec.date + interval '1 day', u, org);
  END LOOP;
END $$;

