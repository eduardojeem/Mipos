import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET() {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'website_config')
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
      console.error('Error fetching website config:', error)
      return NextResponse.json({ success: true, config: {} })
    }

    return NextResponse.json({ success: true, config: data?.value || {} })
  } catch (error: any) {
    console.error('Unexpected error in website config GET:', error)
    return NextResponse.json({ success: true, config: {} })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Datos de configuracion invalidos' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('settings')
      .upsert(
        {
          key: 'website_config',
          value: {
            ...body,
            updatedAt: new Date().toISOString(),
          },
          organization_id: body.organization_id || body.organizationId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'organization_id,key',
        }
      )

    if (error) {
      console.error('Error updating website config:', error)
      return NextResponse.json({ success: false, error: 'Error al guardar configuracion del sitio web' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      config: body,
      message: 'Configuracion del sitio web actualizada correctamente',
    })
  } catch (error: any) {
    console.error('Error in website config PUT:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Error interno' }, { status: 500 })
  }
}
