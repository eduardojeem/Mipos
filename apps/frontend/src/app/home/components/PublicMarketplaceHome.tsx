"use client";

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
  Zap,
  Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GlobalMarketplaceHomeData } from '@/lib/public-site/data';
import { MarketplaceLayout } from './marketplace/MarketplaceLayout';
import { ProductGrid } from './marketplace/ProductGrid';
import { CategoryGrid } from './marketplace/CategoryGrid';
import { OrganizationGrid } from './marketplace/OrganizationGrid';

interface PublicMarketplaceHomeProps {
  data: GlobalMarketplaceHomeData;
  searchQuery?: string;
}

const statStyles = {
  blue: {
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300',
  },
} as const;

export function PublicMarketplaceHome({
  data,
  searchQuery = '',
}: PublicMarketplaceHomeProps) {
  const stats = [
    { label: 'Empresas Activas', value: data.stats.organizations, icon: Building2, color: 'blue' },
    { label: 'Productos Publicos', value: data.stats.products, icon: ShoppingBag, color: 'amber' },
    { label: 'Ventas en Tiempo Real', value: '24/7', icon: Zap, color: 'emerald' },
  ] as const;

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
                className="rounded-full border-blue-200 bg-blue-50/50 px-6 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 backdrop-blur-sm dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
              >
                <Sparkles className="mr-2 h-3 w-3 fill-blue-500" />
                Nueva Plataforma Global + Tenants
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-8 font-['Outfit'] text-6xl font-black leading-tight tracking-tight text-slate-950 sm:text-7xl lg:text-8xl dark:text-slate-100"
            >
              Tu negocio, <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                Sin Fronteras.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-300"
            >
              El dominio principal muestra la oferta global, mientras que cada empresa conserva su
              catalogo, branding y home propia por subdominio.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-4"
            >
              <Link href="/home/catalogo">
                <Button className="h-16 rounded-2xl bg-slate-950 px-10 text-lg font-bold text-white shadow-2xl shadow-blue-500/20 transition-all hover:-translate-y-1 hover:bg-blue-600 dark:bg-blue-500 dark:text-slate-950 dark:hover:bg-blue-400 dark:hover:shadow-blue-950/40">
                  Explorar Catalogo Global
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/inicio?plan=starter#registro">
                <Button
                  variant="outline"
                  className="h-16 rounded-2xl border-slate-200 bg-white/50 px-10 text-lg font-bold backdrop-blur-sm transition-all hover:bg-white dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Publicar mi empresa
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((stat, i) => {
              const styles = statStyles[stat.color];

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="group relative rounded-[2.5rem] border border-white/70 bg-white/40 p-8 text-center backdrop-blur-sm transition-all hover:bg-white hover:shadow-2xl dark:border-slate-800/80 dark:bg-slate-950/55 dark:hover:bg-slate-950 dark:hover:shadow-slate-950/40"
                >
                  <div
                    className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${styles.icon}`}
                  >
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-4xl font-black text-slate-950 dark:text-slate-100">
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
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
                <span className="text-blue-600 dark:text-blue-400">destacados</span> hoy
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
                <span className="text-amber-600 dark:text-amber-400">recientes</span>
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

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[3rem] bg-slate-950 p-12 text-white shadow-2xl lg:flex lg:items-center lg:justify-between lg:p-20 dark:border dark:border-slate-800/80 dark:bg-slate-950/95">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-10">
              <div className="absolute inset-0 translate-x-1/2 -translate-y-1/2 bg-blue-500 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-2xl">
              <Badge
                variant="outline"
                className="mb-6 border-white/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white/60"
              >
                Multi-tenant Architecture
              </Badge>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Lleva tu marca al siguiente nivel con MiPOS.
              </h2>
              <p className="mt-6 text-xl leading-relaxed text-slate-400">
                Vende bajo tu propio subdominio y aparece automaticamente en nuestro ecosistema
                global.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/inicio/planes">
                  <Button className="h-14 rounded-2xl bg-white px-8 text-lg font-bold text-slate-950 transition-all hover:bg-slate-100 dark:bg-blue-500 dark:text-slate-950 dark:hover:bg-blue-400">
                    Ver planes y precios
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button
                    variant="outline"
                    className="h-14 rounded-2xl border-white/20 bg-transparent px-8 text-lg font-bold text-white transition-all hover:bg-white/10"
                  >
                    Ir al panel de control
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative z-10 mt-12 grid grid-cols-2 gap-4 lg:ml-12 lg:mt-0">
              {[
                { icon: Globe, label: 'Dominio Propio' },
                { icon: Zap, label: 'Cloud API' },
                { icon: Sparkles, label: 'Branding UX' },
                { icon: Building2, label: 'Marketplace' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/40"
                >
                  <item.icon className="mb-3 h-8 w-8 text-blue-400" />
                  <span className="text-sm font-bold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MarketplaceLayout>
  );
}

export default PublicMarketplaceHome;
