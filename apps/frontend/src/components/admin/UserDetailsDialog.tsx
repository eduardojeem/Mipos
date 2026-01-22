'use client'

import React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Mail, Phone, Calendar, Shield, CheckCircle, AlertTriangle,
  Clock, Activity, Award, Key, Lock
} from 'lucide-react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatar?: string
  phone?: string
  roles: Array<{
    id: string
    name: string
    displayName: string
    color: string
  }>
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
  lastLogin?: string
  createdAt: string
  updatedAt: string
  loginAttempts: number
  isEmailVerified: boolean
  twoFactorEnabled: boolean
}

interface UserDetailsDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 border-gray-200',
  SUSPENDED: 'bg-red-100 text-red-800 border-red-200',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

const STATUS_LABELS = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
  PENDING: 'Pendiente'
}

export default function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalles del Usuario</DialogTitle>
          <DialogDescription>
            Información completa del usuario seleccionado
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header con Avatar */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-2xl">
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{user.fullName}</h3>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={STATUS_COLORS[user.status]}>
                    {STATUS_LABELS[user.status]}
                  </Badge>
                  {user.roles.map(role => (
                    <Badge key={role.id} variant="outline">
                      {role.displayName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Información de Contacto
              </h4>
              <div className="space-y-2 pl-6">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                  {user.isEmailVerified && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Seguridad */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Seguridad
              </h4>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email verificado</span>
                  {user.isEmailVerified ? (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Sin verificar
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Autenticación de dos factores</span>
                  {user.twoFactorEnabled ? (
                    <Badge variant="outline" className="text-blue-600">
                      <Lock className="w-3 h-3 mr-1" />
                      Habilitado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">
                      Deshabilitado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Intentos de inicio de sesión</span>
                  <Badge variant="outline">
                    {user.loginAttempts}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actividad */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Actividad
              </h4>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Último acceso</span>
                  <span className="text-sm font-medium">
                    {user.lastLogin ? (
                      <>
                        {new Date(user.lastLogin).toLocaleDateString('es-PY')} {' '}
                        {new Date(user.lastLogin).toLocaleTimeString('es-PY')}
                      </>
                    ) : (
                      'Nunca'
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fecha de creación</span>
                  <span className="text-sm font-medium">
                    {new Date(user.createdAt).toLocaleDateString('es-PY')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Última actualización</span>
                  <span className="text-sm font-medium">
                    {new Date(user.updatedAt).toLocaleDateString('es-PY')}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Roles y Permisos */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Roles y Permisos
              </h4>
              <div className="space-y-2 pl-6">
                {user.roles.map(role => (
                  <div key={role.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium">{role.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      Rol: {role.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
