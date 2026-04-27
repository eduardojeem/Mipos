'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { hexToRgba } from '@/lib/color-utils';
import { getTenantHeroImage, getTenantPublicContent } from '@/lib/public-site/tenant-public-config';
import type { BusinessConfig } from '@/types/business-config';
import type {
  HomeOfferPreview,
  HomeProductPreview,
  HomeStats,
} from '@/app/home/home-types';

type HeroAction = {
  href: string;
  label: string;
  variant: 'primary' | 'secondary';
};

interface HomeSalesShowcaseProps {
  config: BusinessConfig;
  stats: HomeStats;
  heroActions: HeroAction[];
  whatsappHref: string | null;
  tenantHref: (path: string) => string;
  primary: string;
  secondary: string;
  products: HomeProductPreview[];
  offers: HomeOfferPreview[];
  canUseCart: boolean;
  onAddProductToCart: (product: {
    id: string;
    name: string;
    image: string;
    basePrice: number;
    offerPrice?: number;
    stock?: number;
  }) => void;
}

export default function HomeSalesShowcase({
  config,
  stats,
  heroActions,
  whatsappHref,
  tenantHref,
  primary,
  secondary,
  products,
  offers,
  canUseCart,
  onAddProductToCart,
}: HomeSalesShowcaseProps) {
  const content = getTenantPublicContent(config);
  const heroImage = getTenantHeroImage(config);
  const carouselImages = Array.isArray(config.carousel?.images) && config.carousel.images.length > 0
    ? config.carousel.images
    : [{ id: 'hero-fallback', url: heroImage, alt: config.businessName || 'Catalogo' }];
  const slides = carouselImages.slice(0, 5);
  const intervalMs = Math.max(3500, Number(config.carousel?.transitionSeconds || 5) * 1000);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  useEffect(() => {
    if (products.length > 0 && !products.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((previous) => (previous + 1) % slides.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, slides.length]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || products[0] || null,
    [products, selectedProductId]
  );

  const featuredOffer = useMemo(() => {
    if (offers.length === 0) {
      return null;
    }

    return offers[activeSlide % offers.length];
  }, [activeSlide, offers]);

  const primaryAction = heroActions.find((action) => action.variant !== 'secondary') ?? heroActions[0];
  const secondaryAction = heroActions.find((action) => action.variant === 'secondary');

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="grid gap-0 xl:grid-cols-[1.04fr_0.96fr]">
        <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background: `radial-gradient(circle at top left, ${hexToRgba(primary, 0.14)}, transparent 48%), radial-gradient(circle at bottom right, ${hexToRgba(secondary, 0.12)}, transparent 46%)`,
            }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  className="rounded-full border-0 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}
                >
                  {content.heroBadge || 'Venta online'}
                </Badge>
                {featuredOffer ? (
                  <Badge className="rounded-full border-0 bg-rose-600 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    Oferta activa {Math.round(featuredOffer.discountPercent)}% OFF
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.05]">
                  {config.heroTitle || 'Bienvenidos a'}{' '}
                  <span style={{ color: primary }}>
                    {config.heroHighlight || config.businessName}
                  </span>
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
                  {content.heroSecondaryText ||
                    config.heroDescription ||
                    'Explora el catalogo, aprovecha promociones vigentes y convierte visitas en ventas con una experiencia publica mas clara.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: 'Productos activos',
                    value: stats.products,
                    help: 'Catalogo listo para vender',
                  },
                  {
                    label: 'Categorias visibles',
                    value: stats.categories,
                    help: 'Navegacion ordenada',
                  },
                  {
                    label: 'Promociones',
                    value: stats.offers,
                    help: 'Campanas publicas activas',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.help}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                {primaryAction ? (
                  <Button
                    asChild
                    size="lg"
                    className="rounded-2xl px-7 text-white shadow-none"
                    style={{ backgroundColor: primary }}
                  >
                    <Link href={tenantHref(primaryAction.href)}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {primaryAction.label}
                    </Link>
                  </Button>
                ) : null}
                {secondaryAction ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-2xl border-slate-200 px-7 dark:border-slate-700"
                  >
                    <Link href={tenantHref(secondaryAction.href)}>
                      {secondaryAction.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                {!secondaryAction && whatsappHref ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-2xl border-slate-200 px-7 dark:border-slate-700"
                  >
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Consultar por WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Envios coordinados', icon: Truck },
                { label: 'Compra segura', icon: ShieldCheck },
                { label: 'Atencion comercial', icon: PackageCheck },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: hexToRgba(primary, 0.12), color: primary }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pensado para conversión</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative border-t border-slate-200 bg-slate-950 dark:border-slate-800 xl:border-l xl:border-t-0">
          <div className="absolute inset-0">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: index === activeSlide ? 1 : 0 }}
              >
                <Image
                  src={slide.url}
                  alt={slide.alt || config.businessName || 'Campana'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 48vw"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/30 to-slate-950/75" />
              </div>
            ))}
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">
                  Showcase comercial
                </p>
                <p className="mt-2 max-w-sm text-2xl font-semibold leading-tight text-white">
                  Carrusel orientado a ventas, con acceso directo a productos y promociones.
                </p>
              </div>

              {slides.length > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setActiveSlide((previous) => (previous - 1 + slides.length) % slides.length)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setActiveSlide((previous) => (previous + 1) % slides.length)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            {selectedProduct ? (
              <div className="space-y-5">
                <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        Producto recomendado
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">
                        {selectedProduct.name}
                      </h3>
                      {selectedProduct.categoryName ? (
                        <p className="mt-1 text-sm text-white/65">{selectedProduct.categoryName}</p>
                      ) : null}
                    </div>
                    {selectedProduct.offerPrice && selectedProduct.offerPrice < selectedProduct.price ? (
                      <Badge className="border-0 bg-rose-500 text-white">
                        Oferta vigente
                      </Badge>
                    ) : null}
                  </div>

                  {selectedProduct.description ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/70">
                      {selectedProduct.description}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <p className="text-3xl font-bold text-white">
                      {selectedProduct.offerPrice && selectedProduct.offerPrice < selectedProduct.price
                        ? new Intl.NumberFormat(config.regional.locale, {
                            style: 'currency',
                            currency: config.storeSettings.currency,
                            minimumFractionDigits: config.storeSettings.currency === 'PYG' ? 0 : 2,
                            maximumFractionDigits: config.storeSettings.currency === 'PYG' ? 0 : 2,
                          }).format(
                            config.storeSettings.currency === 'PYG'
                              ? Math.round(selectedProduct.offerPrice)
                              : selectedProduct.offerPrice
                          )
                        : new Intl.NumberFormat(config.regional.locale, {
                            style: 'currency',
                            currency: config.storeSettings.currency,
                            minimumFractionDigits: config.storeSettings.currency === 'PYG' ? 0 : 2,
                            maximumFractionDigits: config.storeSettings.currency === 'PYG' ? 0 : 2,
                          }).format(
                            config.storeSettings.currency === 'PYG'
                              ? Math.round(selectedProduct.price)
                              : selectedProduct.price
                          )}
                    </p>
                    {selectedProduct.offerPrice && selectedProduct.offerPrice < selectedProduct.price ? (
                      <p className="text-sm font-medium text-white/55 line-through">
                        {new Intl.NumberFormat(config.regional.locale, {
                          style: 'currency',
                          currency: config.storeSettings.currency,
                          minimumFractionDigits: config.storeSettings.currency === 'PYG' ? 0 : 2,
                          maximumFractionDigits: config.storeSettings.currency === 'PYG' ? 0 : 2,
                        }).format(
                          config.storeSettings.currency === 'PYG'
                            ? Math.round(selectedProduct.price)
                            : selectedProduct.price
                        )}
                      </p>
                    ) : null}
                    <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                      selectedProduct.stock > 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      {selectedProduct.stock > 0 ? `Stock ${selectedProduct.stock}` : 'Sin stock'}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="rounded-2xl border-0 text-white"
                      style={{ backgroundColor: primary }}
                    >
                      <Link href={tenantHref(`/catalog/${selectedProduct.id}`)}>
                        Ver producto
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    {canUseCart ? (
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15"
                        disabled={selectedProduct.stock <= 0}
                        onClick={() =>
                          onAddProductToCart({
                            id: selectedProduct.id,
                            name: selectedProduct.name,
                            image: selectedProduct.image,
                            basePrice: selectedProduct.price,
                            offerPrice: selectedProduct.offerPrice,
                            stock: selectedProduct.stock,
                          })
                        }
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    ) : null}
                  </div>
                </div>

                {products.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {products.slice(0, 4).map((product) => {
                      const isSelected = product.id === selectedProduct.id;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setSelectedProductId(product.id)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? 'border-white/35 bg-white/16 shadow-lg shadow-black/20'
                              : 'border-white/10 bg-white/8 hover:border-white/20 hover:bg-white/12'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="line-clamp-1 text-sm font-semibold text-white">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs text-white/60">
                                {product.categoryName || 'Producto destacado'}
                              </p>
                            </div>
                            {product.offerPrice && product.offerPrice < product.price ? (
                              <Badge className="border-0 bg-rose-500 text-white">Oferta</Badge>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 text-white/70 backdrop-blur-xl">
                No hay productos destacados disponibles todavia.
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Ir al slide ${index + 1}`}
                    onClick={() => setActiveSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === activeSlide ? 'w-10 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              {featuredOffer ? (
                <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                  <Sparkles className="h-4 w-4 text-white/55" />
                  {featuredOffer.promotionName}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
