import Link from 'next/link';
import { notFound } from 'next/navigation';
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
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <OrganizationsCarousel organizations={snapshot.featuredOrganizations} />

        <div className="mt-8">
          <OrganizationsFilterBar
            search={queryState.search}
            sortBy={queryState.sortBy}
            department={queryState.department}
            city={queryState.city}
            departments={snapshot.departments}
            cities={snapshot.cities}
          />
        </div>

        {snapshot.organizations.length > 0 ? (
          <>
            <OrganizationGrid organizations={snapshot.organizations} />
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <p className="text-xl font-medium text-slate-900 dark:text-white">
              No encontramos empresas con esos criterios
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajusta la búsqueda o limpia los filtros para volver al directorio completo.
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
