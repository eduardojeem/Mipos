import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayoutWrapper } from '@/components/admin/admin-layout-wrapper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/signin')
  }

  // Verificar rol de administrador con fallback a metadata cuando tabla 'users' no exista
  let profile: any = null
  try {
    const { data: dbProfile, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (!dbError) {
      profile = dbProfile
    }
  } catch (e) {
    // no-op: si la tabla no existe o falla, usaremos metadata
  }

  // Usar rol de metadata solo si existe; nunca asignar ADMIN por defecto
  const rawRole = (session.user as any)?.user_metadata?.role
  const userRoleFromSession = typeof rawRole === 'string' && rawRole.trim() ? rawRole.toUpperCase() : 'VIEWER'
  const userRole = String((profile?.role || userRoleFromSession)).toUpperCase()

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    redirect('/dashboard')
  }

  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
}
