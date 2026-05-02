'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';

interface InfiniteLogoMarqueeProps {
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

function buildTrackItems(organizations: FeaturedOrganizationCard[]) {
  if (organizations.length === 0) {
    return [];
  }

  const capped = organizations.slice(0, 24);
  const repeats = capped.length >= 8 ? 1 : Math.max(2, Math.ceil(8 / capped.length));

  return Array.from({ length: repeats }).flatMap(() => capped);
}

export function InfiniteLogoMarquee({ organizations }: InfiniteLogoMarqueeProps) {
  const items = buildTrackItems(organizations);

  if (items.length === 0) {
    return null;
  }

  const renderItems = (prefix: string) =>
    items.map((organization, index) => (
      <Link
        key={`${prefix}-${organization.id}-${index}`}
        href={organization.href}
        className="flex min-w-[240px] max-w-[240px] items-center gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-emerald-400/45 hover:bg-white/[0.07]"
      >
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/70">
          {organization.logo ? (
            <Image
              src={organization.logo}
              alt={organization.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-white">{getInitials(organization.name)}</span>
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{organization.name}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {organization.city || organization.department || 'Marketplace activo'}
            </span>
          </div>
        </div>
      </Link>
    ));

  return (
    <div className="group relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#020617] to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#020617] to-transparent sm:w-24" />

      <div className="flex w-max gap-4 [animation:empresas-logo-marquee_34s_linear_infinite] group-hover:[animation-play-state:paused]">
        <div className="flex shrink-0 gap-4 pr-4">{renderItems('primary')}</div>
        <div aria-hidden className="flex shrink-0 gap-4">
          {renderItems('duplicate')}
        </div>
      </div>

      <style jsx>{`
        @keyframes empresas-logo-marquee {
          from {
            transform: translate3d(0, 0, 0);
          }

          to {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
