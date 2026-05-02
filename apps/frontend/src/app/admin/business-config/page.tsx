'use client'

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  Link2,
  RotateCcw,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useBusinessConfig } from '@/contexts/BusinessConfigContext'
import type { BusinessConfig } from '@/types/business-config'
import { useAuth } from '@/hooks/use-auth'
import { useAllOrganizations } from '@/hooks/use-all-organizations'
import { useCompanyAccess } from '@/hooks/use-company-access'
import { useUserOrganizations, type Organization } from '@/hooks/use-user-organizations'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { buildTenantPublicBaseUrl } from '@/lib/domain/host-context'
import { getCanonicalPlanDisplayName, normalizePlanSlug } from '@/lib/plan-catalog'

const BusinessInfoForm = lazy(() => import('./components/BusinessInfoForm').then((m) => ({ default: m.BusinessInfoForm })))
const DomainSettingsForm = lazy(() => import('./components/DomainSettingsForm').then((m) => ({ default: m.DomainSettingsForm })))
const LegalInfoForm = lazy(() => import('./components/LegalInfoForm').then((m) => ({ default: m.LegalInfoForm })))
const ContactForm = lazy(() => import('./components/ContactForm').then((m) => ({ default: m.ContactForm })))
const BrandingForm = lazy(() => import('./components/BrandingForm').then((m) => ({ default: m.BrandingForm })))
const PublicExperienceForm = lazy(() => import('./components/PublicExperienceForm').then((m) => ({ default: m.PublicExperienceForm })))
const StoreSettingsForm = lazy(() => import('./components/StoreSettingsForm').then((m) => ({ default: m.StoreSettingsForm })))
const CarouselEditor = lazy(() => import('./components/CarouselEditor').then((m) => ({ default: m.CarouselEditor })))
const ConfigPreview = lazy(() => import('./components/ConfigPreview').then((m) => ({ default: m.ConfigPreview })))
const OrganizationSelectorForConfig = lazy(() => import('./components/OrganizationSelectorForConfig').then((m) => ({ default: m.OrganizationSelectorForConfig })))

type TabConfig = {
  id: string
  label: string
  icon: typeof Building2
  description: string
}

type LaunchCheck = {
  id: string
  label: string
  description: string
  done: boolean
}

const TAB_CONFIG: TabConfig[] = [
  {
    id: 'content',
    label: 'Contenido',
    icon: Sparkles,
    description: 'Mensaje principal, copies publicos y carrusel de la pagina del negocio.',
  },
  {
    id: 'brand',
    label: 'Marca',
    icon: Palette,
    description: 'Colores, logo y personalidad visual de la experiencia publica.',
  },
  {
    id: 'contact',
    label: 'Contacto y legal',
    icon: Phone,
    description: 'Contacto, direccion, datos fiscales y documentos visibles al cliente.',
  },
  {
    id: 'commerce',
    label: 'Comercio',
    icon: Store,
    description: 'Moneda, impuestos, envios y reglas visibles para clientes.',
  },
  {
    id: 'publication',
    label: 'Publicacion',
    icon: Globe,
    description: 'Ruta publica, accesos directos y salida visible del negocio.',
  },
  {
    id: 'preview',
    label: 'Revision',
    icon: Eye,
    description: 'Resumen final para validar antes de publicar cambios.',
  },
]

function mergeConfig(base: BusinessConfig, updates: Partial<BusinessConfig>): BusinessConfig {
  const merged = { ...base }

  for (const key of Object.keys(updates) as (keyof BusinessConfig)[]) {
    const value = updates[key]
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      ;(merged as any)[key] = {
        ...((base as any)[key] || {}),
        ...(value as object),
      }
    } else {
      ;(merged as any)[key] = value
    }
  }

  return merged
}

function getTabHealth(config: BusinessConfig, tabId: string): 'complete' | 'partial' | 'empty' {
  switch (tabId) {
    case 'content': {
      const completed = Boolean(config.businessName && config.heroTitle && config.heroDescription)
      const partial = Boolean(
        config.businessName ||
        config.heroTitle ||
        config.heroDescription ||
        config.publicSite?.content?.heroSecondaryText ||
        config.carousel?.images?.length
      )
      return completed ? 'complete' : partial ? 'partial' : 'empty'
    }
    case 'brand':
      return config.branding?.primaryColor && config.branding?.logo ? 'complete' : config.branding?.primaryColor ? 'partial' : 'empty'
    case 'contact': {
      const completed = Boolean(
        config.contact?.phone &&
        config.contact?.email &&
        config.address?.street &&
        config.address?.city &&
        config.legalInfo?.businessType
      )
      const partial = Boolean(
        config.contact?.phone ||
        config.contact?.email ||
        config.address?.street ||
        config.legalInfo?.ruc
      )
      return completed ? 'complete' : partial ? 'partial' : 'empty'
    }
    case 'commerce':
      return config.storeSettings?.currency && config.storeSettings?.currencySymbol ? 'complete' : 'empty'
    case 'publication':
      return config.publicSite?.sections?.showCatalog || config.publicSite?.sections?.showOffers ? 'partial' : 'empty'
    case 'preview':
      return 'complete'
    default:
      return 'empty'
  }
}

export default function BusinessConfigPage() {
  const { config, updateConfig, loading, error, resetConfig, persisted, organizationId, organizationName } = useBusinessConfig()
  const { user } = useAuth()
  const { selectedOrganization, selectOrganization } = useUserOrganizations(user?.id)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const allOrganizationsQuery = useAllOrganizations({ enabled: isSuperAdmin })
  const { toast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('content')
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [localChanges, setLocalChanges] = useState<Partial<BusinessConfig>>({})
  const previousOrganizationId = useRef<string | null>(null)
  const accessQuery = useCompanyAccess({
    permission: COMPANY_PERMISSIONS.MANAGE_COMPANY,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
    companyId: organizationId || undefined,
    enabled: Boolean(organizationId) || isSuperAdmin,
  })

  const accessContext = accessQuery.data?.context || null
  const currentPlan = normalizePlanSlug(accessContext?.plan || selectedOrganization?.subscription_plan || 'free')
  const canUseCustomBranding =
    isSuperAdmin || Boolean(accessContext?.features?.includes(COMPANY_FEATURE_KEYS.CUSTOM_BRANDING))

  const availableTabs = useMemo(
    () =>
      TAB_CONFIG.filter((tab) => {
        if (tab.id === 'brand' && !canUseCustomBranding) return false
        return true
      }),
    [canUseCustomBranding]
  )
  const currentConfig = useMemo(() => mergeConfig(config, localChanges), [config, localChanges])

  const launchChecks = useMemo<LaunchCheck[]>(() => {
    return [
      {
        id: 'brand',
        label: 'Identidad visual',
        description: 'Logo y colores principales para encabezado, footer y destacados.',
        done: Boolean(currentConfig.branding?.primaryColor && currentConfig.branding?.logo),
      },
      {
        id: 'hero',
        label: 'Mensaje principal',
        description: 'Hero completo con titulo, highlight y descripcion comercial.',
        done: Boolean(currentConfig.heroTitle && currentConfig.heroHighlight && currentConfig.heroDescription),
      },
      {
        id: 'contact',
        label: 'Datos de contacto',
        description: 'Telefono, email y direccion visibles al cliente.',
        done: Boolean(currentConfig.contact?.phone && currentConfig.contact?.email && currentConfig.address?.street),
      },
      {
        id: 'hours',
        label: 'Horarios publicados',
        description: 'Horarios consistentes para footer y seccion de contacto.',
        done: Array.isArray(currentConfig.businessHours) && currentConfig.businessHours.length > 0,
      },
      {
        id: 'commerce',
        label: 'Reglas comerciales',
        description: 'Moneda, envio gratis e impuestos listos para mostrar.',
        done: Boolean(currentConfig.storeSettings?.currency && currentConfig.storeSettings?.currencySymbol),
      },
      {
        id: 'legal',
        label: 'Legales publicos',
        description: 'Terminos o privacidad disponibles para una salida seria.',
        done: Boolean(currentConfig.legalDocuments?.termsUrl || currentConfig.legalDocuments?.privacyUrl),
      },
    ]
  }, [currentConfig])

  const publicModules = useMemo(() => ([
    { id: 'offers', label: 'Ofertas', enabled: Boolean(currentConfig.publicSite?.sections?.showOffers) },
    { id: 'catalog', label: 'Catalogo', enabled: Boolean(currentConfig.publicSite?.sections?.showCatalog) },
    { id: 'categories', label: 'Categorias', enabled: Boolean(currentConfig.publicSite?.sections?.showCategories) },
    { id: 'cart', label: 'Carrito', enabled: Boolean(currentConfig.publicSite?.sections?.showCart) },
    { id: 'tracking', label: 'Seguimiento', enabled: Boolean(currentConfig.publicSite?.sections?.showOrderTracking) },
    { id: 'contact', label: 'Contacto', enabled: Boolean(currentConfig.publicSite?.sections?.showContactInfo) },
    { id: 'location', label: 'Ubicacion', enabled: Boolean(currentConfig.publicSite?.sections?.showLocation) },
    { id: 'hours', label: 'Horarios', enabled: Boolean(currentConfig.publicSite?.sections?.showBusinessHours) },
  ]), [currentConfig])

  const readinessPercent = useMemo(() => {
    const completed = launchChecks.filter((check) => check.done).length
    return Math.round((completed / launchChecks.length) * 100)
  }, [launchChecks])

  const activeModulesCount = publicModules.filter((item) => item.enabled).length
  const warnings = launchChecks.filter((check) => !check.done)

  const publicBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    if (!selectedOrganization) return window.location.origin

    return buildTenantPublicBaseUrl(selectedOrganization, window.location.host)
  }, [selectedOrganization])

  const publicUrls = useMemo(
    () =>
      [
        { label: 'Home publica', path: '/home', icon: Globe },
        currentConfig.publicSite?.sections?.showCatalog ? { label: 'Catalogo', path: '/catalog', icon: Store } : null,
        currentConfig.publicSite?.sections?.showOffers ? { label: 'Ofertas', path: '/offers', icon: Sparkles } : null,
        currentConfig.publicSite?.sections?.showOrderTracking ? { label: 'Seguimiento', path: '/orders/track', icon: Link2 } : null,
      ]
        .filter((item): item is { label: string; path: string; icon: typeof Globe } => Boolean(item))
        .map((item) => ({
          ...item,
          url: publicBaseUrl ? `${publicBaseUrl}${item.path}` : item.path,
        })),
    [
      currentConfig.publicSite?.sections?.showCatalog,
      currentConfig.publicSite?.sections?.showOffers,
      currentConfig.publicSite?.sections?.showOrderTracking,
      publicBaseUrl,
    ]
  )

  const activeTabMeta = availableTabs.find((tab) => tab.id === activeTab) || availableTabs[0]

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'content')
    }
  }, [activeTab, availableTabs])

  useEffect(() => {
    if (previousOrganizationId.current && previousOrganizationId.current !== organizationId) {
      setLocalChanges({})
      setHasUnsavedChanges(false)
      setActiveTab('content')
    }

    previousOrganizationId.current = organizationId
  }, [organizationId])

  useEffect(() => {
    if (!accessQuery.isLoading && accessQuery.data && !accessQuery.data.allowed) {
      const timeout = window.setTimeout(() => router.replace('/admin'), 1200)
      return () => window.clearTimeout(timeout)
    }
  }, [accessQuery.data, accessQuery.isLoading, router])

  const handleConfigUpdate = useCallback((updates: Partial<BusinessConfig>) => {
    setHasUnsavedChanges(true)
    setLocalChanges((prev) => mergeConfig(prev as BusinessConfig, updates))
  }, [])

  const handleOrganizationSelection = useCallback((organization: Organization) => {
    if (hasUnsavedChanges && !window.confirm('Hay cambios sin guardar. Deseas cambiar de organizacion y descartarlos?')) {
      return
    }

    setLocalChanges({})
    setHasUnsavedChanges(false)
    selectOrganization(organization)
  }, [hasUnsavedChanges, selectOrganization])

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return

    try {
      setSaving(true)
      const result = await updateConfig({
        ...localChanges,
        updatedAt: new Date().toISOString(),
      })

      if (result.persisted) {
        setHasUnsavedChanges(false)
        setLocalChanges({})
        toast({
          title: '✓ Configuración guardada',
          description: 'Los cambios ya están activos en tu página pública.',
        })
      } else {
        toast({
          title: 'Guardado localmente',
          description: 'Se sincronizará con el servidor cuando vuelva la conexión.',
          variant: 'default',
        })
      }
    } catch {
      toast({
        title: 'Error al guardar',
        description: 'No se pudieron guardar los cambios. Intenta de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }, [hasUnsavedChanges, localChanges, toast, updateConfig])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleSave()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsavedChanges])

  const handleDiscardChanges = useCallback(() => {
    if (!hasUnsavedChanges) return
    if (!window.confirm('Se descartaran todos los cambios no guardados. Deseas continuar?')) return

    setLocalChanges({})
    setHasUnsavedChanges(false)
    toast({
      title: 'Cambios descartados',
      description: 'La configuracion volvio al ultimo estado guardado.',
    })
  }, [hasUnsavedChanges, toast])

  const handleReset = useCallback(async () => {
    if (!window.confirm('Se restaurara la configuracion por defecto. Esta accion no se puede deshacer.')) {
      return
    }

    try {
      setSaving(true)
      await resetConfig()
      setLocalChanges({})
      setHasUnsavedChanges(false)
      toast({
        title: 'Configuracion restablecida',
        description: 'La configuracion publica volvio a los valores predeterminados.',
      })
    } catch {
      toast({
        title: 'Error al restablecer',
        description: 'No se pudo restablecer la configuracion.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }, [resetConfig, toast])

  const buildPublicUrl = useCallback((path: string) => {
    if (!publicBaseUrl) return path
    return `${publicBaseUrl}${path}`
  }, [publicBaseUrl])

  const handleOpenPublicPage = useCallback((path: string) => {
    window.open(buildPublicUrl(path), '_blank', 'noopener,noreferrer')
  }, [buildPublicUrl])

  const handleCopyUrl = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(buildPublicUrl(path))
      toast({
        title: 'URL copiada',
        description: 'El enlace publico quedo copiado en el portapapeles.',
      })
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: 'Intenta nuevamente.',
        variant: 'destructive',
      })
    }
  }, [buildPublicUrl, toast])

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'content':
        return (
          <div className="space-y-6">
            <BusinessInfoForm config={currentConfig} onUpdate={handleConfigUpdate} />
            <PublicExperienceForm config={currentConfig} onUpdate={handleConfigUpdate} />
            <CarouselEditor config={currentConfig} onUpdate={handleConfigUpdate} onSave={handleSave} />
          </div>
        )
      case 'brand':
        return <BrandingForm config={currentConfig} onUpdate={handleConfigUpdate} />
      case 'contact':
        return (
          <div className="space-y-6">
            <ContactForm config={currentConfig} onUpdate={handleConfigUpdate} />
            <LegalInfoForm config={currentConfig} onUpdate={handleConfigUpdate} />
          </div>
        )
      case 'commerce':
        return <StoreSettingsForm config={currentConfig} onUpdate={handleConfigUpdate} />
      case 'publication':
        return (
          <DomainSettingsForm
            selectedOrganization={selectedOrganization}
            allowCustomDomain={canUseCustomBranding}
            planName={getCanonicalPlanDisplayName(currentPlan)}
            onUpdate={() => {
              toast({
                title: 'Publicacion actualizada',
                description: 'La configuracion publica se actualizo correctamente.',
              })
            }}
          />
        )
      case 'preview':
        return <ConfigPreview config={currentConfig} onUpdate={handleConfigUpdate} onReset={handleReset} />
      default:
        return null
    }
  }

  if (loading || accessQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando centro publico del negocio...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Card className="w-full max-w-lg border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accessQuery.data && !accessQuery.data.allowed) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <AlertCircle className="h-5 w-5" />
              Seccion no habilitada para tu plan actual
            </CardTitle>
            <CardDescription className="text-amber-100/80">
              Esta consola publica requiere acceso administrativo sobre el panel SaaS. En `Starter` podras gestionar contenido, carrusel y subdominio; en `Professional` tambien se habilitan branding avanzado y dominio personalizado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.replace('/admin/subscriptions')}>
              Ver plan y suscripcion
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Centro de publicacion
                </div>
                <CardTitle className="text-3xl tracking-tight">Publicacion del negocio</CardTitle>
                <CardDescription className="max-w-2xl text-sm">
                  Gestiona contenido, marca, comercio y salida publica del negocio desde una sola superficie. Esta vista se enfoca en lo que realmente impacta en `/home`, `/catalog` y `/offers`.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                    Cambios sin guardar
                  </Badge>
                )}
                <Badge variant="outline" className={persisted ? 'border-emerald-500/40 text-emerald-600' : 'border-sky-500/40 text-sky-600'}>
                  {persisted ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Sincronizado
                    </>
                  ) : (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Pendiente de sincronizacion
                    </>
                  )}
                </Badge>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {readinessPercent}% listo
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Empresa</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{organizationName || 'Sin seleccionar'}</p>
                <p className="mt-1 text-xs text-muted-foreground">Configuracion por tenant</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Modulos publicos</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{activeModulesCount} activos</p>
                <p className="mt-1 text-xs text-muted-foreground">Home, contacto, legales y senales comerciales</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Plan activo</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {getCanonicalPlanDisplayName(currentPlan)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {canUseCustomBranding ? 'Branding avanzado y dominio personalizado habilitados' : 'Contenido, comercio y ruta publica habilitados'}
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <Suspense fallback={<div className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">Cargando organizaciones...</div>}>
                <OrganizationSelectorForConfig
                  organizations={allOrganizationsQuery.organizations}
                  selectedOrganization={selectedOrganization}
                  loading={allOrganizationsQuery.loading}
                  error={allOrganizationsQuery.error}
                  onSelectOrganization={handleOrganizationSelection}
                />
              </Suspense>
            )}
          </CardHeader>
        </Card>

        <Card className="border-border/60 bg-background/80">
          <CardHeader>
            <CardTitle className="text-base">Accesos rapidos</CardTitle>
            <CardDescription>Abre y valida la superficie publica real sin salir de esta consola.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {publicUrls.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.path} className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyUrl(item.path)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenPublicPage(item.path)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon
                  const health = getTabHealth(currentConfig, tab.id)
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="rounded-xl border border-border/70 bg-background px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {tab.label}
                      <span
                        className={`ml-2 h-2 w-2 rounded-full ${
                          health === 'complete'
                            ? 'bg-emerald-500'
                            : health === 'partial'
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                        }`}
                      />
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={saving} onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Resetear
              </Button>
              {hasUnsavedChanges && (
                <Button variant="outline" disabled={saving} onClick={handleDiscardChanges}>
                  Descartar
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar cambios
              </Button>
            </div>
          </div>

          {activeTabMeta && (
            <Card className="border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <activeTabMeta.icon className="h-5 w-5" />
                  {activeTabMeta.label}
                </CardTitle>
                <CardDescription>{activeTabMeta.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Cargando modulo...
                    </div>
                  }
                >
                  {renderActiveTab()}
                </Suspense>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Checklist de lanzamiento
              </CardTitle>
              <CardDescription>Esto es lo minimo para que la salida publica se vea seria y consistente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {launchChecks.map((check) => (
                <div key={check.id} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
                  <div className={`mt-0.5 rounded-full p-1 ${check.done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                    {check.done ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                Modulos visibles
              </CardTitle>
              <CardDescription>Elementos que hoy afectan directamente la experiencia publica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {publicModules.map((module) => (
                <div key={module.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{module.label}</span>
                  <Badge variant={module.enabled ? 'default' : 'outline'} className={module.enabled ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
                    {module.enabled ? 'Activo' : 'Pendiente'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-base">Alertas de publicacion</CardTitle>
              <CardDescription>Lo que conviene completar antes de mandar trafico real a la pagina.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {warnings.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-400">
                  La salida publica esta consistente en los puntos principales.
                </div>
              ) : (
                warnings.map((warning) => (
                  <div key={warning.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold text-foreground">{warning.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{warning.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-base">Ruta publica actual</CardTitle>
              <CardDescription>Base real de la pagina publica y nivel de control habilitado por tu plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Base publica</p>
                <p className="mt-2 break-all text-sm font-semibold text-foreground">{publicBaseUrl || 'Sin ruta resuelta'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Identificador</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedOrganization?.slug || selectedOrganization?.subdomain || 'Pendiente'}</p>
                </div>
                <div className="rounded-xl border border-border/70 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Dominio personalizado</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{selectedOrganization?.custom_domain || (canUseCustomBranding ? 'No configurado' : 'Solo Professional')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-base">Contacto publico actual</CardTitle>
              <CardDescription>Referencia rapida de lo que hoy queda expuesto en la web.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{currentConfig.contact?.phone || 'Sin telefono'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{currentConfig.contact?.email || 'Sin email'}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {[currentConfig.address?.street, currentConfig.address?.city, currentConfig.address?.department].filter(Boolean).join(', ') || 'Sin direccion cargada'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {currentConfig.legalDocuments?.termsUrl || currentConfig.legalDocuments?.privacyUrl ? 'Documentos legales disponibles' : 'Sin documentos legales publicos'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
