import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// (removed conflicting import; local createAdminClient is defined below)
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type CachedEntry = { expiresAt: number; payload: any }
const carouselCache = new Map<string, CachedEntry>()

// Create admin client with service role key for bypassing RLS
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET() {
  try {
    const cached = carouselCache.get('ids')
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, { headers: { 'x-cache': 'HIT' } })
    }

    console.log('[API/Carousel] GET request - fetching from Supabase')

    // Use admin client to ensure we can read the carousel even if RLS is strict
    let supabase;
    try {
      supabase = createAdminClient()
    } catch (err) {
      console.error('[API/Carousel] Failed to create admin client:', err)
      return NextResponse.json(
        { success: false, message: 'Error de configuración', error: String(err) },
        { status: 500 }
      )
    }

    const { data, error } = await supabase
      .from('promotions_carousel')
      .select('promotion_id, position')
      .order('position', { ascending: true })

    if (error) {
      console.error('[API/Carousel] Supabase error:', error)
      
      // If table doesn't exist, return empty list instead of error
      // Check code 42P01 or message content
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('[API/Carousel] Table promotions_carousel does not exist. Returning empty list.')
        return NextResponse.json({ success: true, ids: [] })
      }

      return NextResponse.json(
        { 
          success: false, 
          message: 'Error al cargar el carrusel', 
          error: error.message, 
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    const ids = (data || []).map((r: any) => String(r.promotion_id))
    console.log('[API/Carousel] Loaded carousel IDs:', ids)

    const payload = { success: true, ids }
    carouselCache.set('ids', { expiresAt: Date.now() + 60_000, payload })

    return NextResponse.json(payload, { headers: { 'x-cache': 'MISS' } })

  } catch (error) {
    console.error('[API/Carousel] Critical Error:', error)
    return NextResponse.json({ success: false, message: 'Error interno', error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  console.log('[API/Carousel] ========== PUT REQUEST START ==========')
  try {
    console.log('[API/Carousel] PUT request received')
    
    // Log environment variables (without exposing full keys)
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20)
    }
    console.log('[API/Carousel] Environment check:', envCheck)
    
    if (!envCheck.hasSupabaseUrl || !envCheck.hasServiceKey) {
      console.error('[API/Carousel] CRITICAL: Missing environment variables!')
      return NextResponse.json(
        { 
          success: false, 
          message: 'Configuración del servidor incompleta. Reinicia el servidor después de configurar las variables de entorno.',
          details: envCheck
        },
        { status: 500 }
      )
    }
    
    // Get user for audit log
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    
    if (!user) {
      console.log('[API/Carousel] No user found - unauthorized')
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('[API/Carousel] User authenticated:', user.id)

    const body = await request.json()
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map((x: any) => String(x)) : []

    console.log('[API/Carousel] PUT request with ids:', ids)

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, message: 'IDs inválidos detectados. Solo se permiten promociones reales.' },
        { status: 400 }
      )
    }

    // Validate max 10 items
    if (ids.length > 10) {
      return NextResponse.json(
        { success: false, message: 'Máximo 10 elementos permitidos en el carrusel' },
        { status: 400 }
      )
    }

    // Check for duplicates
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      return NextResponse.json(
        { success: false, message: 'No se permiten promociones duplicadas en el carrusel' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    let supabase;
    try {
      console.log('[API/Carousel] Creating admin client...')
      supabase = createAdminClient()
      console.log('[API/Carousel] Admin client created successfully')
    } catch (clientError) {
      console.error('[API/Carousel] Error creating admin client:', clientError)
      return NextResponse.json(
        { success: false, message: 'Error de configuración del servidor', error: String(clientError) },
        { status: 500 }
      )
    }

    // Get current state for audit log
    const { data: existingData } = await supabase
      .from('promotions_carousel')
      .select('promotion_id')
      .order('position', { ascending: true })
    
    const previousState = existingData ? existingData.map((r: any) => String(r.promotion_id)) : []
    const newState = ids

    // Delete ALL existing carousel items using a simple approach
    // Since we're using service_role, we can delete without conditions
    console.log('[API/Carousel] Deleting all existing carousel items...')
    
    const { error: deleteError, count: deletedCount } = await supabase
      .from('promotions_carousel')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (dummy condition that's always true)
    
    if (deleteError) {
      console.error('[API/Carousel] Delete error:', deleteError)
      // If table doesn't exist, that's okay - continue
      if (deleteError.code !== '42P01') {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Error al limpiar el carrusel anterior', 
            error: deleteError.message,
            code: deleteError.code,
            details: deleteError.details,
            hint: 'Verifica que el SUPABASE_SERVICE_ROLE_KEY esté configurado correctamente'
          },
          { status: 500 }
        )
      }
    }
    
    console.log('[API/Carousel] Deleted', deletedCount || 0, 'existing items')

    // Insert new carousel items
    if (ids.length > 0) {
      console.log('[API/Carousel] Inserting new carousel items:', ids.length)
      const rows = ids.map((id, idx) => ({
        promotion_id: id,
        position: idx,
      }))

      const { error: insertError } = await supabase
        .from('promotions_carousel')
        .insert(rows)

      if (insertError) {
        console.error('[API/Carousel] Insert error:', insertError)
        return NextResponse.json(
          { 
            success: false, 
            message: 'Error al guardar el carrusel', 
            error: insertError.message,
            code: insertError.code,
            details: insertError.details
          },
          { status: 500 }
        )
      }
      console.log('[API/Carousel] Successfully inserted new items')
    } else {
      console.log('[API/Carousel] No items to insert (clearing carousel)')
    }

    // Log to audit table
    try {
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'
      
      // Check if it's a reorder or an update
      // Reorder: same items, different order
      // Update: items added or removed
      const isReorder = 
        previousState.length === newState.length && 
        previousState.every(id => newState.includes(id)) &&
        JSON.stringify(previousState) !== JSON.stringify(newState);
      
      const action = isReorder ? 'REORDER' : 'UPDATE';

      const { error: rpcError } = await supabase.rpc('log_carousel_change', {
        p_user_id: user.id,
        p_action: action,
        p_previous_state: JSON.stringify(previousState),
        p_new_state: JSON.stringify(newState),
        p_ip_address: ip,
        p_user_agent: userAgent,
        p_metadata: { source: 'dashboard' }
      })

      if (rpcError) {
        console.error('[API/Carousel] Audit RPC error:', rpcError)
      }

    } catch (auditError) {
      console.error('[API/Carousel] Audit log error:', auditError)
      // Don't fail the request if audit fails, but log it
    }

    console.log('[API/Carousel] Carousel saved successfully')

    // Clear cache
    carouselCache.delete('ids')

    return NextResponse.json({ success: true, ids })
  } catch (error) {
    console.error('[API/Carousel] ========== CRITICAL PUT ERROR ==========')
    console.error('[API/Carousel] Error type:', error?.constructor?.name)
    console.error('[API/Carousel] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[API/Carousel] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('[API/Carousel] Full error object:', error)
    
    return NextResponse.json({ 
      success: false, 
      message: 'Error interno del servidor', 
      error: error instanceof Error ? error.message : String(error),
      type: error?.constructor?.name
    }, { status: 500 })
  } finally {
    console.log('[API/Carousel] ========== PUT REQUEST END ==========')
  }
}
