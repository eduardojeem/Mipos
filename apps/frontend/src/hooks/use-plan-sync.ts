import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import planService, { CompanyProfile, PlanData, PlanLimit, FeatureAvailability } from '@/lib/services/plan-service';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface UsePlanSyncReturn {
  company: CompanyProfile | null;
  planData: PlanData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateCompany: (profile: Partial<CompanyProfile>) => Promise<boolean>;
  trackUsage: (featureType: string, quantity?: number) => Promise<boolean>;
  checkFeature: (featureType: string, quantity?: number) => Promise<FeatureAvailability>;
  needsOnboarding: boolean;
  planColor: string;
  planDisplayName: string;
}

/**
 * Hook for synchronizing plan data and managing plan-based features
 */
export function usePlanSync(): UsePlanSyncReturn {
  const queryClient = useQueryClient();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const organizationId = useCurrentOrganizationId();
  const orgKey = organizationId || 'no-org';

  // Fetch company profile
  const { data: company, isLoading: companyLoading, error: companyError, refetch: refetchCompany } = useQuery({
    queryKey: ['company-profile', orgKey],
    queryFn: () => planService.getCompanyProfile(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const effectiveOrganizationId = organizationId || company?.id || null;
  const effectiveOrgKey = effectiveOrganizationId || 'no-org';

  // Fetch plan data
  const { data: planData, isLoading: planLoading, error: planError, refetch: refetchPlan } = useQuery({
    queryKey: ['plan-limits', effectiveOrgKey],
    queryFn: () => planService.getPlanLimits(effectiveOrganizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!effectiveOrganizationId,
  });

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (company) {
        const needsOnboarding = await planService.needsOnboarding(effectiveOrganizationId);
        setNeedsOnboarding(needsOnboarding);
      }
    };
    checkOnboarding();
  }, [company, effectiveOrganizationId]);

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: (profile: Partial<CompanyProfile>) => planService.updateCompanyProfile(profile, effectiveOrganizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile', orgKey] });
      queryClient.invalidateQueries({ queryKey: ['system-settings', effectiveOrganizationId] });
      queryClient.invalidateQueries({ queryKey: ['business-config', effectiveOrganizationId] });
    },
  });

  // Track usage mutation
  const trackUsageMutation = useMutation({
    mutationFn: ({ featureType, quantity }: { featureType: string; quantity: number }) => 
      planService.trackFeatureUsage(featureType, quantity, effectiveOrganizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-limits', effectiveOrgKey] });
    },
  });

  // Check feature availability mutation
  const checkFeatureMutation = useMutation({
    mutationFn: ({ featureType, quantity }: { featureType: string; quantity: number }) => 
      planService.checkFeatureAvailability(featureType, quantity, effectiveOrganizationId),
  });

  // Combined refetch function
  const refetch = useCallback(() => {
    refetchCompany();
    refetchPlan();
  }, [refetchCompany, refetchPlan]);

  // Update company function
  const updateCompany = useCallback(async (profile: Partial<CompanyProfile>): Promise<boolean> => {
    try {
      const success = await updateCompanyMutation.mutateAsync(profile);
      return success;
    } catch (error) {
      console.error('Error updating company:', error);
      return false;
    }
  }, [updateCompanyMutation]);

  // Track usage function
  const trackUsage = useCallback(async (featureType: string, quantity: number = 1): Promise<boolean> => {
    try {
      const success = await trackUsageMutation.mutateAsync({ featureType, quantity });
      return success;
    } catch (error) {
      console.error('Error tracking usage:', error);
      return false;
    }
  }, [trackUsageMutation]);

  // Check feature function
  const checkFeature = useCallback(async (featureType: string, quantity: number = 1): Promise<FeatureAvailability> => {
    try {
      const availability = await checkFeatureMutation.mutateAsync({ featureType, quantity });
      return availability;
    } catch (error) {
      console.error('Error checking feature:', error);
      return {
        available: false,
        current_usage: 0,
        limit_value: 0,
        usage_percentage: 0,
        message: 'Error al verificar disponibilidad'
      };
    }
  }, [checkFeatureMutation]);

  // Get plan color and display name
  const planColor = company ? planService.getPlanColor(company.plan_type) : '#6B7280';
  const planDisplayName = company ? planService.getPlanDisplayName(company.plan_type) : 'Desconocido';

  return {
    company: company ?? null,
    planData: planData ?? null,
    isLoading: companyLoading || planLoading,
    error: companyError?.message || planError?.message || null,
    refetch,
    updateCompany,
    trackUsage,
    checkFeature,
    needsOnboarding,
    planColor,
    planDisplayName,
  };
}

/**
 * Hook for tracking specific feature usage
 */
export function useFeatureTracking(featureType: string) {
  const { trackUsage, checkFeature, planData } = usePlanSync();
  
  const trackFeatureUsage = useCallback(async (quantity: number = 1): Promise<boolean> => {
    return await trackUsage(featureType, quantity);
  }, [trackUsage, featureType]);

  const checkFeatureAvailability = useCallback(async (quantity: number = 1): Promise<FeatureAvailability> => {
    return await checkFeature(featureType, quantity);
  }, [checkFeature, featureType]);

  const getFeatureLimit = useCallback((): PlanLimit | null => {
    if (!planData) return null;
    return planData.limits.find(l => l.feature_type === featureType) || null;
  }, [planData, featureType]);

  return {
    trackFeatureUsage,
    checkFeatureAvailability,
    getFeatureLimit,
  };
}

/**
 * Hook for checking if user can perform actions based on their plan
 */
export function usePlanRestrictions() {
  const { planData, company } = usePlanSync();

  const canAddUser = useCallback(async (): Promise<boolean> => {
    if (!planData) return false;
    const userLimit = planData.limits.find(l => l.feature_type === 'users');
    if (!userLimit) return false;
    
    return userLimit.is_unlimited || userLimit.current_usage < userLimit.limit_value;
  }, [planData]);

  const canAddIntegration = useCallback(async (): Promise<boolean> => {
    if (!planData) return false;
    const integrationLimit = planData.limits.find(l => l.feature_type === 'integrations');
    if (!integrationLimit) return false;
    
    return integrationLimit.is_unlimited || integrationLimit.current_usage < integrationLimit.limit_value;
  }, [planData]);

  const canAddTransaction = useCallback(async (count: number = 1): Promise<boolean> => {
    if (!planData) return false;
    const transactionLimit = planData.limits.find(l => l.feature_type === 'monthly_transactions');
    if (!transactionLimit) return false;
    
    return transactionLimit.is_unlimited || 
           (transactionLimit.current_usage + count) <= transactionLimit.limit_value;
  }, [planData]);

  const hasStorageSpace = useCallback(async (sizeMB: number): Promise<boolean> => {
    if (!planData) return false;
    const storageLimit = planData.limits.find(l => l.feature_type === 'storage_mb');
    if (!storageLimit) return false;
    
    return storageLimit.is_unlimited || 
           (storageLimit.current_usage + sizeMB) <= storageLimit.limit_value;
  }, [planData]);

  const isPlanFeature = useCallback((featureType: string): boolean => {
    if (!planData) return false;
    const limit = planData.limits.find(l => l.feature_type === featureType);
    return !!limit;
  }, [planData]);

  return {
    canAddUser,
    canAddIntegration,
    canAddTransaction,
    hasStorageSpace,
    isPlanFeature,
    currentPlan: company?.plan_type || 'free',
    planColor: company ? planService.getPlanColor(company.plan_type) : '#6B7280',
  };
}

/**
 * Hook for plan upgrade recommendations
 */
export function usePlanRecommendations() {
  const { planData, company } = usePlanSync();

  const getRecommendations = useCallback((): string[] => {
    if (!planData || !company) return [];
    return planService.getUpgradeRecommendations(company.plan_type, planData);
  }, [planData, company]);

  const shouldUpgrade = useCallback((): boolean => {
    const recommendations = getRecommendations();
    return recommendations.length > 0;
  }, [getRecommendations]);

  return {
    recommendations: getRecommendations(),
    shouldUpgrade: shouldUpgrade(),
  };
}
