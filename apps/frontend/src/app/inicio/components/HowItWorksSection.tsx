'use client';

import { ArrowRight, Building2, CheckCircle2, FileText, Package, ShieldCheck, Store, Users, Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Elige el plan',
    description: 'Compara capacidad, funciones y alcance operativo antes de abrir la cuenta principal.',
    icon: CheckCircle2,
  },
  {
    number: '02',
    title: 'Crea tu organizacion',
    description: 'Registra el negocio, define el administrador inicial y entra al panel con la base lista.',
    icon: Building2,
  },
  {
    number: '03',
    title: 'Activa la operacion',
    description: 'Carga catalogo, equipo, sucursales y empieza a vender con control centralizado.',
    icon: Zap,
  },
];

const capabilities = [
  {
    icon: Store,
    title: 'Punto de venta',
    description: 'Cobro, caja y tickets con flujo diario rapido para mostrador o sucursal.',
  },
  {
    icon: Package,
    title: 'Inventario',
    description: 'Stock, alertas, reposicion y seguimiento por producto y ubicacion.',
  },
  {
    icon: Users,
    title: 'Usuarios y roles',
    description: 'Permisos por equipo, acceso administrativo y control multiempresa.',
  },
  {
    icon: FileText,
    title: 'Reportes y facturacion',
    description: 'Lectura comercial y operativa para ventas, compras y rendimiento.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad y continuidad',
    description: 'Sesiones, configuracion central y estructura preparada para escalar.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-b border-white/10 py-20 lg:py-28">
      <div className="landing-container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
            Flujo operativo
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
            Como se activa MiPOS en un negocio real
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            El recorrido publico ahora coincide con el producto: primero defines capacidad, despues abres la cuenta y luego preparas la operacion.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="landing-panel rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <step.icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 ? (
                  <ArrowRight className="hidden h-5 w-5 text-slate-600 lg:block" />
                ) : null}
              </div>
              <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Paso {step.number}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="landing-panel rounded-lg p-6 md:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Capacidades clave
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
              Todo el frente operativo en una sola capa
            </h3>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {capabilities.map((item) => (
                <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="landing-panel rounded-lg p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Para quien encaja
              </p>
              <p className="mt-3 text-lg font-medium text-white">
                Negocios con caja, inventario, equipo y necesidad de ordenar operacion sin depender de hojas sueltas.
              </p>
            </div>
            <div className="landing-panel rounded-lg p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Resultado esperado
              </p>
              <p className="mt-3 text-lg font-medium text-white">
                Menos friccion para arrancar y una estructura que permite crecer por sucursal, catalogo y equipo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
