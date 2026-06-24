'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Building2, LayoutDashboard, LogIn, LogOut, Menu, ShoppingBag, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';
import { cn } from '@/lib/utils';

function getUserPanelHref(role: string | null | undefined): string {
  const r = (role || '').toUpperCase();
  if (r === 'SUPER_ADMIN') return '/superadmin';
  if (r === 'OWNER' || r === 'ADMIN') return '/admin';
  return '/dashboard';
}

function getUserProfileHref(role: string | null | undefined): string {
  const r = (role || '').toUpperCase();
  if (r === 'OWNER' || r === 'ADMIN' || r === 'SUPER_ADMIN') return '/admin/profile';
  return '/dashboard/profile';
}

function getUserInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type NavItem =
  | { kind: 'scroll'; label: string; sectionId: string; active: (pathname: string) => boolean }
  | { kind: 'link'; label: string; href: string; active: (pathname: string) => boolean };

const NAV_ITEMS: NavItem[] = [
  {
    kind: 'scroll',
    label: 'Caracteristicas',
    sectionId: 'como-funciona',
    active: (pathname) => pathname === '/inicio' || pathname === '/',
  },
  {
    kind: 'link',
    label: 'Negocios',
    href: '/empresas',
    active: (pathname) => pathname.startsWith('/empresas'),
  },
  {
    kind: 'link',
    label: 'Planes',
    href: '/inicio/planes',
    active: (pathname) => pathname.startsWith('/inicio/planes') || pathname.startsWith('/inicio/registro'),
  },
];

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const panelHref = useMemo(() => getUserPanelHref(user?.role), [user?.role]);
  const profileHref = useMemo(() => getUserProfileHref(user?.role), [user?.role]);
  const userInitials = useMemo(() => getUserInitials(user?.name, user?.email), [user?.name, user?.email]);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    router.push('/inicio');
  };
  const isLandingPage = pathname === '/inicio' || pathname === '/';
  const isPlansPage = pathname.startsWith('/inicio/planes');
  const isRegistrationPage = pathname.startsWith('/inicio/registro');

  const statusLabel = useMemo(() => {
    if (isPlansPage) return 'Catalogo publico de planes';
    if (isRegistrationPage) return 'Alta de cuenta y activacion inicial';
    return 'Ventas, inventario y operacion';
  }, [isPlansPage, isRegistrationPage]);

  const primaryCta = useMemo(() => ({
    href: buildPublicRegistrationPath(),
    label: 'Crear cuenta',
  }), []);

  const scrollToSection = (sectionId: string) => {
    if (!isLandingPage) {
      router.push(`/inicio#${sectionId}`);
      setMobileMenuOpen(false);
      return;
    }

    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  const handleNavItem = (item: NavItem) => {
    if (item.kind === 'scroll') {
      scrollToSection(item.sectionId);
      return;
    }

    setMobileMenuOpen(false);
    router.push(item.href);
  };

  return (
    <header className="landing-header-surface sticky top-0 z-50 w-full">
      <div className="landing-container relative">
        <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/inicio" className="flex min-w-0 items-center gap-3">
              <div className="landing-brand-mark flex h-11 w-11 items-center justify-center rounded-xl">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">MITIENDA</p>
                <p className="truncate text-xs text-slate-400">{statusLabel}</p>
              </div>
            </Link>
          </div>

          <nav className="landing-nav-surface hidden items-center gap-1 rounded-full p-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.active(pathname);

              if (item.kind === 'scroll') {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleNavItem(item)}
                    className={cn(
                      'landing-nav-link rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      active && 'landing-nav-link-active'
                    )}
                  >
                    {item.label}
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'landing-nav-link rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    active && 'landing-nav-link-active'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Marketplace CTA — separado con estilo propio */}
          <Link
            href="/home"
            className={cn(
              'hidden items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all lg:flex',
              pathname === '/home'
                ? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:border-amber-400/60 hover:bg-amber-400/20 hover:text-amber-200'
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            Marketplace
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {authLoading ? (
              <div className="h-10 w-32 animate-pulse rounded-full bg-white/5" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 gap-2 rounded-full border border-white/10 bg-white/5 px-2 pr-4 text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-semibold text-white">
                      {userInitials}
                    </span>
                    <span className="max-w-[140px] truncate text-sm font-medium">
                      {user.name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{user.name || 'Sesión activa'}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(panelHref)} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Ir a mi panel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(profileHref)} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Mi perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-rose-600 focus:text-rose-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/auth/signin?type=business-owner&returnUrl=/dashboard">
                  <Button
                    variant="ghost"
                    className="rounded-full px-4 text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Ingresar
                  </Button>
                </Link>
                <Link href={primaryCta.href}>
                  <Button className="gradient-primary rounded-full px-5 text-white shadow-[0_18px_36px_-18px_rgba(16,185,129,0.9)]">
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-100 shadow-sm lg:hidden"
            aria-label={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-controls="landing-mobile-menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div
            id="landing-mobile-menu"
            className="absolute left-4 right-4 top-full z-50 mt-2 lg:hidden"
          >
            <div className="landing-panel rounded-2xl p-3">
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active = item.active(pathname);

                  if (item.kind === 'scroll') {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleNavItem(item)}
                        className={cn(
                          'block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                          active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'block rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                        active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Marketplace — destacado en mobile */}
              <Link
                href="/home"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
              >
                <ShoppingBag className="h-4 w-4" />
                Marketplace
              </Link>

              <div className="landing-divider mt-3 border-t pt-3">
                {authLoading ? (
                  <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
                ) : user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-3 py-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-semibold text-white">
                        {userInitials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{user.name || 'Sesión activa'}</p>
                        <p className="truncate text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Link href={panelHref} onClick={() => setMobileMenuOpen(false)}>
                        <Button className="gradient-primary w-full rounded-xl text-white">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Ir a mi panel
                        </Button>
                      </Link>
                      <Link href={profileHref} onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                        >
                          <User className="mr-2 h-4 w-4" />
                          Mi perfil
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full rounded-xl text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                        onClick={handleSignOut}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar sesión
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Link href="/auth/signin?type=business-owner&returnUrl=/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Ingresar
                      </Button>
                    </Link>
                    <Link href={primaryCta.href} onClick={() => setMobileMenuOpen(false)}>
                      <Button className="gradient-primary w-full rounded-xl text-white">
                        {primaryCta.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
