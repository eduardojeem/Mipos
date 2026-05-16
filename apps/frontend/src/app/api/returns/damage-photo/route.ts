import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import {
  getUserOrganizationId,
  validateOrganizationAccess,
} from '@/app/api/_utils/organization';

const BUCKET = 'return-damage-photos';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return null;
  return trimmed;
}

/**
 * POST /api/returns/damage-photo
 *
 * Uploads a damage evidence photo to Supabase Storage and returns the
 * public-equivalent URL (signed) the frontend then writes into the
 * return_items.damage_photo_url column.
 *
 * Path convention: <organization_id>/<temp_or_return_id>/<random>.<ext>
 *   - org segment so RLS can scope by membership
 *   - return_id may be a temp client-side id during the wizard, replaced
 *     with the real return_id once the return is created (the URL is
 *     copied into return_items as-is — the path is stable)
 *
 * Multipart body: { file: File, returnDraftId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['returns.create']);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    );
    const organizationId =
      headerOrgId ||
      (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 });
    }

    if (auth.userId && auth.userRole !== 'SUPER_ADMIN') {
      const hasAccess = await validateOrganizationAccess(auth.userId, organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 });
      }
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Multipart form-data requerido' }, { status: 400 });
    }
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo (campo "file")' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}. Usá JPG, PNG o WebP.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `El archivo supera los 5 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).` },
        { status: 400 }
      );
    }

    const returnDraftId = normalizeString(formData.get('returnDraftId')) || 'draft';
    // Safe random filename: no user input in the basename.
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const random = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${organizationId}/${returnDraftId}/${random}.${ext}`;

    const supabase = await createAdminClient();
    const arrayBuf = await file.arrayBuffer();

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuf, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[returns/damage-photo] upload failed:', uploadErr.message);
      // The most common cause: bucket doesn't exist yet. The migration
      // doc points to manual creation in Dashboard.
      return NextResponse.json(
        {
          error: 'No se pudo subir la foto',
          details: uploadErr.message,
          hint: 'Verificá que el bucket "return-damage-photos" exista en Supabase Storage (Dashboard → Storage).',
        },
        { status: 500 }
      );
    }

    // Get a long-lived signed URL (7 days). Frontend may re-sign later
    // for viewing if needed.
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signErr || !signed?.signedUrl) {
      console.error('[returns/damage-photo] sign failed:', signErr?.message);
      return NextResponse.json(
        { error: 'Foto subida pero no se pudo generar URL firmada', details: signErr?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      path,
      url: signed.signedUrl,
      sizeBytes: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[returns/damage-photo] unhandled:', message);
    return NextResponse.json({ error: 'Error interno', details: message }, { status: 500 });
  }
}
