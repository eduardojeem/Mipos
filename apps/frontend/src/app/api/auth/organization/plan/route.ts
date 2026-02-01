import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    let targetOrgId: string | null = null;

    // 1. Try to get organization from header
    const orgIdHeader = request.headers.get('x-organization-id');
    
    if (orgIdHeader) {
      // Verify membership
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', orgIdHeader)
        .single();
      
      if (memberData) {
        targetOrgId = memberData.organization_id;
      }
    }

    // 2. Fallback to user's default organization if not found in header
    if (!targetOrgId) {
      // Get user's organization
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userDataError && userData?.organization_id) {
        targetOrgId = userData.organization_id;
      }
    }

    // 3. Last resort: Try to find ANY organization the user belongs to
    if (!targetOrgId) {
      try {
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (memberData) {
          targetOrgId = memberData.organization_id;
        }
      } catch (e) {
        // Ignore error
      }
    }

    if (!targetOrgId) {
      return NextResponse.json({ 
        success: true,
        data: null,
        message: 'Usuario sin organización asignada'
      });
    }

    // Get organization with plan
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subscription_plan')
      .eq('id', targetOrgId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    if (!org?.subscription_plan) {
      return NextResponse.json({ 
        success: true,
        data: null,
        message: 'Organización sin plan asignado'
      });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('slug', org.subscription_plan)
      .single();

    if (planError) {
      console.error('Error fetching plan:', planError);
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        currency: plan.currency || 'USD',
        trial_days: plan.trial_days || 0,
        features: plan.features || [],
        limits: plan.limits || {},
        is_active: plan.is_active,
      }
    });

  } catch (error) {
    console.error('Error in organization plan API:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
