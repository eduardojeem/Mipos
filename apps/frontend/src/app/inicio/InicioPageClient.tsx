'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { LANDING_CONTENT_DEFAULTS, type LandingContent } from '@/lib/web-content/types';
import './landing.css';
import { CreateAccountSection, Footer, HeroSection, HowItWorksSection, LandingHeader } from './components';

const BENEFIT_ICONS = [Zap, Shield, BarChart3, Users];
const BENEFIT_ACCENTS = ['text-amber-300', 'text-emerald-300', 'text-sky-300', 'text-violet-300'];

interface InicioPageClientProps {
  landingContent: LandingContent;
}

export default function InicioPageClient({ landingContent }: InicioPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { plans } = usePlans();
  const benefits = landingContent.benefits ?? LANDING_CONTENT_DEFAULTS.benefits;

  const defaultPlan = useMemo(() => {
    const freePlan = plans.find((plan) => plan.priceMonthly === 0);
    if (freePlan) return freePlan;
    return [...plans].sort((a, b) => a.priceMonthly - b.priceMonthly)[0] || null;
  }, [plans]);

  const maxTrialDays = plans.reduce((max, plan) => Math.max(max, plan.trialDays || 0), 0);

  useEffect(() => {
    const requestedSlug = searchParams.get('plan');
    const shouldOpenRegistration = Boolean(requestedSlug) || window.location.hash === '#registro';
    if (!shouldOpenRegistration) return;
    router.replace(buildPublicRegistrationPath(requestedSlug || defaultPlan?.slug));
  }, [defaultPlan?.slug, router, searchParams]);

  const openRegistration = () => {
    router.push(buildPublicRegistrationPath(defaultPlan?.slug));
  };

  return (
    <div className="landing-shell min-h-screen text-white">
      <LandingHeader />

      <main>
        <HeroSection content={landingContent.hero} />

        <HowItWorksSection content={landingContent.howItWorks} />

        <CreateAccountSection />

        <section className="py-20 lg:py-24">
          <div className="landing-container">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Beneficios operativos
                </div>
                <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {benefits.headline}
                </h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                  {benefits.subtext}
                </p>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {benefits.items.map((item, index) => {
                    const Icon = BENEFIT_ICONS[index % BENEFIT_ICONS.length];
                    const accent = BENEFIT_ACCENTS[index % BENEFIT_ACCENTS.length];
                    return (
                      <div key={index} className="landing-panel rounded-lg p-6">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 ${accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-lg font-medium text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="landing-panel rounded-lg p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    Que resuelve
                  </p>
                  <ul className="mt-4 space-y-3">
                    {benefits.resolves.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="landing-panel rounded-lg p-6">
                  {maxTrialDays > 0 && (
                    <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Hasta {maxTrialDays} días de prueba según el plan
                    </p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/inicio/planes">
                      <Button className="gradient-primary w-full rounded-lg text-white sm:w-auto">
                        Ver planes
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
      </main>

      <Footer />
    </div>
  );
}
