import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  password_expiry_days: number;
  max_login_attempts: number;
  require_password_change: boolean;
  enable_login_notifications: boolean;
  allowed_ip_addresses: string[];
}

function getDefaultSecuritySettings(): SecuritySettings {
  return {
    two_factor_enabled: false,
    session_timeout: 30,
    password_expiry_days: 90,
    max_login_attempts: 5,
    require_password_change: false,
    enable_login_notifications: true,
    allowed_ip_addresses: [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const meta = session.user.user_metadata || {};
    const stored = (meta.security_settings || {}) as Partial<SecuritySettings>;
    const defaults = getDefaultSecuritySettings();
    const securitySettings: SecuritySettings = { ...defaults, ...stored } as SecuritySettings;

    return NextResponse.json({ success: true, data: securitySettings });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const input = body as Partial<SecuritySettings>;

    const cleanSettings: SecuritySettings = {
      two_factor_enabled: Boolean(input.two_factor_enabled ?? false),
      session_timeout: Number(input.session_timeout ?? 30),
      password_expiry_days: Number(input.password_expiry_days ?? 90),
      max_login_attempts: Number(input.max_login_attempts ?? 5),
      require_password_change: Boolean(input.require_password_change ?? false),
      enable_login_notifications: Boolean(input.enable_login_notifications ?? true),
      allowed_ip_addresses: Array.isArray(input.allowed_ip_addresses) ? input.allowed_ip_addresses.map(String) : [],
    };

    const { error: updateError } = await supabase.auth.updateUser({
      data: { security_settings: cleanSettings }
    });

    if (updateError) {
      console.error('Error updating security settings:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar la configuración de seguridad' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: cleanSettings, message: 'Configuración de seguridad actualizada correctamente' });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}