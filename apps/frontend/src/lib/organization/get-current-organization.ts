import 'server-only';

import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';

export async function maybeGetCurrentOrganization() {
  const context = await resolveRequestTenantContext();

  if (context.kind !== 'tenant') {
    return null;
  }

  return {
    id: context.organization.id,
    name: context.organization.name || 'Empresa',
    slug: context.organization.slug || context.tenantKey,
    subdomain: context.organization.subdomain || null,
    custom_domain: context.organization.custom_domain || null,
  };
}

export async function getCurrentOrganization() {
  const organization = await maybeGetCurrentOrganization();

  if (!organization) {
    throw new Error('No organization context found for the current request.');
  }

  return organization;
}

export async function getCurrentOrganizationId(): Promise<string> {
  const organization = await getCurrentOrganization();
  return organization.id;
}

export async function hasOrganizationContext(): Promise<boolean> {
  const organization = await maybeGetCurrentOrganization();
  return Boolean(organization?.id);
}
