import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/input-validator';
import { 
  getAdminAuditLogs, 
  getAdminAuditMeta, 
  getAdminAuditStats,
  getAdminAuditDailySummary,
  AdminAuditFilters 
} from '../middleware/admin-audit';
import { format } from 'date-fns';

const router = Router();

const auditQuerySchema = z.object({
  action: z.string().optional(),
  actionEq: z.string().optional(),
  resource: z.string().optional(),
  resourceEq: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['SUCCESS', 'FAILURE', 'PENDING']).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  meta: z.enum(['actions', 'resources']).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

// Main endpoint - Get audit logs with filters or metadata
router.get('/', validateQuery(auditQuerySchema), asyncHandler(async (req, res) => {
  const query = req.query as z.infer<typeof auditQuerySchema>;

  // Return metadata if requested
  if (query.meta === 'actions' || query.meta === 'resources') {
    const filters: AdminAuditFilters = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    const result = await getAdminAuditMeta(query.meta, filters);
    return res.json(result);
  }

  // Build filters
  const filters: AdminAuditFilters = {
    action: query.action,
    actionEq: query.actionEq,
    resource: query.resource,
    resourceEq: query.resourceEq,
    userId: query.userId,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    status: query.status,
    q: query.q,
    limit: query.limit,
    page: query.page,
  };

  const result = await getAdminAuditLogs(filters);

  // Export as CSV if requested
  if (query.format === 'csv') {
    const csv = generateCSV(result.data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="admin-audit-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    return res.send(csv);
  }

  res.json(result);
}));

// Get statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const filters = {
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  };

  const stats = await getAdminAuditStats(filters);
  res.json(stats);
}));

// Get daily summary (for dashboard widgets)
router.get('/summary/daily', asyncHandler(async (req, res) => {
  const summary = await getAdminAuditDailySummary();
  res.json(summary);
}));

// Get logs for a specific user
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const page = parseInt(req.query.page as string) || 1;

  const result = await getAdminAuditLogs({
    userId,
    limit,
    page,
  });

  res.json(result);
}));

// Get logs for a specific resource type
router.get('/resource/:resource', asyncHandler(async (req, res) => {
  const { resource } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const page = parseInt(req.query.page as string) || 1;

  const result = await getAdminAuditLogs({
    resourceEq: resource.toUpperCase(),
    limit,
    page,
  });

  res.json(result);
}));

// Get today's activity
router.get('/activity/today', asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await getAdminAuditLogs({
    startDate: today,
    limit: 50,
    page: 1,
  });

  res.json(result);
}));

// Get this week's activity
router.get('/activity/week', asyncHandler(async (req, res) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const result = await getAdminAuditLogs({
    startDate: weekAgo,
    limit: 100,
    page: 1,
  });

  res.json(result);
}));

// Get this month's activity
router.get('/activity/month', asyncHandler(async (req, res) => {
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  monthAgo.setHours(0, 0, 0, 0);

  const result = await getAdminAuditLogs({
    startDate: monthAgo,
    limit: 200,
    page: 1,
  });

  res.json(result);
}));

// Get actions by specific action type
router.get('/action/:actionType', asyncHandler(async (req, res) => {
  const { actionType } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const page = parseInt(req.query.page as string) || 1;

  const result = await getAdminAuditLogs({
    actionEq: actionType.toUpperCase(),
    limit,
    page,
  });

  res.json(result);
}));

// Search logs
router.get('/search', asyncHandler(async (req, res) => {
  const { q, startDate, endDate, limit = '20', page = '1' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const result = await getAdminAuditLogs({
    q: q as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: parseInt(limit as string),
    page: parseInt(page as string),
  });

  res.json(result);
}));

// Export logs
router.get('/export', asyncHandler(async (req, res) => {
  const { 
    action, resource, userId, startDate, endDate, 
    format: exportFormat = 'csv' 
  } = req.query;

  const result = await getAdminAuditLogs({
    actionEq: action as string,
    resourceEq: resource as string,
    userId: userId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: 1000,
    page: 1,
  });

  if (exportFormat === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="admin-audit-${format(new Date(), 'yyyy-MM-dd')}.json"`);
    return res.json(result.data);
  }

  const csv = generateCSV(result.data);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="admin-audit-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
  res.send(csv);
}));

function generateCSV(data: any[]): string {
  if (data.length === 0) return 'No hay datos disponibles';

  const headers = [
    'ID', 
    'Acción', 
    'Recurso', 
    'ID Recurso', 
    'Email Usuario', 
    'Rol Usuario', 
    'Dirección IP', 
    'Estado', 
    'Fecha Creación'
  ];
  
  const rows = data.map(row => [
    row.id || '',
    row.action || '',
    row.resource || '',
    row.resourceId || '',
    row.userEmail || '',
    row.userRole || '',
    row.ipAddress || '',
    row.status || 'SUCCESS',
    row.createdAt ? new Date(row.createdAt).toISOString() : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent; // BOM for Excel UTF-8 compatibility
}

export default router;
