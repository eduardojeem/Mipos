import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AdminLayoutWrapper } from '@/components/admin/admin-layout-wrapper'

export const metadata: Metadata = {
  title: 'Administracion - MiPOS',
  description: 'Panel de administracion de MiPOS. Acceso restringido.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware already validates admin role + plan access for /admin routes.
  // Here we only need to confirm the user session is still valid.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin?returnUrl=/admin')
  }

  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
}
