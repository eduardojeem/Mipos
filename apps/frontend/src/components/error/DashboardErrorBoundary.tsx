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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 640, width: '100%', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#DC2626' }}>¡Oops! Algo salió mal</div>
              <p style={{ color: 'rgba(0,0,0,0.6)' }}>Se produjo un error inesperado en el dashboard.</p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: 12 }}>
                <summary>Detalles del Error (Solo en Desarrollo)</summary>
                <div style={{ marginTop: 8 }}>
                  <div><strong>Error:</strong> {this.state.error.message}</div>
                  {this.state.error.stack && (
                    <pre style={{ marginTop: 8, fontSize: 12, overflow: 'auto' }}>{this.state.error.stack}</pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <pre style={{ marginTop: 8, fontSize: 12, overflow: 'auto' }}>{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={this.handleRetry} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', background: '#fff' }}>Intentar de Nuevo</button>
              <button onClick={this.handleGoHome} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', background: '#fff' }}>Ir al Dashboard</button>
              <button onClick={this.handleReportBug} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', background: '#fff' }}>Reportar Error</button>
            </div>
          </div>
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
