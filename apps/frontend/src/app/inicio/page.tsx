import { Suspense } from 'react';
import { getLandingContent } from '@/lib/web-content/server';
import InicioPageClient from './InicioPageClient';

export default async function InicioPage() {
  const landingContent = await getLandingContent();

  return (
    <Suspense>
      <InicioPageClient landingContent={landingContent} />
    </Suspense>
  );
}
