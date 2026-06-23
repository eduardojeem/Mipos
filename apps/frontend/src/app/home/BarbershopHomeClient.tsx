'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarPlus,
  Clock3,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Scissors,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusinessConfig, useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { shouldBypassNextImageOptimizer } from '@/lib/images/next-image';
import { useBrandingColors } from '@/hooks/useBrandingColors';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useAuth } from '@/hooks/use-auth';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import {
  buildWhatsAppHref,
  getTenantPublicContent,
  getTenantPublicSections,
} from '@/lib/public-site/tenant-public-config';
import { NavBar } from './components/NavBar';
import { Footer } from './components/Footer';
import { LoginAccessSection } from '@/components/auth/LoginAccessSection';
import type { TenantHomeSnapshot } from './home-types';
import type { Product } from '@/types';
import type { BusinessVertical } from '@/config/verticals';

interface BarbershopHomeClientProps {
  initialData: TenantHomeSnapshot;
  organizationId: string;
  vertical?: BusinessVertical;
}

type PublicService = {
  id: string;
  name: string;
  description?: string | null;
  duration_min?: number | null;
  price?: number | null;
  category?: string | null;
  color?: string | null;
};

type PublicStaff = {
  id: string;
  name: string;
  specialty?: string | null;
  color?: string | null;
  walkin_only?: boolean;
};

function usePublicBookingData(organizationId: string) {
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    let active = true;
    const qs = new URLSearchParams({ organizationId }).toString();

    setLoading(true);
    Promise.all([
      fetch(`/api/services/public?${qs}`, { cache: 'no-store' }).then((res) => res.json()).catch(() => ({})),
      fetch(`/api/staff/public?${qs}`, { cache: 'no-store' }).then((res) => res.json()).catch(() => ({})),
    ])
      .then(([servicesResponse, staffResponse]) => {
        if (!active) return;
        setServices(Array.isArray(servicesResponse?.services) ? servicesResponse.services : []);
        setStaff(Array.isArray(staffResponse?.staff) ? staffResponse.staff : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [organizationId]);

  return { services, staff, loading };
}

export default function BarbershopHomeClient({ initialData, organizationId, vertical = 'BARBERSHOP' }: BarbershopHomeClientProps) {
  const { config, persisted } = useBusinessConfig();
  const { addToCart } = useCatalogCart();
  const { user, loading: authLoading } = useAuth();
  const { tenantHref } = useTenantPublicRouting();
  const formatCurrency = useCurrencyFormatter();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const { primary, secondary, textColor } = useBrandingColors();
  const [activeSection, setActiveSection] = useState('inicio');
  const { services, staff, loading: bookingLoading } = usePublicBookingData(organizationId);

  const { offers, products } = initialData;
  const whatsappHref = buildWhatsAppHref(
    config,
    `Hola, quiero reservar un turno en ${config.businessName || 'la barberia'}.`,
  );
  const canBookOnline = services.length > 0 && staff.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const timer = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(hash);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const ids = ['inicio', 'servicios', 'profesionales', 'productos', 'contacto'];
    const elements = ids
      .map((id) => ({ id, element: document.getElementById(id) }))
      .filter((entry): entry is { id: string; element: HTMLElement } => Boolean(entry.element));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        const match = elements.find((entry) => entry.element === visible.target);
        if (match) setActiveSection(match.id);
      },
      { rootMargin: '0px 0px -55% 0px', threshold: 0.25 },
    );
    elements.forEach((entry) => observer.observe(entry.element));
    return () => observer.disconnect();
  }, [services.length, staff.length, products.length]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const serviceHighlights = useMemo(
    () => services.slice(0, 6),
    [services],
  );

  const addPreviewToCart = (product: {
    id: string;
    name: string;
    image: string;
    basePrice: number;
    offerPrice?: number;
    stock?: number;
  }) => {
    const now = new Date().toISOString();
    const cartProduct: Product = {
      id: product.id,
      name: product.name,
      sku: '',
      description: '',
      cost_price: 0,
      sale_price: product.basePrice,
      offer_price: product.offerPrice,
      stock_quantity: product.stock ?? 999,
      min_stock: 0,
      category_id: '',
      image_url: product.image,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    addToCart(cartProduct, 1);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 dark:bg-slate-950 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" style={{ color: textColor }}>
      <NavBar
        config={config}
        activeSection={activeSection}
        onNavigate={scrollToSection}
        vertical={vertical}
        showCartButton={sections.showCart}
      />

      {!persisted ? (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
            Configuracion local aun no sincronizada con la base de datos.
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-6 sm:px-6 lg:px-8">
        <section id="inicio" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-slate-800">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
            <div className="flex flex-col justify-center">
              <Badge className="w-fit border-0 bg-white/10 text-white">
                <Scissors className="mr-1.5 h-3.5 w-3.5" />
                {content.heroBadge || 'Barberia y peluqueria'}
              </Badge>
              <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                {config.heroTitle || 'Reserva tu turno en'}{' '}
                <span style={{ color: secondary || primary }}>{config.heroHighlight || config.businessName}</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                {config.heroDescription || 'Agenda servicios, elegi profesional y consulta productos recomendados para cuidar tu estilo.'}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full text-white" style={{ backgroundColor: primary }}>
                  <Link href={tenantHref('/reservar')}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    {canBookOnline ? 'Reservar turno' : 'Consultar disponibilidad'}
                  </Link>
                </Button>
                {sections.showFeaturedProducts || sections.showCatalog ? (
                  <Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10">
                    <Link href={sections.showCatalog ? tenantHref('/catalog') : '#productos'}>
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Ver productos
                    </Link>
                  </Button>
                ) : null}
                {sections.showOrderTracking ? (
                  <Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10">
                    <Link href={tenantHref('/orders/track')}>
                      <Package className="mr-2 h-4 w-4" />
                      Seguir compra
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <p className="text-sm font-semibold text-white">Turnos online</p>
                <p className="mt-2 text-sm text-slate-300">
                  {canBookOnline
                    ? 'Servicios y profesionales disponibles para reserva.'
                    : 'Carga servicios y profesionales para habilitar reservas publicas.'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <p className="text-sm font-semibold text-white">Venta de productos</p>
                <p className="mt-2 text-sm text-slate-300">
                  Shampoo, ceras, maquinas y accesorios pueden seguir visibles como venta secundaria.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="servicios" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: primary }}>Servicios</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Elegir servicio primero</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Cortes, barba, color y tratamientos separados del catalogo de productos.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-full" style={{ color: primary }}>
              <Link href={tenantHref('/reservar')}>
                Reservar <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {bookingLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
              ))}
            </div>
          ) : serviceHighlights.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {serviceHighlights.map((service) => (
                <Card key={service.id} className="group overflow-hidden rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">{service.name}</h3>
                        {service.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{service.description}</p>
                        ) : null}
                      </div>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: service.color || primary }} />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-4 w-4" />
                        {service.duration_min || 30} min
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">{formatCurrency(Number(service.price || 0))}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 bg-white/40 p-6 text-sm text-slate-500 backdrop-blur-sm dark:bg-slate-900/40 dark:text-slate-400">
              Todavia no hay servicios publicos cargados. La seccion queda preparada sin mezclarla con productos.
            </div>
          )}
        </section>

        <section id="profesionales" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
          <div>
            <p className="text-sm font-semibold" style={{ color: primary }}>Profesionales</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Equipo disponible</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              El cliente elige quien lo atiende antes de confirmar el turno.
            </p>
          </div>

          {staff.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {staff.slice(0, 8).map((member) => (
                <Card key={member.id} className="group relative overflow-hidden rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/60">
                  <div className="h-12 w-full transition-all duration-300 group-hover:h-14 opacity-80" style={{ backgroundColor: member.color || primary }} />
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="relative -mt-8 mb-2 h-16 w-16 shrink-0 overflow-hidden rounded-full border-[3px] border-white shadow-md transition-transform duration-300 group-hover:scale-105 dark:border-slate-900"
                        style={{ backgroundColor: `${member.color || primary}15` }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.dicebear.com/7.x/micah/svg?seed=${member.id}&backgroundColor=transparent`}
                          alt={member.name}
                          className="h-full w-full object-cover drop-shadow-sm"
                        />
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {member.name}
                        </p>
                        <p className="truncate mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {member.specialty || 'Profesional'}
                        </p>
                        {member.walkin_only && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-1.5 py-0">
                              Orden de llegada
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 bg-white/40 p-6 text-sm text-slate-500 backdrop-blur-sm dark:bg-slate-900/40 dark:text-slate-400">
              Todavia no hay profesionales publicos cargados.
            </div>
          )}
        </section>

        {(sections.showFeaturedProducts || sections.showCatalog) && products.length > 0 ? (
          <section id="productos" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)] space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: primary }}>Productos</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {content.featuredProductsTitle || 'Productos para cuidar tu estilo'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Venta secundaria sin mezclarla con los servicios de agenda.
                </p>
              </div>
              {sections.showCatalog ? (
                <Button asChild variant="ghost" size="sm" className="rounded-full" style={{ color: primary }}>
                  <Link href={tenantHref('/catalog')}>
                    Ver catalogo <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {products.slice(0, 8).map((product) => {
                const hasOffer = Boolean(product.offerPrice && product.offerPrice < product.price);
                const displayPrice = product.offerPrice ?? product.price;

                return (
                  <Card key={product.id} className="group overflow-hidden rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/60">
                    <Link href={tenantHref(`/catalog/${product.id}`)} className="block">
                      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <Image
                          src={product.image || '/api/placeholder/400/400'}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, 25vw"
                          unoptimized={shouldBypassNextImageOptimizer(product.image)}
                        />
                        {hasOffer ? (
                          <Badge className="absolute left-2 top-2 border-0 bg-rose-600 text-[10px] text-white">Oferta</Badge>
                        ) : null}
                      </div>
                    </Link>
                    <CardContent className="space-y-2 p-3 sm:p-4">
                      <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-slate-50">{formatCurrency(displayPrice)}</span>
                        {hasOffer ? <span className="text-xs text-slate-400 line-through">{formatCurrency(product.price)}</span> : null}
                      </div>
                      {sections.showCart ? (
                        <Button
                          size="sm"
                          className="w-full rounded-full text-xs text-white"
                          style={{ backgroundColor: primary }}
                          disabled={product.stock <= 0}
                          onClick={(event) => {
                            event.preventDefault();
                            addPreviewToCart({
                              id: product.id,
                              name: product.name,
                              image: product.image,
                              basePrice: product.price,
                              offerPrice: product.offerPrice,
                              stock: product.stock,
                            });
                          }}
                        >
                          {product.stock > 0 ? 'Agregar' : 'Sin stock'}
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : null}

        {sections.showOffers && offers.length > 0 ? (
          <section className="rounded-2xl border border-border/50 bg-white/60 p-5 backdrop-blur-xl dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: primary }}>
                  <Sparkles className="h-4 w-4" />
                  Ofertas de productos
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Promociones separadas de servicios y turnos.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="rounded-full" style={{ color: primary }}>
                <Link href={tenantHref('/offers?status=active')}>Ver ofertas</Link>
              </Button>
            </div>
          </section>
        ) : null}

        {(sections.showContactInfo || sections.showLocation || sections.showBusinessHours) ? (
          <section id="contacto" className="scroll-mt-[calc(var(--public-nav-height,4rem)+1rem)]">
            <Card className="overflow-hidden rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:shadow-md dark:bg-slate-900/60">
              <div className="h-1 w-full" style={{ backgroundColor: primary }} />
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                      {content.contactTitle || 'Contacto y ubicacion'}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                      {sections.showContactInfo && config.contact?.phone ? (
                        <a href={`tel:${config.contact.phone}`} className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200">
                          <Phone className="h-4 w-4" style={{ color: primary }} />
                          {config.contact.phone}
                        </a>
                      ) : null}
                      {sections.showContactInfo && config.contact?.whatsapp && whatsappHref ? (
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200">
                          <MessageCircle className="h-4 w-4" style={{ color: primary }} />
                          WhatsApp
                        </a>
                      ) : null}
                      {sections.showLocation && config.address?.city ? (
                        config.address?.mapUrl ? (
                          <a href={config.address.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-200">
                            <MapPin className="h-4 w-4" style={{ color: primary }} />
                            {[config.address.street, config.address.city].filter(Boolean).join(', ')}
                          </a>
                        ) : (
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" style={{ color: primary }} />
                            {[config.address.street, config.address.city].filter(Boolean).join(', ')}
                          </span>
                        )
                      ) : null}
                    </div>
                    {whatsappHref ? (
                      <Button asChild size="sm" className="rounded-full text-white" style={{ backgroundColor: primary }}>
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                          Consultar por WhatsApp
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {sections.showBusinessHours && Array.isArray(config.businessHours) && config.businessHours.length > 0 ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Clock3 className="h-4 w-4" style={{ color: primary }} />
                        Horarios
                      </p>
                      {config.businessHours.map((hour) => (
                        <p key={hour} className="text-sm text-slate-500 dark:text-slate-400">{hour}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
                {sections.showLocation && config.address?.mapEmbedEnabled && config.address?.mapEmbedUrl ? (
                  <div className="mt-6 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <iframe
                      src={config.address.mapEmbedUrl}
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {!authLoading && !user?.id ? (
          <LoginAccessSection
            title="Acceso para clientes"
            description="Inicia sesion para revisar reservas, compras de productos o volver a comprar."
            types={['customer', 'guest-order']}
            returnUrl={tenantHref('/account')}
            compact
            className="rounded-none bg-transparent"
          />
        ) : null}
      </main>

      <Footer config={config} onNavigate={scrollToSection} />
    </div>
  );
}
