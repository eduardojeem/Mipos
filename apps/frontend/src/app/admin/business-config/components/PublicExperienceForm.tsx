'use client';

import { LayoutTemplate, Megaphone, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { defaultBusinessConfig, type BusinessConfig } from '@/types/business-config';

interface PublicExperienceFormProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

export function PublicExperienceForm({ config, onUpdate }: PublicExperienceFormProps) {
  const sections = {
    ...defaultBusinessConfig.publicSite!.sections,
    ...(config.publicSite?.sections || {}),
  };
  const content = {
    ...defaultBusinessConfig.publicSite!.content,
    ...(config.publicSite?.content || {}),
  };
  type ContentKey = keyof NonNullable<BusinessConfig['publicSite']>['content'];

  const updateSections = (key: keyof NonNullable<BusinessConfig['publicSite']>['sections'], value: boolean) => {
    onUpdate({
      publicSite: {
        sections: {
          ...sections,
          [key]: value,
        },
        content: {
          ...content,
        },
      },
    });
  };

  const updateContent = (key: keyof NonNullable<BusinessConfig['publicSite']>['content'], value: string) => {
    onUpdate({
      publicSite: {
        sections: {
          ...sections,
        },
        content: {
          ...content,
          [key]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Hero y Mensaje Comercial
          </CardTitle>
          <CardDescription>
            Controla el mensaje principal, CTAs y recursos visuales del subdominio público.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="announcementText">Barra de anuncio</Label>
            <Input
              id="announcementText"
              value={content?.announcementText || ''}
              onChange={(event) => updateContent('announcementText', event.target.value)}
              placeholder="Entrega gratis en compras superiores a..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroBadge">Badge del hero</Label>
            <Input
              id="heroBadge"
              value={content?.heroBadge || ''}
              onChange={(event) => updateContent('heroBadge', event.target.value)}
              placeholder="Tienda oficial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroImageUrl">Imagen principal del hero</Label>
            <Input
              id="heroImageUrl"
              value={content?.heroImageUrl || ''}
              onChange={(event) => updateContent('heroImageUrl', event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="heroSecondaryText">Texto secundario del hero</Label>
            <Textarea
              id="heroSecondaryText"
              value={content?.heroSecondaryText || ''}
              onChange={(event) => updateContent('heroSecondaryText', event.target.value)}
              rows={3}
              placeholder="Explica brevemente la propuesta del tenant público."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroPrimaryCtaLabel">CTA principal</Label>
            <Input
              id="heroPrimaryCtaLabel"
              value={content?.heroPrimaryCtaLabel || ''}
              onChange={(event) => updateContent('heroPrimaryCtaLabel', event.target.value)}
              placeholder="Ver catalogo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroSecondaryCtaLabel">CTA secundario</Label>
            <Input
              id="heroSecondaryCtaLabel"
              value={content?.heroSecondaryCtaLabel || ''}
              onChange={(event) => updateContent('heroSecondaryCtaLabel', event.target.value)}
              placeholder="Ver ofertas"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Visibilidad del Frontend Público
          </CardTitle>
          <CardDescription>
            Activa o desactiva módulos completos sin tocar código.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            ['showOffers', 'Mostrar ofertas'],
            ['showCatalog', 'Mostrar catalogo'],
            ['showCategories', 'Mostrar categorias'],
            ['showFeaturedProducts', 'Mostrar productos destacados'],
            ['showContactInfo', 'Mostrar contacto'],
            ['showLocation', 'Mostrar ubicacion'],
            ['showCart', 'Mostrar carrito'],
            ['showOrderTracking', 'Mostrar seguimiento'],
            ['showBusinessHours', 'Mostrar horarios'],
            ['showSocialLinks', 'Mostrar redes'],
            ['showHeroStats', 'Mostrar métricas del hero'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">Impacta directamente en el subdominio público.</p>
              </div>
              <Switch
                checked={Boolean(sections?.[key as keyof typeof sections])}
                onCheckedChange={(checked) => updateSections(key as keyof NonNullable<BusinessConfig['publicSite']>['sections'], checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Copy por Sección
          </CardTitle>
          <CardDescription>
            Ajusta títulos y descripciones del catálogo, ofertas, contacto y footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            ['featuredCategoriesTitle', 'Título categorías'],
            ['featuredCategoriesDescription', 'Descripción categorías'],
            ['featuredProductsTitle', 'Título productos'],
            ['featuredProductsDescription', 'Descripción productos'],
            ['offersTitle', 'Título ofertas'],
            ['offersDescription', 'Descripción ofertas'],
            ['catalogTitle', 'Título catálogo'],
            ['catalogDescription', 'Descripción catálogo'],
            ['orderTrackingTitle', 'Título seguimiento'],
            ['orderTrackingDescription', 'Descripción seguimiento'],
            ['contactTitle', 'Título contacto'],
            ['contactDescription', 'Descripción contacto'],
          ].map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              {String(key).toLowerCase().includes('description') ? (
                <Textarea
                  id={key}
                  value={content?.[key as ContentKey] || ''}
                  onChange={(event) => updateContent(key as ContentKey, event.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  id={key}
                  value={content?.[key as ContentKey] || ''}
                  onChange={(event) => updateContent(key as ContentKey, event.target.value)}
                />
              )}
            </div>
          ))}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="footerHeadline">Headline del footer</Label>
            <Textarea
              id="footerHeadline"
              value={content?.footerHeadline || ''}
              onChange={(event) => updateContent('footerHeadline', event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="supportMessage">Mensaje de soporte</Label>
            <Textarea
              id="supportMessage"
              value={content?.supportMessage || ''}
              onChange={(event) => updateContent('supportMessage', event.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PublicExperienceForm;
