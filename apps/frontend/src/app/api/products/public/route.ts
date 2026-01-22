import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const canUseSupabase = typeof (supabase as any).from === 'function'

    if (!canUseSupabase) {
      return NextResponse.json({ success: true, products: [], data: [], count: 0 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || '1') || 1
    const limit = Number(searchParams.get('limit') || '25') || 25
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('category_id') || searchParams.get('categoryId') || ''

    let query = (supabase as any)
      .from('products')
      .select(`
        id,
        name,
        description,
        sale_price,
        cost_price,
        stock_quantity,
        min_stock,
        sku,
        image_url,
        category_id,
        brand,
        created_at,
        updated_at,
        categories(
          id,
          name,
          description
        )
      `, { count: 'exact' })
      .eq('is_active', true)

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('updated_at', { ascending: false })

    let { data: products, error, count } = await query

    if (error && (((error as any)?.code === 'PGRST200') || ((error as any)?.code === '42501') || ((error as any)?.code === 'PGRST201'))) {
      // Fallback sin relaciones si RLS/relación causa error
      let fb = (supabase as any)
        .from('products')
        .select(`
          id,
          name,
          description,
          sale_price,
          cost_price,
          stock_quantity,
          min_stock,
          sku,
          image_url,
          category_id,
          brand,
          created_at,
          updated_at
        `, { count: 'exact' })
        .eq('is_active', true)
      if (search) fb = fb.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`)
      if (categoryId) fb = fb.eq('category_id', categoryId)
      const fromFB = (page - 1) * limit
      const toFB = fromFB + limit - 1
      const r = await fb.range(fromFB, toFB).order('updated_at', { ascending: false })
      products = r.data
      error = r.error
      count = r.count
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
        page,
        limit,
        total: count || (products?.length || 0),
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}