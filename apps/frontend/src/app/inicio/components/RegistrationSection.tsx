'use client';

import { RegistrationForm } from './RegistrationForm';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface SelectedPlan {
    id: string;
    name: string;
    slug: string;
    priceMonthly: number;
    priceYearly: number;
}

interface RegistrationSectionProps {
    selectedPlan: SelectedPlan;
    onSuccess: () => void;
}

export function RegistrationSection({ selectedPlan, onSuccess }: RegistrationSectionProps) {
    return (
        <section id="registro" className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 radial-gradient-purple opacity-30" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-gray-300">
                                Estás a un paso de empezar
                            </span>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Crea tu cuenta
                        </h2>
                        <p className="text-lg text-gray-400">
                            Sin tarjeta de crédito requerida
                        </p>
                    </div>

                    {/* Selected Plan Indicator */}
                    <div className="gradient-primary rounded-2xl p-6 mb-8 text-white glow-purple">
                        <div className="flex items-center justify-between">
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
                                    {selectedPlan.priceMonthly === 0
                                        ? 'Gratis'
                                        : `$${selectedPlan.priceMonthly}/mes`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Registration Form */}
                    <div className="glass-card rounded-2xl p-8 md:p-12">
                        <RegistrationForm
                            selectedPlan={selectedPlan}
                            onSuccess={onSuccess}
                        />
                    </div>

                    {/* Trust indicators */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            🔒 Tus datos están protegidos con encriptación de nivel bancario
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
