import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function requireSuperAdmin(supabase: any): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_super_admin')
  return !error && data === true
}

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/marketplace/categories/[id]
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isAdmin = await requireSuperAdmin(supabase)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado. Solo super admins.' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()
    const { data, error } = await (adminSupabase as any)
      .from('marketplace_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[admin/marketplace/categories/[id] GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/marketplace/categories/[id]
 * Actualiza una categoría del marketplace. Solo super admins.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isAdmin = await requireSuperAdmin(supabase)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado. Solo super admins.' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    const { data: existing } = await (adminSupabase as any)
      .from('marketplace_categories')
      .select('id, slug')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const update: Record<string, unknown> = {}

    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (name.length < 2) {
        return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 })
      }
      update.name = name
    }

    if (typeof body.slug === 'string') {
      const slug = body.slug.trim().toLowerCase()
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return NextResponse.json(
          { error: 'El slug solo puede contener letras minúsculas, números y guiones' },
          { status: 400 }
        )
      }
      if (slug !== existing.slug) {
        const { data: conflicting } = await (adminSupabase as any)
          .from('marketplace_categories')
          .select('id')
          .eq('slug', slug)
          .neq('id', id)
          .maybeSingle()

        if (conflicting) {
          return NextResponse.json(
            { error: `Ya existe una categoría con el slug "${slug}"` },
            { status: 409 }
          )
        }
      }
      update.slug = slug
    }

    if (typeof body.description === 'string')    update.description     = body.description.trim() || null
    if (typeof body.icon        === 'string')    update.icon            = body.icon.trim()         || null
    if (typeof body.color       === 'string')    update.color           = body.color.trim()
    if (typeof body.image_url   === 'string')    update.image_url       = body.image_url.trim()    || null
    if (typeof body.is_active   === 'boolean')   update.is_active       = body.is_active
    if (typeof body.is_featured === 'boolean')   update.is_featured     = body.is_featured
    if (typeof body.sort_order  === 'number')    update.sort_order      = body.sort_order
    if (body.parent_id !== undefined)            update.parent_id       = body.parent_id || null
    if (typeof body.seo_title       === 'string') update.seo_title       = body.seo_title.trim()       || null
    if (typeof body.seo_description === 'string') update.seo_description = body.seo_description.trim() || null

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await (adminSupabase as any)
      .from('marketplace_categories')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar categoría', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[admin/marketplace/categories/[id] PUT]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/marketplace/categories/[id]
 * Elimina o desactiva una categoría del marketplace.
 * Si hay organizaciones vinculadas, hace soft-delete (is_active = false).
 * Solo super admins.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isAdmin = await requireSuperAdmin(supabase)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado. Solo super admins.' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()

    // Verificar si hay organizaciones vinculadas
    const { count: orgCount } = await (adminSupabase as any)
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('marketplace_category_id', id)

    if (orgCount && orgCount > 0) {
      // Soft-delete: desactivar en lugar de borrar para no romper vínculos
      const { data, error } = await (adminSupabase as any)
        .from('marketplace_categories')
        .update({ is_active: false })
        .eq('id', id)
        .select('id, name, slug')
        .single()

      if (error) {
        return NextResponse.json({ error: 'Error al desactivar categoría', details: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `La categoría fue desactivada (tiene ${orgCount} organización(es) vinculada(s))`,
        data,
      })
    }

    // Hard-delete si no hay orgs vinculadas
    const { error } = await (adminSupabase as any)
      .from('marketplace_categories')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Error al eliminar categoría', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Categoría eliminada exitosamente' })
  } catch (err) {
    console.error('[admin/marketplace/categories/[id] DELETE]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
