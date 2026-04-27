import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { setCachedConfig } from '@/app/api/business-config/cache';
import type { BusinessConfig } from '@/types/business-config';
import { defaultBusinessConfig } from '@/types/business-config';

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  password_expiry_days: number;
  max_login_attempts: number;
  require_password_change: boolean;
  enable_login_notifications: boolean;
  allowed_ip_addresses: string[];
  require_strong_passwords: boolean;
  lockout_duration: number;
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
    require_strong_passwords: true,
    lockout_duration: 15,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberSetting(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getRequestedOrganizationId(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return (
    searchParams.get('organizationId') ||
    searchParams.get('organization_id') ||
    request.headers.get('x-organization-id') ||
    request.cookies.get('x-organization-id')?.value ||
    null
  );
}

async function validateOrganizationMembership(
  adminClient: AdminClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  return Boolean(data?.organization_id);
}

async function resolveOrganizationId(
  request: NextRequest,
  adminClient: AdminClient,
  userId: string,
  organizationIdFromAuth: string | null,
  isSuperAdmin: boolean
): Promise<string | null> {
  const requestedOrganizationId = getRequestedOrganizationId(request);
  const organizationId = requestedOrganizationId || organizationIdFromAuth || await getUserOrganizationId(userId);

  if (!organizationId) {
    return null;
  }

  if (isSuperAdmin || userId === 'mock-user') {
    return organizationId;
  }

  return await validateOrganizationMembership(adminClient, userId, organizationId)
    ? organizationId
    : null;
}

function organizationSecurityFromConfig(value: unknown): Partial<SecuritySettings> {
  const defaults = getDefaultSecuritySettings();
  const config = isRecord(value) ? value : {};
  const systemSettings = isRecord(config.systemSettings) ? config.systemSettings : {};
  const security = isRecord(systemSettings.security) ? systemSettings.security : {};

  return {
    two_factor_enabled: booleanSetting(security.enableTwoFactor, defaults.two_factor_enabled),
    session_timeout: numberSetting(systemSettings.sessionTimeout, defaults.session_timeout),
    max_login_attempts: numberSetting(security.maxLoginAttempts, defaults.max_login_attempts),
    require_strong_passwords: booleanSetting(security.requireStrongPasswords, defaults.require_strong_passwords),
    lockout_duration: numberSetting(security.lockoutDuration, defaults.lockout_duration),
  };
}

async function loadOrganizationSecuritySettings(
  adminClient: AdminClient,
  organizationId: string
): Promise<Partial<SecuritySettings>> {
  const { data: secData, error: secError } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'security_settings')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (secError) {
    throw secError;
  }

  const secValue = (secData as { value?: unknown } | null)?.value;
  if (isRecord(secValue)) {
    const defaults = getDefaultSecuritySettings();
    return {
      two_factor_enabled: booleanSetting(secValue.two_factor_enabled, defaults.two_factor_enabled),
      session_timeout: numberSetting(secValue.session_timeout, defaults.session_timeout),
      password_expiry_days: numberSetting(secValue.password_expiry_days, defaults.password_expiry_days),
      max_login_attempts: numberSetting(secValue.max_login_attempts, defaults.max_login_attempts),
      require_password_change: booleanSetting(secValue.require_password_change, defaults.require_password_change),
      enable_login_notifications: booleanSetting(secValue.enable_login_notifications, defaults.enable_login_notifications),
      allowed_ip_addresses: Array.isArray(secValue.allowed_ip_addresses)
        ? (secValue.allowed_ip_addresses as unknown[]).map(String)
        : defaults.allowed_ip_addresses,
      require_strong_passwords: booleanSetting(secValue.require_strong_passwords, defaults.require_strong_passwords),
      lockout_duration: numberSetting(secValue.lockout_duration, defaults.lockout_duration),
    };
  }

  const { data, error } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return organizationSecurityFromConfig((data as { value?: unknown } | null)?.value);
}

async function persistOrganizationSecuritySettings(
  adminClient: AdminClient,
  organizationId: string,
  settings: SecuritySettings
) {
  const now = new Date().toISOString();

  const { error: secUpsertError } = await adminClient
    .from('settings')
    .upsert(
      {
        key: 'security_settings',
        organization_id: organizationId,
        value: settings,
        updated_at: now,
      },
      { onConflict: 'organization_id,key' }
    );

  if (secUpsertError) {
    throw secUpsertError;
  }

  const { data, error } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const current = isRecord((data as { value?: unknown } | null)?.value)
    ? ((data as { value?: unknown }).value as Record<string, unknown>)
    : {};
  const currentSystemSettings = isRecord(current.systemSettings) ? current.systemSettings : {};
  const currentSecurity = isRecord(currentSystemSettings.security) ? currentSystemSettings.security : {};
  const currentEmail = isRecord(currentSystemSettings.email) ? currentSystemSettings.email : {};

  const nextConfig = {
    ...defaultBusinessConfig,
    ...current,
    systemSettings: {
      ...defaultBusinessConfig.systemSettings!,
      ...currentSystemSettings,
      sessionTimeout: settings.session_timeout,
      security: {
        ...defaultBusinessConfig.systemSettings!.security,
        ...currentSecurity,
        requireStrongPasswords: settings.require_strong_passwords,
        enableTwoFactor: booleanSetting(currentSecurity.enableTwoFactor, settings.two_factor_enabled),
        maxLoginAttempts: settings.max_login_attempts,
        lockoutDuration: settings.lockout_duration,
      },
      email: {
        ...defaultBusinessConfig.systemSettings!.email,
        ...currentEmail,
        provider: 'smtp' as const,
      },
    },
    updatedAt: now,
  } as BusinessConfig;

  const { error: upsertError } = await adminClient
    .from('settings')
    .upsert(
      {
        key: 'business_config',
        organization_id: organizationId,
        value: nextConfig,
        updated_at: now,
      },
      { onConflict: 'organization_id,key' }
    );

  if (upsertError) {
    throw upsertError;
  }

  setCachedConfig(organizationId, nextConfig);
}

function validateSecuritySettings(settings: SecuritySettings): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(settings.session_timeout) || settings.session_timeout < 5 || settings.session_timeout > 1440) {
    errors.push('El tiempo de sesion debe estar entre 5 y 1440 minutos');
  }

  if (!Number.isInteger(settings.password_expiry_days) || settings.password_expiry_days < 0 || settings.password_expiry_days > 365) {
    errors.push('La caducidad de contrasena debe estar entre 0 y 365 dias');
  }

  if (!Number.isInteger(settings.max_login_attempts) || settings.max_login_attempts < 1 || settings.max_login_attempts > 10) {
    errors.push('Los intentos maximos deben estar entre 1 y 10');
  }

  if (!Number.isInteger(settings.lockout_duration) || settings.lockout_duration < 5 || settings.lockout_duration > 1440) {
    errors.push('La duracion de bloqueo debe estar entre 5 y 1440 minutos');
  }

  return errors;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
      permissions: ['settings:view', 'settings:update'],
    });
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const adminClient = await createAdminClient();
    const organizationId = await resolveOrganizationId(
      request,
      adminClient,
      auth.userId!,
      null,
      auth.userRole === 'SUPER_ADMIN'
    );

    let meta: Record<string, unknown> = {};
    if (auth.userId !== 'mock-user') {
      const supabase = await createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      meta = isRecord(session.user.user_metadata) ? session.user.user_metadata : {};
    }

    const organizationSettings = organizationId
      ? await loadOrganizationSecuritySettings(adminClient, organizationId)
      : {};
    const securitySettings: SecuritySettings = {
      ...getDefaultSecuritySettings(),
      ...organizationSettings,
      two_factor_enabled: Boolean(
        meta.two_factor_enabled ||
        organizationSettings.two_factor_enabled
      ),
    };

    return NextResponse.json({ success: true, data: securitySettings });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
      permissions: ['settings:update'],
    });
    if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

    const adminClient = await createAdminClient();
    const organizationId = await resolveOrganizationId(
      request,
      adminClient,
      auth.userId!,
      null,
      auth.userRole === 'SUPER_ADMIN'
    );

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Debes indicar una organizacion valida para actualizar seguridad' },
        { status: 400 }
      );
    }

    let meta: Record<string, unknown> = {};
    const supabase = await createClient();
    if (auth.userId !== 'mock-user') {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      meta = isRecord(session.user.user_metadata) ? session.user.user_metadata : {};
    }

    const body = await request.json();
    const input = isRecord(body) ? body as Partial<SecuritySettings> : {};
    const organizationSettings = await loadOrganizationSecuritySettings(adminClient, organizationId);
    const current: SecuritySettings = {
      ...getDefaultSecuritySettings(),
      ...organizationSettings,
      two_factor_enabled: Boolean(
        meta.two_factor_enabled ||
        organizationSettings.two_factor_enabled
      ),
    };

    const cleanSettings: SecuritySettings = {
      two_factor_enabled: current.two_factor_enabled,
      session_timeout: numberSetting(input.session_timeout, current.session_timeout),
      password_expiry_days: numberSetting(input.password_expiry_days, current.password_expiry_days),
      max_login_attempts: numberSetting(input.max_login_attempts, current.max_login_attempts),
      require_password_change: typeof input.require_password_change === 'boolean' ? input.require_password_change : current.require_password_change,
      enable_login_notifications: typeof input.enable_login_notifications === 'boolean' ? input.enable_login_notifications : current.enable_login_notifications,
      allowed_ip_addresses: Array.isArray(input.allowed_ip_addresses) ? input.allowed_ip_addresses.map(String) : current.allowed_ip_addresses,
      require_strong_passwords: typeof input.require_strong_passwords === 'boolean' ? input.require_strong_passwords : current.require_strong_passwords,
      lockout_duration: numberSetting(input.lockout_duration, current.lockout_duration),
    };

    const validationErrors = validateSecuritySettings(cleanSettings);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Datos invalidos', details: validationErrors }, { status: 400 });
    }

    await persistOrganizationSecuritySettings(adminClient, organizationId, cleanSettings);

    return NextResponse.json({ success: true, data: cleanSettings, message: 'Configuracion de seguridad actualizada correctamente' });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
