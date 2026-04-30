import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

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
        <Badge
          variant="outline"
          className="mb-4 rounded-full border-amber-200 bg-amber-50/60 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700"
        >
          Catalogo global
        </Badge>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,360px)] lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Explora productos publicados por empresas activas en MiPOS
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Este catalogo ya trabaja con filtros, orden y paginacion reales. Puedes explorar por
              rubro, precio, disponibilidad y senales comerciales sin caer en un listado recortado.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Cobertura actual
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
              {snapshot.totalOrganizations} empresas activas en la red
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              La busqueda y los filtros se aplican sobre publicaciones vigentes del marketplace raiz.
            </p>
            <div className="mt-5">
              <Link href="/home/empresas">
                <Button variant="outline" className="rounded-lg">
                  Ver empresas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <GlobalCatalogToolbar
          state={queryState}
          categories={snapshot.categories}
          maxPrice={snapshot.maxPrice}
          totalProducts={snapshot.totalProducts}
          totalOrganizations={snapshot.totalOrganizations}
          matchingOrganizations={snapshot.matchingOrganizations}
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
