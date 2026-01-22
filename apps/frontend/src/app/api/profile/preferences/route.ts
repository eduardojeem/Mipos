import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Intentar obtener preferencias de la tabla users
    let preferences: UserPreferences | null = null;
    
    // Comentado temporalmente hasta configurar la tabla users en Supabase
    /*
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();

      if (userData?.preferences) {
        preferences = userData.preferences as UserPreferences;
      }
    } catch (error) {
      console.warn('Could not fetch preferences from users table, using user_metadata');
    }
    */

    // Fallback: usar user_metadata
    if (!preferences) {
      preferences = (user.user_metadata as any)?.preferences || {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        appearance: {
          theme: 'system',
          language: 'es',
          timezone: 'America/Mexico_City'
        }
      };
    }

    return NextResponse.json({ 
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json({ 
        error: 'Las preferencias son requeridas' 
      }, { status: 400 });
    }

    // Validar estructura de preferencias
    const validPreferences: UserPreferences = {
      notifications: {
        email: Boolean(preferences.notifications?.email),
        push: Boolean(preferences.notifications?.push),
        sms: Boolean(preferences.notifications?.sms)
      },
      appearance: {
        theme: preferences.appearance?.theme || 'system',
        language: preferences.appearance?.language || 'es',
        timezone: preferences.appearance?.timezone || 'America/Mexico_City'
      }
    };

    // Comentado temporalmente hasta configurar la tabla users en Supabase
    /*
    // Intentar guardar en tabla users
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ preferences: validPreferences })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }
    } catch (dbError) {
      console.warn('Could not update preferences in users table, using user_metadata');
      
      // Fallback: guardar en user_metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { preferences: validPreferences }
      });

      if (metadataError) {
        throw metadataError;
      }
    }
    */

    // Fallback: guardar en user_metadata
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { preferences: validPreferences }
      });

      if (metadataError) {
        throw metadataError;
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json(
        { error: 'Error actualizando preferencias' },
        { status: 500 }
      );
    }

    // Registrar cambio en logs de auditoría (opcional)
    // Comentado temporalmente hasta configurar la tabla audit_logs en Supabase
    /*
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'preferences_updated',
          resource: 'user_profile',
          details: { 
            message: 'Usuario actualizó sus preferencias',
            preferences: validPreferences
          }
        });
    } catch (auditError) {
      console.warn('Could not log preferences change to audit logs:', auditError);
    }
    */

    return NextResponse.json({ 
      success: true,
      preferences: validPreferences,
      message: 'Preferencias actualizadas exitosamente'
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}