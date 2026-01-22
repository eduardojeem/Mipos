'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  LogOut,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Monitor,
  Shield,
  Activity,
  RefreshCw,
  Trash2,
  MapPin,
  Smartphone,
  Laptop,
  Tablet,
  Globe
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { AdminGuard } from '@/components/auth/PermissionGuard'
import { toast } from '@/lib/toast'
import { isMockAuthEnabled, getEnvMode } from '@/lib/env'

interface UserSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  sessionToken: string
  ipAddress: string
  userAgent: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  location?: {
    country: string
    city: string
    region: string
  }
  isActive: boolean
  isCurrent: boolean
  createdAt: string
  lastActivityAt: string
  expiresAt: string
  loginMethod: 'email' | 'google' | 'github' | 'sso'
  riskLevel: 'low' | 'medium' | 'high'
  metadata?: Record<string, any>
}

interface SessionStats {
  totalSessions: number
  activeSessions: number
  expiredSessions: number
  suspiciousSessions: number
  uniqueUsers: number
  averageSessionDuration: number
  topLocations: { location: string; count: number }[]
  topDevices: { device: string; count: number }[]
}

// Mock data - En producción esto vendría de la API
const mockSessions: UserSession[] = [
  {
    id: 'session-1',
    userId: 'user-1',
    userName: 'Administrador Principal',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN',
    sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    deviceType: 'desktop',
    browser: 'Chrome 120',
    os: 'Windows 10',
    location: {
      country: 'Colombia',
      city: 'Bogotá',
      region: 'Cundinamarca'
    },
    isActive: true,
    isCurrent: true,
    createdAt: '2024-01-15T08:30:00Z',
    lastActivityAt: '2024-01-15T10:45:00Z',
    expiresAt: '2024-01-16T08:30:00Z',
    loginMethod: 'email',
    riskLevel: 'low'
  },
  {
    id: 'session-2',
    userId: 'user-2',
    userName: 'Cajero Principal',
    userEmail: 'cashier@example.com',
    userRole: 'CASHIER',
    sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    ipAddress: '192.168.1.150',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceType: 'mobile',
    browser: 'Safari Mobile',
    os: 'iOS 17',
    location: {
      country: 'Colombia',
      city: 'Medellín',
      region: 'Antioquia'
    },
    isActive: true,
    isCurrent: false,
    createdAt: '2024-01-15T09:00:00Z',
    lastActivityAt: '2024-01-15T10:30:00Z',
    expiresAt: '2024-01-16T09:00:00Z',
    loginMethod: 'email',
    riskLevel: 'low'
  },
  {
    id: 'session-3',
    userId: 'user-3',
    userName: 'Gerente General',
    userEmail: 'manager@example.com',
    userRole: 'MANAGER',
    sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    deviceType: 'desktop',
    browser: 'Chrome 119',
    os: 'macOS Sonoma',
    location: {
      country: 'Estados Unidos',
      city: 'Miami',
      region: 'Florida'
    },
    isActive: true,
    isCurrent: false,
    createdAt: '2024-01-15T07:15:00Z',
    lastActivityAt: '2024-01-15T10:20:00Z',
    expiresAt: '2024-01-16T07:15:00Z',
    loginMethod: 'google',
    riskLevel: 'medium',
    metadata: {
      suspiciousActivity: 'Login from unusual location'
    }
  },
  {
    id: 'session-4',
    userId: 'user-4',
    userName: 'Usuario Desconocido',
    userEmail: 'unknown@suspicious.com',
    userRole: 'USER',
    sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    ipAddress: '198.51.100.123',
    userAgent: 'curl/7.68.0',
    deviceType: 'unknown',
    browser: 'Unknown',
    os: 'Unknown',
    location: {
      country: 'Desconocido',
      city: 'Desconocido',
      region: 'Desconocido'
    },
    isActive: false,
    isCurrent: false,
    createdAt: '2024-01-15T06:45:00Z',
    lastActivityAt: '2024-01-15T06:50:00Z',
    expiresAt: '2024-01-15T18:45:00Z',
    loginMethod: 'email',
    riskLevel: 'high',
    metadata: {
      suspiciousActivity: 'Automated login attempt',
      blockedActions: ['bulk_export', 'admin_access']
    }
  },
  {
    id: 'session-5',
    userId: 'user-2',
    userName: 'Cajero Principal',
    userEmail: 'cashier@example.com',
    userRole: 'CASHIER',
    sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    ipAddress: '192.168.1.151',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceType: 'tablet',
    browser: 'Safari',
    os: 'iPadOS 17',
    location: {
      country: 'Colombia',
      city: 'Medellín',
      region: 'Antioquia'
    },
    isActive: false,
    isCurrent: false,
    createdAt: '2024-01-14T14:20:00Z',
    lastActivityAt: '2024-01-14T18:30:00Z',
    expiresAt: '2024-01-15T14:20:00Z',
    loginMethod: 'email',
    riskLevel: 'low'
  }
]

const mockStats: SessionStats = {
  totalSessions: 156,
  activeSessions: 23,
  expiredSessions: 133,
  suspiciousSessions: 3,
  uniqueUsers: 45,
  averageSessionDuration: 4.5,
  topLocations: [
    { location: 'Bogotá, Colombia', count: 89 },
    { location: 'Medellín, Colombia', count: 34 },
    { location: 'Cali, Colombia', count: 18 },
    { location: 'Miami, Estados Unidos', count: 8 }
  ],
  topDevices: [
    { device: 'Desktop', count: 98 },
    { device: 'Mobile', count: 45 },
    { device: 'Tablet', count: 13 }
  ]
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<UserSession[]>(mockSessions)
  const [stats, setStats] = useState<SessionStats>(mockStats)
  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    userRole: '',
    deviceType: '',
    riskLevel: '',
    loginMethod: ''
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  const getAuthHeaders = () => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (isMockAuthEnabled()) {
      headers.set('x-user-role', 'ADMIN');
      headers.set('X-Env-Mode', getEnvMode());
    }
    return headers;
  }

  const ensureCsrfToken = () => {
    const token = crypto.randomUUID()
    try {
      // Set cookie for CSRF util to validate header==cookie
      document.cookie = `csrf-token=${token}; path=/; SameSite=Lax`
    } catch {}
    return token
  }

  useEffect(() => {
    loadSessions()
  }, [filters, currentPage])

  const buildQuery = () => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.userRole) params.set('userRole', filters.userRole)
    if (filters.deviceType) params.set('deviceType', filters.deviceType)
    if (filters.riskLevel) params.set('riskLevel', filters.riskLevel)
    if (filters.loginMethod) params.set('loginMethod', filters.loginMethod)
    params.set('page', String(currentPage))
    params.set('limit', String(pageSize))
    return params.toString()
  }

  const loadSessions = async () => {
    setLoading(true)
    try {
      const qs = buildQuery()
      const res = await fetch(`/api/admin/sessions?${qs}`, {
        method: 'GET',
        headers: getAuthHeaders()
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setSessions(data.items || [])
      setTotalCount(data.total || 0)

    } catch (error) {
      console.error('Error loading sessions:', error)
      toast.error('Error al cargar las sesiones')
      // Fallback simple a mock local si algo falla
      let filteredSessions = mockSessions
      if (filters.search) {
        filteredSessions = filteredSessions.filter(session =>
          session.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
          session.userEmail.toLowerCase().includes(filters.search.toLowerCase()) ||
          session.ipAddress.includes(filters.search)
        )
      }
      const total = filteredSessions.length
      setTotalCount(total)
      const start = (currentPage - 1) * pageSize
      const pageItems = filteredSessions.slice(start, start + pageSize)
      setSessions(pageItems)
    } finally {
      setLoading(false)
    }
  }

  const handleTerminateSession = async (sessionId: string) => {
    try {
      setLoading(true)
      const csrf = ensureCsrfToken()
      await fetch(`/api/admin/sessions/${sessionId}/terminate`, {
        method: 'POST',
        headers: (() => { const h = getAuthHeaders(); h.set('X-CSRF-Token', csrf); return h })()
      })
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isActive: false } : s))
      toast.success('Sesión terminada exitosamente')
    } catch (error) {
      console.error('Error terminating session:', error)
      toast.error('Error al terminar la sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleTerminateAllUserSessions = async (userId: string) => {
    try {
      setLoading(true)
      const csrf = ensureCsrfToken()
      const userSessions = sessions.filter(s => s.userId === userId && s.isActive)
      // Termina cada sesión del usuario de forma secuencial para evitar saturar
      for (const s of userSessions) {
        await fetch(`/api/admin/sessions/${s.id}/terminate`, {
          method: 'POST',
          headers: (() => { const h = getAuthHeaders(); h.set('X-CSRF-Token', csrf); return h })()
        })
      }
      setSessions(prev => prev.map(s => s.userId === userId ? { ...s, isActive: false } : s))
      toast.success('Todas las sesiones del usuario han sido terminadas')
    } catch (error) {
      console.error('Error terminating user sessions:', error)
      toast.error('Error al terminar las sesiones del usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanupExpiredSessions = async () => {
    try {
      setLoading(true)
      const csrf = ensureCsrfToken()
      await fetch('/api/admin/sessions/cleanup', {
        method: 'POST',
        headers: (() => { const h = getAuthHeaders(); h.set('X-CSRF-Token', csrf); return h })()
      })
      // Recargar lista para reflejar limpieza real
      await loadSessions()
      toast.success('Sesiones expiradas limpiadas exitosamente')
    } catch (error) {
      console.error('Error cleaning up sessions:', error)
      toast.error('Error al limpiar las sesiones')
    } finally {
      setLoading(false)
    }
  }

  const exportSessions = async (format: 'json' | 'csv') => {
    try {
      const qs = buildQuery()
      const res = await fetch(`/api/admin/sessions/export?format=${format}&${qs}`, {
        method: 'GET',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'csv' ? 'sessions.csv' : 'sessions.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Exportación ${format.toUpperCase()} generada`)
    } catch (error) {
      console.error('Error exporting sessions:', error)
      toast.error('Error al exportar sesiones')
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      userRole: '',
      deviceType: '',
      riskLevel: '',
      loginMethod: ''
    })
    setCurrentPage(1)
  }

  const getStatusBadge = (session: UserSession) => {
    if (session.isCurrent) {
      return <Badge variant="default" className="bg-blue-500">Actual</Badge>
    }
    if (session.isActive) {
      return <Badge variant="default" className="bg-green-500">Activa</Badge>
    }
    return <Badge variant="secondary">Expirada</Badge>
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">Alto Riesgo</Badge>
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Riesgo Medio</Badge>
      default:
        return <Badge variant="outline">Bajo Riesgo</Badge>
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop':
        return <Monitor className="h-4 w-4" />
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const openSessionDetail = (session: UserSession) => {
    setSelectedSession(session)
    setIsDetailDialogOpen(true)
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Sesiones</h1>
          <p className="text-muted-foreground">
            Monitorea y administra las sesiones activas de usuarios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadSessions()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => exportSessions('json')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
          <Button variant="outline" onClick={() => exportSessions('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Expiradas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Limpiar sesiones expiradas?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará todas las sesiones expiradas del sistema. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCleanupExpiredSessions}>
                  Limpiar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sesiones Activas</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              De {stats.totalSessions} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Únicos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios conectados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sesiones Sospechosas</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspiciousSessions}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duración Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageSessionDuration}h</div>
            <p className="text-xs text-muted-foreground">
              Por sesión
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Usuario, email o IP..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="userRole">Rol de Usuario</Label>
              <Select
                value={filters.userRole}
                onValueChange={(value) => setFilters({ ...filters, userRole: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="MANAGER">Gerente</SelectItem>
                  <SelectItem value="CASHIER">Cajero</SelectItem>
                  <SelectItem value="USER">Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deviceType">Tipo de Dispositivo</Label>
              <Select
                value={filters.deviceType}
                onValueChange={(value) => setFilters({ ...filters, deviceType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los dispositivos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los dispositivos</SelectItem>
                  <SelectItem value="desktop">Escritorio</SelectItem>
                  <SelectItem value="mobile">Móvil</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="unknown">Desconocido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="riskLevel">Nivel de Riesgo</Label>
              <Select
                value={filters.riskLevel}
                onValueChange={(value) => setFilters({ ...filters, riskLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los niveles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="loginMethod">Método de Login</Label>
              <Select
                value={filters.loginMethod}
                onValueChange={(value) => setFilters({ ...filters, loginMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los métodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="sso">SSO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sesiones de Usuario</CardTitle>
          <CardDescription>
            Lista de todas las sesiones activas y recientes del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Última Actividad</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Cargando sesiones...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron sesiones con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.userName}</div>
                          <div className="text-sm text-muted-foreground">{session.userEmail}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {session.userRole}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(session)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.deviceType)}
                          <div>
                            <div className="text-sm">{session.browser}</div>
                            <div className="text-xs text-muted-foreground">{session.os}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <div className="text-sm">
                            {session.location ? 
                              `${session.location.city}, ${session.location.country}` : 
                              'Desconocida'
                            }
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {session.ipAddress}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(session.lastActivityAt), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(session.riskLevel)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSessionDetail(session)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {session.isActive && !session.isCurrent && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <LogOut className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Terminar sesión?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción terminará la sesión de {session.userName}. El usuario deberá iniciar sesión nuevamente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleTerminateSession(session.id)}>
                                    Terminar Sesión
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {sessions.length} de {totalCount} sesiones
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
              >
                Anterior
              </Button>
              <div className="text-sm">
                Página {currentPage} de {Math.max(1, Math.ceil(totalCount / pageSize))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-labelledby="session-detail-title">
          <DialogHeader>
            <DialogTitle id="session-detail-title" className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalle de Sesión
            </DialogTitle>
            <DialogDescription>
              Información completa de la sesión del usuario
            </DialogDescription>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              {/* User Info */}
              <div>
                <Label className="text-sm font-medium">Información del Usuario</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <p className="text-sm">{selectedSession.userName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm">{selectedSession.userEmail}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rol</Label>
                    <Badge variant="outline">{selectedSession.userRole}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    {getStatusBadge(selectedSession)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Session Info */}
              <div>
                <Label className="text-sm font-medium">Información de Sesión</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Creada</Label>
                    <p className="text-sm">{format(new Date(selectedSession.createdAt), 'dd/MM/yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Última Actividad</Label>
                    <p className="text-sm">{format(new Date(selectedSession.lastActivityAt), 'dd/MM/yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Expira</Label>
                    <p className="text-sm">{format(new Date(selectedSession.expiresAt), 'dd/MM/yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Método de Login</Label>
                    <Badge variant="outline">{selectedSession.loginMethod}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Device Info */}
              <div>
                <Label className="text-sm font-medium">Información del Dispositivo</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(selectedSession.deviceType)}
                      <span className="text-sm capitalize">{selectedSession.deviceType}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Navegador</Label>
                    <p className="text-sm">{selectedSession.browser}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Sistema Operativo</Label>
                    <p className="text-sm">{selectedSession.os}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IP Address</Label>
                    <p className="text-sm font-mono">{selectedSession.ipAddress}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Location Info */}
              <div>
                <Label className="text-sm font-medium">Ubicación</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">País</Label>
                    <p className="text-sm">{selectedSession.location?.country || 'Desconocido'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Región</Label>
                    <p className="text-sm">{selectedSession.location?.region || 'Desconocida'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ciudad</Label>
                    <p className="text-sm">{selectedSession.location?.city || 'Desconocida'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Security Info */}
              <div>
                <Label className="text-sm font-medium">Información de Seguridad</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nivel de Riesgo</Label>
                    {getRiskBadge(selectedSession.riskLevel)}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Token ID</Label>
                    <p className="text-xs font-mono bg-muted p-2 rounded">
                      {selectedSession.sessionToken.substring(0, 50)}...
                    </p>
                  </div>
                </div>
              </div>

              {/* User Agent */}
              <div>
                <Label className="text-sm font-medium">User Agent</Label>
                <p className="text-xs font-mono bg-muted p-3 rounded mt-2 break-all">
                  {selectedSession.userAgent}
                </p>
              </div>

              {/* Metadata */}
              {selectedSession.metadata && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium">Información Adicional</Label>
                    <ScrollArea className="h-32 mt-2">
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(selectedSession.metadata, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                {selectedSession.isActive && !selectedSession.isCurrent && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <LogOut className="h-4 w-4 mr-2" />
                          Terminar Sesión
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Terminar sesión?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción terminará la sesión de {selectedSession.userName}. El usuario deberá iniciar sesión nuevamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            handleTerminateSession(selectedSession.id)
                            setIsDetailDialogOpen(false)
                          }}>
                            Terminar Sesión
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Terminar Todas las Sesiones del Usuario
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Terminar todas las sesiones?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción terminará TODAS las sesiones activas de {selectedSession.userName}. El usuario deberá iniciar sesión nuevamente en todos sus dispositivos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            handleTerminateAllUserSessions(selectedSession.userId)
                            setIsDetailDialogOpen(false)
                          }}>
                            Terminar Todas
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AdminGuard>
  )
}