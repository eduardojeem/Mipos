/**
 * ProductForm - Componente Principal Refactorizado
 * Formulario de productos modular y mantenible
 */

'use client';

import React, { useEffect } from 'react';
import { Package, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { cn } from '@/lib/utils';

// Hooks
import { useProductForm } from './hooks/useProductForm';
import { useImageUpload } from './hooks/useImageUpload';

// Componentes de UI
import { FormProgress } from './form/FormProgress';

// Componentes de Sección
import { BasicInfoSection } from './form/BasicInfoSection';
import { PricingSection } from './form/PricingSection';
import { StockSection } from './form/StockSection';
import { OfferSection } from './form/OfferSection';
import { CosmeticDetailsSection } from './form/CosmeticDetailsSection';
import { ImageUploadSection } from './form/ImageUploadSection';

// Tipos
import type { ProductFormProps } from './types/productForm.types';

// Estilos
import styles from './product-form.module.css';

export default function ProductForm({
    product,
    categories,
    onSubmit,
    onCancel,
    isLoading = false,
    mode = 'create'
}: ProductFormProps) {
    const { ConfirmationDialog } = useConfirmationDialog();

    // Hook principal del formulario
    const {
        form,
        profitMargin,
        completedFields,
        codeValidation,
        lockDenied,
        isLocked,
        ownsLock,
        isBeingEdited,
        editorCount,
        generateProductCode,
        handleFormSubmit,
        handleCancel
    } = useProductForm({
        product,
        mode,
        onSubmit,
        onCancel
    });

    const { watch, setValue } = form;
    const watchedCode = watch('code');

    // Hook de carga de imágenes
    const {
        imageState,
        handleImageUpload,
        setImagePreview,
        removeImage
    } = useImageUpload({
        productCode: watchedCode,
        maxImages: 8,
        maxSizeMB: 5,
        onImagesChange: (images) => {
            setValue('images', images, { shouldValidate: true });
        }
    });

    // Inicializar imágenes si hay producto
    useEffect(() => {
        if (product?.image_url) {
            setImagePreview(product.image_url);
        }
    }, [product?.image_url, setImagePreview]);

    // Atajos de teclado
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                const submitButton = document.getElementById('product-form-submit') as HTMLButtonElement;
                submitButton?.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleCancel]);

    const entityId = product?.id ? String(product.id) : undefined;

    return (
        <div className={styles.productForm}>
            <Card className="w-full max-w-4xl mx-auto rounded-[6px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 justify-center">
                        <Package className="h-5 w-5" />
                        <span className="inline-block text-center font-semibold text-[20px] px-[15px] py-[10px] mb-[15px] transition-all duration-300 hover:brightness-110 text-[#212529]">
                            {mode === 'create' ? 'Registrar Nuevo Producto' : 'Editar Producto'}
                        </span>
                    </CardTitle>

                    {/* Badges de estado */}
                    {mode === 'edit' && entityId && (
                        <div className="mt-2 flex items-center gap-2 justify-center">
                            {isLocked && !ownsLock ? (
                                <Badge variant="destructive">Bloqueado por otro usuario</Badge>
                            ) : (
                                <Badge variant="default">Bloqueo activo</Badge>
                            )}
                            {isBeingEdited && (
                                <Badge variant="outline">{editorCount} en edición</Badge>
                            )}
                        </div>
                    )}
                </CardHeader>

                <CardContent>
                    {/* Barra de progreso */}
                    <FormProgress completedFields={completedFields} totalFields={5} />

                    <TooltipProvider>
                        <form
                            onSubmit={form.handleSubmit(handleFormSubmit)}
                            className="space-y-6"
                            role="form"
                            aria-labelledby="product-form-title"
                            aria-describedby="product-form-description"
                        >
                            {/* Títulos accesibles */}
                            <div className="sr-only">
                                <h2 id="product-form-title">
                                    {product ? 'Editar Producto' : 'Crear Nuevo Producto'}
                                </h2>
                                <p id="product-form-description">
                                    Complete los campos requeridos para {product ? 'actualizar' : 'crear'} el producto
                                </p>
                            </div>

                            {/* Sección: Información Básica */}
                            <div className={styles.sectionCard}>
                                <BasicInfoSection
                                    form={form}
                                    categories={categories}
                                    codeValidation={codeValidation}
                                    onGenerateCode={generateProductCode}
                                    isLoading={isLoading || lockDenied}
                                />
                            </div>

                            {/* Sección: Precios */}
                            <div className={styles.sectionCard}>
                                <PricingSection
                                    form={form}
                                    isLoading={isLoading || lockDenied}
                                />
                            </div>

                            {/* Sección: Stock */}
                            <div className={styles.sectionCard}>
                                <StockSection
                                    form={form}
                                    isLoading={isLoading || lockDenied}
                                />
                            </div>

                            {/* Sección: Ofertas */}
                            <div className={styles.sectionCard}>
                                <OfferSection
                                    form={form}
                                    isLoading={isLoading || lockDenied}
                                />
                            </div>

                            {/* Sección: Imágenes */}
                            <div className={styles.sectionCard}>
                                <ImageUploadSection
                                    imageState={imageState}
                                    onImageUpload={handleImageUpload}
                                    onImageRemove={removeImage}
                                    onPreviewChange={setImagePreview}
                                    isLoading={isLoading || lockDenied}
                                />
                            </div>

                            {/* Sección: Detalles Cosméticos (Colapsable) */}
                            <div className={styles.sectionCard}>
                                <CosmeticDetailsSection
                                    form={form}
                                    isLoading={isLoading || lockDenied}
                                />
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                    className="min-w-[120px]"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancelar
                                </Button>

                                <Button
                                    id="product-form-submit"
                                    type="submit"
                                    disabled={isLoading || lockDenied || imageState.uploading}
                                    className="min-w-[120px]"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
                                </Button>
                            </div>

                            {/* Mensaje de ayuda */}
                            <div className="text-center text-xs text-muted-foreground">
                                <p>Presiona Ctrl+S para guardar o Esc para cancelar</p>
                            </div>
                        </form>
                    </TooltipProvider>
                </CardContent>
            </Card>

            {/* Diálogo de confirmación */}
            <ConfirmationDialog />
        </div>
    );
}

// Re-exportar el esquema para uso externo
export { productSchema, type ProductFormData } from './utils/productFormSchema';
