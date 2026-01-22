'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { roleService, type RoleStats } from '@/lib/services/role-service'
import { 
  Users, 
  Shield, 
  Settings, 
  TrendingUp, 
  Activity,
  UserCheck,
  UserX,
  Crown
} from 'lucide-react'

interface RoleStatsCardProps {
  className?: string
}

export function RoleStatsCard({ className }: RoleStatsCardProps) {
  const [stats, setStats] = useState<RoleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await roleService.getRoleStats()
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estadísticas de Roles
          </CardTitle>
          <CardDescription>
            Resumen del sistema de roles y permisos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Activity className="h-5 w-5" />
            Error en Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={loadStats}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Reintentar
          </button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  const statItems = [
    {
      label: 'Total de Roles',
      value: stats.total,
      icon: Shield,
      color: 'bg-blue-500',
      description: 'Roles en el sistema'
    },
    {
      label: 'Roles Activos',
      value: stats.active,
      icon: UserCheck,
      color: 'bg-green-500',
      description: 'Roles habilitados'
    },
    {
      label: 'Roles Inactivos',
      value: stats.inactive,
      icon: UserX,
      color: 'bg-red-500',
      description: 'Roles deshabilitados'
    },
    {
      label: 'Roles del Sistema',
      value: stats.systemRoles,
      icon: Crown,
      color: 'bg-purple-500',
      description: 'Roles predefinidos'
    },
    {
      label: 'Roles Personalizados',
      value: stats.customRoles,
      icon: Users,
      color: 'bg-orange-500',
      description: 'Roles creados por usuarios'
    },
    {
      label: 'Total Permisos',
      value: stats.totalPermissions,
      icon: Settings,
      color: 'bg-indigo-500',
      description: 'Permisos disponibles'
    },
    {
      label: 'Promedio Permisos',
      value: (stats as any).averagePermissionsPerRole || 0,
      icon: TrendingUp,
      color: 'bg-teal-500',
      description: 'Permisos por rol'
    }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Estadísticas de Roles
        </CardTitle>
        <CardDescription>
          Resumen del sistema de roles y permisos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {statItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={index} className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${item.color} text-white mb-2`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Rol Más Usado</h4>
            <Badge variant="secondary" className="text-sm">
              {stats.mostUsedRole}
            </Badge>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Rol Menos Usado</h4>
            <Badge variant="outline" className="text-sm">
              {stats.leastUsedRole}
            </Badge>
          </div>
        </div>

        {(stats as any).roleDistribution && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Distribución de Roles</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">
                Sistema: {(stats as any).roleDistribution.system}
              </Badge>
              <Badge variant="secondary">
                Personalizados: {(stats as any).roleDistribution.custom}
              </Badge>
              <Badge variant="outline" className="text-green-600">
                Activos: {(stats as any).roleDistribution.active}
              </Badge>
              <Badge variant="outline" className="text-red-600">
                Inactivos: {(stats as any).roleDistribution.inactive}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}