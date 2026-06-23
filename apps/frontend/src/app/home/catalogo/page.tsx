import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft, ShoppingBag,
  Store, Laptop, Shirt, ShoppingCart, Pill, Sparkles, Home,
  Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer,
  UtensilsCrossed, Layers3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CatalogFilterPersistence } from './components/CatalogFilterPersistence';
import {
  CATALOG_DEFAULT_PAGE_SIZE,
  normalizeCatalogQuery,
  buildCatalogSearchParams,
  type CatalogQueryRecord,
} from '@/app/catalog/catalog-query';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { fetchGlobalCatalogSnapshot } from '@/lib/public-site/global-catalog-data';
import { fetchGlobalCategoriesSnapshot } from '@/lib/public-site/global-categories-data';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { ProductGrid } from '../components/marketplace/ProductGrid';
import {
  GlobalCatalogDesktopFilters,
  GlobalCatalogPagination,
  GlobalCatalogToolbar,
} from '../components/marketplace/GlobalCatalogControls';
import { GlobalCatalogHeroCarousel } from '../components/marketplace/GlobalCatalogHeroCarousel';
import { CatalogCategoryBanner } from '../components/marketplace/CatalogCategoryBanner';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Laptop, Shirt, ShoppingCart, Pill, Sparkles,
  Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, Store, Layers3,
};
function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_MAP[name]) ? ICON_MAP[name] : Store;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogQueryRecord>;
}): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = Array.isArray(params.category) ? params.category[0] : params.category;

  if (categorySlug) {
    const snapshot = await fetchGlobalCategoriesSnapshot({ search: '', sortBy: 'products' });
    const cat = snapshot.categories.find((c) => c.slug === categorySlug);
    if (cat) {
      const title = `Productos de ${cat.name} | MITIENDA Marketplace`;
      const description = `Explora ${cat.productCount} productos de ${cat.organizationCount} empresas de ${cat.name} en el marketplace MITIENDA.`;
      return {
        title,
        description,
        alternates: { canonical: `/home/catalogo?category=${categorySlug}` },
        robots: { index: true, follow: true },
        openGraph: { title, description, type: 'website', siteName: 'MITIENDA Marketplace' },
        twitter: { card: 'summary_large_image', title, description },
      };
    }
  }

  return {
    title: 'Catálogo global | MITIENDA Marketplace',
    description: 'Explora productos de todas las empresas activas en MITIENDA. Filtra por categoría, precio, ubicación y más.',
    alternates: { canonical: '/home/catalogo' },
    robots: { index: true, follow: true },
    openGraph: {
      title: 'Catálogo global | MITIENDA Marketplace',
      description: 'Todos los productos disponibles en el marketplace de MITIENDA.',
      type: 'website',
      siteName: 'MITIENDA Marketplace',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Catálogo global | MITIENDA Marketplace',
      description: 'Todos los productos disponibles en el marketplace de MITIENDA.',
    },
  };
}

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
      queryState.country ||
      queryState.department ||
      queryState.city
  );

  if (snapshot.totalProducts > 0 && queryState.page > totalPages) {
    const params = buildCatalogSearchParams(
      { ...queryState, page: totalPages },
      { defaultItemsPerPage: CATALOG_DEFAULT_PAGE_SIZE, maxPriceCeiling: snapshot.maxPrice }
    );
    redirect(`/home/catalogo?${params.toString()}`);
  }

  return (
    <MarketplaceLayout searchQuery={queryState.search}>
      <CatalogFilterPersistence initialQueryState={queryState} maxPrice={snapshot.maxPrice} />
      
      <header className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <GlobalCatalogHeroCarousel
          products={snapshot.heroProducts}
          totalProducts={snapshot.totalProducts}
          matchingOrganizations={snapshot.matchingOrganizations}
          searchQuery={queryState.search}
        />
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Banner de rubro activo */}
        {snapshot.activeMarketplaceCategory && (
          <CatalogCategoryBanner
            category={snapshot.activeMarketplaceCategory}
            productCount={snapshot.totalProducts}
            organizationCount={snapshot.matchingOrganizations}
          />
        )}

        <GlobalCatalogToolbar
          state={queryState}
          categories={snapshot.categories}
          maxPrice={snapshot.maxPrice}
          totalProducts={snapshot.totalProducts}
          totalOrganizations={snapshot.totalOrganizations}
          matchingOrganizations={snapshot.matchingOrganizations}
          countries={snapshot.countries}
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
              <EmptyState
                hasFilters={hasActiveFilters}
                categoryName={snapshot.activeMarketplaceCategory?.name}
              />
            )}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

async function EmptyState({
  hasFilters,
  categoryName,
}: {
  hasFilters: boolean;
  categoryName?: string;
}) {
  const categoriesSnapshot = await fetchGlobalCategoriesSnapshot({ search: '', sortBy: 'products' });
  const suggestions = categoriesSnapshot.categories.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950/50">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <ShoppingBag className="h-8 w-8 text-slate-400" />
        </div>
        <p className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">
          {categoryName
            ? `No hay productos en ${categoryName} con esos filtros`
            : 'No encontramos productos con esos criterios'}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {hasFilters
            ? 'Ajusta los filtros o limpia la búsqueda para ver más resultados.'
            : 'Aún no hay productos publicados en el marketplace.'}
        </p>
        {hasFilters && (
          <Link
            href="/home/catalogo"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors dark:bg-white dark:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver catálogo completo
          </Link>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Explorar otros rubros
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((cat) => {
              const Icon = resolveIcon(cat.icon);
              return (
                <Link
                  key={cat.id}
                  href={`/home/catalogo?category=${cat.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors dark:text-slate-100 dark:group-hover:text-emerald-300 truncate">
                      {cat.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {cat.productCount} productos
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
