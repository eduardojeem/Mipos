import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

const BUCKET_NAME = 'carousel';

async function getActor() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { user: null, role: null };
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const role = (profile as any)?.role ?? (user.user_metadata as any)?.role;
    return { user, role };
  } catch {
    return { user: null, role: null };
  }
}

function isAdminRole(role?: string | null) {
  const r = (role || '').toUpperCase();
  return r === 'ADMIN' || r === 'SUPER_ADMIN';
}

export async function DELETE(request: NextRequest) {
  const { user, role } = await getActor();
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: !user ? 401 : 403 });
  }

  try {
    const body = await request.json().catch(() => null) as { url?: string, path?: string } | null;
    const url = body?.url || '';
    const explicitPath = body?.path || '';

    // Resolver path en bucket a partir de URL pública o path explícito
    let path = explicitPath;
    if (!path && typeof url === 'string' && url.includes('/storage/v1/object/public/')) {
      const marker = '/storage/v1/object/public/' + BUCKET_NAME + '/';
      const idx = url.indexOf(marker);
      if (idx >= 0) {
        path = url.substring(idx + marker.length);
      }
    }
    if (!path) {
      return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
    }

    let admin: any = null;
    try {
      admin = createAdminClient();
    } catch (e: any) {
      return NextResponse.json({ error: 'Supabase admin no configurado' }, { status: 500 });
    }

    // Asegurar configuración pública del bucket (por si existe privado)
    try {
      await admin.storage.updateBucket(BUCKET_NAME, { public: true });
    } catch (e: any) {
      // Continuar aún si falla
    }

    const { error: delError } = await admin.storage.from(BUCKET_NAME).remove([path]);
    if (delError) {
      return NextResponse.json({ success: false, error: delError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || 'Error al eliminar imagen';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}