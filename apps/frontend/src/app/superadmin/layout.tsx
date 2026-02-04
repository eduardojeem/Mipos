import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
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
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verificar autenticación
  if (!user) {
    redirect('/auth/signin');
  }

  // Verificar rol de Super Admin (Server-Side)
  // 1. Check Metadata (Fastest)
  const metadataRole = (user.user_metadata as any)?.role?.toUpperCase();
  if (metadataRole === 'SUPER_ADMIN') {
    return <SuperAdminClientLayout>{children}</SuperAdminClientLayout>;
  }

  // 2. Check DB via Admin Client (Most Robust)
  const adminClient = await createAdminClient();
  
  // Check user_roles table
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);
    
  const hasRole = userRoles?.some((ur: any) => ur.role?.name === 'SUPER_ADMIN');
  
  if (hasRole) {
    return <SuperAdminClientLayout>{children}</SuperAdminClientLayout>;
  }

  // 3. Check users table (Legacy/Fallback)
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role === 'SUPER_ADMIN') {
    return <SuperAdminClientLayout>{children}</SuperAdminClientLayout>;
  }

  // Si no es Super Admin, redirigir
  redirect('/dashboard');
}
