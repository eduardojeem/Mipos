'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Clock, 
  User, 
  RefreshCw, 
  Eye,
  Loader2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { BusinessConfig } from '@/types/business-config';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: any;
  new_data: any;
  user_id: string;
  user_email: string;
  user_role: string;
  created_at: string;
}

interface ConfigHistoryProps {
  organizationId: string;
  onRestore?: (config: BusinessConfig) => void;
}

export function ConfigHistory({ organizationId, onRestore }: ConfigHistoryProps) {
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (organizationId) {
      loadHistory();
    }
  }, [organizationId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'BUSINESS_CONFIG')
        .eq('entity_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setHistory(data || []);
    } catch (err: any) {
      console.error('Error loading config history:', err);
      setError(err.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (log: AuditLog) => {
    if (!onRestore) return;

    const confirmRestore = confirm(
      `¿Está seguro de que desea restaurar la configuración del ${format(new Date(log.created_at), 'PPpp', { locale: es })}?\n\nEsta acción sobrescribirá la configuración actual.`
    );

    if (confirmRestore && log.old_data) {
      onRestore(log.old_data);
      toast({
        title: 'Configuración restaurada',
        description: 'La configuración ha sido restaurada exitosamente.',
      });
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'business_config.update': 'Actualización',
      'business_config.reset': 'Reseteo',
      'business_config.create': 'Creación',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('reset')) return 'bg-orange-100 text-orange-800';
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getChangeSummary = (log: AuditLog) => {
    if (!log.old_data || !log.new_data) return 'Sin detalles';

    const changes: string[] = [];
    const oldData = log.old_data as BusinessConfig;
    const newData = log.new_data as BusinessConfig;

    if (oldData.businessName !== newData.businessName) {
      changes.push('Nombre del negocio');
    }
    if (oldData.tagline !== newData.tagline) {
      changes.push('Eslogan');
    }
    if (oldData.branding?.primaryColor !== newData.branding?.primaryColor) {
      changes.push('Color primario');
    }
    if (oldData.contact?.email !== newData.contact?.email) {
      changes.push('Email de contacto');
    }
    if (oldData.contact?.phone !== newData.contact?.phone) {
      changes.push('Teléfono');
    }

    return changes.length > 0 
      ? changes.slice(0, 3).join(', ') + (changes.length > 3 ? '...' : '')
      : 'Cambios menores';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios
          </CardTitle>
          <CardDescription>
            Cargando historial de configuraciones...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button onClick={loadHistory} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios
          </CardTitle>
          <CardDescription>
            No hay cambios registrados para esta organización
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Los cambios futuros aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Cambios
            </CardTitle>
            <CardDescription>
              {history.length} cambios registrados
            </CardDescription>
          </div>
          <Button onClick={loadHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {history.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'PPpp', { locale: es })}
                      </span>
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{log.user_email}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.user_role}
                      </Badge>
                    </div>

                    {/* Change summary */}
                    <div className="text-sm text-muted-foreground">
                      <strong>Cambios:</strong> {getChangeSummary(log)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {log.old_data && onRestore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(log)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {selectedLog?.id === log.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Configuración Anterior:</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                        {JSON.stringify(log.old_data, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Configuración Nueva:</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                        {JSON.stringify(log.new_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
