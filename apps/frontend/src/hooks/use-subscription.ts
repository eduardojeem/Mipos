import { useState, useEffect, useCallback } from 'react';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface PlanLimits {
    maxUsers?: number;
    maxProducts?: number;
    maxTransactionsPerMonth?: number;
    maxLocations?: number;
}

export interface Plan {
    id: string;
    name: string;
    slug: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    limits: PlanLimits;
    description?: string;
    currency: string;
    trialDays?: number;
    yearlyDiscount?: number;
}

export interface Subscription {
    id: string;
    organizationId: string;
    plan: Plan;
    status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'suspended';
    billingCycle: 'monthly' | 'yearly';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    daysUntilRenewal: number;
    createdAt: string;
    isOrgAdmin?: boolean;
}

interface UseSubscriptionReturn {
    subscription: Subscription | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    changePlan: (
        newPlanId: string,
        billingCycle: 'monthly' | 'yearly',
        options?: { primaryBranchId?: string | null }
    ) => Promise<{ ok: boolean; message?: string; branchPolicy?: { primaryBranchId: string | null; deactivatedBranchIds: string[] } | null }>;
    isChangingPlan: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
    const organizationId = useCurrentOrganizationId();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isChangingPlan, setIsChangingPlan] = useState(false);

    const fetchSubscription = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/subscription${organizationId ? `?organizationId=${organizationId}` : ''}`, {
                headers: organizationId ? { 'x-organization-id': organizationId } : undefined,
                cache: 'no-store',
            });
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    setSubscription(null);
                    setError(data.error || 'Acceso denegado');
                    return;
                }
                // Si el error es por falta de organización, no es un error crítico
                if (data.error?.includes('organización') || data.error?.includes('organization')) {
                    console.warn('Usuario sin organización asignada');
                    setSubscription(null);
                    setError(null); // No mostrar como error
                } else {
                    throw new Error(data.error || 'Error al cargar la suscripción');
                }
            } else {
                setSubscription(data.subscription);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Error fetching subscription:', err);
        } finally {
            setIsLoading(false);
        }
    }, [organizationId]);

    const changePlan = useCallback(async (
        newPlanId: string,
        billingCycle: 'monthly' | 'yearly',
        options?: { primaryBranchId?: string | null }
    ): Promise<{ ok: boolean; message?: string; branchPolicy?: { primaryBranchId: string | null; deactivatedBranchIds: string[] } | null }> => {
        try {
            setIsChangingPlan(true);
            setError(null);
            const response = await fetch('/api/subscription/change-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(organizationId ? { 'x-organization-id': organizationId } : {}),
                },
                body: JSON.stringify({
                    newPlanId,
                    billingCycle,
                    organizationId,
                    primaryBranchId: options?.primaryBranchId ?? null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cambiar el plan');
            }

            // Actualizar la suscripción con los nuevos datos
            setSubscription(data.subscription);

            return {
                ok: true,
                message: typeof data?.message === 'string' ? data.message : undefined,
                branchPolicy: (data?.branchPolicy ?? null) as any,
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Error changing plan:', err);
            return { ok: false, message: errorMessage };
        } finally {
            setIsChangingPlan(false);
        }
    }, [organizationId]);

    useEffect(() => {
        void fetchSubscription();
    }, [fetchSubscription]);

    return {
        subscription,
        isLoading,
        error,
        refetch: fetchSubscription,
        changePlan,
        isChangingPlan,
    };
}
