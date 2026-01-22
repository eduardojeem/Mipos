import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is already authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen w-full bg-transparent flex items-center justify-center">
      {children}
    </div>
  );
}