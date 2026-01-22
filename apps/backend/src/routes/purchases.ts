import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission, requireAnyPermission, hasPermission } from '../middleware/enhanced-auth';
import { criticalOperationsRateLimit, apiRateLimit } from '../middleware/rate-limiter';

const router = express.Router();

// Validation schemas
const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0, 'Unit cost must be positive')
});

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional()
});

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  supplierId: z.string().optional()
});

// Get all purchases with pagination and filters (requires purchases:read permission)
router.get('/', requirePermission('purchases', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, startDate, endDate, supplierId } = querySchema.parse(req.query);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  } else if (startDate) {
    where.date = {
      gte: new Date(startDate)
    };
  } else if (endDate) {
    where.date = {
      lte: new Date(endDate)
    };
  }

  if (supplierId) {
    where.supplierId = supplierId;
  }

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        supplier: {
          select: {
            id: true,
            name: true,
            contactInfo: true
          }
        },
        purchaseItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit
    }),
    prisma.purchase.count({ where })
  ]);

  res.json({
    purchases,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get purchase by ID (requires purchases:read permission)
router.get('/:id', requirePermission('purchases', 'read'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      supplier: {
        select: {
          id: true,
          name: true,
          contactInfo: true
        }
      },
      purchaseItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              images: true
            }
          }
        }
      }
    }
  });

  if (!purchase) {
    throw createError('Purchase not found', 404);
  }

  res.json({ purchase });
}));

// Create purchase (requires purchases:create permission) - Rate limited for critical operations
router.post('/', criticalOperationsRateLimit, requirePermission('purchases', 'create'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { supplierId, items, notes } = createPurchaseSchema.parse(req.body);
  const userId = req.user!.id;

  // Validate supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId }
  });

  if (!supplier) {
    throw createError('Supplier not found', 404);
  }

  // Validate products exist
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      }
    }
  });

  if (products.length !== productIds.length) {
    throw createError('One or more products not found', 404);
  }

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  // Create purchase transaction
  const purchase = await prisma.$transaction(async (tx) => {
    // Create purchase
    const newPurchase = await tx.purchase.create({
      data: {
        userId,
        supplierId,
        total,
        date: new Date()
      }
    });

    // Create purchase items and update stock
    for (const item of items) {
      // Create purchase item
      await tx.purchaseItem.create({
        data: {
          purchaseId: newPurchase.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost
        }
      });

      // Update product stock and cost price
      const product = products.find(p => p.id === item.productId)!;
      const newStockQuantity = product.stockQuantity + item.quantity;
      
      // Calculate weighted average cost
      const currentValue = product.stockQuantity * Number(product.costPrice);
      const newValue = item.quantity * item.unitCost;
      const newCostPrice = newStockQuantity > 0 
        ? (currentValue + newValue) / newStockQuantity 
        : item.unitCost;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: newStockQuantity,
          costPrice: newCostPrice
        }
      });

      // Create inventory movement
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          reason: `Purchase #${newPurchase.id}`,
          referenceId: newPurchase.id
        }
      });
    }

    return newPurchase;
  });

  // Fetch complete purchase data
  const completePurchase = await prisma.purchase.findUnique({
    where: { id: purchase.id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      supplier: {
        select: {
          id: true,
          name: true,
          contactInfo: true
        }
      },
      purchaseItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true
            }
          }
        }
      }
    }
  });

  res.status(201).json({ 
    purchase: completePurchase,
    summary: {
      total,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
    }
  });
}));

// Get purchase statistics
router.get('/stats/overview', asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const [monthlyPurchases, yearlyPurchases, topSuppliers, recentPurchases] = await Promise.all([
    // This month's purchases
    prisma.purchase.aggregate({
      where: {
        date: {
          gte: startOfMonth
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // This year's purchases
    prisma.purchase.aggregate({
      where: {
        date: {
          gte: startOfYear
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // Top suppliers by purchase volume
    prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        date: {
          gte: startOfYear
        }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          total: 'desc'
        }
      },
      take: 5
    }),
    // Recent purchases
    prisma.purchase.findMany({
      include: {
        supplier: {
          select: {
            name: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    })
  ]);

  // Get supplier details for top suppliers
  const topSuppliersWithDetails = await Promise.all(
    topSuppliers.map(async (item) => {
      const supplier = await prisma.supplier.findUnique({
        where: { id: item.supplierId },
        select: {
          id: true,
          name: true
        }
      });
      return {
        id: supplier?.id ?? item.supplierId,
        name: supplier?.name ?? 'Unknown Supplier',
        totalPurchases: item._sum.total,
        purchaseCount: item._count.id
      };
    })
  );

  res.json({
    monthly: {
      total: monthlyPurchases._sum.total || 0,
      count: monthlyPurchases._count || 0
    },
    yearly: {
      total: yearlyPurchases._sum.total || 0,
      count: yearlyPurchases._count || 0
    },
    topSuppliers: topSuppliersWithDetails,
    recentPurchases
  });
}));

export default router;