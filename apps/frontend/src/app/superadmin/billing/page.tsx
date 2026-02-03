'use client'

import { useEffect, useMemo, useState } from 'react'
import { SuperAdminGuard } from '../components/SuperAdminGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

interface SubscriptionItem {
  id: string
  organizationId?: string | null
  organization: string
  plan: string
  status: string
  amount?: number | null
  billingCycle?: string | null
  nextBilling?: string | null
  startDate?: string | null
}

export default function BillingPage() {
  const { toast } = useToast()
  const [list, setList] = useState<SubscriptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cycle, setCycle] = useState<'all' | 'monthly' | 'yearly'>('all')
  const [status, setStatus] = useState<'all' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'>('all')
  const [plan, setPlan] = useState<'all' | 'free' | 'pro'>('all')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignOrgId, setAssignOrgId] = useState<string | null>(null)
  const [assignOrgName, setAssignOrgName] = useState<string | null>(null)
  const [assignPlan, setAssignPlan] = useState<string>('pro')
  const [assignCycle, setAssignCycle] = useState<string>('monthly')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const resp = await fetch('/api/superadmin/subscriptions', { cache: 'no-store' })
        const json = await resp.json()
        if (!resp.ok) throw new Error(json?.error || 'Error al cargar suscripciones')
        setList(Array.isArray(json.subscriptions) ? json.subscriptions : [])
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Error al cargar suscripciones';
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return list.filter((s) => {
      const txt = `${s.organization} ${s.plan} ${s.status}`.toLowerCase()
      const okSearch = !search || txt.includes(search.toLowerCase())
      const okCycle = cycle === 'all' || (String(s.billingCycle || '').toLowerCase() === cycle)
      const okStatus = status === 'all' || (String(s.status || '').toUpperCase() === status)
      const okPlan = plan === 'all' || (String(s.plan || '').toLowerCase() === plan)
      return okSearch && okCycle && okStatus && okPlan
    })
  }, [list, search, cycle, status, plan])

  const fmtCurrency = (amount?: number | null) => {
    const n = Number(amount || 0)
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
  }

  const fmtDate = (iso?: string | null) => {
    try { return new Date(String(iso || new Date().toISOString())).toLocaleDateString() } catch { return '-' }
  }

  const openAssign = (orgId: string | null, orgName: string) => {
    setAssignOrgId(orgId)
    setAssignOrgName(orgName)
    setAssignPlan('pro')
    setAssignCycle('monthly')
    setAssignOpen(true)
  }

  const confirmAssign = async () => {
    if (!assignOrgId) return
    try {
      const resp = await fetch('/api/superadmin/subscriptions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: assignOrgId, planSlug: assignPlan, billingCycle: assignCycle })
      })
      const data = await resp.json()
      if (resp.ok && data?.success) {
        const reload = await fetch('/api/superadmin/subscriptions', { cache: 'no-store' })
        const json = await reload.json()
        if (reload.ok) {
          setList(Array.isArray(json.subscriptions) ? json.subscriptions : [])
        }
        toast({ title: 'Plan asignado', description: `Se asignó ${assignPlan.toUpperCase()} (${assignCycle === 'yearly' ? 'Anual' : 'Mensual'}) a ${assignOrgName || ''}` })
        setAssignOpen(false)
      } else {
        toast({ title: 'Error al asignar', description: data?.error || 'No se pudo asignar el plan', variant: 'destructive' })
      }
    } catch {}
  }

  if (loading) {
    return (
      <SuperAdminGuard>
        <div className="p-8">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SuperAdminGuard>
    )
  }

  if (error) {
    return (
      <SuperAdminGuard>
        <div className="p-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-destructive font-medium">{error}</div>
            </CardContent>
          </Card>
        </div>
      </SuperAdminGuard>
    )
  }

  return (
    <SuperAdminGuard>
      <div className="space-y-6 p-8">
        <div className="flex items-end justify-between">
          <div>
            <CardTitle className="text-3xl font-bold">Suscripciones</CardTitle>
            <div className="text-muted-foreground">Listado de organizaciones y sus planes</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 w-64" />
            </div>
            <Select value={plan} onValueChange={(v: 'all' | 'free' | 'pro') => setPlan(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">PRO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cycle} onValueChange={(v: 'all' | 'monthly' | 'yearly') => setCycle(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Ciclo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v: 'all' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED') => setStatus(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activo</SelectItem>
                <SelectItem value="PAST_DUE">Vencido</SelectItem>
                <SelectItem value="CANCELED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalle de suscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Próximo cobro</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.organization}</TableCell>
                    <TableCell className="uppercase">{s.plan}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{s.status || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{String(s.billingCycle || '').toLowerCase() === 'yearly' ? 'Anual' : 'Mensual'}</Badge>
                    </TableCell>
                    <TableCell>{fmtCurrency(s.amount)}</TableCell>
                    <TableCell>{fmtDate(s.nextBilling)}</TableCell>
                    <TableCell>{fmtDate(s.startDate)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openAssign(s.organizationId || null, s.organization)}>Asignar plan</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">Sin resultados</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">Organización: {assignOrgName || assignOrgId}</div>
            <Select value={assignPlan} onValueChange={(v: string) => setAssignPlan(v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">PRO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignCycle} onValueChange={(v: string) => setAssignCycle(v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Ciclo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAssign}>Asignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminGuard>
  )
}
