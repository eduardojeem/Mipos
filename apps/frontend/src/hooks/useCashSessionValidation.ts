import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

interface CashSession {
    id: string;
    status: 'open' | 'closed' | 'reconciled';
    openingAmount: number;
    openedAt: string;
    openedByUser: {
        id: string;
        fullName: string;
    };
}

interface UseCashSessionValidationReturn {
    hasOpenSession: boolean;
    session: CashSession | null;
    isLoading: boolean;
    error: Error | null;
    validateCashPayment: () => Promise<boolean>;
    refetch: () => void;
}

/**
 * Hook to validate if there's an open cash session
 * Use this before allowing cash transactions in POS
 */
export function useCashSessionValidation(): UseCashSessionValidationReturn {
    const { toast } = useToast();
    const organizationId = useCurrentOrganizationId();
    const queryClient = useQueryClient();
    const cacheKey = ['cashSession', organizationId ?? 'no-org'] as const;

    const {
        data: sessionData,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: cacheKey,
        enabled: Boolean(organizationId),
        queryFn: async () => {
            try {
                const res = await api.get('/cash/session/current', { _noRetry: true } as any);
                return res.data;
            } catch (err: any) {
                // If 404 or no session, return null instead of throwing
                if (err.response?.status === 404 || err.response?.data?.session === null) {
                    return { session: null };
                }
                throw err;
            }
        },
        refetchOnWindowFocus: true,
        staleTime: 30_000, // 30 seconds
        retry: false,
    });

    const session = sessionData?.session || null;
    const hasOpenSession = ((session?.status || '') as string).toUpperCase() === 'OPEN';

    /**
     * Validates if cash payment is allowed
     * Shows toast notification if validation fails
     * @returns true if cash payment is allowed, false otherwise
     */
    const validateCashPayment = async (): Promise<boolean> => {
        if (!organizationId) {
            toast({
                title: 'Organizacion no seleccionada',
                description: 'Selecciona una organizacion antes de aceptar pagos en efectivo.',
                variant: 'destructive',
            });
            return false;
        }

        // Use the cached session if it's still fresh (staleTime=30s); otherwise
        // refetch. Antes esto SIEMPRE refetcheaba, agregando un row read por
        // cada venta cash aunque el cache estuviera bueno.
        const cachedState = queryClient.getQueryState(cacheKey);
        const cacheIsFresh = cachedState && Date.now() - (cachedState.dataUpdatedAt || 0) < 30_000;
        let currentSession;
        if (cacheIsFresh) {
            currentSession = (cachedState?.data as { session?: CashSession } | undefined)?.session;
        } else {
            const { data } = await refetch();
            currentSession = data?.session;
        }

        if (!currentSession) {
            toast({
                title: 'Sesión de caja no encontrada',
                description: 'Debe abrir una sesión de caja antes de aceptar pagos en efectivo.',
                variant: 'destructive',
            });
            return false;
        }

        const isOpen = ((currentSession.status || '') as string).toUpperCase() === 'OPEN';
        if (!isOpen) {
            toast({
                title: 'Sesión de caja cerrada',
                description: 'La sesión de caja está cerrada. Ábrala para aceptar pagos en efectivo.',
                variant: 'destructive',
            });
            return false;
        }

        return true;
    };

    return {
        hasOpenSession,
        session,
        isLoading,
        error: error as Error | null,
        validateCashPayment,
        refetch,
    };
}
