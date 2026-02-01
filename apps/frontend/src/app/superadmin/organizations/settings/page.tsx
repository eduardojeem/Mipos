'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'
import { Save, Building2, CreditCard, Palette, Phone, MapPin, Globe, Loader2 } from 'lucide-react'

type Org = {
  id: string
  name: string
  slug?: string | null
  subscription_status?: string | null
  settings?: any
}

const currencies = ['PYG', 'USD', 'EUR', 'ARS', 'BRL']
const timezones = ['America/Asuncion', 'America/Buenos_Aires', 'America/Sao_Paulo', 'UTC']
const languages = ['es', 'en', 'pt']
const statuses = ['active', 'trial', 'past_due', 'canceled', 'incomplete', 'paused']

export default function OrgSettingsPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Org[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // General
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [status, setStatus] = useState('active')
  const [currency, setCurrency] = useState('PYG')
  const [timezone, setTimezone] = useState('America/Asuncion')
  const [language, setLanguage] = useState('es')
  const [description, setDescription] = useState('')
  
  // Limits
  const [maxUsers, setMaxUsers] = useState<number>(5)
  const [maxProducts, setMaxProducts] = useState<number>(100)
  const [maxTransactions, setMaxTransactions] = useState<number>(1000)
  const [maxLocations, setMaxLocations] = useState<number>(1)
  
  // Branding
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6')
  
  // Contact
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  
  // Address
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [zip, setZip] = useState('')

  // Social
  const [website, setWebsite] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [twitter, setTwitter] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/superadmin/organizations')
        const json = await res.json()
        const orgs = Array.isArray(json.organizations) ? json.organizations : []
        setOrganizations(orgs)
        if (orgs.length > 0) setSelectedId(orgs[0].id)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  useEffect(() => {
    const sync = async () => {
      if (!selectedId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/superadmin/organizations/${selectedId}/settings`)
        const json = await res.json()
        const org = json.organization as Org
        
        setFormName(org?.name || '')
        setFormSlug(org?.slug || '')
        setStatus(org?.subscription_status || 'active')
        
        const s = org?.settings || {}
        setCurrency(s?.currency || 'PYG')
        setTimezone(s?.timezone || 'America/Asuncion')
        setLanguage(s?.language || 'es')
        setDescription(s?.description || '')
        
        const limits = s?.limits || {}
        setMaxUsers(Number(limits?.maxUsers ?? 5))
        setMaxProducts(Number(limits?.maxProducts ?? 100))
        setMaxTransactions(Number(limits?.maxTransactionsPerMonth ?? 1000))
        setMaxLocations(Number(limits?.maxLocations ?? 1))
        
        const branding = s?.branding || {}
        setPrimaryColor(branding?.primaryColor || '#6366f1')
        setSecondaryColor(branding?.secondaryColor || '#8b5cf6')
        
        const contact = s?.contactInfo || {}
        setContactEmail(contact?.email || '')
        setContactPhone(contact?.phone || '')

        const addr = s?.address || {}
        setStreet(addr?.street || '')
        setCity(addr?.city || '')
        setState(addr?.state || '')
        setCountry(addr?.country || '')
        setZip(addr?.zip || '')

        const soc = s?.social || {}
        setWebsite(soc?.website || '')
        setFacebook(soc?.facebook || '')
        setInstagram(soc?.instagram || '')
        setTwitter(soc?.twitter || '')
      } catch (err) {
        toast.error('Error al cargar configuración')
      } finally {
        setLoading(false)
      }
    }
    sync()
  }, [selectedId])

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const payload = {
        name: formName,
        subscription_status: status,
        settings: {
          currency,
          timezone,
          language,
          description,
          contactInfo: {
            email: contactEmail,
            phone: contactPhone
          },
          address: {
            street,
            city,
            state,
            country,
            zip
          },
          social: {
            website,
            facebook,
            instagram,
            twitter
          },
          limits: { 
            maxUsers,
            maxProducts,
            maxTransactionsPerMonth: maxTransactions,
            maxLocations
          },
          branding: {
            primaryColor,
            secondaryColor
          }
        }
      }
      const res = await fetch(`/api/superadmin/organizations/${selectedId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        toast.success('Configuración guardada correctamente')
        router.refresh()
        // Update local state list to reflect name/status changes
        setOrganizations(prev => prev.map(o => 
          o.id === selectedId 
            ? { ...o, name: formName, subscription_status: status } 
            : o
        ))
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al guardar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading && organizations.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Selection */}
        <Card className="md:w-1/4 h-fit">
          <CardHeader>
            <CardTitle>Organizaciones</CardTitle>
            <CardDescription>Selecciona una organización para editar</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="truncate">{o.name}</span>
                      <Badge variant={o.subscription_status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1">
                        {o.subscription_status?.substring(0, 3).toUpperCase() || 'UNK'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Configuración de Organización</h1>
              <p className="text-muted-foreground">Administra los detalles, límites y preferencias.</p>
            </div>
            <Button onClick={handleSave} disabled={saving || !selectedId} className="gap-2">
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
              <TabsTrigger value="general" className="gap-2"><Building2 className="h-4 w-4" /> General</TabsTrigger>
              <TabsTrigger value="limits" className="gap-2"><CreditCard className="h-4 w-4" /> Límites</TabsTrigger>
              <TabsTrigger value="branding" className="gap-2"><Palette className="h-4 w-4" /> Marca</TabsTrigger>
              <TabsTrigger value="contact" className="gap-2"><Phone className="h-4 w-4" /> Contacto</TabsTrigger>
              <TabsTrigger value="address" className="gap-2"><MapPin className="h-4 w-4" /> Dirección</TabsTrigger>
              <TabsTrigger value="social" className="gap-2"><Globe className="h-4 w-4" /> Web</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                  <CardDescription>Datos básicos de la organización</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre</label>
                    <Input value={formName} onChange={e => setFormName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slug (URL)</label>
                    <Input value={formSlug} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado de Suscripción</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Moneda Predeterminada</label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Zona Horaria</label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Idioma</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Limits Tab */}
            <TabsContent value="limits" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Límites y Cuotas</CardTitle>
                  <CardDescription>Controla el consumo de recursos</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Usuarios</label>
                    <Input type="number" value={String(maxUsers)} onChange={e => setMaxUsers(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Productos</label>
                    <Input type="number" value={String(maxProducts)} onChange={e => setMaxProducts(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transacciones/Mes</label>
                    <Input type="number" value={String(maxTransactions)} onChange={e => setMaxTransactions(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Locales</label>
                    <Input type="number" value={String(maxLocations)} onChange={e => setMaxLocations(Number(e.target.value))} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Identidad de Marca</CardTitle>
                  <CardDescription>Colores y apariencia</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color Primario</label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 h-10 p-1 cursor-pointer" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                      <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono uppercase" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color Secundario</label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 h-10 p-1 cursor-pointer" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                      <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="font-mono uppercase" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información de Contacto</CardTitle>
                  <CardDescription>Datos públicos de contacto</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dirección Física</CardTitle>
                  <CardDescription>Ubicación de la organización</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Calle y Número</label>
                    <Input value={street} onChange={e => setStreet(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ciudad</label>
                    <Input value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado/Provincia</label>
                    <Input value={state} onChange={e => setState(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">País</label>
                    <Input value={country} onChange={e => setCountry(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código Postal</label>
                    <Input value={zip} onChange={e => setZip(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Presencia Online</CardTitle>
                  <CardDescription>Sitio web y redes sociales</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sitio Web</label>
                    <Input placeholder="https://..." value={website} onChange={e => setWebsite(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Facebook</label>
                    <Input placeholder="URL del perfil" value={facebook} onChange={e => setFacebook(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instagram</label>
                    <Input placeholder="@usuario" value={instagram} onChange={e => setInstagram(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Twitter (X)</label>
                    <Input placeholder="@usuario" value={twitter} onChange={e => setTwitter(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
