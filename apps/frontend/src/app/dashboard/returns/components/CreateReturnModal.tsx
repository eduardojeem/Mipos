'use client';

import { useState } from 'react';
import { z } from 'zod';
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

// ✅ Enhanced validation schema with strict rules
const createReturnSchema = z.object({
  saleId: z.string()
    .min(1, 'ID de venta es requerido')
    .uuid('ID de venta debe ser un UUID válido'),
  customerId: z.string()
    .uuid('ID de cliente debe ser un UUID válido')
    .optional()
    .or(z.literal('')),
  reason: z.string()
    .min(10, 'La razón debe tener al menos 10 caracteres')
    .max(1000, 'La razón no puede exceder 1000 caracteres'),
  notes: z.string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
    .or(z.literal('')),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10000),
    reason: z.string().max(500).optional()
  })).default([])
});

type CreateReturnFormData = z.infer<typeof createReturnSchema>;

export function CreateReturnModal({
  open,
  onOpenChange,
  onSubmit
}: CreateReturnModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CreateReturnFormData>({
    saleId: '',
    customerId: '',
    reason: '',
    notes: '',
    items: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setValidationErrors({});

    // ✅ Validate with Zod
    const validation = createReturnSchema.safeParse(formData);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });

      setValidationErrors(errors);

      toast({
        title: 'Error de validación',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(validation.data);
      setFormData({
        saleId: '',
        customerId: '',
        reason: '',
        notes: '',
        items: []
      });
      setValidationErrors({});
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
                placeholder="Ingresa el ID de la venta (UUID)"
                required
                className={validationErrors.saleId ? 'border-red-500' : ''}
              />
              {validationErrors.saleId && (
                <p className="text-sm text-red-500">{validationErrors.saleId}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customerId">ID de Cliente</Label>
              <Input
                id="customerId"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="ID del cliente (UUID, opcional)"
                className={validationErrors.customerId ? 'border-red-500' : ''}
              />
              {validationErrors.customerId && (
                <p className="text-sm text-red-500">{validationErrors.customerId}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Razón de Devolución *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
              >
                <SelectTrigger className={validationErrors.reason ? 'border-red-500' : ''}>
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
              {validationErrors.reason && (
                <p className="text-sm text-red-500">{validationErrors.reason}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalles adicionales sobre la devolución... (máx. 1000 caracteres)"
                rows={3}
                maxLength={1000}
                className={validationErrors.notes ? 'border-red-500' : ''}
              />
              {validationErrors.notes && (
                <p className="text-sm text-red-500">{validationErrors.notes}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.notes?.length || 0}/1000 caracteres
              </p>
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