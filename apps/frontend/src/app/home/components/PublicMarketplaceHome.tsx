import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Search,
  Package,
  Layers3,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GlobalMarketplaceHomeData } from '@/lib/public-site/data';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';
import { MARKETPLACE_CONTENT_DEFAULTS, type MarketplaceContent } from '@/lib/web-content/types';
import { LoginAccessSection } from '@/components/auth/LoginAccessSection';
import { MarketplaceLayout } from './marketplace/MarketplaceLayout';
import { ProductGrid, ProductCarousel } from './marketplace/ProductGrid';
import { CategoryGrid } from './marketplace/CategoryGrid';
import { OrganizationGrid } from './marketplace/OrganizationGrid';

interface PublicMarketplaceHomeProps {
  data: GlobalMarketplaceHomeData;
  searchQuery?: string;
  content?: MarketplaceContent;
}

export function PublicMarketplaceHome({
  data,
  searchQuery = '',
  content,
}: PublicMarketplaceHomeProps) {
  const c = content ?? MARKETPLACE_CONTENT_DEFAULTS;

  // Filter products in offer
  const offerProducts = data.featuredProducts.filter(
    (product) => product.offerPrice && product.offerPrice < product.basePrice
  );

  // Extract products for main grid, prioritizing non-offer products to avoid duplicates
  let displayProducts = data.featuredProducts.filter(
    (product) => !product.offerPrice || product.offerPrice >= product.basePrice
  );
  if (displayProducts.length === 0) {
    displayProducts = data.featuredProducts;
  }
  displayProducts = displayProducts.slice(0, 8);

  return (
    <MarketplaceLayout searchQuery={searchQuery}>
      {/* Hero compacto */}
      <section className="relative overflow-hidden pb-12 pt-10 lg:pb-16 lg:pt-14">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
              <Badge
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50/60 px-6 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 backdrop-blur-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                <Sparkles className="mr-2 h-3 w-3 fill-emerald-500" />
                {c.hero.badge}
              </Badge>
            </div>

            <h1
              className="mt-6 font-['Outfit'] text-4xl font-black leading-tight tracking-tight text-slate-950 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-5 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-200 sm:text-5xl md:text-6xl lg:text-7xl dark:text-slate-100"
            >
              {c.hero.headline} <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 bg-clip-text text-transparent">
                {c.hero.headlineHighlight}
              </span>
            </h1>

            <p
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-5 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-300 sm:text-lg dark:text-slate-300"
            >
              {c.hero.description}
            </p>

            {/* Barra de búsqueda integrada */}
            <div className="mx-auto mt-8 max-w-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-5 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-400">
              <form action="/home/catalogo" method="GET" className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  name="search"
                  placeholder="Buscar productos, marcas o rubros..."
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white/90 pl-12 pr-28 text-base shadow-lg outline-none backdrop-blur-sm transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-100 dark:focus:border-emerald-400"
                />
                <Button type="submit" className="absolute right-2 top-2 h-10 rounded-xl bg-slate-950 text-sm font-semibold hover:bg-emerald-700 dark:bg-emerald-50 dark:text-slate-950 dark:hover:bg-emerald-400">
                  Buscar
                </Button>
              </form>
            </div>

            {/* Fila de Stats */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-5 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-500">
              <span className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-emerald-500" />
                <strong>{data.stats.organizations}</strong> empresas
              </span>
              <span className="h-3 w-px bg-slate-200 dark:bg-slate-800 hidden sm:inline" />
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-emerald-500" />
                <strong>{data.stats.products}</strong> productos
              </span>
              <span className="h-3 w-px bg-slate-200 dark:bg-slate-800 hidden sm:inline" />
              <span className="flex items-center gap-1.5">
                <Layers3 className="h-4 w-4 text-emerald-500" />
                <strong>{data.stats.categories}</strong> rubros
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 space-y-16">
        {/* Productos en oferta */}
        {offerProducts.length > 0 && (
          <section id="ofertas-global" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-slate-800">
              <div>
                <Badge
                  variant="outline"
                  className="mb-3 rounded-full border-amber-200 bg-amber-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  Oportunidades únicas
                </Badge>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-slate-100">
                  Productos en Oferta
                </h2>
              </div>
            </div>
            <ProductCarousel products={offerProducts} />
          </section>
        )}

        {/* Categorías (Rubros) */}
        <section id="categorias-global" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-slate-800">
            <div>
              <Badge
                variant="outline"
                className="mb-3 rounded-full border-emerald-200 bg-emerald-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                {c.sections.categories.badge}
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-slate-100">
                {c.sections.categories.headline}
              </h2>
            </div>
            <Link href="/home/categorias">
              <Button
                variant="ghost"
                className="group rounded-full px-5 py-5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
              >
                {c.sections.categories.ctaLabel}
                <ArrowUpRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
          <CategoryGrid categories={data.featuredCategories.slice(0, 8)} />
        </section>

        {/* Catálogo de Productos */}
        <section id="catalogo-global" className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-slate-800">
            <div>
              <Badge
                variant="outline"
                className="mb-3 rounded-full border-amber-200 bg-amber-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
              >
                {c.sections.catalog.badge}
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-slate-100">
                {c.sections.catalog.headline}
              </h2>
            </div>
            <Link href="/home/catalogo">
              <Button
                variant="ghost"
                className="group rounded-full px-5 py-5 text-sm font-bold text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-200"
              >
                {c.sections.catalog.ctaLabel}
                <ArrowUpRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
          <ProductGrid products={displayProducts} />
        </section>

        {/* Empresas destacadas */}
        <section id="empresas-global" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-slate-800">
            <div>
              <Badge
                variant="outline"
                className="mb-3 rounded-full border-blue-200 bg-blue-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
              >
                {c.sections.organizations.badge}
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-slate-100">
                {c.sections.organizations.headline}
              </h2>
            </div>
            <Link href="/home/empresas">
              <Button
                variant="ghost"
                className="group rounded-full px-5 py-5 text-sm font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
              >
                {c.sections.organizations.ctaLabel}
                <ArrowUpRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
          <OrganizationGrid organizations={data.featuredOrganizations.slice(0, 4)} />
        </section>

        <LoginAccessSection
          title="Accede al marketplace segun tu perfil"
          description="Los compradores pueden entrar a Mi cuenta para editar perfil, historial y recompra; los negocios pueden publicar su inventario, y tambien se puede seguir explorando sin cuenta."
          types={['customer', 'marketplace-business', 'guest-order']}
          returnUrl="/account"
          className="bg-white/70 dark:bg-slate-950/40"
        />
      </div>
    </MarketplaceLayout>
  );
}

export default PublicMarketplaceHome;

