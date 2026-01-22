'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface RefreshIndicatorProps {
  lastUpdate: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  autoRefresh?: boolean;
  onAutoRefreshToggle?: (enabled: boolean) => void;
}

export function RefreshIndicator({
  lastUpdate,
  isRefreshing,
  onRefresh,
  autoRefresh = false,
  onAutoRefreshToggle,
}: RefreshIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Última actualización */}
      {lastUpdate && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(lastUpdate, {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                Última actualización: {lastUpdate.toLocaleString('es-ES')}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Botón de actualización */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="gap-2 dark:bg-slate-900/50 dark:border-slate-800/50"
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : 0 }}
          transition={{
            duration: 1,
            repeat: isRefreshing ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </motion.div>
        {isRefreshing ? 'Actualizando...' : 'Actualizar'}
      </Button>

      {/* Auto-refresh toggle */}
      {onAutoRefreshToggle && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAutoRefreshToggle(!autoRefresh)}
                className="dark:bg-slate-900/50 dark:border-slate-800/50"
              >
                <Badge variant={autoRefresh ? 'default' : 'secondary'}>
                  Auto {autoRefresh ? 'ON' : 'OFF'}
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {autoRefresh
                  ? 'Actualización automática activada (cada 30s)'
                  : 'Activar actualización automática'}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
