import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isSupabaseActive } from '@/lib/env';
import { getValidatedOrganizationId } from '@/lib/organization';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (typeof body?.isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'isActive debe ser booleano' },
        { status: 400 },
      );
    }

    if (!isSupabaseActive()) {
      return NextResponse.json(
        { success: false, message: 'Supabase no configurado' },
        { status: 500 },
      );
    }

    const nextActive = body.isActive;
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const orgId =
      request.headers.get('x-organization-id')?.trim() ||
      (await getValidatedOrganizationId(request)) ||
      '';

    if (!orgId) {
      return NextResponse.json(
        { success: false, message: 'Organization header missing' },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('promotions')
      .select('id, organization_id, is_active')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Promocion no encontrada' },
        { status: 404 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabaseAdmin
      .from('promotions')
      .update({ is_active: nextActive })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (updateError) {
      console.error('[API/Promotions/Status] Update error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Error al actualizar estado' },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user?.id || null,
        table_name: 'promotions',
        record_id: id,
        organization_id: orgId,
        action: 'UPDATE_STATUS',
        changes: {
          isActive: nextActive,
          previousIsActive: existing.is_active,
        },
      });

    if (auditError) {
      console.error('[API/Promotions/Status] Audit error:', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/Promotions/Status] Unexpected error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno' },
      { status: 500 },
    );
  }
}
