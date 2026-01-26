'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/lib/logger';

interface CreateReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
}

const logger = createLogger('CreateReturnModal');

export function CreateReturnModal({
  open,
  onOpenChange,
  onSubmit
}: CreateReturnModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    saleId: '',
    customerId: '',
    reason: '',
    notes: '',
    items: [] as Array<{
      productId: string;
      quantity: number;
      reason: string;
    }>
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.saleId || !formData.reason) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos obligatorios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        saleId: '',
        customerId: '',
        reason: '',
        notes: '',
        items: []
      });
      onOpenChange(false);
    } catch (error) {
      logger.error('Error creating return:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva Devolución</DialogTitle>
          <DialogDescription>
            Crea una nueva solicitud de devolución de productos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="saleId">ID de Venta *</Label>
              <Input
                id="saleId"
                value={formData.saleId}
                onChange={(e) => setFormData({ ...formData, saleId: e.target.value })}
                placeholder="Ingresa el ID de la venta"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customerId">ID de Cliente</Label>
              <Input
                id="customerId"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="ID del cliente (opcional)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Razón de Devolución *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una razón" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defective">Producto defectuoso</SelectItem>
                  <SelectItem value="wrong-item">Producto incorrecto</SelectItem>
                  <SelectItem value="not-satisfied">Cliente no satisfecho</SelectItem>
                  <SelectItem value="damaged">Producto dañado</SelectItem>
                  <SelectItem value="expired">Producto vencido</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalles adicionales sobre la devolución..."
                rows={3}
              />
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
              {isSubmitting ? 'Creando...' : 'Crear Devolución'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}