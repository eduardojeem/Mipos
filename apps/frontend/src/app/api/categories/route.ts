import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canQuery = canUseSupabase && !!user && !userError

    if (!canQuery) {
      // Fast fallback when Supabase is not configured or no valid user
      return NextResponse.json({ success: true, categories: [], data: [], count: 0 })
    }

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    let query = (supabase as any)
      .from('categories')
      .select('id, name, description')
      .eq('organization_id', orgId)
      .order('name')

    const { data: categories, error } = await query

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
      count: categories?.length || 0
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

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const body = await request.json()
    const name = String(body?.name || '').trim()
    const description = typeof body?.description === 'string' ? body.description : ''
    const is_active = body?.is_active === false ? false : true

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Unique name check
    const { data: existing } = await (supabase as any)
      .from('categories')
      .select('id')
      .eq('name', name)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    }

    const { data, error } = await (supabase as any)
      .from('categories')
      .insert([{ name, description, is_active, organization_id: orgId }])
      .select('id,name,description,is_active,created_at,updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo crear la categoría', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
