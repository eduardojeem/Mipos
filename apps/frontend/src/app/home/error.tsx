'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home as HomeIcon } from 'lucide-react';

export default function HomeError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Home Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-slate-950 dark:via-purple-950/50 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>

                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    Error inesperado
                </h1>

                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Algo salió mal al cargar la página de inicio.
                </p>

                {process.env.NODE_ENV === 'development' && error && (
                    <details className="mb-6 text-left bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Detalles (desarrollo)
                        </summary>
                        <pre className="text-xs text-red-600 dark:text-red-400 mt-2 overflow-auto">
                            {error.message}
                        </pre>
                    </details>
                )}

                <Button
                    onClick={reset}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white mb-3"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Volver a intentar
                </Button>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Si el problema persiste, por favor contacta con soporte
                </p>
            </div>
        </div>
    );
}
