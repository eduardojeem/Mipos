/**
 * Componente PricingSection
 * Sección de precios del producto (costo, venta, mayorista, IVA)
 */

'use client';

import React from 'react';
import { DollarSign, TrendingUp, Calculator } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ValidationIndicator } from './ValidationIndicator';
import { ProfitMarginIndicator } from './ProfitMarginIndicator';
import type { FormSectionProps } from '../types/productForm.types';
import { calculateIvaHints, calculateSuggestedPrice } from '../utils/productFormHelpers';
import { useBusinessConfigData } from '@/contexts/BusinessConfigContext';

export function PricingSection({ form, isLoading }: FormSectionProps) {
    const { register, formState: { errors, touchedFields }, watch, setValue } = form;
    const businessConfig = useBusinessConfigData();

    const watchedPrice = watch('price');
    const watchedCostPrice = watch('costPrice');
    const watchedWholesalePrice = watch('wholesalePrice');
    const watchedIvaIncluded = watch('ivaIncluded');
    const watchedIvaRate = watch('ivaRate');

    const ivaHints = React.useMemo(() =>
        calculateIvaHints(watchedPrice, watchedIvaIncluded || false, watchedIvaRate || 0),
        [watchedPrice, watchedIvaIncluded, watchedIvaRate]
    );

    const suggestedPrice = React.useMemo(() => {
        const minMargin = (businessConfig?.config as any)?.pricing?.minMargin ?? 0.15;
        return calculateSuggestedPrice(watchedCostPrice, minMargin);
    }, [watchedCostPrice, businessConfig]);

    const profitMargin = React.useMemo(() => {
        if (!watchedPrice || !watchedCostPrice || watchedCostPrice <= 0) return 0;
        return ((watchedPrice - watchedCostPrice) / watchedPrice) * 100;
    }, [watchedPrice, watchedCostPrice]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                    Precios
                </h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Precio de Costo */}
                <div className="space-y-2">
                    <Label htmlFor="costPrice" className="flex items-center space-x-1">
                        <Calculator className="h-4 w-4" aria-hidden="true" />
                        <span>Precio de Costo *</span>
                    </Label>

                    <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('costPrice', { valueAsNumber: true })}
                        placeholder="0.00"
                        className={cn(
                            errors.costPrice ? 'border-red-500' :
                                touchedFields.costPrice && !errors.costPrice ? 'border-green-500' : ''
                        )}
                        disabled={isLoading}
                        aria-required="true"
                        aria-invalid={!!errors.costPrice}
                    />

                    <ValidationIndicator
                        isValid={touchedFields.costPrice && !errors.costPrice}
                        message={errors.costPrice?.message}
                    />
                </div>

                {/* Precio de Venta */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="price" className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" aria-hidden="true" />
                            <span>Precio de Venta *</span>
                        </Label>
                        {suggestedPrice > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => setValue('price', suggestedPrice, { shouldValidate: true })}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        Sugerido: ${suggestedPrice.toFixed(2)}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Precio sugerido basado en margen mínimo
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...register('price', { valueAsNumber: true })}
                        placeholder="0.00"
                        className={cn(
                            errors.price ? 'border-red-500' :
                                touchedFields.price && !errors.price ? 'border-green-500' : ''
                        )}
                        disabled={isLoading}
                        aria-required="true"
                        aria-invalid={!!errors.price}
                    />

                    <ValidationIndicator
                        isValid={touchedFields.price && !errors.price}
                        message={errors.price?.message}
                    />
                </div>

                {/* Precio Mayorista */}
                <div className="space-y-2">
                    <Label htmlFor="wholesalePrice" className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4" aria-hidden="true" />
                        <span>Precio Mayorista *</span>
                    </Label>

                    <Input
                        id="wholesalePrice"
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...register('wholesalePrice', { valueAsNumber: true })}
                        placeholder="0.00"
                        className={cn(
                            errors.wholesalePrice ? 'border-red-500' :
                                touchedFields.wholesalePrice && !errors.wholesalePrice ? 'border-green-500' : ''
                        )}
                        disabled={isLoading}
                        aria-required="true"
                        aria-invalid={!!errors.wholesalePrice}
                    />

                    <ValidationIndicator
                        isValid={touchedFields.wholesalePrice && !errors.wholesalePrice}
                        message={errors.wholesalePrice?.message}
                    />
                </div>

                {/* IVA */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="ivaIncluded"
                            checked={watchedIvaIncluded}
                            onCheckedChange={(checked) => setValue('ivaIncluded', checked)}
                            disabled={isLoading}
                        />
                        <Label htmlFor="ivaIncluded" className="cursor-pointer">
                            IVA Incluido
                        </Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ivaRate">Tasa de IVA (%)</Label>
                        <Input
                            id="ivaRate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...register('ivaRate', { valueAsNumber: true })}
                            placeholder="12.00"
                            disabled={isLoading}
                        />
                    </div>

                    {watchedPrice > 0 && watchedIvaRate && watchedIvaRate > 0 && (
                        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-gray-50 rounded">
                            <p>Precio con IVA: ${ivaHints.priceWithIva.toFixed(2)}</p>
                            <p>Precio sin IVA: ${ivaHints.priceWithoutIva.toFixed(2)}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Indicador de Margen */}
            {watchedPrice > 0 && watchedCostPrice > 0 && (
                <ProfitMarginIndicator
                    margin={profitMargin}
                    price={watchedPrice}
                    costPrice={watchedCostPrice}
                />
            )}
        </div>
    );
}
