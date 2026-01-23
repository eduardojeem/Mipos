import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Obtener configuraciones del sistema desde business_config
    const { data: config, error } = await supabase
      .from('business_config')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching system settings:', error);
      return NextResponse.json(
        { error: 'Error al obtener configuraciones del sistema' },
        { status: 500 }
      );
    }

    // Mapear a formato de configuraciones del sistema
    const systemSettings = {
      businessName: config?.business_name || '',
      currency: config?.currency || 'PYG',
      timezone: config?.timezone || 'America/Asuncion',
      language: config?.language || 'es',
      dateFormat: config?.date_format || 'DD/MM/YYYY',
      timeFormat: config?.time_format || '24h',
      taxRate: config?.tax_rate || 0,
      enableInventoryTracking: config?.enable_inventory_tracking ?? true,
      enableLoyaltyProgram: config?.enable_loyalty_program ?? false,
      enableNotifications: config?.enable_notifications ?? true,
      autoBackup: config?.auto_backup ?? false,
      backupFrequency: config?.backup_frequency || 'daily',
    };

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
    const supabase = await createClient();
    const settings = await request.json();

    // Mapear configuraciones del sistema a formato de business_config
    const configUpdate = {
      business_name: settings.businessName,
      currency: settings.currency,
      timezone: settings.timezone,
      language: settings.language,
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,
      tax_rate: settings.taxRate,
      enable_inventory_tracking: settings.enableInventoryTracking,
      enable_loyalty_program: settings.enableLoyaltyProgram,
      enable_notifications: settings.enableNotifications,
      auto_backup: settings.autoBackup,
      backup_frequency: settings.backupFrequency,
      updated_at: new Date().toISOString(),
    };

    // Actualizar configuraciones
    const { data, error } = await supabase
      .from('business_config')
      .upsert(configUpdate)
      .select()
      .single();

    if (error) {
      console.error('Error updating system settings:', error);
      return NextResponse.json(
        { error: 'Error al actualizar configuraciones del sistema' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Configuraciones actualizadas correctamente' 
    });
  } catch (error) {
    console.error('System settings update error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}