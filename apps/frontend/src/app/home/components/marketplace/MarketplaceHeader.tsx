"use client";

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, LogIn, Menu, Search, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarketplaceHeaderProps {
  searchQuery?: string;
}

const navItems = [
  { name: 'Inicio', href: '/home' },
  { name: 'Catalogo', href: '/home/catalogo' },
  { name: 'Categorias', href: '/home/categorias' },
  { name: 'Empresas', href: '/home/empresas' },
];

export function MarketplaceHeader({ searchQuery = '' }: MarketplaceHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

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
              className="h-10 w-full rounded-full border border-slate-200 bg-white/60 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </form>

          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/auth/signin">
              <Button variant="ghost" className="h-10 rounded-full px-4 text-slate-700 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:bg-slate-800/70">
                <LogIn className="mr-2 h-4 w-4" />
                Ingresar
              </Button>
            </Link>
            <Link href="/inicio/planes">
              <Button className="h-10 rounded-full bg-slate-950 px-6 text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                Crear empresa
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-slate-700 dark:text-slate-200"
              onClick={() => setIsSearchVisible((current) => !current)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-slate-700 dark:text-slate-200"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSearchVisible ? (
          <motion.div
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

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-slate-100 bg-white/95 shadow-2xl backdrop-blur-xl lg:hidden dark:border-slate-800 dark:bg-slate-950/95"
          >
            <div className="flex h-full flex-col p-6">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 dark:bg-slate-100">
                    <Store className="h-4 w-4 text-white dark:text-slate-950" />
                  </div>
                  <span className="font-bold dark:text-slate-50">Menu</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <nav className="flex flex-col gap-4">
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
                <Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="h-14 w-full rounded-2xl border-slate-200 text-lg font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                    Ingresar
                  </Button>
                </Link>
                <Link href="/inicio/planes" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="h-14 w-full rounded-2xl bg-slate-950 text-lg font-bold dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                    Crear empresa
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
