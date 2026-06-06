import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, Package, Tag } from 'lucide-react';
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
import { OrganizationsFilterBar } from './OrganizationsFilterBar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Directorio de empresas | MiPOS Marketplace',
  description:
    'Explora negocios activos, compara presencia publica y entra directo a la tienda de cada empresa desde un directorio real.',
  openGraph: {
    title: 'Directorio de empresas | MiPOS Marketplace',
    description:
      'Directorio publico de organizaciones activas con catalogo y presencia comercial en MiPOS.',
    type: 'website',
    locale: 'es_PY',
    url: '/home/empresas',
  },
  alternates: {
    canonical: '/home/empresas',
  },
};

type OrganizationsQueryRecord = Record<string, string | string[] | undefined>;

const SORT_OPTIONS: Array<{ value: GlobalOrganizationsSortMode; label: string }> = [
  { value: 'featured', label: 'Destacadas' },
  { value: 'products', label: 'Mas productos' },
  { value: 'recent', label: 'Mas recientes' },
  { value: 'name', label: 'Nombre' },
];

function readFirstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function normalizeSearchParams(searchParams: OrganizationsQueryRecord): GlobalOrganizationsQueryState {
  const rawSearch = readFirstValue(searchParams.search) || readFirstValue(searchParams.q);
  const rawSort = readFirstValue(searchParams.sort);
  const department = readFirstValue(searchParams.department);
  const city = readFirstValue(searchParams.city);
  const sortBy = SORT_OPTIONS.some((option) => option.value === rawSort)
    ? (rawSort as GlobalOrganizationsSortMode)
    : 'featured';

  return { search: rawSearch, sortBy, city, department };
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
  const hasActiveFilters =
    Boolean(queryState.search) ||
    queryState.sortBy !== 'featured' ||
    Boolean(queryState.department) ||
    Boolean(queryState.city);

  return (
    <MarketplaceLayout searchQuery={queryState.search}>
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">

        {/* ── Hero section ── */}
        <header className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-10 sm:px-10 sm:py-14">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

          <div className="relative">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/70">
              <Building2 className="h-3 w-3 text-emerald-400" />
              Directorio Comercial
            </span>

            {/* Title */}
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Empresas activas
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Explorá negocios con presencia digital real, compará su catálogo y conectá directo con cada empresa.
            </p>

            {/* Stats cards */}
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20">
                  <Building2 className="h-4 w-4 text-sky-400" />
                </span>
                <div>
                  <p className="text-xl font-bold leading-none text-white">
                    {snapshot.totalOrganizations}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">empresas</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Package className="h-4 w-4 text-emerald-400" />
                </span>
                <div>
                  <p className="text-xl font-bold leading-none text-white">
                    {snapshot.totalProducts}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">productos</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20">
                  <Tag className="h-4 w-4 text-violet-400" />
                </span>
                <div>
                  <p className="text-xl font-bold leading-none text-white">
                    {snapshot.totalCategories}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">categorías</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Carousel de destacadas (solo sin filtros activos) ── */}
        {!hasActiveFilters && snapshot.featuredOrganizations.length > 0 && (
          <section className="mt-10" aria-label="Empresas destacadas">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Destacadas
              </p>
              <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>
            <OrganizationsCarousel organizations={snapshot.featuredOrganizations} />
          </section>
        )}

        {/* ── Filtros ── */}
        <div className="mt-8">
          <OrganizationsFilterBar
            search={queryState.search}
            sortBy={queryState.sortBy}
            department={queryState.department}
            city={queryState.city}
            departments={snapshot.departments}
            cities={snapshot.cities}
            resultCount={snapshot.visibleOrganizations}
          />
        </div>

        {/* ── Resultados ── */}
        {snapshot.organizations.length > 0 ? (
          <OrganizationGrid organizations={snapshot.organizations} />
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
              No encontramos empresas con esos criterios
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajustá la búsqueda o limpiá los filtros para volver al directorio completo.
            </p>
            {hasActiveFilters ? (
              <div className="mt-6">
                <Link href="/home/empresas">
                  <Button variant="outline" className="rounded-xl">
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
