"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BadgePercent,
  Headphones,
  Laptop,
  MessageCircle,
  Package,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Truck,
  Watch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductImagePlaceholder } from '@/components/products/ProductImagePlaceholder';
import { hexToRgba } from '@/lib/color-utils';
import { shouldBypassNextImageOptimizer } from '@/lib/images/next-image';
import type {
  HomeCategoryPreview,
  HomeOfferPreview,
  HomeProductPreview,
} from '@/app/home/home-types';

type ProductCartInput = {
  id: string;
  name: string;
  image: string;
  basePrice: number;
  offerPrice?: number;
  stock?: number;
};

type Formatter = (value: number) => string;

interface TrustStripProps {
  primary: string;
}

interface CategoryShowcaseProps {
  categories: HomeCategoryPreview[];
  title: string;
  tenantHref: (path: string) => string;
  primary: string;
  secondary: string;
}

interface OfferRailProps {
  offers: HomeOfferPreview[];
  title: string;
  description: string;
  tenantHref: (path: string) => string;
  primary: string;
  formatCurrency: Formatter;
  canUseCart: boolean;
  onAddProductToCart: (product: ProductCartInput) => void;
  renderCountdown: (endDate?: string) => ReactNode;
}

interface ProductRailProps {
  products: HomeProductPreview[];
  title: string;
  description: string;
  tenantHref: (path: string) => string;
  primary: string;
  formatCurrency: Formatter;
  canUseCart: boolean;
  whatsappHref: string | null;
  showCatalogLink: boolean;
  onAddProductToCart: (product: ProductCartInput) => void;
}

const CATEGORY_ICON_RULES: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /cel|phone|movil|smart/i, icon: Smartphone },
  { pattern: /notebook|laptop|pc|comput/i, icon: Laptop },
  { pattern: /audio|auricular|headphone|parlante/i, icon: Headphones },
  { pattern: /watch|reloj/i, icon: Watch },
  { pattern: /oferta|promo|descuento/i, icon: BadgePercent },
  { pattern: /accesorio|cable|cargador|case|funda/i, icon: Package },
];

function normalizeCategoryName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function resolveCategoryIcon(name: string): LucideIcon {
  const normalized = normalizeCategoryName(name);
  return CATEGORY_ICON_RULES.find((rule) => rule.pattern.test(normalized))?.icon ?? ShoppingBag;
}

function ProductMedia({ product }: { product: HomeProductPreview }) {
  const src = String(product.image || '').trim();
  const showImage = Boolean(src) && !src.startsWith('/api/placeholder/');

  if (!showImage) {
    return (
      <ProductImagePlaceholder
        productName={product.name}
        showLabel={false}
        className="absolute inset-0 rounded-none border-0"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={product.name}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 640px) 78vw, (max-width: 1024px) 36vw, 25vw"
      unoptimized={shouldBypassNextImageOptimizer(src)}
    />
  );
}

function OfferMedia({ offer }: { offer: HomeOfferPreview }) {
  const src = String(offer.image || '').trim();
  const showImage = Boolean(src) && !src.startsWith('/api/placeholder/');

  if (!showImage) {
    return (
      <ProductImagePlaceholder
        productName={offer.name}
        showLabel={false}
        className="absolute inset-0 rounded-none border-0"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={offer.name}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 640px) 82vw, (max-width: 1024px) 45vw, 33vw"
      unoptimized={shouldBypassNextImageOptimizer(src)}
    />
  );
}

export function HomeTrustStrip({ primary }: TrustStripProps) {
  const items = [
    { icon: Truck, title: 'Envios coordinados', detail: 'Retiro o entrega segun tu tienda' },
    { icon: ShieldCheck, title: 'Compra segura', detail: 'Stock y precios visibles' },
    { icon: MessageCircle, title: 'Atencion directa', detail: 'Consulta rapida por WhatsApp' },
    { icon: PackageCheck, title: 'Productos listos', detail: 'Catalogo actualizado' },
  ];

  return (
    <section aria-label="Beneficios de compra" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ icon: Icon, title, detail }) => (
        <div
          key={title}
          className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
            <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">{detail}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

export function HomeCategoryShowcase({
  categories,
  title,
  tenantHref,
  primary,
  secondary,
}: CategoryShowcaseProps) {
  const colors = [primary, secondary, '#059669', '#d97706', '#0f766e', '#dc2626'];

  return (
    <section id="categorias" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Compra por seccion
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</h2>
        </div>
        <Button asChild variant="ghost" size="sm" className="w-fit rounded-full" style={{ color: primary }}>
          <Link href={tenantHref('/catalog')}>
            Ver catalogo <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-6 lg:overflow-visible">
        {categories.map((category, index) => {
          const color = colors[index % colors.length];
          const Icon = resolveCategoryIcon(category.name);

          return (
            <Link
              key={category.id}
              href={tenantHref(`/catalog?category=${category.id}`)}
              className="group min-w-[168px] snap-start rounded-xl border bg-white/85 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900/75 lg:min-w-0"
              style={{ borderColor: hexToRgba(color, 0.28) }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-4 block line-clamp-2 min-h-10 text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">
                {category.name}
              </span>
              <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {category.productCount} productos
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomeOfferRail({
  offers,
  title,
  description,
  tenantHref,
  primary,
  formatCurrency,
  canUseCart,
  onAddProductToCart,
  renderCountdown,
}: OfferRailProps) {
  return (
    <section id="ofertas" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Promociones
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="w-fit rounded-full" style={{ color: primary }}>
          <Link href={tenantHref('/offers')}>
            Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className="group min-w-[300px] snap-start overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900 sm:min-w-[360px]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <OfferMedia offer={offer} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
              <Badge className="absolute left-3 top-3 border-0 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950">
                <BadgePercent className="mr-1 h-3 w-3" />
                -{Math.round(offer.discountPercent)}%
              </Badge>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  {offer.promotionName}
                </p>
                <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-tight text-white">{offer.name}</h3>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400 line-through">{formatCurrency(offer.basePrice)}</p>
                  <p className="text-2xl font-black text-slate-950 dark:text-slate-100">
                    {formatCurrency(offer.offerPrice)}
                  </p>
                </div>
                {renderCountdown(offer.endDate)}
              </div>

              {canUseCart ? (
                <Button
                  className="w-full rounded-lg text-white"
                  style={{ backgroundColor: primary }}
                  onClick={() => onAddProductToCart({
                    id: offer.id,
                    name: offer.name,
                    image: offer.image,
                    basePrice: offer.basePrice,
                    offerPrice: offer.offerPrice,
                  })}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Agregar oferta
                </Button>
              ) : (
                <Button asChild className="w-full rounded-lg text-white" style={{ backgroundColor: primary }}>
                  <Link href={tenantHref(`/catalog/${offer.id}`)}>Ver producto</Link>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeProductRail({
  products,
  title,
  description,
  tenantHref,
  primary,
  formatCurrency,
  canUseCart,
  whatsappHref,
  showCatalogLink,
  onAddProductToCart,
}: ProductRailProps) {
  return (
    <section id="productos" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Seleccion comercial
          </p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {showCatalogLink ? (
          <Button asChild variant="ghost" size="sm" className="w-fit rounded-full" style={{ color: primary }}>
            <Link href={tenantHref('/catalog')}>
              Ver todo <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((product) => {
          const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.price);
          const displayPrice = product.offerPrice ?? product.price;
          const isAvailable = product.stock > 0;

          return (
            <article
              key={product.id}
              className="group flex min-w-[260px] snap-start flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900 sm:min-w-[300px]"
            >
              <Link href={tenantHref(`/catalog/${product.id}`)} className="relative block aspect-[5/4] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <ProductMedia product={product} />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {hasOffer ? (
                    <Badge className="border-0 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950">
                      <Tag className="mr-1 h-3 w-3" />
                      Oferta
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-slate-950/75 text-white">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Nuevo
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-3 left-3">
                  <Badge className={isAvailable ? 'border-0 bg-blue-700 text-white dark:bg-blue-500' : 'border-0 bg-slate-700 text-white'}>
                    {isAvailable ? 'Disponible' : 'Sin stock'}
                  </Badge>
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-4">
                {product.categoryName ? (
                  <span className="mb-2 inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {product.categoryName}
                  </span>
                ) : null}
                <Link href={tenantHref(`/catalog/${product.id}`)}>
                  <h3 className="line-clamp-2 min-h-11 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-slate-700 dark:text-slate-100 dark:group-hover:text-slate-300">
                    {product.name}
                  </h3>
                </Link>
                {product.description ? (
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {product.description}
                  </p>
                ) : null}

                <div className="mt-4 flex items-end gap-2">
                  <span className={hasOffer ? 'text-2xl font-black text-slate-950 dark:text-slate-100' : 'text-2xl font-black text-slate-900 dark:text-slate-50'}>
                    {formatCurrency(displayPrice)}
                  </span>
                  {hasOffer ? (
                    <span className="pb-1 text-xs text-slate-400 line-through">{formatCurrency(product.price)}</span>
                  ) : null}
                </div>

                <div className="mt-auto pt-4">
                  {canUseCart ? (
                    <Button
                      className="w-full rounded-lg text-white"
                      style={{ backgroundColor: primary }}
                      disabled={!isAvailable}
                      onClick={() => onAddProductToCart({
                        id: product.id,
                        name: product.name,
                        image: product.image,
                        basePrice: product.price,
                        offerPrice: product.offerPrice,
                        stock: product.stock,
                      })}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {isAvailable ? 'Agregar al carrito' : 'Sin stock'}
                    </Button>
                  ) : whatsappHref ? (
                    <Button asChild className="w-full rounded-lg text-white" style={{ backgroundColor: primary }}>
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Consultar
                      </a>
                    </Button>
                  ) : (
                    <Button asChild className="w-full rounded-lg text-white" style={{ backgroundColor: primary }}>
                      <Link href={tenantHref(`/catalog/${product.id}`)}>Ver producto</Link>
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
