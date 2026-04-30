"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Globe, Layers3, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';
import { cn } from '@/lib/utils';

interface OrganizationGridProps {
  organizations: FeaturedOrganizationCard[];
  className?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OrganizationGrid({ organizations, className }: OrganizationGridProps) {
  return (
    <div className={cn('mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3', className)}>
      {organizations.map((organization, index) => (
        <motion.article
          key={organization.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
          className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:border-emerald-900/70 dark:hover:shadow-emerald-950/20"
        >
          <div className="border-b border-slate-100/80 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-950 dark:shadow-none">
                  {organization.logo ? (
                    <Image
                      src={organization.logo}
                      alt={organization.name}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                      {getInitials(organization.name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-950 dark:text-slate-100">
                    {organization.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{organization.location}</span>
                  </div>
                </div>
              </div>

              {Number(organization.productCount || 0) > 0 ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {organization.productCount} productos
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-6">
            <p className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-100">
              {organization.tagline}
            </p>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {organization.description}
            </p>

            <div className="mt-6 grid gap-3 rounded-lg border border-slate-100/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-950 dark:shadow-none">
                  <PackageSearch className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Productos
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {organization.productCount || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-950 dark:shadow-none">
                  <Layers3 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                    Categorias
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {organization.categoryCount || 0}
                  </span>
                </div>
              </div>

              {organization.website ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-950 dark:shadow-none">
                    <Globe className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      Web
                    </span>
                    <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                      {organization.website}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <Link href={organization.href} className="mt-6">
              <Button className="w-full rounded-lg bg-slate-950 text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white">
                Ver empresa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
