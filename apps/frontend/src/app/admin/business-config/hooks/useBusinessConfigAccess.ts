'use client';

import { usePlanPermissions } from '@/hooks/use-plan-permissions';
import { ACCESS_SECTIONS, canPlanAccessSection, getAccessSectionInfo } from '@/lib/access-policy';
import { normalizePlan } from '@/config/plans';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { useAuth } from '@/hooks/use-auth';

export interface SectionAccess {
  sectionId: string;
  isAllowed: boolean;
  requiredPlan?: string;
  currentPlan?: string;
  sectionLabel?: string;
}

export function useBusinessConfigAccess() {
  const { user } = useAuth();
  const { selectedOrganization } = useUserOrganizations(user?.id);
  const { permissions, isPlanResolved } = usePlanPermissions();

  const currentPlanName = selectedOrganization?.subscription_plan;
  const normalizedPlan = normalizePlan(currentPlanName);

  const checkSectionAccess = (sectionId: string): SectionAccess => {
    const accessSection = Object.entries(ACCESS_SECTIONS).find(([, value]) => value === sectionId)?.[1] as any;

    if (!accessSection) {
      return {
        sectionId,
        isAllowed: true,
      };
    }

    const isAllowed = canPlanAccessSection(currentPlanName, accessSection);
    const sectionInfo = getAccessSectionInfo(accessSection);

    return {
      sectionId,
      isAllowed,
      requiredPlan: sectionInfo?.requiredPlan,
      currentPlan: normalizedPlan,
      sectionLabel: sectionInfo?.label,
    };
  };

  return {
    checkSectionAccess,
    currentPlan: normalizedPlan,
    isPlanResolved,
    canAccessBranding: canPlanAccessSection(currentPlanName, ACCESS_SECTIONS.BUSINESS_CONFIG_BRANDING),
    canAccessCommerce: canPlanAccessSection(currentPlanName, ACCESS_SECTIONS.BUSINESS_CONFIG_COMMERCE),
    canAccessPublication: canPlanAccessSection(currentPlanName, ACCESS_SECTIONS.BUSINESS_CONFIG_PUBLICATION),
    canAccessContent: canPlanAccessSection(currentPlanName, ACCESS_SECTIONS.BUSINESS_CONFIG_CONTENT),
  };
}
