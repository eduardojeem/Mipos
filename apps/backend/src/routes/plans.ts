import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { requireRole } from '../middleware/enhanced-auth';
import { apiRateLimit } from '../middleware/rate-limiter';

const router = Router();

// Validation schemas
const createPlanSchema = z.object({
  name: z.string().min(2),
  displayName: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  interval: z.enum(['monthly', 'yearly', 'quarterly']),
  trialDays: z.number().min(0).default(0),
  features: z.array(z.string()).default([]),
  limits: z.object({
    users: z.number().default(-1), // -1 = unlimited
    products: z.number().default(-1),
    sales: z.number().default(-1),
    storage: z.number().default(5) // GB
  }).default({})
});

const updatePlanSchema = createPlanSchema.partial();

// Get all plans (public endpoint)
router.get('/', apiRateLimit, asyncHandler(async (req, res) => {
  const plans = await prisma.$queryRaw`
    SELECT 
      id,
      name,
      display_name as "displayName",
      description,
      price,
      currency,
      interval,
      trial_days as "trialDays",
      is_active as "isActive",
      features,
      limits,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM plans
    WHERE is_active = true
    ORDER BY price ASC
  `;

  res.json({
    success: true,
    data: plans
  });
}));

// Get plan by ID
router.get('/:id', apiRateLimit, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await prisma.$queryRaw<any[]>`
    SELECT 
      id,
      name,
      display_name as "displayName",
      description,
      price,
      currency,
      interval,
      trial_days as "trialDays",
      is_active as "isActive",
      features,
      limits,
      metadata,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM plans
    WHERE id = ${id}::uuid
  `;

  if (!plan || plan.length === 0) {
    throw createError('Plan not found', 404);
  }

  res.json({
    success: true,
    data: plan[0]
  });
}));

// Create plan (SUPER_ADMIN only)
router.post('/', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const data = createPlanSchema.parse(req.body);

  const result = await prisma.$queryRaw`
    INSERT INTO plans (
      name, display_name, description, price, currency, interval, 
      trial_days, features, limits
    ) VALUES (
      ${data.name},
      ${data.displayName},
      ${data.description || null},
      ${data.price},
      ${data.currency},
      ${data.interval},
      ${data.trialDays},
      ${JSON.stringify(data.features)}::jsonb,
      ${JSON.stringify(data.limits)}::jsonb
    )
    RETURNING *
  `;

  res.status(201).json({
    success: true,
    data: result[0]
  });
}));

// Update plan (SUPER_ADMIN only)
router.put('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updatePlanSchema.parse(req.body);

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.displayName) {
    updates.push(`display_name = $${paramIndex++}`);
    values.push(data.displayName);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.price !== undefined) {
    updates.push(`price = $${paramIndex++}`);
    values.push(data.price);
  }
  if (data.features) {
    updates.push(`features = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(data.features));
  }
  if (data.limits) {
    updates.push(`limits = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(data.limits));
  }

  if (updates.length === 0) {
    throw createError('No fields to update', 400);
  }

  values.push(id);
  const query = `
    UPDATE plans 
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

// Delete plan (soft delete)
router.delete('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.$queryRaw`
    UPDATE plans 
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  res.json({
    success: true,
    message: 'Plan deactivated successfully'
  });
}));

export default router;
