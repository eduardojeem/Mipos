import { NextRequest } from 'next/server'

export interface RequestOperationalContext {
  branchId: string | null
  posId: string | null
  registerId: string | null
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const lowered = trimmed.toLowerCase()
  if (lowered === 'undefined' || lowered === 'null') {
    return null
  }

  return trimmed
}

export function getRequestOperationalContext(
  request: NextRequest,
  body?: Record<string, unknown> | null,
): RequestOperationalContext {
  const branchId = normalizeString(
    request.headers.get('x-branch-id') ||
      request.headers.get('X-Branch-Id') ||
      body?.branch_id ||
      body?.branchId,
  )

  const posId =
    normalizeString(
      request.headers.get('x-pos-id') ||
        request.headers.get('X-Pos-Id') ||
        body?.pos_id ||
        body?.posId,
    ) ||
    normalizeString(
      request.headers.get('x-register-id') ||
        request.headers.get('X-Register-Id') ||
        body?.register_id ||
        body?.registerId,
    )

  return {
    branchId,
    posId,
    registerId: posId,
  }
}
