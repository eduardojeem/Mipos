import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'STATUS_CHANGE'
  | 'PAYMENT_UPDATE'
  | 'STOCK_UPDATE';

export interface AuditLogEntry {
  user_id?: string;
  action: AuditAction;
  table_name: string;
  record_id: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  organization_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Registra una acción en el log de auditoría
 */
export async function logAudit(
  entry: AuditLogEntry,
  request?: Request
): Promise<void> {
  try {
    const supabase = await createClient();

    // Obtener información adicional del request si está disponible
    let ipAddress = entry.ip_address;
    let userAgent = entry.user_agent;

    if (request) {
      const forwarded = request.headers.get('x-forwarded-for');
      ipAddress = forwarded ? forwarded.split(',')[0] : 'unknown';
      userAgent = request.headers.get('user-agent') || 'unknown';
    }

    // Insertar log de auditoría
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        table_name: entry.table_name,
        record_id: entry.record_id,
        old_data: entry.old_data || null,
        new_data: entry.new_data || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        organization_id: entry.organization_id,
        metadata: entry.metadata || null,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging audit:', error);
      // No lanzar error para no interrumpir la operación principal
    }
  } catch (error) {
    console.error('Error in logAudit:', error);
    // No lanzar error para no interrumpir la operación principal
  }
}

/**
 * Obtiene logs de auditoría con filtros
 */
export async function getAuditLogs(
  supabase: SupabaseClient,
  filters: {
    userId?: string;
    tableName?: string;
    recordId?: string;
    action?: AuditAction;
    organizationId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.tableName) {
    query = query.eq('table_name', filters.tableName);
  }

  if (filters.recordId) {
    query = query.eq('record_id', filters.recordId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  return await query;
}
