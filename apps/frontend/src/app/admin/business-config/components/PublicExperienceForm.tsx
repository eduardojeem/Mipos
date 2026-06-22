'use client'

import {
  AlertCircle,
  CalendarPlus,
  LayoutTemplate,
  Megaphone,
  Scissors,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { buildDefaultPublicSite, defaultBusinessConfig, type BusinessConfig } from '@/types/business-config'
import { useVertical } from '@/app/dashboard/settings/hooks/useVertical'
import type { BusinessVertical } from '@/config/verticals'

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
  verticals?: BusinessVertical[]
}> = [
  { key: 'featuredCategoriesTitle', label: 'Titulo de categorias', verticals: ['RETAIL'] },
  { key: 'featuredCategoriesDescription', label: 'Descripcion de categorias', multiline: true, verticals: ['RETAIL'] },
  { key: 'featuredProductsTitle', label: 'Titulo de productos destacados' },
  { key: 'featuredProductsDescription', label: 'Descripcion de productos destacados', multiline: true },
  { key: 'offersTitle', label: 'Titulo de ofertas de productos' },
  { key: 'offersDescription', label: 'Descripcion de ofertas de productos', multiline: true },
  { key: 'catalogTitle', label: 'Titulo del catalogo de productos' },
  { key: 'catalogDescription', label: 'Descripcion del catalogo de productos', multiline: true },
  { key: 'orderTrackingTitle', label: 'Titulo de seguimiento de pedidos', verticals: ['RETAIL'] },
  { key: 'orderTrackingDescription', label: 'Descripcion de seguimiento de pedidos', multiline: true, verticals: ['RETAIL'] },
  { key: 'contactTitle', label: 'Titulo de contacto' },
  { key: 'contactDescription', label: 'Descripcion de contacto', multiline: true },
]

type ModuleField = { key: keyof PublicSections; label: string; description: string }

const COMMON_MODULE_FIELDS: ModuleField[] = [
  { key: 'showContactInfo', label: 'Contacto', description: 'Publica telefono, email y soporte.' },
  { key: 'showLocation', label: 'Ubicacion', description: 'Activa mapa, direccion y referencia.' },
  { key: 'showBusinessHours', label: 'Horarios', description: 'Publica horarios de atencion.' },
  { key: 'showSocialLinks', label: 'Redes', description: 'Muestra canales externos del negocio.' },
  { key: 'showHeroStats', label: 'Metricas del hero', description: 'Activa cifras y senales de confianza.' },
]

const RETAIL_MODULE_FIELDS: ModuleField[] = [
  { key: 'showCatalog', label: 'Catalogo principal', description: 'Expone el listado principal de productos.' },
  { key: 'showCategories', label: 'Categorias', description: 'Agrupa el catalogo por familias.' },
  { key: 'showFeaturedProducts', label: 'Productos destacados', description: 'Resalta seleccion curada.' },
  { key: 'showOffers', label: 'Ofertas', description: 'Muestra promociones y descuentos visibles.' },
  { key: 'showCart', label: 'Carrito', description: 'Permite compra directa desde la web.' },
  { key: 'showOrderTracking', label: 'Seguimiento de pedidos', description: 'Expone consulta publica de pedidos.' },
]

const BARBERSHOP_PRODUCT_MODULE_FIELDS: ModuleField[] = [
  { key: 'showFeaturedProducts', label: 'Productos recomendados', description: 'Muestra productos como venta secundaria.' },
  { key: 'showCatalog', label: 'Catalogo de productos', description: 'Permite navegar productos sin desplazar servicios.' },
  { key: 'showOffers', label: 'Ofertas de productos', description: 'Publica promociones de productos de mostrador.' },
  { key: 'showCart', label: 'Carrito de productos', description: 'Permite compra directa de productos si aplica.' },
]

const BARBERSHOP_PRIMARY_MODULES = [
  {
    icon: CalendarPlus,
    title: 'Reserva de turnos',
    description: 'Visible como CTA principal cuando existen servicios y profesionales activos.',
  },
  {
    icon: Scissors,
    title: 'Servicios',
    description: 'Se muestran separados del catalogo para que el cliente elija que quiere reservar.',
  },
  {
    icon: Users,
    title: 'Profesionales',
    description: 'Se listan como equipo disponible para reservar sin mezclarlos con productos.',
  },
]

export function PublicExperienceForm({ config, onUpdate }: PublicExperienceFormProps) {
  const { vertical } = useVertical()
  const isBarbershop = vertical === 'BARBERSHOP'
  const publicSiteDefaults = buildDefaultPublicSite(vertical)
  const sections = {
    ...publicSiteDefaults.sections,
    ...(config.publicSite?.sections || {}),
  }
  const content = {
    ...publicSiteDefaults.content,
    ...(config.publicSite?.content || {}),
  }
  const hasAddress = Boolean(config.address?.street || config.address?.city || config.address?.department)
  const hasSocialLinks = Object.values(config.socialMedia || {}).some(Boolean)
  const moduleWarnings: Partial<Record<keyof PublicSections, string>> = {
    showContactInfo: !config.contact?.phone?.trim()
      ? 'Activo, pero falta telefono publico en Contacto y legal.'
      : undefined,
    showLocation: !hasAddress
      ? 'Activo, pero falta direccion publica en Contacto y legal.'
      : undefined,
    showBusinessHours: !config.businessHours?.some((hour) => hour.trim())
      ? 'Activo, pero no hay horarios cargados.'
      : undefined,
    showSocialLinks: !hasSocialLinks
      ? 'Activo, pero no hay redes publicas cargadas.'
      : undefined,
  }
  const verticalContext = isBarbershop
    ? {
        icon: Scissors,
        title: 'Configuracion publica para Barberia / Peluqueria',
        description:
          'La pagina prioriza reservas, servicios y profesionales. Los productos siguen disponibles como venta secundaria.',
        primaryCta: 'Reservar turno',
        secondaryCta: 'Ver productos',
        badge: 'Reservas online',
      }
    : {
        icon: Store,
        title: 'Configuracion publica para Tienda / Retail',
        description:
          'La pagina prioriza catalogo, productos, ofertas, carrito y seguimiento de pedidos.',
        primaryCta: 'Ver catalogo',
        secondaryCta: 'Ver ofertas',
        badge: 'Tienda online',
      }
  const ContextIcon = verticalContext.icon
  const commercialModuleFields = isBarbershop ? BARBERSHOP_PRODUCT_MODULE_FIELDS : RETAIL_MODULE_FIELDS
  const visibleContentFields = CONTENT_FIELDS.filter((field) => !field.verticals || field.verticals.includes(vertical))

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

  const renderModuleFields = (items: ModuleField[]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.key} className="rounded-2xl border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              checked={Boolean(sections[item.key])}
              onCheckedChange={(checked) => updateSections(item.key, checked)}
            />
          </div>
          {sections[item.key] && moduleWarnings[item.key] ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{moduleWarnings[item.key]}</span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ContextIcon className="h-5 w-5" />
            {verticalContext.title}
          </CardTitle>
          <CardDescription>{verticalContext.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Flujo principal</p>
            <p className="mt-2 text-sm font-semibold">{isBarbershop ? 'Turnos, servicios y profesionales' : 'Catalogo, productos y pedidos'}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">CTA recomendado</p>
            <p className="mt-2 text-sm font-semibold">{verticalContext.primaryCta}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contenido secundario</p>
            <p className="mt-2 text-sm font-semibold">{isBarbershop ? 'Productos y ofertas' : 'Contacto y confianza'}</p>
          </div>
        </CardContent>
      </Card>

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
              placeholder={isBarbershop ? 'Reserva tu turno online esta semana...' : 'Entrega gratis en compras superiores a...'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroBadge">Badge del hero</Label>
            <Input
              id="heroBadge"
              value={content.heroBadge || ''}
              onChange={(event) => updateContent('heroBadge', event.target.value)}
              placeholder={verticalContext.badge}
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
              placeholder={isBarbershop ? 'Ej: Reserva corte, barba o color con tu profesional favorito.' : 'Explica la propuesta de valor del negocio en una sola idea clara.'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroPrimaryCtaLabel">CTA principal</Label>
            <Input
              id="heroPrimaryCtaLabel"
              value={content.heroPrimaryCtaLabel || ''}
              onChange={(event) => updateContent('heroPrimaryCtaLabel', event.target.value)}
              placeholder={verticalContext.primaryCta}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroSecondaryCtaLabel">CTA secundario</Label>
            <Input
              id="heroSecondaryCtaLabel"
              value={content.heroSecondaryCtaLabel || ''}
              onChange={(event) => updateContent('heroSecondaryCtaLabel', event.target.value)}
              placeholder={verticalContext.secondaryCta}
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
            Activa o desactiva bloques visibles segun el tipo de pagina publica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isBarbershop ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Bloques principales de barberia</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {BARBERSHOP_PRIMARY_MODULES.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-2xl border bg-primary/5 p-4">
                      <Icon className="h-5 w-5 text-primary" />
                      <p className="mt-3 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Estos bloques usan los datos de Servicios, Staff y Agenda. No se mezclan con el catalogo de productos.
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{isBarbershop ? 'Productos como venta secundaria' : 'Bloques comerciales de tienda'}</p>
            </div>
            {renderModuleFields(commercialModuleFields)}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Bloques comunes</p>
            </div>
            {renderModuleFields(COMMON_MODULE_FIELDS)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Copy por seccion
          </CardTitle>
          <CardDescription>
            Ajusta titulos y descripciones visibles para el rubro actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {visibleContentFields.map((field) => (
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
