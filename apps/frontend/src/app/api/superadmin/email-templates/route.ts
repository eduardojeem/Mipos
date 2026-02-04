import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

/**
 * GET /api/superadmin/email-templates
 * Obtiene todas las plantillas de email
 */
export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Construir query
    let query = supabase
      .from('email_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    // Aplicar filtros
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    const { data: templates, error: templatesError } = await query;

    if (templatesError) {
      console.error('Error fetching email templates:', templatesError);
      return NextResponse.json(
        { error: 'Error al obtener plantillas', details: templatesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
      total: templates?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/superadmin/email-templates:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/email-templates
 * Crea una nueva plantilla de email
 */
export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found'); // Should have been caught by assertSuperAdmin

    // Obtener datos del body
    const body = await request.json();
    const {
      name,
      slug,
      subject,
      html_content,
      text_content,
      category,
      description,
      variables,
      is_active,
    } = body;

    // Validaciones básicas
    if (!name || !slug || !subject || !html_content || !category) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes: name, slug, subject, html_content, category' },
        { status: 400 }
      );
    }

    // Crear plantilla
    const { data: template, error: createError } = await supabase
      .from('email_templates')
      .insert({
        name,
        slug,
        subject,
        html_content,
        text_content,
        category,
        description,
        variables: variables || [],
        is_active: is_active !== undefined ? is_active : true,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating email template:', createError);
      
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una plantilla con ese nombre o slug' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Error al crear plantilla', details: createError.message },
        { status: 500 }
      );
    }

    // Crear audit log
    try {
      await supabase.from('audit_logs').insert({
        action: 'email_template.created',
        entity_type: 'email_template',
        entity_id: template.id,
        user_id: user.id,
        metadata: {
          template_name: name,
          template_slug: slug,
          category,
        },
        severity: 'INFO',
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Plantilla creada exitosamente',
      template,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/superadmin/email-templates:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
