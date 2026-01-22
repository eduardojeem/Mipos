import React, { useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { formatOfflineStorageSize } from '@/lib/pos/offline-storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Clock,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Database
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface OfflineSyncPanelProps {
  className?: string;
}

export function OfflineSyncPanel({ className }: OfflineSyncPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isOnline,
    pendingTransactions,
    lastSync,
    storageSize,
    isSyncing,
    syncNow,
    clearSynced,
    exportOfflineData,
    importOfflineData
  } = useOfflineSync();

  const handleExport = () => {
    const data = exportOfflineData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-transactions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        importOfflineData(content);
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header Compacto - Siempre visible */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full shadow-sm transition-colors",
              isOnline
                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-bold",
                  isOnline ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                )}>
                  {isOnline ? "En línea" : "Offline"}
                </span>
                {pendingTransactions > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                    {pendingTransactions} pendientes
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Database className="w-3 h-3" />
                {formatOfflineStorageSize(parseInt(storageSize))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Botón de Sincronización Rápida (visible si hay pendientes y online) */}
            {isOnline && pendingTransactions > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={(e) => { e.stopPropagation(); syncNow(); }}
                disabled={isSyncing}
                title="Sincronizar ahora"
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              </Button>
            )}

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="sr-only">Toggle details</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Contenido Expandible */}
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3 border-t bg-muted/30">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="flex flex-col p-2 bg-background rounded-lg border text-xs">
                <span className="text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Última sinc.
                </span>
                <span className="font-medium truncate">
                  {lastSync
                    ? formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: es })
                    : 'Nunca'
                  }
                </span>
              </div>
              <div className="flex flex-col p-2 bg-background rounded-lg border text-xs">
                <span className="text-muted-foreground mb-1 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Almacenamiento
                </span>
                <span className="font-medium">
                  {formatOfflineStorageSize(parseInt(storageSize))}
                </span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={syncNow}
                disabled={isSyncing || !isOnline || pendingTransactions === 0}
                variant="default"
                size="sm"
                className="w-full h-8 text-xs"
              >
                <RefreshCw className={cn("w-3 h-3 mr-2", isSyncing && "animate-spin")} />
                Sincronizar
              </Button>

              <Button
                onClick={clearSynced}
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Limpiar
              </Button>

              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
              >
                <Download className="w-3 h-3 mr-2" />
                Exportar
              </Button>

              <label className="cursor-pointer w-full">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <div className="flex items-center justify-center h-8 px-3 text-xs font-medium transition-colors border rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer bg-background">
                  <Upload className="w-3 h-3 mr-2" />
                  Importar
                </div>
              </label>
            </div>

            {/* Mensaje de estado offline */}
            {!isOnline && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-[10px] text-yellow-800 dark:text-yellow-200 leading-tight">
                  Modo sin conexión activo. Las ventas se guardarán localmente.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default OfflineSyncPanel;