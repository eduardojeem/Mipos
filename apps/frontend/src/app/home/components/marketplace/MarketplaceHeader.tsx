"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Store,
  Menu,
  X,
  LogIn,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface MarketplaceHeaderProps {
  searchQuery?: string;
}

export function MarketplaceHeader({ searchQuery = '' }: MarketplaceHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const navItems = [
    { name: 'Inicio', href: '/home' },
    { name: 'Catálogo', href: '/home/catalogo' },
    { name: 'Categorías', href: '/home/categorias' },
    { name: 'Empresas', href: '/home/empresas' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/home" className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-blue-700 shadow-lg shadow-blue-500/20">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-tight text-slate-950 dark:text-slate-50">MiPOS <span className="text-blue-600 dark:text-blue-400">Marketplace</span></p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Plataforma Global</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300 lg:flex">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className="group relative transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-600 transition-all group-hover:w-full" />
            </Link>
          ))}
          <Link href="/inicio/planes" className="transition-colors hover:text-blue-600 dark:hover:text-blue-400">Planes</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop Search */}
          <form action="/home/catalogo" className="relative hidden w-64 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Buscar marcas o productos..."
              className="h-10 w-full rounded-full border border-slate-200 bg-white/50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </form>

          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/auth/signin">
              <Button variant="ghost" className="rounded-full h-10 px-4 text-slate-700 hover:bg-slate-100/50 dark:text-slate-200 dark:hover:bg-slate-800/70">
                <LogIn className="mr-2 h-4 w-4" />
                Ingresar
              </Button>
            </Link>
            <Link href="/inicio?plan=starter#registro">
              <Button className="rounded-full h-10 bg-slate-950 px-6 text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                Vender en MiPOS
              </Button>
            </Link>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-1 lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10 text-slate-700 dark:text-slate-200"
              onClick={() => setIsSearchVisible(!isSearchVisible)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10 text-slate-700 dark:text-slate-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isSearchVisible && (
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
                  name="q"
                  autoFocus
                  defaultValue={searchQuery}
                  placeholder="¿Qué estás buscando?"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-slate-100 bg-white/95 backdrop-blur-xl shadow-2xl lg:hidden dark:border-slate-800 dark:bg-slate-950/95"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-950 flex items-center justify-center">
                    <Store className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold dark:text-slate-50">Menú</span>
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
                <Link href="/inicio/planes" className="rounded-2xl border border-slate-100 p-4 text-lg font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">Explorar Planes</Link>
              </nav>

              <div className="mt-auto pt-8 flex flex-col gap-3">
                <Link href="/auth/signin">
                  <Button variant="outline" className="h-14 w-full rounded-2xl border-slate-200 text-lg font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                    Ingresar
                  </Button>
                </Link>
                <Link href="/inicio?plan=starter#registro">
                  <Button className="h-14 w-full rounded-2xl bg-slate-950 text-lg font-bold dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                    Publicar mi empresa
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
