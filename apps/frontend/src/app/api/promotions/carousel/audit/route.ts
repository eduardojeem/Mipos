import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getValidatedOrganizationId } from '@/lib/organization';

type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  changes?: {
    previous_state?: string[];
    new_state?: string[];
  } | null;
  created_at: string;
  users?: {
    email?: string | null;
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 },
      );
    }

    const organizationId = await getValidatedOrganizationId(request);
    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'No se pudo resolver la organizacion activa' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, changes, created_at, users(email)')
      .eq('table_name', 'promotions_carousel')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[API/Carousel/Audit] Error:', error);
      return NextResponse.json(
        { success: false, message: 'Error al cargar el historial', error: error.message },
        { status: 500 },
      );
    }

    const logs = ((data || []) as AuditLogRow[]).map((log) => ({
      id: log.id,
      userId: log.user_id,
      userName: log.users?.email || 'Sistema',
      action: log.action,
      previousState: log.changes?.previous_state || [],
      newState: log.changes?.new_state || [],
      createdAt: log.created_at,
    }));

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('[API/Carousel/Audit] Critical Error:', error);
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
