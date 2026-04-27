'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Route,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useUserOrganizations } from '@/hooks/use-user-organizations'
import { buildTenantPublicBaseUrl } from '@/lib/domain/host-context'

interface DomainSettingsFormProps {
  allowCustomDomain?: boolean
  onUpdate?: () => void
  planName?: string
}

export function DomainSettingsForm({
  allowCustomDomain = false,
  onUpdate,
  planName = 'Starter',
}: DomainSettingsFormProps) {
  const { user } = useAuth()
  const { selectedOrganization, loading: orgLoading } = useUserOrganizations(user?.id)
  const { toast } = useToast()

  const [subdomain, setSubdomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [baseDomain, setBaseDomain] = useState('miposparaguay.vercel.app')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/superadmin/system-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.baseDomain) {
          setBaseDomain(String(data.baseDomain))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedOrganization) return
    setSubdomain(selectedOrganization.subdomain || selectedOrganization.slug || '')
    setCustomDomain(selectedOrganization.custom_domain || '')
  }, [selectedOrganization])

  const publicBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''

    const normalizedSubdomain = subdomain.trim().toLowerCase()
    const normalizedCustomDomain = customDomain.trim().toLowerCase()

    if (!normalizedSubdomain && !normalizedCustomDomain) {
      return ''
    }

    return buildTenantPublicBaseUrl(
      {
        slug: selectedOrganization?.slug || normalizedSubdomain,
        subdomain: normalizedSubdomain || selectedOrganization?.subdomain || '',
        custom_domain: normalizedCustomDomain || null,
      },
      window.location.host
    )
  }, [customDomain, selectedOrganization?.slug, selectedOrganization?.subdomain, subdomain])

  const publicRoutes = useMemo(
    () =>
      ['/home', '/catalog', '/offers'].map((path) => ({
        path,
        url: publicBaseUrl ? `${publicBaseUrl}${path}` : path,
      })),
    [publicBaseUrl]
  )

  const handleSave = async () => {
    if (!selectedOrganization?.id) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar la organizacion',
        variant: 'destructive',
      })
      return
    }

    const normalizedSubdomain = subdomain.trim().toLowerCase()
    const normalizedCustomDomain = customDomain.trim().toLowerCase()

    if (!normalizedSubdomain) {
      toast({
        title: 'Error',
        description: 'El subdominio es requerido',
        variant: 'destructive',
      })
      return
    }

    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
    if (!subdomainRegex.test(normalizedSubdomain)) {
      toast({
        title: 'Error',
        description: 'Usa minusculas, numeros y guiones en el subdominio.',
        variant: 'destructive',
      })
      return
    }

    if (normalizedCustomDomain && !allowCustomDomain) {
      toast({
        title: 'Plan insuficiente',
        description: 'El dominio personalizado requiere Professional.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/admin/organizations/${selectedOrganization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: normalizedSubdomain,
          custom_domain: normalizedCustomDomain || null,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo actualizar la ruta publica')
      }

      if (typeof window !== 'undefined' && selectedOrganization) {
        const nextOrganization = {
          ...selectedOrganization,
          subdomain: normalizedSubdomain,
          custom_domain: normalizedCustomDomain || null,
        }
        localStorage.setItem('selected_organization', JSON.stringify(nextOrganization))
        window.dispatchEvent(
          new CustomEvent('organization-changed', {
            detail: { organizationId: selectedOrganization.id, organization: nextOrganization },
          })
        )
      }

      toast({
        title: 'Ruta publica actualizada',
        description: allowCustomDomain
          ? 'La pagina publica ya usa la configuracion de dominio mas reciente.'
          : 'El subdominio publico quedo actualizado correctamente.',
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo actualizar la ruta publica',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedUrl(value)
      toast({
        title: 'URL copiada',
        description: 'El enlace publico se copio al portapapeles.',
      })
      window.setTimeout(() => setCopiedUrl(null), 1800)
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: 'Intenta nuevamente.',
        variant: 'destructive',
      })
    }
  }

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Route className="h-6 w-6 text-blue-600" />
            Ruta publica de la empresa
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Define desde donde se accede a tu sitio publico y que rutas compartes con clientes.
          </p>
        </div>
        <Badge className="border-none bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          Plan {planName}
        </Badge>
      </div>

      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-cyan-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Globe className="h-5 w-5" />
            Base publica actual
          </CardTitle>
          <CardDescription>
            Esta base se usa para construir la home, el catalogo y la pagina de ofertas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-blue-300/70 bg-white/90 p-4 dark:border-blue-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">URL base</p>
            <p className="mt-2 break-all font-mono text-lg font-semibold text-blue-700 dark:text-blue-300">
              {publicBaseUrl || 'Configura un subdominio para generar la ruta publica'}
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && subdomain.trim() ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                En desarrollo local la ruta publica usa <span className="font-mono">localhost/{subdomain.trim().toLowerCase()}</span>.
                Algunos entornos de Windows no resuelven correctamente <span className="font-mono">{subdomain.trim().toLowerCase()}.localhost</span>.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            {publicRoutes.map((route) => (
              <div key={route.path} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{route.path}</p>
                <p className="mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{route.url}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => copyToClipboard(route.url)}>
                    {copiedUrl === route.url ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(route.url, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-blue-600" />
              Subdominio de la empresa
            </CardTitle>
            <CardDescription>
              Disponible para planes con panel admin. Es la base operativa recomendada del sitio publico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdominio</Label>
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(event) => setSubdomain(event.target.value.toLowerCase())}
                placeholder="mi-tienda"
                className="font-mono"
              />
              <p className="text-xs text-slate-500">
                Vista esperada: <span className="font-mono">{subdomain || 'mi-tienda'}.{baseDomain}</span>
              </p>
            </div>

            <Alert className="border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Usa minusculas, numeros y guiones. Este valor tambien ayuda a resolver la ruta publica actual del negocio.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Dominio personalizado
            </CardTitle>
            <CardDescription>
              Disponible en Professional para conectar tu propio dominio comercial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom_domain">Dominio propio</Label>
              <Input
                id="custom_domain"
                value={customDomain}
                onChange={(event) => setCustomDomain(event.target.value.toLowerCase())}
                placeholder="www.miempresa.com"
                className="font-mono"
                disabled={!allowCustomDomain}
              />
            </div>

            {allowCustomDomain ? (
              <Alert className="border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-100">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Luego de guardar, apunta tu DNS al proveedor indicado por soporte para activar el dominio.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tu plan actual puede operar con subdominio y rutas publicas. El dominio personalizado se habilita en Professional.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Los cambios de ruta se aplican inmediatamente a la pagina publica activa.
        </p>
        <Button onClick={handleSave} disabled={saving || !subdomain.trim()} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Guardar ruta publica
        </Button>
      </div>
    </div>
  )
}
