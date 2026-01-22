import { Request, Response, NextFunction } from 'express';
import { prisma, supabase } from '../index';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';

export interface AdminAuditRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    fullName?: string;
  };
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  userAgent?: string;
  details?: any;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  duration?: number;
  createdAt: Date;
}

const ADMIN_ACTIONS: Record<string, string> = {
  'GET /api/users': 'VIEW_USERS',
  'POST /api/users': 'CREATE_USER',
  'PUT /api/users': 'UPDATE_USER',
  'DELETE /api/users': 'DELETE_USER',
  'GET /api/audit': 'VIEW_AUDIT_LOGS',
  'GET /api/admin/audit': 'VIEW_ADMIN_AUDIT',
  'GET /api/reports': 'VIEW_REPORTS',
  'GET /api/dashboard': 'VIEW_DASHBOARD',
  'POST /api/categories': 'CREATE_CATEGORY',
  'PUT /api/categories': 'UPDATE_CATEGORY',
  'DELETE /api/categories': 'DELETE_CATEGORY',
  'POST /api/products': 'CREATE_PRODUCT',
  'PUT /api/products': 'UPDATE_PRODUCT',
  'DELETE /api/products': 'DELETE_PRODUCT',
  'POST /api/suppliers': 'CREATE_SUPPLIER',
  'PUT /api/suppliers': 'UPDATE_SUPPLIER',
  'DELETE /api/suppliers': 'DELETE_SUPPLIER',
  'POST /api/customers': 'CREATE_CUSTOMER',
  'PUT /api/customers': 'UPDATE_CUSTOMER',
  'DELETE /api/customers': 'DELETE_CUSTOMER',
  'POST /api/sales': 'CREATE_SALE',
  'PUT /api/sales': 'UPDATE_SALE',
  'DELETE /api/sales': 'DELETE_SALE',
  'POST /api/inventory': 'UPDATE_INVENTORY',
  'PUT /api/inventory': 'UPDATE_INVENTORY',
  'POST /api/promotions': 'CREATE_PROMOTION',
  'PUT /api/promotions': 'UPDATE_PROMOTION',
  'DELETE /api/promotions': 'DELETE_PROMOTION',
  'POST /api/coupons': 'CREATE_COUPON',
  'PUT /api/coupons': 'UPDATE_COUPON',
  'DELETE /api/coupons': 'DELETE_COUPON',
  'POST /api/cash': 'CASH_OPERATION',
  'PUT /api/cash': 'CASH_OPERATION',
  'POST /api/sessions': 'SESSION_OPERATION',
  'PUT /api/sessions': 'SESSION_OPERATION',
  'DELETE /api/sessions': 'SESSION_OPERATION',
  'POST /api/loyalty': 'LOYALTY_OPERATION',
  'PUT /api/loyalty': 'LOYALTY_OPERATION',
};

const getResourceFromPath = (path: string): string => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2) {
    return segments[1].replace('api', '').replace(/-/g, '_').toUpperCase() || segments[0].toUpperCase();
  }
  return 'UNKNOWN';
};

const getActionName = (method: string, path: string): string => {
  const basePath = path.replace(/\/[a-f0-9-]{36}/gi, '').replace(/\/\d+/g, '');
  const key = `${method} ${basePath}`;
  
  if (ADMIN_ACTIONS[key]) {
    return ADMIN_ACTIONS[key];
  }
  
  const resource = getResourceFromPath(path);
  switch (method) {
    case 'GET': return `VIEW_${resource}`;
    case 'POST': return `CREATE_${resource}`;
    case 'PUT':
    case 'PATCH': return `UPDATE_${resource}`;
    case 'DELETE': return `DELETE_${resource}`;
    default: return `${method}_${resource}`;
  }
};

export const adminAuditLogger = async (
  req: AdminAuditRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const originalSend = res.send.bind(res);

  const logEntry = {
    action: getActionName(req.method, req.path),
    resource: getResourceFromPath(req.path),
    resourceId: req.params.id || undefined,
    userId: req.user?.id || 'anonymous',
    userEmail: req.user?.email || 'anonymous',
    userRole: req.user?.role || 'unknown',
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent'),
    details: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: sanitizeBody(req.body),
    },
    status: 'PENDING' as const,
    createdAt: new Date(),
  };

  (res as any).send = function(this: Response, data: any) {
    const duration = Date.now() - startTime;
    const status = res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';
    
    createAdminAuditLog({
      ...logEntry,
      status,
      duration,
      details: {
        ...logEntry.details,
        responseStatus: res.statusCode,
      },
    }).catch(err => console.error('Failed to create admin audit log:', err));

    return originalSend(data);
  };

  next();
};

function sanitizeBody(body: any): any {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'currentPassword', 'newPassword'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

async function createAdminAuditLog(entry: Omit<AdminAuditLogEntry, 'id'>) {
  try {
    // Try Supabase first if configured
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client
          .from('audit_logs')
          .insert({
            action: entry.action,
            entity_type: entry.resource,
            entity_id: entry.resourceId || '',
            user_id: entry.userId,
            user_email: entry.userEmail,
            user_role: entry.userRole,
            ip_address: entry.ipAddress,
            changes: entry.details,
            timestamp: entry.createdAt.toISOString(),
          });
        
        if (error) {
          console.error('Supabase audit log insert error:', error);
        }
        return;
      }
    }

    // Fallback to Prisma
    const prismaAny = prisma as any;
    if (prismaAny.auditLog) {
      await prismaAny.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.resource,
          entityId: entry.resourceId || '',
          userId: entry.userId,
          userEmail: entry.userEmail,
          userRole: entry.userRole,
          ipAddress: entry.ipAddress,
          changes: entry.details,
          timestamp: entry.createdAt,
        },
      });
    }
  } catch (error) {
    console.error('Error creating admin audit log:', error);
  }
}

export interface AdminAuditFilters {
  action?: string;
  actionEq?: string;
  resource?: string;
  resourceEq?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'SUCCESS' | 'FAILURE' | 'PENDING';
  q?: string;
  limit?: number;
  page?: number;
}

export async function getAdminAuditLogs(filters: AdminAuditFilters) {
  const limit = filters.limit || 20;
  const page = filters.page || 1;
  const offset = (page - 1) * limit;

  // Try Supabase first
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      return getAuditLogsFromSupabase(client, filters, limit, offset, page);
    }
  }

  // Fallback to Prisma
  return getAuditLogsFromPrisma(filters, limit, offset, page);
}

async function getAuditLogsFromSupabase(
  client: any, 
  filters: AdminAuditFilters, 
  limit: number, 
  offset: number,
  page: number
) {
  let query = client.from('audit_logs').select('*', { count: 'exact' });

  // Apply filters
  if (filters.action) {
    query = query.ilike('action', `%${filters.action}%`);
  }
  if (filters.actionEq) {
    query = query.eq('action', filters.actionEq);
  }
  if (filters.resource) {
    query = query.ilike('entity_type', `%${filters.resource}%`);
  }
  if (filters.resourceEq) {
    query = query.eq('entity_type', filters.resourceEq);
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.startDate) {
    query = query.gte('timestamp', filters.startDate.toISOString());
  }
  if (filters.endDate) {
    query = query.lte('timestamp', filters.endDate.toISOString());
  }
  if (filters.q) {
    query = query.or(`action.ilike.%${filters.q}%,entity_type.ilike.%${filters.q}%,user_email.ilike.%${filters.q}%`);
  }

  // Order and pagination
  query = query
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  const mappedData = (data || []).map((row: any) => ({
    id: row.id,
    action: row.action,
    resource: row.entity_type,
    resourceId: row.entity_id,
    userId: row.user_id,
    userEmail: row.user_email,
    userRole: row.user_role,
    ipAddress: row.ip_address,
    details: row.changes || row.old_data || row.new_data,
    status: 'SUCCESS',
    createdAt: row.timestamp || row.created_at,
  }));

  return { data: mappedData, total: count || 0, page, limit };
}

async function getAuditLogsFromPrisma(
  filters: AdminAuditFilters,
  limit: number,
  offset: number,
  page: number
) {
  const prismaAny = prisma as any;

  if (!prismaAny.auditLog) {
    return { data: [], total: 0, page, limit };
  }

  const where: any = {};

  if (filters.action) {
    where.action = { contains: filters.action, mode: 'insensitive' };
  }
  if (filters.actionEq) {
    where.action = filters.actionEq;
  }
  if (filters.resource) {
    where.entityType = { contains: filters.resource, mode: 'insensitive' };
  }
  if (filters.resourceEq) {
    where.entityType = filters.resourceEq;
  }
  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }
  if (filters.q) {
    where.OR = [
      { action: { contains: filters.q, mode: 'insensitive' } },
      { entityType: { contains: filters.q, mode: 'insensitive' } },
      { userEmail: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prismaAny.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    }),
    prismaAny.auditLog.count({ where }),
  ]);

  const data = logs.map((log: any) => ({
    id: log.id,
    action: log.action,
    resource: log.entityType,
    resourceId: log.entityId,
    userId: log.userId,
    userEmail: log.userEmail,
    userRole: log.userRole,
    ipAddress: log.ipAddress,
    details: log.changes || log.oldData || log.newData,
    status: 'SUCCESS',
    createdAt: log.timestamp,
  }));

  return { data, total, page, limit };
}

export async function getAdminAuditMeta(type: 'actions' | 'resources', filters?: AdminAuditFilters) {
  // Try Supabase first
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      return getAuditMetaFromSupabase(client, type, filters);
    }
  }

  // Fallback to Prisma
  return getAuditMetaFromPrisma(type, filters);
}

async function getAuditMetaFromSupabase(client: any, type: 'actions' | 'resources', filters?: AdminAuditFilters) {
  const field = type === 'actions' ? 'action' : 'entity_type';
  
  let query = client.from('audit_logs').select(field);

  if (filters?.startDate) {
    query = query.gte('timestamp', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte('timestamp', filters.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase meta query error:', error);
    return { items: [], counts: {} };
  }

  // Group manually
  const counts: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    const val = row[field] || 'UNKNOWN';
    counts[val] = (counts[val] || 0) + 1;
  });

  // Sort by count descending
  const items = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  return { items, counts };
}

async function getAuditMetaFromPrisma(type: 'actions' | 'resources', filters?: AdminAuditFilters) {
  const prismaAny = prisma as any;

  if (!prismaAny.auditLog) {
    return { items: [], counts: {} };
  }

  const field = type === 'actions' ? 'action' : 'entityType';
  const where: any = {};

  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const result = await prismaAny.auditLog.groupBy({
    by: [field],
    _count: { [field]: true },
    where,
    orderBy: { _count: { [field]: 'desc' } },
  });

  const items = result.map((r: any) => r[field]).filter(Boolean);
  const counts: Record<string, number> = {};
  result.forEach((r: any) => {
    if (r[field]) counts[r[field]] = r._count[field];
  });

  return { items, counts };
}

export async function getAdminAuditStats(filters?: { startDate?: Date; endDate?: Date }) {
  // Try Supabase first
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      return getAuditStatsFromSupabase(client, filters);
    }
  }

  // Fallback to Prisma
  return getAuditStatsFromPrisma(filters);
}

async function getAuditStatsFromSupabase(client: any, filters?: { startDate?: Date; endDate?: Date }) {
  let query = client.from('audit_logs').select('id, action, entity_type, user_email, timestamp');

  if (filters?.startDate) {
    query = query.gte('timestamp', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte('timestamp', filters.endDate.toISOString());
  }

  const { data, error } = await query.order('timestamp', { ascending: false }).limit(1000);

  if (error) {
    console.error('Supabase stats query error:', error);
    return { total: 0, byAction: [], byResource: [], recentActivity: [] };
  }

  const rows = data || [];
  const total = rows.length;

  // Group by action
  const actionCounts: Record<string, number> = {};
  rows.forEach((r: any) => {
    const action = r.action || 'UNKNOWN';
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });

  // Group by resource
  const resourceCounts: Record<string, number> = {};
  rows.forEach((r: any) => {
    const resource = r.entity_type || 'UNKNOWN';
    resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
  });

  const byAction = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const byResource = Object.entries(resourceCounts)
    .map(([resource, count]) => ({ resource, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentActivity = rows.slice(0, 10).map((r: any) => ({
    id: r.id,
    action: r.action,
    entityType: r.entity_type,
    userEmail: r.user_email,
    timestamp: r.timestamp,
  }));

  // Get actual total count
  let countQuery = client.from('audit_logs').select('id', { count: 'exact', head: true });
  if (filters?.startDate) {
    countQuery = countQuery.gte('timestamp', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    countQuery = countQuery.lte('timestamp', filters.endDate.toISOString());
  }
  const { count: actualTotal } = await countQuery;

  return { 
    total: actualTotal || total, 
    byAction, 
    byResource, 
    recentActivity 
  };
}

async function getAuditStatsFromPrisma(filters?: { startDate?: Date; endDate?: Date }) {
  const prismaAny = prisma as any;

  if (!prismaAny.auditLog) {
    return { total: 0, byAction: [], byResource: [], recentActivity: [] };
  }

  const where: any = {};
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const [total, byAction, byResource, recentActivity] = await Promise.all([
    prismaAny.auditLog.count({ where }),
    prismaAny.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      where,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
    prismaAny.auditLog.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
      where,
      orderBy: { _count: { entityType: 'desc' } },
      take: 10,
    }),
    prismaAny.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        userEmail: true,
        timestamp: true,
      },
    }),
  ]);

  return {
    total,
    byAction: byAction.map((r: any) => ({ action: r.action, count: r._count.action })),
    byResource: byResource.map((r: any) => ({ resource: r.entityType, count: r._count.entityType })),
    recentActivity,
  };
}

// Export daily summary for admin dashboard
export async function getAdminAuditDailySummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [todayStats, yesterdayStats] = await Promise.all([
    getAdminAuditStats({ startDate: today }),
    getAdminAuditStats({ startDate: yesterday, endDate: today }),
  ]);

  return {
    today: todayStats,
    yesterday: yesterdayStats,
    change: todayStats.total - yesterdayStats.total,
    changePercent: yesterdayStats.total > 0 
      ? ((todayStats.total - yesterdayStats.total) / yesterdayStats.total) * 100 
      : 0,
  };
}
