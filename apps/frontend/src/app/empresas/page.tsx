import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Globe,
  Layers3,
  MapPin,
  PackageSearch,
  Store,
} from 'lucide-react';
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

function formatAverage(value: number) {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
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
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{organization.location}</span>
              </div>
            </div>
          </div>

          <Badge className="rounded-full border-0 bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
            {formatInteger(Number(organization.productCount || 0))} productos
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-base font-semibold text-white">{organization.tagline}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{organization.description}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs uppercase tracking-[0.14em] text-slate-500">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-amber-300" />
            <span>{formatInteger(Number(organization.categoryCount || 0))} categorias</span>
          </div>
          <Link
            href={organization.href}
            className="inline-flex items-center gap-2 text-emerald-300 transition hover:text-emerald-200"
          >
            Ver empresa
            <ArrowRight className="h-4 w-4" />
          </Link>
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

  const spotlight = snapshot.featuredOrganizations[0] || snapshot.organizations[0] || null;
  const featuredOrganizations =
    snapshot.featuredOrganizations.length > 0
      ? snapshot.featuredOrganizations.slice(0, 6)
      : snapshot.organizations.slice(0, 6);
  const marqueeOrganizations =
    snapshot.organizations.length > 0 ? snapshot.organizations : snapshot.featuredOrganizations;

  return (
    <main className="landing-page landing-shell">
      <LandingHeader />

      <section className="border-b border-white/10 py-16 sm:py-20">
        <div className="landing-container">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-stretch">
            <div className="flex flex-col justify-between">
              <div>
                <Badge className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Directorio comercial
                </Badge>
                <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Organizaciones visibles, catalogos activos y presencia publica real.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  Esta seccion concentra las empresas que ya publican su operacion dentro de MiPOS.
                  Revisa quien esta activo, entra a sus catalogos y usa el directorio como prueba
                  real del ecosistema.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
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
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <Building2 className="h-4 w-4 text-amber-300" />
                    Organizaciones
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {formatInteger(snapshot.totalOrganizations)}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <Store className="h-4 w-4 text-amber-300" />
                    Productos
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {formatInteger(snapshot.totalProducts)}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <Layers3 className="h-4 w-4 text-amber-300" />
                    Categorias
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {formatInteger(snapshot.totalCategories)}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <PackageSearch className="h-4 w-4 text-amber-300" />
                    Promedio
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {formatAverage(snapshot.averageProductsPerOrganization)}
                  </p>
                </div>
              </div>
            </div>

            {spotlight ? (
              <article className="relative isolate overflow-hidden rounded-lg border border-white/10 bg-slate-950/80">
                {spotlight.heroImage ? (
                  <Image
                    src={spotlight.heroImage}
                    alt={spotlight.name}
                    fill
                    priority
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/75 to-emerald-950/60" />

                <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                      Empresa destacada
                    </Badge>
                    {spotlight.website ? (
                      <span className="inline-flex items-center gap-2 text-xs text-slate-300">
                        <Globe className="h-3.5 w-3.5" />
                        {spotlight.website}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-12">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/70">
                        {spotlight.logo ? (
                          <Image
                            src={spotlight.logo}
                            alt={spotlight.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-white">
                            {getInitials(spotlight.name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-3xl font-semibold text-white sm:text-4xl">
                          {spotlight.name}
                        </h2>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{spotlight.location}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-6 max-w-2xl text-lg font-medium text-slate-100">
                      {spotlight.tagline}
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                      {spotlight.description}
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Productos visibles
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {formatInteger(Number(spotlight.productCount || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Categorias activas
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {formatInteger(Number(spotlight.categoryCount || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Cobertura
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">{spotlight.location}</p>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button asChild className="gradient-primary rounded-full px-5 text-white">
                        <Link href={spotlight.href}>
                          Visitar empresa
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-white/10 bg-transparent px-5 text-white hover:bg-white/5"
                      >
                        <Link href="/home/catalogo">
                          Ver catalogo global
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-300">
                Todavia no hay organizaciones publicadas en el directorio.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-12 sm:py-14">
        <div className="landing-container">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Empresas en rotacion</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                Organizaciones visibles dentro del ecosistema.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              Una banda continua de marcas activas para revisar rapidamente quien esta publicando
              catalogo dentro de MiPOS.
            </p>
          </div>

          <InfiniteLogoMarquee organizations={marqueeOrganizations} />
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="landing-container">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Empresas destacadas
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Una muestra curada del directorio publico.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                Seleccion de organizaciones con mejor presencia publica, mayor volumen visible o
                catalogos mas representativos del marketplace actual.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/10 bg-transparent px-5 text-white hover:bg-white/5"
            >
              <Link href="/home/empresas">
                Ver directorio completo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {featuredOrganizations.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featuredOrganizations.map((organization) => (
                <OrganizationCard key={organization.id} organization={organization} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <p className="text-xl font-semibold text-white">Aun no hay empresas para destacar.</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Cuando existan organizaciones visibles, esta seccion se completa automaticamente
                con datos reales de Supabase.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.02] py-16">
        <div className="landing-container">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Alta comercial
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Tu empresa tambien puede aparecer aqui.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-400">
                Primero eliges capacidad y despues activas tu cuenta. Ese orden evita registros
                ambiguos y deja el onboarding alineado con el plan real.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="gradient-primary rounded-full px-5 text-white">
                <Link href="/inicio/planes">
                  Revisar planes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/10 bg-transparent px-5 text-white hover:bg-white/5"
              >
                <Link href="/home/catalogo">
                  Ver catalogo publico
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
