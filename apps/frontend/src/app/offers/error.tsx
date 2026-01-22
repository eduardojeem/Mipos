'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home, Tag } from 'lucide-react';
import Link from 'next/link';

export default function OffersError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Offers Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-slate-950 dark:via-purple-950/50 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                    <Tag className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>

                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    Error al cargar ofertas
                </h1>

                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    No pudimos cargar las ofertas disponibles. Intenta recargando la página.
                </p>

                {process.env.NODE_ENV === 'development' && (
                    <details className="mb-6 text-left bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Detalles técnicos
                        </summary>
                        <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
                            {error.message}
                        </pre>
                    </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={reset}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Reintentar
                    </Button>

                    <Link href="/catalog" className="flex-1">
                        <Button
                            variant="outline"
                            className="w-full border-violet-500/30 hover:bg-violet-500/10"
                        >
                            Ver Catálogo
                        </Button>
                    </Link>
                </div>

                <Link href="/home">
                    <Button variant="ghost" size="sm" className="mt-4">
                        <Home className="w-4 h-4 mr-2" />
                        Volver al inicio
                    </Button>
                </Link>
            </div>
        </div>
    );
}
