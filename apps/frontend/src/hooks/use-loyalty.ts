import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';

// Types
export interface LoyaltyProgram {
  id: string;
  name: string;
  description?: string;
  pointsPerPurchase: number;
  minimumPurchase: number;
  welcomeBonus: number;
  birthdayBonus: number;
  referralBonus: number;
  pointsExpirationDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  description?: string;
  minPoints: number;
  multiplier: number;
  benefits?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerLoyalty {
  id: string;
  customerId: string;
  programId: string;
  currentPoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  currentTierId?: string;
  enrollmentDate: string;
  lastActivityDate?: string;
  program: LoyaltyProgram;
  currentTier?: LoyaltyTier;
}

export interface PointsTransaction {
  id: string;
  customerLoyaltyId: string;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'BONUS' | 'ADJUSTMENT';
  points: number;
  description: string;
  referenceType?: 'SALE' | 'REWARD' | 'BIRTHDAY' | 'REFERRAL' | 'MANUAL';
  referenceId?: string;
  saleId?: string;
  expirationDate?: string;
  createdAt: string;
  createdBy?: string;
  metadata?: {
    purchaseAmount?: number;
    rewardName?: string;
  };
}

export interface Reward {
  id: string;
  programId: string;
  name: string;
  description?: string;
  type: 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_PRODUCT' | 'FREE_SHIPPING' | 'CUSTOM';
  value: number;
  pointsCost: number;
  maxRedemptions?: number;
  currentRedemptions: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  categoryId?: string;
  productId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReward {
  id: string;
  customerLoyaltyId: string;
  rewardId: string;
  status: 'AVAILABLE' | 'USED' | 'EXPIRED';
  redeemedAt?: string;
  usedAt?: string;
  expirationDate?: string;
  saleId?: string;
  reward: Reward;
}

export interface LoyaltyAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalRewardsRedeemed: number;
  averagePointsPerCustomer: number;
  topTier?: LoyaltyTier;
  customersByTier: Array<{
    tier: LoyaltyTier;
    count: number;
  }>;
  pointsIssuedByMonth: Array<{
    month: string;
    points: number;
  }>;
  rewardsRedeemedByMonth: Array<{
    month: string;
    count: number;
  }>;
}

// API functions
const api = {
  // Programs
  getPrograms: async (): Promise<LoyaltyProgram[]> => {
    const response = await fetch('/api/loyalty/programs');
    if (!response.ok) throw new Error('Failed to fetch loyalty programs');
    const data = await response.json();
    return data.data;
  },

  createProgram: async (program: Omit<LoyaltyProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<LoyaltyProgram> => {
    const response = await fetch('/api/loyalty/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    if (!response.ok) throw new Error('Failed to create loyalty program');
    const data = await response.json();
    return data.data;
  },

  updateProgram: async (id: string, program: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> => {
    const response = await fetch(`/api/loyalty/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(program),
    });
    if (!response.ok) throw new Error('Failed to update loyalty program');
    const data = await response.json();
    return data.data;
  },

  // Tiers
  getTiers: async (programId: string): Promise<LoyaltyTier[]> => {
    const response = await fetch(`/api/loyalty/programs/${programId}/tiers`);
    if (!response.ok) throw new Error('Failed to fetch loyalty tiers');
    const data = await response.json();
    return data.data;
  },

  createTier: async (programId: string, tier: Omit<LoyaltyTier, 'id' | 'programId' | 'createdAt' | 'updatedAt'>): Promise<LoyaltyTier> => {
    const response = await fetch(`/api/loyalty/programs/${programId}/tiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tier),
    });
    if (!response.ok) throw new Error('Failed to create loyalty tier');
    const data = await response.json();
    return data.data;
  },

  updateTier: async (programId: string, tierId: string, tier: Partial<LoyaltyTier>): Promise<LoyaltyTier> => {
    const response = await fetch(`/api/loyalty/programs/${programId}/tiers/${tierId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tier),
    });
    if (!response.ok) throw new Error('Failed to update loyalty tier');
    const data = await response.json();
    return data.data;
  },

  // Customer Loyalty
  getCustomerLoyalty: async (customerId: string, programId?: string): Promise<CustomerLoyalty | null> => {
    const url = programId 
      ? `/api/loyalty/customers/${customerId}?programId=${programId}`
      : `/api/loyalty/customers/${customerId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch customer loyalty');
    }
    const data = await response.json();
    return data.data;
  },

  enrollCustomer: async (customerId: string, programId: string): Promise<CustomerLoyalty> => {
    const response = await fetch(`/api/loyalty/customers/${customerId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId }),
    });
    if (!response.ok) throw new Error('Failed to enroll customer');
    const data = await response.json();
    return data.data;
  },

  // Points
  calculatePoints: async (customerId: string, programId: string, purchaseAmount: number): Promise<{ points: number; purchaseAmount: number }> => {
    const response = await fetch(`/api/loyalty/customers/${customerId}/points/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId, purchaseAmount }),
    });
    if (!response.ok) throw new Error('Failed to calculate points');
    const data = await response.json();
    return data.data;
  },

  // Rewards
  getAvailableRewards: async (programId: string, customerId?: string): Promise<Reward[]> => {
    const url = customerId 
      ? `/api/loyalty/programs/${programId}/rewards?customerId=${customerId}`
      : `/api/loyalty/programs/${programId}/rewards`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch rewards');
    const data = await response.json();
    return data.data;
  },

  createReward: async (programId: string, reward: Omit<Reward, 'id' | 'programId' | 'currentRedemptions' | 'createdAt' | 'updatedAt'>): Promise<Reward> => {
    const response = await fetch(`/api/loyalty/programs/${programId}/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reward),
    });
    if (!response.ok) throw new Error('Failed to create reward');
    const data = await response.json();
    return data.data;
  },

  updateReward: async (programId: string, rewardId: string, reward: Partial<Reward>): Promise<Reward> => {
    const response = await fetch(`/api/loyalty/programs/${programId}/rewards/${rewardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reward),
    });
    if (!response.ok) throw new Error('Failed to update reward');
    const data = await response.json();
    return data.data;
  },

  redeemReward: async (customerId: string, programId: string, rewardId: string): Promise<CustomerReward> => {
    const response = await fetch(`/api/loyalty/customers/${customerId}/rewards/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId, rewardId }),
    });
    if (!response.ok) throw new Error('Failed to redeem reward');
    const data = await response.json();
    return data.data;
  },

  getCustomerRewards: async (customerId: string, programId: string, status?: 'AVAILABLE' | 'USED' | 'EXPIRED'): Promise<CustomerReward[]> => {
    const url = status 
      ? `/api/loyalty/customers/${customerId}/rewards?programId=${programId}&status=${status}`
      : `/api/loyalty/customers/${customerId}/rewards?programId=${programId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch customer rewards');
    const data = await response.json();
    return data.data;
  },

  useCustomerReward: async (customerRewardId: string, saleId: string): Promise<CustomerReward> => {
    const response = await fetch(`/api/loyalty/rewards/${customerRewardId}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleId }),
    });
    if (!response.ok) throw new Error('Failed to use customer reward');
    const data = await response.json();
    return data.data;
  },

  // Analytics
  getAnalytics: async (programId: string, startDate?: Date, endDate?: Date): Promise<LoyaltyAnalytics> => {
    let url = `/api/loyalty/programs/${programId}/analytics`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch loyalty analytics');
    const data = await response.json();
    return data.data;
  },

  // Points transactions
  getPointsTransactions: async (opts: {
    customerId?: string;
    programId?: string;
    type?: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED' | 'BONUS';
    referenceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<PointsTransaction[]> => {
    const params = new URLSearchParams();
    if (opts.customerId) params.append('customerId', opts.customerId);
    if (opts.programId) params.append('programId', opts.programId);
    if (opts.type) params.append('type', opts.type);
    if (opts.referenceType) params.append('referenceType', opts.referenceType);
    if (opts.startDate) params.append('startDate', opts.startDate.toISOString());
    if (opts.endDate) params.append('endDate', opts.endDate.toISOString());
    params.append('page', String(opts.page ?? 1));
    params.append('pageSize', String(opts.pageSize ?? 50));
    const url = `/api/loyalty/points-transactions?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch points transactions');
    const data = await response.json();
    const items: any[] = data?.data?.items ?? [];
    // Normaliza tipos devueltos por el backend para coincidir con la UI
    return items.map((t) => ({
      ...t,
      type: t.type === 'ADJUSTED' ? 'ADJUSTMENT' : t.type,
    }));
  },

  // Manual points adjustment
  adjustPoints: async (payload: {
    customerLoyaltyId: string;
    points: number;
    description: string;
    referenceType?: string;
    expiresAt?: string;
  }) => {
    const response = await fetch('/api/loyalty/points-adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to adjust points');
    const data = await response.json();
    return data.data;
  },
};

// Hooks
export const useLoyaltyPrograms = () => {
  return useQuery({
    queryKey: ['loyalty', 'programs'],
    queryFn: api.getPrograms,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useLoyaltyTiers = (programId: string) => {
  return useQuery({
    queryKey: ['loyalty', 'tiers', programId],
    queryFn: () => api.getTiers(programId),
    enabled: !!programId,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useCustomerLoyalty = (customerId: string, programId?: string) => {
  return useQuery({
    queryKey: ['loyalty', 'customer', customerId, programId],
    queryFn: () => api.getCustomerLoyalty(customerId, programId),
    enabled: !!customerId,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useAvailableRewards = (programId: string, customerId?: string) => {
  return useQuery({
    queryKey: ['loyalty', 'rewards', programId, customerId],
    queryFn: () => api.getAvailableRewards(programId, customerId),
    enabled: !!programId,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });
};

export const useCustomerRewards = (customerId: string, programId: string, status?: 'AVAILABLE' | 'USED' | 'EXPIRED') => {
  return useQuery({
    queryKey: ['loyalty', 'customer-rewards', customerId, programId, status],
    queryFn: () => api.getCustomerRewards(customerId, programId, status),
    enabled: !!(customerId && programId),
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });
};

export const useLoyaltyAnalytics = (programId: string, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['loyalty', 'analytics', programId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => api.getAnalytics(programId, startDate, endDate),
    enabled: !!programId,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

// Mutation hooks
export const useCreateLoyaltyProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'programs'] });
      toast.success('Programa de lealtad creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear programa: ${error.message}`);
    },
  });
};

export const useUpdateLoyaltyProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, program }: { id: string; program: Partial<LoyaltyProgram> }) => 
      api.updateProgram(id, program),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'programs'] });
      toast.success('Programa de lealtad actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar programa: ${error.message}`);
    },
  });
};

export const useCreateLoyaltyTier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ programId, tier }: { programId: string; tier: Omit<LoyaltyTier, 'id' | 'programId' | 'createdAt' | 'updatedAt'> }) => 
      api.createTier(programId, tier),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'tiers', programId] });
      toast.success('Nivel de lealtad creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear nivel: ${error.message}`);
    },
  });
};

export const useUpdateLoyaltyTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, tierId, tier }: { programId: string; tierId: string; tier: Partial<LoyaltyTier> }) =>
      api.updateTier(programId, tierId, tier),
    onSuccess: (_data, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'tiers', programId] });
      toast.success('Nivel actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar nivel: ${error.message}`);
    },
  });
};

export const useEnrollCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerId, programId }: { customerId: string; programId: string }) => 
      api.enrollCustomer(customerId, programId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'customer', customerId] });
      toast.success('Cliente inscrito exitosamente en el programa de lealtad');
    },
    onError: (error: Error) => {
      toast.error(`Error al inscribir cliente: ${error.message}`);
    },
  });
};

export const useCreateReward = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ programId, reward }: { programId: string; reward: Omit<Reward, 'id' | 'programId' | 'currentRedemptions' | 'createdAt' | 'updatedAt'> }) => 
      api.createReward(programId, reward),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'rewards', programId] });
      toast.success('Recompensa creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear recompensa: ${error.message}`);
    },
  });
};

export const useUpdateReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, rewardId, reward }: { programId: string; rewardId: string; reward: Partial<Reward> }) =>
      api.updateReward(programId, rewardId, reward),
    onSuccess: (_data, { programId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'rewards', programId] });
      toast.success('Recompensa actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar recompensa: ${error.message}`);
    },
  });
};

export const useRedeemReward = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerId, programId, rewardId }: { customerId: string; programId: string; rewardId: string }) => 
      api.redeemReward(customerId, programId, rewardId),
    onSuccess: (_, { customerId, programId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'customer-rewards', customerId, programId] });
      toast.success('Recompensa canjeada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al canjear recompensa: ${error.message}`);
    },
  });
};

export const useUseCustomerReward = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerRewardId, saleId }: { customerRewardId: string; saleId: string }) => 
      api.useCustomerReward(customerRewardId, saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] });
      toast.success('Recompensa aplicada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al aplicar recompensa: ${error.message}`);
    },
  });
};

// Utility hook for points calculation
export const usePointsCalculator = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  
  const calculatePoints = useCallback(async (customerId: string, programId: string, purchaseAmount: number) => {
    setIsCalculating(true);
    try {
      const result = await api.calculatePoints(customerId, programId, purchaseAmount);
      return result;
    } catch (error) {
      console.error('Error calculating points:', error);
      return { points: 0, purchaseAmount };
    } finally {
      setIsCalculating(false);
    }
  }, []);
  
  return { calculatePoints, isCalculating };
};

// Hook para obtener transacciones de puntos
export const usePointsTransactions = (customerId?: string, opts?: { page?: number; pageSize?: number; type?: PointsTransaction['type']; startDate?: Date; endDate?: Date }) => {
  return useQuery({
    queryKey: ['loyalty', 'points-transactions', customerId, opts?.page, opts?.pageSize, opts?.type, opts?.startDate?.toISOString(), opts?.endDate?.toISOString()],
    queryFn: async () => {
      if (!customerId) return [];
      return api.getPointsTransactions({
        customerId,
        type: opts?.type as any,
        startDate: opts?.startDate,
        endDate: opts?.endDate,
        page: opts?.page,
        pageSize: opts?.pageSize,
      });
    },
    enabled: !!customerId,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useAdjustPoints = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerLoyaltyId, points, description, referenceType, expiresAt }: { customerLoyaltyId: string; points: number; description: string; referenceType?: string; expiresAt?: string }) =>
      api.adjustPoints({ customerLoyaltyId, points, description, referenceType, expiresAt }),
    onSuccess: (_data, variables) => {
      // Invalidate related queries: customer loyalty and transactions
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'customer'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'points-transactions'] });
      toast.success('Ajuste de puntos aplicado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al ajustar puntos: ${error.message}`);
    },
  });
};