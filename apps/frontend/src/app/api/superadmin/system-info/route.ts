import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';

// Catálogo de variables de entorno que reporta el panel. SECURITY: para las
// secretas solo se informa present/ausente, NUNCA el valor. Para las públicas
// (NEXT_PUBLIC_*, que ya viajan al browser) se muestra un preview enmascarado.
type EnvGroup = 'core' | 'app' | 'optional';
interface EnvVarSpec {
  key: string;
  label: string;
  group: EnvGroup;
  required: boolean;
  secret: boolean;
}

const ENV_CATALOG: EnvVarSpec[] = [
  // Núcleo (sin esto el sistema no funciona)
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', group: 'core', required: true, secret: false },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', group: 'core', required: true, secret: false },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', group: 'core', required: true, secret: true },
  // Aplicación
  { key: 'NEXT_PUBLIC_APP_URL', label: 'App URL', group: 'app', required: true, secret: false },
  { key: 'NEXT_PUBLIC_BASE_DOMAIN', label: 'Dominio base', group: 'app', required: false, secret: false },
  { key: 'NEXT_PUBLIC_API_URL', label: 'API URL', group: 'app', required: false, secret: false },
  { key: 'BACKEND_URL', label: 'Backend URL', group: 'app', required: false, secret: true },
  { key: 'NEXT_PUBLIC_APP_VERSION', label: 'App Version', group: 'app', required: false, secret: false },
  // Opcionales / integraciones
  { key: 'NEXT_PUBLIC_SENTRY_DSN', label: 'Sentry DSN', group: 'optional', required: false, secret: true },
  { key: 'JWT_SECRET', label: 'JWT Secret', group: 'optional', required: false, secret: true },
  { key: 'NEXT_PUBLIC_SUPABASE_PROJECT_ID', label: 'Supabase Project ID', group: 'optional', required: false, secret: false },
];

const PLACEHOLDER_PATTERN = /^(your[-_]|changeme|placeholder|xxx|todo|<|undefined$|null$)/i;

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value.trim());
}

function maskPreview(value: string): string {
  if (value.length <= 24) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function buildEnvStatus() {
  return ENV_CATALOG.map((spec) => {
    const raw = process.env[spec.key];
    const present = typeof raw === 'string' && raw.trim().length > 0 && !isPlaceholder(raw);
    return {
      key: spec.key,
      label: spec.label,
      group: spec.group,
      required: spec.required,
      secret: spec.secret,
      present,
      // Preview solo para públicas presentes; secretos nunca exponen valor.
      preview: present && !spec.secret ? maskPreview(raw!.trim()) : null,
    };
  });
}

/**
 * GET /api/superadmin/system-info
 * Información read-only del sistema para el panel de configuración:
 * versión de la app, entorno, runtime, estado de conexión a Supabase,
 * dominio base y totales de organizaciones/usuarios.
 */
export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const startedAt = Date.now();
  let dbStatus: 'connected' | 'error' = 'error';
  let dbLatencyMs: number | null = null;
  let totalOrganizations = 0;
  let totalUsers = 0;
  let baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'MITIENDAparaguay.vercel.app';

  try {
    const admin = createAdminClient();
    const pingStart = Date.now();

    const [orgsRes, usersRes, domainRes] = await Promise.all([
      admin.from('organizations').select('id', { count: 'exact', head: true }),
      admin.from('users').select('id', { count: 'exact', head: true }),
      admin.from('system_settings').select('value').eq('key', 'base_domain').maybeSingle(),
    ]);

    dbLatencyMs = Date.now() - pingStart;
    dbStatus = orgsRes.error ? 'error' : 'connected';
    totalOrganizations = orgsRes.count || 0;
    totalUsers = usersRes.count || 0;
    const domainValue = (domainRes.data?.value as { domain?: string } | null)?.domain;
    if (domainValue) baseDomain = domainValue;
  } catch {
    dbStatus = 'error';
  }

  const env = buildEnvStatus();
  const envSummary = {
    total: env.length,
    present: env.filter((e) => e.present).length,
    missingRequired: env.filter((e) => e.required && !e.present).map((e) => e.key),
  };

  return NextResponse.json({
    app: {
      name: 'MITIENDA',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'local',
    },
    env,
    envSummary,
    database: {
      provider: 'Supabase (Postgres)',
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    domain: { baseDomain },
    totals: {
      organizations: totalOrganizations,
      users: totalUsers,
    },
    generatedAt: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
  });
}
