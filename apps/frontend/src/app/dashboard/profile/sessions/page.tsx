'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  ArrowLeft, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  MapPin, 
  Clock, 
  Shield,
  LogOut,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Session {
  id: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  location: string
  ipAddress: string
  lastActivity: string
  isCurrent: boolean
  createdAt: string
}

export default function SessionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/auth/sessions');
        
        if (!response.ok) {
          throw new Error('Error al cargar las sesiones');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setSessions(result.data);
        } else {
          throw new Error(result.error || 'Error desconocido');
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las sesiones activas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [toast])

  const loadSessions = async () => {
    // Esta función ya no es necesaria, se reemplazó por fetchSessions en useEffect
  }

  const terminateSession = async (sessionId: string) => {
    if (sessionId === 'current') {
      toast({
        title: "Acción no permitida",
        description: "No puedes cerrar tu sesión actual desde aquí",
        variant: "destructive"
      })
      return
    }

    try {
      setTerminatingSession(sessionId)
      
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Error al terminar la sesión');
      }

      const result = await response.json();
      
      if (result.success) {
        setSessions(prev => prev.filter(session => session.id !== sessionId));
        
        toast({
          title: "Sesión terminada",
          description: result.message || "La sesión ha sido terminada exitosamente",
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error terminating session:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo terminar la sesión",
        variant: "destructive"
      })
    } finally {
      setTerminatingSession(null)
    }
  }

  const terminateAllOtherSessions = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ terminateAll: true }),
      });

      if (!response.ok) {
        throw new Error('Error al terminar las sesiones');
      }

      const result = await response.json();
      
      if (result.success) {
        setSessions(prev => prev.filter(session => session.isCurrent));
        
        toast({
          title: "Sesiones terminadas",
          description: result.message || "Todas las otras sesiones han sido terminadas",
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron terminar las sesiones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />
      case 'tablet':
        return <Tablet className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  const getDeviceTypeLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'Móvil'
      case 'tablet':
        return 'Tablet'
      default:
        return 'Escritorio'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando sesiones...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Perfil
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Sesiones Activas</h1>
        </div>
        <p className="text-muted-foreground">
          Gestiona tus sesiones activas y dispositivos conectados
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sesiones Activas</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ubicaciones</p>
                <p className="text-2xl font-bold">
                  {new Set(sessions.map(s => s.location.split(',')[0])).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Actividad</p>
                <p className="text-sm font-medium">
                  {formatDistanceToNow(new Date(sessions[0]?.lastActivity || new Date()), {
                    addSuffix: true,
                    locale: es
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Acciones de Seguridad
          </CardTitle>
          <CardDescription>
            Termina sesiones sospechosas o no reconocidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={terminateAllOtherSessions}
              disabled={isLoading || sessions.filter(s => !s.isCurrent).length === 0}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Todas las Otras Sesiones
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Sesiones */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Dispositivos y Sesiones</h2>
        
        {sessions.map((session) => (
          <Card key={session.id} className={session.isCurrent ? 'border-green-200 bg-green-50/50' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {session.browser} en {session.os}
                      </h3>
                      {session.isCurrent && (
                        <Badge variant="default" className="bg-green-600">
                          Sesión Actual
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>{getDeviceTypeLabel(session.deviceType)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{session.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>{session.ipAddress}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Última actividad: {formatDistanceToNow(new Date(session.lastActivity), {
                            addSuffix: true,
                            locale: es
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => terminateSession(session.id)}
                    disabled={terminatingSession === session.id}
                  >
                    {terminatingSession === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Terminar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información de Seguridad */}
      <Alert className="mt-6">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Consejos de seguridad:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Revisa regularmente tus sesiones activas</li>
            <li>• Termina sesiones de dispositivos que no reconozcas</li>
            <li>• Cierra sesión al usar dispositivos públicos</li>
            <li>• Cambia tu contraseña si detectas actividad sospechosa</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}