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

/**
 * GET /api/sales/kpis?range=today|yesterday|7d|30d|90d|mtd|ytd
 *                  or ?from=ISO&to=ISO
 *
 * Returns a single jsonb payload computed in Postgres via `get_sales_kpis`:
 *   revenue, transactions, avg_ticket, gross_margin (+ %),
 *   payment_breakdown, top_products_by_qty/by_revenue,
 *   previous_window (same length, delta%) for comparison.
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

export default router;
