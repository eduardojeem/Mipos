import { createClient } from '@supabase/supabase-js'

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

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  try {
    const { data } = await (admin as any).auth.admin.listUsers();
    const user = (data?.users || []).find((u: any) => String(u.email).toLowerCase() === email.toLowerCase());
    return user || null;
  } catch {
    return null;
  }
}

async function ensureUser(admin: ReturnType<typeof createClient>, email: string) {
  const existing = await findUserByEmail(admin, email);
  if (existing?.id) return existing.id as string;
  const { data: invite, error } = await (admin as any).auth.admin.inviteUserByEmail(email);
  if (error) throw error;
  return (invite as any)?.user?.id as string;
}

async function main() {
  const args = parseArgs();
  const email = (args.email || '').trim();
  const orgId = (args.org || args.organization || '').trim();
  const roleName = (args.role || 'ADMIN').toUpperCase();
  if (!email || !orgId) {
    console.error('Usage: tsx scripts/add-user-to-org.ts --email=user@example.com --org=<organization_id> [--role=ADMIN|VIEWER]');
    process.exit(1);
  }

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const userId = await ensureUser(admin, email);

  await (admin as any).auth.admin.updateUserById(userId, { user_metadata: { role: roleName } });

  const fullName = email.split('@')[0];
  await admin.from('users').upsert({ id: userId, email, full_name: fullName, role: roleName }, { onConflict: 'id' });

  const { data: role } = await admin.from('roles').select('id').eq('name', roleName).single();
  const roleId = role?.id;

  const { error: memberErr } = await admin
    .from('organization_members')
    .insert({ organization_id: orgId, user_id: userId, role_id: roleId, is_owner: roleName === 'ADMIN' });
  if (memberErr && String(memberErr.message || '').includes('duplicate')) {
    // already a member; ignore
  } else if (memberErr) {
    throw memberErr;
  }

  console.log(JSON.stringify({ ok: true, orgId, userId, email, role: roleName }, null, 2));
}

main().catch((e) => {
  console.error('Unexpected error:', { message: e?.message });
  process.exit(1);
});

