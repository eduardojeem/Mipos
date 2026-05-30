import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Layers3, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';
import { fetchGlobalOrganizationsSnapshot } from '@/lib/public-site/global-organizations-data';
import type { FeaturedOrganizationCard } from '@/lib/public-site/data';
import { Footer } from '../inicio/components/Footer';
import { LandingHeader } from '../inicio/components/LandingHeader';
import { InfiniteLogoMarquee } from './components/InfiniteLogoMarquee';
import '../inicio/landing.css';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('es-PY').format(value);
}

function OrganizationCard({ organization }: { organization: FeaturedOrganizationCard }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-emerald-400/40 hover:bg-white/[0.05]">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-slate-950/80">
        {organization.heroImage ? (
          <Image
            src={organization.heroImage}
            alt={organization.name}
            fill
            sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/55 to-slate-950/90" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/80">
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
              <h3 className="truncate text-lg font-semibold text-white">{organization.name}</h3>
              {organization.location ? (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{organization.location}</span>
                </div>
              ) : null}
            </div>
          </div>

          <Badge className="rounded-full border-0 bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
            {formatInteger(Number(organization.productCount || 0))} productos
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          {organization.tagline ? (
            <p className="text-base font-semibold text-white">{organization.tagline}</p>
          ) : null}
          {organization.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-400">{organization.description}</p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs uppercase tracking-[0.14em] text-slate-500">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-amber-300" />
            <span>{formatInteger(Number(organization.categoryCount || 0))} categorías</span>
          </div>
          <a
            href={organization.href}
            className="inline-flex items-center gap-2 text-emerald-300 transition hover:text-emerald-200"
          >
            Ver empresa
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default async function EmpresasPage() {
  const context = await resolveRequestTenantContext();

  if (context.kind !== 'root') {
    notFound();
  }

  const snapshot = await fetchGlobalOrganizationsSnapshot(context.hostname, {
    search: '',
    sortBy: 'featured',
    city: '',
    department: '',
  });

  const featuredOrganizations =
    snapshot.featuredOrganizations.length > 0
      ? snapshot.featuredOrganizations.slice(0, 6)
      : snapshot.organizations.slice(0, 6);
  const marqueeOrganizations =
    snapshot.organizations.length > 0 ? snapshot.organizations : snapshot.featuredOrganizations;

  return (
    <main className="landing-page landing-shell">
      <LandingHeader />

      {/* Actions */}
      <section className="border-b border-white/10 py-10">
        <div className="landing-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gradient-primary rounded-full px-5 text-white">
              <Link href="/home/empresas">
                Ver directorio completo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/10 bg-transparent px-5 text-white hover:bg-white/5"
            >
              <Link href={buildPublicRegistrationPath()}>
                Crear empresa
              </Link>
            </Button>
          </div>
          <Link href="/inicio/planes">
            <Button
              variant="outline"
              className="rounded-full border-white/10 bg-transparent px-5 text-white hover:bg-white/5"
            >
              Revisar planes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Marquee */}
      <section className="border-b border-white/10 py-10">
        <div className="landing-container">
          <InfiniteLogoMarquee organizations={marqueeOrganizations} />
        </div>
      </section>

      {/* Featured organizations grid */}
      <section className="py-16 sm:py-20">
        <div className="landing-container">
          {featuredOrganizations.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredOrganizations.map((organization) => (
                <OrganizationCard key={organization.id} organization={organization} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <p className="text-xl font-semibold text-white">Aún no hay empresas para destacar.</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Cuando existan organizaciones visibles, esta sección se completa automáticamente.
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
