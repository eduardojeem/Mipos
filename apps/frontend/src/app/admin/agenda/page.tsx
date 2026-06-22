'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Trash2, 
  Check, 
  X, 
  UserX, 
  DollarSign, 
  CheckCircle2,
  MessageCircle,
  Search,
  LayoutGrid,
  List,
  User,
  TrendingUp,
  Calendar,
  AlertCircle,
  Briefcase,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppointments, type Appointment, type AppointmentStatus } from './hooks/useAppointments'
import { NewAppointmentModal } from './components/NewAppointmentModal'
import { ChargeModal } from './components/ChargeModal'
import { RescheduleModal } from './components/RescheduleModal'
import { useStaff } from '@/app/admin/staff/hooks/useStaff'
import { useMyStaffProfile } from './hooks/useMyStaffProfile'
import { buildWhatsappLink, buildConfirmationMessage } from '@/lib/barbershop/whatsapp'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const nd = new Date(y, m - 1, d + days)
  return `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`
}

function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_META: Record<AppointmentStatus, { label: string; className: string; colorClass: string }> = {
  BOOKED: { label: 'Reservado', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20', colorClass: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' },
  CONFIRMED: { label: 'Confirmado', className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20', colorClass: 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20' },
  COMPLETED: { label: 'Atendido', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', colorClass: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' },
  CANCELLED: { label: 'Cancelado', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', colorClass: 'border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/10 opacity-60' },
  NO_SHOW: { label: 'No vino', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', colorClass: 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/15 opacity-75' },
}

export default function AgendaPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [dateStr, setDateStr] = useState<string>(todayStr())
  const [modalOpen, setModalOpen] = useState(false)
  const [toCharge, setToCharge] = useState<Appointment | null>(null)
  const [toReschedule, setToReschedule] = useState<Appointment | null>(null)
  
  // States for filters and views
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [viewType, setViewType] = useState<'list' | 'columns'>('columns')
  const [showOverdue, setShowOverdue] = useState(false)
  const [preselectedStaffId, setPreselectedStaffId] = useState<string | undefined>(undefined)
  const [defaultCustomer, setDefaultCustomer] = useState<{
    id?: string | null
    name?: string | null
    phone?: string | null
    email?: string | null
  } | null>(null)

  const { appointments, overdueAppointments, isLoading, isError, error, create, setStatus, remove, charge, reschedule, isRescheduling, isCreating, isCharging } = useAppointments(dateStr)
  
  // Hook useStaff to retrieve active professionals
  const { staff: staffList } = useStaff()
  const activeStaff = useMemo(() => staffList.filter((s) => s.is_active), [staffList])

  // Ficha del barbero logueado → permite ver "mi agenda" (solo mis turnos).
  const { myStaff } = useMyStaffProfile()
  const [onlyMine, setOnlyMine] = useState(false)
  // Si el usuario es barbero, arranca viendo su propia agenda por defecto.
  useEffect(() => { if (myStaff) setOnlyMine(true) }, [myStaff])

  // Confirma el turno y abre WhatsApp con un mensaje pre-cargado al cliente.
  const confirmViaWhatsapp = (a: Appointment) => {
    const link = buildWhatsappLink(a.customer_phone, buildConfirmationMessage({
      customerName: a.customer_label || a.customer_name,
      serviceName: a.service?.name ?? null,
      dateLabel: prettyDate(dateStr),
      timeLabel: time(a.start_at),
    }))
    if (link) window.open(link, '_blank', 'noopener,noreferrer')
    if (a.status === 'BOOKED') setStatus(a.id, 'CONFIRMED')
  }

  // Filter appointments based on search and status selection
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      // "Mi agenda": solo los turnos del barbero logueado
      if (onlyMine && myStaff && a.staff_profile_id !== myStaff.id) return false

      // Status filter
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false

      // Text search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        const clientLabel = (a.customer_label || '').toLowerCase()
        const clientName = (a.customer_name || '').toLowerCase()
        const serviceName = (a.service?.name || '').toLowerCase()
        const staffName = (a.staff?.name || '').toLowerCase()
        return (
          clientLabel.includes(query) ||
          clientName.includes(query) ||
          serviceName.includes(query) ||
          staffName.includes(query)
        )
      }

      return true
    })
  }, [appointments, statusFilter, searchQuery, onlyMine, myStaff])

  // Day KPIs summary
  const kpis = useMemo(() => {
    let total = 0
    let confirmed = 0
    let completed = 0
    let pending = 0
    let estimatedRevenue = 0

    for (const a of appointments) {
      if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') {
        total++
        estimatedRevenue += Number(a.price || 0)
        if (a.status === 'BOOKED') pending++
        if (a.status === 'CONFIRMED') confirmed++
        if (a.status === 'COMPLETED') completed++
      }
    }

    return { total, confirmed, completed, pending, estimatedRevenue }
  }, [appointments])

  // Group filtered appointments by staff member
  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string | null; items: Appointment[] }>()
    
    // Initialize with the relevant staff members ("mi agenda" → solo el mío)
    const visibleStaff = onlyMine && myStaff ? activeStaff.filter((s) => s.id === myStaff.id) : activeStaff
    for (const s of visibleStaff) {
      const name = s.display_name || s.user?.full_name || 'Profesional'
      map.set(s.id, { id: s.id, name, color: s.color, items: [] })
    }

    // Assign appointments to their corresponding staff group
    for (const a of filteredAppointments) {
      const key = a.staff_profile_id
      if (!map.has(key)) {
        const name = a.staff?.name || 'Profesional'
        map.set(key, { id: key, name, color: a.staff?.color ?? null, items: [] })
      }
      map.get(key)!.items.push(a)
    }

    return Array.from(map.values()).sort((x, y) => x.name.localeCompare(y.name))
  }, [filteredAppointments, activeStaff, onlyMine, myStaff])

  const isTerminal = (s: AppointmentStatus) => s === 'CANCELLED' || s === 'NO_SHOW' || s === 'COMPLETED'

  // Cita vencida: ya pasó (end_at < ahora) pero sigue sin resolver (BOOKED/CONFIRMED).
  const isOverdue = (a: Appointment) =>
    (a.status === 'BOOKED' || a.status === 'CONFIRMED') && new Date(a.end_at).getTime() < Date.now()

  // Banner de pendientes: las más recientes primero.
  const overdueSorted = useMemo(
    () => [...overdueAppointments].sort((x, y) => new Date(y.start_at).getTime() - new Date(x.start_at).getTime()),
    [overdueAppointments],
  )

  const handleNewAppointmentWithStaff = (staffId: string) => {
    setPreselectedStaffId(staffId)
    setDefaultCustomer(null)
    setModalOpen(true)
  }

  const handleNewAppointmentGeneral = () => {
    setPreselectedStaffId(undefined)
    setDefaultCustomer(null)
    setModalOpen(true)
  }

  const handleOpenCustomer = (customerId: string) => {
    router.push(`/dashboard/customers?customerId=${encodeURIComponent(customerId)}`)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
  }

  useEffect(() => {
    const shouldOpen = searchParams.get('openNewAppointment') === '1'
    if (!shouldOpen) return

    const customerId = searchParams.get('customerId')
    const customerName = searchParams.get('customerName')
    const customerPhone = searchParams.get('customerPhone')
    const customerEmail = searchParams.get('customerEmail')
    const queryDate = searchParams.get('date')

    if (queryDate) {
      setDateStr(queryDate)
    }

    setPreselectedStaffId(undefined)
    setDefaultCustomer({
      id: customerId,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
    })
    setModalOpen(true)

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('openNewAppointment')
    nextParams.delete('customerId')
    nextParams.delete('customerName')
    nextParams.delete('customerPhone')
    nextParams.delete('customerEmail')
    nextParams.delete('date')
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [pathname, router, searchParams])

  // Appointment card renderer
  const renderAppointmentCard = (a: Appointment) => {
    const meta = STATUS_META[a.status]
    const cardBorderColor = a.staff?.color || '#6366f1'
    return (
      <Card
        key={a.id}
        className={cn(
          "relative overflow-hidden transition-all duration-300 hover-lift hover-glow border-l-4 shadow-sm",
          meta.colorClass,
          isOverdue(a) && "ring-1 ring-amber-400/70 dark:ring-amber-500/40"
        )}
        style={{ borderLeftColor: cardBorderColor }}
      >
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className={cn(
                "font-semibold text-sm text-foreground truncate",
                a.status === 'CANCELLED' && "line-through"
              )}>
                {a.service?.name || 'Servicio'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{time(a.start_at)} – {time(a.end_at)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={cn("text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5", meta.className)}>
                {meta.label}
              </Badge>
              {isOverdue(a) && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9px] font-semibold uppercase px-1.5 py-0">
                  Vencido
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs border-t border-border/40 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium text-foreground truncate max-w-[150px]">{a.customer_label || a.customer_name || 'Sin cliente'}</span>
            </div>
            {a.customer_id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-fit px-2 -ml-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => handleOpenCustomer(a.customer_id!)}
              >
                <User className="mr-1.5 h-3.5 w-3.5" />
                Abrir ficha
              </Button>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Precio:</span>
              <span className="font-semibold text-foreground">{formatCurrency(Number(a.price), '')}</span>
            </div>
            {a.notes && (
              <div className="mt-1 p-1.5 bg-muted/30 rounded text-[11px] text-muted-foreground italic truncate" title={a.notes}>
                "{a.notes}"
              </div>
            )}
          </div>

          {a.status === 'COMPLETED' && a.sale_id && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium px-2 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Turno Cobrado</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-1 border-t border-border/40 pt-2 mt-1">
            {!isTerminal(a.status) && (
              <>
                {a.status === 'BOOKED' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-950/50 rounded-full"
                    title="Confirmar Turno"
                    onClick={() => setStatus(a.id, 'CONFIRMED')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                {a.customer_phone && (a.status === 'BOOKED' || a.status === 'CONFIRMED') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:bg-green-100 dark:hover:bg-green-950/50 rounded-full"
                    title="Confirmar por WhatsApp"
                    onClick={() => confirmViaWhatsapp(a)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-full" 
                  title="Cobrar Turno" 
                  onClick={() => setToCharge(a)}
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-full" 
                  title="Marcar como No Vino" 
                  onClick={() => setStatus(a.id, 'NO_SHOW')}
                >
                  <UserX className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-full"
                  title="Reagendar Turno"
                  onClick={() => setToReschedule(a)}
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-full"
                  title="Cancelar Turno"
                  onClick={() => setStatus(a.id, 'CANCELLED')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full" 
              title="Eliminar del Registro" 
              onClick={() => remove(a.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10 px-1 animate-slide-up">
      {/* Header Area */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground tracking-tight">
            <CalendarDays className="h-6 w-6 text-primary" /> Agenda de Turnos
          </h1>
          <p className="text-sm capitalize text-muted-foreground font-medium mt-1">{prettyDate(dateStr)}</p>
        </div>
        <Button onClick={handleNewAppointmentGeneral} className="btn-premium rounded-xl shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" /> Nuevo turno
        </Button>
      </div>

      {/* Pendientes de resolver: citas vencidas (BOOKED/CONFIRMED con hora ya pasada) */}
      {overdueSorted.length > 0 && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-950/20">
          <button
            type="button"
            onClick={() => setShowOverdue((v) => !v)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {overdueSorted.length} turno{overdueSorted.length === 1 ? '' : 's'} vencido{overdueSorted.length === 1 ? '' : 's'} sin resolver
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/70">
                  Ya pasó su horario y siguen como reservados/confirmados. Resolvelos para mantener la agenda limpia.
                </p>
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-amber-600 transition-transform', showOverdue && 'rotate-90')} />
          </button>

          {showOverdue && (
            <div className="max-h-80 space-y-2 overflow-y-auto border-t border-amber-200/60 p-3 dark:border-amber-800/40">
              {overdueSorted.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/50 bg-card px-3 py-2 dark:border-amber-900/30">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {a.service?.name || 'Servicio'} · {a.customer_label || a.customer_name || 'Sin cliente'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.start_at).toLocaleString('es-PY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {a.staff?.name ? ` · ${a.staff.name}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/50" title="Cobrar turno" onClick={() => setToCharge(a)}>
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/50" title="Marcar como No vino" onClick={() => setStatus(a.id, 'NO_SHOW')}>
                      <UserX className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50" title="Cancelar turno" onClick={() => setStatus(a.id, 'CANCELLED')}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/50" title="Reagendar turno" onClick={() => setToReschedule(a)}>
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full px-2 text-xs text-primary hover:bg-primary/10"
                      title="Ir al día del turno"
                      onClick={() => {
                        const d = new Date(a.start_at)
                        setDateStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                        setShowOverdue(false)
                      }}
                    >
                      Ver día
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Metrics Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card overflow-hidden hover-lift border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Turnos</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{kpis.total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden hover-lift border-l-4 border-l-violet-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-500">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirmados</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{kpis.confirmed}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden hover-lift border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atendidos</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{kpis.completed}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden hover-lift border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingresos Est.</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5 truncate">{formatCurrency(kpis.estimatedRevenue, '')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls and Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card p-4 rounded-2xl border border-border/40 shadow-sm">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setDateStr((d) => shiftDate(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input type="date" value={dateStr} onChange={(e) => e.target.value && setDateStr(e.target.value)} className="w-auto h-9 rounded-xl font-medium" />
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setDateStr((d) => shiftDate(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 font-medium text-primary hover:bg-primary/10 rounded-xl" onClick={() => setDateStr(todayStr())}>
            Hoy
          </Button>
        </div>

        {/* Search, Filter, and View Type controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, servicio o barbero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>

          {/* Quick filter: reservas pendientes de confirmar (BOOKED) */}
          <Button
            variant={statusFilter === 'BOOKED' ? 'default' : 'outline'}
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => setStatusFilter((s) => (s === 'BOOKED' ? 'ALL' : 'BOOKED'))}
            title="Reservas pendientes de confirmar"
          >
            <AlertCircle className="mr-1.5 h-4 w-4" />
            Pendientes
            {kpis.pending > 0 && (
              <Badge className="ml-1.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0 text-[10px] font-bold">
                {kpis.pending}
              </Badge>
            )}
          </Button>

          {/* "Mi agenda" toggle (solo si el usuario es un barbero agendable) */}
          {myStaff && (
            <Button
              variant={onlyMine ? 'default' : 'outline'}
              size="sm"
              className="h-9 rounded-xl"
              onClick={() => setOnlyMine((v) => !v)}
              title={onlyMine ? 'Mostrando solo tus turnos' : 'Mostrando todos los turnos'}
            >
              <User className="mr-1.5 h-4 w-4" />
              {onlyMine ? 'Mi agenda' : 'Todos'}
            </Button>
          )}

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 rounded-xl text-sm">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="BOOKED">Reservados</SelectItem>
              <SelectItem value="CONFIRMED">Confirmados</SelectItem>
              <SelectItem value="COMPLETED">Atendidos</SelectItem>
              <SelectItem value="CANCELLED">Cancelados</SelectItem>
              <SelectItem value="NO_SHOW">No asistieron</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40 w-full sm:w-auto justify-center">
            <Button
              variant={viewType === 'columns' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 rounded-lg text-xs font-semibold px-3 flex items-center gap-1.5 transition-all",
                viewType === 'columns' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewType('columns')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Planner</span>
            </Button>
            <Button
              variant={viewType === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 rounded-lg text-xs font-semibold px-3 flex items-center gap-1.5 transition-all",
                viewType === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewType('list')}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Agenda Views */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="space-y-3 p-4 border rounded-2xl bg-card">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 skeleton-premium rounded" />
                <div className="h-5 w-16 skeleton-premium rounded-full" />
              </div>
              <div className="h-3 w-32 skeleton-premium rounded" />
              <div className="space-y-2 pt-2 border-t">
                <div className="h-3 w-full skeleton-premium rounded" />
                <div className="h-3 w-full skeleton-premium rounded" />
              </div>
              <div className="flex justify-end gap-1 pt-2 border-t">
                <div className="h-7 w-7 skeleton-premium rounded-full" />
                <div className="h-7 w-7 skeleton-premium rounded-full" />
                <div className="h-7 w-7 skeleton-premium rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive font-medium">
            {error?.message || 'Error al cargar los turnos del día.'}
          </CardContent>
        </Card>
      ) : appointments.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Calendar className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg">No hay turnos para esta fecha</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No hay turnos registrados para esta fecha. Podés agendar uno haciendo click en el botón de abajo.
              </p>
            </div>
            <Button onClick={handleNewAppointmentGeneral} className="btn-premium">
              <Plus className="mr-2 h-4 w-4" /> Agendar primer turno
            </Button>
          </CardContent>
        </Card>
      ) : filteredAppointments.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-amber-500/10 p-4">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-lg">Sin resultados</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No hay turnos que coincidan con la búsqueda o filtros aplicados.
              </p>
            </div>
            <Button onClick={resetFilters} variant="outline" className="rounded-xl">
              <XCircle className="mr-2 h-4 w-4" /> Limpiar filtros
            </Button>
          </CardContent>
        </Card>
      ) : viewType === 'columns' ? (
        /* Planner Column View */
        <div className="flex gap-4 overflow-x-auto pb-6 snap-x scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {groups.map((g) => {
            const sortedItems = [...g.items].sort((x, y) => new Date(x.start_at).getTime() - new Date(y.start_at).getTime())
            return (
              <div 
                key={g.id} 
                className="w-[300px] md:w-[320px] flex-shrink-0 flex flex-col bg-slate-500/5 dark:bg-slate-500/10 border border-border/40 rounded-2xl p-4 snap-align-start select-none"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color || '#6366f1' }} />
                    <h3 className="font-bold text-sm text-foreground truncate">{g.name}</h3>
                    <span className="text-xs text-muted-foreground font-semibold">({sortedItems.length})</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => handleNewAppointmentWithStaff(g.id)}
                    title={`Agendar turno para ${g.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[60vh] pr-1 scrollbar-thin">
                  {sortedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center border border-dashed border-border/80 rounded-2xl p-8 text-center h-[200px] bg-card/30">
                      <Briefcase className="h-8 w-8 text-muted-foreground/45 mb-2" />
                      <p className="text-xs text-muted-foreground font-medium mb-3">Disponible sin turnos</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleNewAppointmentWithStaff(g.id)}
                        className="h-8 text-xs border-dashed rounded-lg"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Agendar
                      </Button>
                    </div>
                  ) : (
                    sortedItems.map((a) => renderAppointmentCard(a))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {groups.map((g) => {
            if (g.items.length === 0) return null
            const sortedItems = [...g.items].sort((x, y) => new Date(x.start_at).getTime() - new Date(y.start_at).getTime())
            return (
              <div key={g.id} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }} />
                  <h2 className="text-base font-bold text-foreground">{g.name}</h2>
                  <span className="text-xs text-muted-foreground font-medium">({sortedItems.length} turnos)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedItems.map((a) => renderAppointmentCard(a))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <NewAppointmentModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setDefaultCustomer(null)
          }
        }}
        dateStr={dateStr}
        isCreating={isCreating}
        onSubmit={create}
        defaultStaffId={preselectedStaffId}
        defaultCustomer={defaultCustomer}
      />

      <ChargeModal
        open={!!toCharge}
        onOpenChange={(o) => !o && setToCharge(null)}
        appointment={toCharge}
        isCharging={isCharging}
        onConfirm={(pm) => charge(toCharge!.id, pm)}
      />

      <RescheduleModal
        open={!!toReschedule}
        onOpenChange={(o) => !o && setToReschedule(null)}
        appointment={toReschedule}
        isSaving={isRescheduling}
        onSubmit={reschedule}
      />
    </div>
  )
}
