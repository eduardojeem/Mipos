import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Building2, ExternalLink, PackageSearch,
  Store, Laptop, Shirt, ShoppingCart, Pill, Sparkles, Home,
  Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer,
  UtensilsCrossed, Layers3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { fetchCategoryOrgsSnapshot } from '@/lib/public-site/category-organizations-data';
import { MarketplaceLayout } from '../../components/marketplace/MarketplaceLayout';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Laptop, Shirt, ShoppingCart, Pill, Sparkles,
  Home, Dumbbell, BookOpen, Briefcase, Car, Gamepad2, PawPrint, Hammer, Store, Layers3,
};

function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_MAP[name]) ? ICON_MAP[name] : Store;
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await fetchCategoryOrgsSnapshot(slug);

  if (!snapshot) {
    return { title: 'Rubro no encontrado | MiPOS' };
  }

  const { category } = snapshot;
  const title       = category.seo_title       || `${category.name} | MiPOS Marketplace`;
  const description = category.seo_description || category.description
    || `Explora las mejores empresas de ${category.name} en el marketplace MiPOS. ${snapshot.totalOrganizations} empresas, ${snapshot.totalProducts} productos.`;

  return {
    title,
    description,
    alternates: { canonical: `/home/categorias/${slug}` },
    robots:     { index: true, follow: true },
    openGraph:  { title, description, type: 'website', siteName: 'MiPOS Marketplace' },
    twitter:    { card: 'summary_large_image', title, description },
  };
}

export default async function CategorySlugPage({ params }: PageProps) {
  const context = await resolveRequestTenantContext();
  if (context.kind !== 'root') notFound();

  const { slug } = await params;
  const requestHost = context.kind === 'root' ? null : null;
  const snapshot = await fetchCategoryOrgsSnapshot(slug, requestHost);

  if (!snapshot) notFound();

  const { category, organizations, totalOrganizations, totalProducts } = snapshot;
  const Icon = resolveIcon(category.icon);

  return (
    <MarketplaceLayout>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div
        className="border-b border-slate-200/60 dark:border-slate-800/60"
        style={{ background: `linear-gradient(135deg, ${category.color}18 0%, transparent 60%)` }}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/home/categorias" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Todos los rubros
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{category.name}</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Icon */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg"
              style={{ backgroundColor: category.color }}
            >
              <Icon className="h-8 w-8 text-white" />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-1.5 max-w-2xl text-base text-slate-500 dark:text-slate-400">
                  {category.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex shrink-0 flex-wrap gap-3">
              <StatPill
                icon={<Building2 className="h-3.5 w-3.5" />}
                value={totalOrganizations}
                label={totalOrganizations === 1 ? 'empresa' : 'empresas'}
                color={category.color}
              />
              <StatPill
                icon={<PackageSearch className="h-3.5 w-3.5" />}
                value={totalProducts}
                label="productos"
                color={category.color}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">

        {organizations.length === 0 ? (
          <EmptyState categoryName={category.name} color={category.color} />
        ) : (
          <>
            <p className="mb-6 text-sm font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {totalOrganizations} {totalOrganizations === 1 ? 'empresa' : 'empresas'} en este rubro
            </p>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <OrgCard key={org.id} org={org} categoryColor={category.color} />
              ))}
            </div>

            {/* CTA to full catalog filtered */}
            <div className="mt-12 rounded-xl border border-slate-200 bg-white/70 p-6 text-center shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ¿Buscas productos específicos de {category.name}?
              </p>
              <Link href={`/home/catalogo?category=${category.slug}`} className="mt-3 inline-block">
                <Button className="rounded-lg bg-slate-950 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950">
                  Ver productos de {category.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </MarketplaceLayout>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <span style={{ color }}>{icon}</span>
      <span className="font-bold text-slate-900 dark:text-white">{value.toLocaleString('es')}</span>
      {label}
    </div>
  );
}

function OrgCard({ org, categoryColor }: { org: import('@/lib/public-site/category-organizations-data').CategoryPageOrg; categoryColor: string }) {
  return (
    <Link href={org.href} className="group block">
      <div className="h-full overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-950">
        {/* Color bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: org.primaryColor || categoryColor }} />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            {/* Logo / Placeholder */}
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            >
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logoUrl} alt={org.name} className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-6 w-6 text-slate-400" />
              )}
            </div>

            <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-600 dark:text-slate-600 dark:group-hover:text-emerald-400" />
          </div>

          <h3 className="mt-4 font-bold text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-300">
            {org.name}
          </h3>

          {org.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {org.description}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              <PackageSearch className="mr-1 h-2.5 w-2.5" />
              {org.productCount} productos
            </Badge>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Ver tienda
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ categoryName, color }: { categoryName: string; color: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950/50">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Building2 className="h-8 w-8" style={{ color }} />
      </div>
      <p className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">
        Aún no hay empresas en {categoryName}
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Las empresas de este rubro aparecerán aquí cuando se registren en el marketplace.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/home/categorias">
          <Button variant="outline" className="rounded-lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ver otros rubros
          </Button>
        </Link>
        <Link href="/home/catalogo">
          <Button className="rounded-lg bg-slate-950 text-white hover:bg-emerald-700 dark:bg-white dark:text-slate-950">
            Ver catálogo completo
          </Button>
        </Link>
      </div>
    </div>
  );
}
