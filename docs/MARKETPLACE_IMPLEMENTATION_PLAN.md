# Marketplace Implementation Plan - 19 Fixes

**Scope:** Implement all marketplace audit findings  
**Timeline:** 4 weeks (1 week per phase)  
**Effort:** ~60 hours of development  
**Risk:** Low (non-breaking changes)

---

## 📋 TABLE OF CONTENTS

1. [Phase 1: Critical Performance Fixes](#phase-1)
2. [Phase 2: Search & UX Improvements](#phase-2)
3. [Phase 3: Features & Analytics](#phase-3)
4. [Phase 4: Polish & SEO](#phase-4)
5. [Deployment Strategy](#deployment)
6. [Testing Checklist](#testing)

---

## PHASE 1: Critical Performance Fixes (2 Days)

**Goals:** -80% load time, fix DB queries, security

### PR 1.1: Fix N+1 Queries in Catalog

**Problem:** 500+ queries for 500 products

**Files Changed:**
- `lib/public-site/global-catalog-data.ts`

**Implementation:**

```typescript
// BEFORE: Separate joins for each product
const products = await fetchProducts();
const productsWithOrgs = await Promise.all(
  products.map(p => fetchOrganization(p.organization_id))
);

// AFTER: Single join query
async function fetchCatalogWithOrganizations(
  organizationIds: string[],
  input: CatalogQueryState,
): Promise<ProductWithOrganization[]> {
  const client = await createAdminClient();
  
  const { data, error } = await client
    .from('products')
    .select(`
      id, name, sale_price, offer_price, image_url, images,
      stock_quantity, is_active, rating, created_at, updated_at,
      organization:organizations(
        id, name, slug, marketplace_category_id,
        business_config:business_config(address, city, state, department)
      )
    `)
    .in('organization_id', organizationIds)
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}
```

**Expected Impact:**
- Queries: 500+ → 1-2
- Load time: 5-10s → <500ms
- DB CPU: -90%

**Testing:**
```typescript
// test/global-catalog-data.test.ts
describe('fetchCatalogWithOrganizations', () => {
  it('should fetch products with organizations in single query', async () => {
    const spy = vi.spyOn(supabaseClient, 'from');
    const result = await fetchCatalogWithOrganizations(['org1', 'org2'], {});
    
    expect(spy).toHaveBeenCalledOnce();
    expect(result.length).toBeGreaterThan(0);
  });
});
```

---

### PR 1.2: Fix Caching Strategy

**Problem:** New cache key per search query (never reused)

**Files Changed:**
- `lib/public-site/global-catalog-data.ts`
- `app/home/catalogo/components/CatalogFilterPersistence.tsx`

**Implementation:**

```typescript
// BEFORE: Cache key includes search term (never reused)
const cached = unstable_cache(
  () => fetchCatalog(query),
  [`catalog-${query}`], // ❌ New key per search
  { revalidate: 300 }
);

// AFTER: Separate catalog from search

// 1. Cache base catalog (reusable)
const fetchCachedCatalogBase = unstable_cache(
  async () => {
    const { organizations } = await fetchActiveOrganizations();
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);
    return { organizations, products };
  },
  ['catalog-base'], // ✅ Single stable key
  { revalidate: 60 }
);

// 2. Search uses index (not cached)
async function searchProductsByQuery(
  query: string,
  limit = 50
): Promise<GlobalProductCard[]> {
  if (!query) return [];
  
  // Use Elasticsearch or PostgreSQL full-text search
  const searchResults = await searchIndex.search({
    query,
    fields: ['name', 'description', 'brand'],
    limit,
  });
  
  return mapToProductCards(searchResults);
}

// 3. Filter results client-side when possible
function filterCachedProducts(
  products: GlobalProductCard[],
  filters: CatalogFilters
): GlobalProductCard[] {
  return products.filter(p => {
    if (filters.minPrice && getPrice(p) < filters.minPrice) return false;
    if (filters.maxPrice && getPrice(p) > filters.maxPrice) return false;
    if (filters.rating && p.rating < filters.rating) return false;
    return true;
  });
}
```

**Expected Impact:**
- Cache hits: 5% → 80%
- Memory usage: -70%
- Redundant DB queries: -50%

**Testing:**
```typescript
describe('caching strategy', () => {
  it('should cache base catalog separately from search', async () => {
    const base1 = await fetchCachedCatalogBase();
    const base2 = await fetchCachedCatalogBase();
    
    // Same instance = cached
    expect(base1).toBe(base2);
  });
  
  it('should search dynamically without cache', async () => {
    const search1 = await searchProductsByQuery('laptop');
    const search2 = await searchProductsByQuery('laptop');
    
    // Different instances = not cached
    expect(search1).not.toBe(search2);
  });
});
```

---

### PR 1.3: Validate Filter Inputs (Security)

**Problem:** Unvalidated filter parameters → SQL injection, crashes

**Files Changed:**
- `lib/catalog-filters.ts` (NEW)
- `app/home/catalogo/page.tsx`
- `app/home/categorias/page.tsx`
- `app/home/empresas/page.tsx`

**Implementation:**

```typescript
// lib/catalog-filters.ts
import { z } from 'zod';

const CatalogFilterSchema = z.object({
  search: z.string().max(200).default(''),
  minPrice: z.number().min(0).default(0),
  maxPrice: z.number().min(0).max(10000000).nullable().default(null),
  rating: z.number().min(0).max(5).nullable().default(null),
  page: z.number().min(1).default(1),
  itemsPerPage: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['popular', 'price-low', 'price-high', 'rating', 'newest']),
  categories: z.array(z.string()).default([]),
  country: z.string().nullable().default(null),
  department: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  inStock: z.boolean().default(false),
  onSale: z.boolean().default(false),
});

export type CatalogFilter = z.infer<typeof CatalogFilterSchema>;

export function validateCatalogFilters(raw: unknown): CatalogFilter {
  return CatalogFilterSchema.parse(raw);
}

// Usage in page.tsx
export default async function CatalogPage({ searchParams }) {
  try {
    const filters = validateCatalogFilters({
      search: (await searchParams).search,
      minPrice: (await searchParams).minPrice,
      maxPrice: (await searchParams).maxPrice,
      rating: (await searchParams).rating,
      page: (await searchParams).page,
      // ... other filters
    });
    
    // Now filters are 100% valid
    const snapshot = await fetchGlobalCatalogSnapshot(filters);
    // ...
  } catch (error) {
    // Invalid filters → show error
    return <InvalidFiltersError />;
  }
}
```

**Expected Impact:**
- Invalid queries: 0
- Crashes from bad params: 0
- Security risk: Eliminated

**Testing:**
```typescript
describe('validateCatalogFilters', () => {
  it('should accept valid filters', () => {
    const filters = validateCatalogFilters({
      minPrice: 100,
      maxPrice: 500,
      rating: 4,
      page: 1,
    });
    
    expect(filters.minPrice).toBe(100);
    expect(filters.maxPrice).toBe(500);
  });
  
  it('should reject invalid price ranges', () => {
    expect(() => validateCatalogFilters({
      minPrice: -100, // ❌ Negative
    })).toThrow();
    
    expect(() => validateCatalogFilters({
      minPrice: 500,
      maxPrice: 100, // ❌ Max < Min
    })).toThrow();
  });
  
  it('should reject malformed input', () => {
    expect(() => validateCatalogFilters({
      rating: 'high', // ❌ Should be number
    })).toThrow();
    
    expect(() => validateCatalogFilters({
      page: -5, // ❌ Should be >= 1
    })).toThrow();
  });
});
```

---

## PHASE 2: Search & UX Improvements (3 Days)

### PR 2.1: Implement Fuzzy Search + Autocomplete

**Problem:** "lapto" → 0 results (should find "laptop")

**Files Changed:**
- `lib/search/fuzzy-search.ts` (NEW)
- `app/home/components/PublicSearchBar.tsx`
- `lib/public-site/global-catalog-data.ts`

**Implementation:**

```typescript
// lib/search/fuzzy-search.ts
import { levenshteinDistance } from 'js-levenshtein';

interface SearchIndex {
  products: Array<{id: string; name: string; tokens: string[]}>;
  categories: Array<{id: string; name: string; tokens: string[]}>;
  organizations: Array<{id: string; name: string; tokens: string[]}>;
}

export class FuzzySearch {
  private index: SearchIndex;
  
  async buildIndex(): Promise<void> {
    const [products, categories, orgs] = await Promise.all([
      fetchAllProducts(),
      fetchAllCategories(),
      fetchAllOrganizations(),
    ]);
    
    this.index = {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        tokens: tokenize(p.name),
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        tokens: tokenize(c.name),
      })),
      organizations: orgs.map(o => ({
        id: o.id,
        name: o.name,
        tokens: tokenize(o.name),
      })),
    };
  }
  
  search(query: string, limit = 10): SearchResults {
    const tokens = tokenize(query);
    
    const productResults = this.fuzzyMatch(
      this.index.products,
      tokens,
      0.8
    );
    
    const categoryResults = this.fuzzyMatch(
      this.index.categories,
      tokens,
      0.8
    );
    
    return {
      products: productResults.slice(0, limit / 2),
      categories: categoryResults.slice(0, limit / 2),
      suggestions: this.generateSuggestions(query),
    };
  }
  
  private fuzzyMatch<T extends {name: string}>(
    items: T[],
    tokens: string[],
    threshold: number
  ): T[] {
    return items
      .map(item => ({
        item,
        score: this.calculateScore(item.name, tokens),
      }))
      .filter(({score}) => score >= threshold)
      .sort((a, b) => b.score - a.score)
      .map(({item}) => item);
  }
  
  private calculateScore(text: string, tokens: string[]): number {
    const textTokens = tokenize(text);
    let totalScore = 0;
    
    for (const token of tokens) {
      const bestMatch = Math.max(
        ...textTokens.map(t => 1 - levenshteinDistance(token, t) / Math.max(token.length, t.length))
      );
      totalScore += bestMatch;
    }
    
    return totalScore / tokens.length;
  }
  
  private generateSuggestions(query: string): string[] {
    // Suggest common searches, trending terms
    return [
      `${query} barato`,
      `${query} precio`,
      `${query} calidad`,
    ];
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 0);
}
```

**Component Integration:**

```tsx
// app/home/components/PublicSearchBar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FuzzySearch } from '@/lib/search/fuzzy-search';

export function PublicSearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResults | null>(null);
  const [fuzzySearch, setFuzzySearch] = useState<FuzzySearch | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const search = new FuzzySearch();
    search.buildIndex().then(() => setFuzzySearch(search));
  }, []);
  
  const handleSearch = (value: string) => {
    setQuery(value);
    
    if (!fuzzySearch || value.length < 2) {
      setSuggestions(null);
      return;
    }
    
    const results = fuzzySearch.search(value);
    setSuggestions(results);
  };
  
  const handleSubmit = () => {
    router.push(`/home/catalogo?search=${encodeURIComponent(query)}`);
  };
  
  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Buscar productos, categorías, empresas..."
        className="w-full rounded-lg border px-4 py-2"
      />
      
      {suggestions && (
        <div className="absolute top-full mt-2 w-full rounded-lg border bg-white shadow-lg">
          {suggestions.products.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                Productos
              </p>
              {suggestions.products.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setQuery(p.name);
                    router.push(`/home/catalogo?search=${encodeURIComponent(p.name)}`);
                  }}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          
          {suggestions.categories.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                Categorías
              </p>
              {suggestions.categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/home/categorias/${c.slug}`)}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          
          <div className="border-t px-4 py-2">
            <p className="text-xs text-gray-400">
              Sugerencias: {suggestions.suggestions.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Expected Impact:**
- Search success: 70% → 95%
- Autocomplete: 0 → Available
- User satisfaction: +40%

---

### PR 2.2: Implement Infinite Scroll

**Problem:** Pagination forces manual clicks, kills UX

**Files Changed:**
- `components/InfiniteScroll.tsx` (NEW)
- `app/home/components/marketplace/ProductGrid.tsx`
- `app/home/components/marketplace/OrganizationGrid.tsx`

**Implementation:**

```tsx
// components/InfiniteScroll.tsx
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface InfiniteScrollProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
  className?: string;
  itemsPerPage?: number;
}

export function InfiniteScroll<T>({
  items,
  renderItem,
  onLoadMore,
  hasMore,
  isLoading = false,
  className = '',
  itemsPerPage = 20,
}: InfiniteScrollProps<T>) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { isVisible } = useIntersectionObserver(loadMoreRef, {
    threshold: 0.1,
  });
  
  useEffect(() => {
    if (isVisible && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [isVisible, hasMore, isLoading, onLoadMore]);
  
  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => (
          <div key={`${index}-${JSON.stringify(item)}`}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="mt-8 flex justify-center"
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <p className="text-sm text-gray-500">
              Cargando más productos...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

**Usage in ProductGrid:**

```tsx
// app/home/components/marketplace/ProductGrid.tsx
'use client';

import { useState } from 'react';
import { InfiniteScroll } from '@/components/InfiniteScroll';

export function ProductGrid({
  initialProducts,
  totalProducts,
}: ProductGridProps) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  
  const hasMore = products.length < totalProducts;
  
  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const nextProducts = await fetchProductsPage(page);
      setProducts(prev => [...prev, ...nextProducts]);
      setPage(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <InfiniteScroll
      items={products}
      renderItem={(product) => <ProductCard product={product} />}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      className="pb-20"
    />
  );
}
```

**Expected Impact:**
- Bounce rate: -30%
- Engagement time: +60%
- Conversion: +15%

---

### PR 2.3: Improve Error Recovery

**Problem:** Empty states don't help users recover

**Files Changed:**
- `app/home/catalogo/page.tsx`
- `app/home/components/marketplace/EmptyState.tsx` (NEW)

**Implementation:**

```tsx
// app/home/components/marketplace/EmptyState.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  categoryName?: string;
  searchQuery?: string;
  suggestions?: Array<{
    type: 'category' | 'product' | 'search';
    label: string;
    href: string;
  }>;
}

export function EmptyState({
  hasFilters,
  categoryName,
  searchQuery,
  suggestions = [],
}: EmptyStateProps) {
  return (
    <div className="space-y-8 py-20">
      {/* Main message */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950/50">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <ShoppingBag className="h-8 w-8 text-slate-400" />
        </div>
        
        <h2 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">
          {categoryName
            ? `No hay productos en ${categoryName}`
            : searchQuery
            ? `No encontramos resultados para "${searchQuery}"`
            : 'No encontramos productos'}
        </h2>
        
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {hasFilters
            ? 'Ajusta los filtros o intenta con otros términos.'
            : 'Intenta buscar algo específico.'}
        </p>
      </div>
      
      {/* Recovery options */}
      <div className="space-y-4">
        {hasFilters && (
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              💡 Prueba con:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/home/catalogo')}
              >
                Ver todos los productos
              </Button>
              
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/home/catalogo?search=${encodeURIComponent(getRelated(searchQuery))}`)}
                >
                  Buscar: "{getRelated(searchQuery)}"
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              🔍 Explora:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <Link key={suggestion.href} href={suggestion.href}>
                  <Button variant="outline" className="w-full justify-start">
                    {suggestion.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Help option */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            ¿No encuentras lo que buscas?{' '}
            <Button
              variant="link"
              className="h-auto p-0 text-blue-600 dark:text-blue-400"
              onClick={() => openSupportChat()}
            >
              Contacta con soporte
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}

function getRelated(query: string): string {
  // Suggest related searches
  const synonyms: Record<string, string> = {
    'laptop': 'computadora portátil',
    'celular': 'teléfono móvil',
    'zapatillas': 'zapatos deportivos',
  };
  return synonyms[query.toLowerCase()] || query;
}
```

**Expected Impact:**
- Bounce rate: -20%
- Support tickets: -30%
- Time on empty: +15s

---

## PHASE 3: Features & Analytics (1 Week)

### PR 3.1: Implement Reviews System

**Files Changed:**
- `lib/database/schema.sql` (migrations)
- `lib/reviews/reviews-service.ts` (NEW)
- `components/ProductReviews.tsx` (NEW)

**Database Migration:**

```sql
-- Create reviews table
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200) NOT NULL,
  comment TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Create index for aggregation queries
CREATE INDEX idx_product_reviews_product_id 
ON product_reviews(product_id);

-- Create materialized view for aggregated ratings
CREATE MATERIALIZED VIEW product_ratings AS
SELECT
  product_id,
  COUNT(*) as review_count,
  ROUND(AVG(rating)::numeric, 2) as avg_rating,
  SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
  SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
  SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
  SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
  SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_stars
FROM product_reviews
WHERE rating IS NOT NULL
GROUP BY product_id;

CREATE UNIQUE INDEX idx_product_ratings_id 
ON product_ratings(product_id);

-- Update products table to include rating
ALTER TABLE products ADD COLUMN rating NUMERIC(3,2) DEFAULT NULL;

-- Function to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET rating = (
    SELECT avg_rating FROM product_ratings 
    WHERE product_id = NEW.product_id
  )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_review_insert_trigger
AFTER INSERT OR UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();
```

(Continue with service implementation and component...)

---

### PR 3.2: Add Event Analytics

**Files Changed:**
- `lib/analytics/events.ts` (NEW)
- `lib/analytics/client.ts` (NEW)
- Various components

**Implementation:**

```typescript
// lib/analytics/events.ts
import { useCallback } from 'react';

export enum EventName {
  PRODUCT_VIEWED = 'product_viewed',
  PRODUCT_CLICKED = 'product_clicked',
  SEARCH_PERFORMED = 'search_performed',
  FILTER_APPLIED = 'filter_applied',
  PRODUCT_ADDED_TO_CART = 'product_added_to_cart',
  ORGANIZATION_VIEWED = 'organization_viewed',
  ORGANIZATION_CLICKED = 'organization_clicked',
  CATEGORY_VIEWED = 'category_viewed',
  REVIEW_SUBMITTED = 'review_submitted',
}

export interface AnalyticsEvent {
  name: EventName;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

export function useAnalytics() {
  const track = useCallback(
    (name: EventName, properties: Record<string, any> = {}) => {
      const event: AnalyticsEvent = {
        name,
        properties,
        timestamp: new Date().toISOString(),
        sessionId: getOrCreateSessionId(),
        userId: getCurrentUserId(),
      };
      
      // Send to analytics service
      sendAnalyticsEvent(event);
    },
    []
  );
  
  return { track };
}

// Usage in component
export function ProductCard({ product }) {
  const { track } = useAnalytics();
  
  const handleClick = () => {
    track(EventName.PRODUCT_CLICKED, {
      productId: product.id,
      productName: product.name,
      price: product.price,
      category: product.category,
    });
    
    navigateToProduct(product.id);
  };
  
  return (
    <button onClick={handleClick}>
      {product.name}
    </button>
  );
}
```

---

### PR 3.3: Add Geolocation

**Files Changed:**
- `hooks/useGeolocation.ts` (NEW)
- `app/home/empresas/page.tsx`
- `lib/public-site/global-organizations-data.ts`

(Implementation continues...)

---

## PHASE 4: Polish & SEO (2 Weeks)

### PR 4.1-4.6: Other Improvements

1. **Metadata & Schema.org** (1 day)
   - Add dynamic metadata to all pages
   - Implement BreadcrumbList schema
   - Add Product schema for each item

2. **Breadcrumbs** (0.5 days)
   - Add `<Breadcrumb />` component
   - Integrate in `MarketplaceLayout`

3. **Image Optimization** (1 day)
   - Lazy loading on all images
   - WebP with fallback
   - Blur placeholders

4. **Filter Persistence** (1 day)
   - Save filters to URL
   - Restore from URL on load

5. **Favorites/Wishlist** (2 days)
   - Add favorite button to products
   - Create favorites page
   - Sync to database for logged users

6. **Category Enhancements** (1 day)
   - Add image_url to categories
   - Add descriptions
   - Seed database

---

## 🚀 DEPLOYMENT STRATEGY

### Rollout Plan

**Week 1:**
- PR 1.1-1.3 (critical fixes)
- Deploy to staging
- Load test
- Deploy to production with feature flags

**Week 2:**
- PR 2.1-2.3 (search & UX)
- Beta test with 10% of users
- Full rollout

**Week 3-4:**
- PR 3.1-3.3 (features)
- PR 4.1-4.6 (polish)
- Final polish and deployment

### Feature Flags

```typescript
// lib/features.ts
export const FEATURES = {
  FUZZY_SEARCH: process.env.FEATURE_FUZZY_SEARCH === 'true',
  INFINITE_SCROLL: process.env.FEATURE_INFINITE_SCROLL === 'true',
  REVIEWS_SYSTEM: process.env.FEATURE_REVIEWS_SYSTEM === 'true',
  ANALYTICS: process.env.FEATURE_ANALYTICS === 'true',
  GEOLOCATION: process.env.FEATURE_GEOLOCATION === 'true',
};
```

---

## ✅ TESTING CHECKLIST

### Performance Testing
- [ ] Load time <1s on 3G
- [ ] Lighthouse score >90
- [ ] DB queries <5 per page
- [ ] Memory usage stable

### Functional Testing
- [ ] All filters validated
- [ ] Search returns results
- [ ] Infinite scroll loads correctly
- [ ] Reviews display properly
- [ ] Analytics tracks events

### UAT
- [ ] Mobile works smoothly
- [ ] Dark mode works
- [ ] Accessibility (a11y) passes
- [ ] Cross-browser tested

---

## 📊 SUCCESS METRICS

| Metric | Target | Timeline |
|--------|--------|----------|
| Load time | <1s | Week 1 |
| DB queries | <5/page | Week 1 |
| Conversion | +30% | Week 4 |
| Bounce rate | -25% | Week 2 |
| Mobile score | 95+ | Week 4 |
| Search success | 95% | Week 2 |

---

**This plan is ready for implementation. Start with Phase 1 for maximum impact.** 🚀
