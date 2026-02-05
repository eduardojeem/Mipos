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

    const userRole = userData?.role || user.user_metadata?.role || 'USER';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    // Si es admin, obtener todas las organizaciones
    // Si no, obtener solo las organizaciones del usuario
    let query = supabase
      .from('organizations')
      .select('id, name, slug, subscription_status, created_at')
      .order('name', { ascending: true });

    if (!isAdmin) {
      // Obtener solo las organizaciones donde el usuario es miembro
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        const orgIds = memberships.map((m: { organization_id: string }) => m.organization_id);
        query = query.in('id', orgIds);
      } else {
        // Usuario sin organizaciones
        return NextResponse.json({
          success: true,
          organizations: []
        });
      }
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
