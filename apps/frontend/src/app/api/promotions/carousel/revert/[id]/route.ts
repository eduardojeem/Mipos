import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getValidatedOrganizationId } from '@/lib/organization';
import { carouselCache, getCarouselCacheKey } from '../../cache';

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
        message: 'Error al validar la version del carrusel',
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
        message: 'La version del carrusel contiene promociones fuera de la organizacion activa',
      },
      { status: 400 },
    );
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveCarouselContext(request);
    if (context.response) {
      return context.response;
    }

    const { id } = await params;
    const user = context.user!;
    const organizationId = context.organizationId as string;
    const supabase = createAdminClient();

    const { data: logEntry, error: logError } = await supabase
      .from('audit_logs')
      .select('changes, organization_id')
      .eq('id', id)
      .eq('table_name', 'promotions_carousel')
      .single();

    if (logError || !logEntry) {
      return NextResponse.json(
        { success: false, message: 'Entrada de historial no encontrada' },
        { status: 404 },
      );
    }

    if (logEntry.organization_id && logEntry.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, message: 'La version solicitada no pertenece a la organizacion activa' },
        { status: 404 },
      );
    }

    const targetState = logEntry.changes?.new_state as string[] | undefined;
    if (!Array.isArray(targetState)) {
      return NextResponse.json(
        { success: false, message: 'Estado invalido en el historial' },
        { status: 400 },
      );
    }

    const validationResponse = await validatePromotionIds(supabase, organizationId, targetState);
    if (validationResponse) {
      return validationResponse;
    }

    const { data: currentData, error: currentError } = await supabase
      .from('promotions_carousel')
      .select('promotion_id')
      .eq('organization_id', organizationId)
      .order('position', { ascending: true });

    if (currentError && currentError.code !== '42P01') {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al leer el carrusel actual',
          error: currentError.message,
          code: currentError.code,
          details: currentError.details,
        },
        { status: 500 },
      );
    }

    const currentState = (currentData || []).map((row: { promotion_id: string }) =>
      String(row.promotion_id),
    );

    const { error: deleteError } = await supabase
      .from('promotions_carousel')
      .delete()
      .eq('organization_id', organizationId);

    if (deleteError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Error al limpiar el carrusel actual',
          error: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
        },
        { status: 500 },
      );
    }

    if (targetState.length > 0) {
      const rows = targetState.map((promotionId, index) => ({
        promotion_id: promotionId,
        position: index + 1,
        organization_id: organizationId,
      }));

      const { error: insertError } = await supabase
        .from('promotions_carousel')
        .insert(rows);

      if (insertError) {
        return NextResponse.json(
          {
            success: false,
            message: 'Error al restaurar el carrusel',
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
          },
          { status: 500 },
        );
      }
    }

    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: user.id || null,
      table_name: 'promotions_carousel',
      record_id: 'carousel',
      action: 'REVERT_CAROUSEL',
      organization_id: organizationId,
      changes: {
        previous_state: currentState,
        new_state: targetState,
        reverted_from_log_id: id,
      },
    });

    if (auditError) {
      console.error('[API/Carousel/Revert] Audit log error:', auditError);
    }

    carouselCache.delete(getCarouselCacheKey(organizationId));

    return NextResponse.json({ success: true, ids: targetState });
  } catch (error) {
    console.error('[API/Carousel/Revert] Critical error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error al revertir cambios',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
