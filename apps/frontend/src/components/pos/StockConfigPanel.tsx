import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStockConfig } from '@/lib/pos/stock-config';
import { Package, AlertTriangle, Settings } from 'lucide-react';

export function StockConfigPanel() {
  const { config, updateConfig, resetConfig } = useStockConfig();

  const handleToggle = (key: keyof typeof config) => {
    updateConfig({ [key]: !config[key] });
  };

  const handleThresholdChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      updateConfig({ warningThreshold: numValue });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Configuración de Stock
        </CardTitle>
        <CardDescription>
          Gestiona las reglas de validación de inventario para el punto de venta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="prevent-negative" className="text-base font-medium">
                Prevenir Stock Negativo
              </Label>
              <div className="text-sm text-muted-foreground">
                Evita que las ventas generen stock negativo en el inventario
              </div>
            </div>
            <Switch
              id="prevent-negative"
              checked={config.preventNegativeStock}
              onCheckedChange={() => handleToggle('preventNegativeStock')}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="auto-block" className="text-base font-medium">
                Bloquear Stock Bajo Automáticamente
              </Label>
              <div className="text-sm text-muted-foreground">
                Impide ventas cuando el stock esté por debajo del umbral definido
              </div>
            </div>
            <Switch
              id="auto-block"
              checked={config.autoBlockLowStock}
              onCheckedChange={() => handleToggle('autoBlockLowStock')}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="text-base font-medium">
                Notificaciones de Stock
              </Label>
              <div className="text-sm text-muted-foreground">
                Muestra alertas cuando el stock esté bajo
              </div>
            </div>
            <Switch
              id="notifications"
              checked={config.notificationEnabled}
              onCheckedChange={() => handleToggle('notificationEnabled')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="threshold">Umbral de Advertencia de Stock</Label>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <Input
              id="threshold"
              type="number"
              min="0"
              max="100"
              value={config.warningThreshold}
              onChange={(e) => handleThresholdChange(e.target.value)}
              className="max-w-[100px]"
            />
            <span className="text-sm text-muted-foreground">unidades</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Se mostrará advertencia cuando el stock esté por debajo de este valor
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={resetConfig}>
            <Settings className="h-4 w-4 mr-2" />
            Restablecer Valores
          </Button>
          <Button 
            variant="default" 
            onClick={() => {
              // Guardar configuración en backend
              // console.log('Configuración guardada:', config);
            }}
          >
            Guardar Configuración
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h4 className="text-sm font-medium mb-2">Resumen de Configuración</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Validación de stock negativo: {config.preventNegativeStock ? 'Activada' : 'Desactivada'}</li>
            <li>• Bloqueo automático de stock bajo: {config.autoBlockLowStock ? 'Activado' : 'Desactivado'}</li>
            <li>• Notificaciones: {config.notificationEnabled ? 'Activadas' : 'Desactivadas'}</li>
            <li>• Umbral de advertencia: {config.warningThreshold} unidades</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}