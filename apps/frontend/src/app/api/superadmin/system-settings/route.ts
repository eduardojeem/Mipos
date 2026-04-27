import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';

// Tabla para almacenar configuración del sistema
// CREATE TABLE IF NOT EXISTS system_settings (
//   key TEXT PRIMARY KEY,
//   value JSONB NOT NULL,
//   updated_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_by UUID REFERENCES auth.users(id)
// );

export async function GET(request: NextRequest) {
  try {
    const auth = await assertSuperAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const admin = createAdminClient();

    const { data: settings, error: settingsError } = await admin
      .from('system_settings')
      .select('value')
      .eq('key', 'base_domain')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching system settings:', settingsError);
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      );
    }

    const baseDomain = settings?.value?.domain || process.env.NEXT_PUBLIC_BASE_DOMAIN || 'miposparaguay.vercel.app';

    return NextResponse.json({ baseDomain });
  } catch (error) {
    console.error('Error in GET /api/superadmin/system-settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await assertSuperAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const admin = createAdminClient();

    const body = await request.json();
    const { baseDomain } = body;

    if (!baseDomain || typeof baseDomain !== 'string') {
      return NextResponse.json({ error: 'El dominio base es requerido' }, { status: 400 });
    }

    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(baseDomain)) {
      return NextResponse.json({ error: 'Formato de dominio inválido' }, { status: 400 });
    }

    const { error: upsertError } = await admin
      .from('system_settings')
      .upsert({
        key: 'base_domain',
        value: { domain: baseDomain.toLowerCase().trim() },
        category: 'general',
        description: 'Dominio base del sistema SaaS para subdominios de organizaciones',
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      });

    if (upsertError) {
      console.error('Error upserting system settings:', upsertError);
      return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
    }

    return NextResponse.json({ success: true, baseDomain: baseDomain.toLowerCase().trim() });
  } catch (error) {
    console.error('Error in POST /api/superadmin/system-settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
