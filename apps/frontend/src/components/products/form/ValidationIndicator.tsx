/**
 * Componente ValidationIndicator
 * Muestra indicadores visuales de validación en tiempo real
 */

'use client';

import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationIndicatorProps {
    isValid?: boolean;
    isValidating?: boolean;
    message?: string;
    fieldId?: string;
}

export function ValidationIndicator({
    isValid,
    isValidating,
    message,
    fieldId
}: ValidationIndicatorProps) {
    if (isValidating) {
        return (
            <div className="flex items-center space-x-2 mt-1">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" aria-hidden="true" />
                <span className="text-xs text-blue-600">Validando...</span>
            </div>
        );
    }

    if (message) {
        return (
            <div
                id={fieldId}
                className="flex items-center space-x-2 mt-1"
                role="alert"
                aria-live="polite"
            >
                <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                <span className="text-xs text-red-600">{message}</span>
            </div>
        );
    }

    if (isValid) {
        return (
            <div className="flex items-center space-x-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span className="text-xs text-green-600">Válido</span>
            </div>
        );
    }

    return null;
}
