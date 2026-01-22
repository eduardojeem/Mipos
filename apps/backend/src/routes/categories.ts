import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';

const router = express.Router();

// Enhanced validation schemas with better security
const createCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long')
    .transform(val => sanitize.string(val)),
  description: z.string()
    .max(500, 'Description too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
});

const updateCategorySchema = createCategorySchema.partial();

const enhancedQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 10;
    return Math.min(Math.max(parsed, 1), 100);
  }),
  search: z.string()
    .max(100, 'Search query too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
}).refine(data => {
  return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
}, {
  message: 'Page must be >= 1, limit must be between 1 and 100'
});

// PUBLIC ENDPOINT - Get all categories for catalog (no authentication required)
router.get('/public', 
  validateQuery(enhancedQuerySchema),
  asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    prisma.category.count({ where })
  ]);

  res.json({
    data: categories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get all categories with pagination (protected)
router.get('/', 
  validateQuery(enhancedQuerySchema),
  asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    prisma.category.count({ where })
  ]);

  res.json({
    categories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get all categories (simple list for dropdowns)
router.get('/list', asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  res.json({ categories });
}));

// Get category by ID
router.get('/:id', 
  validateParams(commonSchemas.id),
  asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          sku: true,
          salePrice: true,
          stockQuantity: true,
          images: true
        },
        orderBy: { name: 'asc' }
      },
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  if (!category) {
    throw createError('Category not found', 404);
  }

  res.json({ category });
}));

// Create category (Admin only)
router.post('/', 
  enhancedAuthMiddleware,
  requirePermission('categories', 'create'),
  validateBody(createCategorySchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const data = req.body;

  const category = await prisma.category.create({
    data,
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  res.status(201).json({ category });
}));

// Update category
router.put('/:id', 
  enhancedAuthMiddleware,
  requirePermission('categories', 'update'),
  validateParams(commonSchemas.id),
  validateBody(updateCategorySchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const data = req.body;

  // Check if category exists
  const existingCategory = await prisma.category.findUnique({
    where: { id }
  });

  if (!existingCategory) {
    throw createError('Category not found', 404);
  }

  const category = await prisma.category.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  res.json({ category });
}));

// Delete category (Admin only)
router.delete('/:id', 
  enhancedAuthMiddleware,
  requirePermission('categories', 'delete'),
  validateParams(commonSchemas.id),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  if (!category) {
    throw createError('Category not found', 404);
  }

  // Check if category has products
  if (category._count.products > 0) {
    throw createError('Cannot delete category with existing products', 400);
  }

  await prisma.category.delete({
    where: { id }
  });

  res.json({ message: 'Category deleted successfully' });
}));

export default router;