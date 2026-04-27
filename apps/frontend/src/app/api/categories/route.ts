import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canQuery = canUseSupabase && !!user && !userError

    if (!canQuery) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const status = (searchParams.get('status') || '').trim().toLowerCase()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = (supabase as any)
      .from('categories')
      .select(
        'id,name,description,is_active,parent_id,created_at,updated_at,products:products!products_category_id_fkey(count)',
        { count: 'exact' }
      )
      .eq('organization_id', orgId)

    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)
    if (search) {
      const esc = search.replace(/%/g, '\\%').replace(/_/g, '\\_')
      query = query.or(`name.ilike.%${esc}%,description.ilike.%${esc}%`)
    }

    query = query.order('name', { ascending: true })

    const { data: categories, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
      data: categories || [],
      count: Number(count ?? (categories?.length || 0)),
      pagination: {
        page,
        limit,
        total: Number(count ?? (categories?.length || 0)),
        totalPages: Math.max(1, Math.ceil(Number(count ?? (categories?.length || 0)) / limit)),
      },
    })

  } catch (error) {
    console.error('Unexpected error in categories API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create category
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canMutate = canUseSupabase && !!user && !userError

    if (!canMutate) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const body = await request.json()
    const name = String(body?.name || '').trim()
    const description = typeof body?.description === 'string' ? body.description : ''
    const is_active = body?.is_active === false ? false : true
    const parent_id = body?.parent_id === null || body?.parent_id === undefined || String(body.parent_id).trim() === ''
      ? null
      : String(body.parent_id).trim()

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Unique name check
    const { data: existing } = await (supabase as any)
      .from('categories')
      .select('id')
      .ilike('name', name)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    }

    if (parent_id) {
      const { data: parent, error: parentError } = await (supabase as any)
        .from('categories')
        .select('id')
        .eq('id', parent_id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (parentError) {
        return NextResponse.json({ error: 'No se pudo validar la categoría padre', details: parentError.message }, { status: 500 })
      }
      if (!parent) {
        return NextResponse.json({ error: 'Categoría padre no encontrada' }, { status: 400 })
      }
    }

    const { data, error } = await (supabase as any)
      .from('categories')
      .insert([{ name, description, is_active, parent_id, organization_id: orgId }])
      .select('id,name,description,is_active,parent_id,created_at,updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo crear la categoría', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
