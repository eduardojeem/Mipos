import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type OrganizationsRow = {
  id: string
  name: string
  slug: string
  subscription_plan: string
  subscription_status: string
  settings: Record<string, unknown> | null
}

type OrganizationsInsert = Omit<OrganizationsRow, 'id'>
type OrganizationsUpdate = Partial<OrganizationsRow>

type RolesRow = { id: string; name: string }
type RolesInsert = Omit<RolesRow, 'id'>
type RolesUpdate = Partial<RolesRow>

type OrganizationMembersRow = {
  id: string
  organization_id: string
  user_id: string
  role_id: string
  is_owner: boolean
}
type OrganizationMembersInsert = Omit<OrganizationMembersRow, 'id'>
type OrganizationMembersUpdate = Partial<OrganizationMembersRow>

type ScriptDatabase = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationsRow
        Insert: OrganizationsInsert
        Update: OrganizationsUpdate
      }
      roles: {
        Row: RolesRow
        Insert: RolesInsert
        Update: RolesUpdate
      }
      organization_members: {
        Row: OrganizationMembersRow
        Insert: OrganizationMembersInsert
        Update: OrganizationMembersUpdate
      }
    }
    Views: unknown
    Functions: unknown
    Enums: unknown
    CompositeTypes: unknown
  }
}

async function insertOrganization(
  client: SupabaseClient<ScriptDatabase>,
  values: OrganizationsInsert
) {
  return (client as unknown as { from: (t: string) => { insert: (v: unknown) => { select: (cols?: string) => { single: () => Promise<{ data: OrganizationsRow | null; error: { code?: string; message: string; details?: string } | null }> } } } })
    .from('organizations')
    .insert(values)
    .select('id, name, slug, subscription_plan, subscription_status, settings')
    .single();
}

async function insertOrganizationMember(
  client: SupabaseClient<ScriptDatabase>,
  values: OrganizationMembersInsert
) {
  return (client as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<{ error: { code?: string; message: string; details?: string } | null }> } })
    .from('organization_members')
    .insert(values);
}

function getEnv(name: string): string {
  const val = process.env[name];
  if (!val || val.startsWith('your-') || val.startsWith('sk-xxx')) {
    throw new Error(`Missing or invalid env: ${name}`);
  }
  return val;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function ensureUniqueSlug(supabase: SupabaseClient<ScriptDatabase>, base: string): Promise<string> {
  let slug = base;
  let counter = 1;
  while (true) {
    const { data } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function findUserByEmail(admin: SupabaseClient<ScriptDatabase>, email: string) {
  try {
    const { data } = await (admin as any).auth.admin.listUsers();
    const user = (data?.users || []).find((u: any) => String(u.email).toLowerCase() === email.toLowerCase());
    return user || null;
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs();
  const email = args.email || args.user || '';
  const orgNameArg = args.name || '';
  const phone = args.phone || '';
  const adminNameArg = args.adminName || '';
  if (!email) {
    console.error('Usage: tsx scripts/create-organization-and-invite.ts --email=someone@example.com [--name="Org Name"]');
    process.exit(1);
  }

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<ScriptDatabase> = createClient<ScriptDatabase>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const prefix = email.split('@')[0];
  const orgName = orgNameArg || `Org ${prefix}`;
  const adminName = adminNameArg || prefix;
  const baseSlug = toSlug(prefix);
  const slug = await ensureUniqueSlug(supabase, baseSlug);

  const organizationSettings = {
    contactInfo: { email, phone, website: '' },
    address: { street: '', city: '', state: '', country: '', postalCode: '' },
    limits: { maxUsers: 10 },
    features: {},
    trial: null,
  };

  const { data: organization, error: orgError } = await insertOrganization(supabase, {
    name: orgName,
    slug,
    subscription_plan: 'FREE',
    subscription_status: 'ACTIVE',
    settings: organizationSettings,
  });

  if (orgError) {
    console.error('Failed to create organization:', { code: orgError.code, message: orgError.message, details: orgError.details });
    process.exit(1);
  }
  if (!organization) {
    console.error('Failed to create organization: no data returned');
    process.exit(1);
  }

  let invitedUserId: string | null = null;
  try {
    const { data: adminUser, error: inviteError } = await (supabase as any).auth.admin.inviteUserByEmail(email, {
      data: { full_name: adminName, phone, organization_id: organization.id, role: 'ADMIN' },
    });
    if (inviteError) {
      // If user already exists or invite failed, try to locate user
      const existing = await findUserByEmail(supabase, email);
      invitedUserId = existing?.id || null;
    } else {
      invitedUserId = adminUser?.user?.id || null;
    }
  } catch (e: any) {
    const existing = await findUserByEmail(supabase, email);
    invitedUserId = existing?.id || null;
  }

  if (invitedUserId) {
    const { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'ADMIN').single();
    const adminRoleId = (adminRole as { id?: string } | null)?.id;
    if (adminRoleId) {
      await insertOrganizationMember(supabase, {
        organization_id: organization.id,
        user_id: invitedUserId,
        role_id: adminRoleId,
        is_owner: true,
      });
    }
  }

  console.log(JSON.stringify({ success: true, organization }, null, 2));
}

main().catch((e) => {
  console.error('Unexpected error:', { message: e?.message });
  process.exit(1);
});
