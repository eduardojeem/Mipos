"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, LogIn, LogOut, Menu, Search, Store, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';

interface MarketplaceHeaderProps {
  searchQuery?: string;
}

function getUserPanelHref(role: string | null | undefined): string {
  const r = (role || '').toUpperCase();
  if (r === 'SUPER_ADMIN') return '/superadmin';
  if (r === 'OWNER' || r === 'ADMIN') return '/admin';
  return '/dashboard';
}

function getUserInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const navItems = [
  { name: 'Inicio', href: '/home' },
  { name: 'Catalogo', href: '/home/catalogo' },
  { name: 'Categorias', href: '/home/categorias' },
  { name: 'Empresas', href: '/home/empresas' },
];

export function MarketplaceHeader({ searchQuery = '' }: MarketplaceHeaderProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const panelHref = useMemo(() => getUserPanelHref(user?.role), [user?.role]);
  const profileHref = '/account';
  const userInitials = useMemo(() => getUserInitials(user?.name, user?.email), [user?.name, user?.email]);

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false);
    await signOut();
    router.push('/home');
  };

  const toggleMobileSearch = () => {
    setIsSearchVisible((current) => {
      const next = !current;
      if (next) setIsMobileMenuOpen(false);
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/home" className="flex items-center gap-3 transition-transform hover:scale-[1.01]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-emerald-700 shadow-lg shadow-emerald-500/15 dark:from-slate-100 dark:to-emerald-400">
            <Store className="h-5 w-5 text-white dark:text-slate-950" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-tight text-slate-950 dark:text-slate-50">
              MiPOS <span className="text-emerald-600 dark:text-emerald-400">Marketplace</span>
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Directorio comercial
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-emerald-600 transition-all group-hover:w-full dark:bg-emerald-400" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <form action="/home/catalogo" className="relative hidden w-64 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="search"
              defaultValue={searchQuery}
              placeholder="Buscar productos o marcas"
              className="h-10 w-full rounded-full border border-slate-200 bg-white/60 pl-10 pr-4 text-sm outline-none shadow-sm transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </form>

          <div className="hidden items-center gap-2 sm:flex">
            {authLoading ? (
              <div className="h-10 w-32 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 gap-2 rounded-full border border-slate-200 bg-white px-2 pr-4 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-950 to-emerald-700 text-[11px] font-semibold text-white dark:from-slate-100 dark:to-emerald-400 dark:text-slate-950">
                      {userInitials}
                    </span>
                    <span className="max-w-[140px] truncate text-sm font-medium">
                      {user.name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{user.name || 'Sesion activa'}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(panelHref)} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Ir a mi panel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(profileHref)} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Mi cuenta
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-rose-600 focus:text-rose-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/auth/signin?type=customer&returnUrl=/account">
                  <Button variant="ghost" className="h-10 rounded-full px-4 text-slate-700 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:bg-slate-800/70">
                    <LogIn className="mr-2 h-4 w-4" />
                    Cliente
                  </Button>
                </Link>
                <Link href="/inicio#como-funciona">
                  <Button className="h-10 rounded-full bg-slate-950 px-6 text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                    Crear empresa
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-slate-700 dark:text-slate-200"
              onClick={toggleMobileSearch}
              aria-label={isSearchVisible ? 'Cerrar busqueda' : 'Abrir busqueda'}
              aria-controls="marketplace-mobile-search"
              aria-expanded={isSearchVisible}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-slate-700 dark:text-slate-200"
                  onClick={() => setIsSearchVisible(false)}
                  aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
                  aria-controls="marketplace-mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent
                id="marketplace-mobile-menu"
                side="right"
                className="w-full max-w-sm overflow-y-auto border-l border-slate-100 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
              >
                <div className="flex min-h-full flex-col p-6">
                  <SheetHeader className="mb-8 flex-row items-center gap-2 space-y-0 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 dark:bg-slate-100">
                      <Store className="h-4 w-4 text-white dark:text-slate-950" />
                    </div>
                    <SheetTitle className="font-bold dark:text-slate-50">Menu</SheetTitle>
                  </SheetHeader>

                  <nav className="flex flex-col gap-4" aria-label="Menu movil del marketplace">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-lg font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        {item.name}
                        <ArrowRight className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </Link>
                    ))}
                  </nav>

                  <div className="mt-auto flex flex-col gap-3 pt-8">
                    {authLoading ? (
                      <div className="h-14 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    ) : user ? (
                      <>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-950 to-emerald-700 text-sm font-semibold text-white dark:from-slate-100 dark:to-emerald-400 dark:text-slate-950">
                            {userInitials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-slate-950 dark:text-slate-100">
                              {user.name || 'Sesion activa'}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <Link href={panelHref} onClick={() => setIsMobileMenuOpen(false)}>
                          <Button className="h-14 w-full gap-2 rounded-2xl bg-slate-950 text-lg font-bold dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                            <LayoutDashboard className="h-5 w-5" />
                            Ir a mi panel
                          </Button>
                        </Link>
                        <Link href={profileHref} onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant="outline" className="h-14 w-full gap-2 rounded-2xl border-slate-200 text-lg font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                            <User className="h-5 w-5" />
                            Mi cuenta
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          className="h-12 w-full gap-2 rounded-2xl text-base font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-5 w-5" />
                          Cerrar sesion
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href="/auth/signin?type=customer&returnUrl=/account" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button variant="outline" className="h-14 w-full rounded-2xl border-slate-200 text-lg font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                            Entrar como cliente
                          </Button>
                        </Link>
                        <Link href="/inicio#como-funciona" onClick={() => setIsMobileMenuOpen(false)}>
                          <Button className="h-14 w-full rounded-2xl bg-slate-950 text-lg font-bold dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                            Crear empresa
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSearchVisible ? (
          <motion.div
            id="marketplace-mobile-search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 bg-white lg:hidden dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="p-4">
              <form action="/home/catalogo" className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  name="search"
                  autoFocus
                  defaultValue={searchQuery}
                  placeholder="Que estas buscando"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
