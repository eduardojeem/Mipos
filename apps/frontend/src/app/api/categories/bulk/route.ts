import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(['activate', 'deactivate', 'delete']),
})

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

    const body = bulkSchema.parse(await request.json())
    const ids = Array.from(new Set(body.ids.map((v) => String(v).trim()).filter(Boolean)))

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No hay categorías seleccionadas' }, { status: 400 })
    }

    if (body.action === 'delete') {
      const { data: productRows, error: productsError } = await (supabase as any)
        .from('products')
        .select('category_id')
        .eq('organization_id', orgId)
        .in('category_id', ids)
        .limit(10000)

      if (productsError) {
        return NextResponse.json({ error: 'No se pudo validar productos asociados', details: productsError.message }, { status: 500 })
      }

      const productConflicts = Array.from(
        new Set((productRows || []).map((r: any) => String(r.category_id)).filter(Boolean))
      )

      if (productConflicts.length > 0) {
        return NextResponse.json(
          { error: 'Hay categorías con productos asociados', conflicts: productConflicts },
          { status: 409 }
        )
      }

      const { data: childRows, error: childrenError } = await (supabase as any)
        .from('categories')
        .select('parent_id')
        .eq('organization_id', orgId)
        .in('parent_id', ids)
        .limit(10000)

      if (childrenError) {
        return NextResponse.json({ error: 'No se pudo validar subcategorías asociadas', details: childrenError.message }, { status: 500 })
      }

      const childConflicts = Array.from(
        new Set((childRows || []).map((r: any) => String(r.parent_id)).filter(Boolean))
      )

      if (childConflicts.length > 0) {
        return NextResponse.json(
          { error: 'Hay categorías con subcategorías asociadas', conflicts: childConflicts },
          { status: 409 }
        )
      }

      const { error: delError } = await (supabase as any)
        .from('categories')
        .delete()
        .eq('organization_id', orgId)
        .in('id', ids)

      if (delError) {
        return NextResponse.json({ error: 'No se pudieron eliminar las categorías', details: delError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, deleted: ids.length })
    }

    const isActive = body.action === 'activate'
    const { error: updError } = await (supabase as any)
      .from('categories')
      .update({ is_active: isActive })
      .eq('organization_id', orgId)
      .in('id', ids)

    if (updError) {
      return NextResponse.json({ error: 'No se pudieron actualizar las categorías', details: updError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: ids.length, is_active: isActive })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
