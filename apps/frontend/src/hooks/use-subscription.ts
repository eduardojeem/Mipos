import { useState, useEffect, useCallback } from 'react';

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
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
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
    changePlan: (newPlanId: string, billingCycle: 'monthly' | 'yearly') => Promise<boolean>;
    isChangingPlan: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isChangingPlan, setIsChangingPlan] = useState(false);

    const fetchSubscription = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/subscription');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar la suscripción');
            }

            setSubscription(data.subscription);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Error fetching subscription:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const changePlan = useCallback(async (
        newPlanId: string,
        billingCycle: 'monthly' | 'yearly'
    ): Promise<boolean> => {
        try {
            setIsChangingPlan(true);
            setError(null);

            const response = await fetch('/api/subscription/change-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newPlanId, billingCycle }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cambiar el plan');
            }

            // Actualizar la suscripción con los nuevos datos
            setSubscription(data.subscription);

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Error changing plan:', err);
            return false;
        } finally {
            setIsChangingPlan(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscription();
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
