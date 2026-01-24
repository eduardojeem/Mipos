'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, AlertCircle, Home, Copy, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
    error: string | Error;
    onRetry?: () => void;
    additionalInfo?: string;
    showHomeButton?: boolean;
}

export function ErrorState({ error, onRetry, additionalInfo, showHomeButton = false }: ErrorStateProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const errorMessage = typeof error === 'string' ? error : (error as Error).message;

    // Determinar el tipo de error y el ícono apropiado
    const getErrorType = () => {
        const msg = errorMessage.toLowerCase();

        if (msg.includes('network') || msg.includes('fetch') || msg.includes('conexión') || msg.includes('connection')) {
            return {
                icon: WifiOff,
                title: 'Sin Conexión',
                description: 'Parece que no hay conexión a internet. Verifica tu red e intenta nuevamente.',
                color: 'from-amber-500 to-orange-500',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30',
                borderColor: 'border-amber-200 dark:border-amber-800',
                iconColor: 'text-amber-600 dark:text-amber-400',
            };
        }

        if (msg.includes('timeout') || msg.includes('tiempo')) {
            return {
                icon: AlertCircle,
                title: 'Tiempo de Espera Agotado',
                description: 'La solicitud tardó demasiado tiempo en responder. El servidor podría estar lento.',
                color: 'from-yellow-500 to-amber-500',
                bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
                borderColor: 'border-yellow-200 dark:border-yellow-800',
                iconColor: 'text-yellow-600 dark:text-yellow-400',
            };
        }

        if (msg.includes('500') || msg.includes('server') || msg.includes('servidor')) {
            return {
                icon: ServerCrash,
                title: 'Problema en el Servidor',
                description: 'Ocurrió un error inesperado en nuestros servidores. Ya hemos sido notificados.',
                color: 'from-red-500 to-rose-500',
                bgColor: 'bg-red-50 dark:bg-red-950/30',
                borderColor: 'border-red-200 dark:border-red-800',
                iconColor: 'text-red-600 dark:text-red-400',
            };
        }

        // Error genérico
        return {
            icon: AlertTriangle,
            title: 'No se pudieron cargar las promociones',
            description: 'Ha ocurrido un error al intentar obtener los datos. Por favor intenta recargar.',
            color: 'from-violet-500 to-purple-500',
            bgColor: 'bg-violet-50 dark:bg-violet-950/30',
            borderColor: 'border-violet-200 dark:border-violet-800',
            iconColor: 'text-violet-600 dark:text-violet-400',
        };
    };

    const errorType = getErrorType();
    const Icon = errorType.icon;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(errorMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className={cn("border shadow-xl overflow-hidden", errorType.borderColor)}>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center px-6 relative overflow-hidden">
                {/* Background Decor */}
                <div className={cn("absolute inset-0 opacity-40 pointer-events-none", errorType.bgColor)} />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
                    {/* Icon */}
                    <div className="mb-6 relative group">
                        <div className={cn("absolute inset-0 blur-2xl opacity-20 rounded-full animate-pulse transition-opacity duration-1000", `bg-gradient-to-r ${errorType.color}`)} />
                        <div className="relative p-5 bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-800 transform transition-transform group-hover:scale-105 duration-300">
                            <Icon className={cn("h-12 w-12", errorType.iconColor)} />
                        </div>
                    </div>

                    {/* Titles */}
                    <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white tracking-tight">
                        {errorType.title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg leading-relaxed">
                        {errorType.description}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full mb-8">
                        {onRetry && (
                            <Button
                                onClick={onRetry}
                                size="lg"
                                className={cn("gap-2 shadow-md transition-all hover:shadow-lg flex-1 font-medium", `bg-gradient-to-r ${errorType.color} hover:opacity-90 text-white border-0`)}
                            >
                                <RefreshCw className="h-5 w-5" />
                                Intentar Nuevamente
                            </Button>
                        )}

                        {showHomeButton && (
                            <Button
                                onClick={() => router.push('/dashboard')}
                                variant="outline"
                                size="lg"
                                className="gap-2 flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <Home className="h-5 w-5" />
                                Volver al Inicio
                            </Button>
                        )}
                    </div>

                    {/* Technical Details Collapsible */}
                    <Collapsible
                        open={isOpen}
                        onOpenChange={setIsOpen}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden"
                    >
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full flex items-center justify-between p-4 h-auto hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Detalles Técnicos
                                </span>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="text-xs">{isOpen ? 'Ocultar' : 'Mostrar'}</span>
                                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                            </Button>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                            <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/50">
                                <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400 break-all relative group">
                                    {errorMessage}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard();
                                        }}
                                        title="Copiar error"
                                    >
                                        {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                </div>
                                {additionalInfo && (
                                    <p className="mt-2 text-xs text-slate-500 italic">
                                        Nota: {additionalInfo}
                                    </p>
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            </CardContent>
        </Card>
    );
}
