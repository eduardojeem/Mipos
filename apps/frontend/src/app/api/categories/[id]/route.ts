import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canQuery = canUseSupabase && !!user && !userError

    if (!canQuery) {
      return NextResponse.json({ success: true, data: null }, { status: 200 })
    }

    const { id } = await params

    const { data: category, error } = await (supabase as any)
      .from('categories')
      .select('id,name,description,is_active,created_at,updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch category', details: error.message }, { status: 500 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    const { count } = await (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    const data = { ...category, _count: { products: count || 0 } }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canMutate = canUseSupabase && !!user && !userError

    if (!canMutate) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const updates: any = {}
    if (typeof body?.name === 'string') {
      const name = body.name.trim()
      if (!name) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      }
      // Unique name check excluding self
      const { data: existing } = await (supabase as any)
        .from('categories')
        .select('id')
        .eq('name', name)
        .neq('id', id)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
      }
      updates.name = name
    }
    if (typeof body?.description === 'string') {
      updates.description = body.description
    }
    if (typeof body?.is_active === 'boolean') {
      updates.is_active = body.is_active
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para actualizar' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select('id,name,description,is_active,created_at,updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar la categoría', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canMutate = canUseSupabase && !!user && !userError

    if (!canMutate) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Block delete if has products
    const { count } = await (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)

    if ((count || 0) > 0) {
      return NextResponse.json({ error: 'La categoría tiene productos asociados' }, { status: 409 })
    }

    const { error } = await (supabase as any)
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'No se pudo eliminar la categoría', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
