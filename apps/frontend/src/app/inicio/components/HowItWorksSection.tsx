'use client';

import { Building2, CheckCircle2, FileText, Package, ShieldCheck, Store, Users, Zap } from 'lucide-react';

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

const fits = [
  { label: 'Tiendas de ropa y calzado' },
  { label: 'Minimarkets y almacenes' },
  { label: 'Ferreterias y librerias' },
  { label: 'Tiendas con multiples sucursales' },
  { label: 'Negocios con equipo de ventas' },
  { label: 'Comercios con catalogo amplio' },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-b border-white/10 py-20 lg:py-28">
      <div className="landing-container">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
            Flujo operativo
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
            Como se activa MiPOS en un negocio real
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Primero defines capacidad, despues abres la cuenta y luego preparas la operacion.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
          {/* Connector line (desktop) */}
          <div className="absolute left-0 right-0 top-[2.75rem] hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block" />

          {steps.map((step) => (
            <div key={step.title} className="landing-panel relative rounded-lg p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <step.icon className="h-5 w-5" />
              </div>
              <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Paso {step.number}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Capabilities + fit grid */}
        <div className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          {/* Capabilities */}
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

          {/* For whom */}
          <div className="landing-panel rounded-lg p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Para quien encaja
            </p>
            <p className="mt-3 text-base font-medium text-slate-300">
              Cualquier comercio con caja, stock y equipo que necesita orden sin depender de hojas sueltas.
            </p>
            <ul className="mt-5 space-y-2.5">
              {fits.map((fit) => (
                <li key={fit.label} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  {fit.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
