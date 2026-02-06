import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';

const COMPONENT = 'AdminOrganizationAPI';

/**
 * PATCH /api/admin/organizations/[id]
 * Permite a los admins actualizar su propia organización
 * Solo pueden actualizar: subdomain, custom_domain
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario pertenece a la organización
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar esta organización' },
        { status: 403 }
      );
    }

    // Solo ADMIN y OWNER pueden modificar
    if (!['ADMIN', 'OWNER'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Solo administradores pueden modificar la organización' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Whitelist de campos que pueden actualizar
    const allowedFields = ['subdomain', 'custom_domain'];
    const updates: Record<string, any> = {};

    allowedFields.forEach(field => {
      if (field in body) {
        updates[field] = body[field];
      }
    });

    // Validar subdomain si se está actualizando
    if ('subdomain' in updates) {
      const subdomain = updates.subdomain;
      
      if (!subdomain || subdomain.trim() === '') {
        return NextResponse.json(
          { error: 'El subdominio es requerido' },
          { status: 400 }
        );
      }

      // Validar formato
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
      if (!subdomainRegex.test(subdomain)) {
        return NextResponse.json(
          { error: 'Formato de subdominio inválido. Solo letras minúsculas, números y guiones (no al inicio o final)' },
          { status: 400 }
        );
      }

      // Verificar que no esté en uso por otra organización
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('subdomain', subdomain)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Este subdominio ya está en uso' },
          { status: 409 }
        );
      }
    }

    // Validar custom_domain si se está actualizando
    if ('custom_domain' in updates && updates.custom_domain) {
      const domain = updates.custom_domain;
      
      // Validar formato básico de dominio
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
      if (!domainRegex.test(domain)) {
        return NextResponse.json(
          { error: 'Formato de dominio inválido' },
          { status: 400 }
        );
      }

      // Verificar que no esté en uso
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('custom_domain', domain)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'Este dominio ya está en uso' },
          { status: 409 }
        );
      }
    }

    // Si custom_domain es string vacío, convertir a null
    if ('custom_domain' in updates && updates.custom_domain === '') {
      updates.custom_domain = null;
    }

    // Actualizar organización
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      structuredLogger.error('Error updating organization', error, { 
        component: COMPONENT, 
        action: 'PATCH', 
        metadata: { id, userId: user.id } 
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    structuredLogger.info('Organization updated successfully', { 
      component: COMPONENT, 
      action: 'PATCH', 
      metadata: { id, userId: user.id, updates: Object.keys(updates) } 
    });

    return NextResponse.json({ success: true, organization: data });
  } catch (error) {
    structuredLogger.error('Unexpected error in PATCH organization', error as Error, { 
      component: COMPONENT,
      action: 'PATCH'
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
