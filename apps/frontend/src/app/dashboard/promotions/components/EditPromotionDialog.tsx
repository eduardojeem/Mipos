'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Package, Plus, Scissors, X } from 'lucide-react'
import api from '@/lib/api'
import { ProductSelectionDialog } from './ProductSelectionDialog'
import { ServiceSelectionDialog } from './ServiceSelectionDialog'
import { useCurrentVertical } from '@/hooks/use-current-vertical'

import type { Promotion } from '@/lib/validation/promotion-validation'

interface EditPromotionDialogProps {
  promotion: Promotion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  name: string
  description: string
  targetType: 'PRODUCT' | 'SERVICE'
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
  const vertical = useCurrentVertical()
  const [loading, setLoading] = useState(false)
  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false)
  const [isServiceSelectOpen, setIsServiceSelectOpen] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const { toast } = useToast()
  const isBarbershop = vertical === 'BARBERSHOP'
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>()

  const discountType = watch('discountType')
  const discountValue = watch('discountValue')
  const targetType = watch('targetType')

  const knownProducts = useMemo(() => {
    const applicable = promotion?.applicableProducts || []
    const entries = Array.isArray(applicable)
      ? applicable
          .map((product) => ({
            id: typeof product?.id === 'string' ? product.id : String(product?.id || ''),
            name: typeof product?.name === 'string' ? product.name : '',
          }))
          .filter((product) => product.id)
      : []

    return new Map(entries.map((product) => [product.id, product.name]))
  }, [promotion?.applicableProducts])

  const knownServices = useMemo(() => {
    const applicable = promotion?.applicableServices || []
    const entries = Array.isArray(applicable)
      ? applicable
          .map((service) => ({
            id: typeof service?.id === 'string' ? service.id : String(service?.id || ''),
            name: typeof service?.name === 'string' ? service.name : '',
          }))
          .filter((service) => service.id)
      : []

    return new Map(entries.map((service) => [service.id, service.name]))
  }, [promotion?.applicableServices])

  useEffect(() => {
    if (promotion && open) {
      // Convertir fechas al formato correcto para input[type="date"]
      const startDate = promotion.startDate.split('T')[0]
      const endDate = promotion.endDate.split('T')[0]

      reset({
        name: promotion.name,
        description: promotion.description,
        targetType: promotion.targetType || 'PRODUCT',
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        startDate,
        endDate,
        minPurchaseAmount: promotion.minPurchaseAmount || 0,
        maxDiscountAmount: promotion.maxDiscountAmount || 0,
        usageLimit: promotion.usageLimit || 0,
      })

      setSelectedProductIds(
        Array.isArray(promotion.applicableProducts)
          ? promotion.applicableProducts
              .map((product) => String(product?.id || '').trim())
              .filter((id): id is string => id.length > 0)
          : []
      )
      setSelectedServiceIds(
        Array.isArray(promotion.applicableServices)
          ? promotion.applicableServices
              .map((service) => String(service?.id || '').trim())
              .filter((id): id is string => id.length > 0)
          : []
      )
    }
  }, [promotion, open, reset])

  const handleAddProducts = (productIds: string[]) => {
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...productIds])))
    setIsProductSelectOpen(false)
  }

  const removeProduct = (productId: string) => {
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId))
  }

  const handleAddServices = (serviceIds: string[]) => {
    setSelectedServiceIds((prev) => Array.from(new Set([...prev, ...serviceIds])))
    setIsServiceSelectOpen(false)
  }

  const removeService = (serviceId: string) => {
    setSelectedServiceIds((prev) => prev.filter((id) => id !== serviceId))
  }

  const onSubmit = async (data: FormData) => {
    if (!promotion) return

    // Validar nombre
    if (!data.name || data.name.trim().length < 2) {
      toast({ title: 'Error', description: 'El nombre debe tener al menos 2 caracteres', variant: 'destructive' });
      return;
    }
    // Validar porcentaje
    if (data.discountType === 'PERCENTAGE' && Number(data.discountValue) > 100) {
      toast({ title: 'Error', description: 'El porcentaje no puede superar el 100%', variant: 'destructive' });
      return;
    }
    // Validar fechas
    if (!data.startDate || !data.endDate) {
      toast({ title: 'Error', description: 'Las fechas de inicio y fin son requeridas', variant: 'destructive' });
      return;
    }
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast({ title: 'Error', description: 'Las fechas ingresadas no son válidas', variant: 'destructive' });
      return;
    }
    if (end <= start) {
      toast({ title: 'Error', description: 'La fecha de fin debe ser posterior a la fecha de inicio', variant: 'destructive' });
      return;
    }

    setLoading(true)
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description ?? '',
        targetType: isBarbershop ? data.targetType : 'PRODUCT',
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        startDate: data.startDate,
        endDate: data.endDate,
        minPurchaseAmount: Number(data.minPurchaseAmount) || 0,
        maxDiscountAmount: Number(data.maxDiscountAmount) || 0,
        usageLimit: Number(data.usageLimit) || 0,
        isActive: promotion.isActive, // preserve current active state
        applicableProductIds: (isBarbershop ? data.targetType : 'PRODUCT') === 'PRODUCT' ? selectedProductIds : [],
        applicableServiceIds: (isBarbershop ? data.targetType : 'PRODUCT') === 'SERVICE' ? selectedServiceIds : [],
      }
      
      const response = await api.patch(`/promotions/${promotion.id}`, payload)

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
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } }, message?: string };
      const message = apiError.response?.data?.message || apiError.message || 'No se pudo actualizar la promoción';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!promotion) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isBarbershop ? 'Editar campaña o promo de productos' : 'Editar Promoción'}</DialogTitle>
          <DialogDescription>
            {isBarbershop
              ? 'Ajusta descuentos y productos visibles en ofertas web de tu barbería.'
              : 'Modifica los detalles de la promoción'}
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

          {isBarbershop && (
            <div className="space-y-2">
              <Label htmlFor="targetType">Alcance de la promoción</Label>
              <Select
                value={targetType}
                onValueChange={(value: 'PRODUCT' | 'SERVICE') => setValue('targetType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">Productos / tienda online</SelectItem>
                  <SelectItem value="SERVICE">Servicios de barbería</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  {targetType === 'SERVICE'
                    ? <Scissors className="h-4 w-4 text-violet-500" />
                    : <Package className="h-4 w-4 text-violet-500" />
                  }
                  {targetType === 'SERVICE'
                    ? 'Servicios promocionados'
                    : isBarbershop ? 'Productos promocionados' : 'Productos Asociados'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {targetType === 'SERVICE'
                    ? 'Agrega o quita servicios. Los cambios se guardan al pulsar Guardar Cambios.'
                    : isBarbershop
                    ? 'Agrega o quita productos de la tienda online. Los cambios se guardan al pulsar Guardar Cambios.'
                    : 'Agrega o quita productos. Los cambios se guardan al pulsar Guardar Cambios.'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-2"
                onClick={() => targetType === 'SERVICE' ? setIsServiceSelectOpen(true) : setIsProductSelectOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {targetType === 'SERVICE' ? 'Agregar servicios' : 'Agregar productos'}
              </Button>
            </div>

            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-3 dark:border-violet-900/50 dark:bg-violet-900/10">
              {(targetType === 'SERVICE' ? selectedServiceIds.length : selectedProductIds.length) > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                      {targetType === 'SERVICE'
                        ? `${selectedServiceIds.length} servicio${selectedServiceIds.length !== 1 ? 's' : ''} asociado${selectedServiceIds.length !== 1 ? 's' : ''}`
                        : `${selectedProductIds.length} producto${selectedProductIds.length !== 1 ? 's' : ''} asociado${selectedProductIds.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {(targetType === 'SERVICE' ? selectedServiceIds : selectedProductIds).map((id) => {
                        const name = targetType === 'SERVICE' ? knownServices.get(id) : knownProducts.get(id)
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="gap-1 bg-violet-100 pr-1 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                          >
                            <span className="max-w-[150px] truncate">
                              {name || `Nuevo ···${id.slice(-6)}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => targetType === 'SERVICE' ? removeService(id) : removeProduct(id)}
                              className="rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800"
                              aria-label={targetType === 'SERVICE' ? 'Quitar servicio' : 'Quitar producto'}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-2">
                  {targetType === 'SERVICE'
                    ? 'Sin servicios seleccionados. La promoción se aplicará a todos los servicios activos.'
                    : isBarbershop
                    ? 'Sin productos seleccionados. La promoción se aplicará a toda la tienda online de productos.'
                    : 'Sin productos seleccionados. La promoción se aplicará a todos los productos.'}
                </p>
              )}
            </div>
            {isBarbershop && (
              <p className="text-xs text-muted-foreground">
                {targetType === 'SERVICE'
                  ? 'Esta promo se guardará sobre servicios del negocio.'
                  : 'Esta promo seguirá afectando ofertas y productos web.'}
              </p>
            )}
          </div>

          {/* Tipo y Valor de Descuento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Tipo de Descuento *</Label>
              <Select
                value={discountType}
                onValueChange={(value: 'PERCENTAGE' | 'FIXED_AMOUNT') => setValue('discountType', value)}
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
      <ProductSelectionDialog
        open={isProductSelectOpen}
        onOpenChange={setIsProductSelectOpen}
        onConfirm={handleAddProducts}
        excludeProductIds={selectedProductIds}
        discountType={discountType || promotion.discountType}
        discountValue={Number(discountValue) || promotion.discountValue}
      />
      <ServiceSelectionDialog
        open={isServiceSelectOpen}
        onOpenChange={setIsServiceSelectOpen}
        onConfirm={handleAddServices}
        excludeServiceIds={selectedServiceIds}
      />
    </>
  )
}
