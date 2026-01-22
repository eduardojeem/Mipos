/**
 * Componente BasicInfoSection
 * Sección de información básica del producto (nombre, código, descripción, categoría)
 */

'use client';

import React from 'react';
import { Tag, Hash, FileText, Package, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ValidationIndicator } from './ValidationIndicator';
import SearchWithAutocomplete from '@/components/pos/SearchWithAutocomplete';
import type { FormSectionWithCategoriesProps, CodeValidation } from '../types/productForm.types';

interface BasicInfoSectionProps extends FormSectionWithCategoriesProps {
    codeValidation: CodeValidation;
    onGenerateCode: () => void;
}

export function BasicInfoSection({
    form,
    categories,
    codeValidation,
    onGenerateCode,
    isLoading
}: BasicInfoSectionProps) {
    const { register, formState: { errors, touchedFields }, setValue, watch } = form;

    const [categoryQuery, setCategoryQuery] = React.useState('');

    const categoriesForAutocomplete = React.useMemo(() => (
        categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: (c as any).description,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }))
    ), [categories]);

    const selectedCategoryId = watch('categoryId');

    React.useEffect(() => {
        if (selectedCategoryId) {
            const selected = categoriesForAutocomplete.find(c => c.id === selectedCategoryId);
            if (selected) setCategoryQuery(selected.name);
        }
    }, [selectedCategoryId, categoriesForAutocomplete]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                    Información Básica
                </h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Nombre del Producto */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="name" className="flex items-center space-x-1">
                            <Tag className="h-4 w-4" aria-hidden="true" />
                            <span>Nombre del Producto *</span>
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Ayuda nombre" className="text-muted-foreground">
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Nombre visible en el catálogo y punto de venta
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <Input
                        id="name"
                        {...register('name')}
                        placeholder="Ej: Laptop Dell Inspiron 15"
                        className={cn(
                            errors.name ? 'border-red-500' :
                                touchedFields.name && !errors.name ? 'border-green-500' : ''
                        )}
                        disabled={isLoading}
                        aria-required="true"
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                    />

                    <ValidationIndicator
                        isValid={touchedFields.name && !errors.name}
                        message={errors.name?.message}
                        fieldId="name-error"
                    />
                </div>

                {/* Código del Producto */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="code" className="flex items-center space-x-1">
                            <Hash className="h-4 w-4" aria-hidden="true" />
                            <span>Código del Producto *</span>
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Ayuda código" className="text-muted-foreground">
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Código único para identificar el producto (SKU)
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            id="code"
                            {...register('code')}
                            placeholder="Ej: PRD123456"
                            className={cn(
                                'flex-1',
                                errors.code || codeValidation.isValid === false ? 'border-red-500' :
                                    touchedFields.code && !errors.code && codeValidation.isValid ? 'border-green-500' : ''
                            )}
                            disabled={isLoading}
                            aria-required="true"
                            aria-invalid={!!errors.code || codeValidation.isValid === false}
                            aria-describedby={errors.code ? 'code-error' : undefined}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onGenerateCode}
                            disabled={isLoading}
                            aria-label="Generar código automático"
                        >
                            <Sparkles className="h-4 w-4" />
                        </Button>
                    </div>

                    <ValidationIndicator
                        isValid={touchedFields.code && !errors.code && codeValidation.isValid}
                        isValidating={codeValidation.isValidating}
                        message={errors.code?.message || codeValidation.message}
                        fieldId="code-error"
                    />
                </div>

                {/* Descripción */}
                <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="description" className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            <span>Descripción</span>
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Ayuda descripción" className="text-muted-foreground">
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Descripción detallada del producto (opcional)
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <Textarea
                        id="description"
                        {...register('description')}
                        placeholder="Descripción detallada del producto..."
                        rows={3}
                        disabled={isLoading}
                        aria-describedby="description-help"
                    />

                    <p id="description-help" className="text-xs text-muted-foreground">
                        Agregue detalles adicionales sobre el producto
                    </p>
                </div>

                {/* Categoría */}
                <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="categoryId" className="flex items-center space-x-1">
                            <Package className="h-4 w-4" aria-hidden="true" />
                            <span>Categoría *</span>
                        </Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Ayuda categoría" className="text-muted-foreground">
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Categoría a la que pertenece el producto
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <SearchWithAutocomplete
                        products={[]}
                        categories={categories as any}
                        value={categoryQuery}
                        onChange={setCategoryQuery}
                        onCategorySelect={(categoryId) => {
                            setValue('categoryId', categoryId, { shouldValidate: true });
                            const selected = categoriesForAutocomplete.find(c => c.id === categoryId);
                            if (selected) setCategoryQuery(selected.name);
                        }}
                        placeholder="Buscar categoría..."
                        className={cn(
                            errors.categoryId ? 'border-red-500' :
                                touchedFields.categoryId && !errors.categoryId ? 'border-green-500' : ''
                        )}
                    />

                    <ValidationIndicator
                        isValid={touchedFields.categoryId && !errors.categoryId}
                        message={errors.categoryId?.message}
                        fieldId="categoryId-error"
                    />
                </div>
            </div>
        </div>
    );
}
