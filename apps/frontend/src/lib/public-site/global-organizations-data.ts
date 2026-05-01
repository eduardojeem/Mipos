import 'server-only';

import type { BusinessConfig } from '@/types/business-config';
import { createAdminClient } from '@/lib/supabase/server';
import { buildTenantHomeUrl } from '@/lib/domain/host-context';
import type { PublicOrganization } from '@/lib/domain/request-tenant';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';

const PUBLIC_ORGANIZATION_STATUSES = ['ACTIVE', 'TRIAL'];
const ORGANIZATION_BATCH_SIZE = 250;
const PRODUCT_BATCH_SIZE = 500;
const ORGANIZATION_BASE_COLUMNS = ['id', 'name', 'slug', 'created_at'];
const ORGANIZATION_OPTIONAL_COLUMNS = ['branding'];
const PRODUCT_BASE_COLUMNS = ['id', 'organization_id', 'category_id'];
const PRODUCT_OPTIONAL_COLUMNS = ['is_active'];

type SettingsRow = {
  organization_id: string | null;
  value?: Record<string, unknown> | null;
};

type OrganizationRow = PublicOrganization & {
  created_at?: string | null;
};

type ProductStatsRow = {
  id: string;
  organization_id?: string | null;
  category_id?: string | null;
};

export type GlobalOrganizationsSortMode = 'featured' | 'products' | 'recent' | 'name';

export interface GlobalOrganizationsQueryState {
  search: string;
  sortBy: GlobalOrganizationsSortMode;
  city: string;
  department: string;
}

export interface GlobalOrganizationsLocationOption {
  value: string;
  label: string;
  count: number;
}

export interface GlobalOrganizationsSnapshot {
  organizations: FeaturedOrganizationCard[];
  featuredOrganizations: FeaturedOrganizationCard[];
  totalOrganizations: number;
  visibleOrganizations: number;
  totalProducts: number;
  totalCategories: number;
  averageProductsPerOrganization: number;
  departments: GlobalOrganizationsLocationOption[];
  cities: GlobalOrganizationsLocationOption[];
}

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function getMissingColumnName(error: unknown): string | null {
  const code = String((error as { code?: string })?.code || '');
  const message = String((error as { message?: string })?.message || '');

  if (code !== '42703' && !isMissingColumnError(error)) {
    return null;
  }

  const qualifiedMatch = message.match(/column\s+[a-z0-9_]+\.(\w+)\s+does not exist/i);
  if (qualifiedMatch?.[1]) {
    return qualifiedMatch[1].toLowerCase();
  }

  const unqualifiedMatch = message.match(/column\s+(\w+)\s+does not exist/i);
  return unqualifiedMatch?.[1]?.toLowerCase() || null;
}

function buildSelectClause(baseColumns: string[], optionalColumns: string[], missingColumns: Set<string>) {
  return [...baseColumns, ...optionalColumns.filter((column) => !missingColumns.has(column))].join(',');
}

function sanitizeSearchTerm(search: string): string {
  return search.replace(/[,%]/g, ' ').trim();
}

function normalizeDisplayText(value: string | null | undefined, fallback = ''): string {
  const next = String(value || fallback).trim();
  if (!next) {
    return fallback;
  }

  try {
    const decoded = new TextDecoder('utf-8').decode(
      Uint8Array.from(next, (char) => char.charCodeAt(0))
    );
    return Array.from(decoded).some((char) => char.charCodeAt(0) === 65533) ? next : decoded;
  } catch {
    return next;
  }
}

function normalizeLocationValue(value: string | null | undefined): string {
  return normalizeDisplayText(value, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeConfig(value: unknown, fallbackName: string) {
  const raw = value && typeof value === 'object' ? (value as Partial<BusinessConfig>) : {};
  const contact = raw.contact && typeof raw.contact === 'object' ? raw.contact : {};
  const address = raw.address && typeof raw.address === 'object' ? raw.address : {};
  const branding = raw.branding && typeof raw.branding === 'object' ? raw.branding : {};
  const publicSite = raw.publicSite && typeof raw.publicSite === 'object' ? raw.publicSite : {};
  const publicContent =
    publicSite && 'content' in publicSite && publicSite.content && typeof publicSite.content === 'object'
      ? publicSite.content
      : {};
  const carousel = raw.carousel && typeof raw.carousel === 'object' ? raw.carousel : {};
  const carouselImages =
    carousel && 'images' in carousel && Array.isArray(carousel.images) ? carousel.images : [];

  const heroImage =
    String((publicContent as { heroImageUrl?: unknown })?.heroImageUrl || '').trim() ||
    String((carouselImages[0] as { url?: unknown } | undefined)?.url || '').trim() ||
    undefined;

  return {
    businessName: normalizeDisplayText(raw.businessName as string | undefined, fallbackName),
    tagline: normalizeDisplayText(raw.tagline as string | undefined, 'Presencia publica lista para vender.'),
    heroDescription: normalizeDisplayText(
      raw.heroDescription as string | undefined,
      'Explora el catalogo publico de esta empresa dentro del marketplace.'
    ),
    website: normalizeDisplayText((contact as { website?: string }).website, ''),
    email: normalizeDisplayText((contact as { email?: string }).email, ''),
    city: normalizeDisplayText((address as { city?: string }).city, ''),
    department: normalizeDisplayText((address as { department?: string }).department, ''),
    logo: normalizeDisplayText((branding as { logo?: string }).logo, ''),
    heroImage,
  };
}

async function fetchActiveOrganizations(): Promise<{ organizations: OrganizationRow[]; totalOrganizations: number }> {
  const client = await createAdminClient();
  const organizations: OrganizationRow[] = [];
  let totalOrganizations = 0;
  const missingColumns = new Set<string>();

  const runQuery = async (selectClause: string, from: number, to: number) =>
    client
      .from('organizations')
      .select(selectClause, { count: 'exact' })
      .in('subscription_status', PUBLIC_ORGANIZATION_STATUSES)
      .order('created_at', { ascending: false })
      .range(from, to);

  for (;;) {
    const selectClause = buildSelectClause(
      ORGANIZATION_BASE_COLUMNS,
      ORGANIZATION_OPTIONAL_COLUMNS,
      missingColumns
    );
    let recovered = false;

    organizations.length = 0;
    totalOrganizations = 0;

    for (let from = 0; ; from += ORGANIZATION_BATCH_SIZE) {
      const result = await runQuery(selectClause, from, from + ORGANIZATION_BATCH_SIZE - 1);
      const missingColumn = getMissingColumnName(result.error);

      if (
        missingColumn &&
        ORGANIZATION_OPTIONAL_COLUMNS.includes(missingColumn) &&
        !missingColumns.has(missingColumn)
      ) {
        missingColumns.add(missingColumn);
        recovered = true;
        break;
      }

      if (result.error) {
        throw result.error;
      }

      if (typeof result.count === 'number') {
        totalOrganizations = result.count;
      }

      organizations.push(...((result.data || []) as OrganizationRow[]));

      if ((result.data || []).length < ORGANIZATION_BATCH_SIZE) {
        break;
      }
    }

    if (!recovered) {
      break;
    }
  }

  return { organizations, totalOrganizations };
}

async function fetchSettingsMap(organizationIds: string[]) {
  const client = await createAdminClient();
  const map = new Map<string, SettingsRow['value']>();

  if (organizationIds.length === 0) {
    return map;
  }

  const { data, error } = await client
    .from('settings')
    .select('organization_id,value')
    .eq('key', 'business_config')
    .in('organization_id', organizationIds);

  if (error) {
    throw error;
  }

  ((data || []) as SettingsRow[]).forEach((row) => {
    if (row.organization_id) {
      map.set(row.organization_id, row.value || null);
    }
  });

  return map;
}

async function fetchProductStats(organizationIds: string[]): Promise<ProductStatsRow[]> {
  if (organizationIds.length === 0) {
    return [];
  }

  const client = await createAdminClient();
  const rows: ProductStatsRow[] = [];
  const missingColumns = new Set<string>();

  const runQuery = async (
    selectClause: string,
    from: number,
    to: number,
    unavailableColumns: Set<string>
  ) => {
    let query = client
      .from('products')
      .select(selectClause)
      .in('organization_id', organizationIds);

    if (!unavailableColumns.has('is_active')) {
      query = query.eq('is_active', true);
    }

    return query.range(from, to);
  };

  for (;;) {
    const selectClause = buildSelectClause(PRODUCT_BASE_COLUMNS, PRODUCT_OPTIONAL_COLUMNS, missingColumns);
    let recovered = false;

    rows.length = 0;

    for (let from = 0; ; from += PRODUCT_BATCH_SIZE) {
      const result = await runQuery(selectClause, from, from + PRODUCT_BATCH_SIZE - 1, missingColumns);
      const missingColumn = getMissingColumnName(result.error);

      if (
        missingColumn &&
        PRODUCT_OPTIONAL_COLUMNS.includes(missingColumn) &&
        !missingColumns.has(missingColumn)
      ) {
        missingColumns.add(missingColumn);
        recovered = true;
        break;
      }

      if (result.error) {
        throw result.error;
      }

      rows.push(...((result.data || []) as ProductStatsRow[]));

      if ((result.data || []).length < PRODUCT_BATCH_SIZE) {
        break;
      }
    }

    if (!recovered) {
      break;
    }
  }

  return rows;
}

function buildOrganizationCards(
  organizations: OrganizationRow[],
  settingsMap: Map<string, SettingsRow['value']>,
  productStats: ProductStatsRow[],
  requestHost?: string | null
): FeaturedOrganizationCard[] {
  const statsMap = new Map<
    string,
    {
      productIds: Set<string>;
      categoryIds: Set<string>;
    }
  >();

  productStats.forEach((row) => {
    const organizationId = String(row.organization_id || '');
    if (!organizationId) {
      return;
    }

    const current = statsMap.get(organizationId) || {
      productIds: new Set<string>(),
      categoryIds: new Set<string>(),
    };

    current.productIds.add(row.id);
    if (row.category_id) {
      current.categoryIds.add(String(row.category_id));
    }

    statsMap.set(organizationId, current);
  });

  return organizations.map((organization) => {
    const config = normalizeConfig(settingsMap.get(organization.id), organization.name);
    const stats = statsMap.get(organization.id);
    const productCount = stats?.productIds.size || 0;
    const categoryCount = stats?.categoryIds.size || 0;
    const locationParts = [config.city, config.department].filter(Boolean);

    return {
      id: organization.id,
      name: normalizeDisplayText(organization.name, 'Empresa'),
      slug: organization.slug || null,
      href: buildTenantHomeUrl(organization, requestHost),
      logo: config.logo || undefined,
      tagline: config.tagline,
      description: config.heroDescription,
      location: locationParts.length > 0 ? locationParts.join(', ') : 'Marketplace activo',
      productCount,
      categoryCount,
      website: config.website || undefined,
      heroImage: config.heroImage || undefined,
      createdAt: organization.created_at || null,
      city: config.city || undefined,
      department: config.department || undefined,
    } satisfies FeaturedOrganizationCard;
  });
}

function filterOrganizations(items: FeaturedOrganizationCard[], input: GlobalOrganizationsQueryState) {
  const normalizedDepartment = normalizeLocationValue(input.department);
  const normalizedCity = normalizeLocationValue(input.city);
  const normalizedSearch = sanitizeSearchTerm(input.search).toLowerCase();

  const filteredByLocation = items.filter((organization) => {
    if (
      normalizedDepartment &&
      normalizeLocationValue(organization.department) !== normalizedDepartment
    ) {
      return false;
    }

    if (normalizedCity && normalizeLocationValue(organization.city) !== normalizedCity) {
      return false;
    }

    return true;
  });

  if (!normalizedSearch) {
    return filteredByLocation;
  }

  return filteredByLocation.filter((organization) => {
    const haystack = [
      organization.name,
      organization.tagline,
      organization.description,
      organization.location,
      organization.website || '',
      organization.city || '',
      organization.department || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

function buildLocationOptions(
  items: FeaturedOrganizationCard[],
  key: 'city' | 'department'
): GlobalOrganizationsLocationOption[] {
  const counts = new Map<string, { label: string; count: number }>();

  items.forEach((organization) => {
    const label = normalizeDisplayText(organization[key], '');
    const value = normalizeLocationValue(label);

    if (!value || !label) {
      return;
    }

    const current = counts.get(value) || { label, count: 0 };
    current.count += 1;
    counts.set(value, current);
  });

  return Array.from(counts.entries())
    .map(([value, meta]) => ({
      value,
      label: meta.label,
      count: meta.count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, 'es');
    });
}

function sortOrganizations(items: FeaturedOrganizationCard[], sortBy: GlobalOrganizationsSortMode) {
  const sorted = [...items];

  switch (sortBy) {
    case 'products':
      sorted.sort((left, right) => {
        const productDiff = Number(right.productCount || 0) - Number(left.productCount || 0);
        if (productDiff !== 0) return productDiff;
        const categoryDiff = Number(right.categoryCount || 0) - Number(left.categoryCount || 0);
        if (categoryDiff !== 0) return categoryDiff;
        return left.name.localeCompare(right.name, 'es');
      });
      break;
    case 'recent':
      sorted.sort((left, right) => {
        const recentDiff =
          new Date(String(right.createdAt || 0)).getTime() - new Date(String(left.createdAt || 0)).getTime();
        if (recentDiff !== 0) return recentDiff;
        return left.name.localeCompare(right.name, 'es');
      });
      break;
    case 'name':
      sorted.sort((left, right) => left.name.localeCompare(right.name, 'es'));
      break;
    case 'featured':
    default:
      sorted.sort((left, right) => {
        const productDiff = Number(right.productCount || 0) - Number(left.productCount || 0);
        if (productDiff !== 0) return productDiff;
        const recentDiff =
          new Date(String(right.createdAt || 0)).getTime() - new Date(String(left.createdAt || 0)).getTime();
        if (recentDiff !== 0) return recentDiff;
        return left.name.localeCompare(right.name, 'es');
      });
      break;
  }

  return sorted;
}

export async function fetchGlobalOrganizationsSnapshot(
  requestHost: string | null | undefined,
  input: GlobalOrganizationsQueryState
): Promise<GlobalOrganizationsSnapshot> {
  const { organizations, totalOrganizations } = await fetchActiveOrganizations();
  if (organizations.length === 0) {
    return {
      organizations: [],
      featuredOrganizations: [],
      totalOrganizations: 0,
      visibleOrganizations: 0,
      totalProducts: 0,
      totalCategories: 0,
      averageProductsPerOrganization: 0,
      departments: [],
      cities: [],
    };
  }

  const organizationIds = organizations.map((organization) => organization.id);
  const [settingsMap, productStats] = await Promise.all([
    fetchSettingsMap(organizationIds),
    fetchProductStats(organizationIds),
  ]);

  const allOrganizations = buildOrganizationCards(organizations, settingsMap, productStats, requestHost);
  const departments = buildLocationOptions(allOrganizations, 'department');
  const organizationsForCities = input.department
    ? allOrganizations.filter(
        (organization) =>
          normalizeLocationValue(organization.department) === normalizeLocationValue(input.department)
      )
    : allOrganizations;
  const cities = buildLocationOptions(organizationsForCities, 'city');
  const filteredOrganizations = filterOrganizations(allOrganizations, input);
  const sortedOrganizations = sortOrganizations(filteredOrganizations, input.sortBy);
  const featuredOrganizations = sortOrganizations(filteredOrganizations, 'featured').slice(0, 5);
  const totalProducts = allOrganizations.reduce((sum, organization) => sum + Number(organization.productCount || 0), 0);
  const totalCategories = allOrganizations.reduce((sum, organization) => sum + Number(organization.categoryCount || 0), 0);

  return {
    organizations: sortedOrganizations,
    featuredOrganizations,
    totalOrganizations,
    visibleOrganizations: sortedOrganizations.length,
    totalProducts,
    totalCategories,
    averageProductsPerOrganization:
      totalOrganizations > 0 ? Math.round((totalProducts / totalOrganizations) * 10) / 10 : 0,
    departments,
    cities,
  };
}
