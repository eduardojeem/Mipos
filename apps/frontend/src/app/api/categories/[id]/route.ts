import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser();
    const canUseSupabase = typeof (supabase as any).from === 'function';
    const canQuery = canUseSupabase && !!user && !userError;

    if (!canQuery) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = (await getValidatedOrganizationId(request)) || '';
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });

    const { id } = await params;

    const { data: category, error } = await (supabase as any)
      .from('categories')
      .select('id,name,description,is_active,parent_id,created_at,updated_at')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'No se pudo obtener la categoría', details: error.message }, { status: 500 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }

    const { count } = await (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('organization_id', orgId);

    const data = { ...category, _count: { products: count || 0 } };
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser();
    const canUseSupabase = typeof (supabase as any).from === 'function';
    const canMutate = canUseSupabase && !!user && !userError;

    if (!canMutate) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = (await getValidatedOrganizationId(request)) || '';
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
      }

      const { data: existing } = await (supabase as any)
        .from('categories')
        .select('id')
        .ilike('name', name)
        .neq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
      }
      updates.name = name;
    }

    if (typeof body?.description === 'string') {
      updates.description = body.description.trim();
    }

    if (typeof body?.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }

    if (body?.parent_id !== undefined) {
      const parentId = body.parent_id === null || String(body.parent_id).trim() === ''
        ? null
        : String(body.parent_id).trim();

      if (parentId === id) {
        return NextResponse.json({ error: 'La categoría no puede ser su propio padre' }, { status: 400 });
      }

      if (parentId) {
        const { data: parent, error: parentError } = await (supabase as any)
          .from('categories')
          .select('id,parent_id')
          .eq('id', parentId)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (parentError) {
          return NextResponse.json({ error: 'No se pudo validar la categoría padre', details: parentError.message }, { status: 500 });
        }
        if (!parent) {
          return NextResponse.json({ error: 'Categoría padre no encontrada' }, { status: 400 });
        }

        let cursor: string | null = parentId;
        for (let i = 0; i < 50 && cursor; i++) {
          if (cursor === id) {
            return NextResponse.json({ error: 'Movimiento inválido: genera un ciclo en el árbol' }, { status: 400 });
          }

          const { data: rowData, error: rowError } = await (supabase as any)
            .from('categories')
            .select('parent_id')
            .eq('id', cursor)
            .eq('organization_id', orgId)
            .maybeSingle();

          if (rowError) {
            return NextResponse.json({ error: 'No se pudo validar la jerarquía', details: rowError.message }, { status: 500 });
          }

          const row = rowData as { parent_id?: string | null } | null;
          cursor = row?.parent_id ? String(row.parent_id) : null;
        }

        if (cursor) {
          return NextResponse.json({ error: 'Jerarquía demasiado profunda o inválida' }, { status: 400 });
        }
      }

      updates.parent_id = parentId;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para actualizar' }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id,name,description,is_active,parent_id,created_at,updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar la categoría', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser();
    const canUseSupabase = typeof (supabase as any).from === 'function';
    const canMutate = canUseSupabase && !!user && !userError;

    if (!canMutate) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = (await getValidatedOrganizationId(request)) || '';
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });

    const { id } = await params;

    const { count } = await (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('organization_id', orgId);

    if ((count || 0) > 0) {
      return NextResponse.json({ error: 'La categoría tiene productos asociados' }, { status: 409 });
    }

    const { count: childrenCount, error: childrenError } = await (supabase as any)
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id)
      .eq('organization_id', orgId);

    if (childrenError) {
      return NextResponse.json({ error: 'No se pudo validar subcategorías', details: childrenError.message }, { status: 500 });
    }

    if ((childrenCount || 0) > 0) {
      return NextResponse.json({ error: 'La categoría tiene subcategorías asociadas' }, { status: 409 });
    }

    const { error } = await (supabase as any)
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return NextResponse.json({ error: 'No se pudo eliminar la categoría', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
