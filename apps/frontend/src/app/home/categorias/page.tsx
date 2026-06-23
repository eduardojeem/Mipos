import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, Layers3, PackageSearch, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import {
  fetchGlobalCategoriesSnapshot,
  type GlobalCategoriesQueryState,
  type GlobalCategoriesSortMode,
  type GlobalCategoryExplorerItem,
} from '@/lib/public-site/global-categories-data';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { AllCategoriesGrid } from './AllCategoriesGrid';
import { CategoryFilterBar } from './CategoryFilterBar';
import { FeaturedCategoriesRow } from './FeaturedCategoriesRow';

type CategoriesQueryRecord = Record<string, string | string[] | undefined>;

const SORT_OPTIONS: Array<{ value: GlobalCategoriesSortMode; label: string }> = [
  { value: 'products', label: 'Más productos' },
  { value: 'companies', label: 'Más empresas' },
  { value: 'name', label: 'A–Z' },
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CategoriesQueryRecord>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const search = readFirstValue(raw.search) || readFirstValue(raw.q);
  const title = search
    ? `"${search}" — Rubros | MITIENDA Marketplace`
    : 'Rubros del Marketplace | MITIENDA';
  const description = search
    ? `Resultados de rubros para "${search}" en el marketplace MITIENDA.`
    : 'Explora todos los rubros del marketplace: Restaurantes, Tecnología, Moda, Supermercados y más. Encuentra empresas y productos por categoría.';

  return {
    title,
    description,
    alternates: { canonical: '/home/categorias' },
    robots: { index: true, follow: true },
    openGraph: { title, description, type: 'website', siteName: 'MITIENDA Marketplace' },
    twitter: { card: 'summary_large_image', title, description },
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

  const featuredCategories = snapshot.categories.filter((c) => c.is_featured);
  const showFeaturedRow = !hasActiveFilters && featuredCategories.length > 0;

  const totalOrgs     = snapshot.totalOrganizations;
  const totalProducts = snapshot.totalProducts;

  return (
    <MarketplaceLayout searchQuery={queryState.search}>

      {/* ── HERO ────────────────────────────────────────────────── */}
      {!hasActiveFilters && (
        <div className="border-b border-slate-200/60 bg-gradient-to-b from-slate-50 to-white dark:border-slate-800/60 dark:from-slate-950 dark:to-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                  Directorio de rubros
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  Explora por rubro
                </h1>
                <p className="mt-2 max-w-xl text-base text-slate-500 dark:text-slate-400">
                  Encuentra empresas locales organizadas por rubro. Cada rubro agrupa negocios
                  verificados con sus productos y servicios.
                </p>
              </div>

              {/* Stats pill */}
              <div className="flex shrink-0 flex-wrap gap-3">
                <StatPill icon={<Layers3 className="h-3.5 w-3.5" />} value={snapshot.totalCategories} label="rubros" />
                <StatPill icon={<Building2 className="h-3.5 w-3.5" />} value={totalOrgs} label="empresas" />
                <StatPill icon={<PackageSearch className="h-3.5 w-3.5" />} value={totalProducts} label="productos" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">

        {/* Search + sort */}
        {queryState.search && (
          <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Mostrando resultados para &quot;{queryState.search}&quot;
          </p>
        )}

        <CategoryFilterBar
          search={queryState.search}
          sortBy={queryState.sortBy}
          totalCategories={snapshot.totalCategories}
          visibleCategories={snapshot.visibleCategories}
          totalOrganizations={totalOrgs}
          totalProducts={totalProducts}
        />

        {/* ── FEATURED RUBROS ────────────────────────────────────── */}
        {showFeaturedRow && (
          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Rubros destacados
              </h2>
            </div>
            <FeaturedCategoriesRow categories={featuredCategories} />
          </section>
        )}

        {/* ── ALL CATEGORIES ─────────────────────────────────────── */}
        {snapshot.categories.length > 0 ? (
          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <Layers3 className="h-3.5 w-3.5" />
              {hasActiveFilters
                ? `${snapshot.visibleCategories} de ${snapshot.totalCategories} rubros`
                : `Todos los rubros (${snapshot.totalCategories})`}
            </div>
            <AllCategoriesGrid categories={snapshot.categories} />
          </section>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
            <Layers3 className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No encontramos rubros con esos criterios
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Ajusta la búsqueda o limpia los filtros para ver todos los rubros.
            </p>
            {hasActiveFilters && (
              <div className="mt-6">
                <Link href="/home/categorias">
                  <Button variant="outline" className="rounded-lg">
                    Ver todos los rubros
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── LEADER BANNER ──────────────────────────────────────── */}
        {!hasActiveFilters && snapshot.categories.length > 0 && snapshot.categories[0].organizationCount > 0 && (
          <LeaderBanner category={snapshot.categories[0]} />
        )}
      </div>
    </MarketplaceLayout>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
      <span className="font-bold text-slate-900 dark:text-white">{value.toLocaleString('es')}</span>
      {label}
    </div>
  );
}

function LeaderBanner({ category }: { category: GlobalCategoryExplorerItem }) {
  return (
    <section className="mt-10 overflow-hidden rounded-xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: category.color || '#10b981' }}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Rubro líder
          </p>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
            <span className="font-extrabold" style={{ color: category.color || '#10b981' }}>
              {category.name}
            </span>
            {' '}· {category.organizationCount} {category.organizationCount === 1 ? 'empresa' : 'empresas'},{' '}
            {category.productCount} {category.productCount === 1 ? 'producto' : 'productos'}
          </p>
        </div>
        <Link href={`/home/categorias/${category.slug}`}>
          <Button
            size="sm"
            className="rounded-lg bg-slate-950 px-4 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          >
            Ver empresas
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
