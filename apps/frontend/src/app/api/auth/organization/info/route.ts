import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Role descriptions mapping
const ROLE_DESCRIPTIONS: Record<string, string> = {
  'admin': 'Administrador con acceso completo',
  'manager': 'Gerente con permisos de gestión',
  'seller': 'Vendedor con acceso al POS',
  'cashier': 'Cajero con acceso limitado',
  'viewer': 'Visualizador con acceso de solo lectura',
  'inventory_manager': 'Gestor de inventario',
  'accountant': 'Contador con acceso financiero',
};

// Common permissions by role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'admin': [
    'Gestión completa',
    'Usuarios',
    'Configuración',
    'Reportes',
    'Ventas',
    'Inventario',
    'Finanzas',
    'Clientes'
  ],
  'manager': [
    'Gestión de ventas',
    'Reportes',
    'Inventario',
    'Clientes',
    'Empleados'
  ],
  'seller': [
    'Punto de venta',
    'Ventas',
    'Clientes',
    'Productos'
  ],
  'cashier': [
    'Punto de venta',
    'Caja',
    'Ventas básicas'
  ],
  'viewer': [
    'Ver reportes',
    'Ver productos',
    'Ver ventas'
  ],
  'inventory_manager': [
    'Gestión de inventario',
    'Productos',
    'Proveedores',
    'Movimientos'
  ],
  'accountant': [
    'Reportes financieros',
    'Caja',
    'Ventas',
    'Gastos'
  ],
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    let targetOrgId: string | null = null;
    let organizationRole = 'member';
    let permissions: string[] = ['Acceso básico'];

    // 1. Try to get organization from header
    const orgIdHeader = request.headers.get('x-organization-id');
    
    if (orgIdHeader) {
      // Verify membership
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id, role, permissions')
        .eq('user_id', user.id)
        .eq('organization_id', orgIdHeader)
        .single();
      
      if (memberData) {
        targetOrgId = memberData.organization_id;
        organizationRole = memberData.role || organizationRole;
        if (memberData.permissions && Array.isArray(memberData.permissions)) {
          permissions = memberData.permissions;
        }
      }
    }

    // 2. Fallback to user's default organization if not found in header
    if (!targetOrgId) {
      // Get user's organization and role from users table
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      if (!userDataError && userData?.organization_id) {
        targetOrgId = userData.organization_id;
        organizationRole = userData.role || organizationRole;
        
        // Try to enrich with organization_members data
        try {
          const { data: memberData } = await supabase
            .from('organization_members')
            .select('role, permissions')
            .eq('user_id', user.id)
            .eq('organization_id', targetOrgId)
            .single();

          if (memberData) {
            organizationRole = memberData.role || organizationRole;
            if (memberData.permissions && Array.isArray(memberData.permissions)) {
              permissions = memberData.permissions;
            }
          }
        } catch (e) {
          // Ignore error if member data not found
        }
      }
    }

    // 3. Last resort: Try to find ANY organization the user belongs to
    if (!targetOrgId) {
      try {
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('organization_id, role, permissions')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (memberData) {
          targetOrgId = memberData.organization_id;
          organizationRole = memberData.role || organizationRole;
          if (memberData.permissions && Array.isArray(memberData.permissions)) {
            permissions = memberData.permissions;
          }
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

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', targetOrgId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Determine role description and final permissions
    const roleDescription = ROLE_DESCRIPTIONS[organizationRole] || 'Miembro de la organización';
    
    // If permissions weren't loaded from DB, use defaults based on role
    if (permissions.length === 1 && permissions[0] === 'Acceso básico') {
      permissions = ROLE_PERMISSIONS[organizationRole] || permissions;
    }

    return NextResponse.json({
      success: true,
      data: {
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        role: organizationRole,
        roleDescription: roleDescription,
        permissions: permissions,
      }
    });

  } catch (error) {
    console.error('Error in organization info API:', error);
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
