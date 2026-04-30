import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../../types/supabase';
import { isSupabaseActive, isMockAuthEnabled } from '../env';
import { ACCESS_SECTIONS, canPlanAccessSection } from '@/lib/access-policy';

type UserMetadata = { role?: string };
type ProfileRole = { role?: string | null };

async function insertAuditLog(
  client: unknown,
  payload: { user_id: string | null; action: string; resource: string; details: Record<string, unknown> }
) {
  try {
    const c = client as { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } };
    await c.from('audit_logs').insert(payload);
  } catch {}
}

/**
 * Helper function to retrieve the user's highest role.
 * Checks metadata, then users table, then user_roles & roles tables.
 * Optimized: runs users table + user_roles in parallel when possible.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserRoles(supabase: any, user: any): Promise<{ primaryRole: string; hasAdminRole: boolean }> {
  const meta = (user?.user_metadata ?? {}) as UserMetadata;
  const metaRole = String(meta.role || '').toUpperCase();

  // Run both DB lookups in parallel instead of sequentially
  const [profileResult, rolesResult] = await Promise.allSettled([
    supabase.from('users').select('role').eq('id', user.id).single(),
    supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id).eq('is_active', true),
  ]);

  // Extract profile role
  const profileRole = profileResult.status === 'fulfilled'
    ? String(((profileResult.value as { data?: ProfileRole | null })?.data ?? {})?.role || '').toUpperCase()
    : '';

  // Extract RBAC role names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rbacNames: string[] = rolesResult.status === 'fulfilled'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (Array.isArray((rolesResult.value as any)?.data) ? (rolesResult.value as any).data : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => String(r?.role?.name || '').toUpperCase())
        .filter(Boolean)
    : [];

  // Determine primary role: DB profile > RBAC > metadata
  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OWNER'];
  const KNOWN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER'];

  let primaryRole = profileRole || metaRole;
  let hasAdminRole = ADMIN_ROLES.includes(primaryRole);

  if (!hasAdminRole && rbacNames.length > 0) {
    const adminRbac = rbacNames.find((n: string) => ADMIN_ROLES.includes(n));
    if (adminRbac) {
      primaryRole = adminRbac;
      hasAdminRole = true;
    } else {
      const knownRbac = rbacNames.find((n: string) => KNOWN_ROLES.includes(n));
      if (knownRbac && !primaryRole) {
        primaryRole = knownRbac;
      }
    }
  }

  return { primaryRole, hasAdminRole };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserOrganizationPlan(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization:organizations(subscription_plan)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (membership as any)?.organization?.subscription_plan || null;
  } catch {
    return null;
  }
}

function buildSignInRedirectUrl(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  const returnUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = '/auth/signin';
  if (returnUrl && returnUrl !== '/auth/signin') {
    url.searchParams.set('returnUrl', returnUrl);
  }
  return url;
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabaseEnv = isSupabaseActive();
  const isMockAuth = isMockAuthEnabled();

  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabaseEnv) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publicPaths = ['/home', '/inicio', '/empresas', '/onboarding', '/offers', '/catalog', '/orders/track', '/'];
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + '/'));

  // --- Unauthenticated user checks ---
  if (!user) {
    if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
      return NextResponse.redirect(buildSignInRedirectUrl(request));
    }
    if (!isPublic && !path.startsWith('/auth') && !path.startsWith('/api')) {
      if (isMockAuth) return supabaseResponse;
      return NextResponse.redirect(buildSignInRedirectUrl(request));
    }
    // API admin/reports without auth
    if (path.startsWith('/api/admin') && !isMockAuth) {
      await insertAuditLog(supabase, {
        user_id: null, action: 'access_denied', resource: 'admin_api',
        details: { path, role: null, method: request.method },
      });
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (path.startsWith('/api/reports') && !isMockAuth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return supabaseResponse;
  }

  // --- Authenticated user: determine role ONCE ---
  const needsRoleCheck =
    path.startsWith('/admin') ||
    path.startsWith('/api/admin') ||
    path.startsWith('/dashboard') ||
    path.startsWith('/api/reports');

  if (!needsRoleCheck || isMockAuth) {
    return supabaseResponse;
  }

  // Single role lookup for the entire middleware
  const { primaryRole, hasAdminRole } = await getUserRoles(supabase, user);

  // --- /admin pages ---
  if (path.startsWith('/admin')) {
    if (!hasAdminRole) {
      await insertAuditLog(supabase, {
        user_id: user.id, action: 'access_denied', resource: 'admin_page',
        details: { path, role: primaryRole || null, method: request.method },
      });
      const url = request.nextUrl.clone();
      url.pathname = '/403';
      return NextResponse.redirect(url);
    }
    // ADMIN (not SUPER_ADMIN/OWNER) needs plan check
    if (primaryRole === 'ADMIN') {
      const plan = await getUserOrganizationPlan(supabase, user.id);
      if (!canPlanAccessSection(plan || undefined, ACCESS_SECTIONS.ADMIN_PANEL)) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
    return supabaseResponse;
  }

  // --- /api/admin endpoints ---
  if (path.startsWith('/api/admin')) {
    if (!hasAdminRole) {
      await insertAuditLog(supabase, {
        user_id: user.id, action: 'access_denied', resource: 'admin_api',
        details: { path, role: primaryRole, method: request.method },
      });
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    if (primaryRole === 'ADMIN') {
      const plan = await getUserOrganizationPlan(supabase, user.id);
      if (!canPlanAccessSection(plan || undefined, ACCESS_SECTIONS.ADMIN_PANEL)) {
        return NextResponse.json({ error: 'Tu plan no incluye acceso a administracion' }, { status: 403 });
      }
    }
    return supabaseResponse;
  }

  // --- /dashboard/reports ---
  if (path.startsWith('/dashboard/reports')) {
    const allowedRoles = ['ADMIN', 'MANAGER', 'SUPER_ADMIN', 'OWNER'];
    if (!allowedRoles.includes(primaryRole)) {
      const url = request.nextUrl.clone();
      url.pathname = '/403';
      url.searchParams.set('reason', 'reports.view');
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // --- /dashboard (non-reports) ---
  if (path.startsWith('/dashboard')) {
    const allowedRoles = ['ADMIN', 'MANAGER', 'CASHIER', 'SUPER_ADMIN', 'OWNER'];
    if (!allowedRoles.includes(primaryRole)) {
      const url = request.nextUrl.clone();
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // --- /api/reports ---
  if (path.startsWith('/api/reports')) {
    const allowedRoles = ['ADMIN', 'MANAGER', 'SUPER_ADMIN', 'OWNER'];
    if (!allowedRoles.includes(primaryRole)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}
