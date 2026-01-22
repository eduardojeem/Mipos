import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { createAdminClient } from '@/lib/supabase-admin'

type SetupResult = {
  success: boolean
  exists?: { sales: boolean; sale_items: boolean }
  created?: { sales?: boolean; sale_items?: boolean }
  steps?: string[]
  error?: string
  seed?: any
}

async function checkExistingTables(supabase: any) {
  const check = async (name: string) => {
    const { error } = await supabase.from(name).select('id').limit(1)
    return !error
  }
  return {
    sales: await check('sales'),
    sale_items: await check('sale_items'),
  }
}

async function execSql(supabase: any, sql: string) {
  // Usa RPC exec_sql si existe para ejecutar SQL arbitrario
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  if (error) throw error
  return data
}

async function ensureEnums(supabase: any) {
  const statements = [
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT'); END IF; END $$;",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER'); END IF; END $$;",
  ]
  for (const s of statements) await execSql(supabase, s)
}

async function ensureExtendedSalesColumns(supabase: any) {
  const alters = [
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS user_id uuid;",
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0 CHECK (tax_amount >= 0);",
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0);",
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processed';",
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'POS';",
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';",
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS coupon_code TEXT;",
    "ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_type discount_type DEFAULT 'FIXED_AMOUNT';",
  ]
  for (const s of alters) await execSql(supabase, s)

  const idx = [
    'CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales (user_id);',
    'CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales (status);',
    'CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON public.sales (sale_type);',
    'CREATE INDEX IF NOT EXISTS idx_sales_coupon_code ON public.sales (coupon_code);',
  ]
  for (const s of idx) await execSql(supabase, s)
}

async function ensureExtendedSaleItemsColumns(supabase: any) {
  const alters = [
    "ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0);",
    "ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);",
  ]
  for (const s of alters) await execSql(supabase, s)
}

// Añadir RPC utilitario: check_function_exists
async function createCheckFunctionExistsRPC(supabase: any) {
  const sql = `
    CREATE OR REPLACE FUNCTION public.check_function_exists(function_name TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_exists BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = function_name
      ) INTO v_exists;
      RETURN v_exists;
    END;
    $$;
  `
  await execSql(supabase, sql)
  const grant = "GRANT EXECUTE ON FUNCTION public.check_function_exists(TEXT) TO authenticated, service_role;"
  await execSql(supabase, grant)
}

// Añadir RPC utilitario: check_rls_status
async function createCheckRlsStatusRPC(supabase: any) {
  const sql = `
    CREATE OR REPLACE FUNCTION public.check_rls_status(table_name TEXT)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      enabled BOOLEAN := false;
      pol_count INTEGER := 0;
    BEGIN
      SELECT COALESCE(c.relrowsecurity, false)
      INTO enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = table_name;

      SELECT COUNT(*) INTO pol_count
      FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = table_name;

      RETURN jsonb_build_object(
        'table', table_name,
        'enabled', enabled,
        'policies', pol_count
      );
    END;
    $$;
  `
  await execSql(supabase, sql)
  const grant = "GRANT EXECUTE ON FUNCTION public.check_rls_status(TEXT) TO authenticated, service_role;"
  await execSql(supabase, grant)
}

// Añadir RPC agregado: get_top_products
async function createGetTopProductsRPC(supabase: any) {
  const sql = `
    CREATE OR REPLACE FUNCTION public.get_top_products(
      user_id_param uuid,
      limit_param int DEFAULT 5
    )
    RETURNS TABLE (
      id text,
      name text,
      sales_count bigint,
      revenue numeric
    )
    LANGUAGE sql
    STABLE
    SECURITY INVOKER
    AS $$
      SELECT p.id::text AS id,
             p.name,
             COALESCE(SUM(si.quantity), 0)::bigint AS sales_count,
             COALESCE(SUM((si.quantity::numeric) * (si.unit_price::numeric)), 0)::numeric AS revenue
      FROM public.sale_items si
      JOIN public.products p ON p.id = si.product_id
      JOIN public.sales s ON s.id = si.sale_id
      WHERE user_id_param IS NULL OR s.user_id = user_id_param
      GROUP BY p.id, p.name
      ORDER BY revenue DESC, sales_count DESC
      LIMIT limit_param;
    $$;
  `
  await execSql(supabase, sql)
  const grant = "GRANT EXECUTE ON FUNCTION public.get_top_products(uuid, int) TO authenticated, service_role;"
  await execSql(supabase, grant)

  // Compatibilidad: variante con orden de parámetros invertido (limit_param, user_id_param)
  const sqlCompat = `
    CREATE OR REPLACE FUNCTION public.get_top_products(
      limit_param int DEFAULT 5,
      user_id_param uuid
    )
    RETURNS TABLE (
      id text,
      name text,
      sales_count bigint,
      revenue numeric
    )
    LANGUAGE sql
    STABLE
    SECURITY INVOKER
    AS $$
      SELECT * FROM public.get_top_products(user_id_param, limit_param);
    $$;
  `
  await execSql(supabase, sqlCompat)
  const grantCompat = "GRANT EXECUTE ON FUNCTION public.get_top_products(int, uuid) TO authenticated, service_role;"
  await execSql(supabase, grantCompat)
}

async function createTransactionalRPC(supabase: any) {
  const fn = `
  CREATE OR REPLACE FUNCTION public.create_sale_with_items(
    p_customer_id TEXT,
    p_total NUMERIC,
    p_payment_method payment_method,
    p_items JSONB
  ) RETURNS JSONB AS $$
  DECLARE
    v_sale_id TEXT;
    v_total NUMERIC;
  BEGIN
    -- Compute total if not provided: sum(items.quantity * items.unit_price)
    IF p_total IS NULL THEN
      SELECT COALESCE(SUM((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC), 0)
      INTO v_total
      FROM jsonb_array_elements(p_items) AS item;
    ELSE
      v_total := p_total;
    END IF;

    INSERT INTO public.sales (
      customer_id, total, payment_method
    ) VALUES (
      p_customer_id, v_total, p_payment_method
    ) RETURNING id INTO v_sale_id;

    INSERT INTO public.sale_items (
      sale_id, product_id, quantity, unit_price, total_price, discount_amount
    )
    SELECT v_sale_id,
           (item->>'product_id')::BIGINT,
           (item->>'quantity')::INT,
           (item->>'unit_price')::NUMERIC,
           COALESCE((item->>'total_price')::NUMERIC, ((item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC)),
           COALESCE((item->>'discount_amount')::NUMERIC, 0)
    FROM jsonb_array_elements(p_items) AS item;

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
  `
  await execSql(supabase, fn)

  const grant = "GRANT EXECUTE ON FUNCTION public.create_sale_with_items(TEXT, NUMERIC, payment_method, JSONB) TO authenticated, service_role;"
  await execSql(supabase, grant)
}

async function createSalesTable(supabase: any) {
  await ensureEnums(supabase)

  const createTable = `
    CREATE TABLE IF NOT EXISTS public.sales (
      id BIGSERIAL PRIMARY KEY,
      customer_id BIGINT,
      total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
      discount NUMERIC(12,2) DEFAULT 0 CHECK (discount >= 0),
      discount_type discount_type DEFAULT 'FIXED_AMOUNT',
      payment_method payment_method NOT NULL DEFAULT 'CASH',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL
    );
  `
  await execSql(supabase, createTable)

  const rls = [
    "ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;",
    "CREATE POLICY IF NOT EXISTS sales_auth_read ON public.sales FOR SELECT TO authenticated USING (true);",
    "CREATE POLICY IF NOT EXISTS sales_auth_all ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);",
    "CREATE POLICY IF NOT EXISTS sales_service_all ON public.sales FOR ALL TO service_role USING (true) WITH CHECK (true);",
  ]
  for (const s of rls) await execSql(supabase, s)

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at);',
    'CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales (payment_method);',
  ]
  for (const s of indexes) await execSql(supabase, s)

  await ensureExtendedSalesColumns(supabase)
}

async function createSaleItemsTable(supabase: any) {
  const createTable = `
    CREATE TABLE IF NOT EXISTS public.sale_items (
      id BIGSERIAL PRIMARY KEY,
      sale_id BIGINT NOT NULL,
      product_id BIGINT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE,
      CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT
    );
  `
  await execSql(supabase, createTable)

  const rls = [
    "ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;",
    "CREATE POLICY IF NOT EXISTS sale_items_auth_read ON public.sale_items FOR SELECT TO authenticated USING (true);",
    "CREATE POLICY IF NOT EXISTS sale_items_auth_all ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);",
    "CREATE POLICY IF NOT EXISTS sale_items_service_all ON public.sale_items FOR ALL TO service_role USING (true) WITH CHECK (true);",
  ]
  for (const s of rls) await execSql(supabase, s)

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);',
    'CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items (product_id);',
    'CREATE INDEX IF NOT EXISTS idx_sale_items_created_at ON public.sale_items (created_at);',
  ]
  for (const s of indexes) await execSql(supabase, s)

  await ensureExtendedSaleItemsColumns(supabase)
}

// Siembra ligera: categoría, producto y una venta con items (idempotente)
async function seedDemoData(supabase: any) {
  const steps: string[] = []
  try {
    // Inspeccionar estructura de la tabla sales
    const { data: salesStructure, error: structErr } = await supabase.rpc('exec_sql', {
      sql: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'sales' AND table_schema = 'public' ORDER BY ordinal_position"
    })
    steps.push('seed_inspect_sales_structure')
    
    // También intentar obtener columnas directamente de la tabla
    const { data: salesColumns, error: colErr } = await supabase.from('sales').select('*').limit(0)
    steps.push('seed_try_select_sales_columns')
    
    // Evitar duplicar si ya hay items
    const countItems = await supabase.from('sale_items').select('id', { count: 'exact', head: true })
    const hasItems = (countItems?.count ?? 0) > 0
    steps.push('seed_check_sale_items_count')
    if (hasItems) {
      return { seeded: false, steps, details: { reason: 'sale_items_already_present', sales_structure: salesStructure } }
    }

    // Buscar o crear una categoría
    let categoryId: any = null
    const { data: catRows, error: catErr } = await supabase.from('categories').select('id').limit(1)
    steps.push('seed_try_fetch_category')
    if (!catErr && catRows && catRows.length > 0) {
      categoryId = catRows[0].id
    } else {
      const { data: catNew, error: catInsErr } = await supabase
        .from('categories')
        .insert([{ name: 'Seed Category', description: 'Creado por sales/setup seed' }])
        .select('id')
        .single()
      steps.push('seed_try_insert_category')
      if (!catInsErr && catNew) categoryId = (catNew as any).id
    }

    // Insertar producto (con fallback si category_id falla)
    const sku = `SEED-${Date.now()}`
    const baseProduct: any = {
      name: 'Producto Seed',
      sku,
      description: 'Producto de prueba creado por sales/setup',
      cost_price: 10,
      sale_price: 15.5,
      stock_quantity: 100,
      min_stock: 5,
    }
    if (categoryId) baseProduct.category_id = categoryId

    let product: any = null
    let { data: prod1, error: prodErr1 } = await supabase
      .from('products')
      .insert([baseProduct])
      .select('id, name, sale_price')
      .single()
    steps.push('seed_try_insert_product')

    if (prodErr1) {
      // Reintentar sin categoría por si hay FK o columna ausente
      const minimalProduct = { ...baseProduct }
      delete minimalProduct.category_id
      const { data: prod2, error: prodErr2 } = await supabase
        .from('products')
        .insert([minimalProduct])
        .select('id, name, sale_price')
        .single()
      steps.push('seed_retry_insert_product_without_category')
      if (prodErr2) {
        return { seeded: false, steps, details: { error: prodErr2?.message || 'product_insert_failed' } }
      }
      product = prod2
    } else {
      product = prod1
    }

    // Crear una venta con items
    const productIdRaw = (product as any)?.id
    const unitPrice = Number((product as any)?.sale_price ?? 15.5) || 15.5
    const numericId = Number(productIdRaw)

    let saleDetails: any = null

    // Usar inserción directa para evitar problemas de tipos
    const total = unitPrice * 2
    const { data: saleRow, error: saleInsErr } = await supabase
      .from('sales')
      .insert([{ total: total }])
      .select('id')
      .single()
    steps.push('seed_try_insert_sale_direct')
    if (saleInsErr || !saleRow) {
      return { seeded: false, steps, details: { error: saleInsErr?.message || 'sale_insert_failed', sales_structure: salesStructure, column_error: colErr?.message } }
    }
    const saleId = (saleRow as any).id
    const { error: itemsErr } = await supabase
      .from('sale_items')
      .insert([{ sale_id: saleId, product_id: productIdRaw, quantity: 2, unit_price: unitPrice, total_price: total }])
    steps.push('seed_try_insert_sale_items_direct')
    if (itemsErr) {
      return { seeded: false, steps, details: { error: itemsErr?.message || 'sale_items_insert_failed' } }
    }
    saleDetails = { id: saleId }

    return { seeded: true, steps, details: { category_id: categoryId, product, sale: saleDetails } }
  } catch (e: any) {
    steps.push('seed_unhandled_error')
    return { seeded: false, steps, details: { error: e?.message || 'unknown_seed_error' } }
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }
  const result: SetupResult = { success: false, steps: [] }
  try {
    const supabase = createAdminClient()

    result.steps!.push('connect_admin_client')
    const exists = await checkExistingTables(supabase)
    result.exists = exists
    result.steps!.push('check_existing_tables')

    const created: { sales?: boolean; sale_items?: boolean } = {}

    if (!exists.sales) {
      await createSalesTable(supabase)
      created.sales = true
      result.steps!.push('create_sales_table')
    } else {
      // Garantizar columnas extendidas
      await ensureExtendedSalesColumns(supabase)
      result.steps!.push('ensure_extended_sales_columns')
    }

    if (!exists.sale_items) {
      await createSaleItemsTable(supabase)
      created.sale_items = true
      result.steps!.push('create_sale_items_table')
    } else {
      // Garantizar columnas extendidas en sale_items
      await ensureExtendedSaleItemsColumns(supabase)
      result.steps!.push('ensure_extended_sale_items_columns')
    }

    // Crear RPC transaccional
    await createTransactionalRPC(supabase)
    result.steps!.push('create_transactional_rpc')

    // Crear RPCs de soporte para health y agregados
    await createCheckFunctionExistsRPC(supabase)
    result.steps!.push('create_check_function_exists_rpc')

    await createCheckRlsStatusRPC(supabase)
    result.steps!.push('create_check_rls_status_rpc')

    await createGetTopProductsRPC(supabase)
    result.steps!.push('create_get_top_products_rpc')

    // Solicitar reload de esquema de PostgREST
    await execSql(supabase, "DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;")
    result.steps!.push('pgrest_schema_reload')

    // Siembra ligera (idempotente): solo si no hay sale_items
    const seeding = await seedDemoData(supabase)
    result.steps!.push(...(seeding.steps || []))
    result.seed = { seeded: seeding.seeded, details: seeding.details }

    result.created = created
    result.success = true
    return NextResponse.json(result)
  } catch (e: any) {
    result.error = e?.message || 'Error desconocido'
    return NextResponse.json(result, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }
  // Permite verificar estado sin crear
  const result: SetupResult = { success: false, steps: [] }
  try {
    const supabase = createAdminClient()
    result.steps!.push('connect_admin_client')

    const exists = await checkExistingTables(supabase)
    result.exists = exists
    result.steps!.push('check_existing_tables')

    // Probar RPC agregado get_top_products y devolver conteo
    let topProducts: any[] = []
    try {
      // Intento 1: llamar RPC directamente (puede haber sobrecarga)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_top_products', { limit_param: 10, user_id_param: null })
      if (!rpcErr && Array.isArray(rpcData)) {
        topProducts = rpcData as any[]
        result.steps!.push('health_top_products_rpc')
      } else {
        // Intento 2: vía SQL para evitar ambigüedad por funciones sobrecargadas
        const sql = "SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS items FROM public.get_top_products(NULL::uuid, 10) t"
        const data = await execSql(supabase, sql)
        const first = Array.isArray(data) ? data[0] : (data as any)
        const items = (first && (first.items || first[0]?.items)) || []
        if (Array.isArray(items)) {
          topProducts = items
          result.steps!.push('health_top_products_sql')
        }
      }
    } catch (e) {
      // silencioso; solo informativo
      result.steps!.push('health_top_products_error')
    }

    ;(result as any).top_products = {
      count: Array.isArray(topProducts) ? topProducts.length : 0,
      sample: Array.isArray(topProducts) ? topProducts.slice(0, 3) : []
    }

    // Debug básico: conteos y último sale_item
    try {
      const [{ count: siCount }, { count: sCount }, { count: pCount }] = await Promise.all([
        supabase.from('sale_items').select('id', { count: 'exact', head: true }),
        supabase.from('sales').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ])
      const { data: latestSI } = await supabase
        .from('sale_items')
        .select('sale_id, product_id')
        .order('created_at', { ascending: false })
        .limit(1)

      const latest = Array.isArray(latestSI) && latestSI.length > 0 ? latestSI[0] : null
      let productOk = null
      let saleOk = null
      if (latest) {
        const [prodRow, saleRow] = await Promise.all([
          supabase.from('products').select('id, name').eq('id', (latest as any).product_id).maybeSingle(),
          supabase.from('sales').select('id').eq('id', (latest as any).sale_id).maybeSingle(),
        ])
        productOk = prodRow?.data || null
        saleOk = saleRow?.data || null
      }

      // Consulta directa del agregado para comparar
      let rawTop: any = []
      try {
        const rawSql = "SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) AS items FROM (SELECT p.id::text AS id, p.name, COALESCE(SUM(si.quantity), 0)::bigint AS sales_count, COALESCE(SUM((si.quantity::numeric) * (si.unit_price::numeric)), 0)::numeric AS revenue FROM public.sale_items si JOIN public.products p ON p.id = si.product_id JOIN public.sales s ON s.id = si.sale_id GROUP BY p.id, p.name ORDER BY revenue DESC, sales_count DESC LIMIT 10) x";
        const raw = await execSql(supabase, rawSql)
        const first = Array.isArray(raw) ? raw[0] : (raw as any)
        rawTop = (first && (first.items || first[0]?.items)) || []
        result.steps!.push('health_top_products_rawsql')
      } catch {}

      // Chequeo explícito de join para diagnosticar
      let joinCheck: any = null
      try {
        const checkSql = "SELECT si.product_id::text AS si_pid, p.id::text AS p_id, (p.id::text = si.product_id::text) AS eq, si.sale_id::text AS si_sid, s.id::text AS s_id FROM public.sale_items si LEFT JOIN public.products p ON p.id::text = si.product_id::text LEFT JOIN public.sales s ON s.id::text = si.sale_id::text ORDER BY si.created_at DESC LIMIT 1";
        const chk = await execSql(supabase, checkSql)
        joinCheck = Array.isArray(chk) ? chk[0] : chk
      } catch {}

      ;(result as any).debug = {
        counts: { sale_items: siCount ?? 0, sales: sCount ?? 0, products: pCount ?? 0 },
        latest_sale_item: latest,
        exists: { product: !!productOk, sale: !!saleOk },
        product_sample: productOk,
        raw_top_count: Array.isArray(rawTop) ? rawTop.length : 0,
        raw_top_sample: Array.isArray(rawTop) ? rawTop.slice(0, 3) : [],
        join_check: joinCheck
      }
      result.steps!.push('health_counts')
    } catch {}

    result.success = true
    return NextResponse.json(result)
  } catch (e: any) {
    result.error = e?.message || 'Error desconocido'
    return NextResponse.json(result, { status: 500 })
  }
}
