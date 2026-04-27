DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
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
  WHERE u.email ILIKE '%analiak026%'
  ORDER BY u.created_at NULLS LAST
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  WITH targets AS (
    SELECT s.id,
           s.order_number,
           s.customer_id,
           s.created_at,
           row_number() OVER (ORDER BY s.created_at) AS rn
    FROM public.sales s
    WHERE s.organization_id = v_org_id
      AND s.deleted_at IS NULL
      AND (
        s.customer_name IS NULL
        OR s.customer_address IS NULL
        OR s.customer_name = ''
        OR s.customer_address = ''
      )
    ORDER BY s.created_at
    LIMIT 100
  ), enriched AS (
    SELECT t.id,
           COALESCE(NULLIF(s.customer_name, ''), c.name, 'Cliente ' || COALESCE(t.order_number, 'Sin Nro')) AS customer_name,
           COALESCE(
             NULLIF(s.customer_address, ''),
             c.address,
             CASE
               WHEN (t.rn % 5) = 1 THEN 'Av. España 1234, Asunción, PY'
               WHEN (t.rn % 5) = 2 THEN 'Calle Palma 742, Asunción, PY'
               WHEN (t.rn % 5) = 3 THEN 'Ruta Mcal. López km 7, Luque, PY'
               WHEN (t.rn % 5) = 4 THEN 'Av. Mariscal López 2200, Fernando de la Mora, PY'
               ELSE 'Av. Eusebio Ayala 1800, Asunción, PY'
             END
           ) AS customer_address,
           COALESCE(NULLIF(s.customer_email, ''), c.email) AS customer_email,
           COALESCE(NULLIF(s.customer_phone, ''), c.phone) AS customer_phone
    FROM targets t
    JOIN public.sales s ON s.id = t.id
    LEFT JOIN public.customers c
      ON c.id = s.customer_id
     AND c.organization_id = s.organization_id
  )
  UPDATE public.sales s
  SET customer_name = e.customer_name,
      customer_address = e.customer_address,
      customer_email = COALESCE(e.customer_email, s.customer_email),
      customer_phone = COALESCE(e.customer_phone, s.customer_phone),
      updated_at = now()
  FROM enriched e
  WHERE s.id = e.id;
END $$;

