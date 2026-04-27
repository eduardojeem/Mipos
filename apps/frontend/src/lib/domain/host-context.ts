export const DOMAIN_CONTEXT_HEADER = 'x-mipos-domain-context';
export const TENANT_SOURCE_HEADER = 'x-mipos-tenant-source';
export const TENANT_KEY_HEADER = 'x-mipos-tenant-key';
export const ORIGINAL_HOST_HEADER = 'x-mipos-request-host';
export const PATH_TENANT_HEADER = 'x-mipos-path-tenant';

export type DomainContextKind = 'root' | 'tenant' | 'tenant-unresolved';
export type TenantSource = 'path' | 'subdomain' | 'custom_domain';

export interface TenantCandidate {
  kind: 'root' | 'tenant';
  hostname: string;
  port: string | null;
  isLocalhost: boolean;
  source?: TenantSource;
  tenantKey?: string;
}

type NextUrlLike = {
  host?: string | null;
  hostname?: string | null;
  port?: string | null;
};

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api']);

function stripProtocol(value: string): string {
  if (!value) return '';

  try {
    if (value.includes('://')) {
      return new URL(value).host;
    }
  } catch {}

  return value;
}

export function extractPort(rawHost: string | null | undefined): string | null {
  const value = stripProtocol(String(rawHost || '').trim());
  if (!value) return null;

  if (value.startsWith('[')) {
    const closingIndex = value.indexOf(']');
    if (closingIndex >= 0) {
      const rest = value.slice(closingIndex + 1);
      return rest.startsWith(':') ? rest.slice(1) : null;
    }
  }

  const match = value.match(/:(\d+)$/);
  return match?.[1] || null;
}

export function normalizeHostname(rawHost: string | null | undefined): string {
  const value = stripProtocol(String(rawHost || '').trim()).replace(/\/.*$/, '');
  if (!value) return '';

  if (value.startsWith('[')) {
    const closingIndex = value.indexOf(']');
    if (closingIndex >= 0) {
      return value.slice(1, closingIndex).toLowerCase();
    }
  }

  return value.replace(/:\d+$/, '').replace(/\.$/, '').toLowerCase();
}

export function getConfiguredBaseDomain(): string {
  const configured =
    process.env.NEXT_PUBLIC_BASE_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    '';

  return normalizeHostname(configured);
}

export function isLocalDevelopmentHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost')
  );
}

export function detectTenantCandidate(
  rawHost: string | null | undefined,
  pathTenantSlug?: string | null
): TenantCandidate {
  const hostname = normalizeHostname(rawHost);
  const port = extractPort(rawHost);
  const isLocalhost = isLocalDevelopmentHost(hostname);

  if (pathTenantSlug) {
    return {
      kind: 'tenant',
      hostname,
      port,
      isLocalhost,
      source: 'path',
      tenantKey: pathTenantSlug.toLowerCase(),
    };
  }

  if (!hostname) {
    return {
      kind: 'root',
      hostname,
      port,
      isLocalhost,
    };
  }

  if (isLocalhost) {
    if (hostname.endsWith('.localhost')) {
      const candidate = hostname.slice(0, -'.localhost'.length);
      if (candidate && !RESERVED_SUBDOMAINS.has(candidate)) {
        return {
          kind: 'tenant',
          hostname,
          port,
          isLocalhost: true,
          source: 'subdomain',
          tenantKey: candidate,
        };
      }
    }

    return {
      kind: 'root',
      hostname,
      port,
      isLocalhost: true,
    };
  }

  const baseDomain = getConfiguredBaseDomain();
  if (baseDomain) {
    if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
      return {
        kind: 'root',
        hostname,
        port,
        isLocalhost: false,
      };
    }

    const suffix = `.${baseDomain}`;
    if (hostname.endsWith(suffix)) {
      const candidate = hostname.slice(0, -suffix.length);
      if (candidate && !RESERVED_SUBDOMAINS.has(candidate)) {
        return {
          kind: 'tenant',
          hostname,
          port,
          isLocalhost: false,
          source: 'subdomain',
          tenantKey: candidate,
        };
      }

      return {
        kind: 'root',
        hostname,
        port,
        isLocalhost: false,
      };
    }
  }

  return {
    kind: 'tenant',
    hostname,
    port,
    isLocalhost: false,
    source: 'custom_domain',
    tenantKey: hostname,
  };
}

export function getRequestHostValue(input: {
  nextUrl?: NextUrlLike | null;
  forwardedHost?: string | null;
  host?: string | null;
}): string {
  const nextUrlHost = String(input.nextUrl?.host || '').trim();
  if (nextUrlHost) {
    return nextUrlHost;
  }

  const forwardedHost = String(input.forwardedHost || '').trim();
  if (forwardedHost) {
    return forwardedHost;
  }

  return String(input.host || '').trim();
}

export function buildTenantPublicBaseUrl(
  organization: {
    slug?: string | null;
    subdomain?: string | null;
    custom_domain?: string | null;
  },
  requestHost?: string | null
): string {
  const tenantKey = organization.subdomain || organization.slug;
  const normalizedHost = normalizeHostname(requestHost);
  const port = extractPort(requestHost);

  if (organization.custom_domain) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${protocol}://${organization.custom_domain}`;
  }

  if (tenantKey && isLocalDevelopmentHost(normalizedHost)) {
    const protocol = 'http';
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}://localhost${portSuffix}/${tenantKey}`;
  }

  const baseDomain = getConfiguredBaseDomain();
  if (tenantKey && baseDomain && !isLocalDevelopmentHost(baseDomain)) {
    return `https://${tenantKey}.${baseDomain}`;
  }

  return `/${organization.slug || tenantKey || ''}`;
}

export function buildTenantHomeUrl(
  organization: {
    slug?: string | null;
    subdomain?: string | null;
    custom_domain?: string | null;
  },
  requestHost?: string | null
): string {
  const baseUrl = buildTenantPublicBaseUrl(organization, requestHost);
  return `${baseUrl.replace(/\/$/, '')}/home`;
}
