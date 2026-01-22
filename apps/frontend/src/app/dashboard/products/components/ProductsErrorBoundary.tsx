'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Database, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductsErrorBoundaryProps {
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
  onUseMockData: () => void;
  children: React.ReactNode;
}

export function ProductsErrorBoundary({
  error,
  isLoading,
  onRetry,
  onUseMockData,
  children
}: ProductsErrorBoundaryProps) {
  // If no error, render children normally
  if (!error) {
    return <>{children}</>;
  }

  // Determine error type
  const isConnectionError = error.includes('connection') || error.includes('network') || error.includes('fetch');
  const isAuthError = error.includes('auth') || error.includes('permission') || error.includes('unauthorized');
  const isDatabaseError = error.includes('database') || error.includes('relation') || error.includes('column');

  const getErrorIcon = () => {
    if (isConnectionError) return Wifi;
    if (isAuthError) return AlertTriangle;
    if (isDatabaseError) return Database;
    return AlertTriangle;
  };

  const getErrorTitle = () => {
    if (isConnectionError) return 'Error de Conexión';
    if (isAuthError) return 'Error de Autenticación';
    if (isDatabaseError) return 'Error de Base de Datos';
    return 'Error al Cargar Productos';
  };

  const getErrorDescription = () => {
    if (isConnectionError) {
      return 'No se pudo conectar con la base de datos. Verifica tu conexión a internet.';
    }
    if (isAuthError) {
      return 'No tienes permisos para acceder a los productos. Contacta al administrador.';
    }
    if (isDatabaseError) {
      return 'Hay un problema con la estructura de la base de datos. Contacta al soporte técnico.';
    }
    return 'Ocurrió un error inesperado al cargar los productos.';
  };

  const ErrorIcon = getErrorIcon();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <ErrorIcon className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {getErrorDescription()}
          </p>
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-mono text-muted-foreground">
              Error: {error}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={onRetry} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reintentando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar Conexión
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onUseMockData}
              className="w-full"
            >
              <Database className="w-4 h-4 mr-2" />
              Usar Datos de Prueba
            </Button>
          </div>

          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              Modo: {isConnectionError ? 'Sin conexión' : 'Error de datos'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}