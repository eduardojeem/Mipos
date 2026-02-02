'use client';

import {
    ShoppingCart,
    Package,
    Users,
    LineChart,
    CheckCircle2,
    Zap
} from 'lucide-react';

export function HowItWorksSection() {
    const steps = [
        {
            number: '1',
            title: 'Regístrate',
            description: 'Crea tu cuenta en menos de 2 minutos.',
            icon: CheckCircle2,
        },
        {
            number: '2',
            title: 'Configura',
            description: 'Personaliza con tu logo y productos.',
            icon: Package,
        },
        {
            number: '3',
            title: 'Vende',
            description: 'Comienza a procesar ventas al instante.',
            icon: Zap,
        }
    ];

    const features = [
        {
            icon: ShoppingCart,
            title: 'Punto de Venta',
            description: 'Interfaz rápida e intuitiva',
        },
        {
            icon: Package,
            title: 'Inventario',
            description: 'Control en tiempo real',
        },
        {
            icon: Users,
            title: 'Clientes',
            description: 'Gestión completa de datos',
        },
        {
            icon: LineChart,
            title: 'Reportes',
            description: 'Análisis detallados',
        }
    ];

    return (
        <section id="como-funciona" className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 radial-gradient-purple opacity-20" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                        ¿Cómo funciona?
                    </h2>
                    <p className="text-lg text-gray-400">
                        Tres simples pasos para comenzar
                    </p>
                </div>

                {/* Steps - Bento style */}
                <div className="grid md:grid-cols-3 gap-6 mb-20 max-w-5xl mx-auto">
                    {steps.map((step, index) => (
                        <div
                            key={index}
                            className="glass-card p-8 rounded-2xl hover-glow"
                        >
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full gradient-primary text-white font-bold text-xl mb-4">
                                {step.number}
                            </div>

                            <div className="inline-flex p-3 rounded-lg glass-card mb-4">
                                <step.icon className="h-6 w-6 text-purple-400" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">
                                {step.title}
                            </h3>
                            <p className="text-gray-400">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Features Grid */}
                <div className="max-w-6xl mx-auto">
                    <h3 className="text-2xl md:text-3xl font-bold text-center text-white mb-12">
                        Todo en un solo lugar
                    </h3>

                    <div className="bento-grid">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="glass-card p-6 rounded-xl hover-glow"
                            >
                                <div className="inline-flex p-3 rounded-lg gradient-primary mb-4">
                                    <feature.icon className="h-6 w-6 text-white" />
                                </div>

                                <h4 className="font-bold text-white mb-2">
                                    {feature.title}
                                </h4>
                                <p className="text-sm text-gray-400">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
