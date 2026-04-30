'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Building2, LogIn, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';
import { cn } from '@/lib/utils';

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
  const isLandingPage = pathname === '/inicio' || pathname === '/';
  const isPlansPage = pathname.startsWith('/inicio/planes');
  const isRegistrationPage = pathname.startsWith('/inicio/registro');

  const statusLabel = useMemo(() => {
    if (isPlansPage) return 'Catalogo publico de planes';
    if (isRegistrationPage) return 'Alta de cuenta y activacion inicial';
    return 'Ventas, inventario y operacion';
  }, [isPlansPage, isRegistrationPage]);

  const primaryCta = useMemo(() => {
    if (isRegistrationPage) {
      return {
        href: '/inicio/planes',
        label: 'Cambiar plan',
      };
    }

    if (isPlansPage) {
      return {
        href: buildPublicRegistrationPath(),
        label: 'Ir al registro',
      };
    }

    return {
      href: '/inicio/planes',
      label: 'Ver planes',
    };
  }, [isPlansPage, isRegistrationPage]);

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
      <div className="landing-container">
        <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/inicio" className="flex min-w-0 items-center gap-3">
              <div className="landing-brand-mark flex h-11 w-11 items-center justify-center rounded-xl">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">MiPOS</p>
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

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/auth/signin">
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
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 lg:hidden"
            aria-label={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="pb-4 lg:hidden">
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
                          active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
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
                        active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="landing-divider mt-3 border-t pt-3">
                <div className="grid gap-2">
                  <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
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
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
