import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { createError } from './errorHandler';
import { EnhancedAuthenticatedRequest } from './enhanced-auth';

export interface OrganizationQuota {
  organizationId: string;
  usersCount: number;
  productsCount: number;
  salesCount: number;
  storageUsed: number;
  apiCallsCount: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface PlanLimits {
  users: number;      // -1 = unlimited
  products: number;   // -1 = unlimited
  sales: number;      // -1 = unlimited
  storage: number;    // GB, -1 = unlimited
  apiCalls: number;   // per month, -1 = unlimited
}

/**
 * Get organization's current quota usage
 */
export async function getOrganizationQuota(organizationId: string): Promise<OrganizationQuota | null> {
  const quota = await prisma.$queryRaw<OrganizationQuota[]>`
    SELECT 
      organization_id as "organizationId",
      users_count as "usersCount",
      products_count as "productsCount",
      sales_count as "salesCount",
      storage_used as "storageUsed",
      api_calls_count as "apiCallsCount",
      period_start as "periodStart",
      period_end as "periodEnd"
    FROM organization_quotas
    WHERE organization_id = ${organizationId}::uuid
  `;

  return quota[0] || null;
}

/**
 * Get organization's plan limits
 */
export async function getPlanLimits(organizationId: string): Promise<PlanLimits | null> {
  const result = await prisma.$queryRaw<any[]>`
    SELECT p.limits
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.organization_id = ${organizationId}::uuid
      AND s.status IN ('active', 'trialing')
  `;

  if (!result || result.length === 0) {
    // Default free plan limits
    return {
      users: 1,
      products: 100,
      sales: -1,
      storage: 1,
      apiCalls: 1000
    };
  }

  return result[0].limits as PlanLimits;
}

/**
 * Check if organization has reached a specific limit
 */
export async function checkQuota(
  organizationId: string,
  resource: keyof Omit<OrganizationQuota, 'organizationId' | 'periodStart' | 'periodEnd'>
): Promise<{ allowed: boolean; current: number; limit: number; percentage: number }> {
  const quota = await getOrganizationQuota(organizationId);
  const limits = await getPlanLimits(organizationId);

  if (!quota || !limits) {
    return { allowed: true, current: 0, limit: -1, percentage: 0 };
  }

  // Map resource names to limit keys
  const limitMap: Record<string, keyof PlanLimits> = {
    usersCount: 'users',
    productsCount: 'products',
    salesCount: 'sales',
    storageUsed: 'storage',
    apiCallsCount: 'apiCalls'
  };

  const limitKey = limitMap[resource];
  const limit = limits[limitKey];
  const current = quota[resource] as number;

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current, limit, percentage: 0 };
  }

  // For storage, convert bytes to GB
  const currentValue = resource === 'storageUsed' ? current / (1024 * 1024 * 1024) : current;
  const allowed = currentValue < limit;
  const percentage = (currentValue / limit) * 100;

  return { allowed, current: currentValue, limit, percentage };
}

/**
 * Increment usage counter for a resource
 */
export async function incrementUsage(
  organizationId: string,
  resource: keyof Omit<OrganizationQuota, 'organizationId' | 'periodStart' | 'periodEnd'>,
  amount: number = 1
): Promise<void> {
  const columnMap: Record<string, string> = {
    usersCount: 'users_count',
    productsCount: 'products_count',
    salesCount: 'sales_count',
    storageUsed: 'storage_used',
    apiCallsCount: 'api_calls_count'
  };

  const column = columnMap[resource];

  await prisma.$queryRawUnsafe(`
    UPDATE organization_quotas
    SET ${column} = ${column} + ${amount},
        updated_at = NOW()
    WHERE organization_id = '${organizationId}'::uuid
  `);
}

/**
 * Decrement usage counter for a resource
 */
export async function decrementUsage(
  organizationId: string,
  resource: keyof Omit<OrganizationQuota, 'organizationId' | 'periodStart' | 'periodEnd'>,
  amount: number = 1
): Promise<void> {
  const columnMap: Record<string, string> = {
    usersCount: 'users_count',
    productsCount: 'products_count',
    salesCount: 'sales_count',
    storageUsed: 'storage_used',
    apiCallsCount: 'api_calls_count'
  };

  const column = columnMap[resource];

  await prisma.$queryRawUnsafe(`
    UPDATE organization_quotas
    SET ${column} = GREATEST(${column} - ${amount}, 0),
        updated_at = NOW()
    WHERE organization_id = '${organizationId}'::uuid
  `);
}

/**
 * Reset monthly usage counters
 */
export async function resetMonthlyUsage(organizationId: string): Promise<void> {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await prisma.$queryRaw`
    UPDATE organization_quotas
    SET sales_count = 0,
        api_calls_count = 0,
        period_start = ${now},
        period_end = ${nextMonth},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}::uuid
  `;
}

/**
 * Get usage percentage for a resource
 */
export async function getUsagePercentage(
  organizationId: string,
  resource: keyof Omit<OrganizationQuota, 'organizationId' | 'periodStart' | 'periodEnd'>
): Promise<number> {
  const check = await checkQuota(organizationId, resource);
  return check.percentage;
}

/**
 * Middleware to check quota before allowing operation
 */
export function requireQuota(
  resource: keyof Omit<OrganizationQuota, 'organizationId' | 'periodStart' | 'periodEnd'>,
  increment: boolean = true
) {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return next(createError('Organization ID required', 400));
    }

    // Check if quota allows this operation
    const check = await checkQuota(organizationId, resource);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'Quota limit reached',
        code: 'QUOTA_EXCEEDED',
        resource,
        current: check.current,
        limit: check.limit,
        percentage: check.percentage,
        message: `You have reached your ${resource} limit. Please upgrade your plan.`
      });
    }

    // Warn if approaching limit (80%)
    if (check.percentage >= 80 && check.percentage < 100) {
      res.setHeader('X-Quota-Warning', 'true');
      res.setHeader('X-Quota-Percentage', check.percentage.toString());
    }

    // Increment usage if requested
    if (increment) {
      // Store increment function to be called after successful operation
      (req as any).incrementQuota = async () => {
        await incrementUsage(organizationId, resource);
      };
    }

    next();
  };
}

/**
 * Middleware to track API calls
 */
export function trackApiCall() {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    const organizationId = req.user?.organizationId;

    if (organizationId) {
      // Increment API call counter asynchronously (don't block request)
      incrementUsage(organizationId, 'apiCallsCount').catch(err => {
        console.error('Failed to track API call:', err);
      });
    }

    next();
  };
}

/**
 * Get quota alerts for organization
 */
export async function getQuotaAlerts(organizationId: string): Promise<Array<{
  resource: string;
  current: number;
  limit: number;
  percentage: number;
  level: 'warning' | 'critical';
}>> {
  const resources: Array<keyof Omit<OrganizationQuota, 'organizationId' | 'periodStart' | 'periodEnd'>> = [
    'usersCount',
    'productsCount',
    'salesCount',
    'storageUsed',
    'apiCallsCount'
  ];

  const alerts: Array<any> = [];

  for (const resource of resources) {
    const check = await checkQuota(organizationId, resource);
    
    if (check.percentage >= 80) {
      alerts.push({
        resource,
        current: check.current,
        limit: check.limit,
        percentage: check.percentage,
        level: check.percentage >= 95 ? 'critical' : 'warning'
      });
    }
  }

  return alerts;
}

/**
 * Initialize quota tracking for new organization
 */
export async function initializeOrganizationQuota(organizationId: string): Promise<void> {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await prisma.$queryRaw`
    INSERT INTO organization_quotas (
      organization_id, period_start, period_end
    ) VALUES (
      ${organizationId}::uuid,
      ${now},
      ${nextMonth}
    )
    ON CONFLICT (organization_id) DO NOTHING
  `;
}
