'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  History, LogIn, LogOut, Edit, Trash2, Plus, Shield,
  AlertTriangle, CheckCircle, RefreshCw, Clock
} from 'lucide-react'

interface User {
  id: string
  fullName: string
  email: string
}

interface ActivityLog {
  id: string
  action: string
  description: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'warning' | 'error'
}

interface UserActivityDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTIVITY_ICONS = {
  login: LogIn,
  logout: LogOut,
  create: Plus,
  update: Edit,
  delete: Trash2,
  security: Shield,
  default: History
}

const STATUS_COLORS = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200'
}

const STATUS_ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle
}

export default function UserActivityDialog({ user, open, onOpenChange }: UserActivityDialogProps) {
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<ActivityLog[]>([])

  useEffect(() => {
    if (open && user) {
      loadActivities()
    }
  }, [open, user])

  const loadActivities = async () => {
    setLoading(true)
    try {
      // Simular carga de datos
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Datos de ejemplo
      const mockActivities: ActivityLog[] = [
        {
          id: '1',
          action: 'login',
          description: 'Inicio de sesión exitoso',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success'
        },
        {
          id: '2',
          action: 'update',
          description: 'Actualizó información de perfil',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          status: 'success'
        },
        {
          id: '3',
          action: 'security',
          description: 'Cambió la contraseña',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          status: 'success'
        },
        {
          id: '4',
          action: 'login',
          description: 'Intento de inicio de sesión fallido',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.105',
          status: 'error'
        },
        {
          id: '5',
          action: 'login',
          description: 'Inicio de sesión exitoso',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          status: 'success'
        },
        {
          id: '6',
          action: 'create',
          description: 'Creó un nuevo producto',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          status: 'success'
        },
        {
          id: '7',
          action: 'update',
          description: 'Actualizó configuración de cuenta',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          status: 'success'
        },
        {
          id: '8',
          action: 'logout',
          description: 'Cerró sesión',
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          status: 'success'
        }
      ]

      setActivities(mockActivities)
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (action: string) => {
    const Icon = ACTIVITY_ICONS[action as keyof typeof ACTIVITY_ICONS] || ACTIVITY_ICONS.default
    return Icon
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
    } else {
      return date.toLocaleDateString('es-PY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Actividad
          </DialogTitle>
          <DialogDescription>
            Actividad reciente de {user.fullName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando actividad...</span>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay actividad registrada</p>
                </div>
              ) : (
                activities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.action)
                  const StatusIcon = STATUS_ICONS[activity.status]

                  return (
                    <div key={activity.id}>
                      <div className="flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`p-2 rounded-full ${
                            activity.status === 'success' ? 'bg-green-100' :
                            activity.status === 'warning' ? 'bg-yellow-100' :
                            'bg-red-100'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              activity.status === 'success' ? 'text-green-600' :
                              activity.status === 'warning' ? 'text-yellow-600' :
                              'text-red-600'
                            }`} />
                          </div>
                          {index < activities.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{activity.description}</p>
                                <Badge className={STATUS_COLORS[activity.status]} variant="outline">
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {activity.status === 'success' ? 'Éxito' :
                                   activity.status === 'warning' ? 'Advertencia' :
                                   'Error'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTimestamp(activity.timestamp)}
                                </span>
                                {activity.ipAddress && (
                                  <span>IP: {activity.ipAddress}</span>
                                )}
                              </div>
                              {activity.userAgent && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {activity.userAgent}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
