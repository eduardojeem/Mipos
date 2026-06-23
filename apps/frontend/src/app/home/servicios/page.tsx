import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Package, Sparkles } from 'lucide-react';
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
import { OrganizationsFilterBar } from '../empresas/OrganizationsFilterBar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Servicios - Barberías y Peluquerías | MITIENDA Marketplace',
  description:
    'Encuentra barberías, peluquerías y salones de belleza en tu zona. Compara precios, promociones y servicios disponibles.',
  openGraph: {
    title: 'Servicios - Barberías y Peluquerías | MITIENDA Marketplace',
    description:
      'Directorio de servicios: barberías, peluquerías y salones de belleza con presencia en MITIENDA.',
    type: 'website',
    locale: 'es_PY',
    url: '/home/servicios',
  },
  alternates: {
    canonical: '/home/servicios',
  },
};

type OrganizationsQueryRecord = Record<string, string | string[] | undefined>;

const SORT_OPTIONS: Array<{ value: GlobalOrganizationsSortMode; label: string }> = [
  { value: 'featured', label: 'Destacadas' },
  { value: 'products', label: 'Mas servicios' },
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

export default async function ServicesPage({
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

  // Filter organizations by:
  // 1. vertical === 'BARBERSHOP' (primary)
  // 2. OR has products in "Belleza y Cuidado" category (fallback)
  const BELLEZA_MARKETPLACE_ID = 'belleza-y-cuidado'; // marketplace_categories.slug

  const serviceOrganizations = snapshot.organizations.filter(
    (org) => {
      const vertical = (org as any).vertical;
      // For now, show all orgs that have products - this is temporary until we properly categorize
      // We'll filter by vertical once all barber shops are properly configured
      return true;
    }
  );

  const featuredServices = snapshot.featuredOrganizations;

  const hasActiveFilters =
    Boolean(queryState.search) ||
    queryState.sortBy !== 'featured' ||
    Boolean(queryState.department) ||
    Boolean(queryState.city);

  return (
    <MarketplaceLayout searchQuery={queryState.search}>
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">

        {/* ── Hero section ── */}
        <header className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 px-6 py-10 sm:px-10 sm:py-14">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-pink-400/15 blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-purple-400/10 blur-2xl" />

          <div className="relative">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/70">
              <Sparkles className="h-3 w-3 text-pink-200" />
              Servicios de Belleza
            </span>

            {/* Title */}
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Barberías y Peluquerías
            </h1>
            <p className="mt-2 max-w-2xl text-base text-white/80">
              Encuentra los mejores servicios de belleza y cuidado personal en tu zona. Compara precios, promociones y reserva tu cita.
            </p>

            {/* Stats */}
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
                <Building2 className="h-4 w-4 text-pink-200" />
                <span className="text-sm font-semibold text-white">
                  {serviceOrganizations.length} {serviceOrganizations.length === 1 ? 'local' : 'locales'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
                <Package className="h-4 w-4 text-pink-200" />
                <span className="text-sm font-semibold text-white">
                  {snapshot.totalProducts} servicios
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Featured services ── */}
        {featuredServices.length > 0 && !hasActiveFilters && (
          <section className="mt-12">
            <div className="mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                Destacados
              </h2>
            </div>
            <OrganizationsCarousel organizations={featuredServices.slice(0, 5)} />
          </section>
        )}

        {/* ── Search & filter ── */}
        <div className="mt-8">
          <OrganizationsFilterBar
            search={queryState.search}
            sortBy={queryState.sortBy}
            department={queryState.department}
            city={queryState.city}
            departments={snapshot.departments}
            cities={snapshot.cities}
            resultCount={serviceOrganizations.length}
          />
        </div>

        {/* ── All services grid ── */}
        {serviceOrganizations.length > 0 ? (
          <section className="mt-12">
            <p className="mb-6 text-sm font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">
              {serviceOrganizations.length} {serviceOrganizations.length === 1 ? 'local' : 'locales'} de servicios
            </p>
            <OrganizationGrid organizations={serviceOrganizations} />
          </section>
        ) : (
          <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <Building2 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No encontramos servicios con esos criterios
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Ajusta la búsqueda o intenta en otra zona.
            </p>
            {hasActiveFilters && (
              <div className="mt-6">
                <Link href="/home/servicios">
                  <Button variant="outline" className="rounded-lg">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Ver todos los servicios
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
