import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';

const SETTING_META: Record<string, { category: string; description: string }> = {
  system_name: { category: 'general', description: 'Nombre visible del sistema' },
  system_email: { category: 'general', description: 'Email principal del sistema' },
  maintenance_mode: { category: 'general', description: 'Activa o desactiva modo mantenimiento' },
  allow_registrations: { category: 'general', description: 'Permite nuevos registros de organizaciones' },
  require_email_verification: { category: 'security', description: 'Requiere verificacion de email' },
  enable_two_factor: { category: 'security', description: 'Activa autenticacion de dos factores' },
  session_timeout: { category: 'security', description: 'Tiempo de sesion en minutos' },
  max_login_attempts: { category: 'security', description: 'Intentos maximos de login' },
  enable_notifications: { category: 'notifications', description: 'Activa notificaciones generales' },
  enable_email_notifications: { category: 'notifications', description: 'Activa notificaciones por email' },
  enable_sms_notifications: { category: 'notifications', description: 'Activa notificaciones SMS' },
  backup_enabled: { category: 'data', description: 'Activa respaldos declarativos' },
  backup_frequency: { category: 'data', description: 'Frecuencia de respaldos' },
  data_retention_days: { category: 'data', description: 'Dias de retencion de datos' },
};

function parseSettingValue(value: unknown) {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const admin = createAdminClient();
    const { data: settings, error } = await admin
      .from('system_settings')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Error al obtener configuraciones', details: error.message },
        { status: 500 },
      );
    }

    const settingsObject: Record<string, unknown> = {};
    for (const setting of settings || []) {
      settingsObject[String(setting.key)] = parseSettingValue(setting.value);
    }

    return NextResponse.json({
      success: true,
      settings: settingsObject,
      raw: settings || [],
    });
  } catch (error) {
    console.error('Error in GET /api/superadmin/settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Formato de datos invalido' },
        { status: 400 },
      );
    }

    const updatedAt = new Date().toISOString();
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      category: SETTING_META[key]?.category || 'general',
      description: SETTING_META[key]?.description || `Configuracion ${key}`,
      is_active: true,
      updated_at: updatedAt,
      updated_by: auth.userId,
    }));

    const admin = createAdminClient();
    const { error } = await admin
      .from('system_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      console.error('Error saving system settings:', error);
      return NextResponse.json(
        { error: 'Error al guardar configuraciones', details: error.message },
        { status: 500 },
      );
    }

    const updatedKeys = rows.map((row) => row.key);
    try {
      await admin.from('audit_logs').insert({
        action: 'settings.updated',
        entity_type: 'system_settings',
        user_id: auth.userId,
        metadata: {
          updated_keys: updatedKeys,
          total_updates: updatedKeys.length,
        },
        severity: 'WARNING',
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuraciones actualizadas correctamente',
      updated: updatedKeys,
    });
  } catch (error) {
    console.error('Error in POST /api/superadmin/settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
