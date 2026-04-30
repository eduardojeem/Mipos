import { useCallback, useEffect, useRef, useState } from 'react';
import { Plan } from './use-subscription';

const PLANS_CACHE_KEY = 'plans_cache_canonical_v1';
const PLANS_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

let memoryCache: { ts: number; data: Plan[] } | null = null;
let inFlightRequest: Promise<Plan[]> | null = null;

interface UsePlansReturn {
    plans: Plan[];
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

interface UsePlansOptions {
    initialPlans?: Plan[];
}

function isFreshCacheEntry(entry: { ts: number; data: Plan[] } | null | undefined) {
    return Boolean(entry && Array.isArray(entry.data) && Date.now() - entry.ts <= PLANS_CACHE_MAX_AGE_MS);
}

function loadPlansFromStorage(): Plan[] {
    try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(PLANS_CACHE_KEY) : null;
        if (!raw) return [];

        const parsed = JSON.parse(raw) as { ts: number; data: Plan[] };
        if (!isFreshCacheEntry(parsed)) return [];

        memoryCache = parsed;
        return parsed.data;
    } catch {
        return [];
    }
}

function savePlansToCache(data: Plan[]) {
    const next = { ts: Date.now(), data };
    memoryCache = next;

    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(next));
        }
    } catch {}
}

async function requestPlans(): Promise<Plan[]> {
    if (inFlightRequest) {
        return inFlightRequest;
    }

    inFlightRequest = (async () => {
        const response = await fetch('/api/plans', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al cargar los planes');
        }

        const next = Array.isArray(data.plans) ? data.plans : [];
        savePlansToCache(next);
        return next;
    })().finally(() => {
        inFlightRequest = null;
    });

    return inFlightRequest;
}

export function usePlans(options: UsePlansOptions = {}): UsePlansReturn {
    const [plans, setPlans] = useState<Plan[]>(() => options.initialPlans || []);
    const [isLoading, setIsLoading] = useState(!(options.initialPlans && options.initialPlans.length > 0));
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasVisibleDataRef = useRef(Boolean(options.initialPlans && options.initialPlans.length > 0));

    const fetchPlans = useCallback(async () => {
        const hasVisibleData = hasVisibleDataRef.current;

        try {
            if (hasVisibleData) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            setError(null);

            const next = await requestPlans();
            setPlans(next);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        hasVisibleDataRef.current = plans.length > 0;
    }, [plans.length]);

    useEffect(() => {
        if (options.initialPlans && options.initialPlans.length > 0) {
            setPlans(options.initialPlans);
            setIsLoading(false);
            hasVisibleDataRef.current = true;
        }
    }, [options.initialPlans]);

    useEffect(() => {
        if (isFreshCacheEntry(memoryCache)) {
            setPlans((current) => current.length > 0 ? current : (memoryCache?.data || []));
            setIsLoading(false);
        } else {
            const cached = loadPlansFromStorage();
            if (cached.length) {
                setPlans((current) => current.length > 0 ? current : cached);
                setIsLoading(false);
            }
        }

        void fetchPlans();
    }, [fetchPlans]);

    return {
        plans,
        isLoading,
        isRefreshing,
        error,
        refetch: fetchPlans,
    };
}
