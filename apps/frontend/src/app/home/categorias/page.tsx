import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, Layers3, PackageSearch, Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import {
  fetchGlobalCategoriesSnapshot,
  type GlobalCategoriesQueryState,
  type GlobalCategoriesSortMode,
} from '@/lib/public-site/global-categories-data';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { CategoryGrid } from '../components/marketplace/CategoryGrid';

type CategoriesQueryRecord = Record<string, string | string[] | undefined>;

const SORT_OPTIONS: Array<{ value: GlobalCategoriesSortMode; label: string }> = [
  { value: 'products', label: 'Mas productos' },
  { value: 'companies', label: 'Mas empresas' },
  { value: 'name', label: 'Nombre' },
];

function readFirstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

function normalizeSearchParams(searchParams: CategoriesQueryRecord): GlobalCategoriesQueryState {
  const rawSearch = readFirstValue(searchParams.search) || readFirstValue(searchParams.q);
  const rawSort = readFirstValue(searchParams.sort);
  const sortBy = SORT_OPTIONS.some((option) => option.value === rawSort)
    ? (rawSort as GlobalCategoriesSortMode)
    : 'products';

  return {
    search: rawSearch,
    sortBy,
  };
}

function buildClearHref() {
  return '/home/categorias';
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.round(value * 100))}%`;
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
      <header className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Badge
          variant="outline"
          className="mb-4 rounded-full border-emerald-200 bg-emerald-50/60 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700"
        >
          Explorar por rubro
        </Badge>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,360px)] lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Categorias activas del marketplace
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Recorre el mapa real de categorias publicadas por empresas activas y entra al
              catalogo ya filtrado desde cada rubro.
            </p>
            {queryState.search ? (
              <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Mostrando resultados para &quot;{queryState.search}&quot;.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Cobertura del directorio
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Layers3 className="h-4 w-4" />
                  Categorias
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {snapshot.totalCategories}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Building2 className="h-4 w-4" />
                  Empresas
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {snapshot.matchingOrganizations || snapshot.totalOrganizations}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <PackageSearch className="h-4 w-4" />
                  Productos
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {snapshot.categorizedProducts}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <form
          action="/home/categorias"
          className="rounded-lg border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
            <div>
              <label
                htmlFor="categories-search"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Buscar categoria
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="categories-search"
                  name="search"
                  type="search"
                  defaultValue={queryState.search}
                  placeholder="Ej. belleza, tecnologia o accesorios"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="categories-sort"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Orden
              </label>
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="categories-sort"
                  name="sort"
                  defaultValue={queryState.sortBy}
                  className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="h-11 rounded-lg bg-slate-950 px-5 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                Aplicar
              </Button>
              {hasActiveFilters ? (
                <Link href={buildClearHref()}>
                  <Button type="button" variant="outline" className="h-11 rounded-lg">
                    Limpiar
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {snapshot.visibleCategories} visibles
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {snapshot.categorizedProducts} productos clasificados
            </Badge>
            {snapshot.uncategorizedProducts > 0 ? (
              <Badge
                variant="outline"
                className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {snapshot.uncategorizedProducts} sin categoria
              </Badge>
            ) : null}
            <Link href="/home/catalogo" className="ml-auto">
              <Button variant="outline" className="rounded-lg">
                Ver todo el catalogo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </form>

        {snapshot.categories.length > 0 ? (
          <>
            <div className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Layers3 className="h-4 w-4" />
              {queryState.search
                ? `${snapshot.visibleCategories} de ${snapshot.totalCategories} categorias`
                : `${snapshot.totalCategories} categorias activas`}
            </div>
            <CategoryGrid categories={snapshot.categories} />
          </>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <p className="text-xl font-medium text-slate-900 dark:text-white">
              No encontramos categorias con esos criterios
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajusta la busqueda o limpia los filtros para volver al panorama completo del
              marketplace.
            </p>
            {hasActiveFilters ? (
              <div className="mt-6">
                <Link href={buildClearHref()}>
                  <Button variant="outline" className="rounded-lg">
                    Ver todas las categorias
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {snapshot.categories.length > 0 ? (
          <section className="mt-12 rounded-lg border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Lectura rapida
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {snapshot.categories[0].name} concentra {formatPercent(snapshot.categories[0].shareOfProducts)} de los
                  productos publicados
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  La ruta ahora prioriza cobertura real y acceso directo al catalogo filtrado. Cada
                  tarjeta abre los productos del rubro seleccionado sin pasar por un home recortado.
                </p>
              </div>

              <Link href={snapshot.categories[0].href}>
                <Button className="rounded-lg bg-slate-950 px-5 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                  Explorar categoria lider
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </MarketplaceLayout>
  );
}
