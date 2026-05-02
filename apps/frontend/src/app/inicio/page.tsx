'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlans } from '@/hooks/use-plans';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';
import './landing.css';
import { Footer, HeroSection, HowItWorksSection, LandingHeader } from './components';

const benefits = [
  {
    icon: Zap,
    title: 'Operacion rapida',
    description: 'Venta, caja y actualizacion de stock en el mismo flujo de trabajo.',
    accent: 'text-amber-300',
  },
  {
    icon: Shield,
    title: 'Base segura',
    description: 'Datos por empresa, configuracion central y estructura lista para administracion real.',
    accent: 'text-emerald-300',
  },
  {
    icon: BarChart3,
    title: 'Lectura de negocio',
    description: 'Reportes y senales de rendimiento para ventas, equipo y reposicion.',
    accent: 'text-sky-300',
  },
  {
    icon: Users,
    title: 'Equipo controlado',
    description: 'Permisos, roles y operacion coordinada cuando crece la estructura.',
    accent: 'text-violet-300',
  },
];

export default function InicioPage() {
  const searchParams = useSearchParams();
  const { plans } = usePlans();

  const defaultPlan = useMemo(() => {
    const freePlan = plans.find((plan) => plan.priceMonthly === 0);
    if (freePlan) {
      return freePlan;
    }

    return [...plans].sort((a, b) => a.priceMonthly - b.priceMonthly)[0] || null;
  }, [plans]);

  const maxTrialDays = useMemo(
    () => plans.reduce((max, plan) => Math.max(max, plan.trialDays || 0), 0),
    [plans]
  );

  useEffect(() => {
    const requestedSlug = searchParams.get('plan');
    const shouldOpenRegistration = Boolean(requestedSlug) || window.location.hash === '#registro';

    if (!shouldOpenRegistration) {
      return;
    }

    window.location.replace(buildPublicRegistrationPath(requestedSlug || defaultPlan?.slug));
  }, [defaultPlan?.slug, searchParams]);

  const openRegistration = () => {
    window.location.href = buildPublicRegistrationPath(defaultPlan?.slug);
  };

  return (
    <div className="landing-shell min-h-screen text-white">
      <LandingHeader />

      <main>
        <HeroSection />

        <HowItWorksSection />

        <section className="border-b border-white/10 py-20 lg:py-24">
          <div className="landing-container">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Beneficios operativos
                </div>
                <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Diseno pensado para trabajar, no para esconder informacion importante
                </h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                  MiPOS concentra las piezas criticas del negocio en una interfaz sobria, rapida y preparada para mas de una sucursal o equipo.
                </p>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {benefits.map((item) => (
                    <div key={item.title} className="landing-panel rounded-lg p-6">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 ${item.accent}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-lg font-medium text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="landing-panel rounded-lg p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    Que resuelve
                  </p>
                  <ul className="mt-4 space-y-3">
                    {[
                      'Centraliza ventas, inventario y configuracion por empresa.',
                      'Reduce dependencia de procesos manuales y hojas separadas.',
                      'Permite crecer por equipo, sucursal y volumen sin rehacer la base.',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="landing-panel rounded-lg p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    Registro recomendado
                  </p>
                  <p className="mt-3 text-lg font-medium text-white">
                    Define el plan, crea la cuenta administradora y entra a la configuracion inicial del negocio.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/inicio/planes">
                      <Button className="gradient-primary rounded-lg text-white">
                        Revisar planes
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={openRegistration}
                      disabled={!defaultPlan}
                      className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      Abrir registro
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="landing-container">
            <div className="landing-panel rounded-lg p-8 md:p-10 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-amber-200">
                    Planes y alta
                  </div>
                  <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Empieza con el plan adecuado y deja listo el acceso inicial del negocio
                  </h2>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                    El alta publica ya no vive escondida dentro de la landing. Ahora tiene un flujo separado, con plan preseleccionado y contexto suficiente para registrar la cuenta principal correctamente.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/inicio/planes">
                      <Button className="gradient-primary rounded-lg px-6 py-6 text-sm font-medium text-white">
                        Ver catalogo de planes
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={openRegistration}
                      disabled={!defaultPlan}
                      className="rounded-lg border-white/10 bg-transparent px-6 py-6 text-sm font-medium text-white hover:bg-white/5"
                    >
                      Ir al registro
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Prueba comercial
                    </p>
                    <p className="mt-3 text-lg font-medium text-white">
                      {maxTrialDays > 0
                        ? `Hasta ${maxTrialDays} dias de prueba segun el plan activo.`
                        : 'Activacion simple segun condiciones comerciales disponibles.'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Acceso inmediato
                    </p>
                    <p className="mt-3 text-lg font-medium text-white">
                      La cuenta creada entra al panel y continua con configuracion inicial y ajuste de negocio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
