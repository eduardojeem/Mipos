'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Dashboard Error Boundary');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Component Stack:', errorInfo.componentStack);
        console.groupEnd();
      }

      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to Sentry, LogRocket, etc.
        // Sentry.captureException(error, { contexts: { react: errorInfo } });
        
        // Or send to custom API
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            errorInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        }).catch(() => {
          // Silently fail if error reporting fails
        });
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const bugReport = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Open email client with pre-filled bug report
    const subject = encodeURIComponent('Dashboard Error Report');
    const body = encodeURIComponent(`
Error Report:
${JSON.stringify(bugReport, null, 2)}

Please describe what you were doing when this error occurred:
[Your description here]
    `);
    
    window.open(`mailto:support@beautypos.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            retry={this.handleRetry} 
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
                ¡Oops! Algo salió mal
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Se produjo un error inesperado en el dashboard. Nuestro equipo ha sido notificado automáticamente.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-left">
                    <summary className="cursor-pointer font-medium text-red-700 dark:text-red-300 mb-2">
                      Detalles del Error (Solo en Desarrollo)
                    </summary>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Intentar de Nuevo
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Ir al Dashboard
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleReportBug}
                  className="flex items-center gap-2"
                >
                  <Bug className="h-4 w-4" />
                  Reportar Error
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Si el problema persiste, contacta a soporte técnico en{' '}
                  <a 
                    href="mailto:support@beautypos.com" 
                    className="text-blue-600 hover:underline"
                  >
                    support@beautypos.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useDashboardErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Dashboard Error:', error);
    
    // Log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          errorInfo,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    }
  }, []);

  return { handleError };
}

// Specific error fallback components
export function SectionErrorFallback({ 
  error, 
  retry, 
  sectionName 
}: { 
  error: Error; 
  retry: () => void; 
  sectionName: string;
}) {
  return (
    <Card className="m-4">
      <CardContent className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Error en {sectionName}
        </h3>
        <p className="text-muted-foreground mb-4">
          No se pudo cargar esta sección. {error.message}
        </p>
        <Button onClick={retry} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}