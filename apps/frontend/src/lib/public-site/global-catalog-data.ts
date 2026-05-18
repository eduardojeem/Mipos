import "server-only";

import { unstable_cache } from "next/cache";
import {
  CATALOG_DEFAULT_MAX_PRICE,
  type CatalogQueryState,
  type CatalogSortMode,
} from "@/app/catalog/catalog-query";
import { buildTenantHomeUrl } from "@/lib/domain/host-context";
import type { PublicOrganization } from "@/lib/domain/request-tenant";
import { createAdminClient } from "@/lib/supabase/server";
import type { GlobalProductCard } from "@/lib/public-site/data";

const PUBLIC_ORGANIZATION_STATUSES = ["ACTIVE", "TRIAL"];
const ORGANIZATION_BASE_COLUMNS = ["id", "name", "slug", "subscription_status"];
const ORGANIZATION_OPTIONAL_COLUMNS: string[] = [];
const PRODUCT_BASE_COLUMNS = ["id", "name", "sale_price", "organization_id"];
const PRODUCT_OPTIONAL_COLUMNS = [
  "description",
  "offer_price",
  "discount_percentage",
  "stock_quantity",
  "image_url",
  "images",
  "category_id",
  "brand",
  "updated_at",
  "created_at",
  "rating",
  "is_active",
];
const ORGANIZATION_BATCH_SIZE = 250;
const PRODUCT_BATCH_SIZE = 500;
const CATEGORY_BATCH_SIZE = 500;

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  sale_price?: number | null;
  offer_price?: number | null;
  discount_percentage?: number | null;
  stock_quantity?: number | null;
  image_url?: string | null;
  images?: Array<{ url?: string | null }> | string[] | null;
  category_id?: string | null;
  brand?: string | null;
  organization_id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  rating?: number | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

export interface GlobalCatalogCategoryOption {
  key: string;
  label: string;
  productCount: number;
  organizationCount: number;
  icon?: string | null;
  color?: string;
}

export interface GlobalCatalogLocationOption {
  key: string;
  label: string;
  organizationCount: number;
  productCount: number;
  /** Para departamentos: clave del país padre. Para ciudades: clave del departamento padre. */
  parentKey?: string;
}

export interface ActiveMarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  is_featured: boolean;
}

export interface GlobalCatalogSnapshot {
  products: GlobalProductCard[];
  heroProducts: GlobalProductCard[];
  totalProducts: number;
  totalOrganizations: number;
  matchingOrganizations: number;
  categories: GlobalCatalogCategoryOption[];
  countries: GlobalCatalogLocationOption[];
  departments: GlobalCatalogLocationOption[];
  cities: GlobalCatalogLocationOption[];
  maxPrice: number;
  activeMarketplaceCategory: ActiveMarketplaceCategory | null;
}

function isMissingColumnError(error: unknown): boolean {
  const message = String(
    (error as { message?: string })?.message || "",
  ).toLowerCase();
  return message.includes("column") && message.includes("does not exist");
}

function getMissingColumnName(error: unknown): string | null {
  const code = String((error as { code?: string })?.code || "");
  const message = String((error as { message?: string })?.message || "");

  if (code !== "42703" && !isMissingColumnError(error)) {
    return null;
  }

  const qualifiedMatch = message.match(
    /column\s+[a-z0-9_]+\.(\w+)\s+does not exist/i,
  );
  if (qualifiedMatch?.[1]) {
    return qualifiedMatch[1].toLowerCase();
  }

  const unqualifiedMatch = message.match(/column\s+(\w+)\s+does not exist/i);
  return unqualifiedMatch?.[1]?.toLowerCase() || null;
}

function buildSelectClause(
  baseColumns: string[],
  optionalColumns: string[],
  missingColumns: Set<string>,
): string {
  return [
    ...baseColumns,
    ...optionalColumns.filter((column) => !missingColumns.has(column)),
  ].join(",");
}

function sanitizeSearchTerm(search: string): string {
  // Escape SQL LIKE wildcards: % and _ are special characters
  return search.replace(/[%_,]/g, " ").trim();
}

function normalizePositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDisplayText(
  value: string | null | undefined,
  fallback = "",
): string {
  const next = String(value || fallback).trim();
  if (!next) {
    return fallback;
  }

  try {
    const decoded = new TextDecoder("utf-8").decode(
      Uint8Array.from(next, (char) => char.charCodeAt(0)),
    );
    return Array.from(decoded).some((char) => char.charCodeAt(0) === 65533)
      ? next
      : decoded;
  } catch {
    return next;
  }
}

function extractPrimaryImage(
  images: ProductRow["images"],
  fallback?: string | null,
): string {
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === "string" && first) {
      return first;
    }

    if (first && typeof first === "object" && first.url) {
      return first.url;
    }
  }

  return fallback || "/api/placeholder/480/360";
}

function toCategoryKey(value: string): string {
  const normalized = normalizeDisplayText(value, "sin-categoria")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "sin-categoria";
}

function getEffectivePrice(
  product: Pick<GlobalProductCard, "basePrice" | "offerPrice">,
): number {
  const offerPrice = normalizePositiveNumber(product.offerPrice);
  return offerPrice && offerPrice < product.basePrice
    ? offerPrice
    : product.basePrice;
}

function hasOffer(
  product: Pick<
    GlobalProductCard,
    "basePrice" | "offerPrice" | "discountPercentage"
  >,
): boolean {
  const offerPrice = normalizePositiveNumber(product.offerPrice);
  const discount = Number(product.discountPercentage || 0);
  return Boolean(
    (offerPrice && offerPrice < product.basePrice) || discount > 0,
  );
}

function sortProducts(
  products: GlobalProductCard[],
  sortBy: CatalogSortMode,
): GlobalProductCard[] {
  const sorted = [...products];

  switch (sortBy) {
    case "price-low":
      sorted.sort((left, right) => {
        const diff = getEffectivePrice(left) - getEffectivePrice(right);
        if (diff !== 0) return diff;
        return left.name.localeCompare(right.name, "es");
      });
      break;
    case "price-high":
      sorted.sort((left, right) => {
        const diff = getEffectivePrice(right) - getEffectivePrice(left);
        if (diff !== 0) return diff;
        return left.name.localeCompare(right.name, "es");
      });
      break;
    case "rating":
      sorted.sort((left, right) => {
        const diff = Number(right.rating || 0) - Number(left.rating || 0);
        if (diff !== 0) return diff;
        return left.name.localeCompare(right.name, "es");
      });
      break;
    case "newest":
      sorted.sort((left, right) => {
        const diff =
          new Date(String(right.createdAt || 0)).getTime() -
          new Date(String(left.createdAt || 0)).getTime();
        if (diff !== 0) return diff;
        return left.name.localeCompare(right.name, "es");
      });
      break;
    case "name":
      sorted.sort((left, right) => left.name.localeCompare(right.name, "es"));
      break;
    case "popular":
    default:
      sorted.sort((left, right) => {
        const updatedDiff =
          new Date(String(right.updatedAt || 0)).getTime() -
          new Date(String(left.updatedAt || 0)).getTime();
        if (updatedDiff !== 0) return updatedDiff;
        return left.name.localeCompare(right.name, "es");
      });
      break;
  }

  return sorted;
}

async function fetchMarketplaceCategoryBySlug(slug: string): Promise<ActiveMarketplaceCategory | null> {
  const client = await createAdminClient();
  const { data, error } = await (client as any)
    .from('marketplace_categories')
    .select('id,name,slug,description,icon,color,is_featured')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error || !data) return null;
  return data as ActiveMarketplaceCategory;
}

/**
 * Resuelve slugs de marketplace_categories a IDs de organización.
 * Usado para filtrar el catálogo por rubro público (?category=restaurantes).
 * Retorna Set vacío si los slugs no coinciden con ninguna categoría activa.
 */
async function resolveMarketplaceCategoryOrgIds(slugs: string[]): Promise<Set<string>> {
  if (slugs.length === 0) return new Set();

  const client = await createAdminClient();

  // Obtener los IDs de las marketplace_categories activas que coincidan con los slugs
  const { data: mktCats, error: mktError } = await client
    .from("marketplace_categories")
    .select("id")
    .in("slug", slugs)
    .eq("is_active", true);

  if (mktError || !mktCats || mktCats.length === 0) return new Set();

  const mktCatIds = mktCats.map((c: { id: string }) => c.id);

  // Obtener organizaciones vinculadas a esas categorías
  const { data: orgs, error: orgsError } = await client
    .from("organizations")
    .select("id")
    .in("marketplace_category_id", mktCatIds)
    .in("subscription_status", PUBLIC_ORGANIZATION_STATUSES);

  if (orgsError || !orgs) return new Set();

  return new Set(orgs.map((o: { id: string }) => o.id));
}

async function fetchActiveOrganizations(filterOrgIds?: Set<string>): Promise<{
  organizations: PublicOrganization[];
  totalOrganizations: number;
}> {
  const client = await createAdminClient();
  const organizations: PublicOrganization[] = [];
  let totalOrganizations = 0;
  const missingColumns = new Set<string>();

  const runQuery = async (selectClause: string, from: number, to: number) => {
    let q = client
      .from("organizations")
      .select(selectClause, { count: "exact" })
      .in("subscription_status", PUBLIC_ORGANIZATION_STATUSES)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filterOrgIds && filterOrgIds.size > 0) {
      q = q.in("id", Array.from(filterOrgIds));
    }

    return q;
  };

  for (;;) {
    const selectClause = buildSelectClause(
      ORGANIZATION_BASE_COLUMNS,
      ORGANIZATION_OPTIONAL_COLUMNS,
      missingColumns,
    );
    let recovered = false;

    organizations.length = 0;
    totalOrganizations = 0;

    for (let from = 0; ; from += ORGANIZATION_BATCH_SIZE) {
      const result = await runQuery(
        selectClause,
        from,
        from + ORGANIZATION_BATCH_SIZE - 1,
      );
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
        throw new Error(result.error.message || JSON.stringify(result.error));
      }

      if (typeof result.count === "number") {
        totalOrganizations = result.count;
      }

      const rows = (result.data || []) as unknown as PublicOrganization[];
      organizations.push(...rows);

      if (rows.length < ORGANIZATION_BATCH_SIZE) {
        break;
      }
    }

    if (!recovered) {
      break;
    }
  }

  return {
    organizations,
    totalOrganizations,
  };
}

async function fetchMatchingProducts(
  organizationIds: string[],
  input: CatalogQueryState,
): Promise<ProductRow[]> {
  const client = await createAdminClient();
  const products: ProductRow[] = [];
  const search = sanitizeSearchTerm(input.search);
  const missingColumns = new Set<string>();

  const runQuery = async (
    selectValue: string,
    from: number,
    to: number,
    unavailableColumns: Set<string>,
  ) => {
    let query = client
      .from("products")
      .select(selectValue)
      .in("organization_id", organizationIds);

    if (!unavailableColumns.has("is_active")) {
      query = query.eq("is_active", true);
    }

    if (search) {
      const searchClauses = [`name.ilike.%${search}%`];

      if (!unavailableColumns.has("description")) {
        searchClauses.push(`description.ilike.%${search}%`);
      }

      if (!unavailableColumns.has("brand")) {
        searchClauses.push(`brand.ilike.%${search}%`);
      }

      query = query.or(searchClauses.join(","));
    }

    if (input.inStock && !unavailableColumns.has("stock_quantity")) {
      query = query.gt("stock_quantity", 0);
    }

    if (input.rating && !unavailableColumns.has("rating")) {
      query = query.gte("rating", input.rating);
    }

    // Apply price filters at DB level for performance
    if (input.minPrice > 0) {
      query = query.gte("sale_price", input.minPrice);
    }

    if (input.maxPrice !== null && input.maxPrice > 0) {
      query = query.lte("sale_price", input.maxPrice);
    }

    // Filter products with active offers at DB level
    if (input.onSale && !unavailableColumns.has("offer_price")) {
      query = query.gt("offer_price", 0);
    }

    if (!unavailableColumns.has("updated_at")) {
      query = query.order("updated_at", { ascending: false });
    }

    if (!unavailableColumns.has("created_at")) {
      query = query.order("created_at", { ascending: false });
    }

    return query.range(from, to);
  };

  for (;;) {
    const selectClause = buildSelectClause(
      PRODUCT_BASE_COLUMNS,
      PRODUCT_OPTIONAL_COLUMNS,
      missingColumns,
    );
    let recovered = false;

    products.length = 0;

    for (let from = 0; ; from += PRODUCT_BATCH_SIZE) {
      const result = await runQuery(
        selectClause,
        from,
        from + PRODUCT_BATCH_SIZE - 1,
        missingColumns,
      );
      const missingColumn = getMissingColumnName(result.error);

      if (
        missingColumn &&
        [...PRODUCT_OPTIONAL_COLUMNS, "created_at", "updated_at"].includes(
          missingColumn,
        ) &&
        !missingColumns.has(missingColumn)
      ) {
        missingColumns.add(missingColumn);
        recovered = true;
        break;
      }

      if (result.error) {
        throw new Error(result.error.message || JSON.stringify(result.error));
      }

      const rows = (result.data || []) as unknown as ProductRow[];
      products.push(...rows);

      if (rows.length < PRODUCT_BATCH_SIZE) {
        break;
      }
    }

    if (!recovered) {
      break;
    }
  }

  return products;
}

async function fetchCategoryMap(
  categoryIds: string[],
): Promise<Map<string, string>> {
  if (categoryIds.length === 0) {
    return new Map();
  }

  const client = await createAdminClient();
  const categoryMap = new Map<string, string>();

  for (
    let index = 0;
    index < categoryIds.length;
    index += CATEGORY_BATCH_SIZE
  ) {
    const batch = categoryIds.slice(index, index + CATEGORY_BATCH_SIZE);
    const { data, error } = await client
      .from("categories")
      .select("id,name")
      .in("id", batch);

    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }

    ((data || []) as CategoryRow[]).forEach((row) => {
      categoryMap.set(row.id, normalizeDisplayText(row.name, "Sin categoria"));
    });
  }

  return categoryMap;
}

function extractOrganizationLocation(
  organization: PublicOrganization,
  businessConfigMap: Map<string, Record<string, unknown>>,
): { country: string; department: string; city: string } {
  let country = "";
  let department = "";
  let city = "";

  // 1. Try from business_config in settings table (most reliable source)
  const config = businessConfigMap.get(organization.id);
  if (config) {
    // Flat fields (new format saved by CompanySettings form)
    if (!country)    country    = String(config.country    || "").trim();
    if (!department) department = String(config.department || "").trim();
    if (!city)       city       = String(config.city       || "").trim();

    // Nested address object (legacy format)
    const address = config.address as Record<string, unknown> | undefined;
    if (address && typeof address === "object") {
      if (!country)    country    = String(address.country || "").trim();
      if (!department) department = String(address.state || address.department || "").trim();
      if (!city)       city       = String(address.city || address.ciudad || "").trim();
    }
    const contact = config.contact as Record<string, unknown> | undefined;
    if (!city && contact && typeof contact === "object") {
      city = String(contact.city || "").trim();
    }
  }

  // 2. Fallback to organizations.settings JSONB
  if (!department || !city) {
    const settings = (organization as { settings?: Record<string, unknown> })
      .settings;
    if (settings && typeof settings === "object") {
      const address = (settings as Record<string, unknown>).address;
      if (address && typeof address === "object") {
        const addr = address as Record<string, unknown>;
        if (!department)
          department = String(addr.state || addr.department || "").trim();
        if (!city) city = String(addr.city || addr.ciudad || "").trim();
      }
      if (!department)
        department = String(
          (settings as Record<string, unknown>).department || "",
        ).trim();
      if (!city)
        city = String((settings as Record<string, unknown>).city || "").trim();
    }
  }

  return { country, department, city };
}

async function fetchBusinessConfigLocations(
  organizationIds: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (organizationIds.length === 0) return map;

  const client = await createAdminClient();

  // Try settings table first (new format)
  const { data: settingsRows, error: settingsError } = await client
    .from("settings")
    .select("organization_id, value")
    .eq("key", "business_config")
    .in("organization_id", organizationIds);

  if (!settingsError && settingsRows) {
    for (const row of settingsRows) {
      if (row.value && typeof row.value === "object" && row.organization_id) {
        map.set(row.organization_id, row.value as Record<string, unknown>);
      }
    }
  }

  // Fallback: try business_config table for orgs not found
  const missingIds = organizationIds.filter((id) => !map.has(id));
  if (missingIds.length > 0) {
    const { data: legacyRows, error: legacyError } = await client
      .from("business_config")
      .select("organization_id, address, phone, city, state, department")
      .in("organization_id", missingIds);

    if (!legacyError && legacyRows) {
      for (const row of legacyRows as Array<Record<string, unknown>>) {
        const orgId = String(row.organization_id || "");
        if (!orgId) continue;
        map.set(orgId, {
          address: {
            city: row.city || "",
            state: row.state || row.department || "",
          },
        });
      }
    }
  }

  return map;
}

function mapProductsToCards(
  products: ProductRow[],
  organizations: PublicOrganization[],
  categoryMap: Map<string, string>,
  businessConfigMap: Map<string, Record<string, unknown>>,
  requestHost?: string | null,
): GlobalProductCard[] {
  const organizationMap = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );

  return products
    .map((product): GlobalProductCard | null => {
      const organization = product.organization_id
        ? organizationMap.get(product.organization_id)
        : null;

      if (!organization) {
        return null;
      }

      const categoryName = product.category_id
        ? categoryMap.get(product.category_id) || "Sin categoria"
        : "Sin categoria";

      const location = extractOrganizationLocation(
        organization,
        businessConfigMap,
      );

      return {
        id: product.id,
        name: normalizeDisplayText(product.name, "Producto"),
        description: normalizeDisplayText(
          product.description,
          "Producto publico disponible en el marketplace.",
        ),
        image: extractPrimaryImage(product.images, product.image_url),
        categoryName,
        categoryKey: toCategoryKey(categoryName),
        brand: product.brand ? normalizeDisplayText(product.brand) : undefined,
        basePrice: Number(product.sale_price || 0),
        offerPrice: normalizePositiveNumber(product.offer_price) || undefined,
        discountPercentage:
          Number(product.discount_percentage || 0) || undefined,
        stockQuantity: Number(product.stock_quantity || 0),
        rating: product.rating ?? null,
        organizationName: normalizeDisplayText(organization.name, "Empresa"),
        organizationHref: buildTenantHomeUrl(organization, requestHost),
        organizationId: organization.id,
        country: location.country || undefined,
        department: location.department || undefined,
        city: location.city || undefined,
        createdAt: product.created_at || null,
        updatedAt: product.updated_at || null,
      } satisfies GlobalProductCard;
    })
    .filter((product): product is GlobalProductCard => Boolean(product));
}

async function fetchMarketplaceCategoryOptions(): Promise<GlobalCatalogCategoryOption[]> {
  const client = await createAdminClient();
  const { data, error } = await (client as any).rpc('get_marketplace_categories_with_counts');
  if (error || !data) return [];
  return (data as Array<{
    slug: string;
    name: string;
    icon: string | null;
    color: string;
    org_count: number | string;
    product_count: number | string;
  }>).map((row) => ({
    key: row.slug,
    label: row.name,
    icon: row.icon,
    color: row.color,
    productCount: Number(row.product_count) || 0,
    organizationCount: Number(row.org_count) || 0,
  }));
}

function toLocationKey(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sin-ubicacion"
  );
}

function buildLocationOptions(
  products: GlobalProductCard[],
  field: "country" | "department" | "city",
  parentField?: "country" | "department",
): GlobalCatalogLocationOption[] {
  const accumulator = new Map<
    string,
    {
      key: string;
      label: string;
      parentKey: string | undefined;
      organizationIds: Set<string>;
      productCount: number;
    }
  >();

  products.forEach((product) => {
    const value = product[field];
    if (!value) return;

    const key = toLocationKey(value);
    const parentValue = parentField ? product[parentField] : undefined;
    const parentKey = parentValue ? toLocationKey(parentValue) : undefined;

    const current = accumulator.get(key) || {
      key,
      label: value,
      parentKey,
      organizationIds: new Set<string>(),
      productCount: 0,
    };

    current.productCount += 1;
    if (product.organizationId) {
      current.organizationIds.add(product.organizationId);
    }

    accumulator.set(key, current);
  });

  return Array.from(accumulator.values())
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      parentKey: entry.parentKey,
      organizationCount: entry.organizationIds.size,
      productCount: entry.productCount,
    }))
    .sort((left, right) => right.productCount - left.productCount);
}

function filterProducts(
  products: GlobalProductCard[],
  input: CatalogQueryState,
): GlobalProductCard[] {
  return products.filter((product) => {
    if (input.onSale && !hasOffer(product)) return false;

    const effectivePrice = getEffectivePrice(product);
    if (input.minPrice > 0 && effectivePrice < input.minPrice) return false;
    if (input.maxPrice !== null && input.maxPrice > 0 && effectivePrice > input.maxPrice) return false;

    if (input.country && (!product.country || toLocationKey(product.country) !== toLocationKey(input.country))) return false;
    if (input.department && (!product.department || toLocationKey(product.department) !== toLocationKey(input.department))) return false;
    if (input.city && (!product.city || toLocationKey(product.city) !== toLocationKey(input.city))) return false;

    return true;
  });
}

function resolveMaxPrice(products: GlobalProductCard[]): number {
  if (products.length === 0) {
    return CATALOG_DEFAULT_MAX_PRICE;
  }

  const highestPrice = Math.max(
    ...products.map((product) => getEffectivePrice(product)),
    0,
  );
  return highestPrice > 0 ? highestPrice : CATALOG_DEFAULT_MAX_PRICE;
}

function resolveRecencyScore(product: GlobalProductCard): number {
  return Math.max(
    new Date(String(product.createdAt || 0)).getTime(),
    new Date(String(product.updatedAt || 0)).getTime(),
  );
}

function buildHeroProducts(products: GlobalProductCard[]): GlobalProductCard[] {
  const slides: GlobalProductCard[] = [];
  const selectedIds = new Set<string>();

  const pickFirst = (candidates: GlobalProductCard[]) => {
    const product = candidates.find((entry) => !selectedIds.has(entry.id));
    if (!product) {
      return;
    }

    selectedIds.add(product.id);
    slides.push(product);
  };

  const offered = [...products]
    .filter((product) => hasOffer(product))
    .sort((left, right) => {
      const leftDiscount = Number(left.discountPercentage || 0);
      const rightDiscount = Number(right.discountPercentage || 0);
      if (rightDiscount !== leftDiscount) {
        return rightDiscount - leftDiscount;
      }
      return resolveRecencyScore(right) - resolveRecencyScore(left);
    });

  const rated = [...products]
    .filter((product) => Number(product.rating || 0) > 0)
    .sort((left, right) => {
      const scoreDiff = Number(right.rating || 0) - Number(left.rating || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return resolveRecencyScore(right) - resolveRecencyScore(left);
    });

  const newest = [...products].sort(
    (left, right) => resolveRecencyScore(right) - resolveRecencyScore(left),
  );

  const inStock = [...products]
    .filter((product) => Number(product.stockQuantity || 0) > 0)
    .sort((left, right) => {
      const stockDiff =
        Number(right.stockQuantity || 0) - Number(left.stockQuantity || 0);
      if (stockDiff !== 0) {
        return stockDiff;
      }
      return resolveRecencyScore(right) - resolveRecencyScore(left);
    });

  pickFirst(offered);
  pickFirst(rated);
  pickFirst(newest);
  pickFirst(inStock);

  for (const product of products) {
    if (slides.length >= 4) {
      break;
    }

    if (selectedIds.has(product.id)) {
      continue;
    }

    selectedIds.add(product.id);
    slides.push(product);
  }

  return slides.slice(0, 4);
}

const CATALOG_CACHE_REVALIDATE_SECONDS = 45;

interface CachedCatalogBaseData {
  organizations: PublicOrganization[];
  totalOrganizations: number;
  businessConfigEntries: Array<[string, Record<string, unknown>]>;
}

const fetchCachedCatalogBaseData = unstable_cache(
  async (): Promise<CachedCatalogBaseData> => {
    const { organizations, totalOrganizations } = await fetchActiveOrganizations();
    if (organizations.length === 0) {
      return { organizations: [], totalOrganizations: 0, businessConfigEntries: [] };
    }

    const organizationIds = organizations.map((org) => org.id);
    const businessConfigMap = await fetchBusinessConfigLocations(organizationIds);

    return {
      organizations,
      totalOrganizations,
      businessConfigEntries: Array.from(businessConfigMap.entries()),
    };
  },
  ['global-catalog-base-data'],
  { revalidate: CATALOG_CACHE_REVALIDATE_SECONDS, tags: ['catalog'] }
);

export async function fetchGlobalCatalogSnapshot(
  requestHost: string | null | undefined,
  input: CatalogQueryState,
): Promise<GlobalCatalogSnapshot> {
  const emptySnapshot: GlobalCatalogSnapshot = {
    products: [],
    heroProducts: [],
    totalProducts: 0,
    totalOrganizations: 0,
    matchingOrganizations: 0,
    categories: [],
    countries: [],
    departments: [],
    cities: [],
    maxPrice: CATALOG_DEFAULT_MAX_PRICE,
    activeMarketplaceCategory: null,
  };

  let baseData: CachedCatalogBaseData;

  try {
    baseData = await fetchCachedCatalogBaseData();
  } catch (error) {
    console.error('[GlobalCatalog] Failed to fetch base data:', error instanceof Error ? error.message : JSON.stringify(error));
    return emptySnapshot;
  }

  const { organizations: allOrganizations, totalOrganizations, businessConfigEntries } = baseData;

  if (allOrganizations.length === 0) {
    return emptySnapshot;
  }

  // Si hay filtros de categoría de marketplace, restringir a las orgs vinculadas a esos rubros.
  let organizations = allOrganizations;
  let activeMarketplaceCategory: ActiveMarketplaceCategory | null = null;

  if (input.categories.length > 0) {
    try {
      const [marketplaceOrgIds, categoryDetail] = await Promise.all([
        resolveMarketplaceCategoryOrgIds(input.categories),
        fetchMarketplaceCategoryBySlug(input.categories[0]),
      ]);
      activeMarketplaceCategory = categoryDetail;
      if (marketplaceOrgIds.size > 0) {
        organizations = allOrganizations.filter((org) => marketplaceOrgIds.has(org.id));
      }
    } catch (err) {
      console.warn('[GlobalCatalog] Marketplace category filter failed, using all orgs:', err);
    }
  }

  try {
    const organizationIds = organizations.map((organization) => organization.id);
    const rawProducts = await fetchMatchingProducts(organizationIds, input);
    const categoryIds = Array.from(
      new Set(
        rawProducts
          .map((product) => product.category_id)
          .filter(
            (categoryId): categoryId is string =>
              typeof categoryId === "string" && categoryId.length > 0,
          ),
      ),
    );
    const categoryMap = await fetchCategoryMap(categoryIds);
    const businessConfigMap = new Map(businessConfigEntries);
    const mappedProducts = mapProductsToCards(
      rawProducts,
      organizations,
      categoryMap,
      businessConfigMap,
      requestHost,
    );

    const [categories, countries, departments, cities] = await Promise.all([
      fetchMarketplaceCategoryOptions(),
      Promise.resolve(buildLocationOptions(mappedProducts, "country")),
      Promise.resolve(buildLocationOptions(mappedProducts, "department", "country")),
      Promise.resolve(buildLocationOptions(mappedProducts, "city", "department")),
    ]);
    const filteredProducts = filterProducts(mappedProducts, input);
    const sortedProducts = sortProducts(filteredProducts, input.sortBy);
    const start = (input.page - 1) * input.itemsPerPage;
    const matchingOrganizations = new Set(
      filteredProducts.map((product) => product.organizationId).filter(Boolean),
    ).size;
    const productsForMaxPrice = mappedProducts;

    return {
      products: sortedProducts.slice(start, start + input.itemsPerPage),
      heroProducts: buildHeroProducts(sortedProducts),
      totalProducts: sortedProducts.length,
      totalOrganizations,
      matchingOrganizations,
      categories,
      countries,
      departments,
      cities,
      maxPrice: resolveMaxPrice(productsForMaxPrice),
      activeMarketplaceCategory,
    };
  } catch (error) {
    console.error('[GlobalCatalog] Failed to fetch catalog products:', error instanceof Error ? error.message : JSON.stringify(error));
    return emptySnapshot;
  }
}
