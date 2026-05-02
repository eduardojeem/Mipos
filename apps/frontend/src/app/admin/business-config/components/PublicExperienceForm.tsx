'use client'

import { LayoutTemplate, Megaphone, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { defaultBusinessConfig, type BusinessConfig } from '@/types/business-config'

interface PublicExperienceFormProps {
  config: BusinessConfig
  onUpdate: (updates: Partial<BusinessConfig>) => void
}

type PublicSections = NonNullable<BusinessConfig['publicSite']>['sections']
type PublicContent = NonNullable<BusinessConfig['publicSite']>['content']
type ContentKey = keyof PublicContent

const CONTENT_FIELDS: Array<{
  key: ContentKey
  label: string
  multiline?: boolean
}> = [
  { key: 'featuredCategoriesTitle', label: 'Titulo de categorias' },
  { key: 'featuredCategoriesDescription', label: 'Descripcion de categorias', multiline: true },
  { key: 'featuredProductsTitle', label: 'Titulo de productos' },
  { key: 'featuredProductsDescription', label: 'Descripcion de productos', multiline: true },
  { key: 'offersTitle', label: 'Titulo de ofertas' },
  { key: 'offersDescription', label: 'Descripcion de ofertas', multiline: true },
  { key: 'catalogTitle', label: 'Titulo del catalogo' },
  { key: 'catalogDescription', label: 'Descripcion del catalogo', multiline: true },
  { key: 'orderTrackingTitle', label: 'Titulo de seguimiento' },
  { key: 'orderTrackingDescription', label: 'Descripcion de seguimiento', multiline: true },
  { key: 'contactTitle', label: 'Titulo de contacto' },
  { key: 'contactDescription', label: 'Descripcion de contacto', multiline: true },
]

const MODULE_FIELDS: Array<{ key: keyof PublicSections; label: string; description: string }> = [
  { key: 'showOffers', label: 'Ofertas', description: 'Muestra promociones y descuentos visibles.' },
  { key: 'showCatalog', label: 'Catalogo', description: 'Expone el listado principal de productos.' },
  { key: 'showCategories', label: 'Categorias', description: 'Agrupa el catalogo por familias.' },
  { key: 'showFeaturedProducts', label: 'Productos destacados', description: 'Resalta seleccion curada.' },
  { key: 'showContactInfo', label: 'Contacto', description: 'Publica telefono, email y soporte.' },
  { key: 'showLocation', label: 'Ubicacion', description: 'Activa mapa, direccion y referencia.' },
  { key: 'showCart', label: 'Carrito', description: 'Permite compra directa desde la web.' },
  { key: 'showOrderTracking', label: 'Seguimiento', description: 'Expone consulta publica de pedidos.' },
  { key: 'showBusinessHours', label: 'Horarios', description: 'Publica horarios de atencion.' },
  { key: 'showSocialLinks', label: 'Redes', description: 'Muestra canales externos del negocio.' },
  { key: 'showHeroStats', label: 'Metricas del hero', description: 'Activa cifras y senales de confianza.' },
]

export function PublicExperienceForm({ config, onUpdate }: PublicExperienceFormProps) {
  const sections = {
    ...defaultBusinessConfig.publicSite!.sections,
    ...(config.publicSite?.sections || {}),
  }
  const content = {
    ...defaultBusinessConfig.publicSite!.content,
    ...(config.publicSite?.content || {}),
  }

  const updateSections = (key: keyof PublicSections, value: boolean) => {
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
    })
  }

  const updateContent = (key: ContentKey, value: string) => {
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
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Hero y mensaje principal
          </CardTitle>
          <CardDescription>
            Controla el primer impacto comercial de la pagina publica.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="announcementText">Barra superior</Label>
            <Input
              id="announcementText"
              value={content.announcementText || ''}
              onChange={(event) => updateContent('announcementText', event.target.value)}
              placeholder="Entrega gratis en compras superiores a..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroBadge">Badge del hero</Label>
            <Input
              id="heroBadge"
              value={content.heroBadge || ''}
              onChange={(event) => updateContent('heroBadge', event.target.value)}
              placeholder="Tienda oficial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroImageUrl">Imagen principal</Label>
            <Input
              id="heroImageUrl"
              value={content.heroImageUrl || ''}
              onChange={(event) => updateContent('heroImageUrl', event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="heroSecondaryText">Texto secundario</Label>
            <Textarea
              id="heroSecondaryText"
              value={content.heroSecondaryText || ''}
              onChange={(event) => updateContent('heroSecondaryText', event.target.value)}
              rows={3}
              placeholder="Explica la propuesta de valor del negocio en una sola idea clara."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroPrimaryCtaLabel">CTA principal</Label>
            <Input
              id="heroPrimaryCtaLabel"
              value={content.heroPrimaryCtaLabel || ''}
              onChange={(event) => updateContent('heroPrimaryCtaLabel', event.target.value)}
              placeholder="Ver catalogo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroSecondaryCtaLabel">CTA secundario</Label>
            <Input
              id="heroSecondaryCtaLabel"
              value={content.heroSecondaryCtaLabel || ''}
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
            Modulos visibles
          </CardTitle>
          <CardDescription>
            Activa o desactiva bloques completos sin tocar codigo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {MODULE_FIELDS.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div className="pr-4">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={Boolean(sections[item.key])}
                onCheckedChange={(checked) => updateSections(item.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Copy por seccion
          </CardTitle>
          <CardDescription>
            Ajusta titulos y descripciones del catalogo, ofertas, seguimiento y contacto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {CONTENT_FIELDS.map((field) => (
            <div key={field.key} className={`space-y-2 ${field.multiline ? '' : ''}`}>
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.multiline ? (
                <Textarea
                  id={field.key}
                  value={content[field.key] || ''}
                  onChange={(event) => updateContent(field.key, event.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  id={field.key}
                  value={content[field.key] || ''}
                  onChange={(event) => updateContent(field.key, event.target.value)}
                />
              )}
            </div>
          ))}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="footerHeadline">Headline del footer</Label>
            <Textarea
              id="footerHeadline"
              value={content.footerHeadline || ''}
              onChange={(event) => updateContent('footerHeadline', event.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="supportMessage">Mensaje de soporte</Label>
            <Textarea
              id="supportMessage"
              value={content.supportMessage || ''}
              onChange={(event) => updateContent('supportMessage', event.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PublicExperienceForm
