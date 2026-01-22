// Simple in-memory audit logger for admin actions (mock).
// This is process-local and resets on server restart; intended for dev/testing.

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'

export type AuditEvent =
  | "sessions.cleanup"
  | "sessions.terminate"
  | "sessions.terminate_all"
  | "sessions.list";

export type AuditActor = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
} | null;

export interface AuditLogEntry {
  id: string;
  ts: string; // ISO timestamp
  event: AuditEvent | string;
  actor: AuditActor;
  meta?: Record<string, any>;
}

const MAX_LOGS = 500;

// Persist across route modules within the same Node.js process (dev)
// In serverless/edge this will not persist across invocations
declare global {
  // eslint-disable-next-line no-var
  var __AUDIT_LOGS__: AuditLogEntry[] | undefined;
}
const g = globalThis as typeof globalThis & { __AUDIT_LOGS__?: AuditLogEntry[] };
const AUDIT_LOGS: AuditLogEntry[] = g.__AUDIT_LOGS__ || (g.__AUDIT_LOGS__ = []);

export function logAudit(
  event: AuditEvent | string,
  meta?: Record<string, any>,
  actor: AuditActor = null
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    event,
    actor: actor ?? null,
    meta: meta ?? {},
  };
  AUDIT_LOGS.push(entry);
  if (AUDIT_LOGS.length > MAX_LOGS) {
    AUDIT_LOGS.splice(0, AUDIT_LOGS.length - MAX_LOGS);
  }
  // Structured log for local inspection
  // eslint-disable-next-line no-console
  console.log("[AUDIT]", JSON.stringify(entry));

  // Fire-and-forget intento de inserción real en BD (si hay contexto)
  // No bloquea la respuesta ni rompe en caso de error
  void insertAuditToDb(entry).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[AUDIT][DB] Insert fallback (no insert):', e?.message || e)
  })

  return entry;
}

async function resolveActor(): Promise<{ id?: string; email?: string; role?: string } | null> {
  try {
    const store = await cookies()
    const supa = await createServerClient(store)
    const { data } = await (supa as any).auth.getUser()
    const email: string | undefined = data?.user?.email
    if (!email) return null
    // Intentar mapear al usuario de la tabla users por email
    const { data: user } = await supa.from('users').select('*').eq('email', email).single()
    if (!user) return { email }
    return { id: user.id, email: user.email, role: user.role }
  } catch {
    return null
  }
}

async function insertAuditToDb(entry: AuditLogEntry) {
  // Requiere userId válido para cumplir FK no nula
  let userId = entry.actor?.id || undefined
  let userEmail = entry.actor?.email || undefined
  let userRole = entry.actor?.role || undefined

  if (!userId) {
    const resolved = await resolveActor()
    if (resolved?.id) {
      userId = resolved.id
      userEmail = resolved.email
      userRole = resolved.role
    }
  }

  if (!userId) return // No hay actor válido -> no insertar

  const meta = entry.meta || {}
  const entityType = meta.entityType || 'SESSION'
  const entityId = meta.sessionId || meta.entityId || '-'
  const ipAddress = meta.ipAddress || 'frontend'

  try {
    const store = await cookies()
    const supa = await createServerClient(store)
    
    await supa.from('audit_logs').insert({
      action: String(entry.event),
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      user_email: userEmail || 'unknown',
      user_role: userRole || 'UNKNOWN',
      ip_address: ipAddress,
      changes: meta.changes || null,
      old_data: meta.oldData || null,
      new_data: meta.newData || meta || null,
      timestamp: new Date(entry.ts)
    })
  } catch (e) {
    // Ignore db errors for audit logs
    console.warn('Failed to insert audit log to Supabase', e)
  }
}

export function getAuditLogs(limit = 50): AuditLogEntry[] {
  const l = Math.max(1, Math.min(limit, MAX_LOGS));
  // Newest first
  return AUDIT_LOGS.slice(-l).reverse();
}