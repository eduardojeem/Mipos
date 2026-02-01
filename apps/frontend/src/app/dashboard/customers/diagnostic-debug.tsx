'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerSummary, useCustomerList } from '@/hooks/useOptimizedCustomers';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

/**
 * Diagnostic Component for Customer Data Issues
 * 
 * Add this component to the customers page temporarily to debug data loading:
 * import { CustomerDiagnostic } from './diagnostic-debug';
 * <CustomerDiagnostic />
 */
export function CustomerDiagnostic() {
    const summaryQuery = useCustomerSummary();
    const listQuery = useCustomerList({});

    // Get organization ID from localStorage
    const getOrgId = () => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem('selected_organization');
            if (!raw) return null;
            if (raw.startsWith('{')) {
                const parsed = JSON.parse(raw);
                return parsed?.id || parsed?.organization_id || null;
            }
            return raw;
        } catch {
            return null;
        }
    };

    const orgId = getOrgId();

    return (
        <Card className="mb-6 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    Diagnóstico de Clientes (Modo Debug)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Organization ID Status */}
                <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                        {orgId ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        Organization ID
                    </h3>
                    {orgId ? (
                        <p className="text-sm font-mono bg-white dark:bg-gray-900 p-2 rounded">
                            {orgId}
                        </p>
                    ) : (
                        <p className="text-sm text-red-600">
                            ⚠️ No hay organization_id en localStorage. Esto impedirá que las APIs funcionen.
                        </p>
                    )}
                </div>

                {/* Summary Query Status */}
                <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                        {summaryQuery.isSuccess ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : summaryQuery.isError ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                        )}
                        Customer Summary Query
                    </h3>
                    <div className="text-sm space-y-1">
                        <p>Estado: <span className="font-mono">{summaryQuery.status}</span></p>
                        <p>Loading: {summaryQuery.isLoading ? '✓' : '✗'}</p>
                        <p>Error: {summaryQuery.isError ? '✓' : '✗'}</p>
                        {summaryQuery.isError && (
                            <pre className="bg-red-100 dark:bg-red-900 p-2 rounded text-xs overflow-auto">
                                {JSON.stringify(summaryQuery.error, null, 2)}
                            </pre>
                        )}
                        {summaryQuery.isSuccess && (
                            <pre className="bg-green-100 dark:bg-green-900 p-2 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(summaryQuery.data, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>

                {/* List Query Status */}
                <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                        {listQuery.isSuccess ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : listQuery.isError ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                        )}
                        Customer List Query
                    </h3>
                    <div className="text-sm space-y-1">
                        <p>Estado: <span className="font-mono">{listQuery.status}</span></p>
                        <p>Loading: {listQuery.isLoading ? '✓' : '✗'}</p>
                        <p>Error: {listQuery.isError ? '✓' : '✗'}</p>
                        {listQuery.isError && (
                            <pre className="bg-red-100 dark:bg-red-900 p-2 rounded text-xs overflow-auto">
                                {JSON.stringify(listQuery.error, null, 2)}
                            </pre>
                        )}
                        {listQuery.isSuccess && (
                            <div className="space-y-2">
                                <p>
                                    Clientes encontrados:{' '}
                                    <span className="font-semibold">{listQuery.data?.customers?.length || 0}</span>
                                </p>
                                <pre className="bg-green-100 dark:bg-green-900 p-2 rounded text-xs overflow-auto max-h-40">
                                    {JSON.stringify(listQuery.data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded">
                    <p className="text-sm font-semibold mb-2">📋 Instrucciones:</p>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                        <li>Verifica que el Organization ID esté presente arriba</li>
                        <li>Revisa el estado de las queries (success/error)</li>
                        <li>Si hay errores, lee el mensaje de error detallado</li>
                        <li>Si las queries son exitosas pero no hay clientes, verifica la base de datos</li>
                        <li>Abre la consola del navegador (F12) para más detalles</li>
                    </ol>
                </div>
            </CardContent>
        </Card>
    );
}
