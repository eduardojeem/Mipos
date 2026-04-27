import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { getBestOffer, validatePromotion, type Promotion as OfferPromotion } from '@/lib/offers';
import type { OfferQueryState } from '@/app/offers/offers-query';
import type {
  OfferCategory,
  OfferItem,
  OfferPagination,
  OfferProduct,
  OfferPromotion as PublicOfferPromotion,
} from '@/app/offers/offers-types';

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

type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  brand?: string | null;
  sale_price?: number | null;
  stock_quantity?: number | null;
  category_id?: string | null;
  image_url?: string | null;
  images?: unknown;
  is_active?: boolean | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

type OffersDataset = {
  offers: OfferItem[];
  categories: OfferCategory[];
};

export interface PublicOffersSnapshot {
  offers: OfferItem[];
  categories: OfferCategory[];
  pagination: OfferPagination;
}

export interface PublicOffersCarouselSnapshot {
  items: OfferItem[];
  source: 'configured-carousel' | 'active-promotions';
}

const OFFERS_PRODUCT_SELECT = [
  'id',
  'name',
  'sku',
  'description',
  'brand',
  'sale_price',
  'stock_quantity',
  'category_id',
  'image_url',
  'images',
  'is_active',
].join(',');

const OFFERS_PRODUCT_SELECT_FALLBACK = [
  'id',
  'name',
  'sku',
  'description',
  'sale_price',
  'stock_quantity',
  'category_id',
  'image_url',
  'images',
  'is_active',
].join(',');

function matchesPromotionStatus(
  promotion: OfferPromotion,
  status: OfferQueryState['status']
) {
  const validation = validatePromotion(promotion);

  switch (status) {
    case 'upcoming':
      return promotion.isActive && validation.isUpcoming;
    case 'ended':
      return validation.isExpired || !promotion.isActive;
    case 'active':
    default:
      return validation.isActive;
  }
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

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const code = String((error as { code?: string })?.code || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function normalizeImages(value: unknown): { url: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const url = typeof (entry as { url?: unknown }).url === 'string'
        ? (entry as { url: string }).url
        : null;

      return url ? { url } : null;
    })
    .filter((entry): entry is { url: string } => Boolean(entry));
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

function toPublicOfferPromotion(row: OfferPromotion): PublicOfferPromotion {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    discountType: row.discountType,
    discountValue: row.discountValue,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    minPurchaseAmount: row.minPurchaseAmount,
    maxDiscountAmount: row.maxDiscountAmount,
    usageLimit: row.usageLimit,
    usageCount: row.usageCount,
  };
}

function sortOffers(offers: OfferItem[], sort: OfferQueryState['sort']) {
  const sorted = [...offers];

  switch (sort) {
    case 'highest_discount':
      sorted.sort((left, right) => {
        const discountDiff = right.discountPercent - left.discountPercent;
        if (discountDiff !== 0) return discountDiff;
        const savingsDiff = right.savings - left.savings;
        if (savingsDiff !== 0) return savingsDiff;
        return left.product.name.localeCompare(right.product.name, 'es');
      });
      break;
    case 'price_low_high':
      sorted.sort((left, right) => {
        const priceDiff = left.offerPrice - right.offerPrice;
        if (priceDiff !== 0) return priceDiff;
        return left.product.name.localeCompare(right.product.name, 'es');
      });
      break;
    case 'price_high_low':
      sorted.sort((left, right) => {
        const priceDiff = right.offerPrice - left.offerPrice;
        if (priceDiff !== 0) return priceDiff;
        return left.product.name.localeCompare(right.product.name, 'es');
      });
      break;
    case 'ending_soon':
      sorted.sort((left, right) => {
        const leftEnd = left.promotion.endDate
          ? new Date(left.promotion.endDate).getTime()
          : Number.POSITIVE_INFINITY;
        const rightEnd = right.promotion.endDate
          ? new Date(right.promotion.endDate).getTime()
          : Number.POSITIVE_INFINITY;
        if (leftEnd !== rightEnd) return leftEnd - rightEnd;
        return right.savings - left.savings;
      });
      break;
    case 'best_savings':
    default:
      sorted.sort((left, right) => {
        const savingsDiff = right.savings - left.savings;
        if (savingsDiff !== 0) return savingsDiff;
        const discountDiff = right.discountPercent - left.discountPercent;
        if (discountDiff !== 0) return discountDiff;
        return left.product.name.localeCompare(right.product.name, 'es');
      });
      break;
  }

  return sorted;
}

function matchesSearch(offer: OfferItem, search: string) {
  if (!search) {
    return true;
  }

  const normalizedSearch = search.toLowerCase();
  const haystack = [
    offer.product.name,
    offer.product.sku,
    offer.product.description,
    offer.product.brand,
    offer.product.categoryName,
    offer.promotion.name,
    offer.promotion.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedSearch);
}

function buildCategories(offers: OfferItem[]): OfferCategory[] {
  return Array.from(
    new Map(
      offers
        .map((offer) => {
          if (!offer.product.category_id || !offer.product.categoryName) {
            return null;
          }

          return [offer.product.category_id, offer.product.categoryName] as const;
        })
        .filter((entry): entry is readonly [string, string] => Boolean(entry))
    )
  )
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

async function fetchOffersDataset(
  organizationId: string,
  status: OfferQueryState['status']
): Promise<OffersDataset> {
  const supabase = await createAdminClient();
  const { data: promotions, error: promotionsError } = await supabase
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
    .eq('organization_id', organizationId);

  if (promotionsError) {
    throw promotionsError;
  }

  const promotionRows = ((promotions || []) as PromotionRow[])
    .map((promotion) => ({
      row: promotion,
      normalized: toOfferPromotion(promotion),
    }))
    .filter(({ normalized }) => matchesPromotionStatus(normalized, status));

  if (promotionRows.length === 0) {
    return {
      offers: [],
      categories: [],
    };
  }

  const promotionIds = promotionRows.map(({ row }) => row.id);
  const { data: promotionProducts, error: promotionProductsError } = await supabase
    .from('promotions_products')
    .select('promotion_id, product_id')
    .eq('organization_id', organizationId)
    .in('promotion_id', promotionIds);

  if (promotionProductsError) {
    throw promotionProductsError;
  }

  const promotionProductRows = (promotionProducts || []) as PromotionProductRow[];
  const productIds = Array.from(new Set(promotionProductRows.map((row) => row.product_id)));
  if (productIds.length === 0) {
    return {
      offers: [],
      categories: [],
    };
  }

  const runProductsQuery = async (selectClause: string) =>
    supabase
      .from('products')
      .select(selectClause)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('id', productIds);

  let productsResult = await runProductsQuery(OFFERS_PRODUCT_SELECT);
  if (isMissingColumnError(productsResult.error)) {
    productsResult = await runProductsQuery(OFFERS_PRODUCT_SELECT_FALLBACK);
  }

  const { data: products, error: productsError } = productsResult;

  if (productsError) {
    throw productsError;
  }

  const productRows = (products || []) as ProductRow[];
  const promotionsById = new Map(
    promotionRows.map(({ row, normalized }) => [row.id, normalized])
  );
  const productPromotions = new Map<string, OfferPromotion[]>();

  for (const link of promotionProductRows) {
    const promotion = promotionsById.get(link.promotion_id);
    if (!promotion) {
      continue;
    }

    const existing = productPromotions.get(link.product_id) || [];
    existing.push(promotion);
    productPromotions.set(link.product_id, existing);
  }

  const categoryIds = Array.from(
    new Set(productRows.map((product) => product.category_id).filter(Boolean) as string[])
  );
  let categoriesMap = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in('id', categoryIds);

    if (categoriesError) {
      throw categoriesError;
    }

    categoriesMap = new Map(
      ((categories || []) as CategoryRow[]).map((category) => [String(category.id), String(category.name)])
    );
  }

  const offers = productRows
    .map((product): OfferItem | null => {
      const applicablePromotions = productPromotions.get(product.id) || [];
      const bestOffer = getBestOffer(Number(product.sale_price || 0), applicablePromotions);

      if (!bestOffer.promotion) {
        return null;
      }

      const normalizedImages = normalizeImages(product.images);
      const productModel: OfferProduct = {
        id: String(product.id),
        name: String(product.name || 'Producto'),
        sale_price: Number(product.sale_price || 0),
        price: Number(product.sale_price || 0),
        stock_quantity: Number(product.stock_quantity ?? 0),
        category_id: product.category_id || undefined,
        categoryName: product.category_id ? categoriesMap.get(String(product.category_id)) : undefined,
        sku: product.sku || undefined,
        description: product.description || undefined,
        brand: product.brand || undefined,
        images: normalizedImages,
        image: normalizedImages[0]?.url || product.image_url || '/api/placeholder/400/400',
      };

      return {
        product: productModel,
        promotion: toPublicOfferPromotion(bestOffer.promotion),
        basePrice: bestOffer.basePrice,
        offerPrice: bestOffer.offerPrice,
        discountPercent: bestOffer.discountPercent,
        savings: bestOffer.savings,
      };
    })
    .filter((offer): offer is OfferItem => Boolean(offer));

  return {
    offers,
    categories: buildCategories(offers),
  };
}

function selectCarouselItems(
  offers: OfferItem[],
  options?: { promotionIds?: string[]; limit?: number }
): OfferItem[] {
  const sortedOffers = sortOffers(offers, 'best_savings');
  const requestedPromotionIds = options?.promotionIds || [];
  const limit = options?.limit ?? 6;

  const bestOfferByPromotion = new Map<string, OfferItem>();
  for (const offer of sortedOffers) {
    if (!bestOfferByPromotion.has(offer.promotion.id)) {
      bestOfferByPromotion.set(offer.promotion.id, offer);
    }
  }

  if (requestedPromotionIds.length > 0) {
    return requestedPromotionIds
      .map((promotionId) => bestOfferByPromotion.get(promotionId) || null)
      .filter((offer): offer is OfferItem => Boolean(offer))
      .slice(0, limit);
  }

  return Array.from(bestOfferByPromotion.values()).slice(0, limit);
}

export async function fetchPublicOffersSnapshot(
  organizationId: string,
  queryState: OfferQueryState
): Promise<PublicOffersSnapshot> {
  const dataset = await fetchOffersDataset(organizationId, queryState.status);
  const categorySource = queryState.promotion
    ? dataset.offers.filter((offer) => offer.promotion.id === queryState.promotion)
    : dataset.offers;

  const filteredOffers = dataset.offers.filter((offer) => {
    const matchesCategory =
      !queryState.category || offer.product.category_id === queryState.category;
    const matchesPromotion =
      !queryState.promotion || offer.promotion.id === queryState.promotion;

    return matchesCategory && matchesPromotion && matchesSearch(offer, queryState.search);
  });

  const sortedOffers = sortOffers(filteredOffers, queryState.sort);
  const total = sortedOffers.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / queryState.limit);
  const currentPage = totalPages > 0 ? Math.min(queryState.page, totalPages) : 1;
  const offset = (currentPage - 1) * queryState.limit;
  const paginatedOffers = sortedOffers.slice(offset, offset + queryState.limit);

  return {
    offers: paginatedOffers,
    categories: buildCategories(categorySource),
    pagination: {
      page: currentPage,
      limit: queryState.limit,
      total,
      totalPages,
    },
  };
}

export async function fetchPublicOffersCarouselSnapshot(
  organizationId: string,
  options?: { promotionIds?: string[]; limit?: number }
): Promise<PublicOffersCarouselSnapshot> {
  const dataset = await fetchOffersDataset(organizationId, 'active');
  const requestedPromotionIds = options?.promotionIds?.filter(Boolean) || [];
  const limit = options?.limit ?? 6;
  const configuredItems = requestedPromotionIds.length > 0
    ? selectCarouselItems(dataset.offers, { promotionIds: requestedPromotionIds, limit })
    : [];

  if (configuredItems.length > 0) {
    const usedPromotionIds = new Set(configuredItems.map((item) => item.promotion.id));
    const fallbackItems = selectCarouselItems(dataset.offers, { limit })
      .filter((item) => !usedPromotionIds.has(item.promotion.id))
      .slice(0, Math.max(0, limit - configuredItems.length));

    return {
      items: [...configuredItems, ...fallbackItems],
      source: 'configured-carousel',
    };
  }

  return {
    items: selectCarouselItems(dataset.offers, { limit }),
    source: 'active-promotions',
  };
}
