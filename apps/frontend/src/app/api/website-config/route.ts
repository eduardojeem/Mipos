import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET() {
  // Public endpoint for website configuration (used by public site)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'website_config')
      .single()

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
      console.error('Error fetching website config:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Error al cargar configuración del sitio web' 
      }, { status: 500 })
    }

    const config = data?.value || {}
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error('Unexpected error in website config GET:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  // Admin-only endpoint for updating website configuration
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    
    // Basic validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ 
        success: false, 
        error: 'Datos de configuración inválidos' 
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Update website configuration
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'website_config',
        value: {
          ...body,
          updatedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'key' 
      })

    if (error) {
      console.error('Error updating website config:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Error al guardar configuración del sitio web' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      config: body,
      message: 'Configuración del sitio web actualizada correctamente'
    })

  } catch (error: any) {
    console.error('Error in website config PUT:', error)
    const message = error?.message || 'Error interno'
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 })
  }
}
