-- Transactional sale creation RPC used by apps/frontend/src/app/api/sales/route.ts
-- Updated for Option A: return the full sale object (with items) as JSONB.

CREATE OR REPLACE FUNCTION public.create_sale_with_items(
  p_customer_id TEXT,
  p_user_id UUID,
  p_total_amount NUMERIC,
  p_tax_amount NUMERIC,
  p_discount_amount NUMERIC,
  p_payment_method payment_method,
  p_status TEXT,
  p_sale_type TEXT,
  p_notes TEXT,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_sale_id TEXT;
  v_effective_user_id TEXT := COALESCE(p_user_id::TEXT, auth.uid()::TEXT);
  v_total NUMERIC;
BEGIN
  -- Compute total if not provided: sum(items.quantity * items.unit_price) - discount + tax
  IF p_total_amount IS NULL THEN
    SELECT COALESCE(SUM((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC), 0)
    INTO v_total
    FROM jsonb_array_elements(p_items) AS item;
    v_total := COALESCE(v_total, 0) - COALESCE(p_discount_amount, 0) + COALESCE(p_tax_amount, 0);
  ELSE
    v_total := p_total_amount;
  END IF;

  -- Optional stock check: prevent negative stock
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT (item->>'product_id')::TEXT AS product_id,
             (item->>'quantity')::INT  AS qty
      FROM jsonb_array_elements(p_items) AS item
    ) src
    JOIN public.products p ON p.id = src.product_id
    WHERE (p.stock_quantity - src.qty) < 0
  ) THEN
    RAISE EXCEPTION 'Insufficient stock for one or more products';
  END IF;

  INSERT INTO public.sales (
    customer_id, user_id, total_amount, tax_amount, discount_amount,
    payment_method, status, sale_type, notes
  ) VALUES (
    p_customer_id, v_effective_user_id, v_total, p_tax_amount, p_discount_amount,
    p_payment_method, p_status, p_sale_type, p_notes
  ) RETURNING id INTO v_sale_id;

  INSERT INTO public.sale_items (
    sale_id, product_id, quantity, unit_price, total_price, discount_amount
  )
  SELECT v_sale_id,
         (item->>'product_id')::TEXT,
         (item->>'quantity')::INT,
         (item->>'unit_price')::NUMERIC,
         COALESCE((item->>'total_price')::NUMERIC, ((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC)),
         COALESCE((item->>'discount_amount')::NUMERIC, 0)
  FROM jsonb_array_elements(p_items) AS item;

  -- Update stock quantities atomically
  UPDATE public.products p
  SET stock_quantity = p.stock_quantity - src.qty
  FROM (
    SELECT (item->>'product_id')::TEXT AS product_id,
           (item->>'quantity')::INT  AS qty
    FROM jsonb_array_elements(p_items) AS item
  ) src
  WHERE p.id = src.product_id;

  -- Insert inventory movements for sale
  INSERT INTO public.inventory_movements (product_id, type, reason, reference_id)
  SELECT (item->>'product_id')::TEXT, 'OUT', 'SALE', v_sale_id
  FROM jsonb_array_elements(p_items) AS item;

  -- Return nested sale as JSONB with items
  RETURN (
    SELECT jsonb_build_object(
      'id', s.id,
      'customer_id', s.customer_id,
      'user_id', s.user_id,
      'total_amount', s.total_amount,
      'tax_amount', s.tax_amount,
      'discount_amount', s.discount_amount,
      'payment_method', s.payment_method,
      'status', s.status,
      'sale_type', s.sale_type,
      'notes', s.notes,
      'created_at', s.created_at,
      'updated_at', s.updated_at,
      'items', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id', si.id,
            'sale_id', si.sale_id,
            'product_id', si.product_id,
            'quantity', si.quantity,
            'unit_price', si.unit_price,
            'total_price', si.total_price,
            'discount_amount', si.discount_amount,
            'created_at', si.created_at,
            'updated_at', si.updated_at
          ) ORDER BY si.id)
          FROM public.sale_items si
          WHERE si.sale_id = s.id
        ), '[]'::jsonb)
    )
    FROM public.sales s
    WHERE s.id = v_sale_id
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.create_sale_with_items(TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, payment_method, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;