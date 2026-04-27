import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import * as supabaseServer from '@/lib/supabase/server'
import * as subscriptionLib from '@/app/api/subscription/_lib'

vi.mock('@/app/api/_utils/auth')
vi.mock('@/lib/supabase/server')
vi.mock('@/app/api/subscription/_lib')

describe('Superadmin org summary API', () => {
  let request: NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
    request = { url: 'http://localhost:3000/api/superadmin/organizations/org-1/summary', method: 'GET' } as any
  })

  it('denies when not superadmin', async () => {
    vi.mocked(assertSuperAdmin).mockResolvedValue({ ok: false, status: 401, body: { error: 'No autorizado' } } as any)
    const response = await GET(request, { params: Promise.resolve({ id: 'org-1' }) })
    expect(response.status).toBe(401)
  })

  it('returns summary with subscription', async () => {
    vi.mocked(assertSuperAdmin).mockResolvedValue({ ok: true } as any)

    vi.mocked(supabaseServer.createAdminClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'org-1',
                name: 'Org Uno',
                slug: 'org-uno',
                created_at: '2026-01-01T00:00:00.000Z',
                subscription_plan: 'FREE',
                subscription_status: 'ACTIVE',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    vi.mocked(subscriptionLib.getSubscriptionSnapshot).mockResolvedValue({
      plan: { id: 'plan-1', slug: 'starter', name: 'Starter' },
      billingCycle: 'monthly',
      currentPeriodStart: '2026-04-01T00:00:00.000Z',
      currentPeriodEnd: '2026-05-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      subscriptionStatus: 'active',
    } as any)

    const response = await GET(request, { params: Promise.resolve({ id: 'org-1' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.organizationId).toBe('org-1')
    expect(json.data.subscription.planSlug).toBe('starter')
  })
})

