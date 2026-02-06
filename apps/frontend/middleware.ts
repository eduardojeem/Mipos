import { NextResponse, NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Redirect /admin/settings to /dashboard/settings
  if (url.pathname === '/admin/settings') {
    return NextResponse.redirect(new URL('/dashboard/settings', request.url));
  }

  // ============================================
  // PATH-BASED ROUTING: /{slug}/page
  // Ejemplo: /bfjeem/home → Detecta organización "bfjeem"
  // ============================================
  const segments = url.pathname.split('/').filter(Boolean);
  
  // Rutas reservadas que NO son slugs de organización
  const reserved = new Set([
    'api', 'admin', 'dashboard', 'auth', '_next', 
    'home', 'offers', 'catalog', 'orders', 'inicio',
    'signin', 'signup', 'signout', 'forgot-password',
    'pos', 'products', 'customers', 'sales', 'reports',
    'settings', 'profile', 'help', 'about', 'contact',
    'terms', 'privacy', 'suspended', '404', '500'
  ]);
  
  const firstSegment = segments[0];
  
  // Verificar si el primer segmento es un slug válido de organización
  const isValidSlug = firstSegment && 
                      !reserved.has(firstSegment) && 
                      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(firstSegment);

  if (isValidSlug) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in middleware');
        return await updateSession(request);
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Buscar organización por slug o subdomain
      const { data: org, error } = await supabase
        .from('organizations')
        .select('id, slug, name, subdomain, subscription_status')
        .or(`slug.eq.${firstSegment},subdomain.eq.${firstSegment}`)
        .eq('subscription_status', 'ACTIVE')
        .single();

      if (org && !error) {
        console.log(`✅ Organization detected via path: ${org.name} (${org.slug})`);

        // Establecer cookies con información de la organización
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

        // Reescribir URL: /bfjeem/home → /home (con contexto de organización)
        const restSegments = segments.slice(1);
        const rewritePath = '/' + (restSegments.length ? restSegments.join('/') : 'home');
        const rewriteUrl = new URL(rewritePath, request.url);
        
        console.log(`🔄 Rewriting: ${url.pathname} → ${rewritePath}`);
        
        return NextResponse.rewrite(rewriteUrl, { request: { headers: request.headers } });
      }
    } catch (error) {
      console.error('❌ Error detecting organization by path:', error);
    }
  }

  // ============================================
  // SUBDOMAIN-BASED ROUTING (Fallback para Vercel Pro)
  // Ejemplo: bfjeem.miposparaguay.vercel.app
  // ============================================
  const publicPages = ['/home', '/offers', '/catalog', '/orders/track'];
  const isPublicPage = publicPages.some(page => url.pathname.startsWith(page));

  if (isPublicPage) {
    try {
      const hostname = request.headers.get('host') || '';
      const parts = hostname.split('.');
      const subdomain = parts[0].split(':')[0];

      // Solo intentar detección por subdomain si NO es localhost o el dominio base
      const isSubdomain = parts.length > 2 && !hostname.includes('localhost');

      if (isSubdomain) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);

          const { data: org, error } = await supabase
            .from('organizations')
            .select('id, slug, name, subdomain, subscription_status')
            .or(`subdomain.eq.${subdomain},custom_domain.eq.${hostname}`)
            .eq('subscription_status', 'ACTIVE')
            .single();

          if (org && !error) {
            console.log(`✅ Organization detected via subdomain: ${org.name} (${org.slug})`);

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
          }
        }
      }

      // En desarrollo (localhost), usar organización por defecto
      if (hostname.includes('localhost')) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          const { data: defaultOrg } = await supabase
            .from('organizations')
            .select('id, slug, name, subscription_status')
            .eq('subscription_status', 'ACTIVE')
            .limit(1)
            .single();

          if (defaultOrg) {
            console.log(`ℹ️  Using default organization in development: ${defaultOrg.name}`);
            
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
      }
    } catch (error) {
      console.error('❌ Error detecting organization by subdomain:', error);
    }
  }

  // Para todas las demás rutas, continuar normalmente
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
