import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si el usuario es admin o super admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // SECURITY: only SUPER_ADMIN can list all organizations. ADMIN/OWNER
    // are organization-scoped — they administer their OWN org but cannot
    // see or list other tenants' data. The previous code returned the full
    // organizations table for anyone with role IN ('ADMIN', 'SUPER_ADMIN'),
    // which leaked cross-tenant data to every signup (registration was
    // setting users.role='ADMIN' by default).
    const userRole = userData?.role || 'USER';
    const isSuperAdmin = userRole === 'SUPER_ADMIN';

    let query = supabase
      .from('organizations')
      .select('id, name, slug, subscription_status, created_at')
      .order('name', { ascending: true });

    if (!isSuperAdmin) {
      // Tenant-scoped: solo orgs donde el usuario es miembro.
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        return NextResponse.json({ success: true, organizations: [] });
      }

      const orgIds = memberships.map((m: { organization_id: string }) => m.organization_id);
      query = query.in('id', orgIds);
    }

    const { data: organizations, error } = await query;

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({
        success: false,
        error: 'Error al cargar organizaciones'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organizations: organizations || []
    });

  } catch (error) {
    console.error('Error in organizations API:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
