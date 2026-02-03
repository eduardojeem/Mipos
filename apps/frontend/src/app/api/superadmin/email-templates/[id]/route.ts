import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/superadmin/email-templates/[id]
 * Obtiene una plantilla específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que es SUPER_ADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos de SuperAdmin' },
        { status: 403 }
      );
    }

    // Obtener plantilla
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error in GET /api/superadmin/email-templates/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/superadmin/email-templates/[id]
 * Actualiza una plantilla de email
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que es SUPER_ADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos de SuperAdmin' },
        { status: 403 }
      );
    }

    // Obtener datos del body
    const body = await request.json();
    const {
      name,
      subject,
      html_content,
      text_content,
      category,
      description,
      variables,
      is_active,
    } = body;

    // Actualizar plantilla
    const { data: template, error: updateError } = await supabase
      .from('email_templates')
      .update({
        name,
        subject,
        html_content,
        text_content,
        category,
        description,
        variables,
        is_active,
        updated_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating email template:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar plantilla', details: updateError.message },
        { status: 500 }
      );
    }

    // Crear audit log
    try {
      await supabase.from('audit_logs').insert({
        action: 'email_template.updated',
        entity_type: 'email_template',
        entity_id: id,
        user_id: user.id,
        metadata: {
          template_name: name,
          changes: Object.keys(body),
        },
        severity: 'INFO',
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      template,
    });
  } catch (error) {
    console.error('Error in PUT /api/superadmin/email-templates/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/email-templates/[id]
 * Elimina una plantilla de email
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que es SUPER_ADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos de SuperAdmin' },
        { status: 403 }
      );
    }

    // Obtener info de la plantilla antes de eliminar para el audit log
    const { data: template } = await supabase
      .from('email_templates')
      .select('name, slug')
      .eq('id', id)
      .single();

    // Eliminar plantilla
    const { error: deleteError } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting email template:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar plantilla', details: deleteError.message },
        { status: 500 }
      );
    }

    // Crear audit log
    try {
      await supabase.from('audit_logs').insert({
        action: 'email_template.deleted',
        entity_type: 'email_template',
        entity_id: id,
        user_id: user.id,
        metadata: {
          template_name: template?.name,
          template_slug: template?.slug,
        },
        severity: 'WARNING',
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/superadmin/email-templates/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
