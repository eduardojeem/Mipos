import { useState, useEffect } from 'react';
import { Plan } from './use-subscription';

interface UsePlansReturn {
    plans: Plan[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function usePlans(): UsePlansReturn {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlans = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/plans');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar los planes');
            }

            setPlans(data.plans || []);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            console.error('Error fetching plans:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    return {
        plans,
        isLoading,
        error,
        refetch: fetchPlans,
    };
}
