export interface OperationalContext {
  branchId: string | null
  posId: string | null
  registerId: string | null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function parseStoredValue(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function normalizeMeaningfulString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const lowered = trimmed.toLowerCase()
  if (lowered === 'undefined' || lowered === 'null') {
    return null
  }

  return trimmed
}

function firstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    const normalized = normalizeMeaningfulString(value)
    if (normalized) return normalized
  }
  return null
}

function readStorageObject(keys: string[]): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  for (const key of keys) {
    const parsed = parseStoredValue(window.localStorage.getItem(key))
    if (parsed) return parsed
  }
  return null
}

function readStorageString(keys: string[]): string | null {
  if (typeof window === 'undefined') return null
  for (const key of keys) {
    const raw = window.localStorage.getItem(key)
    const normalizedRaw = normalizeMeaningfulString(raw)
    if (normalizedRaw && !normalizedRaw.startsWith('{')) {
      return normalizedRaw
    }
    const parsed = parseStoredValue(raw)
    if (parsed) {
      const picked = firstString(
        parsed.id,
        parsed.value,
        parsed.branch_id,
        parsed.branchId,
        parsed.pos_id,
        parsed.posId,
        parsed.register_id,
        parsed.registerId,
      )
      if (picked) return picked
    }
  }
  return null
}

export function getClientOperationalContext(): OperationalContext {
  if (typeof window === 'undefined') {
    return { branchId: null, posId: null, registerId: null }
  }

  const organization = parseStoredValue(window.localStorage.getItem('selected_organization'))
  const branchObject = readStorageObject(['selected_branch', 'selected_branch_context', 'selected_location'])
  const posObject = readStorageObject(['selected_pos', 'selected_register', 'selected_terminal'])

  const branchId = firstString(
    readStorageString(['selected_branch_id']),
    branchObject?.id,
    branchObject?.branch_id,
    branchObject?.branchId,
    organization?.branch_id,
    organization?.branchId,
    organization?.default_branch_id,
    organization?.defaultBranchId,
    readCookie('x-branch-id'),
  )

  const posId = firstString(
    readStorageString(['selected_pos_id', 'selected_register_id']),
    posObject?.id,
    posObject?.pos_id,
    posObject?.posId,
    posObject?.register_id,
    posObject?.registerId,
    organization?.pos_id,
    organization?.posId,
    organization?.register_id,
    organization?.registerId,
    organization?.default_pos_id,
    organization?.defaultPosId,
    readCookie('x-pos-id'),
    readCookie('x-register-id'),
  )

  return {
    branchId,
    posId,
    registerId: posId,
  }
}

export function getOperationalContextHeaders(): Record<string, string> {
  const context = getClientOperationalContext()
  const headers: Record<string, string> = {}

  if (context.branchId) {
    headers['x-branch-id'] = context.branchId
  }

  if (context.posId) {
    headers['x-pos-id'] = context.posId
    headers['x-register-id'] = context.posId
  }

  return headers
}
