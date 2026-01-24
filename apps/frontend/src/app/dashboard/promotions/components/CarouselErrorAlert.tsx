'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, Clock, ShieldAlert } from 'lucide-react';
import { CarouselError, CarouselErrorType } from '@/hooks/useCarousel';

interface CarouselErrorAlertProps {
    error: CarouselError;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export function CarouselErrorAlert({ error, onRetry, onDismiss }: CarouselErrorAlertProps) {
    const getErrorConfig = () => {
        switch (error.type) {
            case CarouselErrorType.NETWORK_ERROR:
                return {
                    icon: WifiOff,
                    title: 'Error de Conexión',
                    variant: 'destructive' as const,
                    iconColor: 'text-amber-500',
                };
            case CarouselErrorType.SERVER_ERROR:
                return {
                    icon: ServerCrash,
                    title: 'Error del Servidor',
                    variant: 'destructive' as const,
                    iconColor: 'text-red-500',
                };
            case CarouselErrorType.TIMEOUT_ERROR:
                return {
                    icon: Clock,
                    title: 'Tiempo de Espera Agotado',
                    variant: 'destructive' as const,
                    iconColor: 'text-yellow-500',
                };
            case CarouselErrorType.PERMISSION_ERROR:
                return {
                    icon: ShieldAlert,
                    title: 'Permisos Insuficientes',
                    variant: 'destructive' as const,
                    iconColor: 'text-purple-500',
                };
            case CarouselErrorType.VALIDATION_ERROR:
            case CarouselErrorType.CONFLICT_ERROR:
            default:
                return {
                    icon: AlertTriangle,
                    title: 'Error',
                    variant: 'destructive' as const,
                    iconColor: 'text-orange-500',
                };
        }
    };

    const config = getErrorConfig();
    const Icon = config.icon;

    return (
        <Alert variant={config.variant} className="mb-4 border-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 ${config.iconColor} animate-pulse`} />
                <div className="flex-1">
                    <AlertTitle className="font-semibold mb-1">
                        {config.title}
                    </AlertTitle>
                    <AlertDescription className="text-sm mb-3">
                        {error.message}
                    </AlertDescription>

                    {error.details && (
                        <div className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-2 mb-3 font-mono overflow-x-auto">
                            {typeof error.details === 'string'
                                ? error.details
                                : JSON.stringify(error.details, null, 2)}
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(error.timestamp).toLocaleString('es-ES')}</span>
                    </div>

                    <div className="flex gap-2">
                        {error.retryable && onRetry && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onRetry}
                                className="gap-1.5"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reintentar
                            </Button>
                        )}
                        {onDismiss && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onDismiss}
                            >
                                Cerrar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Alert>
    );
}
