"use client";

import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GlobalMarketplaceHomeData } from '@/lib/public-site/data';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';
import { MarketplaceLayout } from './marketplace/MarketplaceLayout';
import { ProductGrid } from './marketplace/ProductGrid';
import { CategoryGrid } from './marketplace/CategoryGrid';
import { OrganizationGrid } from './marketplace/OrganizationGrid';

interface PublicMarketplaceHomeProps {
  data: GlobalMarketplaceHomeData;
  searchQuery?: string;
}

export function PublicMarketplaceHome({
  data,
  searchQuery = '',
}: PublicMarketplaceHomeProps) {
  return (
    <MarketplaceLayout searchQuery={searchQuery}>
      <section className="relative overflow-hidden pb-24 pt-16 lg:pb-32 lg:pt-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50/60 px-6 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 backdrop-blur-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                <Sparkles className="mr-2 h-3 w-3 fill-emerald-500" />
                Ecosistema publico multiempresa
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-8 font-['Outfit'] text-6xl font-black leading-tight tracking-tight text-slate-950 sm:text-7xl lg:text-8xl dark:text-slate-100"
            >
              Directorio comercial <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 bg-clip-text text-transparent">
                conectado a MiPOS
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-300"
            >
              El dominio principal concentra empresas, categorias y productos publicados, mientras cada
              negocio conserva su catalogo, marca y operacion propia.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-4"
            >
              <Link href="/home/catalogo">
                <Button className="h-16 rounded-2xl bg-slate-950 px-10 text-lg font-bold text-white shadow-2xl shadow-emerald-500/20 transition-all hover:-translate-y-1 hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 dark:hover:shadow-emerald-950/40">
                  Explorar catalogo global
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <Link href={buildPublicRegistrationPath('starter')}>
                <Button
                  variant="outline"
                  className="h-16 rounded-2xl border-slate-200 bg-white/50 px-10 text-lg font-bold backdrop-blur-sm transition-all hover:bg-white dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Registrar mi empresa
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="relative z-10 space-y-32">
        <section id="empresas-global" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-10 md:flex-row md:items-end dark:border-slate-800">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="mb-4 rounded-full border-blue-200 bg-blue-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
              >
                Directorio Global
              </Badge>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl dark:text-slate-100">
                Marcas y negocios <br />
                <span className="text-blue-600 dark:text-blue-400">publicados</span> hoy
              </h2>
            </div>
            <Link href="/home/empresas">
              <Button
                variant="ghost"
                className="group rounded-full px-6 py-6 text-lg font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
              >
                Ver todos los negocios
                <ArrowUpRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
          <OrganizationGrid organizations={data.featuredOrganizations.slice(0, 3)} />
        </section>

        <section id="categorias-global" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-10 md:flex-row md:items-end dark:border-slate-800">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="mb-4 rounded-full border-emerald-200 bg-emerald-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                Navegacion Global
              </Badge>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl dark:text-slate-100">
                Explora por <br />
                <span className="text-emerald-600 dark:text-emerald-400">categoria</span>
              </h2>
            </div>
            <Link href="/home/categorias">
              <Button
                variant="ghost"
                className="group rounded-full px-6 py-6 text-lg font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
              >
                Ver todas las categorias
                <ArrowUpRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
          <CategoryGrid categories={data.featuredCategories.slice(0, 4)} />
        </section>

        <section id="catalogo-global" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-10 md:flex-row md:items-end dark:border-slate-800">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="mb-4 rounded-full border-amber-200 bg-amber-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
              >
                Catalogo Global
              </Badge>
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl dark:text-slate-100">
                Productos <br />
                <span className="text-amber-600 dark:text-amber-400">destacados</span>
              </h2>
            </div>
            <Link href="/home/catalogo">
              <Button
                variant="ghost"
                className="group rounded-full px-6 py-6 text-lg font-bold text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40 dark:hover:text-amber-200"
              >
                Ir al catalogo completo
                <ArrowUpRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
          <ProductGrid products={data.featuredProducts.slice(0, 3)} />
        </section>
      </div>
    </MarketplaceLayout>
  );
}

export default PublicMarketplaceHome;
