import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery, validateBody } from '../middleware/input-validator';
import { prisma, supabase } from '../index';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';
import { format } from 'date-fns';

const router = Router();

// Schema for query parameters
const catalogAuditQuerySchema = z.object({
  eventType: z.string().optional(),
  resourceType: z.enum(['CATALOG', 'PRODUCT', 'CATEGORY', 'CART', 'ORDER', 'FAVORITE']).optional(),
  resourceId: z.string().optional(),
  sessionId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  page: z.coerce.number().min(1).default(1),
  format: z.enum(['json', 'csv']).optional(),
});

// Schema for creating audit events
const catalogAuditEventSchema = z.object({
  eventType: z.string(),
  resourceType: z.enum(['CATALOG', 'PRODUCT', 'CATEGORY', 'CART', 'ORDER', 'FAVORITE']),
  resourceId: z.string().optional(),
  details: z.record(z.any()).optional(),
  sessionId: z.string().optional(),
});

// Schema for batch events
const catalogAuditBatchSchema = z.object({
  events: z.array(catalogAuditEventSchema),
});

// Get catalog audit logs
router.get('/', validateQuery(catalogAuditQuerySchema), asyncHandler(async (req, res) => {
  const query = req.query as z.infer<typeof catalogAuditQuerySchema>;
  const limit = query.limit;
  const page = query.page;
  const offset = (page - 1) * limit;

  const result = await getCatalogAuditLogs({
    eventType: query.eventType,
    resourceType: query.resourceType,
    resourceId: query.resourceId,
    sessionId: query.sessionId,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    limit,
    offset,
  });

  if (query.format === 'csv') {
    const csv = generateCSV(result.data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="catalog-audit-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    return res.send(csv);
  }

  res.json({
    ...result,
    page,
    limit,
  });
}));

// Get catalog audit statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await getCatalogAuditStats({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  });

  res.json(stats);
}));

// Get unique event types
router.get('/event-types', asyncHandler(async (req, res) => {
  const eventTypes = await getCatalogEventTypes();
  res.json({ eventTypes });
}));

// Get activity by session
router.get('/session/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await getCatalogAuditLogs({
    sessionId,
    limit,
    offset: 0,
  });

  res.json(result);
}));

// Get activity for a specific product
router.get('/product/:productId', asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await getCatalogAuditLogs({
    resourceType: 'PRODUCT',
    resourceId: productId,
    limit,
    offset: 0,
  });

  res.json(result);
}));

// Create a single audit event (public endpoint for frontend)
router.post('/', validateBody(catalogAuditEventSchema), asyncHandler(async (req, res) => {
  const event = req.body as z.infer<typeof catalogAuditEventSchema>;

  await createCatalogAuditLog({
    eventType: event.eventType,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    details: event.details || {},
    sessionId: event.sessionId,
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent'),
  });

  res.status(201).json({ success: true });
}));

// Batch create audit events (for frontend batching)
router.post('/batch', validateBody(catalogAuditBatchSchema), asyncHandler(async (req, res) => {
  const { events } = req.body as z.infer<typeof catalogAuditBatchSchema>;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent');

  await createCatalogAuditLogsBatch(
    events.map(event => ({
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      details: event.details || {},
      sessionId: event.sessionId,
      ipAddress,
      userAgent,
    }))
  );

  res.status(201).json({ success: true, count: events.length });
}));

// Get conversion funnel data
router.get('/funnel', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const funnel = await getConversionFunnel({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  });

  res.json(funnel);
}));

// Get top searched terms
router.get('/top-searches', asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = '10' } = req.query;

  const searches = await getTopSearches({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: parseInt(limit as string),
  });

  res.json(searches);
}));

// Get most viewed products
router.get('/top-products', asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = '10' } = req.query;

  const products = await getTopViewedProducts({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: parseInt(limit as string),
  });

  res.json(products);
}));

// Helper functions
async function getCatalogAuditLogs(filters: {
  eventType?: string;
  resourceType?: string;
  resourceId?: string;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  offset: number;
}) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from('catalog_audit_logs').select('*', { count: 'exact' });

      if (filters.eventType) query = query.eq('event_type', filters.eventType);
      if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
      if (filters.resourceId) query = query.eq('resource_id', filters.resourceId);
      if (filters.sessionId) query = query.eq('session_id', filters.sessionId);
      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      query = query
        .order('created_at', { ascending: false })
        .range(filters.offset, filters.offset + filters.limit - 1);

      const { data, error, count } = await query;

      if (error) throw new Error(`Database query failed: ${error.message}`);

      return {
        data: (data || []).map(mapRowToEvent),
        total: count || 0,
      };
    }
  }

  // Fallback: empty result if no Supabase or table doesn't exist
  return { data: [], total: 0 };
}

async function getCatalogAuditStats(filters: { startDate?: Date; endDate?: Date }) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from('catalog_audit_logs').select('event_type, resource_type');

      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      const { data, error } = await query;

      if (error) throw new Error(`Database query failed: ${error.message}`);

      const rows = data || [];
      const total = rows.length;

      // Group by event type
      const byEventType: Record<string, number> = {};
      rows.forEach((r: any) => {
        const et = r.event_type || 'UNKNOWN';
        byEventType[et] = (byEventType[et] || 0) + 1;
      });

      // Group by resource type
      const byResourceType: Record<string, number> = {};
      rows.forEach((r: any) => {
        const rt = r.resource_type || 'UNKNOWN';
        byResourceType[rt] = (byResourceType[rt] || 0) + 1;
      });

      return {
        total,
        byEventType: Object.entries(byEventType)
          .map(([eventType, count]) => ({ eventType, count }))
          .sort((a, b) => b.count - a.count),
        byResourceType: Object.entries(byResourceType)
          .map(([resourceType, count]) => ({ resourceType, count }))
          .sort((a, b) => b.count - a.count),
        pageViews: byEventType['PAGE_VIEW'] || 0,
        productViews: byEventType['PRODUCT_VIEW'] || 0,
        searches: byEventType['PRODUCT_SEARCH'] || 0,
        addToCart: byEventType['ADD_TO_CART'] || 0,
        checkouts: byEventType['CHECKOUT_COMPLETE'] || 0,
        orders: byEventType['ORDER_CREATED'] || 0,
      };
    }
  }

  return {
    total: 0,
    byEventType: [],
    byResourceType: [],
    pageViews: 0,
    productViews: 0,
    searches: 0,
    addToCart: 0,
    checkouts: 0,
    orders: 0,
  };
}

async function getCatalogEventTypes() {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('catalog_audit_logs')
        .select('event_type')
        .limit(1000);

      if (error) return [];

      const types = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.event_type) types.add(r.event_type);
      });

      return Array.from(types).sort();
    }
  }
  return [];
}

async function createCatalogAuditLog(event: {
  eventType: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
}) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from('catalog_audit_logs')
        .insert({
          event_type: event.eventType,
          resource_type: event.resourceType,
          resource_id: event.resourceId || null,
          details: event.details,
          session_id: event.sessionId || null,
          ip_address: event.ipAddress,
          user_agent: event.userAgent || null,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[CatalogAudit] Insert error:', error);
      }
    }
  }
}

async function createCatalogAuditLogsBatch(events: Array<{
  eventType: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
}>) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from('catalog_audit_logs')
        .insert(
          events.map(event => ({
            event_type: event.eventType,
            resource_type: event.resourceType,
            resource_id: event.resourceId || null,
            details: event.details,
            session_id: event.sessionId || null,
            ip_address: event.ipAddress,
            user_agent: event.userAgent || null,
            created_at: new Date().toISOString(),
          }))
        );

      if (error) {
        console.error('[CatalogAudit] Batch insert error:', error);
      }
    }
  }
}

async function getConversionFunnel(filters: { startDate?: Date; endDate?: Date }) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from('catalog_audit_logs').select('event_type, session_id');

      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      const { data, error } = await query;
      if (error) return { stages: [] };

      const rows = data || [];

      // Count unique sessions per stage
      const sessionsByStage: Record<string, Set<string>> = {
        PAGE_VIEW: new Set(),
        PRODUCT_VIEW: new Set(),
        ADD_TO_CART: new Set(),
        CHECKOUT_START: new Set(),
        CHECKOUT_COMPLETE: new Set(),
      };

      rows.forEach((r: any) => {
        if (r.session_id && sessionsByStage[r.event_type]) {
          sessionsByStage[r.event_type].add(r.session_id);
        }
      });

      const stages = [
        { stage: 'Visitas', count: sessionsByStage.PAGE_VIEW.size },
        { stage: 'Vistas de producto', count: sessionsByStage.PRODUCT_VIEW.size },
        { stage: 'Añadir al carrito', count: sessionsByStage.ADD_TO_CART.size },
        { stage: 'Inicio checkout', count: sessionsByStage.CHECKOUT_START.size },
        { stage: 'Compra completada', count: sessionsByStage.CHECKOUT_COMPLETE.size },
      ];

      // Calculate conversion rates
      return {
        stages: stages.map((stage, idx) => ({
          ...stage,
          conversionRate: idx === 0 ? 100 : 
            stages[idx - 1].count > 0 
              ? ((stage.count / stages[idx - 1].count) * 100).toFixed(2)
              : 0,
        })),
      };
    }
  }

  return { stages: [] };
}

async function getTopSearches(filters: { startDate?: Date; endDate?: Date; limit: number }) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      let query = client
        .from('catalog_audit_logs')
        .select('details')
        .eq('event_type', 'PRODUCT_SEARCH');

      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      const { data, error } = await query;
      if (error) return { searches: [] };

      const searchCounts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const q = r.details?.query?.toLowerCase();
        if (q) {
          searchCounts[q] = (searchCounts[q] || 0) + 1;
        }
      });

      const searches = Object.entries(searchCounts)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, filters.limit);

      return { searches };
    }
  }

  return { searches: [] };
}

async function getTopViewedProducts(filters: { startDate?: Date; endDate?: Date; limit: number }) {
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      let query = client
        .from('catalog_audit_logs')
        .select('resource_id, details')
        .eq('event_type', 'PRODUCT_VIEW')
        .not('resource_id', 'is', null);

      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      const { data, error } = await query;
      if (error) return { products: [] };

      const productCounts: Record<string, { count: number; name?: string }> = {};
      (data || []).forEach((r: any) => {
        const id = r.resource_id;
        if (id) {
          if (!productCounts[id]) {
            productCounts[id] = { count: 0, name: r.details?.productName };
          }
          productCounts[id].count++;
        }
      });

      const products = Object.entries(productCounts)
        .map(([productId, { count, name }]) => ({ productId, productName: name, views: count }))
        .sort((a, b) => b.views - a.views)
        .slice(0, filters.limit);

      return { products };
    }
  }

  return { products: [] };
}

function mapRowToEvent(row: any) {
  return {
    id: row.id,
    eventType: row.event_type,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    details: row.details,
    sessionId: row.session_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function generateCSV(data: any[]): string {
  if (data.length === 0) return 'No hay datos disponibles';

  const headers = [
    'ID',
    'Tipo de Evento',
    'Tipo de Recurso',
    'ID Recurso',
    'Session ID',
    'IP',
    'Fecha',
  ];

  const rows = data.map(row => [
    row.id || '',
    row.eventType || '',
    row.resourceType || '',
    row.resourceId || '',
    row.sessionId || '',
    row.ipAddress || '',
    row.createdAt ? new Date(row.createdAt).toISOString() : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export default router;
