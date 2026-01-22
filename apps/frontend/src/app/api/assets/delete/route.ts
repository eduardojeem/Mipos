import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

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
    const body = await request.json().catch(() => null) as { url?: string, path?: string, bucket?: string, public?: boolean } | null;
    let bucket = String(body?.bucket || '').trim();
    const url = body?.url || '';
    const explicitPath = body?.path || '';

    // Si no se pasa bucket, inferir desde URL pública
    if (!bucket && typeof url === 'string' && url.includes('/storage/v1/object/public/')) {
      const marker = '/storage/v1/object/public/';
      const idx = url.indexOf(marker);
      if (idx >= 0) {
        const tail = url.substring(idx + marker.length);
        bucket = tail.split('/')[0];
      }
    }

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket requerido' }, { status: 400 });
    }

    // Resolver path en bucket a partir de URL pública o path explícito
    let path = explicitPath;
    if (!path && typeof url === 'string' && url.includes('/storage/v1/object/public/')) {
      const marker = `/storage/v1/object/public/${bucket}/`;
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

    // Opcional: asegurar visibilidad pedida
    const publicFlag = body?.public;
    if (typeof publicFlag === 'boolean') {
      try { await admin.storage.updateBucket(bucket, { public: publicFlag }); } catch {}
    }

    const { error: delError } = await admin.storage.from(bucket).remove([path]);
    if (delError) {
      return NextResponse.json({ success: false, error: delError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || 'Error al eliminar archivo';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}