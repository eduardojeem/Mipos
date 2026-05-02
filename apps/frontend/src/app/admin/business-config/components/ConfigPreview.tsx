'use client'

import { useMemo, useState, type ChangeEvent, type ElementType } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileJson,
  Image,
  MapPin,
  Palette,
  Phone,
  RotateCcw,
  Store,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import type { BusinessConfig } from '@/types/business-config'
import { cn } from '@/lib/utils'

interface ConfigPreviewProps {
  config: BusinessConfig
  onUpdate: (updates: Partial<BusinessConfig>) => void
  onReset: () => void
}

interface SectionStatus {
  id: string
  name: string
  icon: ElementType
  tone: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose'
  required: Array<string | undefined>
  summary: string
}

const TONE_STYLES = {
  emerald: {
    shell: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  blue: {
    shell: 'border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/20',
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  },
  violet: {
    shell: 'border-violet-200 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/20',
    icon: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  },
  amber: {
    shell: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  rose: {
    shell: 'border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20',
    icon: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
} as const

export function ConfigPreview({ config, onUpdate, onReset }: ConfigPreviewProps) {
  const [showJsonPreview, setShowJsonPreview] = useState(false)
  const { toast } = useToast()

  const sections = useMemo<SectionStatus[]>(
    () => [
      {
        id: 'content',
        name: 'Contenido',
        icon: Building2,
        tone: 'blue',
        required: [config.businessName, config.heroTitle, config.heroDescription],
        summary: 'Nombre comercial, hero y mensaje principal.',
      },
      {
        id: 'contact',
        name: 'Contacto',
        icon: Phone,
        tone: 'emerald',
        required: [config.contact?.phone, config.contact?.email, config.address?.street, config.address?.city],
        summary: 'Telefono, email y direccion visibles.',
      },
      {
        id: 'brand',
        name: 'Marca',
        icon: Palette,
        tone: 'violet',
        required: [config.branding?.primaryColor],
        summary: 'Color principal y recursos visuales.',
      },
      {
        id: 'commerce',
        name: 'Comercio',
        icon: Store,
        tone: 'amber',
        required: [config.storeSettings?.currency, config.storeSettings?.currencySymbol],
        summary: 'Moneda, impuestos y reglas comerciales.',
      },
      {
        id: 'publication',
        name: 'Publicacion',
        icon: Image,
        tone: 'rose',
        required: [config.publicSite?.content?.heroPrimaryCtaLabel || config.heroTitle],
        summary: 'Copys, modulos visibles y salida publica.',
      },
    ],
    [config]
  )

  const totalRequired = sections.reduce((sum, section) => sum + section.required.length, 0)
  const totalCompleted = sections.reduce(
    (sum, section) => sum + section.required.filter(Boolean).length,
    0
  )
  const completionPercentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100

  const publicModuleCount = Object.values(config.publicSite?.sections || {}).filter(Boolean).length

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const filename = `business-config-${new Date().toISOString().split('T')[0]}.json`
    const link = document.createElement('a')
    link.setAttribute('href', dataUri)
    link.setAttribute('download', filename)
    link.click()
  }

  const importConfig = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      try {
        const importedConfig = JSON.parse(String(loadEvent.target?.result || '{}'))
        onUpdate({
          ...importedConfig,
          updatedAt: new Date().toISOString(),
        })
        toast({
          title: 'Configuracion importada',
          description: 'El archivo se cargo en la vista actual. Revisa y guarda los cambios.',
        })
      } catch {
        toast({
          title: 'Archivo invalido',
          description: 'No se pudo leer el JSON de configuracion.',
          variant: 'destructive',
        })
      } finally {
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle>Revision general</CardTitle>
              <CardDescription>
                Valida si el negocio ya tiene lo minimo para una salida publica consistente.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {completionPercentage}% listo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completionPercentage} className="h-2" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Campos clave</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {totalCompleted}/{totalRequired}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Modulos activos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{publicModuleCount}</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Carrusel</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {config.carousel?.images?.length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {sections.map((section) => {
          const Icon = section.icon
          const completed = section.required.filter(Boolean).length
          const required = section.required.length
          const isComplete = completed === required
          const tone = TONE_STYLES[section.tone]

          return (
            <Card key={section.id} className={cn('border', tone.shell)}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={cn('rounded-xl p-2', tone.icon)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{section.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.summary}</p>
                </div>
                <div className="space-y-2">
                  <Progress value={(completed / required) * 100} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {completed}/{required} puntos completos
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista rapida
          </CardTitle>
          <CardDescription>
            Senales principales que hoy vera un cliente final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="rounded-3xl border p-6"
            style={{
              background: `linear-gradient(135deg, ${config.branding?.gradientStart || '#e9f0f7'}, ${config.branding?.gradientEnd || '#f9fbfe'})`,
              color: config.branding?.textColor || '#202c38',
            }}
          >
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                {config.publicSite?.content?.heroBadge || 'Tienda oficial'}
              </p>
              <h3 className="text-3xl font-semibold tracking-tight">
                {config.heroTitle || 'Titulo pendiente'}{' '}
                <span style={{ color: config.branding?.accentColor || '#059669' }}>
                  {config.heroHighlight || 'destacado'}
                </span>
              </h3>
              <p className="text-sm opacity-80">
                {config.heroDescription || 'Completa la descripcion comercial principal.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Moneda</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {config.storeSettings?.currencySymbol || 'Gs.'} {config.storeSettings?.currency || 'PYG'}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">IVA</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {config.storeSettings?.taxEnabled
                  ? `${(config.storeSettings.taxRate * 100).toFixed(0)}%`
                  : 'Desactivado'}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ciudad</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {config.address?.city || 'Pendiente'}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contacto</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {config.contact?.phone || 'Pendiente'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <p className="text-sm font-semibold text-foreground">Paleta activa</p>
              <div className="mt-3 flex gap-2">
                {[config.branding?.primaryColor, config.branding?.secondaryColor, config.branding?.accentColor].map(
                  (color, index) => (
                    <div
                      key={`${color}-${index}`}
                      className="h-10 flex-1 rounded-xl border"
                      style={{ backgroundColor: color || '#e2e8f0' }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm font-semibold text-foreground">Salida publica</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{config.contact?.email || 'Email pendiente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[config.address?.city, config.address?.department].filter(Boolean).join(', ') || 'Ubicacion pendiente'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm font-semibold text-foreground">Legales</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{config.legalDocuments?.termsUrl ? 'Terminos cargados' : 'Terminos pendientes'}</p>
                <p>{config.legalDocuments?.privacyUrl ? 'Privacidad cargada' : 'Privacidad pendiente'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Exportacion y respaldo
          </CardTitle>
          <CardDescription>
            Guarda una copia, importa una configuracion base o reinicia esta vista.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowJsonPreview((value) => !value)} className="gap-2">
              <Eye className="h-4 w-4" />
              {showJsonPreview ? 'Ocultar JSON' : 'Ver JSON'}
            </Button>

            <Button variant="outline" onClick={exportConfig} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>

            <label className="cursor-pointer">
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  Importar
                </span>
              </Button>
              <input type="file" accept=".json" onChange={importConfig} className="hidden" />
            </label>

            <Button variant="destructive" onClick={onReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restaurar base
            </Button>
          </div>

          {showJsonPreview && (
            <div className="overflow-hidden rounded-2xl border">
              <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                <span className="text-sm font-medium text-foreground">business-config.json</span>
                <Button variant="ghost" size="sm" onClick={exportConfig}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Ultima actualizacion: {new Date(config.updatedAt).toLocaleString('es-PY')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Creado: {new Date(config.createdAt).toLocaleString('es-PY')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
