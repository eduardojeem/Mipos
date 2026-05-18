import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_EVENTS = new Set(['view', 'click'])
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * POST /api/marketplace/categories/track
 * Body: { slug: string, event: 'view' | 'click' }
 *
 * Público — no requiere autenticación.
 * Llama a la RPC track_marketplace_category (SECURITY DEFINER).
 * Siempre responde 200 para no bloquear la navegación del usuario.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const slug  = typeof body?.slug  === 'string' ? body.slug.trim().toLowerCase()  : ''
    const event = typeof body?.event === 'string' ? body.event.trim().toLowerCase() : ''

    if (!slug || !SLUG_RE.test(slug) || !VALID_EVENTS.has(event)) {
      // Respuesta silenciosa — no romper navegación del cliente
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    const supabase = await createAdminClient()
    await (supabase as any).rpc('track_marketplace_category', {
      p_slug:  slug,
      p_event: event,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    // Silencioso — el tracking nunca debe romper la UX
    console.error('[marketplace/categories/track]', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
