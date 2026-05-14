import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, Layers3, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import {
  fetchGlobalCategoriesSnapshot,
  type GlobalCategoriesQueryState,
  type GlobalCategoriesSortMode,
} from '@/lib/public-site/global-categories-data';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { CategoryGrid } from '../components/marketplace/CategoryGrid';
import { CategoryFilterBar } from './CategoryFilterBar';

type CategoriesQueryRecord = Record<string, string | string[] | undefined>;

const SORT_OPTIONS: Array<{ value: GlobalCategoriesSortMode; label: string }> = [
  { value: 'products', label: 'Mas productos' },
  { value: 'companies', label: 'Mas empresas' },
  { value: 'name', label: 'Nombre' },
];

function readFirstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function normalizeSearchParams(searchParams: CategoriesQueryRecord): GlobalCategoriesQueryState {
  const rawSearch = readFirstValue(searchParams.search) || readFirstValue(searchParams.q);
  const rawSort = readFirstValue(searchParams.sort);
  const sortBy = SORT_OPTIONS.some((o) => o.value === rawSort)
    ? (rawSort as GlobalCategoriesSortMode)
    : 'products';
  return { search: rawSearch, sortBy };
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.round(value * 100))}%`;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Categorías | MiPOS Marketplace',
    description:
      'Explora todas las categorías activas del marketplace. Accede al catálogo filtrado por rubro directamente.',
    alternates: { canonical: '/home/categorias' },
    robots: { index: true, follow: true },
    openGraph: {
      title: 'Categorías | MiPOS Marketplace',
      description: 'Mapa de rubros publicados por empresas activas en MiPOS.',
      type: 'website',
      siteName: 'MiPOS Marketplace',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Categorías | MiPOS Marketplace',
      description: 'Mapa de rubros publicados por empresas activas en MiPOS.',
    },
  };
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<CategoriesQueryRecord>;
}) {
  const context = await resolveRequestTenantContext();
  const rawSearchParams = await searchParams;

  if (context.kind !== 'root') {
    notFound();
  }

  const queryState = normalizeSearchParams(rawSearchParams);
  const snapshot = await fetchGlobalCategoriesSnapshot(queryState);
  const hasActiveFilters = Boolean(queryState.search) || queryState.sortBy !== 'products';

  return (
    <MarketplaceLayout searchQuery={queryState.search}>
      <header className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {queryState.search ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Mostrando resultados para &quot;{queryState.search}&quot;.
          </p>
        ) : null}
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <CategoryFilterBar
          search={queryState.search}
          sortBy={queryState.sortBy}
          visibleCategories={snapshot.visibleCategories}
          categorizedProducts={snapshot.categorizedProducts}
          uncategorizedProducts={snapshot.uncategorizedProducts}
        />

        {snapshot.categories.length > 0 ? (
          <>
            <div className="mt-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Layers3 className="h-3.5 w-3.5" />
              {queryState.search
                ? `${snapshot.visibleCategories} de ${snapshot.totalCategories} categorias`
                : `${snapshot.totalCategories} categorias activas`}
            </div>
            <CategoryGrid categories={snapshot.categories} />
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <p className="text-xl font-medium text-slate-900 dark:text-white">
              No encontramos categorias con esos criterios
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajusta la busqueda o limpia los filtros para volver al panorama completo.
            </p>
            {hasActiveFilters ? (
              <div className="mt-6">
                <Link href="/home/categorias">
                  <Button variant="outline" className="rounded-lg">
                    Ver todas las categorias
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {snapshot.categories.length > 0 && snapshot.categories[0].shareOfProducts ? (
          <section className="mt-10 rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Categoria lider
                </p>
                <p className="mt-1.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  <span className="text-emerald-700 dark:text-emerald-300">
                    {snapshot.categories[0].name}
                  </span>{' '}
                  concentra el {formatPercent(snapshot.categories[0].shareOfProducts)} del catalogo publicado
                </p>
              </div>
              <Link href={snapshot.categories[0].href}>
                <Button
                  size="sm"
                  className="rounded-lg bg-slate-950 px-4 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Explorar
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </MarketplaceLayout>
  );
}
