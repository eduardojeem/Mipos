import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requireRole, requireAnyRole } from '../middleware/enhanced-auth';
import { apiRateLimit } from '../middleware/rate-limiter';

const router = Router();

// Validation schemas
const createSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  planId: z.string().uuid(),
  trialDays: z.number().min(0).optional()
});

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing', 'paused']).optional(),
  cancelAtPeriodEnd: z.boolean().optional()
});

// Get all subscriptions (SUPER_ADMIN only)
router.get('/', requireRole('SUPER_ADMIN'), apiRateLimit, asyncHandler(async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  let whereClause = '';
  if (status) {
    whereClause = `WHERE s.status = '${status}'`;
  }

  const subscriptions = await prisma.$queryRawUnsafe(`
    SELECT 
      s.id,
      s.organization_id as "organizationId",
      s.plan_id as "planId",
      s.status,
      s.current_period_start as "currentPeriodStart",
      s.current_period_end as "currentPeriodEnd",
      s.cancel_at_period_end as "cancelAtPeriodEnd",
      s.canceled_at as "canceledAt",
      s.trial_start as "trialStart",
      s.trial_end as "trialEnd",
      s.created_at as "createdAt",
      o.name as "organizationName",
      o.slug as "organizationSlug",
      p.display_name as "planName",
      p.price as "planPrice",
      p.interval as "planInterval"
    FROM subscriptions s
    JOIN organizations o ON s.organization_id = o.id
    JOIN plans p ON s.plan_id = p.id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ${parseInt(limit as string)} OFFSET ${skip}
  `);

  const total = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
    SELECT COUNT(*)::int as count
    FROM subscriptions s
    ${whereClause}
  `);

  res.json({
    success: true,
    data: subscriptions,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: Number(total[0].count),
      pages: Math.ceil(Number(total[0].count) / parseInt(limit as string))
    }
  });
}));

// Get subscription by organization ID
router.get('/organization/:organizationId', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const user = (req as EnhancedAuthenticatedRequest).user;

  // If not SUPER_ADMIN, verify user belongs to organization
  if (!user?.roles.some(r => r.name === 'SUPER_ADMIN')) {
    if (user?.organizationId !== organizationId) {
      throw createError('Unauthorized', 403);
    }
  }

  const subscription = await prisma.$queryRaw<any[]>`
    SELECT 
      s.id,
      s.organization_id as "organizationId",
      s.plan_id as "planId",
      s.status,
      s.current_period_start as "currentPeriodStart",
      s.current_period_end as "currentPeriodEnd",
      s.cancel_at_period_end as "cancelAtPeriodEnd",
      s.canceled_at as "canceledAt",
      s.trial_start as "trialStart",
      s.trial_end as "trialEnd",
      s.created_at as "createdAt",
      p.display_name as "planName",
      p.price as "planPrice",
      p.interval as "planInterval",
      p.features as "planFeatures",
      p.limits as "planLimits"
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.organization_id = ${organizationId}::uuid
  `;

  if (!subscription || subscription.length === 0) {
    throw createError('Subscription not found', 404);
  }

  res.json({
    success: true,
    data: subscription[0]
  });
}));

// Create subscription
router.post('/', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const data = createSubscriptionSchema.parse(req.body);

  // Check if organization already has a subscription
  const existing = await prisma.$queryRaw<any[]>`
    SELECT id FROM subscriptions WHERE organization_id = ${data.organizationId}::uuid
  `;

  if (existing && existing.length > 0) {
    throw createError('Organization already has a subscription', 400);
  }

  // Get plan details
  const plan = await prisma.$queryRaw<any[]>`
    SELECT trial_days FROM plans WHERE id = ${data.planId}::uuid
  `;

  if (!plan || plan.length === 0) {
    throw createError('Plan not found', 404);
  }

  const trialDays = data.trialDays ?? plan[0].trial_days ?? 0;
  const now = new Date();
  const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const subscription = await prisma.$queryRaw`
    INSERT INTO subscriptions (
      organization_id, plan_id, status, 
      current_period_start, current_period_end,
      trial_start, trial_end
    ) VALUES (
      ${data.organizationId}::uuid,
      ${data.planId}::uuid,
      ${trialDays > 0 ? 'trialing' : 'active'},
      ${now},
      ${periodEnd},
      ${trialDays > 0 ? now : null},
      ${trialEnd}
    )
    RETURNING *
  `;

  // Initialize quota tracking
  await prisma.$queryRaw`
    INSERT INTO organization_quotas (
      organization_id, period_start, period_end
    ) VALUES (
      ${data.organizationId}::uuid,
      ${now},
      ${periodEnd}
    )
    ON CONFLICT (organization_id) DO NOTHING
  `;

  res.status(201).json({
    success: true,
    data: subscription[0]
  });
}));

// Update subscription (change plan, cancel, etc.)
router.put('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateSubscriptionSchema.parse(req.body);

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.planId) {
    updates.push(`plan_id = $${paramIndex++}::uuid`);
    values.push(data.planId);
  }
  if (data.status) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
    
    if (data.status === 'canceled') {
      updates.push(`canceled_at = NOW()`);
    }
  }
  if (data.cancelAtPeriodEnd !== undefined) {
    updates.push(`cancel_at_period_end = $${paramIndex++}`);
    values.push(data.cancelAtPeriodEnd);
  }

  if (updates.length === 0) {
    throw createError('No fields to update', 400);
  }

  values.push(id);
  const query = `
    UPDATE subscriptions 
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}::uuid
    RETURNING *
  `;

  const result = await prisma.$queryRawUnsafe(query, ...values);

  res.json({
    success: true,
    data: result[0]
  });
}));

// Cancel subscription
router.post('/:id/cancel', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { immediate = false } = req.body;

  if (immediate) {
    await prisma.$queryRaw`
      UPDATE subscriptions 
      SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
  } else {
    await prisma.$queryRaw`
      UPDATE subscriptions 
      SET cancel_at_period_end = true, updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
  }

  res.json({
    success: true,
    message: immediate ? 'Subscription canceled immediately' : 'Subscription will be canceled at period end'
  });
}));

// Reactivate subscription
router.post('/:id/reactivate', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.$queryRaw`
    UPDATE subscriptions 
    SET status = 'active', cancel_at_period_end = false, canceled_at = NULL, updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  res.json({
    success: true,
    message: 'Subscription reactivated successfully'
  });
}));

// Get subscription usage/quotas
router.get('/:id/usage', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get subscription and organization
  const subscription = await prisma.$queryRaw<any[]>`
    SELECT organization_id FROM subscriptions WHERE id = ${id}::uuid
  `;

  if (!subscription || subscription.length === 0) {
    throw createError('Subscription not found', 404);
  }

  const orgId = subscription[0].organization_id;

  // Get current usage
  const usage = await prisma.$queryRaw`
    SELECT 
      users_count as "usersCount",
      products_count as "productsCount",
      sales_count as "salesCount",
      storage_used as "storageUsed",
      api_calls_count as "apiCallsCount",
      period_start as "periodStart",
      period_end as "periodEnd"
    FROM organization_quotas
    WHERE organization_id = ${orgId}::uuid
  `;

  // Get plan limits
  const plan = await prisma.$queryRaw`
    SELECT p.limits
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ${id}::uuid
  `;

  res.json({
    success: true,
    data: {
      usage: usage[0] || {},
      limits: plan[0]?.limits || {}
    }
  });
}));

export default router;
