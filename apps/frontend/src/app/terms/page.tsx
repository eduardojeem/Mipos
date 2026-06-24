import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { LegalBody } from '@/components/legal/LegalBody';
import { getLegalContent } from '@/lib/web-content/server';
import { PLATFORM_NAME } from '@/lib/legal/terms';

export const metadata: Metadata = {
  title: 'Términos de Servicio',
  description: `Términos y condiciones de uso de la plataforma ${PLATFORM_NAME}.`,
};

export default async function TermsPage() {
  const legal = await getLegalContent();
  return (
    <LegalLayout title={legal.termsTitle} version={legal.version} lastUpdated={legal.lastUpdated}>
      <LegalBody text={legal.termsBody} />
    </LegalLayout>
  );
}
