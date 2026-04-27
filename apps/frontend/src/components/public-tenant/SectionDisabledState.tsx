import Link from 'next/link';
import { Home, MessageCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildWhatsAppHref } from '@/lib/public-site/tenant-public-config';
import type { BusinessConfig } from '@/types/business-config';

interface SectionDisabledStateProps {
  config: BusinessConfig;
  title: string;
  description: string;
  homeHref?: string;
}

export function SectionDisabledState({
  config,
  title,
  description,
  homeHref = '/home',
}: SectionDisabledStateProps) {
  const whatsappHref = buildWhatsAppHref(config, `Hola, necesito ayuda con ${title.toLowerCase()}.`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/90 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.5)]">
        <CardHeader className="space-y-4 bg-slate-50/90">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl text-slate-950">{title}</CardTitle>
            <CardDescription className="text-base leading-7 text-slate-600">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 p-6">
          <Button asChild className="rounded-full">
            <Link href={homeHref}>
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>

          {whatsappHref ? (
            <Button asChild variant="outline" className="rounded-full">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Contactar al negocio
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default SectionDisabledState;
