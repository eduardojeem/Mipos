'use client';

import Link from 'next/link';
import { ArrowRight, Play, ShieldCheck, Sparkles, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const heroStats = [
  { label: 'Negocios activos', value: '500+' },
  { label: 'Disponibilidad operativa', value: '99.9%' },
  { label: 'Soporte comercial', value: '24/7' },
];

const heroSignals = [
  {
    icon: Store,
    title: 'Venta y caja',
    description: 'Operacion diaria con inventario y control comercial en un mismo flujo.',
  },
  {
    icon: Users,
    title: 'Equipo y permisos',
    description: 'Acceso por roles, sucursales y administracion centralizada.',
  },
  {
    icon: ShieldCheck,
    title: 'Datos y continuidad',
    description: 'Base multiempresa, configuracion central y resguardo operativo.',
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 py-20 lg:py-28">
      <div className="absolute inset-0 pointer-events-none">
        <div className="radial-gradient-purple absolute left-[-8rem] top-[-6rem] h-80 w-80" />
        <div className="radial-gradient-blue absolute bottom-[-6rem] right-[-4rem] h-80 w-80" />
      </div>

      <div className="landing-container relative">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,420px)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma SaaS para retail y operacion comercial
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              Gestiona ventas, inventario y equipos desde una sola base operativa
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              MiPOS unifica punto de venta, control de stock, sucursales y reportes en una
              experiencia lista para negocios que necesitan orden, velocidad y capacidad de crecer.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/inicio/planes">
                <Button className="gradient-primary rounded-lg px-6 py-6 text-sm font-medium text-white shadow-[0_22px_50px_-22px_rgba(16,185,129,0.95)] hover:opacity-95">
                  Ver planes y capacidad
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/inicio#como-funciona">
                <Button
                  variant="outline"
                  className="rounded-lg border-white/10 bg-white/5 px-6 py-6 text-sm font-medium text-white hover:bg-white/10"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Ver como funciona
                </Button>
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div key={item.label} className="landing-panel rounded-lg p-5">
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {heroSignals.map((item) => (
              <div key={item.title} className="landing-panel rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="landing-panel rounded-lg p-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Flujo recomendado
              </p>
              <p className="mt-3 text-lg font-medium text-white">
                Revisa planes, crea la cuenta principal y entra al sistema con la configuracion base lista.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
