'use client';

import { useEffect, useMemo, useState } from 'react';
import './landing.css';
import {
    LandingHeader,
    HeroSection,
    HowItWorksSection,
    RegistrationSection,
    Footer
} from './components';
import { 
    Building2, 
    TrendingUp, 
    Users, 
    Sparkles, 
    CheckCircle,
    ArrowRight,
    Shield,
    Zap,
    BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePlans } from '@/hooks/use-plans';
import type { Plan } from '@/hooks/use-subscription';

export default function InicioPage() {
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
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
        if (!plans.length) {
            return;
        }

        const requestedSlug = searchParams.get('plan');
        const shouldOpenRegistration = Boolean(requestedSlug) || window.location.hash === '#registro';

        if (!shouldOpenRegistration) {
            return;
        }

        const matchedPlan = requestedSlug
            ? plans.find((plan) => plan.slug === requestedSlug) || null
            : null;

        setSelectedPlan(matchedPlan || defaultPlan);
    }, [defaultPlan, plans, searchParams]);

    useEffect(() => {
        if (!selectedPlan || window.location.hash !== '#registro') {
            return;
        }

        const timeout = window.setTimeout(() => {
            document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth' });
        }, 50);

        return () => window.clearTimeout(timeout);
    }, [selectedPlan]);

    

    const handleRegistrationSuccess = () => {
        window.location.href = '/dashboard/settings?tab=system';
    };

    const openRegistration = () => {
        if (!defaultPlan) {
            return;
        }

        setSelectedPlan(defaultPlan);
        window.history.replaceState(null, '', `/inicio?plan=${encodeURIComponent(defaultPlan.slug)}#registro`);

        window.setTimeout(() => {
            document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    return (
        <div className="min-h-screen bg-background">
            <LandingHeader />

            <main>
                <HeroSection />

                <HowItWorksSection />

                {/* Benefits Section - NEW */}
                <section className="py-20 lg:py-32 bg-background relative overflow-hidden">
                    <div className="absolute inset-0">
                        {/* Subtle ambient light instead of colored blobs */}
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                                <span className="text-sm font-medium text-muted-foreground">
                                    Beneficios que marcan la diferencia
                                </span>
                            </div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                                ¿Por qué elegir <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">MiPOS</span>?
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Más que un sistema de punto de venta, una solución completa para tu negocio
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                            {[
                                {
                                    icon: Zap,
                                    title: 'Rápido y Eficiente',
                                    description: 'Procesa ventas en segundos con nuestra interfaz optimizada',
                                    color: 'text-yellow-400'
                                },
                                {
                                    icon: Shield,
                                    title: 'Seguro y Confiable',
                                    description: 'Tus datos protegidos con encriptación de nivel empresarial',
                                    color: 'text-green-400'
                                },
                                {
                                    icon: BarChart3,
                                    title: 'Reportes en Tiempo Real',
                                    description: 'Toma decisiones informadas con análisis detallados',
                                    color: 'text-blue-400'
                                },
                                {
                                    icon: Users,
                                    title: 'Multi-usuario',
                                    description: 'Gestiona permisos y roles para tu equipo',
                                    color: 'text-purple-400'
                                },
                                {
                                    icon: Building2,
                                    title: 'Multi-sucursal',
                                    description: 'Controla todas tus ubicaciones desde un solo lugar',
                                    color: 'text-pink-400'
                                },
                                {
                                    icon: CheckCircle,
                                    title: 'Soporte dedicado',
                                    description: 'Acompanamiento y ayuda segun el plan y los canales habilitados',
                                    color: 'text-cyan-400'
                                }
                            ].map((benefit, idx) => (
                                <div key={idx} className="bg-card/50 border border-border/50 backdrop-blur-sm p-6 rounded-xl hover:bg-card/80 transition-all duration-300 group">
                                    <div className={`inline-flex p-3 rounded-lg bg-primary/10 mb-4 group-hover:scale-110 transition-transform`}>
                                        <benefit.icon className={`h-6 w-6 ${benefit.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">{benefit.title}</h3>
                                    <p className="text-muted-foreground">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Social Proof Section - Simplified */}
                <section className="py-20 bg-background relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                                Negocios que <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">confían</span> en nosotros
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Únete a cientos de empresas que transformaron su gestión
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                            <div className="bg-card/50 border border-border/50 backdrop-blur-sm p-8 rounded-2xl hover:bg-card/80 transition-all duration-300 text-center group">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                                    <Building2 className="h-8 w-8 text-primary" />
                                </div>
                                <div className="text-4xl font-bold text-foreground mb-2">500+</div>
                                <div className="text-sm text-muted-foreground">Negocios Activos</div>
                                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-green-400">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>Creciendo cada día</span>
                                </div>
                            </div>

                            <div className="bg-card/50 border border-border/50 backdrop-blur-sm p-8 rounded-2xl hover:bg-card/80 transition-all duration-300 text-center group">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                                    <Users className="h-8 w-8 text-primary" />
                                </div>
                                <div className="text-4xl font-bold text-foreground mb-2">98%</div>
                                <div className="text-sm text-muted-foreground">Satisfacción</div>
                                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-purple-400">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Calificación promedio</span>
                                </div>
                            </div>

                            <div className="bg-card/50 border border-border/50 backdrop-blur-sm p-8 rounded-2xl hover:bg-card/80 transition-all duration-300 text-center group">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                                    <Sparkles className="h-8 w-8 text-primary" />
                                </div>
                                <div className="text-4xl font-bold text-foreground mb-2">5+</div>
                                <div className="text-sm text-muted-foreground">Años de Experiencia</div>
                                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-400">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Innovando siempre</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <Link href="/empresas">
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base rounded-xl shadow-lg hover:shadow-primary/25 transition-all duration-300">
                                    Ver Todos los Negocios
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Plans CTA Section - Simplified */}
                <section className="py-20 bg-background relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-card/50 border border-border/50 backdrop-blur-sm p-8 md:p-12 rounded-2xl text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6">
                                    <Sparkles className="h-4 w-4 text-purple-400" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Planes flexibles para cada negocio
                                    </span>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                                    Encuentra el plan <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">perfecto</span> para ti
                                </h2>
                                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                                    Desde pequeños emprendimientos hasta grandes empresas. 
                                    Revisa las condiciones y beneficios del plan que mejor se adapte a tu operacion.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <Link href="/inicio/planes">
                                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base rounded-xl shadow-lg hover:shadow-primary/25 transition-all duration-300">
                                            Ver Planes y Precios
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        className="border-white/10 hover:bg-white/5 text-foreground px-8 py-6 text-base rounded-xl"
                                        onClick={openRegistration}
                                        disabled={!defaultPlan}
                                    >
                                        Comenzar Gratis
                                    </Button>
                                </div>

                                <p className="text-sm text-muted-foreground mt-6">
                                    {maxTrialDays > 0
                                        ? `Hasta ${maxTrialDays} dias de prueba disponibles segun el plan activo.`
                                        : 'Planes disponibles con activacion simple y condiciones segun disponibilidad.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Registration Section */}
                {selectedPlan && (
                    <RegistrationSection
                        selectedPlan={selectedPlan}
                        onSuccess={handleRegistrationSuccess}
                    />
                )}
            </main>

            <Footer />
        </div>
    );
}
