import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';
// ✅ Import new helpers
import { normalizeReturn, buildReturnWhere, calculateReturnStats, validateStatusTransition } from './helpers/return-helpers';
import { syncReturnToExternalSystem } from './helpers/external-sync';
import { RETURNS_CONFIG } from '../config/returns-config';
// Temporary: Using console until logger API is fixed
const logger = console;

// ✅ Improved helper function with proper error handling
async function createCashMovementForReturn(tx: any, returnId: string, amount: number, refundMethod: string, userId: string, organizationId: string) {
  // Only create cash movement for cash refunds
  if (refundMethod !== 'CASH') {
    logger.info('Skipping cash movement for non-cash refund', { refundMethod, returnId });
    return null;
  }

  // Validate amount
  if (amount <= 0) {
    throw createError('Invalid refund amount', 400);
  }

  // Get current open cash session
  const openSession = await tx.cashSession.findFirst({
    where: { status: 'OPEN', organizationId }
  });

  if (!openSession) {
    logger.warn('No open cash session for cash refund', { returnId });
    throw createError('No hay sesión de caja abierta para procesar reembolso en efectivo', 400);
  }

  // Create cash movement (negative amount for returns)
  const movement = await tx.cashMovement.create({
    data: {
      organizationId,
      sessionId: openSession.id,
      type: 'RETURN',
      amount: -Math.abs(amount), // Negative for returns
      reason: `Devolución #${returnId}`,
      referenceType: 'RETURN',
      referenceId: returnId,
      createdBy: userId
    }
  });

  logger.info('Cash movement created for return', { returnId, amount: movement.amount });
  return movement;
}

const router = express.Router();

// ✅ Enhanced validation schemas using config constants
const enhancedReturnItemSchema = z.object({
  originalSaleItemId: z.string()
    .uuid('Invalid original sale item ID format')
    .transform(val => sanitize.string(val)),
  productId: z.string()
    .uuid('Invalid product ID format')
    .transform(val => sanitize.string(val)),
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(RETURNS_CONFIG.validation.minQuantityPerItem, 'Quantity must be at least 1')
    .max(RETURNS_CONFIG.validation.maxQuantityPerItem, 'Quantity too large'),
  unitPrice: z.number()
    .min(0, 'Unit price must be positive')
    .max(999999.99, 'Unit price too large'),
  reason: z.string()
    .max(RETURNS_CONFIG.validation.maxReasonLength, 'Reason too long')
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
    .max(RETURNS_CONFIG.validation.maxItemsPerReturn, 'Too many items in return'),
  reason: z.string()
    .min(1, 'Return reason is required')
    .max(RETURNS_CONFIG.validation.maxReasonLength, 'Return reason too long')
    .transform(val => sanitize.string(val)),
  refundMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER'])
    .default('CASH')
});

const enhancedUpdateReturnStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
  notes: z.string()
    .max(RETURNS_CONFIG.validation.maxNotesLength, 'Notes too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
});

const enhancedQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : RETURNS_CONFIG.pagination.defaultLimit;
    return Math.min(Math.max(parsed, RETURNS_CONFIG.pagination.minLimit), RETURNS_CONFIG.pagination.maxLimit);
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
    .transform(val => val ? sanitize.string(val) : val),
  search: z.string()
    .max(100, 'Search term too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date'
}).refine(data => {
  return data.page >= 1 && data.limit >= RETURNS_CONFIG.pagination.minLimit && data.limit <= RETURNS_CONFIG.pagination.maxLimit;
}, {
  message: `Page must be >= 1, limit must be between ${RETURNS_CONFIG.pagination.minLimit} and ${RETURNS_CONFIG.pagination.maxLimit}`
});

// Get all returns with pagination and filters
router.get('/',
  enhancedAuthMiddleware,
  requirePermission('returns', 'read'),
  validateQuery(enhancedQuerySchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const organizationId = req.user!.organizationId;
    const { page, limit, startDate, endDate, customerId, status, originalSaleId } = req.query;
    const pageNum = typeof page === 'number' ? page : (page ? parseInt(String(page), 10) : 1);
    const limitNum = typeof limit === 'number' ? limit : (limit ? parseInt(String(limit), 10) : 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { organizationId };

    const toDate = (v: unknown) => new Date(String(v));
    if (startDate && endDate) {
      where.createdAt = {
        gte: toDate(startDate),
        lte: toDate(endDate)
      };
    } else if (startDate) {
      where.createdAt = {
        gte: toDate(startDate)
      };
    } else if (endDate) {
      where.createdAt = {
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
        orderBy: { createdAt: 'desc' },
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
    const organizationId = req.user!.organizationId;

    const returnRecord = await prisma.return.findFirst({
      where: { id, organizationId },
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
    const organizationId = req.user!.organizationId;

    // Verify original sale exists
    const originalSale = await prisma.sale.findFirst({
      where: { id: originalSaleId, organizationId },
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
          organizationId,
          originalSale: { connect: { id: originalSaleId } },
          user: { connect: { id: userId } },
          ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
          totalAmount: total,
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
    } catch { }

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
    const organizationId = req.user!.organizationId;

    const returnRecord = await prisma.return.findFirst({
      where: { id, organizationId },
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

    if (!validateStatusTransition(returnRecord.status, status)) {
      throw createError('Invalid status transition', 400);
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

        // ✅ Calculate total from returnItems
        const total = returnRecord.returnItems.reduce(
          (sum, item) => sum + (item.quantity * item.unitPrice),
          0
        );

        // Create cash movement for cash refunds
        await createCashMovementForReturn(tx, returnRecord.id, total, returnRecord.refundMethod, req.user!.id, organizationId);
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
    } catch { }

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

// ========================================
// ✅ NEW: GET /stats endpoint
// ========================================
router.get('/stats',
  enhancedAuthMiddleware,
  requirePermission('returns', 'read'),
  // Stats endpoint uses same query filters but all optional
  validateQuery(z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    customerId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    originalSaleId: z.string().optional()
  })),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const filters = req.query;
    const where = buildReturnWhere(filters);

    const stats = await calculateReturnStats(prisma, where);

    res.json(stats);
  })
);

// ========================================
// ✅ NEW: POST /:id/process endpoint
// ========================================
router.post('/:id/process',
  enhancedAuthMiddleware,
  requirePermission('returns', 'update'),
  validateParams(commonSchemas.id),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const returnRecord = await prisma.return.findFirst({
      where: { id, organizationId },
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

    // Only process approved returns
    if (returnRecord.status !== 'APPROVED') {
      throw createError('Only approved returns can be processed', 400);
    }

    // Process return in transaction
    const processedReturn = await prisma.$transaction(async (tx) => {
      // Update return status to COMPLETED
      const updated = await tx.return.update({
        where: { id },
        data: {
          status: 'COMPLETED' as any,
          // processedAt field doesn't exist in schema, tracked via updatedAt
          updatedAt: new Date()
        }
      });

      // Restore inventory
      for (const item of returnRecord.returnItems) {
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
            type: 'RETURN' as any,
            quantity: item.quantity,
            reason: `Return from sale - ${returnRecord.reason}`,
            referenceId: returnRecord.id
          }
        });
      }

      // ✅ Calculate total from items
      const total = returnRecord.returnItems.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice),
        0
      );

      // Create cash movement for cash refunds
      await createCashMovementForReturn(
        tx,
        returnRecord.id,
        total,
        returnRecord.refundMethod,
        req.user!.id,
        organizationId
      );

      return updated;
    });

    // Sync to external system
    await syncReturnToExternalSystem({
      ...processedReturn,
      returnItems: returnRecord.returnItems
    }, 'update');

    res.json({
      return: normalizeReturn(processedReturn),
      message: 'Return processed successfully'
    });
  })
);

export default router;
