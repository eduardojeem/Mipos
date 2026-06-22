export interface SessionInvalidationRow {
  user_id?: string | null
  supabase_session_id?: string | null
  is_active?: boolean | null
}

export interface CurrentSessionIdentity {
  userId: string
  sessionKey: string
}

export function intersectSessionUserIds(
  first: string[] | undefined,
  second: string[] | undefined
): string[] | undefined {
  if (first === undefined && second === undefined) return undefined
  if (first === undefined) return second ? [...second] : undefined
  if (second === undefined) return [...first]

  const right = new Set(second)
  return first.filter((value) => right.has(value))
}

export function isCurrentSessionInvalidation(
  row: SessionInvalidationRow,
  current: CurrentSessionIdentity
): boolean {
  return row.is_active === false
    && row.user_id === current.userId
    && row.supabase_session_id === current.sessionKey
}

function decodeJwtSessionKey(accessToken?: string | null): string | null {
  try {
    const parts = String(accessToken || '').split('.')
    if (parts.length < 2) return null

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    const decoded = JSON.parse(atob(payload)) as Record<string, unknown>
    const candidate = decoded.session_id || decoded.sid || decoded.jti

    return typeof candidate === 'string' && candidate.trim()
      ? candidate.trim()
      : null
  } catch {
    return null
  }
}

export async function resolveBrowserSessionKey(
  accessToken?: string | null,
  refreshToken?: string | null
): Promise<string | null> {
  const jwtSessionKey = decodeJwtSessionKey(accessToken)
  if (jwtSessionKey) return jwtSessionKey

  const fallback = String(refreshToken || accessToken || '').trim()
  if (!fallback || !globalThis.crypto?.subtle) return null

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(fallback)
  )

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
