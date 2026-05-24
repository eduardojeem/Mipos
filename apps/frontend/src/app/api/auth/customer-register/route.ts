import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkRateLimit(getClientIp(request));
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiados intentos de registro. Proba de nuevo en unos minutos.' },
        {
          status: 429,
          headers: rate.retryAfterSeconds ? { 'Retry-After': String(rate.retryAfterSeconds) } : undefined,
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Nombre, email y contrasena son requeridos' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Email invalido' }, { status: 400 });
    }

    if (name.length < 2) {
      return NextResponse.json({ success: false, error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[\d\W_]/.test(password)) {
      return NextResponse.json({
        success: false,
        error: 'La contrasena debe tener al menos 8 caracteres y combinar letras con numeros o simbolos',
      }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name,
          phone,
          account_type: 'customer',
        },
      },
    });

    if (authError) {
      return NextResponse.json({
        success: false,
        error: authError.message === 'User already registered' ? 'Este email ya esta registrado' : authError.message,
      }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ success: false, error: 'Error al crear usuario' }, { status: 500 });
    }

    const { error: userUpsertError } = await admin
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        full_name: name,
        phone: phone || null,
        role: 'USER',
        created_at: authData.user.created_at || now,
        updated_at: now,
      }, { onConflict: 'id' });

    if (userUpsertError) {
      console.error('[customer-register] users upsert failed:', userUpsertError);
      return NextResponse.json({
        success: false,
        error: 'No pudimos sincronizar el perfil del cliente. Intenta de nuevo.',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        name,
        role: 'USER',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[customer-register] unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
