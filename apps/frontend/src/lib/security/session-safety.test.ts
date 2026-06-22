import {
  intersectSessionUserIds,
  isCurrentSessionInvalidation,
} from './session-safety'

describe('session safety', () => {
  it('preserves an empty tenant scope instead of treating it as global access', () => {
    expect(intersectSessionUserIds([], undefined)).toEqual([])
    expect(intersectSessionUserIds(undefined, [])).toEqual([])
    expect(intersectSessionUserIds([], ['user-1'])).toEqual([])
  })

  it('only invalidates the exact current session row', () => {
    const current = { userId: 'user-1', sessionKey: 'session-current' }

    expect(isCurrentSessionInvalidation({
      user_id: 'user-1',
      supabase_session_id: 'session-other',
      is_active: false,
    }, current)).toBe(false)

    expect(isCurrentSessionInvalidation({
      user_id: 'user-2',
      supabase_session_id: 'session-current',
      is_active: false,
    }, current)).toBe(false)

    expect(isCurrentSessionInvalidation({
      user_id: 'user-1',
      supabase_session_id: 'session-current',
      is_active: true,
    }, current)).toBe(false)

    expect(isCurrentSessionInvalidation({
      user_id: 'user-1',
      supabase_session_id: 'session-current',
      is_active: false,
    }, current)).toBe(true)
  })
})
