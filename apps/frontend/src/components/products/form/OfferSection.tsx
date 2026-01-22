/**
 * Componente OfferSection
 * Sección de ofertas y promociones
 */

'use client';

import React from 'react';
import { Tag, Percent } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ValidationIndicator } from './ValidationIndicator';
import type { FormSectionProps } from '../types/productForm.types';

export function OfferSection({ form, isLoading }: FormSectionProps) {
    const { register, formState: { errors, touchedFields }, watch, setValue } = form;

    const watchedOfferActive = watch('offerActive');
    const watchedOfferPrice = watch('offerPrice') || 0;
    const watchedPrice = watch('price') || 0;

    const discountPercentage = React.useMemo(() => {
        if (!watchedPrice || !watchedOfferPrice || watchedOfferPrice >= watchedPrice) return 0;
        return ((watchedPrice - watchedOfferPrice) / watchedPrice) * 100;
    }, [watchedPrice, watchedOfferPrice]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Ofertas y Promociones
                    </h3>
                </div>
                {watchedOfferActive && (
                    <Badge variant="default" className="bg-orange-500">
                        Oferta Activa
                    </Badge>
                )}
            </div>

            {/* Activar Oferta */}
            <div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Switch
                    id="offerActive"
                    checked={watchedOfferActive}
                    onCheckedChange={(checked) => {
                        setValue('offerActive', checked);
                        if (!checked) {
                            setValue('offerPrice', 0);
                        }
                    }}
                    disabled={isLoading}
                />
                <Label htmlFor="offerActive" className="cursor-pointer font-medium">
                    Activar precio de oferta
                </Label>
            </div>

            {/* Precio de Oferta */}
            {watchedOfferActive && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="space-y-2">
                        <Label htmlFor="offerPrice" className="flex items-center space-x-1">
                            <Percent className="h-4 w-4" aria-hidden="true" />
                            <span>Precio de Oferta *</span>
                        </Label>

                        <Input
                            id="offerPrice"
                            type="number"
                            step="0.01"
                            min="0.01"
                            {...register('offerPrice', { valueAsNumber: true })}
                            placeholder="0.00"
                            className={cn(
                                errors.offerPrice ? 'border-red-500' :
                                    touchedFields.offerPrice && !errors.offerPrice ? 'border-green-500' : ''
                            )}
                            disabled={isLoading}
                            aria-required={watchedOfferActive}
                            aria-invalid={!!errors.offerPrice}
                        />

                        <ValidationIndicator
                            isValid={touchedFields.offerPrice && !errors.offerPrice}
                            message={errors.offerPrice?.message}
                        />
                    </div>

                    {/* Información de Descuento */}
                    {watchedPrice > 0 && watchedOfferPrice > 0 && watchedOfferPrice < watchedPrice && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-800">
                                        Descuento aplicado
                                    </p>
                                    <p className="text-xs text-green-700 mt-1">
                                        Ahorro: ${(watchedPrice - watchedOfferPrice).toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-700">
                                        {discountPercentage.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-green-600">
                                        de descuento
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advertencia si offerPrice >= price */}
                    {watchedOfferPrice >= watchedPrice && watchedPrice > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-red-800">
                                El precio de oferta debe ser menor al precio de venta regular
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Mensaje cuando no hay oferta */}
            {!watchedOfferActive && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                        Active el precio de oferta para crear una promoción especial para este producto.
                    </p>
                </div>
            )}
        </div>
    );
}
