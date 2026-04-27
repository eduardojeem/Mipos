-- Seed de datos demo en Guaraní para usuario específico
-- Crea/actualiza categorías, proveedores, productos, convierte precios a PYG y registra sesión de caja

DO $$
DECLARE
  v_email text := 'johneduardoespinoza95@gmail.com';
  v_user_id uuid;
  v_org_id uuid;
  v_now timestamptz := now();
  v_cat_elec uuid;
  v_cat_acc uuid;
  v_session_id uuid;
  v_customer1 text;
  v_customer2 text;
  v_prod_tel_id text;
  v_prod_lap_id text;
  v_tel_price numeric;
  v_lap_price numeric;
  v_sale_id text;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email);
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User % not found', v_email;
    RETURN;
  END IF;

  SELECT organization_id INTO v_org_id FROM public.organization_members WHERE user_id = v_user_id LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'User % has no organization', v_email;
    RETURN;
  END IF;

  -- Upsert configuración a PYG
  BEGIN
    INSERT INTO public.business_config (organization_id, business_name, currency, tax_rate, timezone, language, updated_at)
    VALUES (v_org_id, 'Electrónica Demo', 'PYG', 10, 'America/Asuncion', 'es', v_now)
    ON CONFLICT (organization_id) DO UPDATE
      SET currency = 'PYG', tax_rate = 10, timezone = 'America/Asuncion', language = 'es', updated_at = EXCLUDED.updated_at;
  EXCEPTION WHEN others THEN
    -- Si business_config no existe, continuar sin bloquear
    NULL;
  END;

  -- Categorías (idempotente con ON CONFLICT)
  INSERT INTO public.categories (name, description, organization_id)
  VALUES ('Electrónica', 'Dispositivos y gadgets', v_org_id)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (name, description, organization_id)
  VALUES ('Accesorios', 'Periféricos y complementos', v_org_id)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_cat_elec FROM public.categories WHERE (name = 'Electrónica') LIMIT 1;
  SELECT id INTO v_cat_acc FROM public.categories WHERE (name = 'Accesorios') LIMIT 1;

  -- Proveedores (contact_info JSONB)
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE organization_id = v_org_id AND name = 'ElectroSupply S.A.') THEN
    INSERT INTO public.suppliers (name, contact_info, organization_id)
    VALUES ('ElectroSupply S.A.', '{"email":"ventas@electrosupply.com","phone":"0981123456","address":"Av. Principal 123, Asunción"}'::jsonb, v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE organization_id = v_org_id AND name = 'Insumos Tech PY') THEN
    INSERT INTO public.suppliers (name, contact_info, organization_id)
    VALUES ('Insumos Tech PY', '{"email":"contacto@techpy.com","phone":"0972555777","address":"Ciudad del Este"}'::jsonb, v_org_id);
  END IF;

  -- Productos (crea o actualiza precios a PYG)
  IF v_cat_elec IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.products WHERE organization_id = v_org_id AND sku = 'TEL-5G-001') THEN
      UPDATE public.products SET name = 'Smartphone 5G', sale_price = 1500000, cost_price = 1200000, stock_quantity = 40, min_stock = 5, category_id = v_cat_elec WHERE organization_id = v_org_id AND sku = 'TEL-5G-001';
    ELSE
      INSERT INTO public.products (name, sku, category_id, description, sale_price, cost_price, stock_quantity, min_stock, is_active, organization_id)
      VALUES ('Smartphone 5G', 'TEL-5G-001', v_cat_elec, 'Smartphone 5G - demo', 1500000, 1200000, 40, 5, true, v_org_id);
    END IF;

    IF EXISTS (SELECT 1 FROM public.products WHERE organization_id = v_org_id AND sku = 'LAP-RTX-015') THEN
      UPDATE public.products SET name = 'Laptop Gamer RTX', sale_price = 4500000, cost_price = 3600000, stock_quantity = 12, min_stock = 2, category_id = v_cat_elec WHERE organization_id = v_org_id AND sku = 'LAP-RTX-015';
    ELSE
      INSERT INTO public.products (name, sku, category_id, description, sale_price, cost_price, stock_quantity, min_stock, is_active, organization_id)
      VALUES ('Laptop Gamer RTX', 'LAP-RTX-015', v_cat_elec, 'Laptop Gamer RTX - demo', 4500000, 3600000, 12, 2, true, v_org_id);
    END IF;
  END IF;

  IF v_cat_acc IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.products WHERE organization_id = v_org_id AND sku = 'AUD-BT-090') THEN
      UPDATE public.products SET name = 'Auriculares Bluetooth', sale_price = 150000, cost_price = 100000, stock_quantity = 80, min_stock = 10, category_id = v_cat_acc WHERE organization_id = v_org_id AND sku = 'AUD-BT-090';
    ELSE
      INSERT INTO public.products (name, sku, category_id, description, sale_price, cost_price, stock_quantity, min_stock, is_active, organization_id)
      VALUES ('Auriculares Bluetooth', 'AUD-BT-090', v_cat_acc, 'Auriculares Bluetooth - demo', 150000, 100000, 80, 10, true, v_org_id);
    END IF;

    IF EXISTS (SELECT 1 FROM public.products WHERE organization_id = v_org_id AND sku = 'MON-27-144') THEN
      UPDATE public.products SET name = 'Monitor 27" 144Hz', sale_price = 2200000, cost_price = 1800000, stock_quantity = 15, min_stock = 2, category_id = v_cat_elec WHERE organization_id = v_org_id AND sku = 'MON-27-144';
    ELSE
      INSERT INTO public.products (name, sku, category_id, description, sale_price, cost_price, stock_quantity, min_stock, is_active, organization_id)
      VALUES ('Monitor 27" 144Hz', 'MON-27-144', v_cat_elec, 'Monitor 27 144Hz - demo', 2200000, 1800000, 15, 2, true, v_org_id);
    END IF;

    IF EXISTS (SELECT 1 FROM public.products WHERE organization_id = v_org_id AND sku = 'MOU-RGB-220') THEN
      UPDATE public.products SET name = 'Mouse Gamer RGB', sale_price = 120000, cost_price = 80000, stock_quantity = 100, min_stock = 10, category_id = v_cat_acc WHERE organization_id = v_org_id AND sku = 'MOU-RGB-220';
    ELSE
      INSERT INTO public.products (name, sku, category_id, description, sale_price, cost_price, stock_quantity, min_stock, is_active, organization_id)
      VALUES ('Mouse Gamer RGB', 'MOU-RGB-220', v_cat_acc, 'Mouse Gamer RGB - demo', 120000, 80000, 100, 10, true, v_org_id);
    END IF;

    IF EXISTS (SELECT 1 FROM public.products WHERE organization_id = v_org_id AND sku = 'TEC-MEC-330') THEN
      UPDATE public.products SET name = 'Teclado Mecánico', sale_price = 350000, cost_price = 250000, stock_quantity = 60, min_stock = 5, category_id = v_cat_acc WHERE organization_id = v_org_id AND sku = 'TEC-MEC-330';
    ELSE
      INSERT INTO public.products (name, sku, category_id, description, sale_price, cost_price, stock_quantity, min_stock, is_active, organization_id)
      VALUES ('Teclado Mecánico', 'TEC-MEC-330', v_cat_acc, 'Teclado Mecánico - demo', 350000, 250000, 60, 5, true, v_org_id);
    END IF;
  END IF;

  -- Convertir precios existentes a PYG (asumiendo que estaban en USD/fraccionarios)
  UPDATE public.products
  SET sale_price = ROUND(sale_price * 7500), cost_price = ROUND(cost_price * 7500)
  WHERE organization_id = v_org_id
    AND (
      sale_price <> TRUNC(sale_price) OR cost_price <> TRUNC(cost_price)
      OR sale_price < 10000
    );

  -- Sesión de caja y movimientos demo (columnas: opened_at/closed_at)
  BEGIN
    INSERT INTO public.cash_sessions (organization_id, opened_by, opening_amount, status, opened_at, notes)
    VALUES (v_org_id, v_user_id, 1500000, 'OPEN', v_now, 'Sesión demo electrónica')
    RETURNING id INTO v_session_id;

    INSERT INTO public.cash_movements (organization_id, session_id, type, amount, reason, reference_type, created_by, created_at)
    VALUES
      (v_org_id, v_session_id, 'IN', 500000, 'Venta demo', 'SALE', v_user_id, v_now),
      (v_org_id, v_session_id, 'OUT', 100000, 'Compra insumos', 'PURCHASE', v_user_id, v_now);
  EXCEPTION WHEN others THEN
    NULL;
  END;

  -- Conteo de caja (denominaciones comunes en PYG)
  BEGIN
    INSERT INTO public.cash_counts (organization_id, session_id, denomination, quantity, total)
    VALUES
      (v_org_id, v_session_id, 100000, 5, 500000),
      (v_org_id, v_session_id, 50000, 4, 200000),
      (v_org_id, v_session_id, 20000, 10, 200000),
      (v_org_id, v_session_id, 10000, 15, 150000);
  EXCEPTION WHEN others THEN NULL; END;

  -- Clientes demo
  BEGIN
    INSERT INTO public.customers (name, email, phone, organization_id)
    VALUES ('Juan Pérez', 'juan.perez@example.com', '099111111', v_org_id)
    RETURNING id INTO v_customer1;
  EXCEPTION WHEN others THEN
    SELECT id INTO v_customer1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Juan Pérez' LIMIT 1;
  END;

  BEGIN
    INSERT INTO public.customers (name, email, phone, organization_id)
    VALUES ('Maria Gómez', 'maria.gomez@example.com', '099222222', v_org_id)
    RETURNING id INTO v_customer2;
  EXCEPTION WHEN others THEN
    SELECT id INTO v_customer2 FROM public.customers WHERE organization_id = v_org_id AND name = 'Maria Gómez' LIMIT 1;
  END;

  -- Obtener productos para ventas
  SELECT id, sale_price INTO v_prod_tel_id, v_tel_price FROM public.products WHERE organization_id = v_org_id AND sku = 'TEL-5G-001' LIMIT 1;
  SELECT id, sale_price INTO v_prod_lap_id, v_lap_price FROM public.products WHERE organization_id = v_org_id AND sku = 'LAP-RTX-015' LIMIT 1;

  -- Venta demo con items
  IF v_prod_tel_id IS NOT NULL AND v_prod_lap_id IS NOT NULL THEN
    DECLARE
      v_subtotal numeric := (2 * v_tel_price) + (1 * v_lap_price);
      v_tax numeric := ROUND(v_subtotal * 0.10);
      v_total numeric := v_subtotal + v_tax;
    BEGIN
      INSERT INTO public.sales (user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, organization_id)
      VALUES (v_user_id, v_customer1, v_subtotal, 0, 'PERCENTAGE', v_tax, v_total, v_now, 'CASH', 'Venta demo PYG', v_org_id)
      RETURNING id INTO v_sale_id;

      INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
      VALUES (v_sale_id, v_prod_tel_id, 2, v_tel_price),
             (v_sale_id, v_prod_lap_id, 1, v_lap_price);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;
