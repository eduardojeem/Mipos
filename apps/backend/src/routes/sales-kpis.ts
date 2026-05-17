import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';
import { getEffectiveOrganizationId } from '../middleware/multi-tenant';

const router = express.Router();

function requireOrgId(req: EnhancedAuthenticatedRequest): string {
  const organizationId = getEffectiveOrganizationId(req);
  if (!organizationId) throw createError('Organization context required', 400);
  return organizationId;
}

const RANGE_PRESETS = new Set(['today', 'yesterday', '7d', '30d', '90d', 'mtd', 'ytd']);

const querySchema = z.object({
  range: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function resolveWindow(range?: string, fromIso?: string, toIso?: string): { from: Date; to: Date } {
  if (fromIso && toIso) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
      throw createError('Invalid from/to window', 400);
    }
    return { from, to };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const preset = (range || 'today').toLowerCase();
  if (!RANGE_PRESETS.has(preset)) {
    throw createError(`Invalid range. Use one of: ${[...RANGE_PRESETS].join(', ')} or from/to`, 400);
  }

  switch (preset) {
    case 'today':     return { from: startOfToday, to: endOfToday };
    case 'yesterday': {
      const y = new Date(startOfToday); y.setDate(y.getDate() - 1);
      const yEnd = new Date(y); yEnd.setHours(23, 59, 59, 999);
      return { from: y, to: yEnd };
    }
    case '7d': {
      const from = new Date(startOfToday); from.setDate(from.getDate() - 6);
      return { from, to: endOfToday };
    }
    case '30d': {
      const from = new Date(startOfToday); from.setDate(from.getDate() - 29);
      return { from, to: endOfToday };
    }
    case '90d': {
      const from = new Date(startOfToday); from.setDate(from.getDate() - 89);
      return { from, to: endOfToday };
    }
    case 'mtd': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: endOfToday };
    }
    case 'ytd': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: endOfToday };
    }
    default: return { from: startOfToday, to: endOfToday };
  }
}

type SalesKpisRow = { kpis: unknown };

interface TrendPoint {
  day: string;
  revenue: number;
  transactions: number;
}

/**
 * GET /api/sales/kpis?range=today|yesterday|7d|30d|90d|mtd|ytd
 *                  or ?from=ISO&to=ISO
 */
router.get('/kpis',
  requirePermission('sales', 'read'),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const organizationId = requireOrgId(req);
    const query = querySchema.parse(req.query);
    const { from, to } = resolveWindow(query.range, query.from, query.to);

    const rows = await prisma.$queryRaw<SalesKpisRow[]>`
      SELECT public.get_sales_kpis(${organizationId}, ${from}, ${to}) AS kpis
    `;

    res.json({ success: true, data: rows[0]?.kpis ?? null });
  })
);

/**
 * GET /api/sales/trend?range=7d|30d|90d|mtd|ytd  or ?from=ISO&to=ISO
 *
 * Returns daily revenue + transaction count for the requested window.
 * Used to render the AreaChart in the sales dashboard.
 */
router.get('/trend',
  requirePermission('sales', 'read'),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const organizationId = requireOrgId(req);
    const query = querySchema.parse(req.query);
    const { from, to } = resolveWindow(query.range ?? '7d', query.from, query.to);

    const rows = await prisma.$queryRaw<Array<{ day: Date; revenue: number; transactions: number }>>`
      SELECT
        date_trunc('day', created_at)::date            AS day,
        COUNT(*)::int                                  AS transactions,
        COALESCE(SUM(total), 0)::numeric               AS revenue
      FROM sales
      WHERE organization_id = ${organizationId}
        AND created_at >= ${from}
        AND created_at <  ${to}
      GROUP BY 1
      ORDER BY 1
    `;

    const data: TrendPoint[] = rows.map(r => ({
      day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      revenue: Number(r.revenue),
      transactions: Number(r.transactions),
    }));

    res.json({ success: true, data });
  })
);

/**
 * GET /api/sales/breakdown?range=7d|30d|90d|mtd|ytd  or ?from=ISO&to=ISO
 *
 * Returns revenue + units sold grouped by product category.
 * Used to render the category drill-down bar chart in the sales dashboard.
 */
router.get('/breakdown',
  requirePermission('sales', 'read'),
  asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
    const organizationId = requireOrgId(req);
    const query = querySchema.parse(req.query);
    const { from, to } = resolveWindow(query.range ?? '7d', query.from, query.to);

    const rows = await prisma.$queryRaw<Array<{ category: string; revenue: number; units: number }>>`
      SELECT
        COALESCE(c.name, 'Sin categoría')          AS category,
        COALESCE(SUM(si.quantity * si.unit_price), 0)::numeric AS revenue,
        COALESCE(SUM(si.quantity), 0)::int          AS units
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p  ON p.id  = si.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE s.organization_id = ${organizationId}
        AND s.created_at >= ${from}
        AND s.created_at <  ${to}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 10
    `;

    const data = rows.map(r => ({
      category: r.category,
      revenue: Number(r.revenue),
      units: Number(r.units),
    }));

    res.json({ success: true, data });
  })
);

export default router;
