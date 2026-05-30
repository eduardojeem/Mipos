"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Globe, Layers3, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';

const AUTOPLAY_INTERVAL = 6000;

const contentVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

interface OrganizationsCarouselProps {
  organizations: FeaturedOrganizationCard[];
}

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export function OrganizationsCarousel({ organizations }: OrganizationsCarouselProps) {
  const items = useMemo(() => organizations.slice(0, 5), [organizations]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);

  // Clamp index when items change
  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) setActiveIndex(0);
  }, [activeIndex, items.length]);

  const goNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const goTo = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }, [activeIndex]);

  // setTimeout resets timer on every manual navigation
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const timer = setTimeout(goNext, AUTOPLAY_INTERVAL);
    return () => clearTimeout(timer);
  }, [activeIndex, isPaused, items.length, goNext]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
  }, [goNext, goPrev]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
  }, [goNext, goPrev]);

  if (items.length === 0) return null;

  const active = items[activeIndex] || items[0];

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm focus:outline-none dark:border-slate-800 dark:bg-slate-950/80"
      aria-roledescription="carousel"
      aria-label="Empresas destacadas"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
        {/* Image panel */}
        <div className="relative min-h-[280px] overflow-hidden bg-slate-100 dark:bg-slate-900 lg:min-h-full">
          <AnimatePresence initial={false}>
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              {active.heroImage ? (
                <Image
                  src={active.heroImage}
                  alt={active.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(5,150,105,0.82))]" />
              )}
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

          <div className="absolute left-5 top-5">
            <Badge className="rounded-full bg-white/90 text-slate-950 hover:bg-white dark:bg-slate-950/90 dark:text-white">
              Destacada
            </Badge>
          </div>

          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Empresa activa
              </p>
              <h2 className="mt-1.5 line-clamp-2 text-2xl font-semibold tracking-tight text-white">
                {active.name}
              </h2>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/90 shadow-lg dark:bg-slate-950/90">
              {active.logo ? (
                <Image
                  src={active.logo}
                  alt={active.name}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  {getInitials(active.name)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content panel */}
        <div className="flex flex-col p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={active.id}
              custom={direction}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="flex flex-1 flex-col"
              role="group"
              aria-roledescription="slide"
              aria-label={`${activeIndex + 1} de ${items.length}: ${active.name}`}
            >
              {/* Location + website */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Building2 className="mr-1.5 h-3 w-3" />
                  {active.location}
                </Badge>
                {active.website ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Globe className="mr-1.5 h-3 w-3" />
                    Sitio público
                  </Badge>
                ) : null}
              </div>

              {/* Tagline + description */}
              <p className="mt-5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {active.tagline}
              </p>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {active.description}
              </p>

              {/* Inline stats */}
              <div className="mt-5 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <PackageSearch className="h-3.5 w-3.5" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{active.productCount || 0}</span> productos
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers3 className="h-3.5 w-3.5" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{active.categoryCount || 0}</span> categorías
                </span>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="rounded-lg bg-slate-950 px-5 text-white hover:bg-emerald-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  <Link href={active.href}>
                    Ver empresa
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                {items.length > 1 && (
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={goPrev}
                      aria-label="Empresa anterior"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[3ch] text-center text-xs tabular-nums text-slate-400">
                      {activeIndex + 1}/{items.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={goNext}
                      aria-label="Empresa siguiente"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots */}
          {items.length > 1 && (
            <div className="mt-5 flex items-center gap-1.5">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? 'w-8 bg-emerald-500'
                      : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                  }`}
                  aria-label={`Ver empresa ${item.name}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-200/60 dark:bg-slate-800/60">
          <motion.div
            key={`progress-${activeIndex}`}
            className="h-full origin-left bg-emerald-500/60"
            initial={{ scaleX: 0 }}
            animate={isPaused ? { scaleX: undefined } : { scaleX: 1 }}
            transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </section>
  );
}
