"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarPlus,
  ChevronDown,
  Home,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Scissors,
  Store,
  Tag,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BusinessConfig } from '@/types/business-config';
import { SimpleThemeToggle } from '@/components/ui/theme-toggle';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { useAuth } from '@/hooks/use-auth';
import {
  getTenantAnnouncement,
  getTenantPublicSections,
} from '@/lib/public-site/tenant-public-config';
import PublicSearchBar from './PublicSearchBar';
import { CartButton } from './CartButton';
import { normalizeVertical, type BusinessVertical } from '@/config/verticals';

interface NavBarProps {
  config: BusinessConfig;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  showCartButton?: boolean;
  skipTargetId?: string;
  vertical?: BusinessVertical;
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
  skipTargetId = 'inicio',
  vertical = 'RETAIL',
}: NavBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cookieVertical, setCookieVertical] = useState<BusinessVertical | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const { isPathTenantRouting, tenantHref } = useTenantPublicRouting();
  const { user, loading: authLoading, signOut } = useAuth();
  const pathname = usePathname() || '';
  const router = useRouter();
  // Detecta si el usuario está físicamente en la home del tenant
  // (path puede ser '/home' en server-rendered o '/{slug}/home' tras
  // el rewrite del middleware en producción).
  const isOnHome = pathname === '/home' || pathname.endsWith('/home');

  const sections = getTenantPublicSections(config);
  const announcement = getTenantAnnouncement(config);
  const primary = config?.branding?.primaryColor || '#0f766e';
  const customerAccountUrl = tenantHref('/account');
  const customerReturnUrl = tenantHref('/orders/track');
  const customerLoginHref = tenantHref(`/auth/signin?type=customer&returnUrl=${encodeURIComponent(customerAccountUrl)}`);
  const customerSignupHref = tenantHref(`/auth/signup?type=customer&returnUrl=${encodeURIComponent(customerAccountUrl)}`);
  const effectiveVertical = normalizeVertical(cookieVertical || vertical);
  const marketplaceHref = useMemo(() => {
    if (isPathTenantRouting) return '/home';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return '/home';
    try {
      return `${new URL(appUrl).origin}/home`;
    } catch {
      return '/home';
    }
  }, [isPathTenantRouting]);
  const profileName = user?.name || user?.full_name || user?.email || 'Cliente';
  const profileInitial = profileName.charAt(0).toUpperCase();

  const handleCustomerSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    router.replace(tenantHref('/home'));
  };

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )x-organization-vertical=([^;]*)/);
    setCookieVertical(match?.[1] ? normalizeVertical(decodeURIComponent(match[1])) : null);
  }, [pathname]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--public-nav-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
      document.documentElement.style.removeProperty('--public-nav-height');
    };
  }, [announcement, isMenuOpen, isSearchOpen]);

  const handleNavigate = (id: string) => {
    // En home: deja que el padre haga scroll + actualice activeSection.
    // Fuera de home: navega a /home con hash; el componente de home
    // detectará el hash y scrolleará al cargar.
    if (isOnHome) {
      onNavigate(id);
    } else {
      router.push(tenantHref(`/home#${id}`));
    }
    setIsMenuOpen(false);
  };

  const toggleMobileSearch = () => {
    setIsSearchOpen((current) => {
      const next = !current;
      if (next) setIsMenuOpen(false);
      return next;
    });
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen((current) => {
      const next = !current;
      if (next) setIsSearchOpen(false);
      return next;
    });
  };

  const navItems = useMemo<NavItem[]>(
    () => {
      if (effectiveVertical === 'BARBERSHOP') {
        return [
          { id: 'inicio', label: 'Inicio', icon: Home, action: () => handleNavigate('inicio') },
          { id: 'servicios', label: 'Servicios', icon: Scissors, action: () => handleNavigate('servicios') },
          { id: 'profesionales', label: 'Profesionales', icon: Users, href: tenantHref('/profesionales') },
          sections.showFeaturedProducts || sections.showCatalog
            ? { id: 'productos', label: 'Productos', icon: ShoppingBag, href: tenantHref('/catalog') }
            : null,
          sections.showOrderTracking
            ? { id: 'seguimiento', label: 'Compras', icon: Package, href: tenantHref('/orders/track') }
            : null,
          { id: 'reservar', label: 'Reservar', icon: CalendarPlus, href: tenantHref('/reservar') },
        ].filter(Boolean) as NavItem[];
      }

      return [
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
      ].filter(Boolean) as NavItem[];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sections.showCatalog,
      sections.showOffers,
      sections.showOrderTracking,
      sections.showContactInfo,
      sections.showLocation,
      sections.showFeaturedProducts,
      tenantHref,
      effectiveVertical,
    ]
  );

  const brandMark = config.branding?.logo ? (
    <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-border/50 bg-white/60 shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-[1.04] dark:bg-slate-800/60">
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
      className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white transition-transform duration-300 group-hover:scale-[1.04]"
      style={{ backgroundColor: primary }}
    >
      {(config.businessName || 'T').charAt(0).toUpperCase()}
    </div>
  );

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border/50 bg-white/70 backdrop-blur-xl dark:bg-slate-950/70">
      {announcement ? (
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-400 shadow-inner">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {announcement}
          </span>
        </div>
      ) : null}

      <a
        href={`#${skipTargetId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-white dark:focus:bg-white dark:focus:text-slate-950"
      >
        Saltar al contenido
      </a>

      <nav aria-label="Navegacion publica" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 xl:gap-4">

          {/* Brand */}
          <Link href={tenantHref('/home')} className="group flex min-w-0 shrink items-center gap-2.5">
            {brandMark}
            <div className="hidden min-w-0 max-w-[150px] sm:block xl:max-w-[220px]">
              <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white transition-colors">{config.businessName}</p>
              {config.tagline ? (
                <p className="truncate text-[11px] text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400 transition-colors">{config.tagline}</p>
              ) : null}
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 xl:flex">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;

              if (item.id === 'reservar') {
                return (
                  <Link
                    key={item.id}
                    href={item.href || '#'}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-95 2xl:px-4"
                    style={{ backgroundColor: primary }}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              const baseClass = 'relative flex shrink-0 items-center gap-1 px-3 py-2.5 text-sm font-semibold transition-all duration-200';
              const activeClass = 'text-slate-950 dark:text-slate-50';
              const inactiveClass = 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200';
              const inner = <span>{item.label}</span>;

              if (item.href) {
                return (
                  <Link key={item.id} href={item.href} className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}>
                    {inner}
                    {isActive ? (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full animate-in fade-in duration-200"
                        style={{ backgroundColor: primary }}
                      />
                    ) : null}
                  </Link>
                );
              }
              return (
                <button key={item.id} onClick={item.action} className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}>
                  {inner}
                  {isActive ? (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full animate-in fade-in duration-200"
                      style={{ backgroundColor: primary }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Desktop actions */}
          <div className="hidden min-w-0 shrink-0 items-center gap-1.5 xl:flex 2xl:gap-2">
            <Button asChild size="icon" className="h-9 w-9 shrink-0 rounded-full p-0 text-white shadow-md transition-all hover:scale-[1.02] hover:opacity-90 active:scale-95" style={{ backgroundColor: primary }}>
              <Link href={marketplaceHref} aria-label="Volver al marketplace" title="Volver al marketplace">
                <Store className="h-4 w-4" />
                <span className="sr-only">Marketplace</span>
              </Link>
            </Button>
            {sections.showCatalog ? (
              <div className="hidden w-40 min-w-0 xl:block 2xl:w-56"><PublicSearchBar /></div>
            ) : null}
            {showCartButton ? <CartButton /> : null}
            <SimpleThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full px-3 shadow-sm transition-all hover:scale-[1.02] active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold text-white mr-1.5" style={{ backgroundColor: primary }}>
                      {profileInitial}
                    </span>
                    <span className="max-w-24 truncate font-semibold">{profileName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-border/50 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80">
                  <DropdownMenuLabel className="px-3 py-2">
                    <span className="block truncate text-sm font-bold">{profileName}</span>
                    {user.email ? <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span> : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem asChild className="rounded-lg m-1">
                    <Link href={customerAccountUrl}>
                      <UserRound className="mr-2 h-4 w-4 text-slate-400" />
                      Mi cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg m-1">
                    <Link href={customerReturnUrl}>
                      <Package className="mr-2 h-4 w-4 text-slate-400" />
                      Mis pedidos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={handleCustomerSignOut} className="rounded-lg m-1 text-rose-600 focus:text-rose-600 dark:text-rose-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="rounded-full border-border/50 px-4 shadow-sm transition-all hover:scale-[1.02] hover:bg-slate-50 active:scale-95 dark:border-border/50 dark:text-slate-300 dark:hover:bg-slate-900" disabled={authLoading}>
                  <Link href={customerLoginHref}>
                    <LogIn className="mr-1.5 h-3.5 w-3.5" />
                    Cliente
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-full px-4 text-white shadow-md transition-all hover:scale-[1.02] hover:opacity-90 active:scale-95" style={{ backgroundColor: primary }}>
                  <Link href={customerSignupHref}>
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Registrarse
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1.5 xl:hidden">
            {sections.showCatalog ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                onClick={toggleMobileSearch}
                aria-label={isSearchOpen ? 'Cerrar busqueda' : 'Abrir busqueda'}
                aria-controls="public-mobile-search"
                aria-expanded={isSearchOpen}
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : null}
            {showCartButton ? <CartButton /> : null}
            <SimpleThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
              onClick={toggleMobileMenu}
              aria-expanded={isMenuOpen}
              aria-controls="public-mobile-menu"
              aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        {isSearchOpen && sections.showCatalog ? (
          <div id="public-mobile-search" className="border-t border-border/50 py-3 dark:border-border/50 xl:hidden">
            <PublicSearchBar />
          </div>
        ) : null}

        {/* Mobile menu */}
        {isMenuOpen ? (
          <div id="public-mobile-menu" className="border-t border-border/50 py-3 dark:border-border/50 xl:hidden">
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                if (item.id === 'reservar') {
                  return (
                    <Link
                      key={item.id}
                      href={item.href || '#'}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-white transition-all shadow-md mt-2 mb-1 active:scale-95"
                      style={{ backgroundColor: primary }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                }

                const cls = `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-100'
                }`;

                if (item.href) {
                  return (
                    <Link key={item.id} href={item.href} onClick={() => setIsMenuOpen(false)} className={cls}>
                      <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                      {item.label}
                      {isActive ? <span className="ml-auto h-2 w-2 rounded-full" style={{ backgroundColor: primary }} /> : null}
                    </Link>
                  );
                }
                return (
                  <button key={item.id} onClick={item.action} className={cls}>
                    <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" />
                    {item.label}
                    {isActive ? <span className="ml-auto h-2 w-2 rounded-full" style={{ backgroundColor: primary }} /> : null}
                  </button>
                );
              })}
              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
              <Link
                href={marketplaceHref}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: primary }}
              >
                <Store className="h-[18px] w-[18px] shrink-0" />
                Volver al marketplace
              </Link>

              {user ? (
                <div className="mt-2 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm" style={{ backgroundColor: primary }}>
                      {profileInitial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{profileName}</p>
                      {user.email ? <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p> : null}
                    </div>
                  </div>
                  <Link
                    href={customerAccountUrl}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-100"
                  >
                    <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                    Mi cuenta
                  </Link>
                  <Link
                    href={customerReturnUrl}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-100"
                  >
                    <Package className="h-4 w-4 shrink-0 text-slate-400" />
                    Mis pedidos
                  </Link>
                  <button
                    type="button"
                    onClick={handleCustomerSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/20 dark:hover:text-rose-300"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Cerrar sesion
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Link
                    href={customerLoginHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition-all active:scale-95"
                  >
                    <LogIn className="h-4 w-4 shrink-0 text-slate-400" />
                    Entrar
                  </Link>
                  <Link
                    href={customerSignupHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: primary }}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    Registrarse
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}

export const NavBar = NavBarComponent;
export default NavBarComponent;
