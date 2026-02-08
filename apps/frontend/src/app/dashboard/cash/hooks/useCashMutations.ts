import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import api from '@/lib/api';
import { triggerCashSaasSync } from '@/lib/sync/cash-saas';
import type { CashSession } from '@/types/cash';
import type { CashMutationPayload, CashSummary, LoadingStates } from '../types/cash.types';
import {
    MOVEMENT_TYPES,
    MOVEMENT_DIRECTION,
    validateMovementAmount,
    normalizeMovementAmount
} from '../movements/utils/movementCalculations';

interface UseCashMutationsOptions {
    session: CashSession | null;
    summary: CashSummary;
    onSuccess?: () => void;
}

interface UseCashMutationsReturn {
    loadingStates: LoadingStates;
    handleOpenSession: (amount: number, notes?: string) => void;
    requestCloseSession: (amount: number) => void;
    requestRegisterMovement: (payload: CashMutationPayload) => void;
    ConfirmationDialog: () => React.JSX.Element;
}

/**
 * Hook for cash mutations (open, close, register movement)
 * Handles all mutation logic with confirmations and validations
 */
export function useCashMutations(options: UseCashMutationsOptions): UseCashMutationsReturn {
    const { session, summary, onSuccess } = options;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
    const fmtCurrency = useCurrencyFormatter();

    const [loadingStates, setLoadingStates] = useState<LoadingStates>({
        openingSession: false,
        closingSession: false,
        registeringMovement: false,
        fetchingData: false,
    });

    // Open session mutation
    const openSessionMutation = useMutation({
        mutationFn: async ({ amount, notes }: { amount: number; notes?: string }) => {
            const res = await api.post('/cash/session/open', {
                openingAmount: amount,
                notes: (notes || 'Apertura de caja').slice(0, 200),
            });
            return res.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['cashSession'] });
            onSuccess?.();
        },
    });

    // Close session mutation
    const closeSessionMutation = useMutation({
        mutationFn: async (amount: number) => {
            const res = await api.post('/cash/session/close', {
                closingAmount: amount,
                notes: 'Cierre de caja',
            });
            return res.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['cashSession'] });
            onSuccess?.();
        },
    });

    // Register movement mutation
    const registerMovementMutation = useMutation({
        mutationFn: async ({ amount, type, reason }: { amount: number; type: string; reason?: string }) => {
            const res = await api.post('/cash/movements', {
                sessionId: session!.id,
                type,
                amount,
                reason,
            });
            return res.data;
        },
        onSuccess: async () => {
            // Invalidate and refetch to ensure UI updates
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['cashMovements', session?.id] }),
                queryClient.invalidateQueries({ queryKey: ['cashSession'] }),
            ]);
            // Force refetch
            await queryClient.refetchQueries({ queryKey: ['cashMovements', session?.id] });
            onSuccess?.();
        },
    });

    // Open session handler
    const performOpenSession = useCallback(
        async (amount: number, notes?: string) => {
            try {
                setLoadingStates((prev) => ({ ...prev, openingSession: true }));
                if (amount < 0) throw new Error('El monto debe ser positivo');
                if (amount > 1000000) throw new Error('Monto de apertura demasiado alto');
                await openSessionMutation.mutateAsync({ amount, notes });
                toast({ description: 'Sesión de caja abierta exitosamente' });
                // Disparar sincronización SaaS con payload
                triggerCashSaasSync('open', { amount, notes, createdAt: new Date().toISOString() });
            } catch (e: unknown) {
                const error = e as any;
                console.error('Error opening session:', error);
                const status = error?.response?.status;
                const srv = error?.response?.data || {};
                const msg = srv?.error || srv?.message || error?.message || 'Error abriendo sesión';
                const details = srv?.details;

                if (status === 400 && (msg?.toLowerCase?.().includes('organization') || msg?.toLowerCase?.().includes('header'))) {
                    toast({ description: 'Falta seleccionar organización. Ve al selector de organización y elige una antes de abrir caja.', variant: 'destructive' });
                }
                if (status === 403 && (msg?.toLowerCase?.().includes('rls') || msg?.toLowerCase?.().includes('permission'))) {
                    showConfirmation({
                        title: 'Permiso denegado por RLS',
                        description: 'Tu usuario no tiene permisos para insertar en cash_sessions según las políticas RLS.',
                        confirmText: 'Entendido',
                        cancelText: 'Cerrar',
                        variant: 'info',
                        onConfirm: () => { },
                    });
                } else {
                    const text = details ? `${msg}: ${details}` : msg;
                    toast({ description: text, variant: 'destructive' });
                }
            } finally {
                setLoadingStates((prev) => ({ ...prev, openingSession: false }));
            }
        },
        [openSessionMutation, toast, showConfirmation]
    );

    const handleOpenSession = useCallback(
        (amount: number, notes?: string) => {
            showConfirmation({
                title: 'Confirmar apertura de caja',
                description: `Se abrirá la sesión con monto inicial: ${fmtCurrency(amount)}${notes ? `\nNotas: ${notes}` : ''}. ¿Deseas continuar?`,
                confirmText: 'Abrir caja',
                cancelText: 'Cancelar',
                variant: 'warning',
                onConfirm: () => performOpenSession(amount, notes),
            });
        },
        [performOpenSession, showConfirmation, fmtCurrency]
    );

    // Close session handler
    const performCloseSession = useCallback(
        async (amount: number) => {
            try {
                setLoadingStates((prev) => ({ ...prev, closingSession: true }));
                if (!Number.isFinite(amount)) throw new Error('El monto de cierre es inválido');
                if (amount < 0) throw new Error('El monto debe ser positivo');
                const isOpen = ((session?.status || '') as string).toUpperCase() === 'OPEN';
                if (!session?.id || !isOpen) throw new Error('No hay sesión abierta');

                const expectedBalance = summary.balance;
                const difference = Math.abs(amount - expectedBalance);
                if (difference > 0) {
                    toast({
                        description: `Diferencia respecto al balance esperado: ${fmtCurrency(difference)}`,
                        variant: difference > Math.max(100000, expectedBalance * 0.5) ? 'destructive' : 'default',
                    });
                }

                await closeSessionMutation.mutateAsync(amount);
                toast({ description: 'Sesión de caja cerrada exitosamente' });
                // Disparar sincronización SaaS con payload
                triggerCashSaasSync('close', { amount, sessionId: session?.id, createdAt: new Date().toISOString() });
            } catch (e: unknown) {
                const error = e as any;
                console.error('Error closing session:', error);
                const status = error?.response?.status;
                const srv = error?.response?.data || {};
                const msg = srv?.error || srv?.message || error?.message || 'Error cerrando sesión';
                if (status === 400 && (msg?.toLowerCase?.().includes('organization') || msg?.toLowerCase?.().includes('header'))) {
                    toast({ description: 'Falta seleccionar organización. Usa el selector de organización antes de cerrar caja.', variant: 'destructive' });
                } else if (status === 404 && msg?.toLowerCase?.().includes('no open session')) {
                    toast({ description: 'No hay sesión de caja abierta en tu organización. Ábrela primero.', variant: 'destructive' });
                } else {
                    toast({ description: msg, variant: 'destructive' });
                }
            } finally {
                setLoadingStates((prev) => ({ ...prev, closingSession: false }));
            }
        },
        [closeSessionMutation, session, summary.balance, fmtCurrency, toast]
    );

    const requestCloseSession = useCallback(
        (amount: number) => {
            const expectedBalance = summary.balance;
            const difference = Math.abs(amount - expectedBalance);
            const highDifference = difference > Math.max(100000, expectedBalance * 0.5);
            const baseDesc = `Monto de cierre: ${fmtCurrency(amount)}\nBalance esperado: ${fmtCurrency(expectedBalance)}\nDiferencia: ${fmtCurrency(difference)}`;

            showConfirmation({
                title: highDifference ? 'Diferencia alta al cerrar caja' : 'Confirmar cierre de caja',
                description: `${baseDesc}\n\n${highDifference ? 'Esta diferencia es elevada. Si confirmas, se registrará igualmente el cierre.' : '¿Deseas continuar con el cierre?'}`,
                confirmText: highDifference ? 'Cerrar de todos modos' : 'Cerrar caja',
                cancelText: 'Cancelar',
                variant: highDifference ? 'warning' : 'default',
                onConfirm: () => performCloseSession(amount),
            });
        },
        [performCloseSession, showConfirmation, fmtCurrency, summary.balance]
    );

    // Register movement handler
    const performRegisterMovement = useCallback(
        async (payload: CashMutationPayload) => {
            try {
                setLoadingStates((prev) => ({ ...prev, registeringMovement: true }));

                if (!session?.id) {
                    throw new Error('No hay sesión abierta');
                }

                const amount = Number(payload.amount || 0);

                // Use shared validation function
                try {
                    validateMovementAmount(amount, payload.type as any);
                } catch (validationError: any) {
                    throw new Error(validationError.message);
                }

                // Additional validations for balance
                if (payload.type === MOVEMENT_TYPES.OUT && Math.abs(amount) > summary.balance) {
                    throw new Error('No hay suficiente saldo en caja para este egreso');
                }

                if (payload.type === MOVEMENT_TYPES.ADJUSTMENT) {
                    if (!payload.direction) {
                        throw new Error('Debe especificar la dirección del ajuste');
                    }

                    if (payload.direction === MOVEMENT_DIRECTION.DECREASE && Math.abs(amount) > summary.balance) {
                        throw new Error('El ajuste negativo no puede exceder el saldo actual');
                    }
                }

                // Normalize amount using shared function
                const normalizedAmount = normalizeMovementAmount(
                    amount,
                    payload.type as any,
                    payload.direction as any
                );

                await registerMovementMutation.mutateAsync({
                    amount: normalizedAmount,
                    type: payload.type,
                    reason: payload.reason || undefined,
                });

                toast({ description: 'Movimiento registrado exitosamente' });
                // Disparar sincronización SaaS con payload
                triggerCashSaasSync('movement', {
                    amount: normalizedAmount,
                    type: payload.type,
                    reason: payload.reason,
                    sessionId: session?.id,
                    createdAt: new Date().toISOString(),
                });
            } catch (e: unknown) {
                const error = e as any;
                console.error('Error registering movement:', error);
                const errorMessage = error?.response?.data?.error || error?.message || 'Error registrando movimiento';
                toast({ description: errorMessage, variant: 'destructive' });
            } finally {
                setLoadingStates((prev) => ({ ...prev, registeringMovement: false }));
            }
        },
        [registerMovementMutation, session?.id, summary.balance, toast]
    );

    const requestRegisterMovement = useCallback(
        (payload: CashMutationPayload) => {
            const needsConfirm = payload.type === 'ADJUSTMENT' || payload.type === 'OUT';
            if (!needsConfirm) {
                performRegisterMovement(payload);
                return;
            }

            showConfirmation({
                title: payload.type === 'ADJUSTMENT' ? 'Confirmar ajuste de caja' : 'Confirmar egreso de caja',
                description: `Tipo: ${payload.type}. Monto: ${fmtCurrency(payload.amount)}${payload.reason ? `\nMotivo: ${payload.reason}` : ''}. ¿Deseas proceder?`,
                confirmText: 'Registrar',
                cancelText: 'Cancelar',
                variant: 'warning',
                onConfirm: () => performRegisterMovement(payload),
            });
        },
        [performRegisterMovement, showConfirmation, fmtCurrency]
    );

    return {
        loadingStates,
        handleOpenSession,
        requestCloseSession,
        requestRegisterMovement,
        ConfirmationDialog,
    };
}
