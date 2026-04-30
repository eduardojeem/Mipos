import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, Globe, Search, SlidersHorizontal, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import {
  fetchGlobalOrganizationsSnapshot,
  type GlobalOrganizationsQueryState,
  type GlobalOrganizationsSortMode,
} from '@/lib/public-site/global-organizations-data';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { OrganizationGrid } from '../components/marketplace/OrganizationGrid';
import { OrganizationsCarousel } from '../components/marketplace/OrganizationsCarousel';

type OrganizationsQueryRecord = Record<string, string | string[] | undefined>;

const SORT_OPTIONS: Array<{ value: GlobalOrganizationsSortMode; label: string }> = [
  { value: 'featured', label: 'Destacadas' },
  { value: 'products', label: 'Mas productos' },
  { value: 'recent', label: 'Mas recientes' },
  { value: 'name', label: 'Nombre' },
];

function readFirstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

function normalizeSearchParams(searchParams: OrganizationsQueryRecord): GlobalOrganizationsQueryState {
  const rawSearch = readFirstValue(searchParams.search) || readFirstValue(searchParams.q);
  const rawSort = readFirstValue(searchParams.sort);
  const sortBy = SORT_OPTIONS.some((option) => option.value === rawSort)
    ? (rawSort as GlobalOrganizationsSortMode)
    : 'featured';

  return {
    search: rawSearch,
    sortBy,
  };
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<OrganizationsQueryRecord>;
}) {
  const context = await resolveRequestTenantContext();
  const rawSearchParams = await searchParams;

  if (context.kind !== 'root') {
    notFound();
  }

  const queryState = normalizeSearchParams(rawSearchParams);
  const snapshot = await fetchGlobalOrganizationsSnapshot(context.hostname, queryState);
  const hasActiveFilters = Boolean(queryState.search) || queryState.sortBy !== 'featured';

  return (
    <MarketplaceLayout searchQuery={queryState.search}>
      <header className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Badge
          variant="outline"
          className="mb-4 rounded-full border-sky-200 bg-sky-50/60 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-700"
        >
          Directorio de empresas
        </Badge>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,360px)] lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Empresas publicadas en MiPOS
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Explora negocios activos, compara presencia publica y entra directo a la tienda de
              cada empresa desde un directorio real.
            </p>
            {queryState.search ? (
              <p className="mt-4 text-sm font-medium text-sky-700 dark:text-sky-300">
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
                  <Building2 className="h-4 w-4" />
                  Empresas
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {snapshot.totalOrganizations}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Store className="h-4 w-4" />
                  Productos
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {snapshot.totalProducts}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Globe className="h-4 w-4" />
                  Promedio
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                  {snapshot.averageProductsPerOrganization}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <OrganizationsCarousel organizations={snapshot.featuredOrganizations} />

        <form
          action="/home/empresas"
          className="mt-8 rounded-lg border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
            <div>
              <label
                htmlFor="organizations-search"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Buscar empresa
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="organizations-search"
                  name="search"
                  type="search"
                  defaultValue={queryState.search}
                  placeholder="Ej. tienda, cosmeticos o ciudad"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="organizations-sort"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Orden
              </label>
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="organizations-sort"
                  name="sort"
                  defaultValue={queryState.sortBy}
                  className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
              <Button type="submit" className="h-11 rounded-lg bg-slate-950 px-5 text-white hover:bg-sky-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                Aplicar
              </Button>
              {hasActiveFilters ? (
                <Link href="/home/empresas">
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
              {snapshot.visibleOrganizations} visibles
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {snapshot.totalCategories} categorias activas
            </Badge>
            <Link href="/home/catalogo" className="ml-auto">
              <Button variant="outline" className="rounded-lg">
                Ver catalogo global
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </form>

        {snapshot.organizations.length > 0 ? (
          <>
            <div className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Building2 className="h-4 w-4" />
              {queryState.search
                ? `${snapshot.visibleOrganizations} de ${snapshot.totalOrganizations} empresas`
                : `${snapshot.totalOrganizations} empresas publicadas`}
            </div>
            <OrganizationGrid organizations={snapshot.organizations} />
          </>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <p className="text-xl font-medium text-slate-900 dark:text-white">
              No encontramos empresas con esos criterios
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajusta la busqueda o limpia los filtros para volver al directorio completo.
            </p>
            {hasActiveFilters ? (
              <div className="mt-6">
                <Link href="/home/empresas">
                  <Button variant="outline" className="rounded-lg">
                    Ver todas las empresas
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
