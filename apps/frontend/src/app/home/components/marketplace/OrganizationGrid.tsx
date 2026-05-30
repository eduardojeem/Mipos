"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Globe, Layers3, MapPin, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';
import { cn } from '@/lib/utils';

interface OrganizationGridProps {
  organizations: FeaturedOrganizationCard[];
  className?: string;
}

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export function OrganizationGrid({ organizations, className }: OrganizationGridProps) {
  return (
    <div className={cn('mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3', className)}>
      {organizations.map((org, index) => (
        <motion.article
          key={org.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: Math.min(index, 8) * 0.04 }}
          className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-200/40 dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:border-sky-900/70 dark:hover:shadow-sky-950/30"
        >
          <div className="flex flex-1 flex-col p-5">
            {/* Header: logo + name + location */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                {org.logo ? (
                  <Image
                    src={org.logo}
                    alt={org.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base font-semibold text-slate-600 dark:text-slate-300">
                    {getInitials(org.name)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-950 dark:text-slate-100">
                  {org.name}
                </p>
                {org.location ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{org.location}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Tagline + description */}
            {org.tagline ? (
              <p className="mt-4 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {org.tagline}
              </p>
            ) : null}
            {org.description ? (
              <p className="mt-2 flex-1 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {org.description}
              </p>
            ) : null}

            {/* Inline stats */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <PackageSearch className="h-3.5 w-3.5" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{org.productCount || 0}</span> productos
              </span>
              <span className="flex items-center gap-1.5">
                <Layers3 className="h-3.5 w-3.5" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{org.categoryCount || 0}</span> categorías
              </span>
              {org.website ? (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-auto flex items-center gap-1 text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-400"
                  aria-label={`Sitio web de ${org.name}`}
                >
                  <Globe className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            {/* CTA — plain <a> forces full-page navigation so the middleware
                sets the correct tenant context (avoids client router cache collision
                when all tenant paths rewrite to the same /home route). */}
            <Button
              asChild
              size="sm"
              className="mt-4 w-full rounded-lg bg-slate-950 text-white transition-all hover:bg-sky-700 hover:shadow-md hover:shadow-sky-500/20 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              <a href={org.href}>
                Ver empresa
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
