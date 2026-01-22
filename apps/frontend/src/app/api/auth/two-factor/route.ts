import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface TwoFactorStatus {
  enabled: boolean;
  backupCodes: string[];
  lastUsed?: string;
  method: 'app' | 'sms' | null;
}

// Generar códigos de respaldo
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
}

// GET - Obtener estado actual del 2FA
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación por usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Intentar obtener configuración 2FA desde la base de datos
    let twoFactorData: TwoFactorStatus = {
      enabled: false,
      backupCodes: [],
      method: null
    };

    // Comentado temporalmente hasta configurar la tabla users en Supabase
    /*
    try {
      const { data: userRecord } = await supabase
        .from('users')
        .select('two_factor_enabled, two_factor_backup_codes, two_factor_last_used')
        .eq('id', user.id)
        .single();

      if (userRecord) {
        twoFactorData = {
          enabled: userRecord.two_factor_enabled || false,
          backupCodes: userRecord.two_factor_backup_codes || [],
          lastUsed: userRecord.two_factor_last_used,
          method: userRecord.two_factor_enabled ? 'app' : null
        };
      }
    } catch (error) {
      // Fallback: usar user_metadata
      const metadata = user.user_metadata;
      twoFactorData = {
        enabled: metadata?.two_factor_enabled || false,
        backupCodes: metadata?.two_factor_backup_codes || [],
        lastUsed: metadata?.two_factor_last_used,
        method: metadata?.two_factor_enabled ? 'app' : null
      };
    }
    */

    // Fallback: usar user_metadata
    const metadata = user.user_metadata;
    twoFactorData = {
      enabled: metadata?.two_factor_enabled || false,
      backupCodes: metadata?.two_factor_backup_codes || [],
      lastUsed: metadata?.two_factor_last_used,
      method: metadata?.two_factor_enabled ? 'app' : null
    };

    return NextResponse.json({
      success: true,
      data: twoFactorData
    });

  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

// POST - Configurar 2FA (temporalmente deshabilitado para optimización de bundle)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación por usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // TEMPORAL: 2FA deshabilitado para optimización de bundle
    // TODO: Implementar con alternativa ligera a speakeasy
    return NextResponse.json({
      success: false,
      error: 'La autenticación de dos factores está temporalmente deshabilitada para optimización del sistema. Será reactivada en una próxima actualización.'
    }, { status: 503 });

  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { password, code } = body;

    if (!password) {
      return NextResponse.json({ 
        error: 'Contraseña requerida para desactivar 2FA' 
      }, { status: 400 });
    }

    // Verificar contraseña
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password
    });

    if (signInError) {
      return NextResponse.json({ 
        error: 'Contraseña incorrecta' 
      }, { status: 400 });
    }

    // Si se proporciona código 2FA, verificarlo
    if (code) {
      let secret = '';
      
      // Comentado temporalmente hasta configurar la tabla users en Supabase
      /*
      try {
        const { data: userRecord } = await supabase
          .from('users')
          .select('two_factor_secret')
          .eq('id', user.id)
          .single();

        secret = userRecord?.two_factor_secret || '';
      } catch (error) {
        secret = user.user_metadata?.two_factor_secret || '';
      }
      */

      // Fallback: usar user_metadata
      secret = user.user_metadata?.two_factor_secret || '';

      if (secret) {
        // TEMPORAL: 2FA verification deshabilitado para optimización de bundle
        // TODO: Implementar con alternativa ligera a speakeasy
        return NextResponse.json({ 
          error: 'La verificación 2FA está temporalmente deshabilitada para optimización del sistema.' 
        }, { status: 503 });
      }
    }

    // Desactivar 2FA
    const now = new Date().toISOString();
    
    // Comentado temporalmente hasta configurar la tabla users en Supabase
    /*
    try {
      await supabase
        .from('users')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_backup_codes: null,
          two_factor_temp_secret: null,
          updated_at: now
        })
        .eq('id', user.id);
    } catch (error) {
      // Fallback: actualizar user_metadata
      const updatedMetadata = { ...user.user_metadata };
      delete updatedMetadata.two_factor_enabled;
      delete updatedMetadata.two_factor_secret;
      delete updatedMetadata.two_factor_backup_codes;
      delete updatedMetadata.two_factor_temp_secret;

      await supabase.auth.updateUser({
        data: updatedMetadata
      });
    }
    */

    // Fallback: actualizar user_metadata
    const updatedMetadata = { ...user.user_metadata };
    delete updatedMetadata.two_factor_enabled;
    delete updatedMetadata.two_factor_secret;
    delete updatedMetadata.two_factor_backup_codes;
    delete updatedMetadata.two_factor_temp_secret;

    await supabase.auth.updateUser({
      data: updatedMetadata
    });

    // Registrar en audit_logs
    // Comentado temporalmente hasta configurar la tabla audit_logs en Supabase
    /*
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'two_factor_disabled',
          details: { method: 'manual' },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        });
    } catch (error) {
      console.warn('Could not log to audit_logs:', error);
    }
    */

    return NextResponse.json({
      success: true,
      message: 'Autenticación de dos factores desactivada exitosamente'
    });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}