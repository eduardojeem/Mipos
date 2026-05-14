'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ImagePlus, Link as LinkIcon, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { FormProgress } from './form/FormProgress';
import { ValidationIndicator } from './form/ValidationIndicator';
import { useProductForm } from './hooks/useProductForm';
import type { ProductFormProps } from './types/productForm.types';

function formatMargin(margin: number): string {
  return `${margin.toFixed(2)}%`;
}

export { ValidationIndicator } from './form/ValidationIndicator';

export default function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: ProductFormProps) {
  const [imageInput, setImageInput] = useState('');
  const {
    form,
    profitMargin,
    completedFields,
    codeValidation,
    lockDenied,
    ownsLock,
    isBeingEdited,
    editorCount,
    generateProductCode,
    handleFormSubmit,
    handleCancel,
  } = useProductForm({
    product,
    mode,
    onSubmit,
    onCancel,
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = form;

  const images = watch('images') ?? [];
  const price = watch('price') || 0;
  const costPrice = watch('costPrice') || 0;
  const offerActive = !!watch('offerActive');
  const offerPrice = watch('offerPrice') || 0;
  const ivaIncluded = !!watch('ivaIncluded');
  const ivaRate = watch('ivaRate') || 0;

  const discountPercentage = useMemo(() => {
    if (!offerActive || !price || !offerPrice || offerPrice >= price) {
      return 0;
    }

    return ((price - offerPrice) / price) * 100;
  }, [offerActive, offerPrice, price]);

  const addImage = () => {
    const trimmed = imageInput.trim();
    if (!trimmed) return;
    if (images.includes(trimmed)) {
      setImageInput('');
      return;
    }

    setValue('images', [...images, trimmed], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setImageInput('');
  };

  const removeImage = (url: string) => {
    setValue(
      'images',
      images.filter((image) => image !== url),
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      <FormProgress completedFields={completedFields} totalFields={5} />

      {lockDenied && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Este producto está siendo editado por otro usuario. Podés revisarlo, pero no guardar cambios.
          </AlertDescription>
        </Alert>
      )}

      {!lockDenied && mode === 'edit' && (ownsLock || isBeingEdited) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {ownsLock
              ? 'Tenés el bloqueo de edición activo para este producto.'
              : `Hay ${editorCount} usuario(s) viendo o editando este producto ahora mismo.`}
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Información básica</h3>
          <Badge variant="outline">{mode === 'edit' ? 'Edición' : 'Nuevo producto'}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del producto</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Shampoo reparador"
              disabled={isLoading}
            />
            <ValidationIndicator
              isValid={!!touchedFields.name && !errors.name}
              message={errors.name?.message}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="code">Código / SKU</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateProductCode}
                disabled={isLoading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generar
              </Button>
            </div>
            <Input
              id="code"
              {...register('code')}
              placeholder="PRD123456"
              disabled={isLoading}
            />
            <ValidationIndicator
              isValid={!!touchedFields.code && !errors.code && codeValidation.isValid}
              isValidating={codeValidation.isValidating}
              message={errors.code?.message || codeValidation.message}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detalles útiles para venta, depósito o catálogo"
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="categoryId">Categoría</Label>
            <select
              id="categoryId"
              {...register('categoryId')}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <ValidationIndicator
              isValid={!!touchedFields.categoryId && !errors.categoryId}
              message={errors.categoryId?.message}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Precios</h3>
          <Badge variant={profitMargin >= 15 ? 'default' : 'secondary'}>
            Margen {formatMargin(profitMargin)}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="costPrice">Precio de costo</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              {...register('costPrice', { valueAsNumber: true })}
              disabled={isLoading}
            />
            <ValidationIndicator
              isValid={!!touchedFields.costPrice && !errors.costPrice}
              message={errors.costPrice?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio de venta</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              disabled={isLoading}
            />
            <ValidationIndicator
              isValid={!!touchedFields.price && !errors.price}
              message={errors.price?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wholesalePrice">Precio mayorista</Label>
            <Input
              id="wholesalePrice"
              type="number"
              step="0.01"
              {...register('wholesalePrice', { valueAsNumber: true })}
              disabled={isLoading}
            />
            <ValidationIndicator
              isValid={!!touchedFields.wholesalePrice && !errors.wholesalePrice}
              message={errors.wholesalePrice?.message}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="offerActive">Oferta activa</Label>
              <Switch
                id="offerActive"
                checked={offerActive}
                onCheckedChange={(checked) =>
                  setValue('offerActive', checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                disabled={isLoading}
              />
            </div>

            {offerActive ? (
              <div className="space-y-2">
                <Input
                  id="offerPrice"
                  type="number"
                  step="0.01"
                  {...register('offerPrice', { valueAsNumber: true })}
                  disabled={isLoading}
                  placeholder="Precio promocional"
                />
                <ValidationIndicator
                  isValid={!!touchedFields.offerPrice && !errors.offerPrice}
                  message={errors.offerPrice?.message}
                />
                {discountPercentage > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Descuento estimado: {discountPercentage.toFixed(1)}%
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Activá una oferta si querés guardar un precio promocional.
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <Label htmlFor="ivaIncluded">IVA incluido</Label>
              <Switch
                id="ivaIncluded"
                checked={ivaIncluded}
                onCheckedChange={(checked) =>
                  setValue('ivaIncluded', checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ivaRate">Tasa IVA (%)</Label>
              <Input
                id="ivaRate"
                type="number"
                step="0.01"
                {...register('ivaRate', { valueAsNumber: true })}
                disabled={isLoading}
              />
              <ValidationIndicator
                isValid={!!touchedFields.ivaRate && !errors.ivaRate}
                message={errors.ivaRate?.message}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>Venta: {formatCurrency(price)}</p>
          <p>Costo: {formatCurrency(costPrice)}</p>
          <p>IVA: {ivaIncluded ? `incluido (${ivaRate}%)` : `no incluido (${ivaRate}%)`}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Inventario</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stock">Stock actual</Label>
            <Input
              id="stock"
              type="number"
              {...register('stock', { valueAsNumber: true })}
              disabled={isLoading}
            />
            <ValidationIndicator
              isValid={!!touchedFields.stock && !errors.stock}
              message={errors.stock?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minStock">Stock mínimo</Label>
            <Input
              id="minStock"
              type="number"
              {...register('minStock', { valueAsNumber: true })}
              disabled={isLoading}
            />
            <ValidationIndicator
              isValid={!!touchedFields.minStock && !errors.minStock}
              message={errors.minStock?.message}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Imágenes</h3>
          <Badge variant="outline">{images.length} cargadas</Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-2">
            <Label htmlFor="imageUrl">URL de imagen</Label>
            <Input
              id="imageUrl"
              value={imageInput}
              onChange={(event) => setImageInput(event.target.value)}
              placeholder="https://..."
              disabled={isLoading}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={addImage} disabled={isLoading || !imageInput.trim()}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Agregar imagen
            </Button>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="space-y-2">
            {images.map((image, index) => (
              <div key={image} className="flex items-center gap-2 rounded-md border p-3">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{image}</span>
                {index === 0 && <Badge>Principal</Badge>}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeImage(image)}
                  disabled={isLoading}
                >
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Si no agregás imágenes, el producto se guarda igual y usa `image_url` vacío.
          </p>
        )}
      </section>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => void handleCancel()} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || lockDenied}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            mode === 'edit' ? 'Guardar cambios' : 'Crear producto'
          )}
        </Button>
      </div>
    </form>
  );
}
