import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Package, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { ValidationIndicator } from '../ProductForm'
import { cn } from '@/lib/utils'

export default function StockInputs({ register, errors, touchedFields }: any) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor="stock" className="flex items-center space-x-1">
            <Package className="h-4 w-4" />
            <span>Stock Actual *</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Ayuda stock actual">
                <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Unidades disponibles actualmente</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Input id="stock" type="number" {...register('stock', { valueAsNumber: true })} placeholder="0" className={cn('pr-8', errors.stock ? 'border-red-500' : touchedFields.stock && !errors.stock ? 'border-green-500' : '')} aria-required="true" aria-invalid={!!errors.stock} />
          {touchedFields.stock && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {errors.stock ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          )}
        </div>
        <ValidationIndicator isValid={touchedFields.stock && !errors.stock} message={errors.stock?.message} />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor="minStock" className="flex items-center space-x-1">
            <AlertCircle className="h-4 w-4" />
            <span>Stock Mínimo *</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Ayuda stock mínimo">
                <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Umbral para alertas de reabastecimiento</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Input id="minStock" type="number" {...register('minStock', { valueAsNumber: true })} placeholder="5" className={cn('pr-8', errors.minStock ? 'border-red-500' : touchedFields.minStock && !errors.minStock ? 'border-green-500' : '')} aria-required="true" aria-invalid={!!errors.minStock} />
          {touchedFields.minStock && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {errors.minStock ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          )}
        </div>
        <ValidationIndicator isValid={touchedFields.minStock && !errors.minStock} message={errors.minStock?.message} />
      </div>

      <div />
    </div>
  )
}

