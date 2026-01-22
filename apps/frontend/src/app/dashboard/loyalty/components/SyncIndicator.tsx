'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface SyncIndicatorProps {
  isConnected: boolean;
  isSyncing?: boolean;
  lastSync?: string;
}

export function SyncIndicator({ isConnected, isSyncing, lastSync }: SyncIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isConnected ? 'default' : 'destructive'}
            className="gap-2 cursor-help"
          >
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : isConnected ? (
              <Wifi className="h-3 w-3" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3 w-3" aria-hidden="true" />
            )}
            <span>
              {isSyncing ? 'Sincronizando...' : isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Estado: {isConnected ? 'Conectado' : 'Desconectado'}</div>
            {lastSync && <div>Última sincronización: {new Date(lastSync).toLocaleString()}</div>}
            {isSyncing && <div>Sincronizando datos...</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
