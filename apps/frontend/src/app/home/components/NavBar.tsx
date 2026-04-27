"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Home,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessConfig } from '@/types/business-config';
import { SimpleThemeToggle } from '@/components/ui/theme-toggle';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import {
  buildWhatsAppHref,
  getTenantAnnouncement,
  getTenantPublicSections,
} from '@/lib/public-site/tenant-public-config';
import PublicSearchBar from './PublicSearchBar';
import { CartButton } from './CartButton';

interface NavBarProps {
  config: BusinessConfig;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  showCartButton?: boolean;
}

type NavItem = {
  id: string;
  label: string;
  icon: typeof Home;
  href?: string;
  action?: () => void;
};

function NavBarComponent({
  config,
  activeSection,
  onNavigate,
  showCartButton = true,
}: NavBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { tenantHref } = useTenantPublicRouting();

  const sections = getTenantPublicSections(config);
  const announcement = getTenantAnnouncement(config);
  const whatsappHref = buildWhatsAppHref(config, 'Hola, quiero consultar por su tienda.');
  const primary = config?.branding?.primaryColor || '#0f766e';

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsMenuOpen(false);
  };

  const navItems = useMemo<NavItem[]>(
    () =>
      [
        { id: 'inicio', label: 'Inicio', icon: Home, action: () => handleNavigate('inicio') },
        sections.showCatalog
          ? { id: 'catalogo', label: 'Catálogo', icon: ShoppingBag, href: tenantHref('/catalog') }
          : null,
        sections.showOffers
          ? { id: 'ofertas', label: 'Ofertas', icon: Tag, href: tenantHref('/offers?status=active') }
          : null,
        sections.showOrderTracking
          ? { id: 'seguimiento', label: 'Pedidos', icon: Package, href: tenantHref('/orders/track') }
          : null,
        sections.showContactInfo || sections.showLocation
          ? { id: 'contacto', label: 'Contacto', icon: MessageCircle, action: () => handleNavigate('contacto') }
          : null,
      ].filter(Boolean) as NavItem[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sections.showCatalog,
      sections.showOffers,
      sections.showOrderTracking,
      sections.showContactInfo,
      sections.showLocation,
      tenantHref,
    ]
  );

  const brandMark = config.branding?.logo ? (
    <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <Image
        src={config.branding.logo}
        alt={config.businessName || 'Logo'}
        fill
        className="object-contain p-1.5"
        sizes="36px"
      />
    </div>
  ) : (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white"
      style={{ backgroundColor: primary }}
    >
      {(config.businessName || 'T').charAt(0).toUpperCase()}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
      {announcement ? (
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-center text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {announcement}
        </div>
      ) : null}

      <a
        href="#inicio"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-white dark:focus:bg-white dark:focus:text-slate-950"
      >
        Saltar al contenido
      </a>

      <nav aria-label="Navegacion publica" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">

          {/* Brand */}
          <Link href={tenantHref('/home')} className="flex min-w-0 shrink-0 items-center gap-2.5">
            {brandMark}
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{config.businessName}</p>
              {config.tagline ? (
                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{config.tagline}</p>
              ) : null}
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              const baseClass = 'relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors';
              const activeClass = 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100';
              const inactiveClass = 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100';
              const inner = <span>{item.label}</span>;

              if (item.href) {
                return (
                  <Link key={item.id} href={item.href} className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}>
                    {inner}
                    {isActive ? <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full" style={{ backgroundColor: primary }} /> : null}
                  </Link>
                );
              }
              return (
                <button key={item.id} onClick={item.action} className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}>
                  {inner}
                  {isActive ? <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full" style={{ backgroundColor: primary }} /> : null}
                </button>
              );
            })}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 lg:flex">
            {sections.showCatalog ? (
              <div className="w-64"><PublicSearchBar /></div>
            ) : null}
            {showCartButton ? <CartButton /> : null}
            <SimpleThemeToggle />
            {whatsappHref ? (
              <Button asChild size="sm" className="rounded-lg px-4 text-white shadow-none" style={{ backgroundColor: primary }}>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Consultar
                </a>
              </Button>
            ) : null}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 lg:hidden">
            {sections.showCatalog ? (
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-500 dark:text-slate-400" onClick={() => setIsSearchOpen((v) => !v)} aria-label={isSearchOpen ? 'Cerrar busqueda' : 'Abrir busqueda'}>
                <Search className="h-4 w-4" />
              </Button>
            ) : null}
            {showCartButton ? <CartButton /> : null}
            <SimpleThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-500 dark:text-slate-400" onClick={() => setIsMenuOpen((v) => !v)} aria-expanded={isMenuOpen} aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}>
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        {isSearchOpen && sections.showCatalog ? (
          <div className="border-t border-slate-100 py-3 dark:border-slate-800 lg:hidden">
            <PublicSearchBar />
          </div>
        ) : null}

        {/* Mobile menu */}
        {isMenuOpen ? (
          <div className="border-t border-slate-100 py-3 dark:border-slate-800 lg:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const cls = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`;
                if (item.href) {
                  return (
                    <Link key={item.id} href={item.href} onClick={() => setIsMenuOpen(false)} className={cls}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                      {isActive ? <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} /> : null}
                    </Link>
                  );
                }
                return (
                  <button key={item.id} onClick={item.action} className={cls}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {isActive ? <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} /> : null}
                  </button>
                );
              })}
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: primary }}>
                  <MessageCircle className="h-4 w-4" />
                  Escribir por WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}

export const NavBar = NavBarComponent;
export default NavBarComponent;
