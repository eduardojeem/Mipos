import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requireRole } from '../middleware/enhanced-auth';
import { apiRateLimit } from '../middleware/rate-limiter';

const router = Router();

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE')
});

const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional()
});

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  search: z.string().optional(),
  status: z.string().optional()
});

// Get all organizations (SUPER_ADMIN only)
router.get('/', requireRole('SUPER_ADMIN'), apiRateLimit, asyncHandler(async (req, res) => {
  const { page, limit, search, status } = querySchema.parse(req.query);
  const skip = (page - 1) * limit;

  const where: any = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (status) {
    where.status = status;
  }

  const [organizations, total] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
        o.id,
        o.name,
        o.slug,
        o.status,
        o.created_at,
        o.updated_at,
        COUNT(DISTINCT u.id)::int as user_count,
        COUNT(DISTINCT p.id)::int as product_count,
        COUNT(DISTINCT c.id)::int as customer_count
      FROM organizations o
      LEFT JOIN users u ON u.organization_id = o.id
      LEFT JOIN products p ON p.organization_id = o.id
      LEFT JOIN customers c ON c.organization_id = o.id
      ${search ? prisma.$queryRaw`WHERE (o.name ILIKE ${`%${search}%`} OR o.slug ILIKE ${`%${search}%`})` : prisma.$queryRaw``}
      ${status ? prisma.$queryRaw`${search ? 'AND' : 'WHERE'} o.status = ${status}` : prisma.$queryRaw``}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.organization.count({ where })
  ]);

  res.json({
    success: true,
    data: organizations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get organization by ID
router.get('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true
        }
      },
      _count: {
        select: {
          users: true,
          products: true,
          customers: true,
          categories: true
        }
      }
    }
  });

  if (!organization) {
    throw createError('Organization not found', 404);
  }

  res.json({
    success: true,
    data: organization
  });
}));

// Create organization
router.post('/', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const data = createOrganizationSchema.parse(req.body);

  // Check if slug already exists
  const existing = await prisma.organization.findUnique({
    where: { slug: data.slug }
  });

  if (existing) {
    throw createError('Organization with this slug already exists', 400);
  }

  const organization = await prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      status: data.status as any
    }
  });

  res.status(201).json({
    success: true,
    data: organization
  });
}));

// Update organization
router.put('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateOrganizationSchema.parse(req.body);

  const organization = await prisma.organization.update({
    where: { id },
    data
  });

  res.json({
    success: true,
    data: organization
  });
}));

// Delete organization (soft delete by setting status to INACTIVE)
router.delete('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const organization = await prisma.organization.update({
    where: { id },
    data: { status: 'INACTIVE' }
  });

  res.json({
    success: true,
    message: 'Organization deactivated successfully',
    data: organization
  });
}));

// Get organization statistics
router.get('/:id/stats', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [salesStats, productStats, userStats] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total_sales,
        COALESCE(SUM(total), 0)::float as total_revenue,
        COALESCE(AVG(total), 0)::float as avg_sale
      FROM sales
      WHERE organization_id = ${id}::uuid
    `,
    prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total_products,
        COUNT(CASE WHEN is_active THEN 1 END)::int as active_products,
        COALESCE(SUM(stock_quantity), 0)::int as total_stock
      FROM products
      WHERE organization_id = ${id}::uuid
    `,
    prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total_users,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active_users
      FROM users
      WHERE organization_id = ${id}::uuid
    `
  ]);

  res.json({
    success: true,
    data: {
      sales: salesStats[0],
      products: productStats[0],
      users: userStats[0]
    }
  });
}));

export default router;
