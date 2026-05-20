import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import SuperAdminClientLayout from './SuperAdminClientLayout';

export const metadata: Metadata = {
  title: 'Super Admin - MiPOS | Panel de Administración del Sistema',
  description: 'Panel de administración del sistema MiPOS. Gestión de organizaciones, usuarios, planes y configuración global. Acceso restringido solo para super administradores.',
  keywords: [
    'super admin',
    'administración sistema',
    'panel admin',
    'gestión organizaciones',
    'gestión usuarios',
    'configuración global',
    'MiPOS admin',
  ],
  authors: [
    { name: 'MiPOS Team' },
  ],
  creator: 'MiPOS',
  publisher: 'MiPOS',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  category: 'technology',
  classification: 'Business Software - Admin Panel',
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  // SECURITY: verificar en este orden de prioridad:
  // 1. user_roles table (RBAC — fuente de verdad)
  // 2. users.role column (legacy, confiable porque está en DB)
  // 3. app_metadata.role (server-managed, no modificable por el usuario)
  // NUNCA user_metadata.role (el usuario puede auto-asignarlo)

  let adminClient: any = null;
  try { adminClient = await createAdminClient(); } catch {}

  if (adminClient) {
    // 1. user_roles
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true);
    if (userRoles?.some((ur: any) => ur.role?.name === 'SUPER_ADMIN')) {
      return <SuperAdminClientLayout>{children}</SuperAdminClientLayout>;
    }

    // 2. users.role
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (userData?.role === 'SUPER_ADMIN') {
      return <SuperAdminClientLayout>{children}</SuperAdminClientLayout>;
    }
  }

  // 3. app_metadata (server-managed)
  const appRole = (user.app_metadata as any)?.role?.toUpperCase();
  if (appRole === 'SUPER_ADMIN') {
    return <SuperAdminClientLayout>{children}</SuperAdminClientLayout>;
  }

  redirect('/dashboard');
}
