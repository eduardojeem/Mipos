import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(): Promise<Response> {
  const result: any = { success: false }
  try {
    const admin = createAdminClient()

    // 1) Verificar existencia del RPC create_sale_with_items
    let exists: boolean | null = null
    let existsError: string | null = null
    try {
      const { data, error } = await (admin as any).rpc('check_function_exists', { function_name: 'create_sale_with_items' })
      if (error) throw error
      exists = !!data
    } catch (e: any) {
      existsError = e?.message || 'No se pudo verificar con check_function_exists'
    }

    // 2) Intentar detectar el tipo de retorno via catálogo si exec_sql está disponible
    let returnType: string | null = null
    let signatureArgs: string | null = null
    let introspectNote: string | null = null
    try {
      const sql = `
        SELECT 
          pg_catalog.pg_get_function_result(p.oid) AS result_type,
          pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'create_sale_with_items'
        ORDER BY p.oid DESC
        LIMIT 1;
      `
      const { data, error } = await (admin as any).rpc('exec_sql', { sql })
      if (error) throw error
      if (Array.isArray(data) && data.length > 0) {
        returnType = data[0]?.result_type ?? null
        signatureArgs = data[0]?.args ?? null
      } else if (data && typeof data === 'object' && ('status' in data)) {
        // exec_sql puede estar implementado como "status only"; sin resultados
        introspectNote = 'exec_sql no devuelve filas; no se pudo introspectar el tipo de retorno.'
      }
    } catch (e: any) {
      introspectNote = e?.message || 'No fue posible introspectar el tipo de retorno (exec_sql podría no existir o no soporta SELECT).'
    }

    // 3) RLS básico para tablas clave
    const rls: Record<string, any> = {}
    for (const t of ['sales', 'sale_items']) {
      try {
        const { data, error } = await (admin as any).rpc('check_rls_status', { table_name: t })
        if (error) throw error
        rls[t] = Array.isArray(data) ? data[0] : data
      } catch (e: any) {
        rls[t] = { error: e?.message || 'No disponible' }
      }
    }

    // 4) Muestra de get_top_products (no muta)
    let topProducts: any[] | null = null
    let topProductsError: string | null = null
    try {
      const { data, error } = await (admin as any).rpc('get_top_products', { user_id_param: null, limit_param: 3 })
      if (error) throw error
      topProducts = Array.isArray(data) ? data : []
    } catch (e: any) {
      topProductsError = e?.message || 'get_top_products no disponible'

      // Fallback: cálculo directo con agregación si el RPC no está disponible en el schema cache
      try {
        // 1) Traer items de venta (sin joins, para no depender de FKs)
        const { data: siData, error: siError } = await (admin as any)
          .from('sale_items')
          .select('product_id, quantity, unit_price')
          .limit(1000)

        if (siError) throw siError

        // 2) Agregar por producto
        const stats = new Map<string, { id: string, name?: string, sales_count: number, revenue: number }>()

        siData?.forEach((row: any) => {
          const pid = String(row.product_id)
          const qty = Number(row.quantity || 0)
          const price = Number(row.unit_price || 0)
          const revenue = qty * price
          const prev = stats.get(pid)
          if (prev) {
            prev.sales_count += qty
            prev.revenue += revenue
          } else {
            stats.set(pid, { id: pid, sales_count: qty, revenue })
          }
        })

        // 3) Traer nombres de productos y mapearlos (si hay IDs)
        const ids = Array.from(stats.keys())
        if (ids.length > 0) {
          const numeric = ids.every(v => /^\d+$/.test(v))
          const idsForFilter = numeric ? ids.map(v => Number(v)) : ids

          const { data: prodRows, error: prodErr } = await (admin as any)
            .from('products')
            .select('id, name')
            .in('id', idsForFilter as any)
            .limit(ids.length)

          if (prodErr) throw prodErr

          const nameMap = new Map<string, string>()
          prodRows?.forEach((p: any) => {
            nameMap.set(String(p.id), p.name)
          })

          // Asignar nombres
          stats.forEach((val, key) => {
            val.name = nameMap.get(key) || val.name || 'Producto'
          })
        }

        topProducts = Array.from(stats.values())
          .map(v => ({ id: v.id, name: v.name || 'Producto', sales_count: v.sales_count, revenue: v.revenue }))
          .sort((a, b) => (Number(b.revenue) - Number(a.revenue)) || (Number(b.sales_count) - Number(a.sales_count)))
          .slice(0, 3)

        // Fallback completó correctamente; limpiar error original
        topProductsError = null
      } catch (fallbackErr: any) {
        // Mantener el error original y anotar el fallo del fallback
        topProductsError = `${topProductsError} | fallback_error: ${fallbackErr?.message || 'unknown'}`
      }
    }

    result.success = true
    result.rpc = {
      create_sale_with_items: {
        exists,
        exists_error: existsError,
        return_type: returnType,
        args: signatureArgs,
        note: introspectNote,
        expected_return: 'jsonb'
      }
    }
    result.rls = rls
    result.samples = { top_products: topProducts, top_products_error: topProductsError }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Error desconocido' }, { status: 500 })
  }
}