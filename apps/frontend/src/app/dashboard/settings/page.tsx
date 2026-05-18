'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SettingsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams?.get('tab');
    const target = tab ? `/admin/settings?tab=${tab}` : '/admin/settings';
    router.replace(target);
  }, [router, searchParams]);

  return null;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsRedirectInner />
    </Suspense>
  );
}
