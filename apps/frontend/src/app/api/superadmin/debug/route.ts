/**
 * Endpoint de diagnóstico para superadmin — SOLO para desarrollo/debugging.
 * Retorna información sobre el estado de autenticación y acceso a la DB.
 * 
 * IMPORTANTE: Este endpoint NO requiere ser super admin para acceder,
 * pero solo devuelve información de diagnóstico (no datos sensibles).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
    }
  }

  // 1. Verificar sesión del usuario
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    result.auth = {
      hasUser: !!user,
      userId: user?.id || null,
      email: user?.email || null,
      authError: authError?.message || null,
      appMetadataRole: (user?.app_metadata as any)?.role || null,
      userMetadataRole: (user?.user_metadata as any)?.role || null,
    }

    if (user) {
      // 2. Verificar tabla user_roles con admin client
      try {
        const adminClient = await createAdminClient()
        const { data: userRoles, error: rolesError } = await adminClient
          .from('user_roles')
          .select('role:roles(name), is_active, organization_id')
          .eq('user_id', user.id)

        result.userRoles = {
          data: userRoles,
          error: rolesError?.message || null,
          count: userRoles?.length || 0,
        }
      } catch (e) {
        result.userRoles = { error: String(e) }
      }

      // 3. Verificar tabla users con admin client
      try {
        const adminClient = await createAdminClient()
        const { data: userData, error: userError } = await adminClient
          .from('users')
          .select('id, email, role, organization_id')
          .eq('id', user.id)
          .single()

        result.usersTable = {
          data: userData,
          error: userError?.message || null,
        }
      } catch (e) {
        result.usersTable = { error: String(e) }
      }

      // 4. Probar query de usuarios (la misma que usa el endpoint real)
      try {
        const adminClient = await createAdminClient()
        const { data, error, count } = await adminClient
          .from('users')
          .select('id,email,full_name,role,organization_id,created_at,last_login', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, 4)

        result.usersQuery = {
          success: !error,
          count,
          sampleCount: data?.length || 0,
          error: error?.message || null,
          errorCode: (error as any)?.code || null,
          errorDetails: (error as any)?.details || null,
          errorHint: (error as any)?.hint || null,
        }
      } catch (e) {
        result.usersQuery = { error: String(e) }
      }
    }
  } catch (e) {
    result.authError = String(e)
  }

  return NextResponse.json(result, { status: 200 })
}
