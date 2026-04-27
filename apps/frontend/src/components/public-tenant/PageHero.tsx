'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Star, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hexToRgba } from '@/lib/color-utils';
import { getTenantHeroImage } from '@/lib/public-site/tenant-public-config';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import type { BusinessConfig } from '@/types/business-config';

type HeroAction = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

type HeroMetric = {
  label: string;
  value: string | number;
  helpText?: string;
};

interface PageHeroProps {
  config: BusinessConfig;
  badge?: string;
  title: string;
  description: string;
  actions?: HeroAction[];
  metrics?: HeroMetric[];
}

const TRUST_BADGES = [
  { icon: Truck, label: 'Envío rápido' },
  { icon: ShieldCheck, label: 'Compra segura' },
  { icon: Star, label: 'Productos originales' },
];

export function PageHero({
  config,
  badge,
  title,
  description,
  actions = [],
  metrics = [],
}: PageHeroProps) {
  const { tenantHref } = useTenantPublicRouting();
  const primary = config.branding?.primaryColor || '#0f766e';
  const image = getTenantHeroImage(config);

  const primaryAction = actions.find((a) => a.variant !== 'secondary') ?? actions[0];
  const secondaryAction = actions.find((a) => a.variant === 'secondary');

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
      {/* Layout: text left, image right */}
      <div className="grid min-h-[420px] lg:grid-cols-2">

        {/* Left — content */}
        <div className="relative z-10 flex flex-col justify-center gap-6 px-7 py-10 sm:px-10 lg:py-14">

          {/* Badge */}
          {badge ? (
            <span
              className="w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
              style={{ backgroundColor: hexToRgba(primary, 0.1), color: primary }}
            >
              {badge}
            </span>
          ) : null}

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl lg:leading-[1.1]">
              {title}
            </h1>
            <p className="max-w-md text-base leading-7 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>

          {/* CTAs */}
          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              {primaryAction ? (
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl px-7 text-white shadow-none"
                  style={{ backgroundColor: primary }}
                >
                  <Link href={tenantHref(primaryAction.href)}>
                    {primaryAction.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              {secondaryAction ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-7 border-slate-200 text-slate-700 shadow-none hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Link href={tenantHref(secondaryAction.href)}>
                    {secondaryAction.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          {/* Stats row */}
          {metrics.length > 0 ? (
            <div className="flex flex-wrap gap-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              {metrics.map((m) => (
                <div key={m.label}>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{m.value}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{m.label}</p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Trust badges */}
          <div className="flex flex-wrap gap-4">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Icon className="h-3.5 w-3.5" style={{ color: primary }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right — image */}
        <div className="relative hidden lg:block">
          {/* Tinted wash so image blends with bg */}
          <div
            className="absolute inset-0 z-10"
            style={{
              background: `linear-gradient(to right, white 0%, transparent 18%), linear-gradient(to top, white 0%, transparent 15%)`,
            }}
          />
          <div
            className="absolute inset-0 z-10 hidden dark:block"
            style={{
              background: `linear-gradient(to right, rgb(15 23 42) 0%, transparent 18%), linear-gradient(to top, rgb(15 23 42) 0%, transparent 15%)`,
            }}
          />
          <Image
            src={image}
            alt={config.businessName || 'Productos'}
            fill
            className="object-cover object-center"
            sizes="50vw"
            priority
          />
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-0.5 w-full" style={{ backgroundColor: hexToRgba(primary, 0.15) }} />
    </section>
  );
}

export default PageHero;
