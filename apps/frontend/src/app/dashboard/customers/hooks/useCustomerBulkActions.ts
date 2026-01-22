import { useState, useCallback } from 'react';
import { customerService } from '@/lib/customer-service';
import type { UICustomer } from '@/types/customer-page';

export interface UseBulkActionsReturn {
    selectedIds: string[];
    selectCustomer: (id: string) => void;
    selectAll: (customers: UICustomer[]) => void;
    clearSelection: () => void;
    bulkActivate: () => Promise<BulkActionResult>;
    bulkDeactivate: () => Promise<BulkActionResult>;
    bulkDelete: () => Promise<BulkActionResult>;
    isProcessing: boolean;
}

export interface BulkActionResult {
    success: boolean;
    successCount: number;
    errorCount: number;
    errors?: string[];
}

/**
 * Hook for managing bulk customer operations.
 * 
 * Features:
 * - Multi-select management
 * - Bulk activate/deactivate
 * - Bulk delete with confirmation
 * - Progress tracking
 * 
 * @example
 * ```tsx
 * const bulk = useCustomerBulkActions();
 * 
 * <Checkbox
 *   checked={bulk.selectedIds.includes(customer.id)}
 *   onCheckedChange={() => bulk.selectCustomer(customer.id)}
 * />
 * 
 * <Button onClick={bulk.bulkActivate}>
 *   Activate {bulk.selectedIds.length} customers
 * </Button>
 * ```
 */
export function useCustomerBulkActions(): UseBulkActionsReturn {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const selectCustomer = useCallback((id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);

    const selectAll = useCallback((customers: UICustomer[]) => {
        setSelectedIds(prev => {
            const allIds = customers.map(c => c.id);
            // Toggle: if all are selected, deselect all. Otherwise, select all.
            return prev.length === allIds.length ? [] : allIds;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const bulkActivate = useCallback(async (): Promise<BulkActionResult> => {
        if (selectedIds.length === 0) {
            return { success: false, successCount: 0, errorCount: 0 };
        }

        setIsProcessing(true);
        const results: { success: boolean; error?: string }[] = [];

        try {
            const promises = selectedIds.map(async (id) => {
                try {
                    const result = await customerService.update(id, { is_active: true });
                    return { success: !result.error, error: result.error };
                } catch (error) {
                    return { success: false, error: (error as Error).message };
                }
            });

            const settled = await Promise.allSettled(promises);

            settled.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({ success: false, error: result.reason.message });
                }
            });

            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');

            clearSelection();

            return {
                success: errorCount === 0,
                successCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            };
        } finally {
            setIsProcessing(false);
        }
    }, [selectedIds, clearSelection]);

    const bulkDeactivate = useCallback(async (): Promise<BulkActionResult> => {
        if (selectedIds.length === 0) {
            return { success: false, successCount: 0, errorCount: 0 };
        }

        setIsProcessing(true);
        const results: { success: boolean; error?: string }[] = [];

        try {
            const promises = selectedIds.map(async (id) => {
                try {
                    const result = await customerService.update(id, { is_active: false });
                    return { success: !result.error, error: result.error };
                } catch (error) {
                    return { success: false, error: (error as Error).message };
                }
            });

            const settled = await Promise.allSettled(promises);

            settled.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({ success: false, error: result.reason.message });
                }
            });

            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');

            clearSelection();

            return {
                success: errorCount === 0,
                successCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            };
        } finally {
            setIsProcessing(false);
        }
    }, [selectedIds, clearSelection]);

    const bulkDelete = useCallback(async (): Promise<BulkActionResult> => {
        if (selectedIds.length === 0) {
            return { success: false, successCount: 0, errorCount: 0 };
        }

        setIsProcessing(true);

        try {
            const result = await customerService.deleteMultiple(selectedIds);

            clearSelection();

            return {
                success: result.success,
                successCount: result.success ? selectedIds.length : 0,
                errorCount: result.success ? 0 : selectedIds.length,
                errors: result.error ? [result.error] : undefined
            };
        } catch (error) {
            return {
                success: false,
                successCount: 0,
                errorCount: selectedIds.length,
                errors: [(error as Error).message]
            };
        } finally {
            setIsProcessing(false);
        }
    }, [selectedIds, clearSelection]);

    return {
        selectedIds,
        selectCustomer,
        selectAll,
        clearSelection,
        bulkActivate,
        bulkDeactivate,
        bulkDelete,
        isProcessing
    };
}
