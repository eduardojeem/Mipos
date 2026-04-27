import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import api from '@/lib/api';
import { MAX_CASH_OPENING_AMOUNT } from '@/lib/cash/constants';
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
    requestCloseSession: (payload: { closingAmount: number; notes?: string }) => void;
    requestRegisterMovement: (payload: CashMutationPayload) => void;
    ConfirmationDialog: () => React.JSX.Element;
}

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

    const availableBalance =
        session?.summary?.expectedCash ??
        Number(session?.openingAmount || 0) + Number(summary.balance || 0);

    const openSessionMutation = useMutation({
        mutationFn: async ({ amount, notes }: { amount: number; notes?: string }) => {
            const res = await api.post('/cash/session/open', {
                openingAmount: amount,
                notes: (notes || 'Apertura de caja').slice(0, 200),
            });
            return res.data;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['cashSession'], type: 'all' }),
                queryClient.refetchQueries({ queryKey: ['cashSessions'], type: 'all' }),
                queryClient.invalidateQueries({ queryKey: ['cashMovements'] }),
            ]);
            onSuccess?.();
        },
    });

    const closeSessionMutation = useMutation({
        mutationFn: async ({ amount, notes }: { amount: number; notes?: string }) => {
            const res = await api.post('/cash/session/close', {
                closingAmount: amount,
                notes: notes || 'Cierre de caja',
                systemExpected: availableBalance,
            });
            return res.data;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['cashSession'], type: 'all' }),
                queryClient.refetchQueries({ queryKey: ['cashSessions'], type: 'all' }),
                queryClient.invalidateQueries({ queryKey: ['cashMovements'] }),
            ]);
            onSuccess?.();
        },
    });

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
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['cashMovements'] }),
                queryClient.invalidateQueries({ queryKey: ['cashSession'] }),
                queryClient.invalidateQueries({ queryKey: ['cashSessions'] }),
            ]);
            await queryClient.refetchQueries({ queryKey: ['cashMovements'] });
            onSuccess?.();
        },
    });

    const performOpenSession = useCallback(
        async (amount: number, notes?: string) => {
            try {
                setLoadingStates((prev) => ({ ...prev, openingSession: true }));
                if (amount < 0) throw new Error('El monto debe ser positivo');
                if (amount > MAX_CASH_OPENING_AMOUNT) throw new Error('Monto de apertura demasiado alto');
                await openSessionMutation.mutateAsync({ amount, notes });
                toast({ description: 'Sesion de caja abierta exitosamente' });
                triggerCashSaasSync('open', { amount, notes, createdAt: new Date().toISOString() });
            } catch (e: unknown) {
                const error = e as any;
                const status = error?.response?.status;
                const srv = error?.response?.data || {};
                const msg = srv?.error || srv?.message || error?.message || 'Error abriendo sesion';
                const details = srv?.details;

                const normalizedMessage = String(msg || '').toLowerCase();
                if (status === 400 && (normalizedMessage.includes('organization') || normalizedMessage.includes('header'))) {
                    toast({ description: 'Falta seleccionar organizacion antes de abrir caja.', variant: 'destructive' });
                } else if (
                    (status === 400 || status === 409) &&
                    (
                        normalizedMessage.includes('already') ||
                        normalizedMessage.includes('open cash session') ||
                        normalizedMessage.includes('ya existe') ||
                        normalizedMessage.includes('sesion de caja abierta') ||
                        normalizedMessage.includes('contexto operativo')
                    )
                ) {
                    const conflict = srv?.conflict;
                    const scopeLabel =
                        conflict?.scope === 'POS'
                            ? `POS ${conflict?.posId || ''}`.trim()
                            : conflict?.scope === 'BRANCH'
                                ? `sucursal ${conflict?.branchId || ''}`.trim()
                                : 'contexto global';
                    const openedAtLabel = conflict?.openedAt
                        ? ` Abierta desde ${new Date(conflict.openedAt).toLocaleString()}.`
                        : '';

                    showConfirmation({
                        title: 'Ya existe una caja abierta',
                        description: `Hay una sesión de caja abierta para ${scopeLabel}.${openedAtLabel}\n\n¿Deseas cerrar la sesión anterior y abrir una nueva?`,
                        confirmText: 'Cerrar anterior y abrir nueva',
                        cancelText: 'Cancelar',
                        variant: 'warning',
                        onConfirm: async () => {
                            try {
                                setLoadingStates((prev) => ({ ...prev, openingSession: true }));
                                // Force close all open sessions
                                await api.post('/cash/session/force-close', {
                                    notes: 'Cierre forzado para reabrir caja',
                                });
                                // Wait for DB to settle
                                await new Promise((r) => setTimeout(r, 300));
                                // Now open the new session
                                await openSessionMutation.mutateAsync({ amount, notes });
                                // Force refetch ALL cashSession queries (including validation)
                                await queryClient.refetchQueries({ queryKey: ['cashSession'], type: 'all' });
                                await queryClient.refetchQueries({ queryKey: ['cashSessions'], type: 'all' });
                                toast({ description: 'Caja anterior cerrada y nueva sesión abierta exitosamente' });
                                triggerCashSaasSync('open', { amount, notes, createdAt: new Date().toISOString() });
                                onSuccess?.();
                            } catch (forceError: any) {
                                const forceSrv = forceError?.response?.data || {};
                                const forceMsg = forceSrv?.error || forceSrv?.message || forceError?.message || 'Error al forzar cierre';
                                toast({ description: forceMsg, variant: 'destructive' });
                                // Refetch anyway to sync state
                                queryClient.refetchQueries({ queryKey: ['cashSession'], type: 'all' });
                            } finally {
                                setLoadingStates((prev) => ({ ...prev, openingSession: false }));
                            }
                        },
                    });
                } else if (status === 403 && (msg?.toLowerCase?.().includes('rls') || msg?.toLowerCase?.().includes('permission'))) {
                    showConfirmation({
                        title: 'Permiso denegado',
                        description: 'Tu usuario no tiene permisos para abrir caja.',
                        confirmText: 'Entendido',
                        cancelText: 'Cerrar',
                        variant: 'info',
                        onConfirm: () => { },
                    });
                } else {
                    toast({ description: details ? `${msg}: ${details}` : msg, variant: 'destructive' });
                }
            } finally {
                setLoadingStates((prev) => ({ ...prev, openingSession: false }));
            }
        },
        [openSessionMutation, showConfirmation, toast]
    );

    const handleOpenSession = useCallback(
        (amount: number, notes?: string) => {
            performOpenSession(amount, notes);
        },
        [performOpenSession]
    );

    const performCloseSession = useCallback(
        async ({ closingAmount, notes }: { closingAmount: number; notes?: string }) => {
            try {
                setLoadingStates((prev) => ({ ...prev, closingSession: true }));
                if (!Number.isFinite(closingAmount)) throw new Error('El monto de cierre es invalido');
                if (closingAmount < 0) throw new Error('El monto debe ser positivo');
                const isOpen = String(session?.status || '').toUpperCase() === 'OPEN';
                if (!session?.id || !isOpen) throw new Error('No hay sesion abierta');

                const difference = Math.abs(closingAmount - availableBalance);
                if (difference > 0) {
                    toast({
                        description: `Diferencia respecto al balance esperado: ${fmtCurrency(difference)}`,
                        variant: difference > Math.max(100000, availableBalance * 0.5) ? 'destructive' : 'default',
                    });
                }

                await closeSessionMutation.mutateAsync({ amount: closingAmount, notes });
                toast({ description: 'Sesion de caja cerrada exitosamente' });
                triggerCashSaasSync('close', {
                    amount: closingAmount,
                    notes,
                    sessionId: session?.id,
                    createdAt: new Date().toISOString(),
                });
            } catch (e: unknown) {
                const error = e as any;
                const status = error?.response?.status;
                const srv = error?.response?.data || {};
                const msg = srv?.error || srv?.message || error?.message || 'Error cerrando sesion';
                if (status === 400 && (msg?.toLowerCase?.().includes('organization') || msg?.toLowerCase?.().includes('header'))) {
                    toast({ description: 'Falta seleccionar organizacion antes de cerrar caja.', variant: 'destructive' });
                } else if (status === 404 && msg?.toLowerCase?.().includes('no open session')) {
                    toast({ description: 'No hay sesion de caja abierta en tu organizacion.', variant: 'destructive' });
                } else {
                    toast({ description: msg, variant: 'destructive' });
                }
            } finally {
                setLoadingStates((prev) => ({ ...prev, closingSession: false }));
            }
        },
        [availableBalance, closeSessionMutation, fmtCurrency, session?.id, session?.status, toast]
    );

    const requestCloseSession = useCallback(
        ({ closingAmount, notes }: { closingAmount: number; notes?: string }) => {
            const difference = Math.abs(closingAmount - availableBalance);
            const highDifference = difference > Math.max(100000, availableBalance * 0.5);
            const baseDesc =
                `Monto de cierre: ${fmtCurrency(closingAmount)}\n` +
                `Balance esperado: ${fmtCurrency(availableBalance)}\n` +
                `Diferencia: ${fmtCurrency(difference)}`;

            showConfirmation({
                title: highDifference ? 'Diferencia alta al cerrar caja' : 'Confirmar cierre de caja',
                description: `${baseDesc}${notes ? `\nNotas: ${notes}` : ''}\n\n${highDifference ? 'Esta diferencia es elevada. Si confirmas, se registrara igualmente el cierre.' : 'Deseas continuar con el cierre?'}`,
                confirmText: highDifference ? 'Cerrar de todos modos' : 'Cerrar caja',
                cancelText: 'Cancelar',
                variant: highDifference ? 'warning' : 'default',
                onConfirm: () => performCloseSession({ closingAmount, notes }),
            });
        },
        [availableBalance, fmtCurrency, performCloseSession, showConfirmation]
    );

    const performRegisterMovement = useCallback(
        async (payload: CashMutationPayload) => {
            try {
                setLoadingStates((prev) => ({ ...prev, registeringMovement: true }));

                if (!session?.id) {
                    throw new Error('No hay sesion abierta');
                }

                const amount = Number(payload.amount || 0);

                try {
                    validateMovementAmount(amount, payload.type as any);
                } catch (validationError: any) {
                    throw new Error(validationError.message);
                }

                if (payload.type === MOVEMENT_TYPES.OUT && Math.abs(amount) > availableBalance) {
                    throw new Error('No hay suficiente saldo en caja para este egreso');
                }

                if (payload.type === MOVEMENT_TYPES.ADJUSTMENT) {
                    if (!payload.direction) {
                        throw new Error('Debe especificar la direccion del ajuste');
                    }

                    if (payload.direction === MOVEMENT_DIRECTION.DECREASE && Math.abs(amount) > availableBalance) {
                        throw new Error('El ajuste negativo no puede exceder el saldo actual');
                    }
                }

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
                triggerCashSaasSync('movement', {
                    amount: normalizedAmount,
                    type: payload.type,
                    reason: payload.reason,
                    sessionId: session?.id,
                    createdAt: new Date().toISOString(),
                });
            } catch (e: unknown) {
                const error = e as any;
                const errorMessage = error?.response?.data?.error || error?.message || 'Error registrando movimiento';
                toast({ description: errorMessage, variant: 'destructive' });
            } finally {
                setLoadingStates((prev) => ({ ...prev, registeringMovement: false }));
            }
        },
        [availableBalance, registerMovementMutation, session?.id, toast]
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
                description: `Tipo: ${payload.type}. Monto: ${fmtCurrency(payload.amount)}${payload.reason ? `\nMotivo: ${payload.reason}` : ''}. Deseas proceder?`,
                confirmText: 'Registrar',
                cancelText: 'Cancelar',
                variant: 'warning',
                onConfirm: () => performRegisterMovement(payload),
            });
        },
        [fmtCurrency, performRegisterMovement, showConfirmation]
    );

    return {
        loadingStates,
        handleOpenSession,
        requestCloseSession,
        requestRegisterMovement,
        ConfirmationDialog,
    };
}
