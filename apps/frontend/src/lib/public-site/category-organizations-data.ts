import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';
import { buildTenantHomeUrl } from '@/lib/domain/host-context';
import type { PublicOrganization } from '@/lib/domain/request-tenant';

const PUBLIC_STATUSES = ['ACTIVE', 'TRIAL'];

export type CategoryPageOrg = {
  id: string;
  name: string;
  slug: string;
  href: string;
  logoUrl: string | null;
  primaryColor: string;
  description: string | null;
  productCount: number;
};

export type MarketplaceCategoryDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_featured: boolean;
};

export type CategoryOrgsSnapshot = {
  category: MarketplaceCategoryDetail;
  organizations: CategoryPageOrg[];
  totalOrganizations: number;
  totalProducts: number;
};

export async function fetchCategoryOrgsSnapshot(
  slug: string,
  requestHost?: string | null,
): Promise<CategoryOrgsSnapshot | null> {
  const client = await createAdminClient();

  // 1. Fetch the marketplace category by slug
  const { data: cat, error: catError } = await (client as any)
    .from('marketplace_categories')
    .select('id,name,slug,description,icon,color,image_url,seo_title,seo_description,is_featured,is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (catError || !cat) return null;

  // 2. Fetch organizations linked to this category
  const { data: orgs, error: orgsError } = await (client as any)
    .from('organizations')
    .select('id,name,slug,subscription_status')
    .eq('marketplace_category_id', cat.id)
    .in('subscription_status', PUBLIC_STATUSES)
    .order('name', { ascending: true });

  if (orgsError) {
    console.error('[category-organizations-data] orgs error:', orgsError?.message);
    return { category: cat, organizations: [], totalOrganizations: 0, totalProducts: 0 };
  }

  const orgList = (orgs || []) as PublicOrganization[];

  // 2b. FALLBACK: Also include orgs without explicit marketplace_category_id but with
  // internal categories matching the marketplace category name
  const { data: fallbackOrgs, error: fallbackError } = await (client as any)
    .rpc('get_organizations_by_internal_category', {
      category_names: [cat.name],
      statuses: PUBLIC_STATUSES,
    });

  if (!fallbackError && fallbackOrgs && fallbackOrgs.length > 0) {
    const existingOrgIds = new Set(orgList.map((o) => o.id));
    const newOrgs = (fallbackOrgs as Array<{ id: string }>) || [];

    // Fetch full org data for fallback orgs
    const newOrgIds = newOrgs
      .map((o) => o.id)
      .filter((id) => !existingOrgIds.has(id));

    if (newOrgIds.length > 0) {
      const { data: newOrgDetails } = await (client as any)
        .from('organizations')
        .select('id,name,slug,subscription_status')
        .in('id', newOrgIds)
        .in('subscription_status', PUBLIC_STATUSES);

      if (newOrgDetails) {
        orgList.push(...(newOrgDetails as PublicOrganization[]));
      }
    }
  }

  // Sort all orgs by name
  orgList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));

  if (orgList.length === 0) {
    return { category: cat, organizations: [], totalOrganizations: 0, totalProducts: 0 };
  }

  const orgIds = orgList.map((o) => o.id);

  // 3. Count products per org in a single query (solo activos, públicos, no eliminados)
  const { data: products } = await (client as any)
    .from('products')
    .select('organization_id')
    .in('organization_id', orgIds)
    .eq('is_active', true)
    .eq('is_public', true)
    .is('deleted_at', null);

  const productCountMap = new Map<string, number>();
  for (const p of (products || []) as Array<{ organization_id: string }>) {
    productCountMap.set(p.organization_id, (productCountMap.get(p.organization_id) ?? 0) + 1);
  }

  // 4. Build org settings map for logo/color/description
  const { data: settingsRows } = await (client as any)
    .from('settings')
    .select('organization_id, value')
    .eq('key', 'business_config')
    .in('organization_id', orgIds);

  const settingsMap = new Map<string, Record<string, unknown>>();
  for (const row of (settingsRows || []) as Array<{ organization_id: string; value: Record<string, unknown> }>) {
    if (row.organization_id && row.value) settingsMap.set(row.organization_id, row.value);
  }

  const mappedOrgs: CategoryPageOrg[] = orgList.map((org) => {
    const cfg = settingsMap.get(org.id) as Record<string, unknown> | undefined;
    const logoUrl   = String(cfg?.logo_url   ?? (cfg?.branding as Record<string, unknown> | undefined)?.logo_url   ?? '').trim() || null;
    const color     = String(cfg?.primary_color ?? '#10b981').trim();
    const desc      = String(cfg?.business_description ?? cfg?.description ?? '').trim() || null;

    return {
      id:           org.id,
      name:         org.name,
      slug:         org.slug ?? '',
      href:         buildTenantHomeUrl(org, requestHost),
      logoUrl,
      primaryColor: color,
      description:  desc,
      productCount: productCountMap.get(org.id) ?? 0,
    };
  });

  const totalProducts = mappedOrgs.reduce((sum, o) => sum + o.productCount, 0);

  return {
    category: cat,
    organizations: mappedOrgs,
    totalOrganizations: mappedOrgs.length,
    totalProducts,
  };
}
