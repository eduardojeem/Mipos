import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

function uuidv4(): string {
  return crypto.randomUUID();
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  vertical: string;
  planSlug?: string;
  billingCycle?: string;
}

export interface SignupValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SignupResult {
  success: boolean;
  userId?: string;
  organizationId?: string;
  linkedExistingUser?: boolean;
  errors?: SignupValidationError[];
  message?: string;
}

const VALID_PLANS = new Set(['free', 'starter', 'professional', 'enterprise']);
const VALID_VERTICALS = new Set(['RETAIL', 'BARBERSHOP']);

export function validateSignupInput(input: SignupInput): SignupValidationError[] {
  const errors: SignupValidationError[] = [];

  // Email validation
  if (!input.email?.trim()) {
    errors.push({ field: 'email', message: 'Email es requerido', code: 'MISSING_EMAIL' });
  } else if (input.email.length > 255) {
    errors.push({ field: 'email', message: 'Email muy largo (máx 255 caracteres)', code: 'EMAIL_TOO_LONG' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email)) {
    errors.push({ field: 'email', message: 'Email inválido', code: 'INVALID_EMAIL_FORMAT' });
  }

  // Password validation
  if (!input.password) {
    errors.push({ field: 'password', message: 'Contraseña es requerida', code: 'MISSING_PASSWORD' });
  } else if (input.password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Contraseña debe tener al menos 8 caracteres',
      code: 'PASSWORD_TOO_SHORT',
    });
  } else if (!/[A-Za-z]/.test(input.password)) {
    errors.push({
      field: 'password',
      message: 'Contraseña debe incluir letras',
      code: 'PASSWORD_MISSING_LETTERS',
    });
  } else if (!/[\d\W_]/.test(input.password)) {
    errors.push({
      field: 'password',
      message: 'Contraseña debe incluir números o símbolos',
      code: 'PASSWORD_MISSING_NUMBERS_OR_SYMBOLS',
    });
  }

  // Name validation
  if (!input.name?.trim()) {
    errors.push({ field: 'name', message: 'Nombre es requerido', code: 'MISSING_NAME' });
  } else if (input.name.length > 100) {
    errors.push({ field: 'name', message: 'Nombre muy largo (máx 100 caracteres)', code: 'NAME_TOO_LONG' });
  }

  // Organization name validation
  if (!input.organizationName?.trim()) {
    errors.push({ field: 'organizationName', message: 'Nombre de empresa es requerido', code: 'MISSING_ORG_NAME' });
  } else if (input.organizationName.length > 200) {
    errors.push({
      field: 'organizationName',
      message: 'Nombre de empresa muy largo (máx 200 caracteres)',
      code: 'ORG_NAME_TOO_LONG',
    });
  }

  // Vertical validation
  if (!input.vertical || !VALID_VERTICALS.has(input.vertical)) {
    errors.push({
      field: 'vertical',
      message: `Vertical inválido. Debe ser: ${Array.from(VALID_VERTICALS).join(', ')}`,
      code: 'INVALID_VERTICAL',
    });
  }

  // Plan validation
  if (input.planSlug && !VALID_PLANS.has(input.planSlug.toLowerCase())) {
    errors.push({
      field: 'planSlug',
      message: `Plan inválido. Debe ser: ${Array.from(VALID_PLANS).join(', ')}`,
      code: 'INVALID_PLAN',
    });
  }

  return errors;
}

export function generateOrgSlug(organizationName: string): string {
  const baseSlug = organizationName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Use UUID instead of timestamp for better security
  const uniqueId = uuidv4().substring(0, 8);
  return `${baseSlug || 'org'}-${uniqueId}`;
}

export async function createOrganizationWithMembership(
  client: SupabaseClient,
  adminClient: SupabaseClient | null,
  userId: string,
  organizationName: string,
  vertical: string,
  planSlug: string,
  billingCycle: string
) {
  const slug = generateOrgSlug(organizationName);
  const writeClient = adminClient || client;

  // Create organization in a single insert
  const { data: orgData, error: orgError } = await writeClient
    .from('organizations')
    .insert({
      id: uuidv4(),
      name: organizationName,
      slug,
      subscription_plan: 'FREE',
      subscription_status: 'ACTIVE',
      vertical,
      owner_id: userId, // Direct ownership reference
      settings: {
        requestedPlan: planSlug,
        requestedBillingCycle: billingCycle,
        requiresBilling: planSlug !== 'free',
        onboardingCompleted: false,
        signupCompletedAt: new Date().toISOString(),
        emailVerified: false, // Mark as pending verification
      },
    })
    .select()
    .single();

  if (orgError) {
    throw new Error(`Organization creation failed: ${orgError.message}`);
  }

  // Add user as organization member (with retry for trigger race)
  let memberError = null;
  const { error: insertError } = await writeClient
    .from('organization_members')
    .insert({
      organization_id: orgData.id,
      user_id: userId,
      is_owner: true,
    });

  if (insertError) {
    // Try upsert if insert fails (trigger may have already created it)
    const { error: upsertError } = await writeClient
      .from('organization_members')
      .upsert(
        {
          organization_id: orgData.id,
          user_id: userId,
          is_owner: true,
        },
        { onConflict: 'organization_id,user_id' }
      );

    if (upsertError) {
      memberError = upsertError;
    }
  }

  if (memberError) {
    throw new Error(`Failed to add user as organization member: ${memberError.message}`);
  }

  return orgData;
}

export async function assignOwnerRole(
  client: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<void> {
  const { data: ownerRole } = await client
    .from('roles')
    .select('id')
    .eq('name', 'OWNER')
    .maybeSingle();

  const roleId = ownerRole?.id;
  if (!roleId) {
    console.warn('[signup-service] OWNER role not found');
    return;
  }

  // Update organization_members role
  const { error: memberError } = await client
    .from('organization_members')
    .update({ role_id: roleId })
    .eq('organization_id', organizationId)
    .eq('user_id', userId);

  if (memberError) {
    console.warn('[signup-service] Failed to set organization_members role:', memberError);
  }

  // Assign user_roles
  const baseRoleAssignment = {
    user_id: userId,
    role_id: roleId,
    organization_id: organizationId,
    is_active: true,
  };

  const { error: scopedRoleError } = await client
    .from('user_roles')
    .upsert(baseRoleAssignment, { onConflict: 'user_id,role_id,organization_id' });

  if (scopedRoleError) {
    const { error: legacyRoleError } = await client
      .from('user_roles')
      .upsert(baseRoleAssignment, { onConflict: 'user_id,role_id' });

    if (legacyRoleError) {
      console.warn('[signup-service] Failed to assign owner user_role:', legacyRoleError);
    }
  }
}

export async function updateUserRecord(
  client: SupabaseClient,
  userId: string,
  email: string,
  name: string,
  organizationId: string
): Promise<void> {
  const { error: updateError } = await client
    .from('users')
    .update({
      organization_id: organizationId,
      role: 'OWNER',
    })
    .eq('id', userId);

  if (updateError) {
    // Fallback: upsert if user doesn't exist
    const { error: upsertError } = await client
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          full_name: name,
          role: 'OWNER',
          organization_id: organizationId,
        },
        { onConflict: 'id' }
      );

    if (upsertError) {
      console.warn('[signup-service] Failed to upsert user record:', upsertError);
    }
  }
}

export async function checkEmailExists(client: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await client.from('users').select('id').eq('email', email).maybeSingle();

  if (error) {
    console.warn('[signup-service] Error checking email existence:', error);
    return false;
  }

  return !!data;
}
