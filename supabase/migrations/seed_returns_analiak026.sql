-- Seed demo data for /dashboard/returns for analiak026@gmail.com organization

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;

  v_sale_1_id text;
  v_sale_2_id text;

  v_sale_1_customer_id text;
  v_sale_2_customer_id text;

  v_item_1_id text;
  v_item_1_product_id text;
  v_item_1_qty int;
  v_item_1_price numeric;

  v_item_2_id text;
  v_item_2_product_id text;
  v_item_2_qty int;
  v_item_2_price numeric;

  v_return_1_id text;
  v_return_2_id text;
  v_return_3_id text;

  v_now timestamptz := now();
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
  WHERE lower(u.email) = 'analiak026@gmail.com'
  ORDER BY u.created_at NULLS LAST
  LIMIT 1;

  IF v_org_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'User analiak026@gmail.com or organization not found';
  END IF;

  SELECT s.id, s.customer_id
  INTO v_sale_1_id, v_sale_1_customer_id
  FROM public.sales s
  WHERE s.organization_id = v_org_id
    AND s.deleted_at IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1;

  SELECT s.id, s.customer_id
  INTO v_sale_2_id, v_sale_2_customer_id
  FROM public.sales s
  WHERE s.organization_id = v_org_id
    AND s.deleted_at IS NULL
    AND s.id <> v_sale_1_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sale_1_id IS NULL THEN
    RAISE EXCEPTION 'No sales found for organization %', v_org_id;
  END IF;

  SELECT si.id, si.product_id, si.quantity, si.unit_price
  INTO v_item_1_id, v_item_1_product_id, v_item_1_qty, v_item_1_price
  FROM public.sale_items si
  WHERE si.sale_id = v_sale_1_id
    AND si.deleted_at IS NULL
  ORDER BY si.id
  LIMIT 1;

  IF v_item_1_id IS NULL THEN
    RAISE EXCEPTION 'No sale_items found for sale %', v_sale_1_id;
  END IF;

  IF v_sale_2_id IS NOT NULL THEN
    SELECT si.id, si.product_id, si.quantity, si.unit_price
    INTO v_item_2_id, v_item_2_product_id, v_item_2_qty, v_item_2_price
    FROM public.sale_items si
    WHERE si.sale_id = v_sale_2_id
      AND si.deleted_at IS NULL
    ORDER BY si.id
    LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.returns r
    WHERE r.organization_id = v_org_id
      AND r.original_sale_id = v_sale_1_id
      AND r.reason ILIKE '%demo%'
  ) THEN
    v_return_1_id := gen_random_uuid()::text;
    INSERT INTO public.returns (
      id,
      original_sale_id,
      user_id,
      customer_id,
      status,
      reason,
      refund_method,
      total_amount,
      organization_id,
      created_at,
      updated_at
    ) VALUES (
      v_return_1_id,
      v_sale_1_id,
      v_user_id,
      v_sale_1_customer_id,
      'PENDING',
      'Producto defectuoso (demo)',
      'CASH',
      (v_item_1_price * LEAST(v_item_1_qty, 1)),
      v_org_id,
      v_now - interval '6 hours',
      v_now - interval '6 hours'
    );

    INSERT INTO public.return_items (
      id,
      return_id,
      original_sale_item_id,
      product_id,
      quantity,
      unit_price,
      reason,
      created_at
    ) VALUES (
      gen_random_uuid()::text,
      v_return_1_id,
      v_item_1_id,
      v_item_1_product_id,
      LEAST(v_item_1_qty, 1),
      v_item_1_price,
      'No funciona al encender (demo)',
      v_now - interval '6 hours'
    );
  END IF;

  IF v_sale_2_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.returns r
    WHERE r.organization_id = v_org_id
      AND r.original_sale_id = v_sale_2_id
      AND r.reason ILIKE '%demo%'
  ) THEN
    v_return_2_id := gen_random_uuid()::text;
    INSERT INTO public.returns (
      id,
      original_sale_id,
      user_id,
      customer_id,
      status,
      reason,
      refund_method,
      total_amount,
      organization_id,
      created_at,
      updated_at
    ) VALUES (
      v_return_2_id,
      v_sale_2_id,
      v_user_id,
      v_sale_2_customer_id,
      'APPROVED',
      'Talla incorrecta (demo)',
      'TRANSFER',
      COALESCE((v_item_2_price * LEAST(v_item_2_qty, 1)), 0),
      v_org_id,
      v_now - interval '2 days',
      v_now - interval '36 hours'
    );

    IF v_item_2_id IS NOT NULL THEN
      INSERT INTO public.return_items (
        id,
        return_id,
        original_sale_item_id,
        product_id,
        quantity,
        unit_price,
        reason,
        created_at
      ) VALUES (
        gen_random_uuid()::text,
        v_return_2_id,
        v_item_2_id,
        v_item_2_product_id,
        LEAST(v_item_2_qty, 1),
        v_item_2_price,
        'El cliente solicitó cambio (demo)',
        v_now - interval '2 days'
      );
    END IF;
  END IF;

  -- A completed return example based on the most recent sale (different reason)
  IF NOT EXISTS (
    SELECT 1 FROM public.returns r
    WHERE r.organization_id = v_org_id
      AND r.original_sale_id = v_sale_1_id
      AND r.reason ILIKE '%procesado%'
  ) THEN
    v_return_3_id := gen_random_uuid()::text;
    INSERT INTO public.returns (
      id,
      original_sale_id,
      user_id,
      customer_id,
      status,
      reason,
      refund_method,
      total_amount,
      organization_id,
      created_at,
      updated_at
    ) VALUES (
      v_return_3_id,
      v_sale_1_id,
      v_user_id,
      v_sale_1_customer_id,
      'COMPLETED',
      'Devolución procesada (demo)',
      'OTHER',
      (v_item_1_price * LEAST(v_item_1_qty, 1)),
      v_org_id,
      v_now - interval '8 days',
      v_now - interval '7 days'
    );

    INSERT INTO public.return_items (
      id,
      return_id,
      original_sale_item_id,
      product_id,
      quantity,
      unit_price,
      reason,
      created_at
    ) VALUES (
      gen_random_uuid()::text,
      v_return_3_id,
      v_item_1_id,
      v_item_1_product_id,
      LEAST(v_item_1_qty, 1),
      v_item_1_price,
      'Reembolso completado (demo)',
      v_now - interval '8 days'
    );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

