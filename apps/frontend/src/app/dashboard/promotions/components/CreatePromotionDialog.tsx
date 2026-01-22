'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

interface CreatePromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePromotionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePromotionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: 0,
    startDate: '',
    endDate: '',
    minPurchaseAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    // ✅ Validar fechas
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end <= start) {
      toast({
        title: 'Error de validación',
        description: 'La fecha de fin debe ser posterior a la fecha de inicio',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/promotions', {
        ...formData,
        applicableProductIds: [],
      });

      if (response.data.success) {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo crear la promoción',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      startDate: '',
      endDate: '',
      minPurchaseAmount: 0,
      maxDiscountAmount: 0,
      usageLimit: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Crear Nueva Promoción
          </DialogTitle>
          <DialogDescription>
            Completa la información para crear una nueva promoción
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Nombre de la Promoción *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Descuento de Verano"
                required
                className="h-11"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe los términos y condiciones de la promoción"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Discount Type and Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType" className="text-sm font-semibold">
                  Tipo de Descuento *
                </Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Monto Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue" className="text-sm font-semibold">
                  Valor del Descuento *
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })
                  }
                  placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '100'}
                  required
                  className="h-11"
                />
              </div>
            </div>

            {/* Start and End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm font-semibold">
                  Fecha de Inicio *
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm font-semibold">
                  Fecha de Fin *
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPurchaseAmount" className="text-sm font-semibold">
                  Compra Mínima (opcional)
                </Label>
                <Input
                  id="minPurchaseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minPurchaseAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minPurchaseAmount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usageLimit" className="text-sm font-semibold">
                  Límite de Uso (opcional)
                </Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0 = ilimitado"
                  className="h-11"
                />
              </div>
            </div>

            {formData.discountType === 'PERCENTAGE' && (
              <div className="space-y-2">
                <Label htmlFor="maxDiscountAmount" className="text-sm font-semibold">
                  Descuento Máximo (opcional)
                </Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxDiscountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0 = sin límite"
                  className="h-11"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              {isSubmitting ? 'Creando...' : 'Crear Promoción'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
