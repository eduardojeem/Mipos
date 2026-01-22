import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PriceHistoryItem, PriceAlert, PriceTrend } from '@/types/price-history';

interface PriceHistoryParams {
    productId?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    search?: string;
    supplier?: string;
    product?: string;
    dateRange?: string;
}

export function usePriceHistory(params: PriceHistoryParams = {}) {
    return useQuery({
        queryKey: ['price-history', params],
        queryFn: async () => {
            const { data } = await api.get('/suppliers/price-history', { params });
            return {
                items: data.items as PriceHistoryItem[],
                total: data.total as number,
                trends: data.trends as PriceTrend[],
                stats: data.stats
            };
        },
        // Placeholder data for now until backend is ready
        placeholderData: (prev) => prev,
    });
}

export function usePriceAlerts() {
    return useQuery({
        queryKey: ['price-alerts'],
        queryFn: async () => {
            const { data } = await api.get('/suppliers/price-alerts');
            return data as PriceAlert[];
        }
    });
}

export function useCreatePriceEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<PriceHistoryItem, 'id' | 'changeType' | 'changePercentage'>) => {
            const res = await api.post('/suppliers/price-history', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price-history'] });
        }
    });
}

export function useCreatePriceAlert() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<PriceAlert, 'id' | 'createdAt' | 'lastTriggered'>) => {
            const res = await api.post('/suppliers/price-alerts', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
        }
    });
}

export function useUpdatePriceAlert() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PriceAlert> }) => {
            const res = await api.patch(`/suppliers/price-alerts/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
        }
    });
}

export function useDeletePriceAlert() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/suppliers/price-alerts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
        }
    });
}
