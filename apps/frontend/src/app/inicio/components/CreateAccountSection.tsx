'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Store, UserRound, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

const creationOptions = [
  {
    title: 'Cuenta para negocio',
    eyebrow: 'Dueño o administrador',
    description:
      'Crea la empresa, elige el tipo de negocio y completa el onboarding para activar el panel operativo.',
    href: '/inicio/registro',
    cta: 'Crear cuenta de negocio',
    icon: Building2,
    accentClass: 'bg-emerald-400/10 text-emerald-300',
  },
  {
    title: 'Cuenta para cliente',
    eyebrow: 'Comprador del marketplace',
    description:
      'Crea una cuenta para guardar tus datos, consultar pedidos y comprar mas rapido en tiendas publicas.',
    href: '/auth/signup?type=customer&returnUrl=/account',
    cta: 'Crear cuenta de cliente',
    icon: UserRound,
    accentClass: 'bg-amber-400/10 text-amber-300',
  },
];

export function CreateAccountSection() {
  return (
    <section id="crear-cuenta" className="border-y border-white/10 py-20 lg:py-24">
      <div className="landing-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
              <Store className="h-3.5 w-3.5 text-emerald-300" />
              Crear cuenta
            </div>
            <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Separa el alta de cuentas del ingreso al sistema
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              El registro crea cuentas nuevas. El login queda para usuarios que ya tienen acceso.
              Asi cada persona entra por el camino correcto desde el primer paso.
            </p>
            <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                  <UsersRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Cuentas de empleados</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Los empleados se agregan desde el panel del negocio para mantener roles,
                    permisos y sucursales bajo control del administrador.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {creationOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.href} className="landing-panel rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${option.accentClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {option.eyebrow}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{option.title}</h3>
                    </div>
                  </div>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-300">
                    {option.description}
                  </p>
                  <Button asChild className="gradient-primary mt-5 w-full rounded-lg text-white">
                    <Link href={option.href}>
                      {option.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
