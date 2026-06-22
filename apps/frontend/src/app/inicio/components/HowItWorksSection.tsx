'use client';

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Package,
  Scissors,
  ShoppingCart,
  Boxes,
  Store,
  Users,
  Building2,
  FileText,
} from 'lucide-react';
import { LANDING_CONTENT_DEFAULTS, type HowItWorksTrack, type LandingContent } from '@/lib/web-content/types';

interface HowItWorksSectionProps {
  content?: LandingContent['howItWorks'];
}

// Iconos y acentos por posición de track. El texto es editable (viene del
// contenido); lo visual vive acá. Track 0 = tienda, track 1 = servicios.
const TRACK_VISUALS = [
  {
    icon: Store,
    accent: 'bg-sky-400/10 text-sky-300',
    ring: 'border-sky-400/30 text-sky-300',
    stepIcons: [Package, ShoppingCart, Boxes, BarChart3],
  },
  {
    icon: Scissors,
    accent: 'bg-emerald-400/10 text-emerald-300',
    ring: 'border-emerald-400/30 text-emerald-300',
    stepIcons: [Scissors, CalendarDays, CheckCircle2, DollarSign],
  },
];

const SHARED = [
  { icon: Users, label: 'Clientes y equipo por roles' },
  { icon: Building2, label: 'Multiempresa y sucursales' },
  { icon: FileText, label: 'Reportes y caja unificados' },
];

function TrackCard({ track, index }: { track: HowItWorksTrack; index: number }) {
  const visual = TRACK_VISUALS[index % TRACK_VISUALS.length];
  const HeaderIcon = visual.icon;
  return (
    <div className="landing-panel rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${visual.accent}`}>
          <HeaderIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{track.badge}</p>
          <h3 className="text-xl font-semibold text-white md:text-2xl">{track.title}</h3>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">{track.tagline}</p>

      <ol className="mt-7 space-y-5">
        {track.steps.map((step, i) => {
          const StepIcon = visual.stepIcons[i % visual.stepIcons.length];
          return (
            <li key={i} className="flex gap-4">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${visual.ring} bg-white/5 text-sm font-semibold`}>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <StepIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function HowItWorksSection({ content }: HowItWorksSectionProps) {
  const c = content ?? LANDING_CONTENT_DEFAULTS.howItWorks;
  const tracks = c.tracks?.length ? c.tracks : LANDING_CONTENT_DEFAULTS.howItWorks.tracks;

  return (
    <section id="como-funciona" className="border-b border-white/10 py-20 lg:py-28">
      <div className="landing-container">
        {/* Header (editable desde el panel) */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
            Cómo funciona
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
            {c.headline}
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Una misma plataforma, dos formas de operar. Elegí la que va con tu negocio —o usá las dos.
          </p>
        </div>

        {/* Dos tracks: tienda vs servicios */}
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {tracks.map((track, i) => (
            <TrackCard key={track.badge || i} track={track} index={i} />
          ))}
        </div>

        {/* Base compartida */}
        <div className="landing-panel mt-6 rounded-2xl p-6 md:px-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-300">
              Ambos modos comparten la misma base operativa:
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2" role="list">
              {SHARED.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="flex items-center gap-2 text-sm text-slate-300">
                    <Icon className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
