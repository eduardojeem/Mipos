import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    data: { session },
  } = await supabase.auth.getSession();

  // Verificar autenticación
  if (!session) {
    redirect('/auth/signin');
  }

  return <SuperAdminClientLayout>{children}</SuperAdminClientLayout>;
}
