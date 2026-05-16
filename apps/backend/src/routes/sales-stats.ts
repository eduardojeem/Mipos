import express from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';

const router = express.Router();

function requireOrgId(req: EnhancedAuthenticatedRequest): string {
  const headerOrgId = String(req.headers['x-organization-id'] || '').trim();
  const userOrgId = String((req.user as any)?.organizationId || '').trim();
  const orgId = headerOrgId || userOrgId;
  if (!orgId) throw createError('Organization context required', 400);
  return orgId;
}

type AggRow = {
  revenue: string | number | null;
  count: string | number | null;
  avg: string | number | null;
};

// GET /sales-stats/today — today's revenue/count for the caller's org.
router.get('/today',
  requirePermission('sales', 'read'),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const organizationId = requireOrgId(req);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const rows = await prisma.$queryRaw<AggRow[]>`
      SELECT COALESCE(SUM(total), 0)::numeric AS revenue,
             COUNT(*)::int                    AS count,
             COALESCE(AVG(total), 0)::numeric AS avg
      FROM sales
      WHERE organization_id = ${organizationId}
        AND created_at >= ${startOfDay}
        AND created_at <= ${endOfDay}
    `;

    const r = rows[0] || { revenue: 0, count: 0, avg: 0 };
    res.json({
      success: true,
      data: {
        totalSales: Number(r.count ?? 0),
        totalRevenue: Number(r.revenue ?? 0),
        averageTicket: Number(r.avg ?? 0),
        date: startOfDay.toISOString().split('T')[0],
      },
    });
  })
);

// GET /sales-stats/overview — lifetime aggregate for the caller's org.
router.get('/overview',
  requirePermission('sales', 'read'),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const organizationId = requireOrgId(req);

    const rows = await prisma.$queryRaw<AggRow[]>`
      SELECT COALESCE(SUM(total), 0)::numeric AS revenue,
             COUNT(*)::int                    AS count,
             COALESCE(AVG(total), 0)::numeric AS avg
      FROM sales
      WHERE organization_id = ${organizationId}
    `;

    const r = rows[0] || { revenue: 0, count: 0, avg: 0 };
    res.json({
      success: true,
      data: {
        totalSales: Number(r.count ?? 0),
        totalRevenue: Number(r.revenue ?? 0),
        averageOrderValue: Math.round(Number(r.avg ?? 0) * 100) / 100,
      },
    });
  })
);

export default router;
