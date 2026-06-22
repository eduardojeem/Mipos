import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { getBestOffer, type Promotion as OfferPromotion } from '@/lib/offers';
import type { Category, Product } from '@/types';
import {
  CATALOG_DEFAULT_MAX_PRICE,
  type CatalogQueryState,
  type CatalogSortMode,
} from '@/app/catalog/catalog-query';

const CATALOG_PRODUCT_SELECT = [
  'id',
  'name',
  'sku',
  'description',
  'sale_price',
  'offer_price',
  'regular_price',
  'discount_percentage',
  'stock_quantity',
  'image_url',
  'images',
  'category_id',
  'is_active',
  'rating',
  'created_at',
  'updated_at',
].join(',');

const CATALOG_PRODUCT_SELECT_FALLBACK = [
  'id',
  'name',
  'sku',
  'description',
  'sale_price',
  'stock_quantity',
  'image_url',
  'images',
  'category_id',
  'is_active',
  'created_at',
  'updated_at',
].join(',');

type PromotionRow = {
  id: string;
  name: string;
  description?: string | null;
  discount_type: string;
  discount_value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | null;
  min_purchase_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  usage_count?: number | null;
};

type PromotionProductRow = {
  promotion_id: string;
  product_id: string;
};

interface CatalogFilterShape {
  search: string;
  categories: string[];
  inStock: boolean;
  onSale: boolean;
  minPrice: number;
  maxPrice: number | null;
  rating: number | null;
}

interface FilterableQuery<T> {
  eq(column: string, value: unknown): T;
  or(filters: string): T;
  in(column: string, values: string[]): T;
  gt(column: string, value: number): T;
  gte(column: string, value: number): T;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): T;
}

export interface PublicCatalogPageData {
  products: Product[];
  totalProducts: number;
  maxPrice: number;
}

export interface PublicCatalogSnapshot extends PublicCatalogPageData {
  categories: Category[];
}

export interface PublicCatalogPageInput extends CatalogQueryState {
  organizationId: string;
}

function sanitizeSearchTerm(search: string): string {
  return search.replace(/[,%]/g, ' ').trim();
}

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function normalizeDiscountType(value: string): OfferPromotion['discountType'] {
  switch (value) {
    case 'FIXED_AMOUNT':
    case 'BOGO':
    case 'FREE_SHIPPING':
      return value;
    case 'PERCENTAGE':
    default:
      return 'PERCENTAGE';
  }
}

function toOfferPromotion(row: PromotionRow): OfferPromotion {
  return {
    id: String(row.id),
    name: String(row.name || 'Promocion'),
    description: row.description || undefined,
    discountType: normalizeDiscountType(row.discount_type),
    discountValue: row.discount_value ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    isActive: Boolean(row.is_active),
    minPurchaseAmount: row.min_purchase_amount ?? undefined,
    maxDiscountAmount: row.max_discount_amount ?? undefined,
    usageLimit: row.usage_limit ?? undefined,
    usageCount: row.usage_count ?? undefined,
  };
}

function normalizePositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getEffectiveCatalogPrice(product: Pick<Product, 'sale_price' | 'offer_price'>): number {
  const salePrice = normalizePositiveNumber(product.sale_price) || 0;
  const offerPrice = normalizePositiveNumber(product.offer_price);
  return offerPrice && offerPrice < salePrice ? offerPrice : salePrice;
}

function hasCatalogDiscount(product: Pick<Product, 'sale_price' | 'offer_price' | 'discount_percentage'>): boolean {
  const salePrice = normalizePositiveNumber(product.sale_price) || 0;
  const offerPrice = normalizePositiveNumber(product.offer_price);
  const discount = Number(product.discount_percentage || 0);
  return Boolean((offerPrice && offerPrice < salePrice) || discount > 0);
}

function applyCatalogDatabaseFilters<T extends FilterableQuery<T>>(
  query: T,
  filters: CatalogFilterShape,
  options?: { includeRating?: boolean }
): T {
  const includeRating = options?.includeRating ?? true;
  const search = sanitizeSearchTerm(filters.search);

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  if (filters.categories.length > 0) {
    query = query.in('category_id', filters.categories);
  }

  if (filters.inStock) {
    query = query.gt('stock_quantity', 0);
  }

  if (includeRating && filters.rating) {
    query = query.gte('rating', filters.rating);
  }

  return query;
}

function sortCatalogProducts(products: Product[], sortBy: CatalogSortMode): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-low':
      sorted.sort((left, right) => {
        const diff = getEffectiveCatalogPrice(left) - getEffectiveCatalogPrice(right);
        if (diff !== 0) return diff;
        return String(left.name || '').localeCompare(String(right.name || ''), 'es');
      });
      break;
    case 'price-high':
      sorted.sort((left, right) => {
        const diff = getEffectiveCatalogPrice(right) - getEffectiveCatalogPrice(left);
        if (diff !== 0) return diff;
        return String(left.name || '').localeCompare(String(right.name || ''), 'es');
      });
      break;
    case 'rating':
      sorted.sort((left, right) => {
        const diff = Number(right.rating || 0) - Number(left.rating || 0);
        if (diff !== 0) return diff;
        return String(left.name || '').localeCompare(String(right.name || ''), 'es');
      });
      break;
    case 'newest':
      sorted.sort((left, right) => {
        const diff =
          new Date(String(right.created_at || 0)).getTime() -
          new Date(String(left.created_at || 0)).getTime();
        if (diff !== 0) return diff;
        return String(left.name || '').localeCompare(String(right.name || ''), 'es');
      });
      break;
    case 'name':
      sorted.sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'es'));
      break;
    case 'popular':
    default:
      sorted.sort((left, right) => {
        const updatedDiff =
          new Date(String(right.updated_at || 0)).getTime() -
          new Date(String(left.updated_at || 0)).getTime();
        if (updatedDiff !== 0) return updatedDiff;

        const createdDiff =
          new Date(String(right.created_at || 0)).getTime() -
          new Date(String(left.created_at || 0)).getTime();
        if (createdDiff !== 0) return createdDiff;

        return String(left.name || '').localeCompare(String(right.name || ''), 'es');
      });
      break;
  }

  return sorted;
}

export async function enrichPublicCatalogProductsWithOffers(
  organizationId: string,
  products: Product[]
): Promise<Product[]> {
  if (products.length === 0) {
    return products;
  }

  const client = await createAdminClient();
  const productIds = products.map((product) => String(product.id));

  const { data: promotions, error: promotionsError } = await client
    .from('promotions')
    .select(`
      id,
      name,
      description,
      discount_type,
      discount_value,
      start_date,
      end_date,
      is_active,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      usage_count
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (promotionsError) {
    throw promotionsError;
  }

  const promotionRows = ((promotions || []) as PromotionRow[]).map(toOfferPromotion);
  if (promotionRows.length === 0) {
    return products;
  }

  const promotionIds = promotionRows.map((promotion) => promotion.id);
  const { data: promotionProducts, error: promotionProductsError } = await client
    .from('promotions_products')
    .select('promotion_id, product_id')
    .in('promotion_id', promotionIds)
    .in('product_id', productIds);

  if (promotionProductsError) {
    throw promotionProductsError;
  }

  const productPromotions = new Map<string, OfferPromotion[]>();

  for (const row of (promotionProducts || []) as PromotionProductRow[]) {
    const promotion = promotionRows.find((entry) => entry.id === row.promotion_id);
    if (!promotion) {
      continue;
    }

    const current = productPromotions.get(String(row.product_id)) || [];
    current.push(promotion);
    productPromotions.set(String(row.product_id), current);
  }

  return products.map((product) => {
    const applicablePromotions = productPromotions.get(String(product.id)) || [];
    if (applicablePromotions.length === 0) {
      return product;
    }

    const basePrice = Number(product.sale_price || 0);
    const bestOffer = getBestOffer(basePrice, applicablePromotions);
    if (!bestOffer.promotion || !(bestOffer.offerPrice < basePrice)) {
      return product;
    }

    return {
      ...product,
      offer_price: bestOffer.offerPrice,
      regular_price: Number(product.regular_price || 0) > basePrice ? product.regular_price : basePrice,
      discount_percentage: Math.round(bestOffer.discountPercent),
    } as Product;
  });
}

async function fetchCatalogBaseProducts(
  organizationId: string,
  filters: CatalogFilterShape
): Promise<Product[]> {
  const client = await createAdminClient();
  const CATALOG_BATCH_SIZE = 500;

  const runQuery = async (
    selectClause: string,
    rangeFrom: number,
    rangeTo: number,
    options?: { fallbackMode?: boolean; skipDeletedFilter?: boolean; skipPublicFilter?: boolean }
  ) => {
    let query = client
      .from('products')
      .select(selectClause)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // is_public puede no existir en la DB — si el primer intento falla
    // con columna inexistente, se reintenta sin ese filtro.
    if (!options?.skipPublicFilter) {
      query = query.eq('is_public', true);
    }

    if (!options?.skipDeletedFilter) {
      query = query.is('deleted_at', null);
    }

    query = applyCatalogDatabaseFilters(query, filters, {
      includeRating: !options?.fallbackMode,
    });

    return query
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(rangeFrom, rangeTo);
  };

  const loadAllBatches = async (
    selectClause: string,
    options?: { fallbackMode?: boolean; skipDeletedFilter?: boolean; skipPublicFilter?: boolean }
  ) => {
    const rows: Product[] = [];
    let offset = 0;

    while (true) {
      const result = await runQuery(
        selectClause,
        offset,
        offset + CATALOG_BATCH_SIZE - 1,
        options
      );

      if (result.error) {
        return {
          data: [] as Product[],
          error: result.error,
        };
      }

      const batch = (result.data || []) as unknown as Product[];
      rows.push(...batch);

      if (batch.length < CATALOG_BATCH_SIZE) {
        return {
          data: rows,
          error: null,
        };
      }

      offset += CATALOG_BATCH_SIZE;
    }
  };

  let result = await loadAllBatches(CATALOG_PRODUCT_SELECT);

  // Fallback 1: columnas faltantes en select (rating, offer_price, etc.)
  // Mantener deleted_at y is_public si existen.
  if (result.error && isMissingColumnError(result.error)) {
    result = await loadAllBatches(CATALOG_PRODUCT_SELECT_FALLBACK, {
      fallbackMode: true,
    });
  }

  // Fallback 2: deleted_at no existe.
  if (result.error && isMissingColumnError(result.error)) {
    result = await loadAllBatches(CATALOG_PRODUCT_SELECT_FALLBACK, {
      fallbackMode: true,
      skipDeletedFilter: true,
    });
  }

  // Fallback 3: is_public tampoco existe.
  if (result.error && isMissingColumnError(result.error)) {
    result = await loadAllBatches(CATALOG_PRODUCT_SELECT_FALLBACK, {
      fallbackMode: true,
      skipDeletedFilter: true,
      skipPublicFilter: true,
    });
  }

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

function filterCatalogProducts(products: Product[], input: PublicCatalogPageInput): Product[] {
  return products.filter((product) => {
    if (input.onSale && !hasCatalogDiscount(product)) {
      return false;
    }

    const effectivePrice = getEffectiveCatalogPrice(product);
    if (input.minPrice > 0 && effectivePrice < input.minPrice) {
      return false;
    }

    if (input.maxPrice !== null && input.maxPrice > 0 && effectivePrice > input.maxPrice) {
      return false;
    }

    return true;
  });
}

function getCatalogMaxPrice(products: Product[]): number {
  if (products.length === 0) {
    return CATALOG_DEFAULT_MAX_PRICE;
  }

  const highestPrice = Math.max(...products.map((product) => getEffectiveCatalogPrice(product)), 0);
  return highestPrice > 0 ? highestPrice : CATALOG_DEFAULT_MAX_PRICE;
}

export async function fetchPublicCatalogPage(
  input: PublicCatalogPageInput
): Promise<PublicCatalogPageData> {
  const baseProducts = await fetchCatalogBaseProducts(input.organizationId, input);
  const enrichedProducts = await enrichPublicCatalogProductsWithOffers(input.organizationId, baseProducts);

  const productsForMaxPrice = input.onSale
    ? enrichedProducts.filter((product) => hasCatalogDiscount(product))
    : enrichedProducts;

  const maxPrice = getCatalogMaxPrice(productsForMaxPrice);
  const filteredProducts = filterCatalogProducts(enrichedProducts, input);
  const sortedProducts = sortCatalogProducts(filteredProducts, input.sortBy);
  const start = (input.page - 1) * input.itemsPerPage;

  return {
    products: sortedProducts.slice(start, start + input.itemsPerPage),
    totalProducts: sortedProducts.length,
    maxPrice,
  };
}

export async function fetchPublicCatalogCategories(organizationId: string): Promise<Category[]> {
  const client = await createAdminClient();

  // Buscar categorías con al menos un producto activo.
  // is_public y deleted_at pueden no existir — se manejan con fallback.
  const runProductsQuery = async (opts?: { skipPublic?: boolean; skipDeleted?: boolean }) => {
    let q = client
      .from('products')
      .select('category_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (!opts?.skipPublic) q = q.eq('is_public', true);
    if (!opts?.skipDeleted) q = q.is('deleted_at', null);
    return q;
  };

  let productsResult = await runProductsQuery();
  if (productsResult.error && isMissingColumnError(productsResult.error)) {
    productsResult = await runProductsQuery({ skipDeleted: true });
  }
  if (productsResult.error && isMissingColumnError(productsResult.error)) {
    productsResult = await runProductsQuery({ skipPublic: true, skipDeleted: true });
  }

  const activeCategoryIds = new Set<string>();
  if (!productsResult.error && productsResult.data) {
    productsResult.data.forEach((p: any) => {
      if (p.category_id) activeCategoryIds.add(String(p.category_id));
    });
  }

  const { data, error } = await client
    .from('categories')
    .select('id,name')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  const categories = (data || []) as Category[];
  if (activeCategoryIds.size > 0) {
    return categories.filter((c) => activeCategoryIds.has(c.id));
  }

  return categories;
}

export async function fetchPublicCatalogSnapshot(
  input: PublicCatalogPageInput
): Promise<PublicCatalogSnapshot> {
  const [catalogPage, categories] = await Promise.all([
    fetchPublicCatalogPage(input),
    fetchPublicCatalogCategories(input.organizationId),
  ]);

  return {
    ...catalogPage,
    categories,
  };
}

export async function fetchPublicCatalogProductById(
  organizationId: string,
  productId: string
): Promise<Product | null> {
  const client = await createAdminClient();

  const runQuery = async (
    selectClause: string,
    opts?: { skipPublic?: boolean }
  ) => {
    let q = client
      .from('products')
      .select(selectClause)
      .eq('organization_id', organizationId)
      .eq('id', productId)
      .eq('is_active', true);

    if (!opts?.skipPublic) {
      q = q.eq('is_public', true);
    }

    return q.maybeSingle();
  };

  let result = await runQuery(CATALOG_PRODUCT_SELECT);

  // Fallback 1: columnas de select faltantes
  if (result.error && isMissingColumnError(result.error)) {
    result = await runQuery(CATALOG_PRODUCT_SELECT_FALLBACK);
  }

  // Fallback 2: is_public no existe
  if (result.error && isMissingColumnError(result.error)) {
    result = await runQuery(CATALOG_PRODUCT_SELECT_FALLBACK, { skipPublic: true });
  }

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    return null;
  }

  const [enrichedProduct] = await enrichPublicCatalogProductsWithOffers(organizationId, [result.data as unknown as Product]);
  return enrichedProduct || null;
}
