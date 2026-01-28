'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

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

export default function OrgSettingsPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Org[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const selectedOrg = useMemo(() => organizations.find(o => o.id === selectedId) || null, [organizations, selectedId])

  const [formName, setFormName] = useState('')
  const [currency, setCurrency] = useState('PYG')
  const [timezone, setTimezone] = useState('America/Asuncion')
  const [language, setLanguage] = useState('es')
  const [maxUsers, setMaxUsers] = useState<number>(5)

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
      const res = await fetch(`/api/superadmin/organizations/${selectedId}/settings`)
      const json = await res.json()
      const org = json.organization as Org
      setFormName(org?.name || '')
      const s = org?.settings || {}
      setCurrency(s?.currency || 'PYG')
      setTimezone(s?.timezone || 'America/Asuncion')
      setLanguage(s?.language || 'es')
      const limits = s?.limits || {}
      setMaxUsers(Number(limits?.maxUsers || 5))
    }
    sync()
  }, [selectedId])

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const payload = {
        name: formName,
        settings: {
          currency,
          timezone,
          language,
          limits: { maxUsers }
        }
      }
      const res = await fetch(`/api/superadmin/organizations/${selectedId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const ok = res.ok
      if (ok) {
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organizaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar organización" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map(o => (
                <SelectItem key={o.id} value={o.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{o.name}</span>
                    <Badge variant="outline">{o.subscription_status || 'UNKNOWN'}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm">Nombre</label>
            <Input value={formName} onChange={e => setFormName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Moneda</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar moneda" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Zona horaria</label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona horaria" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Idioma</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar idioma" />
              </SelectTrigger>
              <SelectContent>
                {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Máx. usuarios</label>
            <Input type="number" value={String(maxUsers)} onChange={e => setMaxUsers(Number(e.target.value || 0))} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="gap-2" onClick={handleSave} disabled={saving || !selectedOrg}>
          Guardar
        </Button>
      </div>
    </div>
  )
}
