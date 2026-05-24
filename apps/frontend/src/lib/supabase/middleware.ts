import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../../types/supabase';
import { isSupabaseActive, isMockAuthEnabled } from '../env';
import { ACCESS_SECTIONS, canPlanAccessSection } from '@/lib/access-policy';
import { canAccessAdmin, canAccessDashboard, canAccessReports, normalizeRole, pickHighestRole, type AppRole } from '@/lib/roles';

type ProfileRole = { role?: string | null };
type MembershipRole = {
  organization_id?: string | null;
  role_id?: string | null;
  is_owner?: boolean | null;
  role?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

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
 * Checks the users table and user_roles RBAC join.
 *
 * Per-instance cache to avoid hitting Supabase on every dashboard navigation
 * — middleware runs on each request and these queries were the dominant
 * latency source for /dashboard/* navs (400-600ms cold per page change).
 *
 * Cache is keyed by user id, lives 30s, and only stores the small role
 * payload. Roles change rarely; if a SUPER_ADMIN demotes a user, worst-case
 * the user retains ADMIN access for ≤30s on the same Edge instance. The
 * trade-off is acceptable for the latency win.
 */
type RoleCacheEntry = { value: { primaryRole: AppRole; hasAdminRole: boolean }; expiresAt: number };
const ROLE_CACHE_TTL_MS = 30 * 1000;
const ROLE_CACHE_MAX_ENTRIES = 512;
const userRoleCache = new Map<string, RoleCacheEntry>();

function getCachedRoles(cacheKey: string): RoleCacheEntry['value'] | null {
  const entry = userRoleCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    userRoleCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCachedRoles(cacheKey: string, value: RoleCacheEntry['value']) {
  if (userRoleCache.size >= ROLE_CACHE_MAX_ENTRIES) {
    const oldest = userRoleCache.keys().next().value;
    if (oldest !== undefined) userRoleCache.delete(oldest);
  }
  userRoleCache.set(cacheKey, { value, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
}

function getRequestedOrganizationId(request: NextRequest): string | null {
  return (
    request.headers.get('x-organization-id')?.trim() ||
    request.cookies.get('x-organization-id')?.value?.trim() ||
    null
  );
}

function getJoinedRoleName(role: MembershipRole['role']): string {
  const value = Array.isArray(role) ? role[0] : role;
  return typeof value?.name === 'string' ? value.name : '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserRoles(supabase: any, user: any, request: NextRequest): Promise<{ primaryRole: AppRole; hasAdminRole: boolean }> {
  const requestedOrgId = getRequestedOrganizationId(request);
  const cacheKey = `${user.id}:${requestedOrgId || 'default'}`;
  const cached = getCachedRoles(cacheKey);
  if (cached) return cached;
  // SECURITY: NEVER read role from user_metadata. Users can self-assign that
  // field via supabase.auth.updateUser and bypass the admin gate. Trusted
  // sources are the users table, the user_roles RBAC join, and app_metadata
  // because Supabase app_metadata is server-managed.
  let membershipBaseQuery = supabase
    .from('organization_members')
    .select('organization_id, role_id, is_owner')
    .eq('user_id', user.id);

  let membershipRoleQuery = supabase
    .from('organization_members')
    .select('organization_id, role_id, is_owner, role:roles(name)')
    .eq('user_id', user.id);

  if (requestedOrgId) {
    membershipBaseQuery = membershipBaseQuery.eq('organization_id', requestedOrgId);
    membershipRoleQuery = membershipRoleQuery.eq('organization_id', requestedOrgId);
  }

  const [profileResult, rolesResult, membershipsBaseResult, membershipsRoleResult] = await Promise.allSettled([
    supabase.from('users').select('role').eq('id', user.id).single(),
    supabase.from('user_roles').select('role:roles(name)').eq('user_id', user.id).eq('is_active', true),
    membershipBaseQuery,
    membershipRoleQuery,
  ]);

  const appRole = normalizeRole(
    typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : null
  );

  const profileRole = profileResult.status === 'fulfilled'
    ? normalizeRole(((profileResult.value as { data?: ProfileRole | null })?.data ?? {})?.role)
    : 'USER';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rbacNames: AppRole[] = rolesResult.status === 'fulfilled'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (Array.isArray((rolesResult.value as any)?.data) ? (rolesResult.value as any).data : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => normalizeRole(r?.role?.name))
        .filter((r: AppRole) => r !== 'USER')
    : [];

  const membershipBaseRows: MembershipRole[] = membershipsBaseResult.status === 'fulfilled'
    ? (Array.isArray((membershipsBaseResult.value as { data?: MembershipRole[] | null })?.data)
        ? ((membershipsBaseResult.value as { data?: MembershipRole[] | null }).data || [])
        : []
      )
    : [];

  const membershipRoleRows: MembershipRole[] = membershipsRoleResult.status === 'fulfilled'
    ? (Array.isArray((membershipsRoleResult.value as { data?: MembershipRole[] | null })?.data)
        ? ((membershipsRoleResult.value as { data?: MembershipRole[] | null }).data || [])
        : []
      )
    : [];

  const membershipRoles: AppRole[] = [
    ...membershipBaseRows
      .flatMap((membership) => [
        membership.is_owner === true ? 'OWNER' : null,
        membership.organization_id ? 'EMPLOYEE' : null,
      ]),
    ...membershipRoleRows
        .flatMap((membership) => [
          membership.is_owner === true ? 'OWNER' : null,
          normalizeRole(getJoinedRoleName(membership.role)),
        ]),
  ].filter((role): role is AppRole => !!role && role !== 'USER');

  const primaryRole = pickHighestRole(appRole, profileRole, ...rbacNames, ...membershipRoles);
  const hasAdminRole = canAccessAdmin(primaryRole);

  const result = { primaryRole, hasAdminRole };
  setCachedRoles(cacheKey, result);
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserOrganizationPlan(supabase: any, userId: string, request: NextRequest): Promise<string | null> {
  try {
    const requestedOrgId = getRequestedOrganizationId(request);
    let query = supabase
      .from('organization_members')
      .select('organization:organizations(subscription_plan)')
      .eq('user_id', userId);

    if (requestedOrgId) {
      query = query.eq('organization_id', requestedOrgId);
    }

    const { data: membership } = await query
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
  const publicPaths = ['/home', '/inicio', '/empresas', '/onboarding', '/offers', '/catalog', '/orders/track', '/account', '/'];
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
  const { primaryRole, hasAdminRole } = await getUserRoles(supabase, user, request);

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
    // Solo ADMIN puro (no OWNER ni SUPER_ADMIN) necesita verificación de plan
    if (primaryRole === 'ADMIN') {
      const plan = await getUserOrganizationPlan(supabase, user.id, request);
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
      const plan = await getUserOrganizationPlan(supabase, user.id, request);
      if (!canPlanAccessSection(plan || undefined, ACCESS_SECTIONS.ADMIN_PANEL)) {
        return NextResponse.json({ error: 'Tu plan no incluye acceso a administracion' }, { status: 403 });
      }
    }
    return supabaseResponse;
  }

  // --- /dashboard/reports ---
  if (path.startsWith('/dashboard/reports')) {
    if (!canAccessReports(primaryRole)) {
      const url = request.nextUrl.clone();
      url.pathname = '/403';
      url.searchParams.set('reason', 'reports.view');
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // --- /dashboard (non-reports) ---
  if (path.startsWith('/dashboard')) {
    if (!canAccessDashboard(primaryRole)) {
      const url = request.nextUrl.clone();
      url.pathname = '/home';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // --- /api/reports ---
  if (path.startsWith('/api/reports')) {
    if (!canAccessReports(primaryRole)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}
