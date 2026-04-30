"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Globe, Layers3, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';

interface OrganizationsCarouselProps {
  organizations: FeaturedOrganizationCard[];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationsCarousel({ organizations }: OrganizationsCarouselProps) {
  const items = useMemo(() => organizations.slice(0, 5), [organizations]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  if (items.length === 0) {
    return null;
  }

  const activeOrganization = items[activeIndex];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
      <div className="grid lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
        <div className="relative min-h-[300px] overflow-hidden bg-slate-100 dark:bg-slate-900">
          {activeOrganization.heroImage ? (
            <Image
              src={activeOrganization.heroImage}
              alt={activeOrganization.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(5,150,105,0.82))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />
          <div className="absolute left-6 top-6">
            <Badge className="rounded-full bg-white/90 text-slate-950 hover:bg-white dark:bg-slate-950/90 dark:text-white dark:hover:bg-slate-950">
              Destacada
            </Badge>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">
                Empresa activa
              </p>
              <h2 className="mt-2 line-clamp-2 text-3xl font-semibold tracking-tight text-white">
                {activeOrganization.name}
              </h2>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/90 shadow-lg dark:bg-slate-950/90">
              {activeOrganization.logo ? (
                <Image
                  src={activeOrganization.logo}
                  alt={activeOrganization.name}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  {getInitials(activeOrganization.name)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeOrganization.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  {activeOrganization.location}
                </Badge>
                {activeOrganization.website ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Globe className="mr-1.5 h-3.5 w-3.5" />
                    Sitio publico
                  </Badge>
                ) : null}
              </div>

              <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {activeOrganization.tagline}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {activeOrganization.description}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <PackageSearch className="h-4 w-4" />
                    Productos
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                    {activeOrganization.productCount || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Layers3 className="h-4 w-4" />
                    Categorias
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
                    {activeOrganization.categoryCount || 0}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={activeOrganization.href}>
                  <Button className="rounded-lg bg-slate-950 px-5 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                    Ver empresa
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => setActiveIndex((current) => (current - 1 + items.length) % items.length)}
                    aria-label="Empresa anterior"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => setActiveIndex((current) => (current + 1) % items.length)}
                    aria-label="Empresa siguiente"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {items.length > 1 ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeIndex
                      ? 'w-10 bg-emerald-500'
                      : 'w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                  }`}
                  aria-label={`Ver empresa ${item.name}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
