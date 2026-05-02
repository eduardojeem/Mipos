'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User as CompanyUser } from '@/lib/services/admin-api'

export type CompanyRole = 'OWNER' | 'ADMIN' | 'SELLER' | 'WAREHOUSE'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type UserFormState = {
  name: string
  email: string
  role: CompanyRole
  status: UserStatus
  password: string
}

export const INITIAL_FORM: UserFormState = {
  name: '',
  email: '',
  role: 'SELLER',
  status: 'ACTIVE',
  password: '',
}

export const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'SUSPENDED', label: 'Suspendido' },
]

export function normalizeStatus(status?: string): UserStatus {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'INACTIVE') return 'INACTIVE'
  if (normalized === 'SUSPENDED') return 'SUSPENDED'
  return 'ACTIVE'
}

export function normalizeRole(role?: string): CompanyRole {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'WAREHOUSE') return 'WAREHOUSE'
  return 'SELLER'
}

interface UserFormDialogProps {
  isOpen: boolean
  onClose: () => void
  editingUser: CompanyUser | null
  availableRoles: Array<{ value: CompanyRole; label: string; description: string }>
  isMutating: boolean
  onSubmit: (data: UserFormState) => void
}

export function UserFormDialog({
  isOpen,
  onClose,
  editingUser,
  availableRoles,
  isMutating,
  onSubmit,
}: UserFormDialogProps) {
  const [form, setForm] = useState<UserFormState>(INITIAL_FORM)

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setForm({
          name: editingUser.name,
          email: editingUser.email,
          role: normalizeRole(editingUser.role),
          status: normalizeStatus(editingUser.status),
          password: '',
        })
      } else {
        setForm(INITIAL_FORM)
      }
    }
  }, [isOpen, editingUser])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {editingUser
              ? 'Actualiza identidad, rol y estado dentro de la organizacion actual.'
              : 'Crea un miembro nuevo usando los roles reales del sistema de empresa.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Ana Perez" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="usuario@empresa.com" />
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as CompanyRole }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {availableRoles.find((role) => role.value === form.role)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as UserStatus }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">{editingUser ? 'Nueva contrasena opcional' : 'Contrasena inicial'}</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={editingUser ? 'Solo si quieres reemplazarla' : 'Minimo 8 caracteres'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMutating}>Cancelar</Button>
          <Button onClick={() => onSubmit(form)} disabled={isMutating}>
            {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingUser ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteUserDialogProps {
  userId: string | null
  users: CompanyUser[]
  isDeleting: boolean
  onClose: () => void
  onConfirm: (user: CompanyUser) => void
}

export function DeleteUserDialog({
  userId,
  users,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteUserDialogProps) {
  return (
    <Dialog open={Boolean(userId)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remover usuario</DialogTitle>
          <DialogDescription>
            Esta accion quita la membresia de la organizacion actual. El acceso puede seguir existiendo en otras empresas si el usuario tiene otras vinculaciones.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => {
              const target = users.find((item) => item.id === userId)
              if (target) {
                onConfirm(target)
              }
            }}
            disabled={!userId || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
