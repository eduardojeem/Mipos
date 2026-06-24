import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { LegalBody } from '@/components/legal/LegalBody';
import { getLegalContent } from '@/lib/web-content/server';
import { PLATFORM_NAME } from '@/lib/legal/terms';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: `Cómo ${PLATFORM_NAME} recopila, usa y protege tus datos personales.`,
};

export default async function PrivacyPage() {
  const legal = await getLegalContent();
  return (
    <LegalLayout title={legal.privacyTitle} version={legal.version} lastUpdated={legal.lastUpdated}>
      <LegalBody text={legal.privacyBody} />
    </LegalLayout>
  );
}
