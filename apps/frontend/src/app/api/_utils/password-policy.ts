type SupabaseAdminLike = {
  from: (table: string) => any;
};

export type PasswordPolicy = {
  requireStrongPasswords: boolean;
};

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  requireStrongPasswords: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

async function getOrganizationIdForUser(adminClient: SupabaseAdminLike, userId: string): Promise<string | null> {
  const { data: userRow } = await adminClient
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (typeof userRow?.organization_id === 'string' && userRow.organization_id) {
    return userRow.organization_id;
  }

  const { data: membership } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .order('is_owner', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return typeof membership?.organization_id === 'string' ? membership.organization_id : null;
}

export async function getPasswordPolicyForUser(
  adminClient: SupabaseAdminLike,
  userId: string
): Promise<PasswordPolicy> {
  const organizationId = await getOrganizationIdForUser(adminClient, userId);
  return getPasswordPolicyForOrganization(adminClient, organizationId);
}

export async function getPasswordPolicyForOrganization(
  adminClient: SupabaseAdminLike,
  organizationId: string | null
): Promise<PasswordPolicy> {
  if (!organizationId) return DEFAULT_PASSWORD_POLICY;

  const { data: securityRow } = await adminClient
    .from('settings')
    .select('value')
    .eq('organization_id', organizationId)
    .eq('key', 'security_settings')
    .maybeSingle();

  const securityValue = securityRow?.value;
  if (isRecord(securityValue)) {
    return {
      requireStrongPasswords: booleanSetting(
        securityValue.require_strong_passwords,
        DEFAULT_PASSWORD_POLICY.requireStrongPasswords
      ),
    };
  }

  const { data: businessConfigRow } = await adminClient
    .from('settings')
    .select('value')
    .eq('organization_id', organizationId)
    .eq('key', 'business_config')
    .maybeSingle();

  const businessConfig = businessConfigRow?.value;
  const systemSettings = isRecord(businessConfig) && isRecord(businessConfig.systemSettings)
    ? businessConfig.systemSettings
    : {};
  const security = isRecord(systemSettings.security) ? systemSettings.security : {};

  return {
    requireStrongPasswords: booleanSetting(
      security.requireStrongPasswords,
      DEFAULT_PASSWORD_POLICY.requireStrongPasswords
    ),
  };
}

export function validatePasswordAgainstPolicy(password: string, policy: PasswordPolicy): string | null {
  if (password.length < 8) {
    return 'La nueva contrasena debe tener al menos 8 caracteres';
  }

  if (!policy.requireStrongPasswords) {
    return null;
  }

  const checks = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  if (checks.filter(Boolean).length < 3) {
    return 'La nueva contrasena debe combinar al menos 3 tipos: minusculas, mayusculas, numeros o simbolos';
  }

  return null;
}
