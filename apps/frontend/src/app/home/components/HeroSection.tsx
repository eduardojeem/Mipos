"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BusinessConfig } from '@/types/business-config';
import {
  ShoppingCart,
  ArrowRight,
  Tag,
  Package,
  Users,
  Award,
} from 'lucide-react';
import { memo } from 'react';

interface HeroSectionProps {
  config: BusinessConfig;
  onViewOffers: () => void;
  stats?: { products: number; customers: number; sales: number; imageUrl?: string };
}

function HeroSectionComponent({ config, onViewOffers, stats }: HeroSectionProps) {
  const primary = config?.branding?.primaryColor || '#ec4899';
  const secondary = config?.branding?.secondaryColor || '#9333ea';
  const accent = config?.branding?.accentColor || primary;
  const gradientStart = config?.branding?.gradientStart || primary;
  const gradientEnd = config?.branding?.gradientEnd || secondary;
  const backgroundColor = config?.branding?.backgroundColor || undefined;
  const textColor = config?.branding?.textColor || undefined;

  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <section id="inicio" className="relative py-20 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-sky-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="hover:opacity-90 bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white border-0 shadow-lg shadow-sky-500/50 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105">
                ✨ Nuevos productos disponibles
              </Badge>
              <h1 className="home-heading text-5xl lg:text-7xl font-black leading-tight tracking-tight drop-shadow-sm">
                {config.heroTitle}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 animate-gradient">
                  {' '}
                  {config.heroHighlight}
                </span>
              </h1>
              <p className="text-xl leading-relaxed text-gray-700 dark:text-gray-300">{config.heroDescription}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/catalog">
                <Button className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white px-8 py-3 shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-teal-500/50 transition-all duration-300 hover:scale-105" size="lg">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Ver Todos los Productos
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/offers">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 border-2 border-sky-600 text-sky-600 hover:bg-sky-600 hover:text-white dark:border-sky-400 dark:text-sky-400 dark:hover:bg-sky-600 dark:hover:text-white shadow-md hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 hover:scale-105"
                >
                  <Tag className="w-5 h-5 mr-2" />
                  Ver Ofertas
                </Button>
              </Link>
            </div>

            {/* Estadísticas Premium */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              <div className="text-center group">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-4 border-2 border-sky-200/50 dark:border-sky-500/30 shadow-xl hover:shadow-2xl hover:shadow-sky-500/40 transition-all duration-300 hover:-translate-y-2 hover:border-sky-400">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/60 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-blue-500/60 transition-all">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-3xl font-black bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">{(stats?.products ?? 0).toString()}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Productos</p>
                </div>
              </div>
              <div className="text-center group">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-4 border-2 border-emerald-200/50 dark:border-emerald-500/30 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-400">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/60 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-teal-500/60 transition-all">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">{(stats?.customers ?? 0).toString()}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Clientes</p>
                </div>
              </div>
              <div className="text-center group">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-4 border-2 border-amber-200/50 dark:border-amber-500/30 shadow-xl hover:shadow-2xl hover:shadow-amber-500/40 transition-all duration-300 hover:-translate-y-2 hover:border-amber-400">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/60 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-orange-500/60 transition-all">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-3xl font-black bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">{(stats?.sales ?? 0).toString()}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Ventas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10">
              <Image
                src={stats?.imageUrl || '/api/placeholder/600/600'}
                alt="Productos de belleza"
                width={600}
                height={600}
                className="rounded-2xl shadow-2xl ring-4 ring-white/50 dark:ring-slate-800/50"
                sizes="(max-width: 1024px) 80vw, 600px"
                priority
              />
            </div>
            <div className="absolute -top-8 -right-8 w-80 h-80 bg-gradient-to-br from-sky-400 via-blue-400 to-cyan-400 rounded-full opacity-30 blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-8 -left-8 w-80 h-80 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-full opacity-30 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-400 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const HeroSection = memo(HeroSectionComponent);
export default HeroSection;
