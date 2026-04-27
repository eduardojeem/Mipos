'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  DEFAULT_STOCK_ALERT_CONFIG,
  normalizeStockAlertConfig,
  type StockAlertConfig,
} from '@/lib/stock-alerts';

interface AlertConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: StockAlertConfig | null;
  onSave: (config: StockAlertConfig) => Promise<unknown>;
  isSaving?: boolean;
}

export function AlertConfigModal({
  open,
  onOpenChange,
  config,
  onSave,
  isSaving = false,
}: AlertConfigModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<StockAlertConfig>(DEFAULT_STOCK_ALERT_CONFIG);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(normalizeStockAlertConfig(config || DEFAULT_STOCK_ALERT_CONFIG));
  }, [config, open]);

  const busy = submitting || isSaving;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.globalMaxThreshold < formData.globalMinThreshold) {
      toast({
        title: 'Configuracion invalida',
        description: 'El maximo global no puede ser menor que el minimo global.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.criticalThreshold > formData.globalMinThreshold) {
      toast({
        title: 'Configuracion invalida',
        description: 'El umbral critico debe ser menor o igual al minimo global.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await onSave(normalizeStockAlertConfig(formData, formData.globalMinThreshold));
      onOpenChange(false);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuracion.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Configuracion de alertas</DialogTitle>
          <DialogDescription>
            Estos parametros se guardan por organizacion y se reflejan en el sistema de inventario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="text-sm font-semibold">Politica base</h4>
                <p className="text-xs text-muted-foreground">
                  Define los limites por defecto para productos sin minimo propio.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="globalMinThreshold">Minimo global</Label>
                <Input
                  id="globalMinThreshold"
                  type="number"
                  min={0}
                  value={formData.globalMinThreshold}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      globalMinThreshold: Math.max(0, Number(event.target.value || 0)),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="globalMaxThreshold">Maximo global</Label>
                <Input
                  id="globalMaxThreshold"
                  type="number"
                  min={0}
                  value={formData.globalMaxThreshold}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      globalMaxThreshold: Math.max(0, Number(event.target.value || 0)),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="text-sm font-semibold">Sensibilidad</h4>
                <p className="text-xs text-muted-foreground">
                  Ajusta el nivel critico y el margen previo al minimo.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="criticalThreshold">Umbral critico</Label>
                <Input
                  id="criticalThreshold"
                  type="number"
                  min={0}
                  value={formData.criticalThreshold}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      criticalThreshold: Math.max(0, Number(event.target.value || 0)),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warningThreshold">Margen de advertencia</Label>
                <Input
                  id="warningThreshold"
                  type="number"
                  min={0}
                  value={formData.warningThreshold}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      warningThreshold: Math.max(0, Number(event.target.value || 0)),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkFrequency">Frecuencia de revision</Label>
                <Select
                  value={formData.checkFrequency}
                  onValueChange={(value: StockAlertConfig['checkFrequency']) =>
                    setFormData((current) => ({ ...current, checkFrequency: value }))
                  }
                >
                  <SelectTrigger id="checkFrequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Cada hora</SelectItem>
                    <SelectItem value="daily">Diaria</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <h4 className="text-sm font-semibold">Automatizacion</h4>
              <p className="text-xs text-muted-foreground">
                Controla que canales se habilitan para cada organizacion.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="emailAlerts">Alertas por email</Label>
                  <p className="text-xs text-muted-foreground">Prepara el canal de notificacion por correo.</p>
                </div>
                <Switch
                  id="emailAlerts"
                  checked={formData.enableEmailAlerts}
                  onCheckedChange={(checked) =>
                    setFormData((current) => ({ ...current, enableEmailAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="pushAlerts">Notificaciones push</Label>
                  <p className="text-xs text-muted-foreground">Mantiene el flag de notificacion en dashboard.</p>
                </div>
                <Switch
                  id="pushAlerts"
                  checked={formData.enablePushNotifications}
                  onCheckedChange={(checked) =>
                    setFormData((current) => ({ ...current, enablePushNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="autoOrders">Auto reposicion</Label>
                  <p className="text-xs text-muted-foreground">Reserva la bandera para flujos de compras futuras.</p>
                </div>
                <Switch
                  id="autoOrders"
                  checked={formData.autoCreateOrders}
                  onCheckedChange={(checked) =>
                    setFormData((current) => ({ ...current, autoCreateOrders: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando...' : 'Guardar configuracion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
