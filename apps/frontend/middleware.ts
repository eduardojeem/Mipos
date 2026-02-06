import { NextResponse, NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  // Skip middleware for RSC fetches to avoid aborting server component streams
  const url = request.nextUrl;
  if (url.searchParams.has('_rsc')) {
    return NextResponse.next();
  }

  // Redirect /admin/settings to /dashboard/settings
  if (url.pathname === '/admin/settings') {
    return NextResponse.redirect(new URL('/dashboard/settings', request.url));
  }

  // ============================================
  // DETECCIÓN DE ORGANIZACIÓN PARA PÁGINAS PÚBLICAS
  // ============================================
  const publicPages = ['/home', '/offers', '/catalog', '/orders/track'];
  const isPublicPage = publicPages.some(page => url.pathname.startsWith(page));

  if (isPublicPage) {
    try {
      // Detectar organización por hostname
      const hostname = request.headers.get('host') || '';
      
      // Extraer subdomain (primera parte del hostname)
      const parts = hostname.split('.');
      const subdomain = parts[0].split(':')[0]; // Remover puerto si existe

      // Crear cliente Supabase para buscar organización
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in middleware');
        return await updateSession(request);
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Buscar organización por subdomain o custom_domain
      const { data: org, error } = await supabase
        .from('organizations')
        .select('id, slug, name, subscription_status')
        .or(`subdomain.eq.${subdomain},custom_domain.eq.${hostname}`)
        .eq('subscription_status', 'ACTIVE')
        .single();

      if (error || !org) {
        console.warn(`⚠️  No organization found for hostname: ${hostname}`);
        
        // En desarrollo (localhost), usar organización por defecto
        if (hostname.includes('localhost')) {
          const { data: defaultOrg } = await supabase
            .from('organizations')
            .select('id, slug, name, subscription_status')
            .eq('subscription_status', 'ACTIVE')
            .limit(1)
            .single();

          if (defaultOrg) {
            console.log(`ℹ️  Using default organization in development: ${defaultOrg.name}`);
            
            // Usar cookies para pasar la información de organización
            const response = await updateSession(request);
            response.cookies.set('x-organization-id', defaultOrg.id, { 
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            });
            response.cookies.set('x-organization-name', defaultOrg.name, { 
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            });
            response.cookies.set('x-organization-slug', defaultOrg.slug, { 
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            });

            return response;
          }
        }

        // En producción, redirigir a 404
        return NextResponse.redirect(new URL('/404', request.url));
      }

      // Verificar que la suscripción esté activa
      if (org.subscription_status !== 'ACTIVE') {
        console.warn(`⚠️  Organization ${org.name} has inactive subscription`);
        return NextResponse.redirect(new URL('/suspended', request.url));
      }

      console.log(`✅ Organization detected: ${org.name} (${org.slug})`);

      // Usar cookies para pasar la información de organización
      const response = await updateSession(request);
      response.cookies.set('x-organization-id', org.id, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      response.cookies.set('x-organization-name', org.name, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      response.cookies.set('x-organization-slug', org.slug, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      return response;

    } catch (error) {
      console.error('❌ Error detecting organization:', error);
      return await updateSession(request);
    }
  }

  // Para páginas no públicas, continuar normalmente
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/data (data prefetch for app router)
     * - _next/webpack-hmr (dev HMR)
     * - favicon.ico (favicon file)
     * - asset file extensions (images)
     */
    '/((?!_next/static|_next/image|_next/data|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};