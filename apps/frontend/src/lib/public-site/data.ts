import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { defaultBusinessConfig, type BusinessConfig } from '@/types/business-config';
import { buildTenantHomeUrl } from '@/lib/domain/host-context';
import type { PublicOrganization } from '@/lib/domain/request-tenant';

const PUBLIC_ORGANIZATION_STATUSES = ['ACTIVE', 'TRIAL'];
const MARKETPLACE_ORGANIZATION_SELECT =
  'id,name,slug,subdomain,custom_domain,subscription_status,created_at,branding';
const MARKETPLACE_ORGANIZATION_SELECT_FALLBACK =
  'id,name,slug,subscription_status,created_at,branding';

type SettingsRow = {
  organization_id: string | null;
  value?: Record<string, unknown> | null;
};

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  sale_price?: number | null;
  offer_price?: number | null;
  image_url?: string | null;
  images?: Array<{ url?: string | null }> | string[] | null;
  category_id?: string | null;
  brand?: string | null;
  organization_id?: string | null;
  updated_at?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  organization_id?: string | null;
};

export interface FeaturedOrganizationCard {
  id: string;
  name: string;
  slug: string | null;
  href: string;
  logo?: string;
  tagline: string;
  description: string;
  location: string;
}

export interface GlobalCategoryCard {
  id: string;
  name: string;
  productCount: number;
  organizationCount: number;
}

export interface GlobalProductCard {
  id: string;
  name: string;
  description: string;
  image: string;
  categoryName: string;
  brand?: string;
  basePrice: number;
  offerPrice?: number;
  organizationName: string;
  organizationHref: string;
}

export interface GlobalMarketplaceHomeData {
  stats: {
    organizations: number;
    products: number;
    categories: number;
  };
  featuredOrganizations: FeaturedOrganizationCard[];
  featuredCategories: GlobalCategoryCard[];
  featuredProducts: GlobalProductCard[];
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function mergeBusinessConfig(value: unknown, fallbackName?: string): BusinessConfig {
  const raw = value && typeof value === 'object' ? (value as Partial<BusinessConfig>) : {};

  return {
    ...defaultBusinessConfig,
    ...raw,
    businessName: raw.businessName || fallbackName || defaultBusinessConfig.businessName,
    legalInfo: {
      ...defaultBusinessConfig.legalInfo,
      ...(raw.legalInfo || {}),
    },
    legalDocuments: {
      ...defaultBusinessConfig.legalDocuments,
      ...(raw.legalDocuments || {}),
    },
    contact: {
      ...defaultBusinessConfig.contact,
      ...(raw.contact || {}),
    },
    address: {
      ...defaultBusinessConfig.address,
      ...(raw.address || {}),
    },
    socialMedia: {
      ...defaultBusinessConfig.socialMedia,
      ...(raw.socialMedia || {}),
    },
    branding: {
      ...defaultBusinessConfig.branding,
      ...(raw.branding || {}),
    },
    storeSettings: {
      ...defaultBusinessConfig.storeSettings,
      ...(raw.storeSettings || {}),
    },
    carousel: {
      ...defaultBusinessConfig.carousel,
      ...(raw.carousel || {}),
      images: Array.isArray(raw.carousel?.images)
        ? raw.carousel.images
        : defaultBusinessConfig.carousel.images,
    },
    homeOffersCarousel: {
      enabled:
        raw.homeOffersCarousel?.enabled ??
        defaultBusinessConfig.homeOffersCarousel?.enabled ??
        true,
      autoplay:
        raw.homeOffersCarousel?.autoplay ??
        defaultBusinessConfig.homeOffersCarousel?.autoplay ??
        true,
      intervalSeconds:
        raw.homeOffersCarousel?.intervalSeconds ??
        defaultBusinessConfig.homeOffersCarousel?.intervalSeconds ??
        5,
      transitionMs:
        raw.homeOffersCarousel?.transitionMs ??
        defaultBusinessConfig.homeOffersCarousel?.transitionMs ??
        700,
      ratio:
        raw.homeOffersCarousel?.ratio ??
        defaultBusinessConfig.homeOffersCarousel?.ratio,
    },
    publicSite: {
      sections: {
        ...defaultBusinessConfig.publicSite!.sections,
        ...(raw.publicSite?.sections || {}),
      },
      content: {
        ...defaultBusinessConfig.publicSite!.content,
        ...(raw.publicSite?.content || {}),
      },
    },
    notifications: {
      ...defaultBusinessConfig.notifications,
      ...(raw.notifications || {}),
    },
    regional: {
      ...defaultBusinessConfig.regional,
      ...(raw.regional || {}),
    },
    businessHours: Array.isArray(raw.businessHours)
      ? raw.businessHours
      : defaultBusinessConfig.businessHours,
    createdAt: raw.createdAt || defaultBusinessConfig.createdAt,
    updatedAt: raw.updatedAt || defaultBusinessConfig.updatedAt,
  };
}

function extractPrimaryImage(images: ProductRow['images'], fallback?: string | null): string {
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === 'string' && first) {
      return first;
    }

    if (first && typeof first === 'object' && first.url) {
      return first.url;
    }
  }

  return fallback || '/api/placeholder/480/360';
}

function buildConfigMap(rows: SettingsRow[]): Map<string, BusinessConfig> {
  const map = new Map<string, BusinessConfig>();

  rows.forEach((row) => {
    if (!row.organization_id) return;
    map.set(row.organization_id, mergeBusinessConfig(row.value));
  });

  return map;
}

export async function getPublicBusinessConfig(organization: PublicOrganization): Promise<BusinessConfig> {
  const adminClient = await createAdminClient();
  const { data } = await adminClient
    .from('settings')
    .select('organization_id,value')
    .eq('key', 'business_config')
    .eq('organization_id', organization.id)
    .maybeSingle();

  return mergeBusinessConfig((data as SettingsRow | null)?.value, organization.name);
}

export async function getGlobalMarketplaceHomeData(
  requestHost?: string | null,
  searchQuery?: string | null
): Promise<GlobalMarketplaceHomeData> {
  const adminClient = await createAdminClient();
  const search = String(searchQuery || '').trim().toLowerCase();
  const runOrganizationsQuery = async (selectClause: string) =>
    adminClient
      .from('organizations')
      .select(selectClause, {
        count: 'exact',
      })
      .in('subscription_status', PUBLIC_ORGANIZATION_STATUSES)
      .order('created_at', { ascending: false })
      .limit(24);

  let organizationsResult = await runOrganizationsQuery(MARKETPLACE_ORGANIZATION_SELECT);

  if (organizationsResult.error && isMissingColumnError(organizationsResult.error)) {
    organizationsResult = await runOrganizationsQuery(MARKETPLACE_ORGANIZATION_SELECT_FALLBACK);
  }

  if (organizationsResult.error) {
    throw organizationsResult.error;
  }

  const { data: organizations, count: organizationsCount } = organizationsResult;

  const organizationRows = (organizations || []) as PublicOrganization[];
  const organizationIds = organizationRows.map((organization) => organization.id);

  if (organizationIds.length === 0) {
    return {
      stats: {
        organizations: 0,
        products: 0,
        categories: 0,
      },
      featuredOrganizations: [],
      featuredCategories: [],
      featuredProducts: [],
    };
  }

  const [{ count: productCount }, { count: categoryCount }, settingsResult] = await Promise.all([
    adminClient
      .from('products')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', organizationIds)
      .eq('is_active', true),
    adminClient
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', organizationIds),
    adminClient
      .from('settings')
      .select('organization_id,value')
      .eq('key', 'business_config')
      .in('organization_id', organizationIds),
  ]);

  let productsQuery = adminClient
    .from('products')
    .select('id,name,description,sale_price,offer_price,image_url,images,category_id,brand,organization_id,updated_at')
    .in('organization_id', organizationIds)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(72);

  if (search) {
    productsQuery = productsQuery.or(
      `name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`
    );
  }

  const { data: products } = await productsQuery;
  const productRows = (products || []) as ProductRow[];

  const categoryIds = Array.from(
    new Set(
      productRows
        .map((product) => product.category_id)
        .filter((categoryId): categoryId is string => typeof categoryId === 'string' && categoryId.length > 0)
    )
  );

  const { data: categories } = categoryIds.length
    ? await adminClient
        .from('categories')
        .select('id,name,organization_id')
        .in('id', categoryIds)
    : { data: [] };

  const categoryRows = (categories || []) as CategoryRow[];
  const configMap = buildConfigMap((settingsResult.data || []) as SettingsRow[]);
  const organizationMap = new Map(organizationRows.map((organization) => [organization.id, organization]));
  const categoryMap = new Map(categoryRows.map((category) => [category.id, category]));

  const featuredOrganizations = organizationRows
    .map((organization) => {
      const config = configMap.get(organization.id);
      const locationParts = [
        config?.address?.city,
        config?.address?.department,
      ].filter(Boolean);

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        href: buildTenantHomeUrl(organization, requestHost),
        logo: config?.branding?.logo,
        tagline: config?.tagline || 'Experiencia pública lista para vender.',
        description:
          config?.heroDescription ||
          'Explora el catálogo público de esta empresa dentro del marketplace.',
        location: locationParts.length > 0 ? locationParts.join(', ') : 'Marketplace activo',
      } satisfies FeaturedOrganizationCard;
    })
    .filter((organization) => {
      if (!search) return true;

      const haystack = `${organization.name} ${organization.tagline} ${organization.description}`.toLowerCase();
      return haystack.includes(search);
    })
    .slice(0, 6);

  const categoryAccumulator = new Map<
    string,
    { id: string; name: string; productIds: Set<string>; organizationIds: Set<string> }
  >();

  productRows.forEach((product) => {
    const category = product.category_id ? categoryMap.get(product.category_id) : null;
    const categoryName = category?.name || 'Sin categoría';
    const accumulatorKey = categoryName.toLowerCase();
    const current =
      categoryAccumulator.get(accumulatorKey) || {
        id: category?.id || accumulatorKey,
        name: categoryName,
        productIds: new Set<string>(),
        organizationIds: new Set<string>(),
      };

    current.productIds.add(product.id);
    if (product.organization_id) {
      current.organizationIds.add(product.organization_id);
    }

    categoryAccumulator.set(accumulatorKey, current);
  });

  const featuredCategories = Array.from(categoryAccumulator.values())
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      productCount: entry.productIds.size,
      organizationCount: entry.organizationIds.size,
    }))
    .sort((left, right) => right.productCount - left.productCount)
    .slice(0, 8);

  const featuredProducts = productRows
    .map((product): GlobalProductCard | null => {
      const organization = product.organization_id
        ? organizationMap.get(product.organization_id)
        : null;
      if (!organization) {
        return null;
      }

      const category = product.category_id ? categoryMap.get(product.category_id) : null;

      return {
        id: product.id,
        name: product.name,
        description: product.description || 'Producto público disponible en el marketplace.',
        image: extractPrimaryImage(product.images, product.image_url),
        categoryName: category?.name || 'Sin categoría',
        brand: product.brand || undefined,
        basePrice: Number(product.sale_price || 0),
        offerPrice:
          product.offer_price !== null && product.offer_price !== undefined
            ? Number(product.offer_price)
            : undefined,
        organizationName: organization.name,
        organizationHref: buildTenantHomeUrl(organization, requestHost),
      };
    })
    .filter(isPresent)
    .slice(0, 12);

  return {
    stats: {
      organizations: organizationsCount || organizationRows.length,
      products: productCount || 0,
      categories: categoryCount || featuredCategories.length,
    },
    featuredOrganizations,
    featuredCategories,
    featuredProducts,
  };
}
