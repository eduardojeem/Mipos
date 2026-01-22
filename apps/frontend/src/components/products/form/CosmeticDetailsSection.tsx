/**
 * Componente CosmeticDetailsSection
 * Sección de detalles específicos para productos cosméticos
 */

'use client';

import React from 'react';
import { Sparkles, Droplet, Sun, Star } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from '../types/productForm.types';

export function CosmeticDetailsSection({ form, isLoading }: FormSectionProps) {
    const { register, watch, setValue } = form;
    const [isOpen, setIsOpen] = React.useState(false);

    const watchedVegan = watch('vegan');
    const watchedCrueltyFree = watch('cruelty_free');
    const watchedWaterproof = watch('waterproof');

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="space-y-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 hover:bg-pink-100 transition-colors">
                    <div className="flex items-center space-x-2">
                        <Sparkles className="h-5 w-5 text-pink-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Detalles Cosméticos
                        </h3>
                        <span className="text-xs text-gray-500">(Opcional)</span>
                    </div>
                    <ChevronDown
                        className={cn(
                            "h-5 w-5 text-gray-600 transition-transform",
                            isOpen && "transform rotate-180"
                        )}
                    />
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-6 animate-in slide-in-from-top-2">
                    <div className="grid gap-6 md:grid-cols-2 p-4 bg-white rounded-lg border">
                        {/* Marca */}
                        <div className="space-y-2">
                            <Label htmlFor="brand" className="flex items-center space-x-1">
                                <Star className="h-4 w-4" aria-hidden="true" />
                                <span>Marca</span>
                            </Label>
                            <Input
                                id="brand"
                                {...register('brand')}
                                placeholder="Ej: L'Oréal, Maybelline"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Tono/Shade */}
                        <div className="space-y-2">
                            <Label htmlFor="shade" className="flex items-center space-x-1">
                                <Droplet className="h-4 w-4" aria-hidden="true" />
                                <span>Tono/Shade</span>
                            </Label>
                            <Input
                                id="shade"
                                {...register('shade')}
                                placeholder="Ej: Nude, Beige, Natural"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Tipo de Piel */}
                        <div className="space-y-2">
                            <Label htmlFor="skin_type">Tipo de Piel</Label>
                            <Input
                                id="skin_type"
                                {...register('skin_type')}
                                placeholder="Ej: Grasa, Seca, Mixta"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Volumen */}
                        <div className="space-y-2">
                            <Label htmlFor="volume">Volumen/Tamaño</Label>
                            <Input
                                id="volume"
                                {...register('volume')}
                                placeholder="Ej: 50ml, 100g"
                                disabled={isLoading}
                            />
                        </div>

                        {/* SPF */}
                        <div className="space-y-2">
                            <Label htmlFor="spf" className="flex items-center space-x-1">
                                <Sun className="h-4 w-4" aria-hidden="true" />
                                <span>SPF</span>
                            </Label>
                            <Input
                                id="spf"
                                type="number"
                                min="0"
                                max="100"
                                {...register('spf', { valueAsNumber: true })}
                                placeholder="Ej: 30, 50"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Acabado */}
                        <div className="space-y-2">
                            <Label htmlFor="finish">Acabado</Label>
                            <Input
                                id="finish"
                                {...register('finish')}
                                placeholder="Ej: Mate, Brillante, Satinado"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Cobertura */}
                        <div className="space-y-2">
                            <Label htmlFor="coverage">Cobertura</Label>
                            <Input
                                id="coverage"
                                {...register('coverage')}
                                placeholder="Ej: Ligera, Media, Completa"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Fecha de Expiración */}
                        <div className="space-y-2">
                            <Label htmlFor="expiration_date">Fecha de Expiración</Label>
                            <Input
                                id="expiration_date"
                                type="date"
                                {...register('expiration_date')}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Ingredientes */}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="ingredients">Ingredientes</Label>
                            <Textarea
                                id="ingredients"
                                {...register('ingredients')}
                                placeholder="Lista de ingredientes principales..."
                                rows={3}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Características Especiales */}
                        <div className="space-y-4 md:col-span-2">
                            <Label className="text-sm font-medium">Características Especiales</Label>

                            <div className="grid gap-4 md:grid-cols-3">
                                {/* Vegano */}
                                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <Switch
                                        id="vegan"
                                        checked={watchedVegan}
                                        onCheckedChange={(checked) => setValue('vegan', checked)}
                                        disabled={isLoading}
                                    />
                                    <Label htmlFor="vegan" className="cursor-pointer flex items-center space-x-1">
                                        <span>🌱</span>
                                        <span>Vegano</span>
                                    </Label>
                                </div>

                                {/* Cruelty Free */}
                                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <Switch
                                        id="cruelty_free"
                                        checked={watchedCrueltyFree}
                                        onCheckedChange={(checked) => setValue('cruelty_free', checked)}
                                        disabled={isLoading}
                                    />
                                    <Label htmlFor="cruelty_free" className="cursor-pointer flex items-center space-x-1">
                                        <span>🐰</span>
                                        <span>Cruelty Free</span>
                                    </Label>
                                </div>

                                {/* Waterproof */}
                                <div className="flex items-center space-x-2 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                                    <Switch
                                        id="waterproof"
                                        checked={watchedWaterproof}
                                        onCheckedChange={(checked) => setValue('waterproof', checked)}
                                        disabled={isLoading}
                                    />
                                    <Label htmlFor="waterproof" className="cursor-pointer flex items-center space-x-1">
                                        <span>💧</span>
                                        <span>Waterproof</span>
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
