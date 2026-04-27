import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClientLayout from './DashboardClientLayout';

export const metadata: Metadata = {
  title: 'Dashboard - MiPOS',
  description: 'Panel de control de MiPOS. Gestiona tu negocio de forma eficiente.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin?returnUrl=/dashboard');
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
