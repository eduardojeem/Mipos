import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getValidatedOrganizationId } from '@/lib/organization';
import { carouselCache, getCarouselCacheKey, type CarouselPayload } from './cache';

export const dynamic = 'force-dynamic';

async function resolveCarouselContext(request: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      organizationId: null,
      response: NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 },
      ),
    };
  }

  const organizationId = await getValidatedOrganizationId(request);
  if (!organizationId) {
    return {
      user,
      organizationId: null,
      response: NextResponse.json(
        { success: false, message: 'No se pudo resolver la organizacion activa' },
        { status: 400 },
      ),
    };
  }

  return {
    user,
    organizationId,
    response: null,
  };
}

async function validatePromotionIds(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from('promotions')
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', ids);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error al validar las promociones seleccionadas',
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: 500 },
    );
  }

  if ((data || []).length !== ids.length) {
    return NextResponse.json(
      {
        success: false,
        message: 'Algunas promociones no pertenecen a la organizacion activa',
      },
      { status: 400 },
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveCarouselContext(request);
    if (context.response) {
      return context.response;
    }

    const organizationId = context.organizationId as string;
    const cacheKey = getCarouselCacheKey(organizationId);
    const cached = carouselCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, { headers: { 'x-cache': 'HIT' } });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('promotions_carousel')
      .select('promotion_id, position')
      .eq('organization_id', organizationId)
      .order('position', { ascending: true });

    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')
      ) {
        return NextResponse.json({ success: true, ids: [] });
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Error al cargar el carrusel',
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    const ids = (data || []).map((row: { promotion_id: string }) => String(row.promotion_id));
    const payload: CarouselPayload = { success: true, ids };
    carouselCache.set(cacheKey, { expiresAt: Date.now() + 60_000, payload });

    return NextResponse.json(payload, { headers: { 'x-cache': 'MISS' } });
  } catch (error) {
    console.error('[API/Carousel] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await resolveCarouselContext(request);
    if (context.response) {
      return context.response;
    }

    const user = context.user!;
    const organizationId = context.organizationId as string;
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map((id: unknown) => String(id)) : [];

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter((id) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'IDs invalidos detectados. Solo se permiten promociones reales.',
        },
        { status: 400 },
      );
    }

    if (ids.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message: 'Maximo 10 elementos permitidos en el carrusel',
        },
        { status: 400 },
      );
    }

    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: 'No se permiten promociones duplicadas en el carrusel',
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const validationResponse = await validatePromotionIds(supabase, organizationId, ids);
    if (validationResponse) {
      return validationResponse;
    }

    const { data: existingData, error: existingError } = await supabase
      .from('promotions_carousel')
      .select('promotion_id')
      .eq('organization_id', organizationId)
      .order('position', { ascending: true });

    if (existingError && existingError.code !== '42P01') {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al leer el carrusel actual',
          error: existingError.message,
          code: existingError.code,
          details: existingError.details,
        },
        { status: 500 },
      );
    }

    const previousState = (existingData || []).map((row: { promotion_id: string }) =>
      String(row.promotion_id),
    );

    const { error: deleteError, count: deletedCount } = await supabase
      .from('promotions_carousel')
      .delete({ count: 'exact' })
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.error('[API/Carousel] Delete error:', deleteError);
      return NextResponse.json(
        {
          success: false,
          message: 'Error al limpiar el carrusel anterior',
          error: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
        },
        { status: 500 },
      );
    }

    console.log('[API/Carousel] Deleted items:', deletedCount || 0);

    if (ids.length > 0) {
      const rows = ids.map((promotionId, index) => ({
        promotion_id: promotionId,
        position: index + 1,
        organization_id: organizationId,
      }));

      const { error: insertError } = await supabase
        .from('promotions_carousel')
        .insert(rows);

      if (insertError) {
        console.error('[API/Carousel] Insert error:', insertError);
        return NextResponse.json(
          {
            success: false,
            message: 'Error al guardar el carrusel',
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
          },
          { status: 500 },
        );
      }
    }

    const action =
      previousState.length === ids.length &&
      previousState.every((id) => ids.includes(id)) &&
      JSON.stringify(previousState) !== JSON.stringify(ids)
        ? 'REORDER_CAROUSEL'
        : 'UPDATE_CAROUSEL';

    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: user.id || null,
      table_name: 'promotions_carousel',
      record_id: 'carousel',
      action,
      organization_id: organizationId,
      changes: {
        previous_state: previousState,
        new_state: ids,
      },
    });

    if (auditError) {
      console.error('[API/Carousel] Audit log error:', auditError);
    }

    carouselCache.delete(getCarouselCacheKey(organizationId));

    return NextResponse.json({ success: true, ids });
  } catch (error) {
    console.error('[API/Carousel] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
