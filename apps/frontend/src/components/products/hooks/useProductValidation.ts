/**
 * Hook para validación en tiempo real del formulario
 * Proporciona indicadores visuales y mensajes de validación
 */

'use client';

import { useMemo } from 'react';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import type { ProductFormData } from '../utils/productFormSchema';

interface ValidationStatus {
    isValid: boolean;
    isInvalid: boolean;
    isTouched: boolean;
    message?: string;
}

interface UseProductValidationReturn {
    getFieldValidation: (fieldName: keyof ProductFormData) => ValidationStatus;
    hasErrors: boolean;
    errorCount: number;
    touchedCount: number;
    validCount: number;
}

export function useProductValidation(
    form: UseFormReturn<ProductFormData>
): UseProductValidationReturn {
    const { formState: { errors, touchedFields } } = form;

    /**
     * Obtiene el estado de validación de un campo específico
     */
    const getFieldValidation = (fieldName: keyof ProductFormData): ValidationStatus => {
        const error = errors[fieldName];
        const touched = touchedFields[fieldName];

        return {
            isValid: !!touched && !error,
            isInvalid: !!error,
            isTouched: !!touched,
            message: error?.message as string | undefined
        };
    };

    /**
     * Indica si hay errores en el formulario
     */
    const hasErrors = useMemo(() => {
        return Object.keys(errors).length > 0;
    }, [errors]);

    /**
     * Cuenta el número de errores
     */
    const errorCount = useMemo(() => {
        return Object.keys(errors).length;
    }, [errors]);

    /**
     * Cuenta el número de campos tocados
     */
    const touchedCount = useMemo(() => {
        return Object.keys(touchedFields).length;
    }, [touchedFields]);

    /**
     * Cuenta el número de campos válidos (tocados y sin errores)
     */
    const validCount = useMemo(() => {
        return Object.keys(touchedFields).filter(
            field => !errors[field as keyof ProductFormData]
        ).length;
    }, [touchedFields, errors]);

    return {
        getFieldValidation,
        hasErrors,
        errorCount,
        touchedCount,
        validCount
    };
}
