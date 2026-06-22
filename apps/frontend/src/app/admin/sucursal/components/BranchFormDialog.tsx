'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Branch, BranchInput } from '../hooks/useBranches'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: Branch | null
  isSaving: boolean
  onSubmit: (input: BranchInput) => Promise<unknown>
}

type FormState = {
  name: string
  address: string
  phone: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  address: '',
  phone: '',
  isActive: true,
}

export function BranchFormDialog({ open, onOpenChange, branch, isSaving, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setError(null)
    setForm(
      branch
        ? {
            name: branch.name,
            address: branch.address ?? '',
            phone: branch.phone ?? '',
            isActive: branch.is_active,
          }
        : EMPTY_FORM,
    )
  }, [open, branch])

  const setValue = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    const name = form.name.trim()

    if (name.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.')
      return
    }

    setError(null)

    try {
      await onSubmit({
        name,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        ...(branch ? { is_active: form.isActive } : {}),
      })
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la sucursal.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{branch ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          <DialogDescription>
            Centralizá los datos operativos de cada sede. El slug se genera automáticamente a partir del nombre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">Nombre</Label>
            <Input
              id="branch-name"
              autoFocus
              value={form.name}
              onChange={(event) => setValue('name', event.target.value)}
              placeholder="Casa central"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-address">Dirección</Label>
            <Input
              id="branch-address"
              value={form.address}
              onChange={(event) => setValue('address', event.target.value)}
              placeholder="Av. Principal 123"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-phone">Teléfono</Label>
            <Input
              id="branch-phone"
              value={form.phone}
              onChange={(event) => setValue('phone', event.target.value)}
              placeholder="+595 981 000000"
            />
          </div>

          {branch ? (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="branch-active" className="text-sm font-medium">
                  Sucursal activa
                </Label>
                <p className="text-xs text-muted-foreground">
                  Las sucursales inactivas dejan de aparecer como opción operativa.
                </p>
              </div>
              <Switch
                id="branch-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : branch ? 'Guardar cambios' : 'Crear sucursal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
