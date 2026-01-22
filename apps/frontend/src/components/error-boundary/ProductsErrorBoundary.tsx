'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ProductsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('ProductsErrorBoundary caught error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Send to Sentry or other error tracking
    try {
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            }
          }
        });
      }
    } catch (e) {
      console.error('Failed to send error to Sentry:', e);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-2xl w-full border-red-200 dark:border-red-900">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-red-800 dark:text-red-300">
                  Algo salió mal
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Lo sentimos, ocurrió un error inesperado al cargar esta sección. 
                Nuestro equipo ha sido notificado automáticamente.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <p className="font-mono text-sm text-red-800 dark:text-red-300 mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-red-700 dark:text-red-400 hover:underline">
                        Ver stack trace
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-64 text-red-600 dark:text-red-400">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Intentar de nuevo
                </Button>
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recargar página
                </Button>
                <Button onClick={this.handleGoHome} variant="ghost">
                  <Home className="h-4 w-4 mr-2" />
                  Ir al inicio
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-4">
                Si el problema persiste, contacta al soporte técnico.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para usar error boundary programáticamente
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
