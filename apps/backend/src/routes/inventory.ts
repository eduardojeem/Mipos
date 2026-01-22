import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission, requireAnyPermission, hasPermission } from '../middleware/enhanced-auth';
import { criticalOperationsRateLimit, apiRateLimit } from '../middleware/rate-limiter';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';
// Removed MovementType import as enum isn't available via Supabase adapter

const router = express.Router();

// Enhanced validation schemas with better security
const adjustmentSchema = z.object({
  productId: z.string()
    .uuid('Invalid product ID format')
    .transform(val => sanitize.string(val)),
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(-999999, 'Quantity too low')
    .max(999999, 'Quantity too high'),
  reason: z.string()
    .min(1, 'Reason is required')
    .max(500, 'Reason too long')
    .transform(val => sanitize.string(val))
});

const bulkAdjustmentSchema = z.object({
  adjustments: z.array(adjustmentSchema)
    .min(1, 'At least one adjustment is required')
    .max(50, 'Too many adjustments at once')
});

const enhancedQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? Math.max(1, parseInt(val) || 1) : 1),
  limit: z.string()
    .optional()
    .transform(val => val ? Math.min(Math.max(1, parseInt(val) || 10), 100) : 10),
  productId: z.string()
    .uuid('Invalid product ID format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  type: z.enum(['SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN'])
    .optional(),
  startDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
  endDate: z.string()
    .datetime('Invalid end date format')
    .optional(),
  since: z.string().datetime().optional(),
  fields: z.string().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date'
});

const productMovementQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? Math.max(1, parseInt(val) || 1) : 1),
  limit: z.string()
    .optional()
    .transform(val => val ? Math.min(Math.max(1, parseInt(val) || 20), 100) : 20)
});

router.get('/movements-legacy', 
  requirePermission('inventory', 'read'), 
  validateQuery(enhancedQuerySchema),
  asyncHandler(async (req, res) => {
  const { page, limit, productId, type, startDate, endDate, since, fields } = req.query as any;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (productId) where.productId = productId;
  if (type) where.type = type;
  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  } else if (startDate) {
    where.createdAt = { gte: new Date(startDate) };
  } else if (endDate) {
    where.createdAt = { lte: new Date(endDate) };
  }
  if (since) {
    const dt = new Date(String(since));
    if (!Number.isNaN(dt.getTime())) where.updatedAt = { gt: dt };
  }

  const allowed = new Set(['id','productId','type','quantity','reason','createdAt','updatedAt']);
  const selected: any = {};
  if (typeof fields === 'string' && fields.trim()) {
    fields.split(',').map((f: string) => f.trim()).forEach((f: string) => {
      if (allowed.has(f)) (selected as any)[f] = true;
    });
  }
  const useSelect = Object.keys(selected).length > 0;

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      ...(useSelect ? { select: selected } : {
        select: { id: true, productId: true, type: true, quantity: true, createdAt: true, updatedAt: true }
      }),
      orderBy: { updatedAt: 'asc' },
      skip,
      take: limit
    }),
    prisma.inventoryMovement.count({ where })
  ]);

  let nextSince = since || undefined;
  if (Array.isArray(movements) && movements.length > 0) {
    const maxUpdated = movements
      .map((r: any) => new Date(r.updatedAt || r.createdAt || Date.now()).getTime())
      .reduce((a: number, b: number) => Math.max(a, b), 0);
    if (maxUpdated) nextSince = new Date(maxUpdated).toISOString();
  }

  res.json({ data: movements, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, sync: { nextSince } });
}))

// Get inventory movements with pagination and filters (requires inventory:read permission)
router.get('/movements', 
  requirePermission('inventory', 'read'), 
  validateQuery(enhancedQuerySchema),
  asyncHandler(async (req, res) => {
  const { page, limit, productId, type, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (productId) {
    where.productId = productId;
  }

  if (type) {
    where.type = type;
  }

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  } else if (startDate) {
    where.createdAt = {
      gte: new Date(startDate)
    };
  } else if (endDate) {
    where.createdAt = {
      lte: new Date(endDate)
    };
  }

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.inventoryMovement.count({ where })
  ]);

  res.json({
    movements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get inventory summary (requires inventory:read permission)
router.get('/summary', requirePermission('inventory', 'read'), asyncHandler(async (req, res) => {
  const [totalProducts, lowStockProducts, outOfStockProducts, totalValue] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({
      where: {
        stockQuantity: {
          lte: 'min_stock',
          gt: 0
        }
      }
    }),
    prisma.product.count({
      where: {
        stockQuantity: 0
      }
    }),
    prisma.product.aggregate({
      _sum: {
        stockQuantity: true
      }
    })
  ]);

  // Calculate total inventory value
  const products = await prisma.product.findMany({
    select: {
      stockQuantity: true,
      costPrice: true
    }
  });

  const inventoryValue = products.reduce((sum, product) => {
    return sum + (product.stockQuantity * Number(product.costPrice));
  }, 0);

  res.json({
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    totalQuantity: totalValue._sum.stockQuantity || 0,
    inventoryValue
  });
}));

// Get products with low stock
router.get('/low-stock', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    where: {
      stockQuantity: {
        lte: 'min_stock'
      }
    },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      stockQuantity: 'asc'
    }
  });

  res.json({ products });
}));

// Get products out of stock (requires inventory:read permission)
router.get('/out-of-stock', requirePermission('inventory', 'read'), asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    where: {
      stockQuantity: 0
    },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  res.json({ products });
}));

// Manual stock adjustment (requires inventory:update permission) - Rate limited for critical operations
router.post('/adjust', 
  criticalOperationsRateLimit, 
  requirePermission('inventory', 'update'), 
  validateBody(adjustmentSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { productId, quantity, reason } = req.body;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw createError('Product not found', 404);
  }

  const newStock = product.stockQuantity + quantity;

  if (newStock < 0) {
    throw createError('Adjustment would result in negative stock', 400);
  }

  // Perform adjustment transaction
  const [updatedProduct, movement] = await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newStock }
    }),
    prisma.inventoryMovement.create({
      data: {
        productId,
        type: 'ADJUSTMENT',
        quantity: Math.abs(quantity),
        reason
      }
    })
  ]);

  res.json({
    product: updatedProduct,
    movement,
    message: 'Stock adjusted successfully'
  });
}));

// Bulk stock adjustment (requires inventory:update permission) - Rate limited for critical operations
router.post('/bulk-adjust', 
  criticalOperationsRateLimit, 
  requirePermission('inventory', 'update'), 
  validateBody(bulkAdjustmentSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { adjustments } = req.body;

  const results = [];

  for (const adjustment of adjustments) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: adjustment.productId }
      });

      if (!product) {
        results.push({ 
          productId: adjustment.productId, 
          error: 'Product not found' 
        });
        continue;
      }

      const newStock = product.stockQuantity + adjustment.quantity;

      if (newStock < 0) {
        results.push({ 
          productId: adjustment.productId, 
          error: 'Adjustment would result in negative stock' 
        });
        continue;
      }

      await prisma.$transaction([
        prisma.product.update({
          where: { id: adjustment.productId },
          data: { stockQuantity: newStock }
        }),
        prisma.inventoryMovement.create({
          data: {
            productId: adjustment.productId,
            type: 'ADJUSTMENT',
            quantity: Math.abs(adjustment.quantity),
            reason: adjustment.reason
          }
        })
      ]);

      results.push({ 
        productId: adjustment.productId, 
        success: true, 
        newStock,
        adjustment: adjustment.quantity
      });
    } catch (error) {
      results.push({ 
        productId: adjustment.productId, 
        error: 'Failed to adjust stock' 
      });
    }
  }

  res.json({ results });
}));

// Get inventory valuation report
router.get('/valuation', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  const valuation = products.map(product => {
    const costValue = product.stockQuantity * Number(product.costPrice);
    const saleValue = product.stockQuantity * Number(product.salePrice);
    const potentialProfit = saleValue - costValue;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category.name,
      stockQuantity: product.stockQuantity,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      costValue,
      saleValue,
      potentialProfit,
      profitMargin: saleValue > 0 ? (potentialProfit / saleValue) * 100 : 0
    };
  });

  const totals = valuation.reduce((acc, item) => {
    acc.totalCostValue += item.costValue;
    acc.totalSaleValue += item.saleValue;
    acc.totalPotentialProfit += item.potentialProfit;
    return acc;
  }, {
    totalCostValue: 0,
    totalSaleValue: 0,
    totalPotentialProfit: 0
  });

  res.json({
    products: valuation,
    summary: {
      ...totals,
      overallProfitMargin: totals.totalSaleValue > 0 
        ? (totals.totalPotentialProfit / totals.totalSaleValue) * 100 
        : 0
    }
  });
}));

// Get movement history for a specific product
router.get('/movements/:productId', 
  validateParams(commonSchemas.id),
  validateQuery(productMovementQuerySchema),
  asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sku: true,
      stockQuantity: true
    }
  });

  if (!product) {
    throw createError('Product not found', 404);
  }

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.inventoryMovement.count({ where: { productId } })
  ]);

  res.json({
    product,
    movements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

export default router;
