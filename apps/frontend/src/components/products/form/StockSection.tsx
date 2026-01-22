/**
 * Componente StockSection
 * Sección de gestión de stock (cantidad actual, mínimo, máximo)
 */

'use client';

import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ValidationIndicator } from './ValidationIndicator';
import { StockStatusIndicator } from './StockStatusIndicator';
import type { FormSectionProps } from '../types/productForm.types';

export function StockSection({ form, isLoading }: FormSectionProps) {
    const { register, formState: { errors, touchedFields }, watch } = form;

    const watchedStock = watch('stock');
    const watchedMinStock = watch('minStock');

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b">
                <Package className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                    Inventario
                </h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Stock Actual */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="stock" className="flex items-center space-x-1">
                            <Package className="h-4 w-4" aria-hidden="true" />
                            <span>Stock Actual *</span>
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Ayuda stock" className="text-muted-foreground">
                                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Cantidad actual disponible en inventario
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <Input
                        id="stock"
                        type="number"
                        step="1"
                        min="0"
                        {...register('stock', { valueAsNumber: true })}
                        placeholder="0"
                        className={cn(
                            errors.stock ? 'border-red-500' :
                                touchedFields.stock && !errors.stock ? 'border-green-500' : ''
                        )}
                        disabled={isLoading}
                        aria-required="true"
                        aria-invalid={!!errors.stock}
                    />

                    <ValidationIndicator
                        isValid={touchedFields.stock && !errors.stock}
                        message={errors.stock?.message}
                    />
                </div>

                {/* Stock Mínimo */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="minStock" className="flex items-center space-x-1">
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            <span>Stock Mínimo *</span>
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Ayuda stock mínimo" className="text-muted-foreground">
                                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Nivel mínimo antes de recibir alertas de reabastecimiento
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <Input
                        id="minStock"
                        type="number"
                        step="1"
                        min="0"
                        {...register('minStock', { valueAsNumber: true })}
                        placeholder="5"
                        className={cn(
                            errors.minStock ? 'border-red-500' :
                                touchedFields.minStock && !errors.minStock ? 'border-green-500' : ''
                        )}
                        disabled={isLoading}
                        aria-required="true"
                        aria-invalid={!!errors.minStock}
                    />

                    <ValidationIndicator
                        isValid={touchedFields.minStock && !errors.minStock}
                        message={errors.minStock?.message}
                    />
                </div>
            </div>

            {/* Indicador de Estado de Stock */}
            {typeof watchedStock === 'number' && typeof watchedMinStock === 'number' && (
                <StockStatusIndicator
                    stock={watchedStock}
                    minStock={watchedMinStock}
                />
            )}

            {/* Advertencia si stock < minStock */}
            {typeof watchedStock === 'number' &&
                typeof watchedMinStock === 'number' &&
                watchedStock < watchedMinStock && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-800">
                                    Stock por debajo del mínimo
                                </p>
                                <p className="text-xs text-yellow-700 mt-1">
                                    El stock actual ({watchedStock}) es menor que el stock mínimo configurado ({watchedMinStock}).
                                    Considere reabastecer este producto pronto.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}
