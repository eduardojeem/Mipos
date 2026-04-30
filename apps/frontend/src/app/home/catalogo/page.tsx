import { notFound, redirect } from 'next/navigation';
import {
  CATALOG_DEFAULT_PAGE_SIZE,
  normalizeCatalogQuery,
  buildCatalogSearchParams,
  type CatalogQueryRecord,
} from '@/app/catalog/catalog-query';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { fetchGlobalCatalogSnapshot } from '@/lib/public-site/global-catalog-data';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { ProductGrid } from '../components/marketplace/ProductGrid';
import {
  GlobalCatalogDesktopFilters,
  GlobalCatalogPagination,
  GlobalCatalogToolbar,
} from '../components/marketplace/GlobalCatalogControls';
import { GlobalCatalogHeroCarousel } from '../components/marketplace/GlobalCatalogHeroCarousel';
import { ShoppingBag } from 'lucide-react';

function normalizeRootCatalogSearchParams(searchParams: CatalogQueryRecord): CatalogQueryRecord {
  const normalized: CatalogQueryRecord = { ...searchParams };

  if (!normalized.search && normalized.q) {
    normalized.search = normalized.q;
  }

  return normalized;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogQueryRecord>;
}) {
  const context = await resolveRequestTenantContext();
  const rawSearchParams = await searchParams;

  if (context.kind !== 'root') {
    notFound();
  }

  const queryState = normalizeCatalogQuery(normalizeRootCatalogSearchParams(rawSearchParams));
  const snapshot = await fetchGlobalCatalogSnapshot(context.hostname, queryState);
  const totalPages = Math.max(1, Math.ceil(snapshot.totalProducts / queryState.itemsPerPage));
  const hasActiveFilters = Boolean(
    queryState.search ||
      queryState.categories.length > 0 ||
      queryState.sortBy !== 'popular' ||
      queryState.minPrice > 0 ||
      queryState.maxPrice !== null ||
      queryState.onSale ||
      queryState.inStock === false ||
      queryState.rating ||
      queryState.department ||
      queryState.city
  );

  if (snapshot.totalProducts > 0 && queryState.page > totalPages) {
    const params = buildCatalogSearchParams(
      {
        ...queryState,
        page: totalPages,
      },
      {
        defaultItemsPerPage: CATALOG_DEFAULT_PAGE_SIZE,
        maxPriceCeiling: snapshot.maxPrice,
      }
    );

    redirect(`/home/catalogo?${params.toString()}`);
  }

  return (
    <MarketplaceLayout searchQuery={queryState.search}>
      <header className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <GlobalCatalogHeroCarousel
          products={snapshot.heroProducts}
          totalProducts={snapshot.totalProducts}
          matchingOrganizations={snapshot.matchingOrganizations}
          searchQuery={queryState.search}
          hasActiveFilters={hasActiveFilters}
        />
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <GlobalCatalogToolbar
          state={queryState}
          categories={snapshot.categories}
          maxPrice={snapshot.maxPrice}
          totalProducts={snapshot.totalProducts}
          totalOrganizations={snapshot.totalOrganizations}
          matchingOrganizations={snapshot.matchingOrganizations}
          departments={snapshot.departments}
          cities={snapshot.cities}
        />

        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <GlobalCatalogDesktopFilters
            state={queryState}
            categories={snapshot.categories}
            maxPrice={snapshot.maxPrice}
          />

          <div>
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <ShoppingBag className="h-4 w-4" />
              {snapshot.totalProducts} productos listados
            </div>

            {snapshot.products.length > 0 ? (
              <>
                <ProductGrid products={snapshot.products} className="mt-0" />
                <GlobalCatalogPagination
                  state={queryState}
                  totalProducts={snapshot.totalProducts}
                  maxPrice={snapshot.maxPrice}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
                <p className="text-xl font-medium text-slate-900 dark:text-white">
                  No encontramos productos con esos criterios
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Ajusta la busqueda, cambia el rango de precio o limpia los filtros activos para
                  volver al universo completo del catalogo.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
}
