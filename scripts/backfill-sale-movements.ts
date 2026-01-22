import { createClient } from '@supabase/supabase-js'

type SaleRow = {
  id: string
  user_id: string | null
  total_amount: number
  payment_method: string
  created_at: string
}

type SessionRow = {
  id: string
  opened_at: string
  closed_at: string | null
  status: string
}

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function parseDateArg(arg?: string | null): string | null {
  if (!arg) return null
  const d = new Date(arg)
  if (isNaN(+d)) return null
  return d.toISOString()
}

async function main() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const args = process.argv.slice(2)
  const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1] || null
  const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1] || null
  const dryRun = !!args.find(a => a === '--dry-run')

  const fromIso = fromArg ? new Date(fromArg).toISOString() : null
  const toIso = toArg ? new Date(toArg).toISOString() : null

  console.log('🔄 Backfill SALE movements')
  console.log('   Range:', fromIso || '(unbounded)', '→', toIso || '(unbounded)')
  console.log('   Dry run:', dryRun)

  // Fetch sales missing a movement reference
  let salesQuery = supabase
    .from('sales')
    .select('id, user_id, total_amount, payment_method, created_at')
    .order('created_at', { ascending: true })

  if (fromIso) salesQuery = salesQuery.gte('created_at', fromIso)
  if (toIso) salesQuery = salesQuery.lte('created_at', toIso)

  const { data: sales, error: salesErr } = await salesQuery
  if (salesErr) throw new Error(`Failed to fetch sales: ${salesErr.message}`)

  // Fetch sessions to match by time
  const { data: sessions, error: sesErr } = await supabase
    .from('cash_sessions')
    .select('id, opened_at, closed_at, status')
    .order('opened_at', { ascending: true })
  if (sesErr) throw new Error(`Failed to fetch sessions: ${sesErr.message}`)

  const matchSessionForSale = (saleDateIso: string): SessionRow | null => {
    const saleTime = new Date(saleDateIso).getTime()
    let candidate: SessionRow | null = null
    for (const s of (sessions || [])) {
      const openTime = new Date(s.opened_at).getTime()
      const closeTime = s.closed_at ? new Date(s.closed_at).getTime() : Number.POSITIVE_INFINITY
      if (openTime <= saleTime && saleTime <= closeTime) {
        candidate = s
      }
    }
    return candidate
  }

  let inserted = 0, skipped = 0

  for (const sale of (sales || [])) {
    // Check if movement exists
    const { data: existing, error: existErr } = await supabase
      .from('cash_movements')
      .select('id')
      .eq('reference_type', 'SALE')
      .eq('reference_id', String(sale.id))
      .limit(1)
    if (existErr) throw new Error(`Failed checking existing movement for sale ${sale.id}: ${existErr.message}`)
    if (Array.isArray(existing) && existing.length > 0) { skipped++; continue }

    // Find matching session by created_at
    const session = matchSessionForSale(sale.created_at)
    if (!session) { console.warn(`⚠️ No matching session for sale ${sale.id} at ${sale.created_at}`); skipped++; continue }
    if (String(session.status).toUpperCase() !== 'OPEN' && session.closed_at) {
      // Allow inserting into closed session if sale happened before closed_at
      const saleTime = new Date(sale.created_at).getTime()
      const closeTime = new Date(session.closed_at).getTime()
      if (saleTime > closeTime) { console.warn(`⚠️ Sale ${sale.id} after session closed; skipped`); skipped++; continue }
    }

    // Determine amount: CASH uses total_amount; non-cash uses 0 for visibility
    const pm = String(sale.payment_method || '').toUpperCase()
    const isCash = pm === 'CASH'
    const amount = isCash ? Math.round(Number(sale.total_amount || 0) * 100) / 100 : 0

    if (dryRun) {
      console.log(`DRY RUN: Would insert movement for sale ${sale.id} into session ${session.id} amount=${amount}`)
      inserted++
      continue
    }

    const { error: insErr } = await supabase
      .from('cash_movements')
      .insert({
        session_id: session.id,
        type: 'SALE',
        amount,
        reason: `Venta #${sale.id}`.slice(0, 200),
        reference_type: 'SALE',
        reference_id: String(sale.id),
        created_by: sale.user_id || null
      })
    if (insErr) {
      console.warn(`❌ Insert failed for sale ${sale.id}:`, insErr.message)
      skipped++
    } else {
      inserted++
    }
  }

  console.log(`✅ Backfill complete. Inserted=${inserted}, Skipped=${skipped}`)
}

main().catch((e) => {
  console.error('Backfill error:', e)
  process.exit(1)
})

