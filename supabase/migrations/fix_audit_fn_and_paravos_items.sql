-- Fix audit trigger function to handle tables without organization_id
CREATE OR REPLACE FUNCTION public.fn_log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := null;
  v_org uuid := null;
  v_sale_id_text text := null;
  v_return_id_text text := null;
  v_has_org_col boolean := false;
BEGIN
  BEGIN
    v_user := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', null)::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user := null;
  END;

  -- Detect if the target table has organization_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = TG_TABLE_SCHEMA
      AND table_name = TG_TABLE_NAME
      AND column_name = 'organization_id'
  ) INTO v_has_org_col;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF v_has_org_col THEN
      v_org := nullif(to_jsonb(NEW)->>'organization_id','')::uuid;
    END IF;
    -- Derive org for known child tables when missing
    IF v_org IS NULL THEN
      IF TG_TABLE_NAME = 'sale_items' THEN
        v_sale_id_text := nullif(to_jsonb(NEW)->>'sale_id','');
        IF v_sale_id_text IS NOT NULL THEN
          SELECT organization_id INTO v_org FROM public.sales WHERE id = v_sale_id_text;
        END IF;
      ELSIF TG_TABLE_NAME = 'return_items' THEN
        v_return_id_text := nullif(to_jsonb(NEW)->>'return_id','');
        IF v_return_id_text IS NOT NULL THEN
          SELECT organization_id INTO v_org FROM public.returns WHERE id = v_return_id_text;
        END IF;
      END IF;
    END IF;
  ELSE -- DELETE
    IF v_has_org_col THEN
      v_org := nullif(to_jsonb(OLD)->>'organization_id','')::uuid;
    END IF;
    IF v_org IS NULL THEN
      IF TG_TABLE_NAME = 'sale_items' THEN
        v_sale_id_text := nullif(to_jsonb(OLD)->>'sale_id','');
        IF v_sale_id_text IS NOT NULL THEN
          SELECT organization_id INTO v_org FROM public.sales WHERE id = v_sale_id_text;
        END IF;
      ELSIF TG_TABLE_NAME = 'return_items' THEN
        v_return_id_text := nullif(to_jsonb(OLD)->>'return_id','');
        IF v_return_id_text IS NOT NULL THEN
          SELECT organization_id INTO v_org FROM public.returns WHERE id = v_return_id_text;
        END IF;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    VALUES (TG_TABLE_NAME, coalesce((NEW).id::text, ''), 'INSERT', v_user, to_jsonb(NEW), v_org);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    VALUES (TG_TABLE_NAME, coalesce((NEW).id::text, ''), 'UPDATE', v_user, to_jsonb(NEW), v_org);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    VALUES (TG_TABLE_NAME, coalesce((OLD).id::text, ''), 'DELETE', v_user, to_jsonb(OLD), v_org);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- After fixing the function, add items to the Paravos demo sale
DO $$
DECLARE v_org uuid; v_sale text; v_prod1 text; v_prod2 text;
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE slug = 'paravoscosmeticos-1773613448825';
  IF v_org IS NULL THEN
    RETURN;
  END IF;
  SELECT id INTO v_sale FROM public.sales WHERE organization_id = v_org AND notes LIKE 'Venta demo PV%'
  ORDER BY created_at DESC LIMIT 1;
  IF v_sale IS NULL THEN
    RETURN;
  END IF;
  -- Skip if already has items
  IF EXISTS (SELECT 1 FROM public.sale_items WHERE sale_id = v_sale) THEN
    RETURN;
  END IF;
  SELECT id INTO v_prod1 FROM public.products WHERE organization_id = v_org AND sku = 'PVBASE_001' LIMIT 1;
  SELECT id INTO v_prod2 FROM public.products WHERE organization_id = v_org AND sku = 'PVCREM_001' LIMIT 1;
  IF v_prod1 IS NOT NULL THEN
    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES (gen_random_uuid()::text, v_sale, v_prod1, 1, 59);
  END IF;
  IF v_prod2 IS NOT NULL THEN
    INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
    VALUES (gen_random_uuid()::text, v_sale, v_prod2, 1, 45);
  END IF;
END $$;
