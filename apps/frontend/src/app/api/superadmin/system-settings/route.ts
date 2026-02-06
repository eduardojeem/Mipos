import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Tabla para almacenar configuración del sistema
// CREATE TABLE IF NOT EXISTS system_settings (
//   key TEXT PRIMARY KEY,
//   value JSONB NOT NULL,
//   updated_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_by UUID REFERENCES auth.users(id)
// );

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea super admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || (userRole.role as any)?.name !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo Super Admins pueden acceder.' },
        { status: 403 }
      );
    }

    // Obtener configuración del sistema
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'base_domain')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (es válido si no existe aún)
      console.error('Error fetching system settings:', settingsError);
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      );
    }

    // Retornar configuración o valores por defecto
    const baseDomain = settings?.value?.domain || process.env.NEXT_PUBLIC_BASE_DOMAIN || 'miposparaguay.vercel.app';

    return NextResponse.json({
      baseDomain,
    });

  } catch (error) {
    console.error('Error in GET /api/superadmin/system-settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea super admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || (userRole.role as any)?.name !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo Super Admins pueden modificar la configuración.' },
        { status: 403 }
      );
    }

    // Leer body
    const body = await request.json();
    const { baseDomain } = body;

    // Validar
    if (!baseDomain || typeof baseDomain !== 'string') {
      return NextResponse.json(
        { error: 'El dominio base es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de dominio
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(baseDomain)) {
      return NextResponse.json(
        { error: 'Formato de dominio inválido' },
        { status: 400 }
      );
    }

    // Guardar configuración (upsert)
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'base_domain',
        value: { domain: baseDomain.toLowerCase().trim() },
        category: 'general',
        description: 'Dominio base del sistema SaaS para subdominios de organizaciones',
        is_active: true,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      });

    if (upsertError) {
      console.error('Error upserting system settings:', upsertError);
      return NextResponse.json(
        { error: 'Error al guardar configuración' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      baseDomain: baseDomain.toLowerCase().trim(),
    });

  } catch (error) {
    console.error('Error in POST /api/superadmin/system-settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
