import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { fetchPublicOffersSnapshot } from '@/lib/public-site/offers-data';
import { enrichPublicCatalogProductsWithOffers } from '@/lib/public-site/catalog-data';
import type { Product } from '@/types';
import type { OfferQueryState } from '@/app/offers/offers-query';
import type {
  HomeCategoryPreview,
  HomeOfferPreview,
  HomeProductPreview,
  TenantHomeSnapshot,
} from '@/app/home/home-types';

type CategoryRow = {
  id: string;
  name: string;
};

type ProductRow = Product;

function extractPrimaryImage(product: Pick<Product, 'image_url' | 'images'>): string {
  if (product.image_url) {
    return product.image_url;
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === 'string' && first) {
      return first;
    }

    if (first && typeof first === 'object' && typeof first.url === 'string' && first.url) {
      return first.url;
    }
  }

  return '/api/placeholder/480/360';
}

export async function fetchTenantHomeSnapshot(organizationId: string): Promise<TenantHomeSnapshot> {
  const adminClient = await createAdminClient();

  const [productCountResult, categoryCountResult, offersCountResult, categoriesResult, productsResult, categoryProductsResult] =
    await Promise.all([
      adminClient
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      adminClient
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      adminClient
        .from('promotions')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      adminClient
        .from('categories')
        .select('id,name')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .limit(6),
      adminClient
        .from('products')
        .select(`
          id,
          name,
          description,
          sale_price,
          offer_price,
          regular_price,
          discount_percentage,
          stock_quantity,
          image_url,
          images,
          category_id,
          is_active,
          created_at,
          updated_at
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(8),
      adminClient
        .from('products')
        .select('category_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true),
    ]);

  const categoryRows = Array.isArray(categoriesResult.data) ? (categoriesResult.data as CategoryRow[]) : [];
  const productRows = Array.isArray(productsResult.data) ? (productsResult.data as ProductRow[]) : [];
  const categoryProductRows = Array.isArray(categoryProductsResult.data)
    ? (categoryProductsResult.data as Array<{ category_id?: string | null }>)
    : [];

  const countsByCategory = new Map<string, number>();
  categoryProductRows.forEach((row) => {
    const categoryId = String(row?.category_id || '');
    if (!categoryId) {
      return;
    }

    countsByCategory.set(categoryId, (countsByCategory.get(categoryId) || 0) + 1);
  });

  const categories: HomeCategoryPreview[] = categoryRows.map((category) => ({
    id: String(category.id),
    name: String(category.name || 'Categoria'),
    productCount: countsByCategory.get(String(category.id)) || 0,
  }));

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const enrichedProducts = await enrichPublicCatalogProductsWithOffers(organizationId, productRows);

  const products: HomeProductPreview[] = enrichedProducts.map((product) => ({
    id: String(product.id),
    name: String(product.name || 'Producto'),
    description: String(product.description || ''),
    image: extractPrimaryImage(product),
    price: Number(product.sale_price || 0),
    offerPrice:
      typeof product.offer_price === 'number' && Number.isFinite(product.offer_price)
        ? product.offer_price
        : undefined,
    stock: Number(product.stock_quantity || 0),
    categoryName: product.category_id ? categoryNameById.get(String(product.category_id)) : undefined,
  }));

  const activeOffersQuery: OfferQueryState = {
    search: '',
    category: null,
    promotion: null,
    sort: 'best_savings',
    status: 'active',
    page: 1,
    limit: 6,
  };
  const offersSnapshot = await fetchPublicOffersSnapshot(organizationId, activeOffersQuery);
  const offers: HomeOfferPreview[] = offersSnapshot.offers.map((offer) => ({
    id: offer.product.id,
    name: offer.product.name,
    image: offer.product.images?.[0]?.url || offer.product.image || '/api/placeholder/480/360',
    promotionName: offer.promotion.name,
    basePrice: offer.basePrice,
    offerPrice: offer.offerPrice,
    discountPercent: offer.discountPercent,
    endDate: offer.promotion.endDate,
  }));

  return {
    stats: {
      products: productCountResult.count || products.length,
      categories: categoryCountResult.count || categories.length,
      offers: offersCountResult.count || offers.length,
    },
    categories,
    offers,
    products,
  };
}
