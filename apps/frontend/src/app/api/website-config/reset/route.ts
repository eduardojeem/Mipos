import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { defaultWebsiteConfig } from '@/contexts/WebsiteConfigContext'

export async function POST(request: NextRequest) {
  // Admin-only endpoint for resetting website configuration to defaults
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const supabase = await createClient()
    
    const resetConfig = {
      ...defaultWebsiteConfig,
      updatedAt: new Date().toISOString()
    }
    
    // Reset website configuration to defaults
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'website_config',
        value: resetConfig,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'key' 
      })

    if (error) {
      console.error('Error resetting website config:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Error al resetear configuración del sitio web' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      config: resetConfig,
      message: 'Configuración del sitio web reseteada a valores por defecto'
    })

  } catch (error: any) {
    console.error('Error in website config reset:', error)
    const message = error?.message || 'Error interno'
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 })
  }
}