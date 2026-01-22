'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface Promotion {
  id: string
  name: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  startDate: string
  endDate: string
  isActive: boolean
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
}

interface EditPromotionDialogProps {
  promotion: Promotion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  name: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  startDate: string
  endDate: string
  minPurchaseAmount: number
  maxDiscountAmount: number
  usageLimit: number
}

export function EditPromotionDialog({
  promotion,
  open,
  onOpenChange,
  onSuccess,
}: EditPromotionDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>()

  const discountType = watch('discountType')

  useEffect(() => {
    if (promotion && open) {
      // Convertir fechas al formato correcto para input[type="date"]
      const startDate = promotion.startDate.split('T')[0]
      const endDate = promotion.endDate.split('T')[0]

      reset({
        name: promotion.name,
        description: promotion.description,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        startDate,
        endDate,
        minPurchaseAmount: promotion.minPurchaseAmount || 0,
        maxDiscountAmount: promotion.maxDiscountAmount || 0,
        usageLimit: promotion.usageLimit || 0,
      })
    }
  }, [promotion, open, reset])

  const onSubmit = async (data: FormData) => {
    if (!promotion) return

    // ✅ Validar fechas
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    
    if (end <= start) {
      toast({
        title: 'Error de validación',
        description: 'La fecha de fin debe ser posterior a la fecha de inicio',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true)
    try {
      const response = await api.patch(`/promotions/${promotion.id}`, {
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        startDate: data.startDate,
        endDate: data.endDate,
        minPurchaseAmount: Number(data.minPurchaseAmount) || 0,
        maxDiscountAmount: Number(data.maxDiscountAmount) || 0,
        usageLimit: Number(data.usageLimit) || 0,
      })

      if (response.data?.success) {
        toast({
          title: 'Promoción actualizada',
          description: 'Los cambios se han guardado exitosamente',
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(response.data?.message || 'Error al actualizar')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'No se pudo actualizar la promoción',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!promotion) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Promoción</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la promoción
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Promoción *</Label>
            <Input
              id="name"
              {...register('name', { required: 'El nombre es requerido' })}
              placeholder="Ej: Black Friday 2024"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe la promoción..."
              rows={3}
            />
          </div>

          {/* Tipo y Valor de Descuento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Tipo de Descuento *</Label>
              <Select
                value={discountType}
                onValueChange={(value) => setValue('discountType', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Monto Fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountValue">
                Valor del Descuento * {discountType === 'PERCENTAGE' ? '(%)' : '($)'}
              </Label>
              <Input
                id="discountValue"
                type="number"
                step={discountType === 'PERCENTAGE' ? '0.01' : '1'}
                min="0"
                max={discountType === 'PERCENTAGE' ? '100' : undefined}
                {...register('discountValue', {
                  required: 'El valor es requerido',
                  min: { value: 0, message: 'Debe ser mayor a 0' },
                  max: discountType === 'PERCENTAGE' 
                    ? { value: 100, message: 'No puede ser mayor a 100%' }
                    : undefined,
                })}
              />
              {errors.discountValue && (
                <p className="text-sm text-red-600">{errors.discountValue.message}</p>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio *</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'La fecha de inicio es requerida' })}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Fin *</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate', { required: 'La fecha de fin es requerida' })}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Condiciones Opcionales */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Condiciones Opcionales</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPurchaseAmount">Compra Mínima ($)</Label>
                <Input
                  id="minPurchaseAmount"
                  type="number"
                  step="1"
                  min="0"
                  {...register('minPurchaseAmount')}
                  placeholder="0 = Sin mínimo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDiscountAmount">Descuento Máximo ($)</Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  step="1"
                  min="0"
                  {...register('maxDiscountAmount')}
                  placeholder="0 = Sin límite"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageLimit">Límite de Usos</Label>
              <Input
                id="usageLimit"
                type="number"
                step="1"
                min="0"
                {...register('usageLimit')}
                placeholder="0 = Ilimitado"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
