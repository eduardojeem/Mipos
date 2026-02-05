import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { logAudit } from '@/app/api/admin/_utils/audit';

export async function GET(request: NextRequest) {
  try {
    // ✅ SEGURIDAD: Verificar que el usuario es ADMIN o SUPER_ADMIN
    const authResult = await assertAdmin(request);
    if (!authResult.ok) {
      return NextResponse.json(authResult.body, { status: authResult.status });
    }

    const { userId, organizationId: orgFromAuth, isSuperAdmin } = authResult;
    const supabase = await createClient();
    const headerOrg = request.headers.get('x-organization-id') || undefined;
    const resolvedOrg = isSuperAdmin ? null : (orgFromAuth || headerOrg || await getUserOrganizationId(userId));
    
    // ✅ MULTITENANCY: Filtrar por organization_id (excepto SUPER_ADMIN)
    let query = supabase.from('business_config').select('*');
    
    if (!isSuperAdmin && resolvedOrg) {
      query = query.eq('organization_id', resolvedOrg);
    }
    
    const { data: config, error } = await query.single();

    if (error) {
      console.error('Error fetching system settings:', error);
      
      // Si no existe configuración, devolver valores por defecto
      if (error.code === 'PGRST116') {
        const defaultSettings = {
          business_name: '',
          currency: 'PYG',
          timezone: 'America/Asuncion',
          language: 'es',
          date_format: 'DD/MM/YYYY',
          time_format: '24h',
          tax_rate: 0,
          enable_inventory_tracking: true,
          enable_loyalty_program: false,
          enable_notifications: true,
          auto_backup: false,
          backup_frequency: 'daily',
        };
        
        return NextResponse.json(defaultSettings);
      }
      
      return NextResponse.json(
        { error: 'Error al obtener configuraciones del sistema' },
        { status: 500 }
      );
    }

    // Devolver directamente las columnas de Supabase (ya están en snake_case)
    const systemSettings = {
      business_name: config?.business_name || '',
      address: config?.address || '',
      phone: config?.phone || '',
      email: config?.email || '',
      website: config?.website || '',
      logo_url: config?.logo_url || '',
      currency: config?.currency || 'PYG',
      timezone: config?.timezone || 'America/Asuncion',
      language: config?.language || 'es',
      date_format: config?.date_format || 'DD/MM/YYYY',
      time_format: config?.time_format || '24h',
      tax_rate: config?.tax_rate || 0,
      decimal_places: config?.decimal_places || 0,
      receipt_footer: config?.receipt_footer || '',
      enable_inventory_tracking: config?.enable_inventory_tracking ?? true,
      enable_loyalty_program: config?.enable_loyalty_program ?? false,
      email_notifications: config?.email_notifications ?? true,
      sms_notifications: config?.sms_notifications ?? false,
      push_notifications: config?.push_notifications ?? true,
      enable_notifications: config?.enable_notifications ?? true,
      auto_backup: config?.auto_backup ?? false,
      backup_frequency: config?.backup_frequency || 'daily',
      low_stock_threshold: config?.low_stock_threshold || 10,
      enable_barcode_scanner: config?.enable_barcode_scanner ?? true,
      enable_receipt_printer: config?.enable_receipt_printer ?? true,
      enable_cash_drawer: config?.enable_cash_drawer ?? true,
      max_discount_percentage: config?.max_discount_percentage || 50,
      require_customer_info: config?.require_customer_info ?? false,
      // SMTP Configuration
      smtp_host: config?.smtp_host || '',
      smtp_port: config?.smtp_port || 587,
      smtp_user: config?.smtp_user || '',
      smtp_password: config?.smtp_password || '',
      smtp_secure: config?.smtp_secure ?? true,
      smtp_from_email: config?.smtp_from_email || '',
      smtp_from_name: config?.smtp_from_name || '',
    };

    // ✅ AUDITORÍA: Registrar acceso a configuración
    logAudit('system.settings.read', {
      userId,
      organizationId,
      isSuperAdmin,
      url: request.url
    });

    return NextResponse.json(systemSettings);
  } catch (error) {
    console.error('System settings API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ✅ SEGURIDAD: Verificar que el usuario es ADMIN o SUPER_ADMIN
    const authResult = await assertAdmin(request);
    if (!authResult.ok) {
      return NextResponse.json(authResult.body, { status: authResult.status });
    }

    const { userId, organizationId: orgFromAuth, isSuperAdmin } = authResult;
    const supabase = await createClient();
    const settings = await request.json();
    const headerOrg = request.headers.get('x-organization-id') || undefined;
    const resolvedOrg = isSuperAdmin ? null : (orgFromAuth || headerOrg || await getUserOrganizationId(userId));

    // ✅ VALIDACIÓN: Validar datos de entrada
    const validationErrors: string[] = [];
    
    if (settings.taxRate !== undefined) {
      const taxRate = Number(settings.taxRate);
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        validationErrors.push('La tasa de impuesto debe estar entre 0 y 100');
      }
    }
    
    if (settings.currency && !['PYG', 'USD', 'EUR', 'BRL', 'ARS'].includes(settings.currency)) {
      validationErrors.push('Moneda no soportada');
    }
    
    if (settings.timeFormat && !['12h', '24h'].includes(settings.timeFormat)) {
      validationErrors.push('Formato de hora inválido');
    }
    
    if (settings.backupFrequency && !['hourly', 'daily', 'weekly', 'monthly'].includes(settings.backupFrequency)) {
      validationErrors.push('Frecuencia de respaldo inválida');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    // ✅ MULTITENANCY: Obtener configuración actual para auditoría
    let query = supabase.from('business_config').select('*');
    
    if (!isSuperAdmin && resolvedOrg) {
      query = query.eq('organization_id', resolvedOrg);
    }
    
    const { data: oldConfig } = await query.single();

    // Usar directamente los nombres de columnas de Supabase (ya están en snake_case)
    const configUpdate: Record<string, unknown> = {
      business_name: settings.business_name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      logo_url: settings.logo_url,
      currency: settings.currency,
      timezone: settings.timezone,
      language: settings.language,
      date_format: settings.date_format,
      time_format: settings.time_format,
      tax_rate: settings.tax_rate,
      decimal_places: settings.decimal_places,
      receipt_footer: settings.receipt_footer,
      enable_inventory_tracking: settings.enable_inventory_tracking,
      enable_loyalty_program: settings.enable_loyalty_program,
      email_notifications: settings.email_notifications,
      sms_notifications: settings.sms_notifications,
      push_notifications: settings.push_notifications,
      enable_notifications: settings.enable_notifications,
      auto_backup: settings.auto_backup,
      backup_frequency: settings.backup_frequency,
      low_stock_threshold: settings.low_stock_threshold,
      enable_barcode_scanner: settings.enable_barcode_scanner,
      enable_receipt_printer: settings.enable_receipt_printer,
      enable_cash_drawer: settings.enable_cash_drawer,
      max_discount_percentage: settings.max_discount_percentage,
      require_customer_info: settings.require_customer_info,
      // SMTP Configuration
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_user: settings.smtp_user,
      smtp_password: settings.smtp_password,
      smtp_secure: settings.smtp_secure,
      smtp_from_email: settings.smtp_from_email,
      smtp_from_name: settings.smtp_from_name,
      updated_at: new Date().toISOString(),
    };

    // ✅ MULTITENANCY: Agregar organization_id si no es SUPER_ADMIN
    if (!isSuperAdmin && resolvedOrg) {
      configUpdate.organization_id = resolvedOrg as string;
    }

    // Actualizar configuraciones
    const { data, error } = await supabase
      .from('business_config')
      .upsert(configUpdate, { onConflict: isSuperAdmin ? 'id' : 'organization_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating system settings:', error);
      
      // ✅ AUDITORÍA: Registrar intento fallido
      logAudit('system.settings.update.failed', {
        userId,
        organizationId,
        isSuperAdmin,
        error: error.message,
        url: request.url
      });
      
      return NextResponse.json(
        { error: 'Error al actualizar configuraciones del sistema' },
        { status: 500 }
      );
    }

    // ✅ AUDITORÍA: Registrar cambios exitosos
    const changes: Record<string, { old: any; new: any }> = {};
    
    if (oldConfig) {
      Object.keys(configUpdate).forEach(key => {
        if (key !== 'updated_at' && oldConfig[key] !== configUpdate[key]) {
          changes[key] = {
            old: oldConfig[key],
            new: configUpdate[key]
          };
        }
      });
    }

    logAudit('system.settings.update', {
      userId,
      organizationId,
      isSuperAdmin,
      changes,
      oldData: oldConfig,
      newData: data,
      url: request.url
    });

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Configuraciones actualizadas correctamente' 
    });
  } catch (error) {
    console.error('System settings update error:', error);
    
    // ✅ AUDITORÍA: Registrar error interno
    logAudit('system.settings.update.error', {
      error: String(error),
      url: request.url
    });
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
