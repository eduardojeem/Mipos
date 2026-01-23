import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UserSettings {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string;
  theme: 'light' | 'dark' | 'system';
  theme_dark_intensity?: 'dim' | 'normal' | 'black';
  theme_dark_tone?: 'blue' | 'gray' | 'pure';
  theme_schedule_enabled?: boolean;
  theme_schedule_start?: string;
  theme_schedule_end?: string;
  theme_smooth_transitions?: boolean;
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  dashboard_layout: 'compact' | 'comfortable' | 'spacious';
  sidebar_collapsed: boolean;
  show_tooltips: boolean;
  enable_animations: boolean;
  auto_save: boolean;
  primary_color: string;
  border_radius: string;
  enable_glassmorphism: boolean;
  enable_gradients: boolean;
  enable_shadows: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  avatar: '',
  theme: 'system',
  theme_dark_intensity: 'normal',
  theme_dark_tone: 'blue',
  theme_schedule_enabled: false,
  theme_schedule_start: '19:00',
  theme_schedule_end: '07:00',
  theme_smooth_transitions: true,
  language: 'es',
  notifications_enabled: true,
  email_notifications: true,
  push_notifications: true,
  dashboard_layout: 'comfortable',
  sidebar_collapsed: false,
  show_tooltips: true,
  enable_animations: true,
  auto_save: true,
  primary_color: 'blue',
  border_radius: '0.5',
  enable_glassmorphism: true,
  enable_gradients: true,
  enable_shadows: true,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Intentar leer de la tabla dedicada user_settings
    const { data: dbSettings, error: dbError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Datos básicos del perfil desde auth (fuente de verdad para estos campos)
    const profileData = {
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      email: user.email || '',
      phone: user.user_metadata?.phone || '',
      avatar: user.user_metadata?.avatar || user.user_metadata?.avatar_url || '',
    };

    let finalSettings: UserSettings;

    if (dbSettings) {
      // Mapear desde DB estructurada
      finalSettings = {
        ...DEFAULT_SETTINGS,
        ...profileData,
        theme: dbSettings.theme || DEFAULT_SETTINGS.theme,
        language: dbSettings.language || DEFAULT_SETTINGS.language,
        // Dashboard Config
        dashboard_layout: dbSettings.dashboard_config?.layout || DEFAULT_SETTINGS.dashboard_layout,
        sidebar_collapsed: dbSettings.dashboard_config?.sidebar_collapsed ?? DEFAULT_SETTINGS.sidebar_collapsed,
        show_tooltips: dbSettings.dashboard_config?.show_tooltips ?? DEFAULT_SETTINGS.show_tooltips,
        auto_save: dbSettings.dashboard_config?.auto_save ?? DEFAULT_SETTINGS.auto_save,
        // Notifications Config
        notifications_enabled: dbSettings.notifications_config?.enabled ?? true, // General toggle
        email_notifications: dbSettings.notifications_config?.email ?? DEFAULT_SETTINGS.email_notifications,
        push_notifications: dbSettings.notifications_config?.push ?? DEFAULT_SETTINGS.push_notifications,
        // Appearance Config
        primary_color: dbSettings.appearance_config?.primary_color || DEFAULT_SETTINGS.primary_color,
        border_radius: dbSettings.appearance_config?.border_radius || DEFAULT_SETTINGS.border_radius,
        enable_animations: dbSettings.appearance_config?.enable_animations ?? DEFAULT_SETTINGS.enable_animations,
        enable_glassmorphism: dbSettings.appearance_config?.enable_glassmorphism ?? DEFAULT_SETTINGS.enable_glassmorphism,
        enable_gradients: dbSettings.appearance_config?.enable_gradients ?? DEFAULT_SETTINGS.enable_gradients,
        enable_shadows: dbSettings.appearance_config?.enable_shadows ?? DEFAULT_SETTINGS.enable_shadows,
        theme_dark_intensity: dbSettings.appearance_config?.theme_dark_intensity || DEFAULT_SETTINGS.theme_dark_intensity,
        theme_dark_tone: dbSettings.appearance_config?.theme_dark_tone || DEFAULT_SETTINGS.theme_dark_tone,
        theme_schedule_enabled: dbSettings.appearance_config?.theme_schedule_enabled ?? DEFAULT_SETTINGS.theme_schedule_enabled,
        theme_schedule_start: dbSettings.appearance_config?.theme_schedule_start || DEFAULT_SETTINGS.theme_schedule_start,
        theme_schedule_end: dbSettings.appearance_config?.theme_schedule_end || DEFAULT_SETTINGS.theme_schedule_end,
        theme_smooth_transitions: dbSettings.appearance_config?.theme_smooth_transitions ?? DEFAULT_SETTINGS.theme_smooth_transitions,
      };
    } else {
      // Fallback: Leer de metadatos antiguos (migración implícita en lectura)
      const meta = user.user_metadata || {};
      finalSettings = {
        ...DEFAULT_SETTINGS,
        ...profileData,
        // Intentar recuperar de metadatos antiguos si existen
        theme: meta.theme || DEFAULT_SETTINGS.theme,
        language: meta.language || DEFAULT_SETTINGS.language,
        dashboard_layout: meta.dashboard_layout || DEFAULT_SETTINGS.dashboard_layout,
        // ... otros campos si es necesario
      };
    }

    return NextResponse.json({ success: true, data: finalSettings });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const settings = body as Partial<UserSettings>;

    // 1. Actualizar campos de perfil en Auth Metadata (solo los esenciales)
    // CRÍTICO: Evitar guardar base64 o datos pesados aquí para prevenir Error 431 (Headers Too Large)
    const MAX_METADATA_AVATAR_LENGTH = 1000; // Un avatar normal (URL) es corto
    let safeAvatar = settings.avatar;

    // Si el avatar parece ser un base64 largo, no lo guardamos en metadata
    if (safeAvatar && safeAvatar.startsWith('data:') && safeAvatar.length > MAX_METADATA_AVATAR_LENGTH) {
      console.warn('Avatar base64 detectado, omitiendo de metadata para evitar token pesado');
      safeAvatar = undefined; // Se mantendrá solo en la tabla user_settings o storage
    }

    const profileUpdates = {
      first_name: settings.first_name,
      last_name: settings.last_name,
      phone: settings.phone,
      avatar: safeAvatar,
      // Limpieza proactiva de basura antigua en metadata
      settings: null,
      theme: null,
      dashboard_layout: null,
      notifications_enabled: null,
      primary_color: null,
      border_radius: null,
    };

    // Filtramos undefined
    const cleanProfileUpdates = Object.fromEntries(
      Object.entries(profileUpdates).filter(([_, v]) => v !== undefined)
    );

    const { error: authError } = await supabase.auth.updateUser({
      data: cleanProfileUpdates
    });

    if (authError) {
      console.error('Error updating auth metadata:', authError);
      // No bloqueamos, seguimos intentando guardar preferencias en DB
    }

    // 2. Guardar preferencias detalladas en tabla user_settings
    const dbPayload = {
      user_id: user.id,
      theme: settings.theme,
      language: settings.language,
      dashboard_config: {
        layout: settings.dashboard_layout,
        sidebar_collapsed: settings.sidebar_collapsed,
        show_tooltips: settings.show_tooltips,
        auto_save: settings.auto_save
      },
      notifications_config: {
        enabled: settings.notifications_enabled,
        email: settings.email_notifications,
        push: settings.push_notifications
      },
      appearance_config: {
        primary_color: settings.primary_color,
        border_radius: settings.border_radius,
        enable_animations: settings.enable_animations,
        enable_glassmorphism: settings.enable_glassmorphism,
        enable_gradients: settings.enable_gradients,
        enable_shadows: settings.enable_shadows,
        theme_dark_intensity: settings.theme_dark_intensity,
        theme_dark_tone: settings.theme_dark_tone,
        theme_schedule_enabled: settings.theme_schedule_enabled,
        theme_schedule_start: settings.theme_schedule_start,
        theme_schedule_end: settings.theme_schedule_end,
        theme_smooth_transitions: settings.theme_smooth_transitions
      },
      updated_at: new Date().toISOString()
    };

    // Upsert a la base de datos
    const { error: dbError } = await supabase
      .from('user_settings')
      .upsert(dbPayload, { onConflict: 'user_id' });

    if (dbError) {
      console.error('Error updating user_settings table:', dbError);
      return NextResponse.json({ error: 'No se pudo guardar la configuración detallada' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { ...DEFAULT_SETTINGS, ...settings },
      message: 'Configuración guardada correctamente'
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
