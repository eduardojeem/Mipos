'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, ArrowRight, Play } from 'lucide-react';

export default function OnboardingPage() {
    const router = useRouter();

    useEffect(() => {
        // Verificar si el usuario acaba de registrarse
        // En producción, esto vendría de la sesión o contexto
    }, []);

    const handleStartDashboard = () => {
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Success animation */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full mb-6 shadow-2xl animate-bounce">
                        <CheckCircle2 className="h-12 w-12 text-white" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        ¡Bienvenido a MiPOS! 🎉
                    </h1>
                    <p className="text-xl text-gray-600">
                        Tu cuenta ha sido creada exitosamente
                    </p>
                </div>

                {/* Onboarding steps */}
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
                    <div className="flex items-center gap-2 mb-8">
                        <Sparkles className="h-5 w-5 text-pink-600" />
                        <h2 className="text-2xl font-bold text-gray-900">
                            Primeros pasos
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-pink-50 border border-pink-200">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                1
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    Configura tu perfil
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Añade la información de tu negocio, logo y preferencias
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-purple-50 border border-purple-200">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                2
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    Agrega tus productos
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Crea tu catálogo de productos con precios y stock
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-pink-50 border border-pink-200">
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                3
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    Realiza tu primera venta
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Usa el punto de venta para empezar a registrar transacciones
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        onClick={handleStartDashboard}
                        size="lg"
                        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
                    >
                        Ir al Dashboard
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="border-2 border-gray-300 hover:border-pink-500 px-8 py-6 text-lg rounded-xl"
                        onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
                    >
                        <Play className="mr-2 h-5 w-5" />
                        Ver tutorial
                    </Button>
                </div>

                {/* Help text */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    ¿Necesitas ayuda? Contacta a nuestro equipo de soporte en{' '}
                    <a href="mailto:soporte@mipos.com" className="text-pink-600 hover:underline">
                        soporte@mipos.com
                    </a>
                </p>
            </div>
        </div>
    );
}
