import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { enhancedAuthMiddleware } from '../middleware/enhanced-auth';
import { getDatabaseHealth } from '../config/database-health';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// File storage helpers
function getSettingsFilePath() {
  // Store JSON under src/data so it is easy to locate in dev
  return path.join(__dirname, '../data/system-settings.json');
}

async function readSettingsFile(): Promise<Record<string, any>> {
  const file = getSettingsFilePath();
  try {
    const content = await fs.readFile(file, 'utf8');
    return JSON.parse(content);
  } catch (err: any) {
    // If file doesn't exist, return defaults
    if (err && (err.code === 'ENOENT' || err.code === 'ERR_MODULE_NOT_FOUND')) {
      return getDefaultSettings();
    }
    throw err;
  }
}

async function writeSettingsFile(settings: Record<string, any>) {
  const file = getSettingsFilePath();
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(settings, null, 2), 'utf8');
}

function getDefaultSettings(): Record<string, any> {
  return {
    store_name: 'Mi Tienda POS',
    store_address: '',
    store_phone: '',
    store_email: '',
    store_website: '',
    store_logo_url: '',
    tax_rate: 10,
    currency: 'PYG',
    receipt_footer: '',
    low_stock_threshold: 10,
    auto_backup: true,
    backup_frequency: 'daily',
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    timezone: 'America/Asuncion',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    decimal_places: 0,
    enable_barcode_scanner: true,
    enable_receipt_printer: true,
    enable_cash_drawer: true,
    max_discount_percentage: 50,
    require_customer_info: false,
    enable_loyalty_program: false
  };
}

// Zod schema (flexible, allows partial updates and extra fields)
const systemSettingsSchema = z.object({
  store_name: z.string().optional(),
  store_address: z.string().optional(),
  store_phone: z.string().optional(),
  store_email: z.string().optional(),
  store_website: z.string().optional(),
  store_logo_url: z.string().optional(),
  tax_rate: z.number().optional(),
  currency: z.string().optional(),
  receipt_footer: z.string().optional(),
  low_stock_threshold: z.number().optional(),
  auto_backup: z.boolean().optional(),
  backup_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.enum(['12h', '24h']).optional(),
  decimal_places: z.number().optional(),
  enable_barcode_scanner: z.boolean().optional(),
  enable_receipt_printer: z.boolean().optional(),
  enable_cash_drawer: z.boolean().optional(),
  max_discount_percentage: z.number().optional(),
  require_customer_info: z.boolean().optional(),
  enable_loyalty_program: z.boolean().optional()
}).passthrough();

// Public: GET settings for branding on login page
router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await readSettingsFile();
  res.json({ data: settings });
}));

// Protected: update settings
router.put('/settings', enhancedAuthMiddleware, asyncHandler(async (req, res) => {
  const parsed = systemSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createError('Validation failed', 400);
  }

  const existing = await readSettingsFile();
  const merged = { ...existing, ...parsed.data };
  await writeSettingsFile(merged);

  res.json({ message: 'System settings updated', data: merged });
}));

export default router;

// Protected: database health including Supabase
router.get('/health', enhancedAuthMiddleware, asyncHandler(async (req, res) => {
  const health = await getDatabaseHealth();
  res.json({ data: health });
}));

// Protected: detailed Supabase diagnostics
router.get('/health/supabase', enhancedAuthMiddleware, asyncHandler(async (req, res) => {
  const configured = isSupabaseConfigured();
  const supabase = getSupabaseClient();

  if (!configured || !supabase) {
    return res.json({
      data: {
        status: 'not_configured',
        config: {
          hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
        }
      }
    });
  }

  const results: any = {
    status: 'unknown',
    config: {
      hasUrl: true,
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    tests: {
      connectivity: { ok: false, responseTime: null as null | number, error: null as null | string },
      storage: { ok: false, avatarsBucket: false, error: null as null | string },
      admin: { ok: false, requiresServiceRole: false, error: null as null | string }
    },
    timestamp: new Date().toISOString()
  };

  // Connectivity test: simple select on categories
  try {
    const start = Date.now();
    const { error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    results.tests.connectivity.responseTime = Date.now() - start;
    if (error) {
      // Treat missing table as connected but not migrated
      if (String(error.message).includes('does not exist')) {
        results.tests.connectivity.ok = true;
        results.tests.connectivity.error = 'Tables not migrated but connection is valid';
      } else {
        throw error;
      }
    } else {
      results.tests.connectivity.ok = true;
    }
  } catch (err: any) {
    results.tests.connectivity.error = err?.message || 'Unknown error';
  }

  // Storage test: check buckets and avatars presence
  try {
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) throw storageError;
    results.tests.storage.ok = true;
    results.tests.storage.avatarsBucket = Array.isArray(buckets)
      ? buckets.some((b: any) => b.name === 'avatars')
      : false;
  } catch (err: any) {
    results.tests.storage.error = err?.message || 'Unknown error';
  }

  // Admin test: verify service role privileges by listing users with admin API
  try {
    // This requires service role key; anon will fail
    const { data: users, error: adminError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (adminError) {
      // Detect lack of service role
      results.tests.admin.requiresServiceRole = true;
      throw adminError;
    }
    results.tests.admin.ok = true;
  } catch (err: any) {
    const msg = err?.message || 'Unknown error';
    results.tests.admin.error = msg;
    if (msg.toLowerCase().includes('not allowed') || msg.toLowerCase().includes('invalid key')) {
      results.tests.admin.requiresServiceRole = true;
    }
  }

  // Overall status
  results.status =
    results.tests.connectivity.ok
      ? (results.tests.admin.ok || results.tests.admin.requiresServiceRole) ? 'healthy' : 'degraded'
      : 'unhealthy';

  return res.json({ data: results });
}));

// Protected: Supabase roles & permissions diagnostics
router.get('/health/supabase/roles', enhancedAuthMiddleware, asyncHandler(async (req, res) => {
  const configured = isSupabaseConfigured();
  const supabase = getSupabaseClient();

  if (!configured || !supabase) {
    return res.json({
      data: {
        status: 'not_configured',
        config: {
          hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
        }
      }
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonClient = (anonKey ? createClient(supabaseUrl, anonKey) : null);

  const out: any = {
    status: 'unknown',
    config: {
      hasUrl: true,
      hasAnonKey: Boolean(anonKey),
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    tables: {
      roles: { exists: false, count: null as number | null, error: null as string | null },
      permissions: { exists: false, count: null as number | null, error: null as string | null },
      role_permissions: { exists: false, count: null as number | null, error: null as string | null },
      user_roles: { exists: false, count: null as number | null, error: null as string | null }
    },
    functions: {
      is_admin: { ok: false, result: null as any, error: null as string | null },
      get_current_user_permissions: { ok: false, result: null as any, error: null as string | null },
      get_roles_system_stats: { ok: false, result: null as any, error: null as string | null }
    },
    rls: {
      anonReadRoles: { ok: false, error: null as string | null }
    },
    timestamp: new Date().toISOString()
  };

  // Helper to check table existence and count
  async function checkTable(name: string) {
    try {
      const { count, error } = await supabase
        .from(name)
        .select('*', { count: 'exact', head: true });
      if (error) {
        if (String(error.message).includes('does not exist')) {
          out.tables[name as keyof typeof out.tables] = { exists: false, count: null, error: 'table_not_found' };
        } else {
          out.tables[name as keyof typeof out.tables] = { exists: false, count: null, error: error.message };
        }
      } else {
        out.tables[name as keyof typeof out.tables] = { exists: true, count: count ?? null, error: null };
      }
    } catch (err: any) {
      out.tables[name as keyof typeof out.tables] = { exists: false, count: null, error: err?.message || 'unknown_error' };
    }
  }

  await checkTable('roles');
  await checkTable('permissions');
  await checkTable('role_permissions');
  await checkTable('user_roles');

  // RPC function checks (if available)
  async function tryRpc(fnName: string, params?: Record<string, any>) {
    try {
      const { data, error } = await supabase.rpc(fnName, params ?? {});
      if (error) {
        out.functions[fnName as keyof typeof out.functions] = { ok: false, result: null, error: error.message };
      } else {
        out.functions[fnName as keyof typeof out.functions] = { ok: true, result: data, error: null };
      }
    } catch (err: any) {
      out.functions[fnName as keyof typeof out.functions] = { ok: false, result: null, error: err?.message || 'unknown_error' };
    }
  }

  await tryRpc('is_admin');
  await tryRpc('get_current_user_permissions');
  await tryRpc('get_roles_system_stats');

  // RLS check: try reading roles with anon client (if available)
  if (anonClient) {
    try {
      const { error } = await anonClient
        .from('roles')
        .select('id, name')
        .limit(1);
      if (error) throw error;
      out.rls.anonReadRoles.ok = true;
    } catch (err: any) {
      out.rls.anonReadRoles.error = err?.message || 'unknown_error';
    }
  }

  // Overall status
  const requiredTablesOk = out.tables.roles.exists && out.tables.permissions.exists;
  const haveData = (out.tables.roles.count ?? 0) > 0 && (out.tables.permissions.count ?? 0) > 0;
  const rpcOk = out.functions.get_roles_system_stats.ok || out.functions.get_current_user_permissions.ok || out.functions.is_admin.ok;
  out.status = requiredTablesOk ? (haveData ? (rpcOk ? 'healthy' : 'degraded') : 'migrated_no_data') : 'unhealthy';

  return res.json({ data: out });
}));