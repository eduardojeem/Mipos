/**
 * Componente FormProgress
 * Muestra el progreso de completado del formulario
 */

'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';

interface FormProgressProps {
    completedFields: number;
    totalFields: number;
}

export function FormProgress({ completedFields, totalFields }: FormProgressProps) {
    const percentage = Math.round((completedFields / totalFields) * 100);
    const isComplete = completedFields === totalFields;

    return (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <CheckCircle
                        className={`h-5 w-5 ${isComplete ? 'text-green-600' : 'text-blue-600'}`}
                        aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        Progreso del formulario
                    </span>
                </div>
                <span className="text-sm font-semibold text-blue-700">
                    {completedFields} de {totalFields} campos
                </span>
            </div>

            <Progress
                value={percentage}
                className="h-2"
                aria-label={`Progreso del formulario: ${percentage}%`}
            />

            <p className="mt-2 text-xs text-gray-600">
                {isComplete
                    ? '¡Todos los campos requeridos están completos!'
                    : 'Complete los campos requeridos para continuar'}
            </p>
        </div>
    );
}
