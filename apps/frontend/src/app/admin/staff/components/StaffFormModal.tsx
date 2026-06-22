'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StaffMember, AvailableUser, StaffInput, WorkingHour } from '../hooks/useStaff'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffMember | null
  availableUsers: AvailableUser[]
  isSaving: boolean
  onSubmit: (input: StaffInput) => Promise<unknown>
}

// Orden de visualización Lunes→Domingo, con su day_of_week (0=Dom).
const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: 'Lunes' },
  { dow: 2, label: 'Martes' },
  { dow: 3, label: 'Miércoles' },
  { dow: 4, label: 'Jueves' },
  { dow: 5, label: 'Viernes' },
  { dow: 6, label: 'Sábado' },
  { dow: 0, label: 'Domingo' },
]

type DayBlock = { start: string; end: string }
type DayRow = { enabled: boolean; blocks: DayBlock[] }
type DaysState = Record<number, DayRow>

function emptyDays(): DaysState {
  const s: DaysState = {}
  for (const d of DAYS) s[d.dow] = { enabled: false, blocks: [{ start: '09:00', end: '18:00' }] }
  return s
}

function daysFromHours(hours: WorkingHour[]): DaysState {
  const s = emptyDays()
  // Group blocks by day
  const blocksByDay: Record<number, DayBlock[]> = {}
  for (const h of hours) {
    if (!blocksByDay[h.day_of_week]) blocksByDay[h.day_of_week] = []
    blocksByDay[h.day_of_week].push({ start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) })
  }
  
  for (const d of DAYS) {
    if (blocksByDay[d.dow]) {
      s[d.dow] = { enabled: true, blocks: blocksByDay[d.dow] }
    }
  }
  return s
}

export function StaffFormModal({ open, onOpenChange, staff, availableUsers, isSaving, onSubmit }: Props) {
  const isEdit = !!staff
  const [userId, setUserId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [commission, setCommission] = useState('0')
  const [color, setColor] = useState('#6366f1')
  const [isActive, setIsActive] = useState(true)
  const [walkinOnly, setWalkinOnly] = useState(false)
  const [days, setDays] = useState<DaysState>(emptyDays())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (staff) {
      setUserId(staff.user_id)
      setDisplayName(staff.display_name ?? '')
      setSpecialty(staff.specialty ?? '')
      setCommission(String(staff.commission_pct))
      setColor(staff.color ?? '#6366f1')
      setIsActive(staff.is_active)
      setWalkinOnly(staff.walkin_only ?? false)
      setDays(daysFromHours(staff.working_hours))
    } else {
      setUserId('')
      setDisplayName('')
      setSpecialty('')
      setCommission('0')
      setColor('#6366f1')
      setIsActive(true)
      setWalkinOnly(false)
      setDays(emptyDays())
    }
  }, [open, staff])

  const setDay = (dow: number, patch: Partial<DayRow>) =>
    setDays((prev) => ({ ...prev, [dow]: { ...prev[dow], ...patch } }))

  const setDayBlock = (dow: number, blockIndex: number, patch: Partial<DayBlock>) =>
    setDays((prev) => {
      const newBlocks = [...prev[dow].blocks]
      newBlocks[blockIndex] = { ...newBlocks[blockIndex], ...patch }
      return { ...prev, [dow]: { ...prev[dow], blocks: newBlocks } }
    })

  const addDayBlock = (dow: number) =>
    setDays((prev) => {
      const newBlocks = [...prev[dow].blocks, { start: '14:00', end: '18:00' }]
      return { ...prev, [dow]: { ...prev[dow], blocks: newBlocks } }
    })

  const removeDayBlock = (dow: number, blockIndex: number) =>
    setDays((prev) => {
      const newBlocks = prev[dow].blocks.filter((_, i) => i !== blockIndex)
      return { ...prev, [dow]: { ...prev[dow], blocks: newBlocks } }
    })

  const userName = useMemo(() => {
    if (staff) return staff.user?.full_name || staff.user?.email || 'Profesional'
    const u = availableUsers.find((x) => x.id === userId)
    return u ? u.full_name || u.email : ''
  }, [staff, availableUsers, userId])

  const handleSave = async () => {
    setError(null)
    if (!isEdit && !userId) return setError('Seleccioná un usuario')

    const commissionNum = Number(commission)
    if (!Number.isFinite(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      return setError('La comisión debe estar entre 0 y 100')
    }

    const working_hours: WorkingHour[] = []
    for (const d of DAYS) {
      const row = days[d.dow]
      if (!row.enabled) continue
      for (const block of row.blocks) {
        if (block.end <= block.start) return setError(`En ${d.label}, la hora de fin debe ser mayor a la de inicio`)
        working_hours.push({ day_of_week: d.dow, start_time: block.start, end_time: block.end })
      }
    }

    const input: StaffInput = {
      ...(isEdit ? {} : { user_id: userId }),
      display_name: displayName.trim() || null,
      specialty: specialty.trim() || null,
      commission_pct: commissionNum,
      color: color || null,
      is_active: isActive,
      walkin_only: walkinOnly,
      working_hours,
    }

    try {
      await onSubmit(input)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${userName}` : 'Agregar profesional'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualizá los datos y el horario de atención.'
              : 'Elegí un usuario de la empresa y configuralo como profesional agendable.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Usuario *</Label>
              {availableUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    No hay usuarios registrados en la empresa que aún no sean profesionales. Primero debés agregar al miembro del equipo como usuario.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="w-full text-xs font-semibold rounded-lg"
                    onClick={() => {
                      onOpenChange(false)
                      window.location.href = '/admin/users-roles'
                    }}
                  >
                    Gestionar Usuarios y Roles
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger><SelectValue placeholder="Seleccioná un usuario…" /></SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email} <span className="text-muted-foreground">· {u.email}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    ¿No encontrás a la persona?{' '}
                    <button 
                      type="button" 
                      onClick={() => {
                        onOpenChange(false)
                        window.location.href = '/admin/users-roles'
                      }} 
                      className="text-primary hover:underline font-semibold"
                    >
                      Crear nuevo usuario
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-specialty">Especialidad</Label>
              <Input id="st-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Barbero, Colorista…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-commission">Comisión (%)</Label>
              <Input id="st-commission" type="number" min={0} max={100} step="any" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-display">Nombre en agenda</Label>
              <Input id="st-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="(opcional) override del nombre" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-color">Color en agenda</Label>
              <div className="flex items-center gap-2">
                <input id="st-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-input bg-background" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Horario de atención</Label>
            <div className="space-y-3 rounded-lg border border-border p-4">
              {DAYS.map((d) => {
                const row = days[d.dow]
                return (
                  <div key={d.dow} className="flex flex-col gap-2 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 w-32">
                        <Switch checked={row.enabled} onCheckedChange={(v) => setDay(d.dow, { enabled: v })} />
                        <span className={`text-sm font-medium ${row.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{d.label}</span>
                      </div>
                      {row.enabled && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => addDayBlock(d.dow)} className="h-6 text-xs px-2">
                          + Agregar horario
                        </Button>
                      )}
                    </div>
                    {row.enabled && (
                      <div className="pl-12 space-y-2">
                        {row.blocks.map((block, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input type="time" value={block.start} onChange={(e) => setDayBlock(d.dow, idx, { start: e.target.value })} className="h-8 w-32" />
                            <span className="text-muted-foreground text-sm">a</span>
                            <Input type="time" value={block.end} onChange={(e) => setDayBlock(d.dow, idx, { end: e.target.value })} className="h-8 w-32" />
                            {row.blocks.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeDayBlock(d.dow, idx)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                ✕
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="st-active" className="text-sm font-medium">Profesional activo</Label>
                <p className="text-xs text-muted-foreground">Los inactivos no aparecen en la agenda.</p>
              </div>
              <Switch id="st-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <Label htmlFor="st-walkin" className="text-sm font-medium">Atiende por orden de llegada</Label>
                <p className="text-xs text-muted-foreground">Si se activa, el público no podrá agendar turnos online con este profesional.</p>
              </div>
              <Switch id="st-walkin" checked={walkinOnly} onCheckedChange={setWalkinOnly} />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || (!isEdit && availableUsers.length === 0)}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
