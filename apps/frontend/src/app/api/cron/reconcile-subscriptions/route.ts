import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { reconcileExpiredSubscription } from '@/app/api/subscription/_lib'
import { logAudit } from '@/app/api/admin/_utils/audit'

function getBearerToken(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

function safeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON deshabilitado (CRON_SECRET faltante)' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  const token =
    request.headers.get('x-cron-secret')?.trim() ||
    getBearerToken(authHeader) ||
    null

  if (!token || !safeCompare(token, secret)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)))
  const dryRun = url.searchParams.get('dryRun') === '1'

  const nowIso = new Date().toISOString()
  const nonActive = ['past_due', 'suspended', 'cancelled', 'canceled', 'expired']

  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('saas_subscriptions')
    .select('organization_id,status,cancel_at_period_end,current_period_end')
    .lte('current_period_end', nowIso)
    .or(`cancel_at_period_end.eq.true,status.in.(${nonActive.join(',')})`)
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudo listar suscripciones vencidas' }, { status: 500 })
  }

  const rows = (data || []) as Array<{
    organization_id: string | null
    status: string | null
    cancel_at_period_end: boolean | null
    current_period_end: string | null
  }>

  const uniqueOrgIds = Array.from(
    new Set(rows.map((r) => r.organization_id).filter((id): id is string => Boolean(id)))
  )

  let reconciled = 0
  let deactivatedBranches = 0
  const details: Array<{ organizationId: string; reconciled: boolean; deactivatedBranches?: number }> = []

  for (const organizationId of uniqueOrgIds) {
    if (dryRun) {
      details.push({ organizationId, reconciled: false })
      continue
    }

    const result = await reconcileExpiredSubscription({ organizationId }).catch(() => null)
    if (result?.reconciled) {
      reconciled += 1
      const count = result.branchPolicy?.deactivatedBranchIds?.length || 0
      deactivatedBranches += count
      details.push({ organizationId, reconciled: true, deactivatedBranches: count })
    } else {
      details.push({ organizationId, reconciled: false })
    }
  }

  logAudit('cron.reconcile_subscriptions.completed', {
    entityType: 'CRON',
    entityId: 'reconcile-subscriptions',
    scanned: uniqueOrgIds.length,
    reconciled,
    deactivatedBranches,
    dryRun,
  })

  return NextResponse.json({
    success: true,
    scanned: uniqueOrgIds.length,
    reconciled,
    deactivatedBranches,
    dryRun,
    details,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
