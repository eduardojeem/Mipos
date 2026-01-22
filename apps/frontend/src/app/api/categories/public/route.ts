import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canQuery = canUseSupabase && !!user && !userError

    if (!canQuery) {
      return NextResponse.json({ success: true, categories: [], data: [], count: 0 })
    }

    const { data: categories, error } = await (supabase as any)
      .from('categories')
      .select('id, name, description, is_active, created_at, updated_at')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: error.message },
        { status: 500 }
      )
    }

    const list = (categories || [])
    const enriched: any[] = []
    for (const c of list) {
      const { count } = await (supabase as any)
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', c.id)

      enriched.push({
        ...c,
        _count: { products: count || 0 }
      })
    }

    return NextResponse.json({ success: true, categories: enriched, data: enriched, count: enriched.length })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

