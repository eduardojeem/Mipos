'use client';

import { RegistrationForm } from './RegistrationForm';
import { CheckCircle2, Sparkles } from 'lucide-react';
import type { Plan } from '@/hooks/use-subscription';

interface RegistrationSectionProps {
    selectedPlan: Plan;
    onSuccess: () => void;
}

function formatMonthlyPrice(plan: Plan) {
    if (plan.priceMonthly === 0) {
        return 'Gratis';
    }

    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: plan.currency || 'USD',
        minimumFractionDigits: plan.priceMonthly % 1 === 0 ? 0 : 2,
        maximumFractionDigits: plan.priceMonthly % 1 === 0 ? 0 : 2,
    }).format(plan.priceMonthly);
}

export function RegistrationSection({ selectedPlan, onSuccess }: RegistrationSectionProps) {
    return (
        <section id="registro" className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 radial-gradient-purple opacity-30" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-gray-300">
                                Estas a un paso de empezar
                            </span>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Crea tu cuenta
                        </h2>
                        <p className="text-lg text-gray-400">
                            Completa tu registro con el plan seleccionado
                        </p>
                    </div>

                    <div className="gradient-primary rounded-2xl p-6 mb-8 text-white glow-purple">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm opacity-90">Plan seleccionado</p>
                                    <p className="text-2xl font-bold">{selectedPlan.name}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-90">Precio mensual</p>
                                <p className="text-2xl font-bold">
                                    {formatMonthlyPrice(selectedPlan)}
                                    {selectedPlan.priceMonthly > 0 ? '/mes' : ''}
                                </p>
                                {selectedPlan.trialDays && selectedPlan.trialDays > 0 && (
                                    <p className="text-xs opacity-90 mt-1">
                                        {selectedPlan.trialDays} dias de prueba incluidos
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-8 md:p-12">
                        <RegistrationForm
                            selectedPlan={selectedPlan}
                            onSuccess={onSuccess}
                        />
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            Tus datos estan protegidos con cifrado y buenas practicas de seguridad.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
