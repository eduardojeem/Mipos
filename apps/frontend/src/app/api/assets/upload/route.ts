import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/webp'];
const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const PRODUCT_MAX_FILE_SIZE = 1.5 * 1024 * 1024;
const BUSINESS_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
const BUSINESS_FAVICON_TYPES = ['image/png', 'image/webp', 'image/x-icon', 'image/svg+xml'];
const BUSINESS_MAX_FILE_SIZES: Record<string, number> = {
  'business-logo': 1 * 1024 * 1024,
  'business-favicon': 512 * 1024,
  'business-carousel': 2 * 1024 * 1024,
  'business-image': 2 * 1024 * 1024,
};
const PDF_TYPES = ['application/pdf'];

async function getActor() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { user: null, role: null };
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', user.id)
        .eq('is_active', true),
    ]);
    const profileRole = (profile as any)?.role ?? (user.user_metadata as any)?.role;
    const assignedRole = Array.isArray(roleRows)
      ? (roleRows[0] as any)?.role?.name
      : null;
    return { user, role: profileRole || assignedRole };
  } catch {
    return { user: null, role: null };
  }
}

function canUploadAssets(role?: string | null) {
  const r = (role || '').toUpperCase();
  return r === 'OWNER' || r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'MANAGER';
}

export async function POST(request: NextRequest) {
  const { user, role } = await getActor();
  if (!user || !canUploadAssets(role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: !user ? 401 : 403 });
  }

  try {
    const formData = await request.formData();
    const bucket = String(formData.get('bucket') || '').trim();
    const prefix = String(formData.get('prefix') || '').trim();
    const publicFlagRaw = formData.get('public');
    const isPublic = typeof publicFlagRaw === 'string' ? publicFlagRaw === 'true' : true; // por defecto público
    const requestedMaxSize = Number(formData.get('maxSize') || DEFAULT_MAX_FILE_SIZE);
    const purpose = String(formData.get('purpose') || '').toLowerCase();
    const maxSizeRaw =
      purpose === 'product'
        ? Math.min(requestedMaxSize || PRODUCT_MAX_FILE_SIZE, PRODUCT_MAX_FILE_SIZE)
        : BUSINESS_MAX_FILE_SIZES[purpose]
          ? Math.min(requestedMaxSize || BUSINESS_MAX_FILE_SIZES[purpose], BUSINESS_MAX_FILE_SIZES[purpose])
        : requestedMaxSize;

    if (!bucket) {
      return NextResponse.json({ error: 'Parámetro "bucket" requerido' }, { status: 400 });
    }

    const files: File[] = [];
    const single = formData.get('file');
    if (single && single instanceof File) files.push(single);
    const multi = formData.getAll('files[]') || [];
    multi.forEach((f) => { if (f instanceof File) files.push(f); });

    if (!files.length) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 });
    }

    // Tipos permitidos según propósito/bucket
    let allowedTypes = IMAGE_TYPES;
    if (purpose === 'legal' || bucket === 'legal') {
      allowedTypes = PDF_TYPES;
    } else if (purpose === 'product') {
      allowedTypes = PRODUCT_IMAGE_TYPES;
    } else if (purpose === 'business-favicon') {
      allowedTypes = BUSINESS_FAVICON_TYPES;
    } else if (purpose.startsWith('business-')) {
      allowedTypes = BUSINESS_IMAGE_TYPES;
    } else if (purpose === 'favicon') {
      allowedTypes = ['image/x-icon', 'image/png'];
    }

    // Cliente admin para Storage
    let admin: any = null;
    try {
      admin = createAdminClient();
    } catch (e: any) {
      return NextResponse.json({ error: 'Supabase admin no configurado' }, { status: 500 });
    }

    // Crear/actualizar bucket con visibilidad
    try { await admin.storage.createBucket(bucket, { public: isPublic }); } catch {}
    try { await admin.storage.updateBucket(bucket, { public: isPublic }); } catch {}

    const saved: Array<{ id: string; url: string; name: string; size: number; path: string }> = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `Tipo no permitido. Permitidos: ${allowedTypes.join(', ')}` }, { status: 400 });
      }
      if (file.size > maxSizeRaw) {
        return NextResponse.json({ error: `Archivo demasiado grande. Máximo ${Math.round(maxSizeRaw / (1024 * 1024))}MB.` }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const timestamp = Date.now();
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const safeBase = file.name.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 48) || 'file';
      const id = `${safeBase.replace(/\.[^.]+$/, '')}_${timestamp}`;
      const path = `${prefix ? prefix + '/' : ''}${id}${ext ? '.' + ext : ''}`;

      const { error: uploadError } = await admin.storage
        .from(bucket)
        .upload(path, buffer, { contentType: file.type, upsert: true });
      if (uploadError) {
        return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 });
      }

      const { data: publicData } = await admin.storage
        .from(bucket)
        .getPublicUrl(path);
      const url = publicData?.publicUrl || '';
      saved.push({ id, url, name: file.name, size: file.size, path });
    }

    return NextResponse.json({ success: true, files: saved });
  } catch (error: any) {
    const message = error?.message || 'Error al subir archivos';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
