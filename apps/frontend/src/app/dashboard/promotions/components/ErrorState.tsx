'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, AlertCircle, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorStateProps {
    error: string | Error;
    onRetry?: () => void;
    additionalInfo?: string;
    showHomeButton?: boolean;
}

export function ErrorState({ error, onRetry, additionalInfo, showHomeButton = false }: ErrorStateProps) {
    const router = useRouter();
    const errorMessage = typeof error === 'string' ? error : error.message;

    // Determinar el tipo de error y el ícono apropiado
    const getErrorType = () => {
        const msg = errorMessage.toLowerCase();

        if (msg.includes('network') || msg.includes('fetch') || msg.includes('conexión')) {
            return {
                icon: WifiOff,
                title: 'Error de Conexión',
                description: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
                color: 'from-amber-500 to-orange-500',
                bgColor: 'from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950',
                iconColor: 'text-amber-600 dark:text-amber-400',
            };
        }

        if (msg.includes('timeout') || msg.includes('tiempo')) {
            return {
                icon: AlertCircle,
                title: 'Tiempo de Espera Agotado',
                description: 'La solicitud tardó demasiado tiempo. Intenta nuevamente.',
                color: 'from-yellow-500 to-amber-500',
                bgColor: 'from-yellow-100 to-amber-100 dark:from-yellow-950 dark:to-amber-950',
                iconColor: 'text-yellow-600 dark:text-yellow-400',
            };
        }

        if (msg.includes('500') || msg.includes('server') || msg.includes('servidor')) {
            return {
                icon: ServerCrash,
                title: 'Error del Servidor',
                description: 'Ocurrió un problema en el servidor. Estamos trabajando en solucionarlo.',
                color: 'from-red-500 to-rose-500',
                bgColor: 'from-red-100 to-rose-100 dark:from-red-950 dark:to-rose-950',
                iconColor: 'text-red-600 dark:text-red-400',
            };
        }

        // Error genérico
        return {
            icon: AlertTriangle,
            title: 'Error al Cargar Promociones',
            description: 'No se pudieron cargar las promociones. Por favor, intenta nuevamente.',
            color: 'from-violet-500 to-purple-500',
            bgColor: 'from-violet-100 to-purple-100 dark:from-violet-950 dark:to-purple-950',
            iconColor: 'text-violet-600 dark:text-violet-400',
        };
    };

    const errorType = getErrorType();
    const Icon = errorType.icon;

    return (
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
                {/* Animated Icon with Gradient Background */}
                <div className="mb-6 relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${errorType.color} blur-3xl opacity-20 rounded-full animate-pulse`} />
                    <div className={`relative p-6 bg-gradient-to-br ${errorType.bgColor} rounded-full shadow-lg`}>
                        <Icon className={`h-16 w-16 ${errorType.iconColor} animate-bounce`} />
                    </div>
                </div>

                {/* Error Title */}
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
                    {errorType.title}
                </h3>

                {/* Error Description */}
                <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md text-base">
                    {errorType.description}
                </p>

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg max-w-xl border border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                            {errorMessage}
                        </p>
                    </div>
                )}

                {/* Additional Info */}
                {additionalInfo && (
                    <p className="text-sm text-slate-500 dark:text-slate-500 mb-6 max-w-md">
                        {additionalInfo}
                    </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    {onRetry && (
                        <Button
                            onClick={onRetry}
                            size="lg"
                            className={`gap-2 bg-gradient-to-r ${errorType.color} hover:opacity-90 transition-all flex-1 shadow-lg`}
                        >
                            <RefreshCw className="h-5 w-5" />
                            Intentar Nuevamente
                        </Button>
                    )}

                    {showHomeButton && (
                        <Button
                            onClick={() => router.push('/home')}
                            variant="outline"
                            size="lg"
                            className="gap-2 flex-1"
                        >
                            <Home className="h-5 w-5" />
                            Ir al Inicio
                        </Button>
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 max-w-md">
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                        Si el problema persiste, contacta al soporte técnico o verifica la configuración del servidor.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
