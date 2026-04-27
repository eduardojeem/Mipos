"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Clock3,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  ShoppingBag,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinessConfig, useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { hexToRgba } from '@/lib/color-utils';
import { useBrandingColors } from '@/hooks/useBrandingColors';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import {
  buildWhatsAppHref,
  getTenantPublicContent,
  getTenantPublicSections,
} from '@/lib/public-site/tenant-public-config';
import { NavBar } from './components/NavBar';
import { Footer } from './components/Footer';
import HomeSalesShowcase from './components/HomeSalesShowcase';
import type { TenantHomeSnapshot } from './home-types';
import type { Product } from '@/types';

const CART_PRODUCT_FALLBACK_DATE = '1970-01-01T00:00:00.000Z';

interface HomeClientProps {
  initialData: TenantHomeSnapshot;
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const { config, persisted } = useBusinessConfig();
  const { addToCart } = useCatalogCart();
  const { tenantHref } = useTenantPublicRouting();
  const formatCurrency = useCurrencyFormatter();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const whatsappHref = buildWhatsAppHref(
    config,
    `Hola, quiero consultar por ${config.businessName || 'su tienda'}.`
  );
  const { primary, secondary, textColor } = useBrandingColors();
  const [activeSection, setActiveSection] = useState('inicio');

  const stats = initialData.stats;
  const categories = initialData.categories;
  const offers = initialData.offers;
  const products = initialData.products;

  useEffect(() => {
    const ids = ['inicio', 'categorias', 'ofertas', 'productos', 'contacto'];
    const elements = ids
      .map((id) => ({ id, element: document.getElementById(id) }))
      .filter((entry): entry is { id: string; element: HTMLElement } => Boolean(entry.element));

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) {
        return;
      }

      const current = elements.find((entry) => entry.element === visible.target);
      if (current) {
        setActiveSection(current.id);
      }
    }, { rootMargin: '0px 0px -55% 0px', threshold: 0.25 });

    elements.forEach((entry) => observer.observe(entry.element));
    return () => observer.disconnect();
  }, [
    sections.showCategories,
    sections.showOffers,
    sections.showFeaturedProducts,
    sections.showContactInfo,
    sections.showLocation,
  ]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const heroActions = useMemo(() => {
    const next: Array<{ href: string; label: string; variant: 'primary' | 'secondary' }> = [];
    if (sections.showCatalog) {
      next.push({
        href: '/catalog',
        label: content.heroPrimaryCtaLabel || 'Ver catalogo',
        variant: 'primary',
      });
    }

    if (sections.showOffers) {
      next.push({
        href: '/offers',
        label: content.heroSecondaryCtaLabel || 'Ver ofertas',
        variant: 'secondary',
      });
    } else if (sections.showOrderTracking) {
      next.push({ href: '/orders/track', label: 'Seguir pedido', variant: 'secondary' });
    }

    return next;
  }, [
    content.heroPrimaryCtaLabel,
    content.heroSecondaryCtaLabel,
    sections.showCatalog,
    sections.showOffers,
    sections.showOrderTracking,
  ]);

  const addPreviewToCart = (product: {
    id: string;
    name: string;
    image: string;
    basePrice: number;
    offerPrice?: number;
    stock?: number;
  }) => {
    const cartProduct: Product = {
      id: product.id,
      name: product.name,
      sku: product.id,
      description: '',
      cost_price: product.basePrice,
      sale_price: product.basePrice,
      offer_price: product.offerPrice,
      stock_quantity: product.stock ?? 999,
      min_stock: 0,
      category_id: '',
      image_url: product.image,
      is_active: true,
      created_at: CART_PRODUCT_FALLBACK_DATE,
      updated_at: CART_PRODUCT_FALLBACK_DATE,
    };

    addToCart(
      cartProduct,
      1
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" style={{ color: textColor }}>
      <NavBar config={config} activeSection={activeSection} onNavigate={scrollToSection} />

      {!persisted ? (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
            Estas viendo una configuracion local todavia no sincronizada con la base de datos.
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-8">
        <div id="inicio" className="scroll-mt-20">
          <HomeSalesShowcase
            config={config}
            stats={stats}
            heroActions={heroActions}
            whatsappHref={whatsappHref}
            tenantHref={tenantHref}
            primary={primary}
            secondary={secondary}
            products={products}
            offers={offers}
            canUseCart={sections.showCart}
            onAddProductToCart={addPreviewToCart}
          />
        </div>

        {sections.showCategories && categories.length > 0 ? (
          <section id="categorias" className="scroll-mt-24 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Categorias
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {content.featuredCategoriesTitle || 'Categorias destacadas'}
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {content.featuredCategoriesDescription ||
                    'Bloques de entrada rapida para dirigir al cliente hacia los segmentos mas relevantes del catalogo.'}
                </p>
              </div>
              {sections.showCatalog ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-lg dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Link href={tenantHref('/catalog')}>Abrir catalogo</Link>
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="rounded-2xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900"
                >
                  <CardContent className="p-5">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}
                    >
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {category.productCount > 0 ? `${category.productCount} productos` : 'Sin productos aun'}
                    </p>
                    {sections.showCatalog ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="mt-4 rounded-xl px-0 text-sm"
                        style={{ color: primary }}
                      >
                        <Link href={tenantHref(`/catalog?category=${category.id}`)}>Explorar categoria</Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {sections.showOffers && offers.length > 0 ? (
          <section id="ofertas" className="scroll-mt-24 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Promociones
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {content.offersTitle || 'Ofertas activas'}
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {content.offersDescription ||
                    'Campanas con ahorro claro, fechas visibles y acceso rapido a conversion.'}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-lg dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Link href={tenantHref('/offers')}>
                  <Tag className="mr-2 h-3.5 w-3.5" />
                  Ver todas
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer) => (
                <Card
                  key={`${offer.id}-${offer.promotionName}`}
                  className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={offer.image}
                      alt={offer.name}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105"
                      sizes="33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-rose-600 text-white">
                        -{Math.round(offer.discountPercent)}%
                      </Badge>
                      <Badge className="border-0 bg-white/90 text-slate-900">
                        {offer.promotionName}
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-semibold text-white">{offer.name}</h3>
                    </div>
                  </div>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-400 line-through dark:text-slate-500">
                          {formatCurrency(offer.basePrice)}
                        </p>
                        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                          {formatCurrency(offer.offerPrice)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Ahorras {formatCurrency(Math.max(offer.basePrice - offer.offerPrice, 0))}
                        </p>
                      </div>
                      {offer.endDate ? (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {new Date(offer.endDate).toLocaleDateString('es-PY')}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-lg dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Link href={tenantHref('/offers')}>Ver detalle</Link>
                      </Button>
                      {sections.showCart ? (
                        <Button
                          size="sm"
                          className="flex-1 rounded-lg text-white shadow-none"
                          style={{ backgroundColor: primary }}
                          onClick={() =>
                            addPreviewToCart({
                              id: offer.id,
                              name: offer.name,
                              image: offer.image,
                              basePrice: offer.basePrice,
                              offerPrice: offer.offerPrice,
                            })
                          }
                        >
                          Agregar
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {sections.showFeaturedProducts && products.length > 0 ? (
          <section id="productos" className="scroll-mt-24 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Productos
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {content.featuredProductsTitle || 'Productos destacados'}
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {content.featuredProductsDescription ||
                    'Selecciones visibles con precio, estado y acceso inmediato a compra o detalle.'}
                </p>
              </div>
              {sections.showCatalog ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-lg dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Link href={tenantHref('/catalog')}>Ver catalogo completo</Link>
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => {
                const displayPrice = product.offerPrice ?? product.price;
                const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.price);

                return (
                  <Card
                    key={product.id}
                    className={`overflow-hidden rounded-2xl border shadow-none ${
                      hasOffer
                        ? 'border-rose-200 bg-gradient-to-b from-rose-50/80 to-white dark:border-rose-900/40 dark:from-rose-950/10 dark:to-slate-900'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <Link href={tenantHref(`/catalog/${product.id}`)} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-105"
                          sizes="25vw"
                        />
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          {hasOffer ? (
                            <Badge className="border-0 bg-rose-600 text-white">Oferta</Badge>
                          ) : null}
                          {product.categoryName ? (
                            <Badge className="border-0 bg-white/90 text-slate-900">
                              {product.categoryName}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <CardContent className="space-y-4 p-4">
                      <div>
                        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {product.name}
                        </h3>
                        {product.description ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {product.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div>
                          {hasOffer ? (
                            <p className="text-xs text-slate-400 line-through dark:text-slate-500">
                              {formatCurrency(product.price)}
                            </p>
                          ) : null}
                          <p className={`text-lg font-semibold ${hasOffer ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'}`}>
                            {formatCurrency(displayPrice)}
                          </p>
                        </div>
                        <span className={`text-xs font-medium ${
                          product.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}>
                          {product.stock > 0 ? 'En stock' : 'Sin stock'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-lg dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Link href={tenantHref(`/catalog/${product.id}`)}>Ver</Link>
                        </Button>
                        {sections.showCart ? (
                          <Button
                            size="sm"
                            className="rounded-lg text-white shadow-none"
                            disabled={product.stock <= 0}
                            style={{ backgroundColor: primary }}
                            onClick={() =>
                              addPreviewToCart({
                                id: product.id,
                                name: product.name,
                                image: product.image,
                                basePrice: product.price,
                                offerPrice: product.offerPrice,
                                stock: product.stock,
                              })
                            }
                          >
                            Agregar
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : null}

        {(sections.showContactInfo || sections.showLocation || sections.showBusinessHours) ? (
          <section id="contacto" className="scroll-mt-24 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Atencion al cliente
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                {content.contactTitle || 'Contacto y soporte'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {content.contactDescription ||
                  'Canales visibles para consultas, horario comercial y ubicacion del negocio.'}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
                <div className="h-1 w-full" style={{ backgroundColor: primary }} />
                <CardContent className="space-y-4 p-6">
                  {sections.showContactInfo && config.contact?.phone ? (
                    <a
                      href={`tel:${config.contact.phone}`}
                      className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                        style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}
                      >
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Telefono
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-slate-950 dark:text-slate-100">
                          {config.contact.phone}
                        </p>
                      </div>
                    </a>
                  ) : null}

                  {sections.showContactInfo && config.contact?.whatsapp ? (
                    <a
                      href={whatsappHref || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                        style={{ backgroundColor: hexToRgba(secondary, 0.1), color: secondary }}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          WhatsApp
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-slate-950 dark:text-slate-100">
                          {config.contact.whatsapp}
                        </p>
                      </div>
                    </a>
                  ) : null}

                  {sections.showLocation ? (
                    <div className="flex items-center gap-4 rounded-2xl p-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}
                      >
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Direccion
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-slate-950 dark:text-slate-100">
                          {[config.address?.street, config.address?.city, config.address?.department].filter(Boolean).join(', ') || 'Sin direccion publicada'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3 pt-2">
                    {whatsappHref ? (
                      <Button
                        asChild
                        size="sm"
                        className="rounded-lg text-white shadow-none"
                        style={{ backgroundColor: primary }}
                      >
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-2 h-3.5 w-3.5" />
                          Escribir ahora
                        </a>
                      </Button>
                    ) : null}
                    {sections.showOrderTracking ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-lg dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Link href={tenantHref('/orders/track')}>
                          <PackageSearch className="mr-2 h-3.5 w-3.5" />
                          Seguir pedido
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-5">
                {sections.showBusinessHours &&
                Array.isArray(config.businessHours) &&
                config.businessHours.length > 0 ? (
                  <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: hexToRgba(primary, 0.08), color: primary }}
                        >
                          <Clock3 className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Horarios de atencion
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {config.businessHours.map((hour) => (
                          <div
                            key={hour}
                            className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          >
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: primary }} />
                            {hour}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {sections.showCatalog ? (
                  <div
                    className="relative overflow-hidden rounded-xl p-5 text-white"
                    style={{ backgroundColor: primary }}
                  >
                    <div className="relative space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-white/70" />
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                          Siguiente paso
                        </p>
                      </div>
                      <p className="text-lg font-semibold">
                        {content.catalogTitle || 'Explora el catalogo'}
                      </p>
                      <p className="text-sm leading-6 text-white/70">
                        {content.catalogDescription ||
                          'Navega por todos los productos disponibles y lleva al cliente hacia una decision de compra clara.'}
                      </p>
                      <Button
                        asChild
                        className="mt-1 rounded-lg bg-white text-sm font-medium shadow-none hover:bg-white/90"
                        style={{ color: primary }}
                      >
                        <Link href={tenantHref('/catalog')}>Ir al catalogo</Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer config={config} onNavigate={scrollToSection} />
    </div>
  );
}
