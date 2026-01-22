import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/input-validator';
import { getAuditLogs } from '../middleware/audit';

const router = Router();

// Schema para validar parámetros de consulta de auditoría
const auditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// Get audit logs with filters
router.get('/', validateQuery(auditQuerySchema), asyncHandler(async (req, res) => {
  const {
    entityType,
    entityId,
    userId,
    action,
    startDate,
    endDate,
    limit,
    offset
  } = req.query as z.infer<typeof auditQuerySchema>;

  const filters = {
    entityType,
    entityId,
    userId,
    action,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit,
    offset
  };

  const result = await getAuditLogs(filters);

  res.json({
    logs: result.logs,
    total: result.total,
    limit,
    offset,
    hasMore: result.total > offset + limit
  });
}));

// Get audit logs for a specific user
router.get('/user/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = await getAuditLogs({
    entityType: 'USER',
    entityId: id,
    limit,
    offset
  });

  res.json({
    logs: result.logs,
    total: result.total,
    limit,
    offset,
    hasMore: result.total > offset + limit
  });
}));

// Get audit logs for a specific customer
router.get('/customer/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = await getAuditLogs({
    entityType: 'CUSTOMER',
    entityId: id,
    limit,
    offset
  });

  res.json({
    logs: result.logs,
    total: result.total,
    limit,
    offset,
    hasMore: result.total > offset + limit
  });
}));

// Get audit summary statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const filters: any = {};
  if (startDate) filters.startDate = new Date(startDate as string);
  if (endDate) filters.endDate = new Date(endDate as string);

  // Get statistics for different actions and entity types
  const [
    totalLogs,
    createActions,
    updateActions,
    deleteActions,
    customerLogs,
    userLogs,
    productLogs,
    saleLogs
  ] = await Promise.all([
    getAuditLogs({ ...filters, limit: 1 }).then(r => r.total),
    getAuditLogs({ ...filters, action: 'CREATE', limit: 1 }).then(r => r.total),
    getAuditLogs({ ...filters, action: 'UPDATE', limit: 1 }).then(r => r.total),
    getAuditLogs({ ...filters, action: 'DELETE', limit: 1 }).then(r => r.total),
    getAuditLogs({ ...filters, entityType: 'CUSTOMER', limit: 1 }).then(r => r.total),
    getAuditLogs({ ...filters, entityType: 'USER', limit: 1 }).then(r => r.total),
    getAuditLogs({ ...filters, entityType: 'PRODUCT', limit: 1 }).then(r => r.total),
    getAuditLogs({ ...filters, entityType: 'SALE', limit: 1 }).then(r => r.total)
  ]);

  res.json({
    total: totalLogs,
    byAction: {
      create: createActions,
      update: updateActions,
      delete: deleteActions
    },
    byEntityType: {
      customer: customerLogs,
      user: userLogs,
      product: productLogs,
      sale: saleLogs
    }
  });
}));

export default router;