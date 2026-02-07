import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission, requireAnyPermission, hasPermission } from '../middleware/enhanced-auth';
import { criticalOperationsRateLimit, apiRateLimit } from '../middleware/rate-limiter';
import { loyaltyService } from '../services/loyalty';

const router = express.Router();

// Validation schemas
const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive')
});

const createSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']).default('CASH'),
  discount: z.number().min(0).default(0),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
  tax: z.number().min(0).default(0),
  notes: z.string().optional()
});

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.string().optional(),
  paymentMethod: z.string().optional()
});

// Get recent sales (requires sales:read permission)
router.get('/recent', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const organizationId = req.user!.organizationId;
  
  try {
    const recentSales = await prisma.sale.findMany({
      where: {
        organizationId
      },
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: recentSales
    });
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ventas recientes'
    });
  }
}));

// Get all sales with pagination and filters (requires sales:read permission)
router.get('/', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { page, limit, startDate, endDate, customerId, paymentMethod } = querySchema.parse(req.query);
  const organizationId = req.user!.organizationId;
  const skip = (page - 1) * limit;

  const where: any = {
    organizationId
  };

  // Parse dates safely to avoid invalid Date causing Prisma errors
  const parseSafeDate = (val?: string) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const start = parseSafeDate(startDate);
  const end = parseSafeDate(endDate);

  if (start && end) {
    where.date = { gte: start, lte: end };
  } else if (start) {
    where.date = { gte: start };
  } else if (end) {
    where.date = { lte: end };
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        saleItems: {
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
    prisma.sale.count({ where })
  ]);

  res.json({
    sales,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get sale by ID (requires sales:read permission)
router.get('/:id', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const organizationId = req.user!.organizationId;

  const sale = await prisma.sale.findFirst({
    where: { 
      id,
      organizationId
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      },
      saleItems: {
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

  if (!sale) {
    throw createError('Sale not found', 404);
  }

  res.json({ sale });
}));

// Create sale (requires sales:create permission) - Rate limited for critical operations
router.post('/', criticalOperationsRateLimit, requirePermission('sales', 'create'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { customerId, items, paymentMethod, discount, discountType, tax, notes } = createSaleSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  // Validate cash session for cash payments
  if (paymentMethod === 'CASH') {
    const existingOpen = await prisma.cashSession.findFirst({
      where: { organizationId, status: 'OPEN' }
    });
    if (!existingOpen) {
      throw createError('La sesión de caja está cerrada en tu organización. Ábrela para aceptar efectivo.', 400);
    }
  }

  // Validate discount based on type
  if (discountType === 'PERCENTAGE' && discount > 100) {
    throw createError('Percentage discount cannot exceed 100%', 400);
  }

  // Validate products belong to organization and check stock
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      organizationId
    }
  });

  if (products.length !== productIds.length) {
    throw createError('One or more products not found or do not belong to your organization', 404);
  }

  // Check stock availability
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      throw createError(`Product ${item.productId} not found`, 404);
    }
    if (product.stockQuantity < item.quantity) {
      throw createError(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`, 400);
    }
  }

  // Validate customer belongs to organization (if provided)
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { 
        id: customerId,
        organizationId
      }
    });
    if (!customer) {
      throw createError('Customer not found or does not belong to your organization', 404);
    }
  }

  // Calculate totals with improved discount logic
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  let discountAmount = 0;
  if (discountType === 'PERCENTAGE') {
    discountAmount = (subtotal * discount) / 100;
  } else if (discountType === 'FIXED_AMOUNT') {
    discountAmount = Math.min(discount, subtotal); // Cannot exceed subtotal
  }
  
  const taxAmount = tax || 0;
  const total = subtotal - discountAmount + taxAmount;

  // Create sale transaction with explicit isolation level and row-level locking
  const sale = await prisma.$transaction(async (tx) => {
    // Lock all involved product rows to ensure consistent stock checks under concurrency
    const lockedProducts: Array<{ id: string; stock_quantity: number }> = await tx.$queryRaw`
      SELECT id, stock_quantity
      FROM products
      WHERE id IN (${items.map(i => i.productId)})
      FOR UPDATE
    `;

    // Build a quick lookup for locked stock quantities
    const stockById = new Map<string, number>();
    for (const p of lockedProducts) stockById.set(p.id, p.stock_quantity);

    // Validate stock again within the transaction under lock
    for (const item of items) {
      const current = stockById.get(item.productId);
      if (current == null) {
        throw createError(`Product ${item.productId} not found`, 404);
      }
      if (current < item.quantity) {
        throw createError(`Insufficient stock for product ${item.productId}. Available: ${current}, Required: ${item.quantity}`, 400);
      }
    }
    
    // Create sale with organizationId
    const newSale = await tx.sale.create({
      data: {
        organizationId,
        userId,
        customerId: customerId || null,
        subtotal,
        discount: discountAmount,
        discountType: discountType as any,
        tax: taxAmount,
        total,
        paymentMethod: paymentMethod as any,
        notes: notes || null,
        date: new Date()
      }
    });

    // Create sale items and update stock
    for (const item of items) {
      // Create sale item
      await tx.saleItem.create({
        data: {
          saleId: newSale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }
      });

      // Update product stock under the same transaction/lock to prevent race conditions
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity
          }
        }
      });

      // Create inventory movement
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Sale #${newSale.id}`,
          referenceId: newSale.id
        }
      });
    }

    // Update customer statistics if customer is provided
    if (customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalPurchases: {
            increment: total
          },
          lastPurchase: new Date()
        }
      });
    }

    // Create cash movement for cash sales
    if (paymentMethod === 'CASH') {
      await createCashMovementForSale(tx, newSale.id, total, 'SALE', userId, organizationId);
    }

    return newSale;
  }, { isolationLevel: 'RepeatableRead' });

  // Process loyalty points if customer is enrolled
  if (customerId) {
    try {
      // Get customer's loyalty program(s)
      const customerLoyalty = await loyaltyService.getCustomerLoyalty(customerId);
      const programId = Array.isArray(customerLoyalty)
        ? customerLoyalty[0]?.programId
        : (customerLoyalty as any)?.programId;
      
      if (programId) {
        // Add points for this purchase
        await loyaltyService.addPointsForPurchase(
          customerId,
          programId,
          sale.id,
          total,
          userId
        );
      }
    } catch (loyaltyError) {
      // Log loyalty error but don't fail the sale
      console.error('Error processing loyalty points:', loyaltyError);
    }
  }

  // Fetch complete sale data
  const completeSale = await prisma.sale.findUnique({
    where: { id: sale.id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      },
      saleItems: {
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
    sale: completeSale,
    summary: {
      subtotal,
      discount: discountAmount,
      discountType,
      tax: taxAmount,
      total,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
    }
  });
}));// Helper function to create cash movement for sales
async function createCashMovementForSale(tx: any, saleId: string, amount: number, type: 'SALE' | 'RETURN', userId: string, organizationId: string) {
  const openSession = await tx.cashSession.findFirst({
    where: { status: 'OPEN', organizationId }
  });

  if (!openSession) {
    // No open session, skip cash movement creation
    return null;
  }

  const movement = await tx.cashMovement.create({
    data: {
      organizationId,
      sessionId: openSession.id,
      type,
      amount,
      reason: `${type === 'SALE' ? 'Venta' : 'Devolución'} #${saleId}`,
      referenceType: 'SALE',
      referenceId: saleId,
      createdBy: userId
    }
  });

  return movement;
}
}));



// Get today's sales summary
router.get('/summary/today', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [salesCount, totalRevenue, salesByPaymentMethod] = await Promise.all([
    prisma.sale.count({
      where: {
        organizationId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        total: true
      }
    }),
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: {
        organizationId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    })
  ]);

  res.json({
    date: today.toISOString().split('T')[0],
    salesCount,
    totalRevenue: totalRevenue._sum.total || 0,
    salesByPaymentMethod
  });
}));

// Get sales analytics
router.get('/analytics/dashboard', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todaySales, weekSales, monthSales, topProducts] = await Promise.all([
    // Today's sales
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0))
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // This week's sales
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: startOfWeek
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // This month's sales
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: startOfMonth
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // Top selling products this month
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          organizationId,
          date: {
            gte: startOfMonth
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    })
  ]);

  // Get product details for top products
  const topProductsWithDetails = await Promise.all(
    topProducts.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          salePrice: true
        }
      });
      if (!product) {
        return {
          id: item.productId,
          name: 'Unknown',
          sku: undefined,
          salePrice: undefined,
          totalSold: item._sum.quantity
        };
      }
      return {
        id: (product as any).id,
        name: (product as any).name,
        sku: (product as any).sku,
        salePrice: (product as any).salePrice,
        totalSold: item._sum.quantity
      };
    })
  );

  res.json({
    today: {
      revenue: todaySales._sum.total || 0,
      transactions: todaySales._count || 0
    },
    week: {
      revenue: weekSales._sum.total || 0,
      transactions: weekSales._count || 0
    },
    month: {
      revenue: monthSales._sum.total || 0,
      transactions: monthSales._count || 0
    },
    topProducts: topProductsWithDetails
  });
}));

export default router;
