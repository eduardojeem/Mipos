import { NextResponse, NextRequest } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { Database } from './src/types/supabase'

function isSlugCandidate(seg: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(seg)
}

export async function middleware(request: NextRequest) {
  // First, run auth/session protections
  let response = await updateSession(request)

  // Path-based tenant detection: /{orgSlug}/...
  const url = request.nextUrl.clone()
  const segments = url.pathname.split('/').filter(Boolean)

  // Skip protected/internal prefixes
  const skipPrefixes = ['api', 'admin', 'dashboard', 'auth', '_next']
  const first = segments[0]
  if (!first || skipPrefixes.includes(first)) {
    return response
  }

  if (!isSlugCandidate(first)) {
    return response
  }

  // Resolve organization by slug or subdomain
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return response
    }
    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })

    const { data: orgBySlug } = await supabase
      .from('organizations')
      .select('id, name, slug, subdomain')
      .or(`slug.eq.${first},subdomain.eq.${first}`)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (orgBySlug && orgBySlug.id) {
      response.cookies.set('x-organization-id', String(orgBySlug.id))
      response.cookies.set('x-organization-name', String(orgBySlug.name || ''))
      response.cookies.set('x-organization-slug', String(orgBySlug.slug || first))

      // Rewrite path removing the slug segment; fallback to /home if empty
      const rest = segments.slice(1)
      url.pathname = '/' + (rest.length ? rest.join('/') : 'home')
      return NextResponse.rewrite(url, { request })
    }
  } catch {
    // Silent: keep original response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

