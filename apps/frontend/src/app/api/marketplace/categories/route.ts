import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export type MarketplaceCategoryPublic = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  image_url: string | null
  is_featured: boolean
  sort_order: number
  org_count: number
  product_count: number
}

/**
 * GET /api/marketplace/categories
 *
 * Público, sin autenticación requerida.
 * Retorna las categorías curadas del marketplace con conteos de orgs y productos.
 * Fuente de verdad: tabla marketplace_categories (admin-only write).
 *
 * NO mezcla categorías privadas de organizaciones.
 */
export async function GET() {
  try {
    const supabase = await createAdminClient()

    const { data, error } = await (supabase as any).rpc(
      'get_marketplace_categories_with_counts'
    )

    if (error) {
      console.error('[marketplace/categories] RPC error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch marketplace categories', details: error.message },
        { status: 500 }
      )
    }

    const categories = (data || []) as MarketplaceCategoryPublic[]

    return NextResponse.json({
      success: true,
      categories,
      count: categories.length,
    })
  } catch (err) {
    console.error('[marketplace/categories] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
