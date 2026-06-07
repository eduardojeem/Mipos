import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Endpoint PÚBLICO (sin auth). NUNCA debe exponer datos comerciales sensibles
// (cost_price, min_stock, márgenes, proveedores) ni mezclar organizaciones.
const PUBLIC_PRODUCT_FIELDS = `
  id,
  name,
  description,
  sale_price,
  offer_price,
  stock_quantity,
  sku,
  image_url,
  category_id,
  brand,
  created_at,
  updated_at
`

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const canUseSupabase = typeof (supabase as any).from === 'function'

    if (!canUseSupabase) {
      return NextResponse.json({ success: true, products: [], data: [], count: 0 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || '1') || 1
    const limit = Math.min(Number(searchParams.get('limit') || '25') || 25, 100)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('category_id') || searchParams.get('categoryId') || ''

    // Contexto de organización (multi-tenant). Sin él, no devolvemos nada para
    // evitar mezclar productos de distintas empresas en un endpoint público.
    const orgId = (
      request.headers.get('x-organization-id') ||
      searchParams.get('organizationId') ||
      searchParams.get('organization_id') ||
      ''
    ).trim()

    if (!orgId) {
      return NextResponse.json({
        success: true, products: [], data: [], count: 0,
        pagination: { page, limit, total: 0, pages: 0 },
      })
    }

    const applyFilters = (q: any, withPublic: boolean) => {
      q = q.eq('organization_id', orgId).eq('is_active', true)
      if (withPublic) q = q.eq('is_public', true)
      q = q.is('deleted_at', null)
      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`)
      if (categoryId) q = q.eq('category_id', categoryId)
      return q
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const runQuery = async (withRelations: boolean, withPublic: boolean) => {
      const select = withRelations
        ? `${PUBLIC_PRODUCT_FIELDS}, categories(id, name, description)`
        : PUBLIC_PRODUCT_FIELDS
      let q = applyFilters((supabase as any).from('products').select(select, { count: 'exact' }), withPublic)
      return q.range(from, to).order('updated_at', { ascending: false })
    }

    let { data: products, error, count } = await runQuery(true, true)

    // Fallback 1: si falla por relación/RLS, sin join
    if (error && ['PGRST200', '42501', 'PGRST201'].includes((error as any)?.code)) {
      const r = await runQuery(false, true)
      products = r.data; error = r.error; count = r.count
    }
    // Fallback 2: si is_public/deleted_at aún no existen en la BD
    if (error && (((error as any)?.code === '42703') || /is_public|deleted_at/i.test(String((error as any)?.message || '')))) {
      const r = await runQuery(false, false)
      products = r.data; error = r.error; count = r.count
    }

    if (error) {
      return NextResponse.json(
        { success: true, products: [], data: [], count: 0 },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      data: products || [],
      count: count || (products?.length || 0),
      pagination: {
        page, limit,
        total: count || (products?.length || 0),
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
