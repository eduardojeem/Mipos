import { getSupabaseClient } from '../../config/supabase';
import { createError } from '../../middleware/errorHandler';
import type { OperationalContext } from './operational-context';

type CashSessionScopeRow = {
  id: string;
  organization_id?: string | null;
  status?: string | null;
  opened_at?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
  opening_amount?: number | string | null;
  notes?: string | null;
};

const OPERATIONAL_ID_PATTERN = /^[A-Za-z0-9:_-]{1,120}$/;

function normalizeScopeValue(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return null;
  }

  return trimmed;
}

function isMissingRelationError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? '').toLowerCase();
  const details = String((error as { details?: unknown } | null)?.details ?? '').toLowerCase();
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes('relation') ||
    message.includes('table') ||
    details.includes('relation') ||
    details.includes('table')
  );
}

function normalizeOperationalId(value: string | null | undefined) {
  const trimmed = normalizeScopeValue(value);
  if (!trimmed) return null;
  return OPERATIONAL_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function assertOperationalId(value: string | null | undefined, label: string) {
  const trimmed = normalizeScopeValue(value);
  if (!trimmed) return null;

  if (!OPERATIONAL_ID_PATTERN.test(trimmed)) {
    throw createError(`El ${label} es inválido`, 400);
  }

  return trimmed;
}

export function sanitizeOperationalContext(context?: OperationalContext | null): OperationalContext {
  const branchId = normalizeOperationalId(context?.branchId);
  const posId = normalizeOperationalId(context?.posId || context?.registerId);

  return {
    branchId,
    posId,
    registerId: posId,
  };
}

export async function validateCashOperationalContext(
  organizationId: string,
  context?: OperationalContext | null,
): Promise<OperationalContext> {
  const branchId = assertOperationalId(context?.branchId, 'identificador de sucursal');
  const posId = assertOperationalId(context?.posId || context?.registerId, 'identificador de caja');
  const supabase = getSupabaseClient();

  if (branchId && supabase) {
    const { data, error } = await supabase
      .from('branches')
      .select('id, organization_id, is_active')
      .eq('id', branchId)
      .maybeSingle();

    if (error) {
      if (!isMissingRelationError(error)) {
        throw createError('No se pudo validar la sucursal seleccionada', 500);
      }
    } else {
      if (!data) {
        throw createError('La sucursal seleccionada no existe', 400);
      }

      if (data.organization_id && data.organization_id !== organizationId) {
        throw createError('La sucursal seleccionada no pertenece a tu organización', 400);
      }

      if (data.is_active === false) {
        throw createError('La sucursal seleccionada está inactiva', 400);
      }
    }
  }

  return {
    branchId,
    posId,
    registerId: posId,
  };
}

async function fetchOpenCashSessionRows(organizationId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('cash_sessions')
    .select('id, organization_id, status, opened_at, branch_id, pos_id, opening_amount, notes')
    .eq('organization_id', organizationId)
    .or('status.eq.OPEN,status.eq.open')
    .order('opened_at', { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw createError(error.message || 'No se pudieron consultar las sesiones de caja', 500);
  }

  return (data || []) as CashSessionScopeRow[];
}

function getSessionMatchPriority(
  row: CashSessionScopeRow,
  context?: OperationalContext | null,
) {
  const requestBranchId = normalizeScopeValue(context?.branchId);
  const requestPosId = normalizeScopeValue(context?.posId || context?.registerId);
  const sessionBranchId = normalizeScopeValue(row.branch_id);
  const sessionPosId = normalizeScopeValue(row.pos_id);

  if (!requestBranchId && !requestPosId) {
    return !sessionBranchId && !sessionPosId ? 3 : 1;
  }

  if (requestBranchId) {
    if (sessionBranchId === requestBranchId && requestPosId && sessionPosId === requestPosId) {
      return 4;
    }

    if (sessionBranchId === requestBranchId) {
      return 3;
    }

    if (!sessionBranchId && !sessionPosId) {
      return 1;
    }

    return 0;
  }

  if (requestPosId) {
    if (sessionPosId === requestPosId) {
      return 3;
    }

    if (!sessionBranchId && !sessionPosId) {
      return 1;
    }

    return 0;
  }

  return 0;
}

function isConflictingOpenSession(
  row: CashSessionScopeRow,
  context?: OperationalContext | null,
) {
  const requestBranchId = normalizeScopeValue(context?.branchId);
  const requestPosId = normalizeScopeValue(context?.posId || context?.registerId);
  const sessionBranchId = normalizeScopeValue(row.branch_id);
  const sessionPosId = normalizeScopeValue(row.pos_id);

  if (!requestBranchId && !requestPosId) {
    return !sessionBranchId && !sessionPosId;
  }

  if (requestBranchId) {
    return sessionBranchId === requestBranchId;
  }

  if (requestPosId) {
    return sessionPosId === requestPosId;
  }

  return false;
}

export async function findScopedOpenCashSession(
  organizationId: string,
  context?: OperationalContext | null,
) {
  const rows = await fetchOpenCashSessionRows(organizationId);
  if (!rows) {
    return null;
  }

  const normalized = sanitizeOperationalContext(context);

  const ranked = rows
    .map((row) => ({ row, priority: getSessionMatchPriority(row, normalized) }))
    .filter((entry) => entry.priority > 0)
    .sort((left, right) => right.priority - left.priority);

  return ranked[0]?.row ?? null;
}

export async function findConflictingOpenCashSession(
  organizationId: string,
  context?: OperationalContext | null,
) {
  const rows = await fetchOpenCashSessionRows(organizationId);
  if (!rows) {
    return null;
  }

  const normalized = sanitizeOperationalContext(context);
  return rows.find((row) => isConflictingOpenSession(row, normalized)) ?? null;
}

export function isCashSessionUniqueConflict(error: unknown) {
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();
  const message = String((error as { message?: unknown } | null)?.message ?? '').toLowerCase();

  return (
    code === '23505' ||
    (message.includes('duplicate key') && message.includes('cash_sessions')) ||
    (message.includes('unique') && message.includes('cash_sessions'))
  );
}
