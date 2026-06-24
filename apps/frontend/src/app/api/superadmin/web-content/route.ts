import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  LANDING_CONTENT_DEFAULTS,
  MARKETPLACE_CONTENT_DEFAULTS,
  LEGAL_CONTENT_DEFAULTS,
} from '@/lib/web-content/types';

const ALLOWED_KEYS = ['landing_content', 'marketplace_content', 'legal_content'] as const;
type ContentKey = (typeof ALLOWED_KEYS)[number];

const DEFAULTS: Record<ContentKey, unknown> = {
  landing_content: LANDING_CONTENT_DEFAULTS,
  marketplace_content: MARKETPLACE_CONTENT_DEFAULTS,
  legal_content: LEGAL_CONTENT_DEFAULTS,
};

const TAG_MAP: Record<ContentKey, string[]> = {
  landing_content: ['web-content', 'landing-content'],
  marketplace_content: ['web-content', 'marketplace-content'],
  legal_content: ['web-content', 'legal-content'],
};

export async function GET(request: NextRequest) {
  try {
    const auth = await assertSuperAdmin(request);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') as ContentKey | null;

    if (!key || !ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { error: `Clave no valida. Use: ${ALLOWED_KEYS.join(', ')}` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`[web-content GET] Error fetching ${key}:`, error);
      return NextResponse.json({ error: 'Error al obtener contenido' }, { status: 500 });
    }

    const content = data?.value ?? DEFAULTS[key];
    return NextResponse.json({ key, content, updatedAt: data?.updated_at ?? null });
  } catch (error) {
    console.error('[web-content GET]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await assertSuperAdmin(request);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const body = await request.json();
    const { key, content } = body as { key: unknown; content: unknown };

    if (!key || !ALLOWED_KEYS.includes(key as ContentKey)) {
      return NextResponse.json(
        { error: `Clave no valida. Use: ${ALLOWED_KEYS.join(', ')}` },
        { status: 400 },
      );
    }

    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return NextResponse.json({ error: 'Contenido invalido' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('system_settings').upsert(
      {
        key: key as ContentKey,
        value: content,
        category: 'web_content',
        description:
          key === 'landing_content'
            ? 'Contenido de la pagina de inicio publica (/inicio)'
            : key === 'legal_content'
              ? 'Contenido legal publico (/terms y /privacy)'
              : 'Contenido del marketplace publico (/home)',
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      },
      { onConflict: 'key' },
    );

    if (error) {
      console.error(`[web-content PUT] Error saving ${key}:`, error);
      return NextResponse.json({ error: 'Error al guardar contenido' }, { status: 500 });
    }

    // Invalidate SSR cache so landing/marketplace pick up changes immediately
    const tags = TAG_MAP[key as ContentKey];
    for (const tag of tags) {
      revalidateTag(tag);
    }

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error('[web-content PUT]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
