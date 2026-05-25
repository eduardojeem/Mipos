'use client';

import Link from 'next/link';
import { ArrowRight, Play, ShieldCheck, Sparkles, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LANDING_CONTENT_DEFAULTS, type LandingContent } from '@/lib/web-content/types';

const SIGNAL_ICONS = [Store, Users, ShieldCheck];

interface HeroSectionProps {
  content?: LandingContent['hero'];
}

export function HeroSection({ content }: HeroSectionProps) {
  const c = content ?? LANDING_CONTENT_DEFAULTS.hero;

  return (
    <section className="relative overflow-hidden border-b border-white/10 py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="radial-gradient-purple absolute left-[-8rem] top-[-6rem] h-80 w-80" />
        <div className="radial-gradient-blue absolute bottom-[-6rem] right-[-4rem] h-80 w-80" />
      </div>

      <div className="landing-container relative">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,420px)] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              {c.badge}
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              {c.headline}
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              {c.subtext}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/inicio/planes">
                <Button className="gradient-primary rounded-lg px-6 text-sm font-medium text-white shadow-[0_22px_50px_-22px_rgba(16,185,129,0.95)] hover:opacity-95">
                  {c.ctaPrimary}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/inicio#como-funciona">
                <Button
                  variant="outline"
                  className="rounded-lg border-white/10 bg-white/5 px-6 text-sm font-medium text-white hover:bg-white/10"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {c.ctaSecondary}
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {c.signals.map((item, index) => {
              const Icon = SIGNAL_ICONS[index % SIGNAL_ICONS.length];
              return (
                <div key={index} className="landing-panel rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
