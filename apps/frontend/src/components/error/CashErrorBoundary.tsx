import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class CashErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Cash Error Boundary caught error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="h-5 w-5" />
                            Error en la sección de caja
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-red-700">
                            <p className="font-medium mb-2">Ha ocurrido un error inesperado:</p>
                            <p className="text-xs font-mono bg-red-100 p-2 rounded border border-red-200">
                                {this.state.error?.message || 'Error desconocido'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={this.handleReset}
                                className="gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Reintentar
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.location.reload()}
                            >
                                Recargar página
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}

export function CashErrorFallback({ error, reset }: { error?: Error; reset?: () => void }) {
    return (
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-red-800 mb-1">
                        Error al cargar esta sección
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                        {error?.message || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'}
                    </p>
                    {reset && (
                        <Button variant="outline" size="sm" onClick={reset}>
                            Reintentar
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
