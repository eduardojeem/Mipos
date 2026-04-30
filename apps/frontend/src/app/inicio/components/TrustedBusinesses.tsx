'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface PublicOrganizationsResponse {
  success?: boolean;
  organizations?: Organization[];
  count?: number;
}

export function TrustedBusinesses() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/organizations/public', { cache: 'no-store' });
      const data = (await response.json()) as PublicOrganizationsResponse;

      if (data.success) {
        setOrganizations(Array.isArray(data.organizations) ? data.organizations : []);
        setTotalCount(typeof data.count === 'number' ? data.count : 0);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeDisplayText = (value: string) => {
    try {
      const decoded = new TextDecoder('utf-8').decode(
        Uint8Array.from(value, (char) => char.charCodeAt(0))
      );
      return decoded.includes('�') ? value : decoded;
    } catch {
      return value;
    }
  };

  const getInitials = (name: string) =>
    normalizeDisplayText(name)
      .trim()
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const organizationsCountLabel = totalCount > 0 ? `${totalCount}+` : '500+';

  return (
    <section id="negocios" className="border-b border-white/10 py-20 lg:py-24">
      <div className="landing-container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
            <Building2 className="h-3.5 w-3.5 text-emerald-300" />
            Negocios publicados
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
            Empresas que ya operan dentro del ecosistema MiPOS
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Directorio vivo de negocios que usan la plataforma para vender, administrar catalogo y crecer con una base ordenada.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="landing-panel rounded-lg p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <Building2 className="h-7 w-7" />
            </div>
            <p className="mt-5 text-4xl font-semibold text-white">{organizationsCountLabel}</p>
            <p className="mt-2 text-sm text-slate-400">Negocios activos o publicados</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Crecimiento comercial visible
            </div>
          </div>

          <div className="landing-panel rounded-lg p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
              <Users className="h-7 w-7" />
            </div>
            <p className="mt-5 text-4xl font-semibold text-white">98%</p>
            <p className="mt-2 text-sm text-slate-400">Continuidad operativa</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Adopcion sostenida
            </div>
          </div>

          <div className="landing-panel rounded-lg p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="mt-5 text-4xl font-semibold text-white">5+</p>
            <p className="mt-2 text-sm text-slate-400">Anos de evolucion</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-sky-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Producto iterado sobre casos reales
            </div>
          </div>
        </div>

        <div className="mt-12">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="inline-flex items-center gap-3 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando negocios publicados
              </div>
            </div>
          ) : organizations.length === 0 ? (
            <div className="landing-panel rounded-lg p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-slate-500">
                <Building2 className="h-8 w-8" />
              </div>
              <p className="mt-5 text-xl font-medium text-white">Todavia no hay negocios visibles</p>
              <p className="mt-2 text-sm text-slate-400">Puedes ser de los primeros en publicar tu empresa.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {organizations.map((organization) => (
                  <div key={organization.id} className="landing-panel rounded-lg p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10 text-sm font-semibold text-emerald-200">
                        {getInitials(organization.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium text-white">
                          {normalizeDisplayText(organization.name)}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">@{organization.slug}</p>
                        <p className="mt-3 text-xs text-slate-400">
                          Presente desde {new Date(organization.created_at).getFullYear()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalCount > organizations.length ? (
                <p className="mt-6 text-center text-sm text-slate-400">
                  Y {totalCount - organizations.length} negocios mas forman parte del ecosistema.
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/empresas">
            <Button className="gradient-primary rounded-lg text-white">
              Ver directorio completo
            </Button>
          </Link>
          <Link href={buildPublicRegistrationPath('starter')}>
            <Button
              variant="outline"
              className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Publicar mi empresa
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
