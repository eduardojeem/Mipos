import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSession } from '@/lib/supabase/middleware';
import {
  DOMAIN_CONTEXT_HEADER,
  ORIGINAL_HOST_HEADER,
  PATH_TENANT_HEADER,
  TENANT_KEY_HEADER,
  TENANT_SOURCE_HEADER,
  detectTenantCandidate,
  getRequestHostValue,
  type DomainContextKind,
  type TenantSource,
} from '@/lib/domain/host-context';
import { isValidTenantPathSegment } from '@/lib/domain/tenant-public-paths';

type MiddlewareOrganization = {
  id: string;
  name: string;
  slug: string | null;
  subdomain?: string | null;
  custom_domain?: string | null;
};

type TenantContext =
  | {
      kind: 'root';
    }
  | {
      kind: 'tenant';
      source: TenantSource;
      tenantKey: string;
      organization: MiddlewareOrganization;
    }
  | {
      kind: 'tenant-unresolved';
      source: TenantSource;
      tenantKey: string;
    };

const PUBLIC_ORGANIZATION_STATUSES = ['ACTIVE', 'TRIAL'];
const ORGANIZATION_SELECT = 'id,name,slug,subdomain,custom_domain';
const ORGANIZATION_SELECT_FALLBACK = 'id,name,slug';
const PUBLIC_PATHS = ['/home', '/inicio', '/onboarding', '/offers', '/catalog', '/orders/track', '/'];
const PUBLIC_API_PATHS = [
  '/api/offers',
  '/api/catalog',
  '/api/orders/public/track',
  '/api/promotions/carousel/public',
  '/api/cart/validate',
  '/api/orders',
  '/api/cron/reconcile-subscriptions',
];

function isColumnMissingError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function copyCookies(source: NextResponse, target: NextResponse) {
  const setCookies = source.headers.getSetCookie?.() || [];

  setCookies.forEach((cookie) => {
    target.headers.append('set-cookie', cookie);
  });
}

function clearOrganizationCookies(response: NextResponse) {
  response.cookies.delete('x-organization-id');
  response.cookies.delete('x-organization-name');
  response.cookies.delete('x-organization-slug');
  response.cookies.delete('x-organization-subdomain');
  response.cookies.delete('x-organization-custom-domain');
}

function setOrganizationCookies(
  response: NextResponse,
  organization: MiddlewareOrganization
) {
  const cookieOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  response.cookies.set('x-organization-id', organization.id, cookieOptions);
  response.cookies.set('x-organization-name', organization.name, cookieOptions);
  response.cookies.set('x-organization-slug', organization.slug || '', cookieOptions);
  response.cookies.set('x-organization-subdomain', organization.subdomain || '', cookieOptions);
  response.cookies.set('x-organization-custom-domain', organization.custom_domain || '', cookieOptions);
}

function applyRequestContextHeaders(
  requestHeaders: Headers,
  host: string,
  tenantContext: TenantContext,
  pathTenantSlug?: string
) {
  requestHeaders.set(ORIGINAL_HOST_HEADER, host);

  if (pathTenantSlug) {
    requestHeaders.set(PATH_TENANT_HEADER, pathTenantSlug);
  } else {
    requestHeaders.delete(PATH_TENANT_HEADER);
  }

  requestHeaders.delete('x-organization-id');
  requestHeaders.delete('x-organization-name');
  requestHeaders.delete('x-organization-slug');
  requestHeaders.delete('x-organization-subdomain');
  requestHeaders.delete('x-organization-custom-domain');
  requestHeaders.delete(TENANT_SOURCE_HEADER);
  requestHeaders.delete(TENANT_KEY_HEADER);

  const kind: DomainContextKind =
    tenantContext.kind === 'tenant'
      ? 'tenant'
      : tenantContext.kind === 'tenant-unresolved'
        ? 'tenant-unresolved'
        : 'root';

  requestHeaders.set(DOMAIN_CONTEXT_HEADER, kind);

  if (tenantContext.kind === 'tenant' || tenantContext.kind === 'tenant-unresolved') {
    requestHeaders.set(TENANT_SOURCE_HEADER, tenantContext.source);
    requestHeaders.set(TENANT_KEY_HEADER, tenantContext.tenantKey);
  }

  if (tenantContext.kind === 'tenant') {
    requestHeaders.set('x-organization-id', tenantContext.organization.id);
    requestHeaders.set('x-organization-name', tenantContext.organization.name);
    requestHeaders.set('x-organization-slug', tenantContext.organization.slug || '');
    requestHeaders.set('x-organization-subdomain', tenantContext.organization.subdomain || '');
    requestHeaders.set(
      'x-organization-custom-domain',
      tenantContext.organization.custom_domain || ''
    );
  }
}

function applyResponseContextCookies(response: NextResponse, tenantContext: TenantContext) {
  clearOrganizationCookies(response);

  if (tenantContext.kind === 'tenant') {
    setOrganizationCookies(response, tenantContext.organization);
  }
}

function applyDevelopmentDebugHeaders(
  response: NextResponse,
  tenantContext: TenantContext,
  pathTenantSlug: string | undefined,
  rewritePath: string | null
) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  response.headers.set('x-mipos-debug-path-tenant', pathTenantSlug || '');
  response.headers.set('x-mipos-debug-rewrite-path', rewritePath || '');
  response.headers.set('x-mipos-debug-context', tenantContext.kind);

  if (tenantContext.kind === 'tenant' || tenantContext.kind === 'tenant-unresolved') {
    response.headers.set('x-mipos-debug-tenant-key', tenantContext.tenantKey);
    response.headers.set('x-mipos-debug-source', tenantContext.source);
  } else {
    response.headers.delete('x-mipos-debug-tenant-key');
    response.headers.delete('x-mipos-debug-source');
  }
}

async function findOrganizationByField(
  supabase: ReturnType<typeof createClient> | { from: (table: string) => any },
  field: 'slug' | 'subdomain' | 'custom_domain',
  value: string
): Promise<MiddlewareOrganization | null> {
  const runQuery = async (selectClause: string) =>
    supabase
      .from('organizations')
      .select(selectClause)
      .eq(field, value)
      .in('subscription_status', PUBLIC_ORGANIZATION_STATUSES)
      .maybeSingle();

  try {
    const { data, error } = await runQuery(ORGANIZATION_SELECT);

    if (error) {
      if (isColumnMissingError(error)) {
        if (field !== 'slug') {
          return null;
        }

        const fallback = await runQuery(ORGANIZATION_SELECT_FALLBACK);
        if (fallback.error) {
          if (isColumnMissingError(fallback.error)) {
            return null;
          }

          throw fallback.error;
        }

        return (fallback.data as MiddlewareOrganization | null) || null;
      }

      throw error;
    }

    return (data as MiddlewareOrganization | null) || null;
  } catch (error) {
    if (isColumnMissingError(error)) {
      return null;
    }

    throw error;
  }
}

async function resolveTenantContext(
  host: string,
  pathTenantSlug?: string
): Promise<TenantContext> {
  const candidate = detectTenantCandidate(host, pathTenantSlug);

  if (candidate.kind === 'root' || !candidate.source || !candidate.tenantKey) {
    return { kind: 'root' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      kind: 'tenant-unresolved',
      source: candidate.source,
      tenantKey: candidate.tenantKey,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let organization: MiddlewareOrganization | null = null;

  if (candidate.source === 'path') {
    organization = await findOrganizationByField(supabase, 'slug', candidate.tenantKey);
  } else if (candidate.source === 'subdomain') {
    organization = await findOrganizationByField(supabase, 'subdomain', candidate.tenantKey);
    if (!organization) {
      organization = await findOrganizationByField(supabase, 'slug', candidate.tenantKey);
    }
  } else {
    organization = await findOrganizationByField(supabase, 'custom_domain', candidate.hostname);
    if (!organization && candidate.hostname.startsWith('www.')) {
      organization = await findOrganizationByField(
        supabase,
        'custom_domain',
        candidate.hostname.slice(4)
      );
    }
  }

  if (!organization) {
    return {
      kind: 'tenant-unresolved',
      source: candidate.source,
      tenantKey: candidate.tenantKey,
    };
  }

  return {
    kind: 'tenant',
    source: candidate.source,
    tenantKey: candidate.tenantKey,
    organization,
  };
}

function isRedirectResponse(response: NextResponse): boolean {
  return response.status >= 300 && response.status < 400;
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`));
}

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  if (url.pathname === '/admin/settings') {
    return NextResponse.redirect(new URL('/dashboard/settings', request.url));
  }

  const host = getRequestHostValue({
    nextUrl: request.nextUrl,
    forwardedHost: request.headers.get('x-forwarded-host'),
    host: request.headers.get('host'),
  });
  const segments = url.pathname.split('/').filter(Boolean);
  const pathTenantSlug = isValidTenantPathSegment(segments[0]) ? segments[0] : undefined;
  const tenantContext = await resolveTenantContext(host, pathTenantSlug);
  const rewriteUrl = pathTenantSlug
    ? new URL(`/${segments.slice(1).join('/') || 'home'}`, request.url)
    : null;
  const effectivePath = rewriteUrl?.pathname || url.pathname;

  const requestHeaders = new Headers(request.headers);
  applyRequestContextHeaders(requestHeaders, host, tenantContext, pathTenantSlug);

  const sessionResponse = await updateSession(request);
  applyResponseContextCookies(sessionResponse, tenantContext);

  const shouldBypassLegacyPublicRedirect =
    isRedirectResponse(sessionResponse) &&
    pathTenantSlug &&
    (isPublicPath(effectivePath) || isPublicApiPath(effectivePath)) &&
    sessionResponse.headers.get('location')?.includes('/auth/signin');

  if (isRedirectResponse(sessionResponse) && !shouldBypassLegacyPublicRedirect) {
    return sessionResponse;
  }

  const response = rewriteUrl
    ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });

  copyCookies(sessionResponse, response);
  applyResponseContextCookies(response, tenantContext);
  applyDevelopmentDebugHeaders(response, tenantContext, pathTenantSlug, rewriteUrl?.pathname || null);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|_next/webpack-hmr|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
