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
  theme_schedule_start?: string; // HH:MM
  theme_schedule_end?: string;   // HH:MM
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
}

function getDefaultUserSettings(user: any): UserSettings {
  const meta = user?.user_metadata || {};
  return {
    first_name: meta.first_name || '',
    last_name: meta.last_name || '',
    email: user?.email || '',
    phone: meta.phone || '',
    avatar: meta.avatar || meta.avatar_url || '',
    theme: meta.theme || 'system',
    theme_dark_intensity: meta.theme_dark_intensity || 'normal',
    theme_dark_tone: meta.theme_dark_tone || 'blue',
    theme_schedule_enabled: Boolean(meta.theme_schedule_enabled ?? false),
    theme_schedule_start: meta.theme_schedule_start || '19:00',
    theme_schedule_end: meta.theme_schedule_end || '07:00',
    theme_smooth_transitions: Boolean(meta.theme_smooth_transitions ?? true),
    language: meta.language || 'es',
    notifications_enabled: meta.notifications_enabled ?? true,
    email_notifications: meta.email_notifications ?? true,
    push_notifications: meta.push_notifications ?? true,
    dashboard_layout: meta.dashboard_layout || 'comfortable',
    sidebar_collapsed: meta.sidebar_collapsed ?? false,
    show_tooltips: meta.show_tooltips ?? true,
    enable_animations: meta.enable_animations ?? true,
    auto_save: meta.auto_save ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const meta = user.user_metadata || {};
    const stored = (meta.settings || {}) as Partial<UserSettings>;
    const defaults = getDefaultUserSettings(user);
    const userSettings: UserSettings = { ...defaults, ...stored } as UserSettings;

    return NextResponse.json({ success: true, data: userSettings });
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

    // Basic sanitization
    const cleanSettings: UserSettings = {
      first_name: String(settings.first_name || ''),
      last_name: String(settings.last_name || ''),
      email: String(settings.email || user.email || ''),
      phone: String(settings.phone || ''),
      avatar: String(settings.avatar || ''),
      theme: (settings.theme as any) || 'system',
      theme_dark_intensity: (settings.theme_dark_intensity as any) || 'normal',
      theme_dark_tone: (settings.theme_dark_tone as any) || 'blue',
      theme_schedule_enabled: Boolean(settings.theme_schedule_enabled ?? false),
      theme_schedule_start: String(settings.theme_schedule_start || '19:00'),
      theme_schedule_end: String(settings.theme_schedule_end || '07:00'),
      theme_smooth_transitions: Boolean(settings.theme_smooth_transitions ?? true),
      language: String(settings.language || 'es'),
      notifications_enabled: Boolean(settings.notifications_enabled ?? true),
      email_notifications: Boolean(settings.email_notifications ?? true),
      push_notifications: Boolean(settings.push_notifications ?? true),
      dashboard_layout: (settings.dashboard_layout as any) || 'comfortable',
      sidebar_collapsed: Boolean(settings.sidebar_collapsed ?? false),
      show_tooltips: Boolean(settings.show_tooltips ?? true),
      enable_animations: Boolean(settings.enable_animations ?? true),
      auto_save: Boolean(settings.auto_save ?? true),
    };

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: cleanSettings.first_name,
        last_name: cleanSettings.last_name,
        phone: cleanSettings.phone,
        avatar: cleanSettings.avatar,
        theme: cleanSettings.theme,
        theme_dark_intensity: cleanSettings.theme_dark_intensity,
        theme_dark_tone: cleanSettings.theme_dark_tone,
        theme_schedule_enabled: cleanSettings.theme_schedule_enabled,
        theme_schedule_start: cleanSettings.theme_schedule_start,
        theme_schedule_end: cleanSettings.theme_schedule_end,
        theme_smooth_transitions: cleanSettings.theme_smooth_transitions,
        language: cleanSettings.language,
        notifications_enabled: cleanSettings.notifications_enabled,
        email_notifications: cleanSettings.email_notifications,
        push_notifications: cleanSettings.push_notifications,
        dashboard_layout: cleanSettings.dashboard_layout,
        sidebar_collapsed: cleanSettings.sidebar_collapsed,
        show_tooltips: cleanSettings.show_tooltips,
        enable_animations: cleanSettings.enable_animations,
        auto_save: cleanSettings.auto_save,
        settings: cleanSettings,
      }
    });

    if (updateError) {
      console.error('Error updating user settings:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar la configuración de usuario' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: cleanSettings, message: 'Configuración de perfil actualizada correctamente' });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}