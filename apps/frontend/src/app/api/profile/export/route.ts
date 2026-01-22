import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function toCSV(data: any[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const csv = [headers.join(',')];
  for (const row of data) {
    csv.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  }
  return csv.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const userId = user.id;
    const userEmail = user.email ?? 'sin-email@local';

    // Datos de perfil (users table o metadata)
    let profile: any = null;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, name, phone, preferences')
        .eq('id', userId)
        .single();
      if (userData) profile = userData;
    } catch (e) {
      profile = null; // ignorar error y usar metadata
    }

    if (!profile) {
      profile = {
        id: userId,
        email: userEmail,
        name: (user.user_metadata as any)?.name || null,
        phone: (user.user_metadata as any)?.phone || null,
        preferences: (user.user_metadata as any)?.preferences || null
      };
    }

    // Preferencias
    const preferences = profile.preferences ?? (user.user_metadata as any)?.preferences ?? {};

    // Actividad (si existe tabla)
    let activity: any[] = [];
    try {
      const { data: activityData } = await supabase
        .from('user_activity')
        .select('id, action, resource, details, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (activityData) activity = activityData;
    } catch (e) {
      activity = [];
    }

    // Seguridad / sesiones resumidas (si existe tabla)
    let security: any[] = [];
    try {
      const { data: securityData } = await supabase
        .from('security_events')
        .select('id, event, details, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (securityData) security = securityData;
    } catch (e) {
      security = [];
    }

    const exportPayload = {
      generated_at: new Date().toISOString(),
      user: { id: userId, email: userEmail },
      profile,
      preferences,
      activity,
      security
    };

    if (format === 'csv') {
      const csvParts: string[] = [];
      csvParts.push('# User');
      csvParts.push(toCSV([{ id: userId, email: userEmail }]));
      csvParts.push('\n# Profile');
      csvParts.push(toCSV([profile]));
      csvParts.push('\n# Preferences');
      csvParts.push(toCSV([preferences]));
      csvParts.push('\n# Activity');
      csvParts.push(toCSV(activity));
      csvParts.push('\n# Security');
      csvParts.push(toCSV(security));
      const csvContent = csvParts.join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="profile_export.csv"'
        }
      });
    }

    return NextResponse.json({ success: true, data: exportPayload });
  } catch (error) {
    console.error('Error exporting profile:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}