import 'server-only';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import {
  DOMAIN_CONTEXT_HEADER,
  ORIGINAL_HOST_HEADER,
  PATH_TENANT_HEADER,
  TENANT_KEY_HEADER,
  TENANT_SOURCE_HEADER,
  detectTenantCandidate,
  normalizeHostname,
  type TenantSource,
} from './host-context';

const PUBLIC_ORGANIZATION_STATUSES = ['ACTIVE', 'TRIAL'];
const ORGANIZATION_SELECT = 'id,name,slug,subdomain,custom_domain,subscription_status,created_at,branding';
const ORGANIZATION_SELECT_FALLBACK = 'id,name,slug,subscription_status,created_at,branding';

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string | null;
  subdomain?: string | null;
  custom_domain?: string | null;
  subscription_status?: string | null;
  created_at?: string | null;
  branding?: Record<string, unknown> | null;
}

export type ResolvedTenantContext =
  | {
      kind: 'root';
      hostname: string;
    }
  | {
      kind: 'tenant';
      hostname: string;
      source: TenantSource;
      tenantKey: string;
      organization: PublicOrganization;
    }
  | {
      kind: 'tenant-not-found';
      hostname: string;
      source: TenantSource;
      tenantKey: string;
    };

type HeaderStore = {
  get(name: string): string | null;
};

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

async function findOrganizationByField(
  client: Awaited<ReturnType<typeof createAdminClient>>,
  field: 'slug' | 'subdomain' | 'custom_domain',
  value: string
): Promise<PublicOrganization | null> {
  const runQuery = async (selectClause: string) =>
    client
      .from('organizations')
      .select(selectClause)
      .eq(field, value)
      .in('subscription_status', PUBLIC_ORGANIZATION_STATUSES)
      .maybeSingle();

  try {
    const { data, error } = await runQuery(ORGANIZATION_SELECT);

    if (error) {
      if (isMissingColumnError(error)) {
        if (field !== 'slug') {
          return null;
        }

        const fallback = await runQuery(ORGANIZATION_SELECT_FALLBACK);
        if (fallback.error) {
          if (isMissingColumnError(fallback.error)) {
            return null;
          }

          throw fallback.error;
        }

        return (fallback.data as PublicOrganization | null) || null;
      }

      throw error;
    }

    return (data as PublicOrganization | null) || null;
  } catch (error) {
    if (isMissingColumnError(error)) {
      return null;
    }

    throw error;
  }
}

async function resolveOrganization(
  client: Awaited<ReturnType<typeof createAdminClient>>,
  source: TenantSource,
  tenantKey: string,
  hostname: string
): Promise<PublicOrganization | null> {
  if (source === 'path') {
    return findOrganizationByField(client, 'slug', tenantKey);
  }

  if (source === 'subdomain') {
    const bySubdomain = await findOrganizationByField(client, 'subdomain', tenantKey);
    if (bySubdomain) {
      return bySubdomain;
    }

    return findOrganizationByField(client, 'slug', tenantKey);
  }

  const byCustomDomain = await findOrganizationByField(client, 'custom_domain', hostname);
  if (byCustomDomain) {
    return byCustomDomain;
  }

  if (hostname.startsWith('www.')) {
    return findOrganizationByField(client, 'custom_domain', hostname.slice(4));
  }

  return null;
}

function readHeader(
  headerStore: HeaderStore,
  name: string
): string | null {
  const value = headerStore.get(name);
  return value && value.trim() ? value.trim() : null;
}

export async function resolveTenantContextFromHeaders(
  headerStore: HeaderStore
): Promise<ResolvedTenantContext> {
  const hostname = normalizeHostname(
    readHeader(headerStore, ORIGINAL_HOST_HEADER) ||
      readHeader(headerStore, 'x-forwarded-host') ||
      readHeader(headerStore, 'host')
  );

  const injectedContext = readHeader(headerStore, DOMAIN_CONTEXT_HEADER);
  const injectedSource = readHeader(headerStore, TENANT_SOURCE_HEADER) as TenantSource | null;
  const injectedTenantKey = readHeader(headerStore, TENANT_KEY_HEADER);
  const injectedOrganizationId = readHeader(headerStore, 'x-organization-id');

  if (injectedContext === 'root') {
    return { kind: 'root', hostname };
  }

  if (
    injectedContext === 'tenant' &&
    injectedSource &&
    injectedTenantKey &&
    injectedOrganizationId
  ) {
    return {
      kind: 'tenant',
      hostname,
      source: injectedSource,
      tenantKey: injectedTenantKey,
      organization: {
        id: injectedOrganizationId,
        name: readHeader(headerStore, 'x-organization-name') || 'Empresa',
        slug: readHeader(headerStore, 'x-organization-slug'),
        subdomain: readHeader(headerStore, 'x-organization-subdomain'),
        custom_domain: readHeader(headerStore, 'x-organization-custom-domain'),
      },
    };
  }

  if (injectedContext === 'tenant-unresolved' && injectedSource && injectedTenantKey) {
    return {
      kind: 'tenant-not-found',
      hostname,
      source: injectedSource,
      tenantKey: injectedTenantKey,
    };
  }

  const pathTenant = readHeader(headerStore, PATH_TENANT_HEADER);
  const candidate = detectTenantCandidate(hostname, pathTenant);

  if (candidate.kind === 'root' || !candidate.source || !candidate.tenantKey) {
    return {
      kind: 'root',
      hostname: candidate.hostname,
    };
  }

  const adminClient = await createAdminClient();
  const organization = await resolveOrganization(
    adminClient,
    candidate.source,
    candidate.tenantKey,
    candidate.hostname
  );

  if (!organization) {
    return {
      kind: 'tenant-not-found',
      hostname: candidate.hostname,
      source: candidate.source,
      tenantKey: candidate.tenantKey,
    };
  }

  return {
    kind: 'tenant',
    hostname: candidate.hostname,
    source: candidate.source,
    tenantKey: candidate.tenantKey,
    organization,
  };
}

export async function resolveRequestTenantContext(): Promise<ResolvedTenantContext> {
  const headerStore = await headers();
  return resolveTenantContextFromHeaders(headerStore);
}
