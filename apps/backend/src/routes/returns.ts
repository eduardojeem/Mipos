import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';
// ✅ Import new helpers
import {
  normalizeReturn,
  buildReturnWhere,
  calculateReturnStats,
  normalizeRefundMethodToDb,
  normalizeReturnStatusToDb,
  validateStatusTransition
} from './helpers/return-helpers';
import { syncReturnToExternalSystem } from './helpers/external-sync';
import { RETURNS_CONFIG } from '../config/returns-config';
import { getOperationalContext } from './helpers/operational-context';
import { findScopedOpenCashSession } from './helpers/cash-session-context';
// Temporary: Using console until logger API is fixed
const logger = console;

// ✅ Improved helper function with proper error handling and balance validation
async function createCashMovementForReturn(
  tx: any,
  returnId: string,
  amount: number,
  refundMethod: string,
  userId: string,
  organizationId: string,
  operationalContext?: ReturnType<typeof getOperationalContext>,
) {
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
  const openSession =
    await findScopedOpenCashSession(organizationId, operationalContext) ||
    await tx.cashSession.findFirst({
      where: { status: 'OPEN', organizationId }
    });

  if (!openSession) {
    logger.warn('No open cash session for cash refund', { returnId });
    throw createError('No hay sesión de caja abierta para procesar reembolso en efectivo', 400);
  }

  // ✅ MEJORA CRÍTICA: Validar saldo disponible antes de crear movimiento
  const currentBalance = await tx.cashMovement.aggregate({
    where: { sessionId: openSession.id },
    _sum: { amount: true }
  });

  const balance =
    Number(currentBalance._sum.amount || 0) +
    Number((openSession as any).openingAmount ?? (openSession as any).opening_amount ?? (openSession as any).initialAmount ?? 0);

  if (balance < amount) {
    throw createError(
      `Saldo insuficiente en caja. Disponible: $${balance.toFixed(2)}, Requerido: $${amount.toFixed(2)}`,
      400
    );
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

  logger.info('Cash movement created for return', { returnId, amount: movement.amount, remainingBalance: balance - amount });
  return movement;
}

const router = express.Router();

const safeIdSchema = z.string()
  .min(1, 'ID is required')
  .max(128, 'ID too long')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid ID format')
  .transform(val => sanitize.string(val));

const returnIdParamSchema = z.object({
  id: safeIdSchema
});

const returnStatusSchema = z.string()
  .min(1, 'Status is required')
  .transform(value => normalizeReturnStatusToDb(value))
  .refine((value): value is string => Boolean(value), 'Invalid return status');

const refundMethodSchema = z.string()
  .min(1, 'Refund method is required')
  .transform(value => normalizeRefundMethodToDb(value))
  .refine((value): value is string => Boolean(value), 'Invalid refund method');

function resolveRequestOrganizationId(req: EnhancedAuthenticatedRequest): string | null {
  const headerOrgId = String(req.headers['x-organization-id'] || '').trim();
  const userOrgId = String((req.user as any)?.organizationId || '').trim();
  return headerOrgId || userOrgId || null;
}

function requireRequestOrganizationId(req: EnhancedAuthenticatedRequest): string {
  const organizationId = resolveRequestOrganizationId(req);
  if (!organizationId) {
    throw createError('Organization header missing', 400);
  }
  return organizationId;
}

function groupReturnItemsByProduct(
  returnItems: Array<{ productId: string; quantity: number; product?: { name?: string | null } | null }>
) {
  const totals = new Map<string, { quantity: number; productName: string }>();

  for (const item of returnItems) {
    const productId = String(item.productId || '').trim();
    if (!productId) {
      continue;
    }

    const current = totals.get(productId);
    totals.set(productId, {
      quantity: (current?.quantity || 0) + Number(item.quantity || 0),
      productName: item.product?.name || current?.productName || 'este producto',
    });
  }

  return totals;
}

async function validateReturnProcessingStock(
  tx: any,
  organizationId: string,
  productTotals: Map<string, { quantity: number; productName: string }>
) {
  const productIds = Array.from(productTotals.keys());
  const products = await tx.product.findMany({
    where: {
      id: { in: productIds },
      organizationId,
    },
  });

  const productsById = new Map<string, any>(
    products.map((product: any) => [String(product.id), product])
  );

  for (const [productId, entry] of productTotals) {
    const product = productsById.get(productId);
    if (!product) {
      throw createError(`Producto ${productId} no encontrado`, 404);
    }

    const maxStock = (product as any).maxStockQuantity || 999999;
    const newStock = product.stockQuantity + entry.quantity;

    if (newStock > maxStock) {
      throw createError(
        `No se pueden devolver ${entry.quantity} unidades de ${entry.productName}. ` +
          `Excedería la capacidad máxima de stock (${maxStock}).`,
        400
      );
    }
  }
}

async function claimApprovedReturnCompletion(tx: any, id: string, organizationId: string) {
  const claimResult = await tx.return.updateMany({
    where: {
      id,
      organizationId,
      status: 'APPROVED',
    },
    data: {
      status: 'COMPLETED' as any,
      updatedAt: new Date(),
    },
  });

  if (claimResult.count !== 1) {
    throw createError('Return already processed or no longer approved', 409);
  }
}

// ✅ Enhanced validation schemas using config constants
const enhancedReturnItemSchema = z.object({
  originalSaleItemId: safeIdSchema,
  productId: safeIdSchema,
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
  originalSaleId: safeIdSchema,
  customerId: safeIdSchema.optional(),
  items: z.array(enhancedReturnItemSchema)
    .min(1, 'At least one item is required')
    .max(RETURNS_CONFIG.validation.maxItemsPerReturn, 'Too many items in return'),
  reason: z.string()
    .min(1, 'Return reason is required')
    .max(RETURNS_CONFIG.validation.maxReasonLength, 'Return reason too long')
    .transform(val => sanitize.string(val)),
  refundMethod: refundMethodSchema
    .default('CASH')
});

const enhancedUpdateReturnStatusSchema = z.object({
  status: returnStatusSchema,
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
  customerId: safeIdSchema.optional(),
  status: z.string()
    .max(32, 'Invalid status')
    .optional()
    .transform(val => val ? normalizeReturnStatusToDb(val) || val : val),
  originalSaleId: safeIdSchema.optional(),
  search: z.string()
    .max(100, 'Search term too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  refundMethod: z.string()
    .max(32, 'Invalid refund method')
    .optional()
    .transform(val => val ? normalizeRefundMethodToDb(val) || val : val)
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
    const startTime = Date.now();
    logger.info('🔍 [GET /returns] Request received', { query: req.query, user: req.user?.id });
    
    // ✅ FIX: organizationId por defecto si no existe en req.user
    const organizationId = requireRequestOrganizationId(req);
    logger.info('🔍 [GET /returns] Using organizationId:', organizationId);
    
    const { page, limit } = req.query;
    const pageNum = typeof page === 'number' ? page : (page ? parseInt(String(page), 10) : 1);
    const limitNum = typeof limit === 'number' ? limit : (limit ? parseInt(String(limit), 10) : 10);
    const skip = (pageNum - 1) * limitNum;

    const where = buildReturnWhere({ ...req.query, organizationId } as any);

    logger.info('🔍 [GET /returns] Query where:', where);

    try {
      // ✅ OPTIMIZACIÓN: Reducir includes para mejorar performance
      const [returns, total] = await Promise.all([
        prisma.return.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                name: true
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
        }),
        prisma.return.count({ where })
      ]);

      const duration = Date.now() - startTime;
      logger.info('🔍 [GET /returns] Query completed', { 
        duration: `${duration}ms`, 
        count: returns.length, 
        total 
      });

      // ✅ Transformar datos para incluir customerName
      const transformedReturns = returns.map(normalizeReturn);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        returns: transformedReturns,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error: any) {
      logger.error('🔍 [GET /returns] Error:', error);
      throw error;
    }
  }));

// Get return by ID
router.get('/:id',
  enhancedAuthMiddleware,
  requirePermission('returns', 'read'),
  validateParams(returnIdParamSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const { id } = req.params;
    // ✅ FIX: organizationId por defecto si no existe en req.user
    const organizationId = requireRequestOrganizationId(req);

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
    // ✅ FIX: organizationId por defecto si no existe en req.user
    const organizationId = requireRequestOrganizationId(req);

    // Verify original sale exists
    const originalSale = await prisma.sale.findFirst({
      where: { id: originalSaleId, organizationId },
        include: {
          saleItems: {
            include: {
              returnItems: {
                include: {
                  return: {
                    select: {
                      status: true
                    }
                  }
                }
              }
            }
          }
        }
    });

    if (!originalSale) {
      throw createError('Original sale not found', 404);
    }

    // ✅ MEJORA: Validar ventana de tiempo para devoluciones
    const daysSinceSale = Math.floor(
      (Date.now() - new Date(originalSale.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSale > RETURNS_CONFIG.validation.maxReturnDays) {
      throw createError(
        `No se pueden devolver productos de una venta con más de ${RETURNS_CONFIG.validation.maxReturnDays} días de antigüedad. ` +
        `Esta venta tiene ${daysSinceSale} días.`,
        400
      );
    }

    // Validate return items against original sale items
    for (const item of items) {
      const originalSaleItem = originalSale.saleItems.find(si => si.id === item.originalSaleItemId);

      if (!originalSaleItem) {
        throw createError(`Sale item ${item.originalSaleItemId} not found in original sale`, 400);
      }

      // Check if quantity being returned doesn't exceed available quantity
      const alreadyReturned = originalSaleItem.returnItems.reduce((sum, ri) => {
        const returnStatus = normalizeReturnStatusToDb(ri.return?.status);
        if (returnStatus !== 'APPROVED' && returnStatus !== 'COMPLETED') {
          return sum;
        }

        return sum + ri.quantity;
      }, 0);
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

    // ✅ MEJORA CRÍTICA: Manejo robusto de sincronización externa
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            logger.error('External sync failed', {
              returnId: completeReturn!.id,
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });

            // Registrar fallo para retry posterior (si existe tabla syncFailure)
            try {
              await prisma.syncFailure.create({
                data: {
                  entityType: 'RETURN',
                  entityId: completeReturn!.id,
                  action: 'CREATE',
                  error: `HTTP ${response.status}: ${response.statusText}`,
                  payload: JSON.stringify(payload),
                  retryCount: 0
                }
              });
            } catch (syncError) {
              logger.warn('Could not create sync failure record', { error: syncError });
            }
          } else {
            logger.info('External sync successful', { returnId: completeReturn!.id });
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }
    } catch (error) {
      logger.error('External sync error', {
        returnId: completeReturn!.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Registrar fallo para retry posterior
      try {
        await prisma.syncFailure.create({
          data: {
            entityType: 'RETURN',
            entityId: completeReturn!.id,
            action: 'CREATE',
            error: error instanceof Error ? error.message : 'Unknown error',
            payload: JSON.stringify({
              originalSaleId,
              customerId,
              total,
              reason,
              refundMethod
            }),
            retryCount: 0
          }
        });
      } catch (syncError) {
        logger.warn('Could not create sync failure record', { error: syncError });
      }
    }

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
  validateParams(returnIdParamSchema),
  validateBody(enhancedUpdateReturnStatusSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    // ✅ FIX: organizationId por defecto si no existe en req.user
    const organizationId = requireRequestOrganizationId(req);
    const operationalContext = getOperationalContext(req);

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

    // ✅ MEJORA CRÍTICA: Validar cantidades al aprobar devolución
    if (status === 'APPROVED') {
      const originalSale = await prisma.sale.findUnique({
        where: { id: returnRecord.originalSaleId },
        include: { saleItems: true }
      });

      if (!originalSale) {
        throw createError('Original sale not found', 404);
      }

      for (const returnItem of returnRecord.returnItems) {
        const saleItem = originalSale.saleItems.find(
          si => si.id === returnItem.originalSaleItemId
        );

        if (!saleItem) {
          throw createError(`Sale item ${returnItem.originalSaleItemId} not found in original sale`, 400);
        }

        // Calcular cantidad ya devuelta (aprobada o completada)
        const alreadyReturned = await prisma.returnItem.aggregate({
          where: {
            originalSaleItemId: returnItem.originalSaleItemId,
            return: {
              status: { in: ['APPROVED', 'COMPLETED'] },
              id: { not: returnRecord.id } // Excluir la devolución actual
            }
          },
          _sum: { quantity: true }
        });

        const totalReturned = (alreadyReturned._sum.quantity || 0) + returnItem.quantity;

        if (totalReturned > saleItem.quantity) {
          throw createError(
            `No se puede devolver ${returnItem.quantity} unidades de ${returnItem.product.name}. ` +
            `Solo ${saleItem.quantity - (alreadyReturned._sum.quantity || 0)} unidades disponibles para devolución.`,
            400
          );
        }

        // ✅ MEJORA: Validar que el precio unitario coincida
        if (Math.abs(returnItem.unitPrice - saleItem.unitPrice) > 0.01) {
          throw createError(
            `El precio unitario no coincide para ${returnItem.product.name}. ` +
            `Esperado: $${saleItem.unitPrice.toFixed(2)}, Recibido: $${returnItem.unitPrice.toFixed(2)}`,
            400
          );
        }
      }
    }

    // Handle status transitions
    const updatedReturn = await prisma.$transaction(async (tx) => {
      if (status === 'COMPLETED' && returnRecord.status !== 'COMPLETED') {
        const productTotals = groupReturnItemsByProduct(returnRecord.returnItems);
        await validateReturnProcessingStock(tx, organizationId, productTotals);
        await claimApprovedReturnCompletion(tx, id, organizationId);

        await tx.auditLog.create({
          data: {
            action: 'RETURN_STATUS_CHANGE',
            entityType: 'RETURN',
            entityId: id,
            userId: req.user!.id,
            userEmail: req.user!.email || 'unknown',
            userRole: req.user!.roles?.[0]?.name || 'USER',
            ipAddress: req.ip || '0.0.0.0',
            metadata: JSON.stringify({
              oldStatus: returnRecord.status,
              newStatus: status,
              notes: notes || null,
              timestamp: new Date().toISOString()
            })
          }
        });

        for (const [productId, entry] of productTotals) {
          await tx.product.update({
            where: { id: productId },
            data: {
              stockQuantity: {
                increment: entry.quantity
              }
            }
          });
        }

        for (const item of returnRecord.returnItems) {
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

        const refundTotal = returnRecord.returnItems.reduce(
          (sum, item) => sum + (item.quantity * item.unitPrice),
          0
        );

        await createCashMovementForReturn(
          tx,
          returnRecord.id,
          refundTotal,
          returnRecord.refundMethod,
          req.user!.id,
          organizationId,
          operationalContext
        );

        return tx.return.findUnique({
          where: { id }
        });
      }
      // ✅ MEJORA: Registrar cambio de estado en auditoría
      await tx.auditLog.create({
        data: {
          action: 'RETURN_STATUS_CHANGE',
          entityType: 'RETURN',
          entityId: id,
          userId: req.user!.id,
          userEmail: req.user!.email || 'unknown',
          userRole: req.user!.roles?.[0]?.name || 'USER',
          ipAddress: req.ip || '0.0.0.0',
          metadata: JSON.stringify({
            oldStatus: returnRecord.status,
            newStatus: status,
            notes: notes || null,
            timestamp: new Date().toISOString()
          })
        }
      });

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
        await createCashMovementForReturn(tx, returnRecord.id, total, returnRecord.refundMethod, req.user!.id, organizationId, operationalContext);
      }

      return updated;
    });

    // ✅ MEJORA CRÍTICA: Manejo robusto de sincronización externa
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            logger.error('External sync failed', {
              returnId: id,
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });

            try {
              await prisma.syncFailure.create({
                data: {
                  entityType: 'RETURN',
                  entityId: id,
                  action: 'UPDATE_STATUS',
                  error: `HTTP ${response.status}: ${response.statusText}`,
                  payload: JSON.stringify(payload),
                  retryCount: 0
                }
              });
            } catch (syncError) {
              logger.warn('Could not create sync failure record', { error: syncError });
            }
          } else {
            logger.info('External sync successful', { returnId: id });
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      }
    } catch (error) {
      logger.error('External sync error', {
        returnId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      try {
        await prisma.syncFailure.create({
          data: {
            entityType: 'RETURN',
            entityId: id,
            action: 'UPDATE_STATUS',
            error: error instanceof Error ? error.message : 'Unknown error',
            payload: JSON.stringify({ status, notes }),
            retryCount: 0
          }
        });
      } catch (syncError) {
        logger.warn('Could not create sync failure record', { error: syncError });
      }
    }

    res.json({
      return: updatedReturn,
      message: `Return ${status.toLowerCase()} successfully`
    });
  }));

// Delete return (soft delete)
router.delete('/:id',
  enhancedAuthMiddleware,
  requirePermission('returns', 'delete'),
  validateParams(returnIdParamSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const { id } = req.params;
    const organizationId = requireRequestOrganizationId(req);

    const returnRecord = await prisma.return.findFirst({
      where: { id, organizationId }
    });

    if (!returnRecord) {
      throw createError('Return not found', 404);
    }

    if (returnRecord.status !== 'PENDING') {
      throw createError('Can only delete pending returns', 400);
    }

    await prisma.return.deleteMany({
      where: { id, organizationId }
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
    const organizationId = requireRequestOrganizationId(req);
    const where = buildReturnWhere({ ...filters, organizationId });

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
  validateParams(returnIdParamSchema),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const { id } = req.params;
    // ✅ FIX: organizationId por defecto si no existe en req.user
    const organizationId = requireRequestOrganizationId(req);
    const operationalContext = getOperationalContext(req);

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
      const productTotals = groupReturnItemsByProduct(returnRecord.returnItems);
      await validateReturnProcessingStock(tx, organizationId, productTotals);
      await claimApprovedReturnCompletion(tx, id, organizationId);

      await tx.auditLog.create({
        data: {
          action: 'RETURN_PROCESSED',
          entityType: 'RETURN',
          entityId: id,
          userId: req.user!.id,
          userEmail: req.user!.email || 'unknown',
          userRole: req.user!.roles?.[0]?.name || 'USER',
          ipAddress: req.ip || '0.0.0.0',
          metadata: JSON.stringify({
            status: 'COMPLETED',
            itemsCount: returnRecord.returnItems.length,
            totalAmount: returnRecord.returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
            timestamp: new Date().toISOString()
          })
        }
      });

      for (const [productId, entry] of productTotals) {
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity: {
              increment: entry.quantity
            }
          }
        });
      }

      for (const item of returnRecord.returnItems) {
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

      const refundTotal = returnRecord.returnItems.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice),
        0
      );

      await createCashMovementForReturn(
        tx,
        returnRecord.id,
        refundTotal,
        returnRecord.refundMethod,
        req.user!.id,
        organizationId,
        operationalContext
      );

      return tx.return.findUnique({
        where: { id }
      });
      // ✅ MEJORA CRÍTICA: Validar stock antes de procesar
      for (const item of returnRecord.returnItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw createError(`Producto ${item.productId} no encontrado`, 404);
        }

        // Validar límite máximo de stock (si existe en el schema)
        const maxStock = (product as any).maxStockQuantity || 999999;
        const newStock = product.stockQuantity + item.quantity;

        if (newStock > maxStock) {
          throw createError(
            `No se pueden devolver ${item.quantity} unidades de ${product.name}. ` +
            `Excedería la capacidad máxima de stock (${maxStock}).`,
            400
          );
        }
      }

      // ✅ MEJORA: Registrar procesamiento en auditoría
      await tx.auditLog.create({
        data: {
          action: 'RETURN_PROCESSED',
          entityType: 'RETURN',
          entityId: id,
          userId: req.user!.id,
          userEmail: req.user!.email || 'unknown',
          userRole: req.user!.roles?.[0]?.name || 'USER',
          ipAddress: req.ip || '0.0.0.0',
          metadata: JSON.stringify({
            status: 'COMPLETED',
            itemsCount: returnRecord.returnItems.length,
            totalAmount: returnRecord.returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
            timestamp: new Date().toISOString()
          })
        }
      });

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
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        const newStock = product!.stockQuantity + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: newStock
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
        organizationId,
        operationalContext
      );

      return updated;
    });

    // ✅ MEJORA CRÍTICA: Manejo robusto de sincronización externa
    try {
      await syncReturnToExternalSystem({
        ...processedReturn,
        returnItems: returnRecord.returnItems
      }, 'update');
    } catch (syncError) {
      logger.error('Failed to sync return to external system', {
        returnId: id,
        error: syncError instanceof Error ? syncError.message : 'Unknown error'
      });

      // Registrar fallo para retry posterior
      try {
        await prisma.syncFailure.create({
          data: {
            entityType: 'RETURN',
            entityId: id,
            action: 'PROCESS',
            error: syncError instanceof Error ? syncError.message : 'Unknown error',
            payload: JSON.stringify({
              status: 'COMPLETED',
              items: returnRecord.returnItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            }),
            retryCount: 0
          }
        });
      } catch (failureError) {
        logger.warn('Could not create sync failure record', { error: failureError });
      }
    }

    res.json({
      return: normalizeReturn(processedReturn),
      message: 'Return processed successfully'
    });
  })
);

export default router;
