import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

/**
 * GET /api/categories/public
 *
 * Retorna las categorías PRIVADAS de la organización actual.
 * Usado por selectores de producto dentro del dashboard.
 *
 * SEGURIDAD: Requiere autenticación y org ID válido.
 * Solo retorna categorías de la organización del usuario autenticado.
 *
 * NOTA: Para las categorías PÚBLICAS del marketplace (curadas por admin),
 * usar GET /api/marketplace/categories en su lugar.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ success: true, categories: [], data: [], count: 0 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: true, categories: [], data: [], count: 0 })
    }

    const adminSupabase = await createAdminClient()

    const { data: categories, error } = await (adminSupabase as any)
      .from('categories')
      .select('id, name, description, is_active, parent_id, created_at, updated_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('[categories/public] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: error.message },
        { status: 500 }
      )
    }

    const list = (categories || []) as Array<{
      id: string
      name: string
      description: string | null
      is_active: boolean
      parent_id: string | null
      created_at: string
      updated_at: string
    }>

    return NextResponse.json({
      success: true,
      categories: list,
      data: list,
      count: list.length,
    })
  } catch (err) {
    console.error('[categories/public] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
