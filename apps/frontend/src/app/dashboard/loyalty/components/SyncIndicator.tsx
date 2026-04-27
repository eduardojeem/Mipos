'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface SyncIndicatorProps {
  isConnected: boolean;
  isSyncing?: boolean;
  lastSync?: string;
}

export function SyncIndicator({ isConnected, isSyncing, lastSync }: SyncIndicatorProps) {
  const label = isSyncing ? 'Sincronizando...' : isConnected ? 'Conectado' : 'Desconectado';
  const dotColor = isSyncing
    ? 'bg-amber-400'
    : isConnected
      ? 'bg-emerald-500'
      : 'bg-red-500';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-muted"
            aria-label={`Estado de sincronización: ${label}`}
          >
            <span className="relative flex h-2 w-2">
              {(isSyncing || isConnected) && (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotColor}`}
                />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
            </span>
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin text-amber-500" aria-hidden="true" />
            ) : isConnected ? (
              <Wifi className="h-3 w-3 text-emerald-500" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" aria-hidden="true" />
            )}
            <span className="text-muted-foreground">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          <div>Estado: {isConnected ? 'Conectado' : 'Desconectado'}</div>
          {lastSync && (
            <div>Última sincronización: {new Date(lastSync).toLocaleString('es')}</div>
          )}
          {isSyncing && <div className="text-amber-500">Sincronizando datos...</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
