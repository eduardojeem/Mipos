import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { planSlug } = body;

    if (!planSlug) {
      return NextResponse.json({ error: 'Plan slug es requerido' }, { status: 400 });
    }

    // Get user's organization
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('organization_id, name, email')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData?.organization_id) {
      return NextResponse.json({ 
        error: 'Usuario sin organización asignada'
      }, { status: 400 });
    }

    // Verify plan exists
    const { data: plan, error: planError } = await supabase
      .from('saas_plans')
      .select('id, name, slug')
      .eq('slug', planSlug)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ 
        error: 'Plan no encontrado o no disponible'
      }, { status: 404 });
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subscription_plan')
      .eq('id', userData.organization_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Check if it's the same plan
    if (org.subscription_plan === planSlug) {
      return NextResponse.json({ 
        error: 'Ya tienes este plan activo'
      }, { status: 400 });
    }

    // Here you would typically:
    // 1. Create a plan change request in a requests table
    // 2. Send notification to admins
    // 3. Trigger payment flow if needed
    
    // For now, we'll just log the request
    console.log('Plan change request:', {
      userId: user.id,
      userName: userData.name,
      userEmail: userData.email,
      organizationId: userData.organization_id,
      organizationName: org.name,
      currentPlan: org.subscription_plan,
      requestedPlan: planSlug,
      requestedPlanName: plan.name,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de cambio de plan enviada correctamente. Un administrador la revisará pronto.',
      data: {
        requestedPlan: plan.name,
        currentPlan: org.subscription_plan
      }
    });

  } catch (error) {
    console.error('Error in request plan change API:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
