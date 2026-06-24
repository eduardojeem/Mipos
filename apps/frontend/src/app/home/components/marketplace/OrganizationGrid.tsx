"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Globe, Layers3, MapPin, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';
import { cn } from '@/lib/utils';

interface OrganizationGridProps {
  organizations: FeaturedOrganizationCard[];
  className?: string;
}

/** Gradientes predefinidos para el banner cuando no hay imagen */
const BANNER_GRADIENTS = [
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-violet-500 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-700',
  'from-indigo-500 to-blue-800',
  'from-cyan-500 to-sky-700',
  'from-teal-500 to-emerald-700',
];

function getBannerGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash * 31) + name.charCodeAt(i)) | 0;
  }
  return BANNER_GRADIENTS[Math.abs(hash) % BANNER_GRADIENTS.length];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationGrid({ organizations, className }: OrganizationGridProps) {
  return (
    <div className={cn('mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {organizations.map((org, index) => {
        const gradient = getBannerGradient(org.name);
        return (
          <motion.article
            key={org.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(index, 12) * 0.04, duration: 0.25 }}
            className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800/80 dark:bg-slate-950/60 dark:hover:shadow-black/40"
          >
            {/* ── Banner ── */}
            <div className="relative h-16 overflow-hidden">
              {org.heroImage ? (
                <Image
                  src={org.heroImage}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-500 group-hover:scale-105`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

              {org.website ? (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-sm transition-colors hover:bg-white/45"
                  aria-label="Sitio web externo"
                >
                  <Globe className="h-3 w-3" />
                </a>
              ) : null}
            </div>

            {/* ── Logo flotante ── */}
            <div className="relative px-3">
              <div className="-mt-5 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-white bg-white shadow-md dark:border-slate-900 dark:bg-slate-800">
                {org.logo ? (
                  <Image
                    src={org.logo}
                    alt={org.name}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {getInitials(org.name)}
                  </span>
                )}
              </div>
            </div>

            {/* ── Contenido ── */}
            <div className="flex flex-1 flex-col px-3 pb-3 pt-1.5">
              <p className="truncate text-sm font-bold leading-tight text-slate-950 dark:text-white">
                {org.name}
              </p>
              {org.location ? (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{org.location}</span>
                </p>
              ) : null}

              {org.tagline ? (
                <p className="mt-2 line-clamp-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {org.tagline}
                </p>
              ) : null}

              {/* Stats */}
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <PackageSearch className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                  {org.productCount || 0}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Layers3 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  {org.categoryCount || 0}
                </span>
              </div>

              {/* CTA */}
              <a href={org.href} className="mt-3">
                <Button
                  size="sm"
                  className="h-8 w-full rounded-lg bg-slate-950 text-xs text-white transition-all duration-300 hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-500/25 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white dark:hover:shadow-white/10"
                >
                  Ver empresa
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </a>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
