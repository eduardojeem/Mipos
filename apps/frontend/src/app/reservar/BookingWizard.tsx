'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock,
  Scissors, UserCog, CheckCircle2, Search, Calendar,
  Sparkles, Phone, User, RefreshCw, Mail
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatCurrency } from '@/lib/utils'
import { NavBar } from '@/app/home/components/NavBar'
import type { BusinessConfig } from '@/types/business-config'
import type { BusinessVertical } from '@/config/verticals'

type Service = {
  id: string
  name: string
  description: string | null
  duration_min: number
  price: number
  category: string | null
  color: string | null
}

type Staff = {
  id: string
  name: string
  specialty: string | null
  color: string | null
}

type Slot = {
  start_at: string
  end_at: string
  label: string
}

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
  return new Date(y, m - 1, d).toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

function timeRange(s: Slot): string {
  const t = (iso: string) => new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
  return `${t(s.start_at)} a ${t(s.end_at)}`
}

export function BookingWizard({
  organizationId,
  orgName,
  config,
  vertical,
}: {
  organizationId: string
  orgName: string
  config: BusinessConfig
  vertical: BusinessVertical
}) {
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loadingLists, setLoadingLists] = useState(true)

  // Asistente de pasos: 1 = Servicio, 2 = Profesional, 3 = Fecha y Hora, 4 = Mis Datos / Confirmación
  const [step, setStep] = useState(1)
  
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [dateStr, setDateStr] = useState(todayStr())
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slot, setSlot] = useState<Slot | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Slot | null>(null)

  // Filtros locales para servicios
  const [searchService, setSearchService] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const qs = (extra: Record<string, string> = {}) => new URLSearchParams({ organizationId, ...extra }).toString()

  // Generar próximos 7 días para el carrusel de fechas
  const next7Days = useMemo(() => {
    const arr = []
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const now = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const key = `${yyyy}-${mm}-${dd}`
      arr.push({
        key,
        dayName: days[d.getDay()],
        dayNum: d.getDate(),
        monthName: months[d.getMonth()],
      })
    }
    return arr
  }, [])

  // Cargar catálogos
  useEffect(() => {
    let active = true
    setLoadingLists(true)
    Promise.all([
      fetch(`/api/services/public?${qs()}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/staff/public?${qs()}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
    ]).then(([sv, st]) => {
      if (!active) return
      setServices(sv?.services || [])
      setStaff(st?.staff || [])
      setLoadingLists(false)
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  // Recalcular disponibilidad
  useEffect(() => {
    setSlot(null)
    if (!serviceId || !staffId) { setSlots([]); return }
    let active = true
    setLoadingSlots(true)
    const tz = new Date().getTimezoneOffset()
    fetch(`/api/appointments/availability/public?${qs({ service_id: serviceId, staff_profile_id: staffId, date: dateStr, tz: String(tz) })}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => { if (active) setSlots(res?.slots || []) })
      .catch(() => { if (active) setSlots([]) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, staffId, dateStr])

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId) || null, [services, serviceId])
  const selectedStaff = useMemo(() => staff.find((p) => p.id === staffId) || null, [staff, staffId])

  // Categorías de servicios disponibles para filtrar
  const categoriesList = useMemo(() => {
    const set = new Set<string>()
    services.forEach((s) => {
      if (s.category) set.add(s.category)
    })
    return Array.from(set)
  }, [services])

  // Servicios filtrados
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchService.toLowerCase()) || 
        (s.description || '').toLowerCase().includes(searchService.toLowerCase())
      const matchesCategory = !selectedCategory || s.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [services, searchService, selectedCategory])

  // Agrupado de horarios (slots) por mañana, tarde y noche
  const groupedSlots = useMemo(() => {
    const morning: Slot[] = []
    const afternoon: Slot[] = []
    const evening: Slot[] = []
    
    slots.forEach((s) => {
      const date = new Date(s.start_at)
      const hour = date.getHours()
      if (hour < 12) {
        morning.push(s)
      } else if (hour < 18) {
        afternoon.push(s)
      } else {
        evening.push(s)
      }
    })
    
    return { morning, afternoon, evening }
  }, [slots])

  const handleSelectService = (id: string) => {
    setServiceId(id)
    setStep(2)
  }

  const handleSelectStaff = (id: string) => {
    setStaffId(id)
    setStep(3)
  }

  const handleSelectSlot = (s: Slot) => {
    setSlot(s)
    setStep(4)
  }

  const handleSubmit = async () => {
    setError(null)
    if (!serviceId) return setError('Elegí un servicio')
    if (!staffId) return setError('Elegí un profesional')
    if (!slot) return setError('Elegí un horario')
    if (!name.trim()) return setError('Ingresá tu nombre')
    if (!phone.trim()) return setError('Ingresá tu teléfono')

    setSubmitting(true)
    try {
      const res = await fetch(`/api/appointments/public?${qs()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          staff_profile_id: staffId,
          start_at: slot.start_at,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'No se pudo reservar')
      setDone(slot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reservar')
    } finally {
      setSubmitting(false)
    }
  }

  // Si se completa la reserva, mostrar el Ticket de Éxito Premium
  if (done) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <NavBar
          config={config}
          activeSection="reservar"
          onNavigate={() => {}}
          vertical={vertical}
          showCartButton={false}
        />
        <div className="mx-auto flex min-h-[75vh] max-w-md flex-col items-center justify-center px-4 py-8">
          <div className="w-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-white shadow-xl dark:border-emerald-500/20 dark:bg-slate-950">
            {/* Encabezado del Ticket */}
            <div className="bg-emerald-600 px-6 py-8 text-center text-white dark:bg-emerald-950/60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight">¡Turno Reservado!</h1>
              <p className="mt-1 text-xs text-emerald-100">Pendiente de confirmación</p>
            </div>

            {/* Cuerpo del Ticket */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Establecimiento</p>
                <h2 className="text-lg font-bold text-foreground">{orgName}</h2>
              </div>

              <hr className="border-dashed border-border" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Servicio</p>
                  <p className="font-bold text-foreground">{selectedService?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedService?.duration_min} min</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Precio</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(selectedService?.price || 0), '')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profesional</p>
                  <p className="font-semibold text-foreground">{selectedStaff?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Fecha y Hora</p>
                  <p className="font-semibold text-foreground capitalize">{next7Days.find(d => d.key === dateStr) ? prettyDate(dateStr).split(',')[1] || prettyDate(dateStr) : prettyDate(dateStr)}</p>
                  <p className="text-xs font-bold text-foreground">{timeRange(done).split(' a ')[0]}</p>
                </div>
              </div>

              {/* Separador de ticket con círculos laterales calados y línea de puntos */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute -left-9 h-6 w-6 rounded-full bg-slate-50 border-r border-border dark:bg-slate-900" />
                <div className="w-full border-t border-dashed border-border" />
                <div className="absolute -right-9 h-6 w-6 rounded-full bg-slate-50 border-l border-border dark:bg-slate-900" />
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-muted-foreground dark:bg-slate-900/40">
                <p>Te enviamos los detalles y te confirmaremos vía telefónica al:</p>
                <p className="mt-1 font-bold text-foreground">{phone}</p>
              </div>

              {/* Barcode estético */}
              <div className="flex flex-col items-center justify-center pt-2 opacity-35 dark:opacity-20">
                <div className="h-8 w-48 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#000_2px,#000_4px,transparent_4px,transparent_6px,#000_6px,#000_10px)] dark:bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#fff_2px,#fff_4px,transparent_4px,transparent_6px,#fff_6px,#fff_10px)]" />
                <span className="mt-1 text-[9px] tracking-[0.25em]">MIPOS-BOOKING-{organizationId.slice(0,6).toUpperCase()}</span>
              </div>
            </div>
          </div>

          <Button
            className="mt-6 w-full max-w-xs rounded-xl"
            variant="outline"
            onClick={() => {
              setDone(null)
              setSlot(null)
              setServiceId('')
              setStaffId('')
              setDateStr(todayStr())
              setStep(1)
              setName('')
              setPhone('')
              setEmail('')
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Reservar otro turno
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <NavBar
        config={config}
        activeSection="reservar"
        onNavigate={() => {}}
        vertical={vertical}
        showCartButton={false}
      />
      <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      {/* Cabecera / Info del Negocio */}
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-emerald-700 shadow-md shadow-emerald-500/10 dark:from-slate-100 dark:to-emerald-400 dark:shadow-none">
          <Scissors className="h-6 w-6 text-white dark:text-slate-950" />
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Reservar Turno
        </h1>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 mt-1">
          {orgName}
        </p>
      </div>

      {loadingLists ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-b-transparent" />
          <p className="text-xs text-muted-foreground">Cargando servicios y estilistas…</p>
        </div>
      ) : services.length === 0 || staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/50 p-8 text-center dark:bg-slate-950/20">
          <Scissors className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="mt-4 text-sm font-semibold text-foreground">Reservas no habilitadas</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Este comercio aún no cuenta con servicios o profesionales activos para reservas online.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* INDICADOR DE PROGRESO (WIZARD STEPS) */}
          <div className="relative flex items-center justify-between px-2 py-4">
            {/* Background progress line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-100 dark:bg-slate-800" />
            <div 
              className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-600 transition-all duration-300 dark:bg-emerald-400"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />

            {[
              { num: 1, label: 'Servicios', active: step >= 1 },
              { num: 2, label: 'Profesional', active: step >= 2 },
              { num: 3, label: 'Horario', active: step >= 3 },
              { num: 4, label: 'Confirmar', active: step >= 4 }
            ].map((s) => (
              <button
                key={s.num}
                type="button"
                disabled={step < s.num && !((s.num === 2 && serviceId) || (s.num === 3 && serviceId && staffId) || (s.num === 4 && serviceId && staffId && slot))}
                onClick={() => setStep(s.num)}
                className="relative z-10 flex flex-col items-center group cursor-pointer"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                    step === s.num
                      ? 'bg-slate-950 text-white ring-4 ring-emerald-500/20 dark:bg-slate-100 dark:text-slate-950 dark:ring-emerald-400/25'
                      : s.active
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                      : 'bg-slate-100 border border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600'
                  )}
                >
                  {s.num < step ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span className={cn(
                  'mt-2 text-[10px] font-bold uppercase tracking-wider transition-colors hidden sm:block',
                  step === s.num ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          {/* BOTÓN DE RETROCEDER (Solo si no está en el paso 1) */}
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-foreground transition-colors dark:text-slate-400"
            >
              <ChevronLeft className="h-4 w-4" /> Volver al paso anterior
            </button>
          )}

          {/* CONTENIDO DEL WIZARD SEGÚN EL PASO */}

          {/* ────────────────────────────────────────────────────────
              PASO 1: SELECCIONAR SERVICIO
              ──────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    1. Elegí el servicio
                  </h2>
                  <p className="text-xs text-muted-foreground">Seleccioná el servicio que deseas agendar.</p>
                </div>
                {/* Buscador */}
                <div className="relative w-full sm:w-48">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchService}
                    onChange={(e) => setSearchService(e.target.value)}
                    placeholder="Buscar servicio…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white/70 pl-8 pr-3 text-xs outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950/70"
                  />
                </div>
              </div>

              {/* Categorías (Pestañas) */}
              {categoriesList.length > 0 && (
                <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2 dark:border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                      !selectedCategory
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                    )}
                  >
                    Todos
                  </button>
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {filteredServices.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No se encontraron servicios con los filtros actuales.
                </p>
              ) : (
                <div className="grid gap-2.5">
                  {filteredServices.map((s) => {
                    const isSelected = serviceId === s.id
                    const borderAccent = s.color || '#10b981'
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectService(s.id)}
                        className={cn(
                          'group relative flex items-start justify-between gap-4 rounded-xl border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-950',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/5 dark:border-emerald-500 dark:bg-emerald-950/10'
                            : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                        )}
                        style={{ borderLeftColor: isSelected ? borderAccent : undefined, borderLeftWidth: isSelected ? 4 : undefined }}
                      >
                        <div className="min-w-0">
                          <span className="block text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {s.name}
                          </span>
                          {s.description && (
                            <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {s.description}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            <Clock className="h-3 w-3" />
                            {s.duration_min} minutos
                          </span>
                        </div>

                        <div className="text-right shrink-0 flex flex-col justify-between h-full min-h-[50px]">
                          <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                            {formatCurrency(Number(s.price), '')}
                          </span>
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border self-end transition-opacity',
                            isSelected 
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 group-hover:opacity-100 sm:opacity-0'
                          )}>
                            {isSelected ? 'Elegido' : 'Elegir'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              PASO 2: SELECCIONAR PROFESIONAL
              ──────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  2. Elegí el profesional
                </h2>
                <p className="text-xs text-muted-foreground">Selecciona quién se encargará de atenderte.</p>
              </div>

              {/* Resumen del paso anterior */}
              {selectedService && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900/40">
                  <span className="text-muted-foreground">Servicio elegido:</span>
                  <span className="font-bold text-foreground">{selectedService.name} · {formatCurrency(Number(selectedService.price), '')}</span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {staff.map((p) => {
                  const isSelected = staffId === p.id
                  const staffColor = p.color || '#6366f1'
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectStaff(p.id)}
                      className={cn(
                        'group flex items-center gap-3.5 rounded-xl border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-950',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/5 dark:border-emerald-500 dark:bg-emerald-950/10'
                          : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      )}
                    >
                      {/* Avatar */}
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black text-white shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: staffColor }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.specialty || 'Estilista Profesional'}
                        </span>
                      </div>

                      {/* Icono de check si está seleccionado */}
                      {isSelected && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              PASO 3: SELECCIONAR FECHA Y HORA
              ──────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  3. Elegí día y horario
                </h2>
                <p className="text-xs text-muted-foreground">Seleccioná la fecha y hora que te resulten más cómodas.</p>
              </div>

              {/* Resumen de los pasos anteriores */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900/40">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Servicio</span>
                  <span className="font-bold text-foreground block truncate">{selectedService?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px] uppercase">Profesional</span>
                  <span className="font-bold text-foreground block truncate">{selectedStaff?.name}</span>
                </div>
              </div>

              {/* CARRUSEL DE FECHAS PREMIUM */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Próximos días disponibles</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {next7Days.map((d) => {
                    const isSelected = dateStr === d.key
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setDateStr(d.key)}
                        className={cn(
                          'flex flex-col items-center justify-center shrink-0 w-16 py-2.5 rounded-xl border text-center transition-all duration-200',
                          isSelected
                            ? 'bg-slate-950 border-slate-950 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-950 shadow-md shadow-slate-950/10'
                            : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400'
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">{d.dayName}</span>
                        <span className="text-lg font-black leading-none mt-1">{d.dayNum}</span>
                        <span className="text-[9px] font-medium mt-0.5 opacity-80">{d.monthName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* O bien, un selector de calendario normal */}
              <div className="flex items-center gap-2 pt-1.5">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 mr-2">O elegí otra fecha:</span>
                <Input
                  type="date"
                  min={todayStr()}
                  value={dateStr}
                  onChange={(e) => e.target.value && setDateStr(e.target.value)}
                  className="w-auto h-9 text-xs rounded-lg px-2 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Título de fecha seleccionada */}
              <p className="text-sm font-bold capitalize text-foreground pt-2">
                {prettyDate(dateStr)}
              </p>

              {/* GRID DE HORARIOS DISPONIBLES */}
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-b-transparent" />
                  <p className="text-xs text-muted-foreground">Cargando horarios libres…</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10">
                  <CalendarDays className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
                  <p className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-300">No hay horarios libres este día</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Probá seleccionando otra fecha en el carrusel superior.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mañana */}
                  {groupedSlots.morning.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mañana</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {groupedSlots.morning.map((s) => (
                          <button
                            key={s.start_at}
                            type="button"
                            onClick={() => handleSelectSlot(s)}
                            className={cn(
                              'rounded-lg border py-2 text-center text-xs font-semibold transition-all duration-200',
                              slot?.start_at === s.start_at
                                ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500 dark:text-slate-950 shadow-sm shadow-emerald-500/10 font-bold scale-[1.02]'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tarde */}
                  {groupedSlots.afternoon.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tarde</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {groupedSlots.afternoon.map((s) => (
                          <button
                            key={s.start_at}
                            type="button"
                            onClick={() => handleSelectSlot(s)}
                            className={cn(
                              'rounded-lg border py-2 text-center text-xs font-semibold transition-all duration-200',
                              slot?.start_at === s.start_at
                                ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500 dark:text-slate-950 shadow-sm shadow-emerald-500/10 font-bold scale-[1.02]'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Noche */}
                  {groupedSlots.evening.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Noche</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {groupedSlots.evening.map((s) => (
                          <button
                            key={s.start_at}
                            type="button"
                            onClick={() => handleSelectSlot(s)}
                            className={cn(
                              'rounded-lg border py-2 text-center text-xs font-semibold transition-all duration-200',
                              slot?.start_at === s.start_at
                                ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-50 dark:border-emerald-500 dark:text-slate-950 shadow-sm shadow-emerald-500/10 font-bold scale-[1.02]'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────
              PASO 4: INGRESAR DATOS Y CONFIRMAR
              ──────────────────────────────────────────────────────── */}
          {step === 4 && slot && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  4. Completá tus datos
                </h2>
                <p className="text-xs text-muted-foreground">Completá el formulario para finalizar tu solicitud de reserva.</p>
              </div>

              {/* TICKET RESUMEN DE RESERVA */}
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="bg-slate-900 px-4 py-3 text-white dark:bg-slate-900/60">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resumen de tu Turno</p>
                </div>
                <div className="p-4 space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground">Servicio</p>
                      <p className="font-bold text-foreground">{selectedService?.name}</p>
                      <p className="text-[11px] text-muted-foreground">{selectedService?.duration_min} minutos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Costo</p>
                      <p className="font-extrabold text-foreground">{formatCurrency(Number(selectedService?.price || 0), '')}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground">Profesional</p>
                      <p className="font-semibold text-foreground">{selectedStaff?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Fecha y Hora</p>
                      <p className="font-semibold text-foreground capitalize">
                        {next7Days.find(d => d.key === dateStr) ? prettyDate(dateStr).split(',')[1] || prettyDate(dateStr) : prettyDate(dateStr)}
                      </p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{timeRange(slot).split(' a ')[0]} hs</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORMULARIO */}
              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white/60 p-5 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/40">
                <div className="space-y-2">
                  <Label htmlFor="bk-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tu nombre completo *</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="bk-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Eduardo Giménez"
                      className="pl-10 h-11 border-slate-200 bg-white/70 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950/70"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bk-phone" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tu número de teléfono *</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="bk-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: 0981 123 456"
                      className="pl-10 h-11 border-slate-200 bg-white/70 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950/70"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bk-email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tu email opcional</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="bk-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej: cliente@email.com"
                      className="pl-10 h-11 border-slate-200 bg-white/70 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950/70"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-semibold text-destructive text-center rounded-lg bg-destructive/10 py-2">
                    {error}
                  </p>
                )}

                <Button
                  className="w-full h-11 rounded-xl bg-slate-950 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-500/5 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2 justify-center">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Reservando…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <Check className="h-4 w-4" /> Confirmar turno
                    </span>
                  )}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Al confirmar, tu turno se guarda y tus datos quedan vinculados al historial del cliente para futuras reservas.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
