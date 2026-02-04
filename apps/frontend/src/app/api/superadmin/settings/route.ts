import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

/**
 * GET /api/superadmin/settings
 * Obtiene todas las configuraciones del sistema
 */
export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient();

    // Obtener todas las configuraciones
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return NextResponse.json(
        { error: 'Error al obtener configuraciones', details: settingsError.message },
        { status: 500 }
      );
    }

    // Transformar a formato objeto plano para el frontend
    const settingsObject: Record<string, unknown> = {};
    settings?.forEach((setting: { key: string; value: any }) => {
      // Parsear el valor JSONB
      let value = setting.value;
      
      // Si es un string JSON entre comillas, parsearlo
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          // Si no se puede parsear, usar el valor tal cual
        }
      }
      
      settingsObject[setting.key] = value;
    });

    return NextResponse.json({
      success: true,
      settings: settingsObject,
      raw: settings, // También enviar el array completo por si se necesita
    });
  } catch (error) {
    console.error('Error in GET /api/superadmin/settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/settings
 * Actualiza las configuraciones del sistema
 */
export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Obtener datos del body

    // Obtener datos del body
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      );
    }

    // Actualizar cada setting individualmente
    const updates = [];
    const errors = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        // Convertir el valor a JSONB
        let jsonbValue = value;
        
        // Si es string, number o boolean, envolverlo en JSON
        if (typeof value === 'string') {
          jsonbValue = JSON.stringify(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          jsonbValue = value;
        }

        const { error } = await supabase
          .from('system_settings')
          .update({
            value: jsonbValue,
            updated_by: user.id,
          })
          .eq('key', key);

        if (error) {
          errors.push({ key, error: error.message });
        } else {
          updates.push(key);
        }
      } catch (err) {
        errors.push({ key, error: String(err) });
      }
    }

    // Crear audit log
    try {
      await supabase.from('audit_logs').insert({
        action: 'settings.updated',
        entity_type: 'system_settings',
        user_id: user.id,
        metadata: {
          updated_keys: updates,
          errors: errors.length > 0 ? errors : undefined,
          total_updates: updates.length,
        },
        severity: 'WARNING',
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Algunas configuraciones no se pudieron actualizar',
          updated: updates,
          errors,
        },
        { status: 207 } // Multi-Status
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuraciones actualizadas correctamente',
      updated: updates,
    });
  } catch (error) {
    console.error('Error in POST /api/superadmin/settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
