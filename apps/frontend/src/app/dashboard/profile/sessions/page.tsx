'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Globe,
  Loader2,
  LogOut,
  MapPin,
  Monitor,
  RefreshCw,
  Shield,
  Smartphone,
  Tablet,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

type ProfileSession = {
  id: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  location: string
  ipAddress: string
  lastActivity: string
  isCurrent: boolean
  createdAt: string
}

type SessionsResponse = {
  success: boolean
  data: ProfileSession[]
  summary: {
    active: number
    expired: number
    highRisk: number
    uniqueUsers: number
  }
}

function getDeviceIcon(deviceType: ProfileSession['deviceType']) {
  switch (deviceType) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />
    case 'tablet':
      return <Tablet className="h-5 w-5" />
    default:
      return <Monitor className="h-5 w-5" />
  }
}

function getDeviceLabel(deviceType: ProfileSession['deviceType']) {
  switch (deviceType) {
    case 'mobile':
      return 'Movil'
    case 'tablet':
      return 'Tablet'
    case 'desktop':
      return 'Escritorio'
    default:
      return 'Desconocido'
  }
}

function formatRelativeDate(value?: string) {
  if (!value) return 'Sin actividad'
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: es })
  } catch {
    return 'Fecha invalida'
  }
}

function formatAbsoluteDate(value?: string) {
  if (!value) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-PY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function fetchSessions(): Promise<SessionsResponse> {
  const response = await fetch('/api/auth/sessions', {
    cache: 'no-store',
    credentials: 'include',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'No se pudieron cargar las sesiones')
  }

  return payload as SessionsResponse
}

async function deleteSessions(body: { sessionId?: string; terminateAll?: boolean }) {
  const response = await fetch('/api/auth/sessions', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'No se pudo actualizar la sesion')
  }

  return payload as { success: boolean; message?: string }
}

function StatCard({
  title,
  value,
  helper,
}: {
  title: string
  value: number | string
  helper: string
}) {
  return (
    <Card className="border-slate-200/80 bg-white/90 dark:border-slate-700/70 dark:bg-slate-900/85">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-600 dark:text-slate-200">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-slate-950 dark:text-slate-50">{value}</div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{helper}</p>
      </CardContent>
    </Card>
  )
}

export default function SessionsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [confirmTerminateOthers, setConfirmTerminateOthers] = useState(false)

  const sessionsQuery = useQuery({
    queryKey: ['profile-sessions'],
    queryFn: fetchSessions,
    staleTime: 30_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  })

  const sessions = useMemo(() => sessionsQuery.data?.data ?? [], [sessionsQuery.data?.data])
  const summary = sessionsQuery.data?.summary || {
    active: 0,
    expired: 0,
    highRisk: 0,
    uniqueUsers: 0,
  }

  const sortedSessions = useMemo(
    () => [...sessions].sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent)),
    [sessions]
  )

  const currentSession = sortedSessions.find((session) => session.isCurrent) || null
  const otherSessionsCount = sortedSessions.filter((session) => !session.isCurrent).length
  const uniqueLocations = new Set(
    sortedSessions
      .map((session) => session.location.trim())
      .filter(Boolean)
  ).size

  const invalidateSessions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile-sessions'] })
  }

  const terminateSession = async (sessionId: string) => {
    setPendingSessionId(sessionId)
    try {
      const result = await deleteSessions({ sessionId })
      toast({
        title: 'Sesion terminada',
        description: result.message || 'La sesion fue cerrada correctamente.',
      })
      await invalidateSessions()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cerrar la sesion.',
        variant: 'destructive',
      })
    } finally {
      setPendingSessionId(null)
    }
  }

  const terminateAllOtherSessions = async () => {
    setPendingSessionId('terminate-all')
    try {
      const result = await deleteSessions({ terminateAll: true })
      toast({
        title: 'Sesiones cerradas',
        description: result.message || 'Las otras sesiones activas fueron cerradas.',
      })
      await invalidateSessions()
      setConfirmTerminateOthers(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron cerrar las otras sesiones.',
        variant: 'destructive',
      })
    } finally {
      setPendingSessionId(null)
    }
  }

  if (sessionsQuery.isLoading) {
    return <Skeleton className="h-[560px] rounded-3xl" />
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button variant="ghost" onClick={() => router.back()} className="-ml-3 mb-3">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al perfil
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              <Shield className="h-3.5 w-3.5" />
              Seguridad de acceso
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-slate-50">Tus sesiones</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Revisa dispositivos conectados, ultima actividad y corta accesos que ya no correspondan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void sessionsQuery.refetch()} disabled={sessionsQuery.isFetching}>
              {sessionsQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmTerminateOthers(true)}
              disabled={otherSessionsCount === 0 || pendingSessionId !== null}
            >
              {pendingSessionId === 'terminate-all' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Cerrar otras sesiones
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Sesiones activas"
          value={summary.active}
          helper={otherSessionsCount > 0 ? `${otherSessionsCount} adicionales fuera de este dispositivo` : 'Solo esta sesion sigue activa'}
        />
        <StatCard
          title="Dispositivos visibles"
          value={sortedSessions.length}
          helper={uniqueLocations > 0 ? `${uniqueLocations} ubicaciones registradas` : 'Sin ubicacion disponible'}
        />
        <StatCard
          title="Ultima actividad"
          value={formatRelativeDate(currentSession?.lastActivity)}
          helper={currentSession ? getDeviceLabel(currentSession.deviceType) : 'No hay sesion actual detectada'}
        />
      </div>

      {sessionsQuery.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se pudieron cargar las sesiones</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{sessionsQuery.error instanceof Error ? sessionsQuery.error.message : 'Error desconocido'}</span>
            <Button variant="outline" size="sm" onClick={() => void sessionsQuery.refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/85">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-50">Dispositivos y sesiones</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            La sesion actual se sincroniza automaticamente y el resto se ordena por actividad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
              No hay sesiones visibles para este usuario.
            </div>
          ) : (
            sortedSessions.map((session) => (
              <Card
                key={session.id}
                className={session.isCurrent
                  ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                  : 'border-slate-200/80 bg-white/80 dark:border-slate-700/70 dark:bg-slate-900/70'}
              >
                <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                          {session.browser} en {session.os}
                        </h2>
                        {session.isCurrent ? (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Sesion actual</Badge>
                        ) : (
                          <Badge variant="secondary">Otra sesion</Badge>
                        )}
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <span>{getDeviceLabel(session.deviceType)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>{session.ipAddress || 'IP no disponible'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Ultima actividad {formatRelativeDate(session.lastActivity)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Creada {formatAbsoluteDate(session.createdAt)}</span>
                        </div>
                        {session.location ? (
                          <div className="flex items-center gap-2 md:col-span-2">
                            <MapPin className="h-4 w-4" />
                            <span>{session.location}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 lg:min-w-44">
                    {!session.isCurrent ? (
                      <Button
                        variant="outline"
                        onClick={() => void terminateSession(session.id)}
                        disabled={pendingSessionId !== null}
                      >
                        {pendingSessionId === session.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="mr-2 h-4 w-4" />
                        )}
                        Cerrar sesion
                      </Button>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        Esta es la sesion que estas usando ahora.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Alert className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Si detectas una sesion desconocida, cierrala y cambia tu contrasena desde seguridad.
        </AlertDescription>
      </Alert>

      <AlertDialog open={confirmTerminateOthers} onOpenChange={setConfirmTerminateOthers}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar otras sesiones</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerraran todas las sesiones activas excepto la actual. Usa esta accion si perdiste acceso a otro dispositivo o detectaste actividad sospechosa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingSessionId !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void terminateAllOtherSessions()
              }}
              disabled={pendingSessionId !== null}
            >
              {pendingSessionId === 'terminate-all' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Cerrar otras sesiones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
