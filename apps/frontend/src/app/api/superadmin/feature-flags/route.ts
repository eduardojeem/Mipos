import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { FEATURE_FLAG_CATALOG, getFeatureFlags } from '@/lib/system/feature-flags';

/**
 * GET /api/superadmin/feature-flags
 * Devuelve el catálogo de flags (label/descripción/default) junto con el valor
 * efectivo actual de cada uno. La escritura se hace vía /api/superadmin/settings
 * con la key `feature_flags`.
 */
export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const values = await getFeatureFlags();

  const flags = FEATURE_FLAG_CATALOG.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    defaultValue: def.defaultValue,
    enabled: values[def.key] ?? def.defaultValue,
  }));

  return NextResponse.json({ flags });
}
