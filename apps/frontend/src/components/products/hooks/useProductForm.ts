/**
 * Hook principal para el formulario de productos
 * Gestiona el estado del formulario, validaciones y lógica de negocio
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase';
import { useUser } from '@/hooks/use-auth';
import { useStore } from '@/store';
import { temporaryLocks, useTemporaryLock } from '@/lib/sync/temporary-locks';
import { useEditingIndicators } from '@/lib/sync/user-editing-indicators';
import { syncLogger } from '@/lib/sync/sync-logging';
import { productSchema, ProductFormData } from '../utils/productFormSchema';
import type { Product, CodeValidation } from '../types/productForm.types';
import {
    calculateProfitMargin,
    getCompletedFields,
    generateProductCode as generateCode,
    hasUnsavedChanges
} from '../utils/productFormHelpers';

interface UseProductFormOptions {
    product?: Product;
    mode?: 'create' | 'edit';
    onSubmit: (data: ProductFormData) => Promise<void>;
    onCancel: () => void;
}

interface UseProductFormReturn {
    form: UseFormReturn<ProductFormData>;
    profitMargin: number;
    completedFields: number;
    codeValidation: CodeValidation;
    lockDenied: boolean;
    isLocked: boolean;
    ownsLock: boolean;
    isBeingEdited: boolean;
    editorCount: number;
    generateProductCode: () => void;
    handleFormSubmit: (data: ProductFormData) => Promise<void>;
    handleCancel: () => Promise<void>;
}

export function useProductForm({
    product,
    mode = 'create',
    onSubmit,
    onCancel
}: UseProductFormOptions): UseProductFormReturn {
    const user = useUser();
    const clientId = typeof window !== 'undefined' ? (window.navigator?.userAgent || 'client') : 'client';
    const supabase = createClient();

    // Estado
    const [profitMargin, setProfitMargin] = useState<number>(0);
    const [codeValidation, setCodeValidation] = useState<CodeValidation>({
        isValidating: false
    });
    const [lockInitialized, setLockInitialized] = useState(false);
    const [lockDenied, setLockDenied] = useState(false);

    const originalCodeRef = useRef<string | undefined>(product?.sku as any);
    const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Locks y presence
    const entityType = 'products';
    const entityId = product?.id ? String(product.id) : undefined;

    const { lockInfo, isLocked, ownsLock, acquireLock, releaseLock } = useTemporaryLock(
        entityType,
        entityId || 'new'
    );

    const { editingUsers, editorCount, isBeingEdited, startEditing, stopEditing } = useEditingIndicators(
        entityType,
        entityId || 'new'
    );

    // Store
    const setCurrentProductId = useStore(s => s.setCurrentProductId);
    const setFormDataStore = useStore(s => s.setFormData);
    const patchFormDataStore = useStore(s => s.patchFormData);
    const setIsEditingStore = useStore(s => s.setIsEditing);
    const externalFormData = useStore(s => s.formData);

    // Form
    const form = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        mode: 'onChange',
        defaultValues: {
            name: product?.name || '',
            code: (product?.sku as any) || '',
            description: product?.description || '',
            categoryId: (product as any)?.category_id || '',
            price: (product as any)?.sale_price || 0,
            costPrice: (product as any)?.cost_price || 0,
            wholesalePrice: (product as any)?.wholesale_price || 0,
            offerPrice: (product as any)?.offer_price || 0,
            offerActive: !!((product as any)?.offer_price && (product as any).offer_price > 0),
            stock: (product as any)?.stock_quantity || 0,
            minStock: (product as any)?.min_stock || 5,
            images: (product as any)?.images ?? (product?.image_url ? [product.image_url] : []),
            ivaIncluded: !!(product as any)?.iva_included,
            ivaRate: typeof (product as any)?.iva_rate === 'number' ? Number((product as any)?.iva_rate) : 12,
        }
    });

    const { watch, setValue, formState: { touchedFields, dirtyFields }, reset } = form;
    const watchedValues = watch();
    const watchedPrice = watch('price');
    const watchedCostPrice = watch('costPrice');
    const watchedCode = watch('code');
    const watchedOfferActive = watch('offerActive');

    // Calcular margen de ganancia
    useEffect(() => {
        const margin = calculateProfitMargin(watchedPrice, watchedCostPrice);
        setProfitMargin(margin);
    }, [watchedPrice, watchedCostPrice]);

    // Resetear offerPrice cuando offerActive se desactiva
    useEffect(() => {
        if (!watchedOfferActive) {
            setValue('offerPrice', 0);
        }
    }, [watchedOfferActive, setValue]);

    // Sincronizar con store
    useEffect(() => {
        try {
            if (setCurrentProductId) setCurrentProductId(entityId || null);
            if (setFormDataStore) setFormDataStore(watchedValues);
            if (setIsEditingStore) setIsEditingStore(true);
        } catch { }
    }, []);

    const lastPatched = useRef<string>('');
    const isApplyingExternal = useRef(false);

    useEffect(() => {
        try {
            const payload = JSON.stringify(watchedValues);
            const ext = externalFormData ? JSON.stringify(externalFormData) : '';

            if (isApplyingExternal.current) return;
            if (ext && payload === ext) return;
            if (lastPatched.current === payload) return;

            if (patchFormDataStore) patchFormDataStore(watchedValues);
            lastPatched.current = payload;
        } catch { }
    }, [watchedValues, patchFormDataStore, externalFormData]);

    // Aplicar cambios externos
    useEffect(() => {
        if (!externalFormData) return;

        isApplyingExternal.current = true;
        const fields: (keyof ProductFormData)[] = [
            'name', 'code', 'description', 'categoryId', 'price', 'costPrice',
            'wholesalePrice', 'offerPrice', 'offerActive', 'stock', 'minStock', 'images'
        ];

        for (const f of fields) {
            const cur = (watchedValues as any)[f];
            const ext = (externalFormData as any)[f];
            const equal = JSON.stringify(cur) === JSON.stringify(ext);

            if (!equal) {
                setValue(f as any, ext as any, { shouldValidate: false, shouldDirty: false });
            }
        }

        isApplyingExternal.current = false;
    }, [externalFormData, watchedValues, setValue]);

    // Inicializar lock
    useEffect(() => {
        if (mode !== 'edit' || !entityId || lockInitialized) return;

        if (user?.id) {
            const userName = (user as any)?.fullName || (user as any)?.name || user.email || 'Usuario';
            try {
                temporaryLocks.setCurrentUser(user.id, userName, clientId);
            } catch { }
        }

        const init = async () => {
            const timerId = syncLogger.startTimer('product_form_lock_acquire', { entityType, entityId });
            const result = await acquireLock('exclusive');
            syncLogger.endTimer(timerId, { status: result.status });

            if (result.status === 'denied') {
                setLockDenied(true);
                toast.error('Este producto está bloqueado por otro usuario', {
                    description: result.reason || 'Inténtalo más tarde'
                });
                syncLogger.log('warn', 'Lock denegado en ProductForm', { entityType, entityId, reason: result.reason });
            } else {
                setLockDenied(false);
                syncLogger.log('info', 'Lock adquirido en ProductForm', { entityType, entityId });
            }

            setLockInitialized(true);
        };

        init();

        return () => {
            if (entityId) {
                releaseLock().catch(() => { });
            }
        };
    }, [mode, entityId, user?.id, acquireLock, releaseLock]);

    // Presence
    useEffect(() => {
        if (mode !== 'edit' || !entityId || !user?.id) return;

        const userName = (user as any)?.fullName || (user as any)?.name || user.email || 'Usuario';
        startEditing({ userId: user.id, userName });
        syncLogger.log('info', 'Inicio de edición (presence) en ProductForm', { entityType, entityId, userId: user.id });

        return () => {
            stopEditing();
            syncLogger.log('info', 'Fin de edición (presence) en ProductForm', { entityType, entityId, userId: user?.id });
        };
    }, [mode, entityId, user?.id, startEditing, stopEditing]);

    // Validación de código
    useEffect(() => {
        const code = watchedCode?.trim();

        if (!touchedFields.code) {
            setCodeValidation({ isValidating: false });
            return;
        }

        if (!code || code.length < 3) {
            setCodeValidation({ isValidating: false, isValid: undefined });
            return;
        }

        if (originalCodeRef.current && code === originalCodeRef.current) {
            setCodeValidation({ isValidating: false, isValid: true });
            return;
        }

        if (validationTimerRef.current) clearTimeout(validationTimerRef.current);

        validationTimerRef.current = setTimeout(async () => {
            try {
                setCodeValidation({ isValidating: true });

                const { data, error } = await supabase
                    .from('products')
                    .select('id, sku')
                    .eq('sku', code)
                    .eq('is_active', true)
                    .limit(1);

                if (error) {
                    setCodeValidation({
                        isValidating: false,
                        isValid: undefined,
                        message: 'Error validando código'
                    });
                    return;
                }

                const exists = Array.isArray(data) && data.length > 0;
                const sameEntity = exists && !!entityId && (String(data?.[0]?.id) === String(entityId));
                const isUnique = !exists || sameEntity;

                setCodeValidation({
                    isValidating: false,
                    isValid: isUnique,
                    message: isUnique ? undefined : 'Este código ya existe'
                });
            } catch {
                setCodeValidation({
                    isValidating: false,
                    isValid: undefined,
                    message: 'Error de validación'
                });
            }
        }, 400);

        return () => {
            if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
        };
    }, [watchedCode, touchedFields.code, entityId, supabase]);

    // Generar código automático
    const generateProductCode = useCallback(() => {
        const code = generateCode('PRD');
        setValue('code', code);
    }, [setValue]);

    // Submit
    const handleFormSubmit = useCallback(async (data: ProductFormData) => {
        try {
            if (mode === 'edit' && entityId && lockDenied) {
                toast.error('No puedes guardar mientras otro usuario tiene el bloqueo');
                return;
            }

            // Validaciones adicionales
            if (data.price <= data.costPrice) {
                toast.error('El precio de venta debe ser mayor al precio de costo');
                return;
            }

            if (data.stock < data.minStock) {
                toast.warning('El stock actual es menor al stock mínimo configurado');
            }

            if (codeValidation.isValid === false) {
                toast.error('El código del producto ya existe. Por favor, use uno diferente.');
                return;
            }

            await onSubmit(data);

            if (mode === 'create') {
                reset();
                toast.success('Producto creado exitosamente', {
                    description: `${data.name} ha sido registrado en el inventario`
                });
            } else {
                if (entityId) {
                    await releaseLock().catch(() => { });
                    stopEditing();
                }
                toast.success('Producto actualizado exitosamente', {
                    description: `Los cambios en ${data.name} han sido guardados`
                });
            }
        } catch (error: any) {
            console.error('Error en formulario de producto:', error);

            let errorMessage = mode === 'create' ? 'Error al crear el producto' : 'Error al actualizar el producto';
            let errorDescription = 'Por favor, intente nuevamente';

            if (error?.response?.status === 409) {
                errorMessage = 'Código de producto duplicado';
                errorDescription = 'Ya existe un producto con este código';
            } else if (error?.response?.status === 400) {
                errorMessage = 'Datos inválidos';
                errorDescription = 'Verifique que todos los campos estén correctos';
            } else if (error?.message) {
                errorDescription = error.message;
            }

            toast.error(errorMessage, { description: errorDescription });
        }
    }, [mode, entityId, lockDenied, codeValidation, onSubmit, reset, releaseLock, stopEditing]);

    // Cancel
    const handleCancel = useCallback(async () => {
        const hasChanges = hasUnsavedChanges(dirtyFields);

        if (hasChanges) {
            const proceed = window.confirm('Hay cambios sin guardar. ¿Deseas salir sin guardar?');
            if (!proceed) return;
        }

        if (mode === 'edit' && entityId) {
            await releaseLock().catch(() => { });
            stopEditing();
        }

        onCancel();
    }, [dirtyFields, mode, entityId, releaseLock, stopEditing, onCancel]);

    // Calcular campos completados
    const completedFields = getCompletedFields(watchedValues);

    return {
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
    };
}
