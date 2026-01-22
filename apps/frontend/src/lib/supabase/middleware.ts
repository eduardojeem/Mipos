import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../../types/supabase';
import { isSupabaseActive, isMockAuthEnabled } from '../env';

// Verificación de configuración y modo mock centralizada en '@/lib/env'

export async function updateSession(request: NextRequest) {
  // Detectar configuración y modo mock de Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabaseEnv = isSupabaseActive();
  const isMockAuth = isMockAuthEnabled();

  let supabaseResponse = NextResponse.next({ request });

  // Si no hay configuración válida de Supabase, permitir paso sin redirección
  if (!hasSupabaseEnv) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publicPaths = ['/home', '/offers', '/'];
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + '/'));
  if (!user && path.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }
  if (!user && !isPublic && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/api')) {
    // En modo mock/desarrollo, permitir paso sin redirigir
    if (isMockAuth) {
      return supabaseResponse;
    }
    // no user, redirect to login page
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }

  // Protección adicional: bloquear acceso a /admin si el rol no es ADMIN/SUPER_ADMIN
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    // Consultar rol desde BD con fallback a metadata
    let role = String((user as any)?.user_metadata?.role || '').toUpperCase();
    try {
      const { data: profile } = await (supabase as any)
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const dbRole = String((profile as any)?.role || '').toUpperCase();
      role = dbRole || role;
    } catch {
      // Ignore DB errors, keep metadata fallback
    }
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    // En modo mock, permitir paso para desarrollo; fuera de mock, redirigir si no tiene rol
    if (!isAdmin && !isMockAuth) {
      // Log de auditoría para acceso denegado a página de admin
      try {
        await (supabase as any)
          .from('audit_logs')
          .insert({
            user_id: user?.id,
            action: 'access_denied',
            resource: 'admin_page',
            details: {
              path: request.nextUrl.pathname,
              role,
              method: request.method,
            },
          });
      } catch {
        // Ignorar errores de auditoría (tabla ausente, RLS, etc.)
      }
      const url = request.nextUrl.clone();
      url.pathname = '/403';
      return NextResponse.redirect(url);
    }
  }

  // Proteger endpoints /api/admin/* con respuestas JSON apropiadas
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    // Requerir autenticación incluso si normalmente se permitirían rutas /api
    if (!user && !isMockAuth) {
      // Log de auditoría para API admin no autorizada
      try {
        await (supabase as any)
          .from('audit_logs')
          .insert({
            user_id: null,
            action: 'access_denied',
            resource: 'admin_api',
            details: {
              path: request.nextUrl.pathname,
              role: null,
              method: request.method,
            },
          });
      } catch {}
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    // Verificar rol ADMIN/SUPER_ADMIN usando BD con fallback a metadata
    let role = String((user as any)?.user_metadata?.role || '').toUpperCase();
    try {
      const { data: profile } = await (supabase as any)
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .single();
      const dbRole = String((profile as any)?.role || '').toUpperCase();
      role = dbRole || role;
    } catch {
      // Ignore DB errors, keep metadata fallback
    }
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && !isMockAuth) {
      // Log de auditoría para API admin con rol insuficiente
      try {
        await (supabase as any)
          .from('audit_logs')
          .insert({
            user_id: user?.id,
            action: 'access_denied',
            resource: 'admin_api',
            details: {
              path: request.nextUrl.pathname,
              role,
              method: request.method,
            },
          });
      } catch {}
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
  }

  // Proteger acceso a reportes por rol (ADMIN/MANAGER). Evitar Prisma en runtime Edge.
  if (user && request.nextUrl.pathname.startsWith('/dashboard/reports')) {
    // Obtener rol desde metadata con fallback a BD (tabla users)
    let role = String((user as any)?.user_metadata?.role || '').toUpperCase();
    try {
      const { data: profile } = await (supabase as any)
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const dbRole = String((profile as any)?.role || '').toUpperCase();
      role = dbRole || role;
    } catch {
      // Ignorar errores de BD; mantener metadata
    }
    const allowedRoles = ['ADMIN', 'MANAGER'];
    const canViewReports = allowedRoles.includes(role);
    if (!canViewReports && !isMockAuth) {
      const url = request.nextUrl.clone();
      url.pathname = '/403';
      url.searchParams.set('reason', 'reports.view');
      return NextResponse.redirect(url);
    }
  }

  // Proteger API de reportes por rol (ADMIN/MANAGER)
  if (request.nextUrl.pathname.startsWith('/api/reports')) {
    if (!user && !isMockAuth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (user && !isMockAuth) {
      let role = String((user as any)?.user_metadata?.role || '').toUpperCase();
      try {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('role')
          .eq('id', user?.id)
          .single();
        const dbRole = String((profile as any)?.role || '').toUpperCase();
        role = dbRole || role;
      } catch {}
      const allowedRoles = ['ADMIN', 'MANAGER'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse;
}
