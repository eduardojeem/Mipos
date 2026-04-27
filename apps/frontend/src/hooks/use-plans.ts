import { useState, useEffect } from 'react';
import { Plan } from './use-subscription';

const PLANS_CACHE_KEY = 'plans_cache_canonical_v1';

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

    const loadFromCache = (): Plan[] => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem(PLANS_CACHE_KEY) : null;
            if (!raw) return [];
            const parsed = JSON.parse(raw) as { ts: number; data: Plan[] };
            if (!parsed || !parsed.data) return [];
            const maxAgeMs = 10 * 60 * 1000;
            if (Date.now() - parsed.ts > maxAgeMs) return [];
            return parsed.data;
        } catch {
            return [];
        }
    };

    const saveToCache = (data: Plan[]) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
            }
        } catch {}
    };

    const fetchPlans = async () => {
        const controller = new AbortController();
        try {
            setIsLoading(true);
            setError(null);

            const cached = loadFromCache();
            if (cached.length) {
                setPlans(cached);
            }

            const response = await fetch('/api/plans', { signal: controller.signal });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar los planes');
            }

            const next = data.plans || [];
            setPlans(next);
            saveToCache(next);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
        return undefined;
    };

    useEffect(() => {
        void fetchPlans();
    }, []);

    return {
        plans,
        isLoading,
        error,
        refetch: fetchPlans,
    };
}
