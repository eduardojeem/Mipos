'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ProductSelectionDialog } from './ProductSelectionDialog';
import {
  Package,
  Plus,
  X,
  Loader2,
  Tag,
  Calendar,
  Settings2,
  Percent,
  DollarSign,
} from 'lucide-react';
import api from '@/lib/api';
import { useState } from 'react';

interface CreatePromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  startDate: string;
  endDate: string;
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
}

export function CreatePromotionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePromotionDialogProps) {
  const { toast } = useToast();
  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      startDate: today,
      endDate: '',
      minPurchaseAmount: 0,
      maxDiscountAmount: 0,
      usageLimit: 0,
    },
  });

  const discountType = watch('discountType');
  const discountValue = watch('discountValue');

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset({
        name: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        startDate: today,
        endDate: '',
        minPurchaseAmount: 0,
        maxDiscountAmount: 0,
        usageLimit: 0,
      });
      setSelectedProductIds([]);
    }
  }, [open, reset, today]);

  const onSubmit = async (data: FormData) => {
    // Validate dates
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end < start) {
      toast({
        title: 'Error de validación',
        description: 'La fecha de fin no puede ser anterior a la fecha de inicio',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.post('/promotions', {
        ...data,
        discountValue: Number(data.discountValue),
        minPurchaseAmount: Number(data.minPurchaseAmount) || 0,
        maxDiscountAmount: Number(data.maxDiscountAmount) || 0,
        usageLimit: Number(data.usageLimit) || 0,
        applicableProductIds: selectedProductIds,
      });

      if (response.data.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(response.data?.message || 'Error al crear la promoción');
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } }, message?: string };
      const message = apiError.response?.data?.message || apiError.message || 'No se pudo crear la promoción';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const removeProduct = (id: string) => {
    setSelectedProductIds((prev) => prev.filter((p) => p !== id));
  };

  return (
    <>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">

            {/* ── SECCIÓN 1: Información básica ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Tag className="h-4 w-4 text-violet-500" />
                Información básica
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Nombre de la Promoción <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ej: Descuento de Verano"
                  className="h-11"
                  {...register('name', { required: 'El nombre es requerido' })}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe los términos y condiciones de la promoción"
                  rows={3}
                  className="resize-none"
                  {...register('description')}
                />
              </div>
            </div>

            {/* ── SECCIÓN 2: Productos ── */}
            <div className="space-y-3 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pt-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-violet-500" />
                  Productos Aplicables
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-violet-200 hover:border-violet-400 hover:bg-violet-50 dark:border-violet-900 dark:hover:bg-violet-900/20"
                  onClick={() => setIsProductSelectOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {selectedProductIds.length > 0 ? 'Modificar selección' : 'Seleccionar productos'}
                </Button>
              </div>

              <div className="min-h-[56px] p-3 rounded-xl border-2 border-dashed border-violet-100 dark:border-violet-900/50 bg-violet-50/30 dark:bg-violet-900/10 transition-colors">
                {selectedProductIds.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                        {selectedProductIds.length} producto{selectedProductIds.length !== 1 ? 's' : ''} seleccionado{selectedProductIds.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2"
                        onClick={() => setSelectedProductIds([])}
                      >
                        Limpiar todo
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProductIds.slice(0, 12).map((id) => (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="gap-1 text-xs bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 pr-1"
                        >
                          <span className="font-mono">···{id.slice(-6)}</span>
                          <button
                            type="button"
                            onClick={() => removeProduct(id)}
                            className="ml-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 p-0.5"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      {selectedProductIds.length > 12 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          +{selectedProductIds.length - 12} más
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-2">
                    Sin productos seleccionados. La promoción se aplicará a todos los productos.
                  </p>
                )}
              </div>
            </div>

            {/* ── SECCIÓN 3: Descuento ── */}
            <div className="space-y-4 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 pt-3">
                {discountType === 'PERCENTAGE'
                  ? <Percent className="h-4 w-4 text-violet-500" />
                  : <DollarSign className="h-4 w-4 text-violet-500" />
                }
                Configuración de Descuento
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de descuento */}
                <div className="space-y-1.5">
                  <Label htmlFor="discountType" className="text-sm font-semibold">
                    Tipo de Descuento <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={discountType}
                    onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') =>
                      setValue('discountType', value, { shouldValidate: true })
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

                {/* Valor del descuento */}
                <div className="space-y-1.5">
                  <Label htmlFor="discountValue" className="text-sm font-semibold">
                    Valor del Descuento{' '}
                    <span className="text-slate-500 font-normal">
                      {discountType === 'PERCENTAGE' ? '(%)' : '($)'}
                    </span>{' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0.01"
                    step={discountType === 'PERCENTAGE' ? '0.01' : '1'}
                    max={discountType === 'PERCENTAGE' ? '100' : undefined}
                    placeholder={discountType === 'PERCENTAGE' ? 'Ej: 10' : 'Ej: 5000'}
                    className="h-11"
                    {...register('discountValue', {
                      required: 'El valor del descuento es requerido',
                      min: { value: 0.01, message: 'El valor debe ser mayor a 0' },
                      max: discountType === 'PERCENTAGE'
                        ? { value: 100, message: 'El porcentaje no puede superar el 100%' }
                        : undefined,
                    })}
                  />
                  {errors.discountValue && (
                    <p className="text-xs text-red-600">{errors.discountValue.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── SECCIÓN 4: Fechas ── */}
            <div className="space-y-4 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 pt-3">
                <Calendar className="h-4 w-4 text-violet-500" />
                Vigencia
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-sm font-semibold">
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    min={today}
                    className="h-11"
                    {...register('startDate', { required: 'La fecha de inicio es requerida' })}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-red-600">{errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-sm font-semibold">
                    Fecha de Fin <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={today}
                    className="h-11"
                    {...register('endDate', { required: 'La fecha de fin es requerida' })}
                  />
                  {errors.endDate && (
                    <p className="text-xs text-red-600">{errors.endDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── SECCIÓN 5: Condiciones opcionales ── */}
            <div className="space-y-4 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 pt-3">
                <Settings2 className="h-4 w-4 text-violet-500" />
                Condiciones Opcionales
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="minPurchaseAmount" className="text-sm font-semibold">
                    Compra Mínima ($)
                  </Label>
                  <Input
                    id="minPurchaseAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0 = sin mínimo"
                    className="h-11"
                    {...register('minPurchaseAmount')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="usageLimit" className="text-sm font-semibold">
                    Límite de Usos
                  </Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0 = ilimitado"
                    className="h-11"
                    {...register('usageLimit')}
                  />
                </div>
              </div>

              {discountType === 'PERCENTAGE' && (
                <div className="space-y-1.5">
                  <Label htmlFor="maxDiscountAmount" className="text-sm font-semibold">
                    Descuento Máximo ($)
                  </Label>
                  <Input
                    id="maxDiscountAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0 = sin límite de monto"
                    className="h-11"
                    {...register('maxDiscountAmount')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limita el monto máximo descontado aunque el porcentaje sea mayor
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 min-w-[150px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Promoción'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Selector de Productos */}
      <ProductSelectionDialog
        open={isProductSelectOpen}
        onOpenChange={setIsProductSelectOpen}
        onConfirm={(ids) => {
          setSelectedProductIds(ids);
          setIsProductSelectOpen(false);
        }}
        excludeProductIds={[]}
        discountType={discountType}
        discountValue={Number(discountValue) || 0}
      />
    </>
  );
}
