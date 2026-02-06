import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
// Remove Prisma enums to avoid type errors with custom adapter
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';

// Helper function to create cash movement for returns
async function createCashMovementForReturn(tx: any, returnId: string, amount: number, refundMethod: string, userId: string) {
  // Only create cash movement for cash refunds
  if (refundMethod !== 'CASH') return null;

  // Get current open cash session
  const openSession = await tx.cashSession.findFirst({
    where: { status: 'OPEN' }
  });

  if (!openSession) {
    // No open session, skip cash movement creation
    return null;
  }

  // Create cash movement (negative amount for returns)
  const movement = await tx.cashMovement.create({
    data: {
      sessionId: openSession.id,
      type: 'RETURN',
      amount: -Math.abs(amount), // Negative for returns
      reason: `Devolución #${returnId}`,
      referenceType: 'RETURN',
      referenceId: returnId,
      createdBy: userId
    }
  });

  return movement;
}

const router = express.Router();

// Enhanced validation schemas with better security
const enhancedReturnItemSchema = z.object({
  originalSaleItemId: z.string()
    .uuid('Invalid original sale item ID format')
    .transform(val => sanitize.string(val)),
  productId: z.string()
    .uuid('Invalid product ID format')
    .transform(val => sanitize.string(val)),
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity too large'),
  unitPrice: z.number()
    .min(0, 'Unit price must be positive')
    .max(999999.99, 'Unit price too large'),
  reason: z.string()
    .max(500, 'Reason too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
});

const enhancedCreateReturnSchema = z.object({
  originalSaleId: z.string()
    .uuid('Invalid original sale ID format')
    .transform(val => sanitize.string(val)),
  customerId: z.string()
    .uuid('Invalid customer ID format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  items: z.array(enhancedReturnItemSchema)
    .min(1, 'At least one item is required')
    .max(50, 'Too many items in return'),
  reason: z.string()
    .min(1, 'Return reason is required')
    .max(1000, 'Return reason too long')
    .transform(val => sanitize.string(val)),
  refundMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER'])
    .default('CASH')
});

const enhancedUpdateReturnStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
});

const enhancedQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 10;
    return Math.min(Math.max(parsed, 1), 100);
  }),
  startDate: z.string()
    .datetime('Invalid start date format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  endDate: z.string()
    .datetime('Invalid end date format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  customerId: z.string()
    .uuid('Invalid customer ID format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'])
    .optional(),
  originalSaleId: z.string()
    .uuid('Invalid original sale ID format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
}, {
  message: 'Page must be >= 1, limit must be between 1 and 100, and start date must be before or equal to end date'
});

// Get all returns with pagination and filters
router.get('/', 
  enhancedAuthMiddleware,
  requirePermission('returns', 'read'),
  validateQuery(enhancedQuerySchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { page, limit, startDate, endDate, customerId, status, originalSaleId } = req.query;
  const pageNum = typeof page === 'number' ? page : (page ? parseInt(String(page), 10) : 1);
  const limitNum = typeof limit === 'number' ? limit : (limit ? parseInt(String(limit), 10) : 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  const toDate = (v: unknown) => new Date(String(v));
  if (startDate && endDate) {
    where.date = {
      gte: toDate(startDate),
      lte: toDate(endDate)
    };
  } else if (startDate) {
    where.date = {
      gte: toDate(startDate)
    };
  } else if (endDate) {
    where.date = {
      lte: toDate(endDate)
    };
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (status) {
    where.status = status;
  }

  if (originalSaleId) {
    where.originalSaleId = originalSaleId;
  }

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { date: 'desc' },
      include: {
        originalSale: {
          select: {
            id: true,
            date: true,
            total: true
          }
        },
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
        returnItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            },
            originalSaleItem: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true
              }
            }
          }
        }
      }
    }),
    prisma.return.count({ where })
  ]);

  const totalPages = Math.ceil(total / limitNum);

  res.json({
    returns,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  });
}));

// Get return by ID
router.get('/:id', 
  enhancedAuthMiddleware,
  requirePermission('returns', 'read'),
  validateParams(commonSchemas.id),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: {
      originalSale: {
        include: {
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
      },
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
      returnItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true
            }
          },
          originalSaleItem: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true
            }
          }
        }
      }
    }
  });

  if (!returnRecord) {
    throw createError('Return not found', 404);
  }

  res.json(returnRecord);
}));

// Create new return
router.post('/', 
  enhancedAuthMiddleware,
  requirePermission('returns', 'create'),
  validateBody(enhancedCreateReturnSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { originalSaleId, customerId, items, reason, refundMethod } = req.body;
  const userId = req.user!.id;

  // Verify original sale exists
  const originalSale = await prisma.sale.findUnique({
    where: { id: originalSaleId },
    include: {
      saleItems: {
        include: {
          returnItems: true
        }
      }
    }
  });

  if (!originalSale) {
    throw createError('Original sale not found', 404);
  }

  // Validate return items against original sale items
  for (const item of items) {
    const originalSaleItem = originalSale.saleItems.find(si => si.id === item.originalSaleItemId);
    
    if (!originalSaleItem) {
      throw createError(`Sale item ${item.originalSaleItemId} not found in original sale`, 400);
    }

    // Check if quantity being returned doesn't exceed available quantity
    const alreadyReturned = originalSaleItem.returnItems.reduce((sum, ri) => sum + ri.quantity, 0);
    const availableToReturn = originalSaleItem.quantity - alreadyReturned;

    if (item.quantity > availableToReturn) {
      throw createError(`Cannot return ${item.quantity} units of product. Only ${availableToReturn} units available for return`, 400);
    }

    // Verify product ID matches
    if (originalSaleItem.productId !== item.productId) {
      throw createError(`Product ID mismatch for sale item ${item.originalSaleItemId}`, 400);
    }
  }

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  // Create return in transaction
  const newReturn = await prisma.$transaction(async (tx) => {
    // Create return record
    const returnRecord = await tx.return.create({
      data: {
        originalSaleId,
        userId,
        customerId: customerId || null,
        total,
        reason,
      refundMethod: refundMethod as any,
        status: 'PENDING'
      }
    });

    // Create return items
    for (const item of items) {
      await tx.returnItem.create({
        data: {
          returnId: returnRecord.id,
          productId: item.productId,
          originalSaleItemId: item.originalSaleItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          reason: item.reason
        }
      });
    }

    return returnRecord;
  });

  // Fetch complete return data
  const completeReturn = await prisma.return.findUnique({
    where: { id: newReturn.id },
    include: {
      originalSale: {
        select: {
          id: true,
          date: true,
          total: true
        }
      },
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
      returnItems: {
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

  try {
    const base = process.env.EXTERNAL_SAAS_BASE_URL?.replace(/\/$/, '') || '';
    if (base) {
      const url = `${base}/returns`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const apiKey = process.env.EXTERNAL_SAAS_API_KEY;
      const bearer = process.env.EXTERNAL_SAAS_BEARER_TOKEN;
      const basicUser = process.env.EXTERNAL_SAAS_BASIC_USER;
      const basicPass = process.env.EXTERNAL_SAAS_BASIC_PASS;
      if (apiKey) headers['x-api-key'] = apiKey;
      if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
      if (basicUser && basicPass) {
        const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
        headers['Authorization'] = `Basic ${b64}`;
      }
      const payload = {
        records: [{
          id: completeReturn!.id,
          originalSaleId,
          customerId: customerId || null,
          total,
          reason,
          refundMethod,
          status: 'PENDING',
          items: items.map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            originalSaleItemId: it.originalSaleItemId
          }))
        }]
      };
      await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    }
  } catch {}

  res.status(201).json({
    return: completeReturn,
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      total
    }
  });
}));

// Update return status
router.patch('/:id/status', 
  enhancedAuthMiddleware,
  requirePermission('returns', 'update'),
  validateParams(commonSchemas.id),
  validateBody(enhancedUpdateReturnStatusSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: {
      returnItems: {
        include: {
          product: true
        }
      }
    }
  });

  if (!returnRecord) {
    throw createError('Return not found', 404);
  }

  // Handle status transitions
  const updatedReturn = await prisma.$transaction(async (tx) => {
    // Update return status
    const updated = await tx.return.update({
      where: { id },
      data: { 
      status: status as any,
        updatedAt: new Date()
      }
    });

    // If approved and completing, restore inventory and create cash movement
    if (status === 'COMPLETED' && returnRecord.status !== 'COMPLETED') {
      for (const item of returnRecord.returnItems) {
        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity
            }
          }
        });

        // Record inventory movement
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'RETURN',
            quantity: item.quantity,
            reason: `Return from sale - ${returnRecord.reason}`,
            referenceId: returnRecord.id
          }
        });
      }

      // Create cash movement for cash refunds
      await createCashMovementForReturn(tx, returnRecord.id, returnRecord.total, returnRecord.refundMethod, req.user!.id);
    }

    return updated;
  });

  try {
    const base = process.env.EXTERNAL_SAAS_BASE_URL?.replace(/\/$/, '') || '';
    if (base) {
      const url = `${base}/returns`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const apiKey = process.env.EXTERNAL_SAAS_API_KEY;
      const bearer = process.env.EXTERNAL_SAAS_BEARER_TOKEN;
      const basicUser = process.env.EXTERNAL_SAAS_BASIC_USER;
      const basicPass = process.env.EXTERNAL_SAAS_BASIC_PASS;
      if (apiKey) headers['x-api-key'] = apiKey;
      if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
      if (basicUser && basicPass) {
        const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
        headers['Authorization'] = `Basic ${b64}`;
      }
      let detailed: any = { id, status, notes: notes || null };
      if (status === 'COMPLETED') {
        const rr = await prisma.return.findUnique({
          where: { id },
          include: { returnItems: { include: { product: { select: { id: true, sku: true, name: true } } } } }
        });
        detailed.items = (rr?.returnItems || []).map((it) => ({
          productId: it.productId,
          sku: it.product?.sku,
          name: it.product?.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice
        }));
      }
      const payload = { records: [detailed] };
      await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    }
  } catch {}

  res.json({
    return: updatedReturn,
    message: `Return ${status.toLowerCase()} successfully`
  });
}));

// Delete return (soft delete)
router.delete('/:id', 
  enhancedAuthMiddleware,
  requirePermission('returns', 'delete'),
  validateParams(commonSchemas.id),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  const returnRecord = await prisma.return.findUnique({
    where: { id }
  });

  if (!returnRecord) {
    throw createError('Return not found', 404);
  }

  if (returnRecord.status !== 'PENDING') {
    throw createError('Can only delete pending returns', 400);
  }

  await prisma.return.delete({
    where: { id }
  });

  res.json({ message: 'Return deleted successfully' });
}));

export default router;
