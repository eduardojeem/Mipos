import type { Metadata } from 'next';
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
