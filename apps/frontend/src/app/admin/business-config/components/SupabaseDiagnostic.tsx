'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  Database,
  Key,
  FolderOpen,
  Shield,
  RefreshCw,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error' | 'loading';
  message: string;
  details?: string;
}

interface SupabaseDiagnosticProps {
  bucket?: string;
  onClose: () => void;
}

export function SupabaseDiagnostic({ bucket = 'carousel', onClose }: SupabaseDiagnosticProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const supabase = createClient();

  const runDiagnostic = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // 1. Verificar cliente de Supabase
    diagnosticResults.push({
      name: 'Cliente Supabase',
      status: 'loading',
      message: 'Verificando inicialización...'
    });
    setResults([...diagnosticResults]);

    try {
      if (!supabase) {
        diagnosticResults[0] = {
          name: 'Cliente Supabase',
          status: 'error',
          message: 'Cliente no inicializado',
          details: 'Verificar configuración de variables de entorno'
        };
      } else {
        diagnosticResults[0] = {
          name: 'Cliente Supabase',
          status: 'success',
          message: 'Cliente inicializado correctamente'
        };
      }
      setResults([...diagnosticResults]);

      // 2. Verificar autenticación
      diagnosticResults.push({
        name: 'Autenticación',
        status: 'loading',
        message: 'Verificando usuario...'
      });
      setResults([...diagnosticResults]);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        diagnosticResults[1] = {
          name: 'Autenticación',
          status: 'error',
          message: 'Usuario no autenticado',
          details: authError?.message || 'Inicia sesión para subir archivos'
        };
      } else {
        diagnosticResults[1] = {
          name: 'Autenticación',
          status: 'success',
          message: `Autenticado como: ${user.email}`,
          details: `ID: ${user.id}`
        };
      }
      setResults([...diagnosticResults]);

      // 3. Verificar buckets disponibles
      diagnosticResults.push({
        name: 'Buckets de Storage',
        status: 'loading',
        message: 'Listando buckets...'
      });
      setResults([...diagnosticResults]);

      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        diagnosticResults[2] = {
          name: 'Buckets de Storage',
          status: 'error',
          message: 'Error accediendo a storage',
          details: bucketsError.message
        };
      } else {
        const bucketNames = buckets?.map((b: any) => b.name) || [];
        const bucketExists = bucketNames.includes(bucket);
        
        diagnosticResults[2] = {
          name: 'Buckets de Storage',
          status: bucketExists ? 'success' : 'warning',
          message: bucketExists 
            ? `Bucket '${bucket}' encontrado` 
            : `Bucket '${bucket}' no encontrado`,
          details: `Disponibles: ${bucketNames.join(', ') || 'Ninguno'}`
        };
      }
      setResults([...diagnosticResults]);

      // 4. Verificar permisos de escritura (solo si el bucket existe)
      if (diagnosticResults[2].status === 'success') {
        diagnosticResults.push({
          name: 'Permisos de Escritura',
          status: 'loading',
          message: 'Probando subida...'
        });
        setResults([...diagnosticResults]);

        const testFileName = `diagnostic-test-${Date.now()}.txt`;
        const testFile = new Blob(['diagnostic test'], { type: 'text/plain' });
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(testFileName, testFile);
        
        if (uploadError) {
          diagnosticResults[3] = {
            name: 'Permisos de Escritura',
            status: 'error',
            message: 'Sin permisos de escritura',
            details: uploadError.message
          };
        } else {
          // Limpiar archivo de test
          await supabase.storage.from(bucket).remove([testFileName]);
          
          diagnosticResults[3] = {
            name: 'Permisos de Escritura',
            status: 'success',
            message: 'Permisos confirmados',
            details: 'Puede subir archivos correctamente'
          };
        }
        setResults([...diagnosticResults]);
      }

      // 5. Verificar variables de entorno
      diagnosticResults.push({
        name: 'Variables de Entorno',
        status: 'loading',
        message: 'Verificando configuración...'
      });
      setResults([...diagnosticResults]);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const bucketEnv = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_CAROUSEL;

      let envStatus: 'success' | 'warning' | 'error' = 'success';
      let envMessage = 'Todas las variables configuradas';
      let envDetails = '';

      if (!supabaseUrl || !supabaseKey) {
        envStatus = 'error';
        envMessage = 'Variables críticas faltantes';
        envDetails = `URL: ${supabaseUrl ? '✓' : '✗'}, Key: ${supabaseKey ? '✓' : '✗'}`;
      } else if (!bucketEnv) {
        envStatus = 'warning';
        envMessage = 'Usando bucket por defecto';
        envDetails = `NEXT_PUBLIC_SUPABASE_BUCKET_CAROUSEL no definida, usando '${bucket}'`;
      } else {
        envDetails = `URL: ✓, Key: ✓, Bucket: ${bucketEnv}`;
      }

      diagnosticResults[diagnosticResults.length - 1] = {
        name: 'Variables de Entorno',
        status: envStatus,
        message: envMessage,
        details: envDetails
      };
      setResults([...diagnosticResults]);

    } catch (error) {
      console.error('Error en diagnóstico:', error);
      diagnosticResults.push({
        name: 'Error General',
        status: 'error',
        message: 'Error inesperado en diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
      setResults([...diagnosticResults]);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Correcto</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Advertencia</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'loading':
        return <Badge variant="outline">Verificando...</Badge>;
    }
  };

  const getSectionIcon = (name: string) => {
    switch (name) {
      case 'Cliente Supabase':
        return <Database className="h-4 w-4" />;
      case 'Autenticación':
        return <Key className="h-4 w-4" />;
      case 'Buckets de Storage':
        return <FolderOpen className="h-4 w-4" />;
      case 'Permisos de Escritura':
        return <Shield className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const overallStatus = results.length > 0 ? (
    results.some(r => r.status === 'error') ? 'error' :
    results.some(r => r.status === 'warning') ? 'warning' :
    results.every(r => r.status === 'success') ? 'success' : 'loading'
  ) : 'loading';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Diagnóstico de Supabase</CardTitle>
                <p className="text-sm text-slate-500">
                  Verificando configuración para subida de imágenes
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {overallStatus === 'success' && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Todo correcto
                </Badge>
              )}
              {overallStatus === 'error' && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Errores encontrados
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">Ejecuta el diagnóstico para verificar la configuración</p>
              <Button onClick={runDiagnostic} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Ejecutar Diagnóstico
              </Button>
            </div>
          ) : (
            <>
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getSectionIcon(result.name)}
                    {getStatusIcon(result.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{result.name}</h4>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-slate-600">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-slate-500 mt-1 font-mono bg-slate-50 p-2 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center pt-4 border-t">
                <Button 
                  onClick={runDiagnostic} 
                  disabled={isRunning}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                  Ejecutar Nuevamente
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}