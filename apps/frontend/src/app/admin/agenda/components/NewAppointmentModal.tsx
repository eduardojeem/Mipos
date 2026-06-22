'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, Check, Clock3, DollarSign, Loader2, Scissors, Search, UserPlus, UserRound, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'
import { useCreateCustomer, useCustomerSearch } from '@/hooks/useOptimizedCustomers'
import type { UICustomer } from '@/types/customer-page'
import { useServices } from '@/app/admin/services/hooks/useServices'
import { useStaff } from '@/app/admin/staff/hooks/useStaff'
import { fetchAvailability, type NewAppointmentInput, type Slot } from '../hooks/useAppointments'
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateStr: string
  isCreating: boolean
  onSubmit: (input: NewAppointmentInput) => Promise<unknown>
  defaultStaffId?: string
  defaultCustomer?: {
    id?: string | null
    name?: string | null
    phone?: string | null
    email?: string | null
  } | null
}

export function NewAppointmentModal({ open, onOpenChange, dateStr, isCreating, onSubmit, defaultStaffId, defaultCustomer }: Props) {
  const orgId = useCurrentOrganizationId()
  const formatCurrency = useCurrencyFormatter()
  const createCustomer = useCreateCustomer()
  const { services } = useServices()
  const { staff } = useStaff()

  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeServices = useMemo(
    () => [...services].filter((s) => s.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    [services],
  )
  const activeStaff = useMemo(
    () =>
      [...staff]
        .filter((s) => s.is_active)
        .sort((a, b) =>
          (a.display_name || a.user?.full_name || '').localeCompare(b.display_name || b.user?.full_name || ''),
        ),
    [staff],
  )
  const selectedService = useMemo(
    () => activeServices.find((service) => service.id === serviceId) || null,
    [activeServices, serviceId],
  )
  const selectedStaff = useMemo(
    () => activeStaff.find((member) => member.id === staffId) || null,
    [activeStaff, staffId],
  )

  useEffect(() => {
    if (!open) return
    setServiceId('')
    setStaffId(defaultStaffId || '')
    setSlot(null)
    setCustomerSearch(defaultCustomer?.name || '')
    setCustomerName(defaultCustomer?.name || '')
    setCustomerId(defaultCustomer?.id || null)
    setCustomerPhone(defaultCustomer?.phone || '')
    setCustomerEmail(defaultCustomer?.email || '')
    setNotes('')
    setError(null)
  }, [open, defaultStaffId, defaultCustomer])

  // Cambiar servicio/profesional invalida el slot elegido
  useEffect(() => { setSlot(null) }, [serviceId, staffId])

  const availabilityQuery = useQuery({
    queryKey: ['availability', orgId, staffId, serviceId, dateStr],
    queryFn: () => fetchAvailability(orgId!, staffId, serviceId, dateStr),
    enabled: open && !!orgId && !!staffId && !!serviceId,
    staleTime: 5_000,
  })

  const slots = availabilityQuery.data ?? []
  const availableSlotCount = slots.length
  const customerSearchQuery = useCustomerSearch({
    q: open ? customerSearch : '',
    limit: 8,
  })
  const customerResults = customerSearchQuery.data?.results ?? []
  const dateLabel = useMemo(() => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const value = new Date(year, month - 1, day)
    return value.toLocaleDateString('es-PY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }, [dateStr])

  const handleSave = async () => {
    setError(null)
    if (!serviceId) return setError('Elegí un servicio')
    if (!staffId) return setError('Elegí un profesional')
    if (!slot) return setError('Elegí un horario disponible')

    try {
      await onSubmit({
        staff_profile_id: staffId,
        service_id: serviceId,
        start_at: slot.start_at,
        end_at: slot.end_at,
        customer_id: customerId,
        customer_name: customerId ? null : customerName.trim() || null,
        customer_phone: customerId ? null : customerPhone.trim() || null,
        customer_email: customerId ? null : customerEmail.trim() || null,
        notes: notes.trim() || null,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agendar')
    }
  }

  const noStaff = activeStaff.length === 0
  const noServices = activeServices.length === 0
  const customerHelperText = customerId
    ? 'Cliente existente vinculado al turno.'
    : 'Buscá primero en tu base y, si no existe, podés crearlo desde este mismo formulario.'

  const handleSelectCustomer = (customer: UICustomer) => {
    setCustomerId(customer.id)
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone || '')
    setCustomerEmail(customer.email || '')
    setCustomerSearch(customer.name)
    setError(null)
  }

  const handleCreateCustomer = async () => {
    const trimmedName = customerName.trim()
    const trimmedPhone = customerPhone.trim()
    const trimmedEmail = customerEmail.trim().toLowerCase()

    if (!trimmedName) {
      setError('Ingresá el nombre para crear el cliente')
      return
    }

    try {
      const created = await createCustomer.mutateAsync({
        name: trimmedName,
        phone: trimmedPhone || null,
        email: trimmedEmail || null,
        customerType: 'regular',
        is_active: true,
      })

      setCustomerId(created.id)
      setCustomerName(created.name)
      setCustomerPhone(created.phone || '')
      setCustomerEmail(created.email || '')
      setCustomerSearch(created.name)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
          <DialogDescription>Armá el turno con servicio, profesional y horario disponible para la fecha elegida.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Fecha del turno
                </p>
                <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedService ? 'default' : 'outline'}>
                  {selectedService ? 'Servicio listo' : 'Elegí servicio'}
                </Badge>
                <Badge variant={selectedStaff ? 'default' : 'outline'}>
                  {selectedStaff ? 'Profesional listo' : 'Elegí profesional'}
                </Badge>
                <Badge variant={slot ? 'default' : 'outline'}>
                  {slot ? 'Horario listo' : 'Elegí horario'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {noServices || noStaff ? (
            <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              {noServices ? 'Primero cargá al menos un servicio activo. ' : ''}
              {noStaff ? 'Primero cargá al menos un profesional activo.' : ''}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label>Servicio *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Elegí un servicio…" /></SelectTrigger>
              <SelectContent>
                {activeServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · {s.duration_min} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-medium">
                      <Scissors className="h-4 w-4 text-primary" />
                      {selectedService.name}
                    </p>
                    {selectedService.description ? (
                      <p className="text-xs text-muted-foreground">{selectedService.description}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="flex items-center justify-end gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {selectedService.duration_min} min
                    </p>
                    <p className="mt-1 flex items-center justify-end gap-1 font-medium text-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      {formatCurrency(Number(selectedService.price || 0))}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Elegí el servicio para calcular duración, precio y horarios.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Profesional *</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue placeholder="Elegí un profesional…" /></SelectTrigger>
              <SelectContent>
                {activeStaff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.display_name || s.user?.full_name || s.user?.email || 'Profesional'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStaff ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <UserRound className="h-4 w-4 text-primary" />
                  {selectedStaff.display_name || selectedStaff.user?.full_name || selectedStaff.user?.email || 'Profesional'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedStaff.specialty?.trim()
                    ? `Especialidad: ${selectedStaff.specialty}`
                    : 'Sin especialidad cargada.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Elegí quién va a atender el turno para calcular disponibilidad real.</p>
            )}
          </div>

          {serviceId && staffId ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label>Horario disponible *</Label>
                {availabilityQuery.isSuccess ? (
                  <span className="text-xs text-muted-foreground">
                    {availableSlotCount} horario{availableSlotCount === 1 ? '' : 's'} disponible{availableSlotCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              {availabilityQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Calculando disponibilidad…</p>
              ) : availabilityQuery.isError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  No se pudo calcular la disponibilidad. Probá cerrar y volver a abrir el formulario o revisar los horarios del profesional.
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No hay horarios disponibles ese día. Revisá los horarios del profesional o elegí otra fecha.
                </p>
              ) : (
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s.start_at}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                        slot?.start_at === s.start_at
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="ap-customer-search">Cliente</Label>
              {customerId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setCustomerSearch('')
                    setCustomerId(null)
                    setCustomerName('')
                    setCustomerPhone('')
                    setCustomerEmail('')
                  }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Quitar cliente
                </Button>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Buscar cliente existente</p>
                <p className="text-xs text-muted-foreground">
                  Buscá por nombre, teléfono, email o código para vincular un cliente ya cargado.
                </p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ap-customer-search"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    if (customerId) {
                      setCustomerId(null)
                    }
                  }}
                  placeholder="Ej: Juan, 0981..., mail@cliente.com"
                  className="pl-9"
                />
              </div>
              {customerSearch.trim().length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Empezá escribiendo para ver coincidencias reales de tu base de clientes.
                </p>
              ) : customerSearchQuery.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando clientes...
                </div>
              ) : customerSearchQuery.isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  No se pudo buscar clientes en este momento.
                </div>
              ) : customerResults.length > 0 ? (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {customerResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className={cn(
                        'flex w-full items-start justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                        customerId === customer.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border/60 hover:bg-muted/50',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{customer.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {customer.phone || 'Sin teléfono'} {customer.email ? `· ${customer.email}` : ''}
                        </p>
                      </div>
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', customerId === customer.id ? 'opacity-100' : 'opacity-0')} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No encontramos clientes con ese criterio.
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">{customerHelperText}</p>

            <Separator />

            <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-background p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nuevo cliente</p>
                <p className="text-xs text-muted-foreground">
                  Si no aparece en la búsqueda, podés cargarlo ahora y dejarlo ya guardado en el sistema.
                </p>
              </div>

              {!customerId && customerSearch.trim() && !customerName.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setCustomerName(customerSearch.trim())}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Usar &quot;{customerSearch.trim()}&quot; como nuevo cliente
                </Button>
              ) : null}

              {!customerId ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id="ap-customer"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value)
                        setCustomerId(null)
                      }}
                      placeholder="Nombre del cliente"
                      className="sm:col-span-2"
                    />
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Teléfono"
                    />
                    <Input
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email opcional"
                      type="email"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateCustomer}
                      disabled={createCustomer.isPending || !customerName.trim()}
                    >
                      {createCustomer.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      Crear y seleccionar cliente
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      También podés guardar el turno y se intentará vincular o crear automáticamente si cargás teléfono o email.
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                  <p className="font-medium">{customerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {customerPhone || 'Sin teléfono'} {customerEmail ? `· ${customerEmail}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-notes">Notas</Label>
            <Textarea id="ap-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Opcional" />
          </div>

          {selectedService && selectedStaff && slot ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Servicio</p>
                  <p className="mt-1 text-sm font-medium">{selectedService.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedService.duration_min} min</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profesional</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedStaff.display_name || selectedStaff.user?.full_name || selectedStaff.user?.email || 'Profesional'}
                  </p>
                  {selectedStaff.specialty ? (
                    <p className="mt-1 text-xs text-muted-foreground">{selectedStaff.specialty}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Turno</p>
                  <p className="mt-1 text-sm font-medium capitalize">{dateLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{slot.label}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</p>
                  <p className="mt-1 text-sm font-medium">{customerName.trim() || 'Sin cliente asignado'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {customerId ? 'Cliente existente' : 'Carga manual o pendiente'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isCreating || !slot || availabilityQuery.isError}>
            {isCreating ? 'Agendando…' : 'Agendar turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
