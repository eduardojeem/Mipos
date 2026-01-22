'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Bell, 
  BellOff,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RealTimeIndicatorProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  newSalesCount: number;
  onRefresh: () => void;
  onMarkAsViewed: () => void;
  onToggleNotifications?: () => void;
  notificationsEnabled?: boolean;
  isRefreshing?: boolean;
  isMarkingViewed?: boolean;
  dataSource?: 'supabase' | 'backend' | 'mock' | 'unknown';
}

const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({
  isConnected,
  lastUpdate,
  newSalesCount,
  onRefresh,
  onMarkAsViewed,
  onToggleNotifications,
  notificationsEnabled = false,
  isRefreshing = false,
  isMarkingViewed = false,
  dataSource = 'unknown'
}) => {
  const getConnectionStatus = () => {
    if (isConnected) {
      return {
        icon: <Wifi className="h-4 w-4" />,
        text: 'Conectado',
        variant: 'default' as const,
        color: 'text-green-600'
      };
    } else {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        text: 'Desconectado',
        variant: 'destructive' as const,
        color: 'text-red-600'
      };
    }
  };

  const getLastUpdateText = () => {
    if (!lastUpdate) return 'Nunca';
    
    try {
      return formatDistanceToNow(lastUpdate, { 
        addSuffix: true, 
        locale: es 
      });
    } catch (error) {
      return 'Hace un momento';
    }
  };

  const renderDataSourceBadge = () => {
    const map: Record<string, { label: string; className: string }> = {
      supabase: { label: 'Fuente: Supabase', className: 'bg-emerald-100 text-emerald-800' },
      backend: { label: 'Fuente: Backend', className: 'bg-gray-100 text-gray-800' },
      mock: { label: 'Fuente: Mock', className: 'bg-yellow-100 text-yellow-800' },
      unknown: { label: 'Fuente: Desconocida', className: 'bg-slate-100 text-slate-800' }
    };
    const info = map[dataSource] || map.unknown;
    return (
      <Badge variant="secondary" className={info.className} title={info.label}>
        {info.label}
      </Badge>
    );
  };

  const connectionStatus = getConnectionStatus();

  return (
    <Card className="w-full" aria-labelledby="realtime-indicator-title">
      <CardContent className="p-4" aria-busy={isRefreshing}>
        <h3 id="realtime-indicator-title" className="sr-only">Estado de actualizaciones automáticas</h3>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Estado de Conexión */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={connectionStatus.color}>
                {connectionStatus.icon}
              </div>
              <Badge variant={connectionStatus.variant}>
                {connectionStatus.text}
              </Badge>
              {renderDataSourceBadge()}
            </div>

            {/* Última Actualización */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Clock className="h-4 w-4" />
              <span>Actualizado {getLastUpdateText()}</span>
            </div>

            {/* Nuevas Ventas */}
            {newSalesCount > 0 && (
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {newSalesCount} nueva{newSalesCount !== 1 ? 's' : ''} venta{newSalesCount !== 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAsViewed}
                  disabled={isMarkingViewed}
                  className="text-xs"
                  aria-label="Marcar nuevas ventas como vistas"
                >
                  {isMarkingViewed ? 'Marcando…' : 'Marcar como visto'}
                </Button>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {/* Toggle Notificaciones */}
            {onToggleNotifications && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleNotifications}
                className="flex items-center gap-2"
                title={notificationsEnabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                aria-label={notificationsEnabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                aria-pressed={!!notificationsEnabled}
              >
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Botón Refrescar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
              aria-label="Actualizar datos"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Información adicional cuando está desconectado */}
        {!isConnected && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span>
                Sin conexión con el servidor. Los datos pueden no estar actualizados.
              </span>
            </div>
          </div>
        )}

        {/* Indicador de actividad */}
        {isConnected && (
          <div className="mt-2 flex items-center gap-2" role="status" aria-live="polite">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground" title="Actualizaciones automáticas activas">
                Actualizaciones automáticas activas
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeIndicator;