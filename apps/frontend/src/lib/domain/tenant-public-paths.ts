const RESERVED_TENANT_PATH_SEGMENTS = new Set([
  'api',
  'admin',
  'dashboard',
  'auth',
  'superadmin',
  '_next',
  'home',
  'offers',
  'catalog',
  'orders',
  'inicio',
  'empresas',
  'onboarding',
  'signin',
  'signup',
  'signout',
  'forgot-password',
  'pos',
  'products',
  'customers',
  'sales',
  'reports',
  'settings',
  'profile',
  'help',
  'about',
  'contact',
  'terms',
  'privacy',
  'suspended',
  '404',
  '500',
]);

export function isValidTenantPathSegment(value: string | undefined | null): value is string {
  return Boolean(
    value &&
      !RESERVED_TENANT_PATH_SEGMENTS.has(value) &&
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)
  );
}

export function extractTenantPathSegment(pathname: string | null | undefined): string | null {
  const segment = String(pathname || '')
    .split('/')
    .filter(Boolean)[0];

  return isValidTenantPathSegment(segment) ? segment : null;
}

export function extractTenantPathPrefix(pathname: string | null | undefined): string {
  const segment = extractTenantPathSegment(pathname);
  return segment ? `/${segment}` : '';
}

function isExternalLikePath(value: string): boolean {
  return /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(value) || value.startsWith('#');
}

function splitPathSuffix(value: string): { path: string; suffix: string } {
  const index = value.search(/[?#]/);

  if (index === -1) {
    return { path: value, suffix: '' };
  }

  return {
    path: value.slice(0, index),
    suffix: value.slice(index),
  };
}

export function buildTenantAwarePath(
  target: string,
  tenantPathPrefix: string | null | undefined
): string {
  const rawTarget = String(target || '').trim();
  const prefix = String(tenantPathPrefix || '').trim().replace(/\/$/, '');

  if (!rawTarget) {
    return prefix || '/';
  }

  if (!prefix || isExternalLikePath(rawTarget)) {
    return rawTarget;
  }

  const { path, suffix } = splitPathSuffix(rawTarget);
  const normalizedPath = path
    ? path.startsWith('/')
      ? path
      : `/${path}`
    : '/';

  if (
    normalizedPath === prefix ||
    normalizedPath.startsWith(`${prefix}/`) ||
    normalizedPath.startsWith(`${prefix}?`) ||
    normalizedPath.startsWith(`${prefix}#`)
  ) {
    return `${normalizedPath}${suffix}`;
  }

  return normalizedPath === '/'
    ? `${prefix}${suffix}`
    : `${prefix}${normalizedPath}${suffix}`;
}
