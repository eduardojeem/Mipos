'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Trash2, Loader2 } from 'lucide-react'

export type StaffException = {
  id: string
  date: string
  reason: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffProfileId: string | null
  staffName: string
}

export function StaffExceptionsModal({ open, onOpenChange, staffProfileId, staffName }: Props) {
  const [exceptions, setExceptions] = useState<StaffException[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && staffProfileId) {
      loadExceptions()
    } else {
      setExceptions([])
      setDate('')
      setReason('')
      setError(null)
    }
  }, [open, staffProfileId])

  async function loadExceptions() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/${staffProfileId}/exceptions`)
      if (!res.ok) throw new Error('Error al cargar excepciones')
      const data = await res.json()
      setExceptions(data.exceptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!date) return setError('Seleccioná una fecha')
    if (!reason.trim()) return setError('Ingresá un motivo')
    
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/staff/${staffProfileId}/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason: reason.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      
      setExceptions(prev => [...prev, data.exception].sort((a, b) => a.date.localeCompare(b.date)))
      setDate('')
      setReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta excepción? El profesional volverá a estar disponible ese día.')) return
    
    setError(null)
    try {
      const res = await fetch(`/api/staff/${staffProfileId}/exceptions?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar')
      }
      setExceptions(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Días Libres / Excepciones</DialogTitle>
          <DialogDescription>
            Gestioná los días que <strong>{staffName}</strong> no estará disponible (vacaciones, enfermedad, etc).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
            <h4 className="text-sm font-semibold">Agregar nuevo día</h4>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="exc-date">Fecha</Label>
                <Input id="exc-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exc-reason">Motivo</Label>
                <Input id="exc-reason" placeholder="Ej: Vacaciones" value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <Button onClick={handleAdd} disabled={saving || !date || !reason}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agregar'}
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Fechas registradas</h4>
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                No hay excepciones registradas.
              </p>
            ) : (
              <div className="space-y-2">
                {exceptions.map(exc => {
                  const d = new Date(exc.date + 'T00:00:00') // Para evitar desfase por timezone
                  return (
                    <div key={exc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-xs text-muted-foreground">{exc.reason}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(exc.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
