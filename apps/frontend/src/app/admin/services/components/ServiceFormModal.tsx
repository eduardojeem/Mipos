'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { Service, ServiceInput } from '../hooks/useServices'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  isSaving: boolean
  onSubmit: (input: ServiceInput) => Promise<unknown>
}

type FormState = {
  name: string
  category: string
  durationMin: string
  price: string
  description: string
  color: string
  isActive: boolean
}

const EMPTY: FormState = {
  name: '',
  category: '',
  durationMin: '30',
  price: '0',
  description: '',
  color: '#10b981',
  isActive: true,
}

export function ServiceFormModal({ open, onOpenChange, service, isSaving, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      service
        ? {
            name: service.name,
            category: service.category ?? '',
            durationMin: String(service.duration_min),
            price: String(service.price),
            description: service.description ?? '',
            color: service.color ?? '#10b981',
            isActive: service.is_active,
          }
        : EMPTY,
    )
  }, [open, service])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setError(null)
    const name = form.name.trim()
    const duration = Number(form.durationMin)
    const price = Number(form.price)

    if (!name) return setError('El nombre es requerido')
    if (!Number.isFinite(duration) || duration <= 0) return setError('La duración debe ser mayor a 0 minutos')
    if (!Number.isFinite(price) || price < 0) return setError('El precio no puede ser negativo')

    try {
      await onSubmit({
        name,
        category: form.category.trim() || null,
        duration_min: Math.round(duration),
        price,
        description: form.description.trim() || null,
        color: form.color || null,
        is_active: form.isActive,
      })
      onOpenChange(false)
    } catch (err) {
      // El toast de error ya lo emite el hook; mostramos también inline.
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          <DialogDescription>
            Definí el servicio que ofrece tu barbería. La duración se usa para la agenda de turnos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">Nombre *</Label>
            <Input id="svc-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Corte de cabello" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-duration">Duración (min) *</Label>
              <Input id="svc-duration" type="number" min={1} value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">Precio *</Label>
              <Input id="svc-price" type="number" min={0} step="any" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-category">Categoría</Label>
              <Input id="svc-category" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Corte, Color, Barba…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-color">Color en agenda</Label>
              <div className="flex items-center gap-2">
                <input
                  id="svc-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => set('color', e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
                />
                <Input value={form.color} onChange={(e) => set('color', e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-desc">Descripción</Label>
            <Textarea id="svc-desc" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Opcional" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="svc-active" className="text-sm font-medium">Servicio activo</Label>
              <p className="text-xs text-muted-foreground">Los inactivos no se pueden agendar ni cobrar.</p>
            </div>
            <Switch id="svc-active" checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
