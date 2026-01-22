'use client';

import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface AlertConfig {
  globalMinThreshold: number;
  globalMaxThreshold: number;
  criticalThreshold: number;
  warningThreshold: number;
  enableEmailAlerts: boolean;
  enablePushNotifications: boolean;
  autoCreateOrders: boolean;
  checkFrequency: 'hourly' | 'daily' | 'weekly';
}

interface AlertConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AlertConfig | null;
  onSave: (config: AlertConfig) => void;
}

export function AlertConfigModal({ 
  open, 
  onOpenChange, 
  config,
  onSave 
}: AlertConfigModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AlertConfig>(
    config || {
      globalMinThreshold: 10,
      globalMaxThreshold: 100,
      criticalThreshold: 5,
      warningThreshold: 20,
      enableEmailAlerts: true,
      enablePushNotifications: true,
      autoCreateOrders: false,
      checkFrequency: 'daily'
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.criticalThreshold >= formData.warningThreshold) {
      toast({
        title: 'Error de configuración',
        description: 'El umbral crítico debe ser menor que el umbral de advertencia.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      toast({
        title: 'Configuración guardada',
        description: 'La configuración de alertas ha sido actualizada.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuración de Alertas</DialogTitle>
          <DialogDescription>
            Configura los umbrales y notificaciones para las alertas de stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Thresholds */}
            <div className="space-y-3">
              <h4 className="font-medium">Umbrales de Stock</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="criticalThreshold">Umbral Crítico</Label>
                  <Input
                    id="criticalThreshold"
                    type="number"
                    min="1"
                    value={formData.criticalThreshold}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      criticalThreshold: parseInt(e.target.value) || 0 
                    })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="warningThreshold">Umbral de Advertencia</Label>
                  <Input
                    id="warningThreshold"
                    type="number"
                    min="1"
                    value={formData.warningThreshold}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      warningThreshold: parseInt(e.target.value) || 0 
                    })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="globalMinThreshold">Mínimo Global</Label>
                  <Input
                    id="globalMinThreshold"
                    type="number"
                    min="1"
                    value={formData.globalMinThreshold}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      globalMinThreshold: parseInt(e.target.value) || 0 
                    })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="globalMaxThreshold">Máximo Global</Label>
                  <Input
                    id="globalMaxThreshold"
                    type="number"
                    min="1"
                    value={formData.globalMaxThreshold}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      globalMaxThreshold: parseInt(e.target.value) || 0 
                    })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <h4 className="font-medium">Notificaciones</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailAlerts">Alertas por Email</Label>
                  <Switch
                    id="emailAlerts"
                    checked={formData.enableEmailAlerts}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, enableEmailAlerts: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushNotifications">Notificaciones Push</Label>
                  <Switch
                    id="pushNotifications"
                    checked={formData.enablePushNotifications}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, enablePushNotifications: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoCreateOrders">Crear Órdenes Automáticamente</Label>
                  <Switch
                    id="autoCreateOrders"
                    checked={formData.autoCreateOrders}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, autoCreateOrders: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Check Frequency */}
            <div className="space-y-2">
              <Label htmlFor="checkFrequency">Frecuencia de Verificación</Label>
              <Select 
                value={formData.checkFrequency} 
                onValueChange={(value: 'hourly' | 'daily' | 'weekly') => 
                  setFormData({ ...formData, checkFrequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Cada hora</SelectItem>
                  <SelectItem value="daily">Diariamente</SelectItem>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}