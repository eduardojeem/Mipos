import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get organization with plan information
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        subscription_plan
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching organization:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Organización no encontrada' 
      }, { status: 404 })
    }

    // Format response
    const { data: plan } = await supabase
      .from('saas_plans')
      .select('name, slug, limits, features')
      .eq('slug', (organization.subscription_plan || 'free').toLowerCase())
      .single()

    const formattedOrg = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: {
        name: plan?.name || 'Free',
        slug: plan?.slug || 'free',
        limits: plan?.limits || {
          maxUsers: 1,
          maxProducts: 100,
          maxStorage: 1,
          maxTransactions: 100
        },
        features: plan?.features || []
      }
    }

    return NextResponse.json({
      success: true,
      organization: formattedOrg
    })
  } catch (error) {
    console.error('Error in organizations API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
