import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

type MarketplaceCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  parent_id: string | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

function generateSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function requireSuperAdmin(supabase: any): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_super_admin')
  return !error && data === true
}

/**
 * GET /api/admin/marketplace/categories
 * Lista todas las categorías del marketplace (activas e inactivas) para el panel admin.
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = (adminSupabase as any)
      .from('marketplace_categories')
      .select('*', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Error al obtener categorías', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categories: (data || []) as MarketplaceCategoryRow[],
      count: Number(count ?? 0),
    })
  } catch (err) {
    console.error('[admin/marketplace/categories GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/marketplace/categories
 * Crea una nueva categoría del marketplace. Solo super admins.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const name = String(body?.name || '').trim()

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'El nombre es requerido (mínimo 2 caracteres)' }, { status: 400 })
    }

    const slug = body?.slug
      ? String(body.slug).trim().toLowerCase()
      : generateSlug(name)

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'El slug solo puede contener letras minúsculas, números y guiones' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    const { data: existing } = await (adminSupabase as any)
      .from('marketplace_categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe una categoría con el slug "${slug}"` },
        { status: 409 }
      )
    }

    const insert = {
      name,
      slug,
      description:     typeof body?.description === 'string' ? body.description.trim() : null,
      icon:            typeof body?.icon         === 'string' ? body.icon.trim()        : null,
      color:           typeof body?.color        === 'string' ? body.color.trim()       : '#10b981',
      image_url:       typeof body?.image_url    === 'string' ? body.image_url.trim()   : null,
      is_active:       body?.is_active  !== false,
      is_featured:     body?.is_featured === true,
      sort_order:      typeof body?.sort_order === 'number' ? body.sort_order : 0,
      parent_id:       body?.parent_id || null,
      seo_title:       typeof body?.seo_title       === 'string' ? body.seo_title.trim()       : null,
      seo_description: typeof body?.seo_description === 'string' ? body.seo_description.trim() : null,
    }

    const { data, error } = await (adminSupabase as any)
      .from('marketplace_categories')
      .insert([insert])
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al crear categoría', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    console.error('[admin/marketplace/categories POST]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
