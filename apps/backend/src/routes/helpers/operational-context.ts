import { Request } from 'express';

export interface OperationalContext {
  branchId: string | null;
  posId: string | null;
  registerId: string | null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return null;
  }

  return trimmed;
}

export function getOperationalContext(req: Request): OperationalContext {
  const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};

  const branchId = normalizeString(
    req.headers['x-branch-id'] ||
    req.headers['X-Branch-Id'] ||
    body.branchId ||
    body.branch_id,
  );

  const posId =
    normalizeString(
      req.headers['x-pos-id'] ||
      req.headers['X-Pos-Id'] ||
      body.posId ||
      body.pos_id,
    ) ||
    normalizeString(
      req.headers['x-register-id'] ||
      req.headers['X-Register-Id'] ||
      body.registerId ||
      body.register_id,
    );

  return {
    branchId,
    posId,
    registerId: posId,
  };
}
