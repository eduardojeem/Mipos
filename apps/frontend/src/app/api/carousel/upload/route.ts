import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
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

export async function POST(request: NextRequest) {
  const { user, role } = await getActor();
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: !user ? 401 : 403 });
  }

  try {
    const formData = await request.formData();
    const files: File[] = [];

    // Permitir múltiple: 'image' o 'images[]'
    const single = formData.get('image');
    if (single && single instanceof File) files.push(single);
    const multi = formData.getAll('images[]') || [];
    multi.forEach((f) => { if (f instanceof File) files.push(f); });

    if (!files.length) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 });
    }

    // Usar cliente admin para evitar problemas de RLS en Storage
    let admin: any = null;
    try {
      admin = createAdminClient();
    } catch (e: any) {
      return NextResponse.json({ error: 'Supabase admin no configurado' }, { status: 500 });
    }

    // Asegurar bucket público 'carousel'
    try {
      await admin.storage.createBucket(BUCKET_NAME, { public: true });
    } catch (e: any) {
      // Ignorar si ya existe
    }
    // Forzar a público en caso de que el bucket exista como privado
    try {
      await admin.storage.updateBucket(BUCKET_NAME, { public: true });
    } catch (e: any) {
      // Si falla (por falta de permisos o API antigua), continuamos igualmente
    }

    const saved: Array<{ id: string; url: string; name: string; size: number }> = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Tipo no permitido. Solo JPG/PNG.' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Archivo demasiado grande. Máximo 5MB.' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      const baseName = file.name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'img';
      const id = `${baseName}_${timestamp}`;
      const path = `${id}.${extension}`;

      const { error: uploadError } = await admin.storage
        .from(BUCKET_NAME)
        .upload(path, buffer, { contentType: file.type, upsert: true });
      if (uploadError) {
        return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 });
      }

      const { data: publicData } = await admin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);
      const url = publicData?.publicUrl || '';
      saved.push({ id, url, name: file.name, size: file.size });
    }

    return NextResponse.json({ success: true, files: saved });
  } catch (error: any) {
    const message = error?.message || 'Error al subir imágenes';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}