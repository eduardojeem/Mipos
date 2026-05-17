import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

/**
 * GET /api/organizations/marketplace-category
 * Retorna la categoría pública del marketplace asignada a la organización actual.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID requerido' }, { status: 400 })
    }

    const admin = await createAdminClient()

    const { data: org, error: orgError } = await (admin as any)
      .from('organizations')
      .select('id, marketplace_category_id')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    // Si tiene categoría asignada, obtener los detalles
    let category = null
    if (org.marketplace_category_id) {
      const { data: cat } = await (admin as any)
        .from('marketplace_categories')
        .select('id, name, slug, icon, color, description')
        .eq('id', org.marketplace_category_id)
        .single()
      category = cat || null
    }

    return NextResponse.json({ success: true, marketplace_category_id: org.marketplace_category_id, category })
  } catch (err) {
    console.error('[orgs/marketplace-category GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/organizations/marketplace-category
 * Asigna o quita la categoría pública del marketplace a la organización actual.
 * Body: { marketplace_category_id: string | null }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID requerido' }, { status: 400 })
    }

    const body = await request.json()
    const newCategoryId: string | null = body?.marketplace_category_id || null

    const admin = await createAdminClient()

    // Validar que la categoría existe y está activa (si se envía una)
    if (newCategoryId) {
      const { data: cat, error: catError } = await (admin as any)
        .from('marketplace_categories')
        .select('id, is_active')
        .eq('id', newCategoryId)
        .single()

      if (catError || !cat) {
        return NextResponse.json({ error: 'Categoría de marketplace no encontrada' }, { status: 404 })
      }
      if (!cat.is_active) {
        return NextResponse.json({ error: 'Esa categoría de marketplace está inactiva' }, { status: 400 })
      }
    }

    const { data, error } = await (admin as any)
      .from('organizations')
      .update({ marketplace_category_id: newCategoryId })
      .eq('id', orgId)
      .select('id, marketplace_category_id')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[orgs/marketplace-category PUT]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
