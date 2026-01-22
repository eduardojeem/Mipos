'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Lock, 
  Key,
  Eye,
  EyeOff,
  Clock,
  Globe,
  Smartphone,
  Wifi,
  Ban,
  UserX,
  Activity,
  FileText,
  Settings,
  Zap,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter
} from 'lucide-react'

export default function SecurityPage() {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: 30,
    passwordExpiry: 90,
    maxLoginAttempts: 5,
    ipWhitelist: true,
    auditLogging: true,
    encryptionEnabled: true,
    sslRequired: true
  })

  const [threats, setThreats] = useState([
    {
      id: 1,
      type: 'Intento de acceso no autorizado',
      severity: 'high',
      ip: '192.168.1.100',
      timestamp: '2024-01-15 14:30:25',
      status: 'blocked',
      details: 'Múltiples intentos de login fallidos'
    },
    {
      id: 2,
      type: 'Actividad sospechosa',
      severity: 'medium',
      ip: '10.0.0.45',
      timestamp: '2024-01-15 13:15:10',
      status: 'monitoring',
      details: 'Acceso desde ubicación inusual'
    },
    {
      id: 3,
      type: 'Intento de SQL Injection',
      severity: 'critical',
      ip: '203.0.113.42',
      timestamp: '2024-01-15 12:45:33',
      status: 'blocked',
      details: 'Patrón malicioso detectado en query'
    }
  ])

  const [blockedIPs, setBlockedIPs] = useState([
    { ip: '192.168.1.100', reason: 'Múltiples intentos fallidos', blocked_at: '2024-01-15 14:30:25' },
    { ip: '203.0.113.42', reason: 'Intento de SQL Injection', blocked_at: '2024-01-15 12:45:33' },
    { ip: '198.51.100.25', reason: 'Actividad maliciosa', blocked_at: '2024-01-14 09:20:15' }
  ])

  const [activeUsers, setActiveUsers] = useState([
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan@empresa.com',
      role: 'ADMIN',
      ip: '192.168.1.50',
      location: 'Ciudad de México',
      device: 'Chrome - Windows',
      last_activity: '2024-01-15 15:30:00',
      session_duration: '2h 15m',
      risk_level: 'low'
    },
    {
      id: 2,
      name: 'María García',
      email: 'maria@empresa.com',
      role: 'CASHIER',
      ip: '192.168.1.51',
      location: 'Guadalajara',
      device: 'Firefox - macOS',
      last_activity: '2024-01-15 15:25:00',
      session_duration: '1h 45m',
      risk_level: 'low'
    }
  ])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'blocked': return 'bg-red-100 text-red-800'
      case 'monitoring': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Centro de Seguridad</h1>
          <p className="text-muted-foreground mt-2">
            Monitoreo y configuración de seguridad del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar Logs
          </Button>
          <Button size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Seguridad</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Seguro</div>
            <p className="text-xs text-muted-foreground">
              Todos los sistemas protegidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amenazas Detectadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
            <p className="text-xs text-muted-foreground">
              En las últimas 24 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloqueadas</CardTitle>
            <Ban className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{blockedIPs.length}</div>
            <p className="text-xs text-muted-foreground">
              Direcciones IP bloqueadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sesiones Activas</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios conectados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="threats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="threats">Amenazas</TabsTrigger>
          <TabsTrigger value="blocked">IPs Bloqueadas</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones Activas</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Threats Tab */}
        <TabsContent value="threats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Amenazas de Seguridad Detectadas
              </CardTitle>
              <CardDescription>
                Monitoreo en tiempo real de actividades sospechosas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threats.map((threat) => (
                  <div key={threat.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="font-medium">{threat.type}</div>
                        <div className="text-sm text-muted-foreground">{threat.details}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          IP: {threat.ip} • {threat.timestamp}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(threat.severity)}>
                        {threat.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(threat.status)}>
                        {threat.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked IPs Tab */}
        <TabsContent value="blocked" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Direcciones IP Bloqueadas
              </CardTitle>
              <CardDescription>
                Lista de IPs bloqueadas por actividad maliciosa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dirección IP</TableHead>
                    <TableHead>Razón del Bloqueo</TableHead>
                    <TableHead>Fecha de Bloqueo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((ip, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{ip.ip}</TableCell>
                      <TableCell>{ip.reason}</TableCell>
                      <TableCell>{ip.blocked_at}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Desbloquear
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sesiones Activas
              </CardTitle>
              <CardDescription>
                Monitoreo de usuarios conectados al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Riesgo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{user.location}</div>
                          <div className="text-xs text-muted-foreground">{user.ip}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.device}</TableCell>
                      <TableCell className="text-sm">{user.session_duration}</TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(user.risk_level)}>
                          {user.risk_level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Terminar Sesión
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Autenticación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="2fa">Autenticación de Dos Factores</Label>
                    <p className="text-sm text-muted-foreground">
                      Requiere verificación adicional para el login
                    </p>
                  </div>
                  <Switch
                    id="2fa"
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) =>
                      setSecuritySettings(prev => ({ ...prev, twoFactorAuth: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Tiempo de Sesión (minutos)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) =>
                      setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-attempts">Máximo Intentos de Login</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) =>
                      setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configuración de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ip-whitelist">Lista Blanca de IPs</Label>
                    <p className="text-sm text-muted-foreground">
                      Restringir acceso a IPs específicas
                    </p>
                  </div>
                  <Switch
                    id="ip-whitelist"
                    checked={securitySettings.ipWhitelist}
                    onCheckedChange={(checked) =>
                      setSecuritySettings(prev => ({ ...prev, ipWhitelist: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="audit-logging">Registro de Auditoría</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar todas las actividades del sistema
                    </p>
                  </div>
                  <Switch
                    id="audit-logging"
                    checked={securitySettings.auditLogging}
                    onCheckedChange={(checked) =>
                      setSecuritySettings(prev => ({ ...prev, auditLogging: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ssl-required">SSL Requerido</Label>
                    <p className="text-sm text-muted-foreground">
                      Forzar conexiones HTTPS
                    </p>
                  </div>
                  <Switch
                    id="ssl-required"
                    checked={securitySettings.sslRequired}
                    onCheckedChange={(checked) =>
                      setSecuritySettings(prev => ({ ...prev, sslRequired: checked }))
                    }
                  />
                </div>

                <Button className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}