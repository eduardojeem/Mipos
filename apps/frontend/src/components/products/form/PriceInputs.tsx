import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { ValidationIndicator } from '../ProductForm'
import { cn } from '@/lib/utils'

export default function PriceInputs({ register, errors, touchedFields }: any) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor="costPrice" className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4" />
            <span>Precio de Costo *</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Ayuda precio de costo">
                <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Costo de adquisición para cálculo de margen</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Input id="costPrice" type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} placeholder="0.00" className={cn('pr-8', errors.costPrice ? 'border-red-500' : touchedFields.costPrice && !errors.costPrice ? 'border-green-500' : '')} aria-required="true" aria-invalid={!!errors.costPrice} />
          {touchedFields.costPrice && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {errors.costPrice ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          )}
        </div>
        <ValidationIndicator isValid={touchedFields.costPrice && !errors.costPrice} message={errors.costPrice?.message} />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor="price" className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4" />
            <span>Precio de Venta *</span>
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Ayuda precio de venta">
                <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Precio final mostrado al cliente</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Input id="price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} placeholder="0.00" className={cn('pr-8', errors.price ? 'border-red-500' : touchedFields.price && !errors.price ? 'border-green-500' : '')} aria-required="true" aria-invalid={!!errors.price} />
          {touchedFields.price && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {errors.price ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          )}
        </div>
        <ValidationIndicator isValid={touchedFields.price && !errors.price} message={errors.price?.message} />
      </div>
    </div>
  )
}

