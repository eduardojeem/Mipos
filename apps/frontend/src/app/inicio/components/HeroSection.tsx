'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-[#0a0a0a] py-32 lg:py-40">
            {/* Radial gradients background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 radial-gradient-purple opacity-40" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 radial-gradient-blue opacity-40" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-300">
                            Sistema empresarial de nueva generación
                        </span>
                    </div>

                    {/* Main heading with gradient text */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                        <span className="gradient-text">
                            Gestiona tu negocio
                        </span>
                        <br />
                        <span className="text-white">
                            con inteligencia
                        </span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                        Plataforma completa para controlar inventario, ventas y finanzas.
                        <span className="text-white font-semibold"> Todo en un solo lugar.</span>
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/inicio/planes">
                            <Button
                                size="lg"
                                className="gradient-primary text-white px-8 py-6 text-base rounded-xl hover:scale-105 transition-transform shadow-dark-lg glow-purple"
                            >
                                Comenzar Ahora
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="lg"
                            className="glass-card border-white/10 hover:border-purple-500/50 text-white px-8 py-6 text-base rounded-xl"
                            onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            <Play className="mr-2 h-5 w-5" />
                            Ver Cómo Funciona
                        </Button>
                    </div>

                    {/* Stats - Bento style */}
                    <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-12">
                        <div className="glass-card p-6 rounded-2xl hover-glow">
                            <div className="text-3xl font-bold gradient-text mb-1">500+</div>
                            <div className="text-sm text-gray-400">Negocios</div>
                        </div>
                        <div className="glass-card p-6 rounded-2xl hover-glow">
                            <div className="text-3xl font-bold gradient-text mb-1">99.9%</div>
                            <div className="text-sm text-gray-400">Uptime</div>
                        </div>
                        <div className="glass-card p-6 rounded-2xl hover-glow">
                            <div className="text-3xl font-bold gradient-text mb-1">24/7</div>
                            <div className="text-sm text-gray-400">Soporte</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
