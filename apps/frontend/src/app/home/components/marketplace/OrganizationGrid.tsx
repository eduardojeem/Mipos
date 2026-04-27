"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';

interface OrganizationGridProps {
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

export function OrganizationGrid({ organizations }: OrganizationGridProps) {
  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-3">
      {organizations.map((organization, index) => (
        <motion.article
          key={organization.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="flex h-full flex-col rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.55)] transition-all hover:-translate-y-1 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-[0_22px_55px_-40px_rgba(2,6,23,0.95)] dark:hover:shadow-blue-950/30"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-slate-100 shadow-inner dark:bg-slate-900 dark:shadow-none">
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
            <div>
              <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">
                {organization.name}
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Building2 className="h-3 w-3" />
                {organization.location}
              </div>
            </div>
          </div>
          <p className="mt-6 line-clamp-2 text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100">
            {organization.tagline}
          </p>
          <p className="mt-3 flex-1 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {organization.description}
          </p>
          <a href={organization.href} className="mt-8 inline-flex">
            <Button className="w-full rounded-full bg-slate-950 py-6 text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 dark:bg-blue-500 dark:text-slate-950 dark:hover:bg-blue-400 dark:hover:shadow-blue-950/40">
              Visitar tienda principal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </motion.article>
      ))}
    </div>
  );
}
