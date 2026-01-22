'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Save,
  Database,
  Mail,
  Shield,
  Globe,
  CreditCard,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle,
  Printer,
  Palette,
  Settings,
  Sun,
  Moon,
  Monitor,
  Type,
  Sparkles,
  Eye,
  Layers,
  Circle,
  Square,
  RectangleHorizontal,
  Contrast,
  Paintbrush,
  Brush,
  RotateCcw
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useBusinessConfig } from '@/contexts/BusinessConfigContext'
import { useToast } from '@/components/ui/use-toast'
import { useTheme } from 'next-themes'

// Mapas de color para Apariencia - Expandido
const PRIMARY_HSL_MAP: Record<string, string> = {
  blue: '221.2 83.2% 53.3%',
  indigo: '238 83% 60%',
  violet: '258 90% 66%',
  purple: '271 81% 56%',
  fuchsia: '292 84% 61%',
  pink: '330 81% 60%',
  rose: '347 77% 50%',
  red: '0 84.2% 60.2%',
  orange: '25 95% 53%',
  amber: '38 92% 50%',
  yellow: '48 96% 53%',
  lime: '84 81% 44%',
  green: '142 71% 45%',
  emerald: '160 84% 39%',
  teal: '173 80% 40%',
  cyan: '189 94% 43%',
  sky: '199 89% 48%',
  slate: '215 16% 47%',
}

const PRIMARY_HEX_MAP: Record<string, string> = {
  blue: '#2563eb',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  purple: '#7e22ce',
  fuchsia: '#c026d3',
  pink: '#db2777',
  rose: '#e11d48',
  red: '#dc2626',
  orange: '#ea580c',
  amber: '#d97706',
  yellow: '#eab308',
  lime: '#65a30d',
  green: '#16a34a',
  emerald: '#059669',
  teal: '#0d9488',
  cyan: '#0891b2',
  sky: '#0284c7',
  slate: '#64748b',
}

// Colores de acento secundario
const ACCENT_COLORS: Record<string, string> = {
  default: 'Sistema',
  rose: '#f43f5e',
  orange: '#f97316',
  amber: '#f59e0b',
  emerald: '#10b981',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
}

// Opciones de radio (border radius)
const RADIUS_OPTIONS = [
  { value: '0', label: 'Cuadrado', icon: Square },
  { value: '0.375', label: 'Suave', icon: RectangleHorizontal },
  { value: '0.5', label: 'Medio', icon: RectangleHorizontal },
  { value: '0.75', label: 'Redondeado', icon: Circle },
  { value: '1', label: 'Muy redondeado', icon: Circle },
]

// Opciones de fuentes
const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter', sample: 'font-sans' },
  { value: 'system', label: 'Sistema', sample: 'font-sans' },
  { value: 'geist', label: 'Geist', sample: 'font-sans' },
  { value: 'mono', label: 'Monospace', sample: 'font-mono' },
]

// Opciones de densidad
const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compacto', description: 'Menor espaciado' },
  { value: 'normal', label: 'Normal', description: 'Espaciado estándar' },
  { value: 'comfortable', label: 'Cómodo', description: 'Mayor espaciado' },
]

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  PYG: '₲',
  USD: '$',
  EUR: '€',
  GBP: '£',
  BRL: 'R$',
  ARS: '$'
}

export default function SystemSettings() {
  const { config, updateConfig } = useBusinessConfig()
  const { setTheme } = useTheme()
  const { toast } = useToast()

  const [settings, setSettings] = useState({
    // General Settings
    companyName: 'Mi Empresa POS',
    companyAddress: 'Av. España 123, Asunción',
    companyPhone: '+595 991 123 456',
    companyEmail: 'contacto@miempresa.com',
    companyRUC: '',
    timezone: 'America/Asuncion',
    language: 'es-PY',
    currency: 'PYG',

    // System Settings
    autoBackup: true,
    backupFrequency: 'daily',
    maxUsers: 50,
    sessionTimeout: 30,
    enableLogging: true,
    logLevel: 'info',

    // Security Settings
    requireStrongPasswords: true,
    enableTwoFactor: false,
    maxLoginAttempts: 5,
    lockoutDuration: 15,

    // Email Settings
    emailProvider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    enableEmailNotifications: true,

    // POS Settings
    enableInventoryTracking: true,
    lowStockThreshold: 10,
    enableBarcodeScanner: true,
    printReceipts: true,
    enableCashDrawer: true,
    taxRate: 10,

    // Appearance
    theme: 'system',
    primaryColor: 'blue',
    accentColor: 'default',
    borderRadius: '0.5',
    fontFamily: 'inter',
    density: 'normal',
    enableAnimations: true,
    enableGlassmorphism: true,
    enableGradients: true,
    enableShadows: true,
    sidebarStyle: 'default',
    headerStyle: 'default',
    compactMode: false
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<{ companyEmail?: string; companyPhone?: string; companyRUC?: string }>({})

  // Sincronizar desde BusinessConfig
  useEffect(() => {
    if (!config) return

    setSettings(prev => ({
      ...prev,
      // General
      companyName: config.businessName || prev.companyName,
      companyAddress: config.address.street || prev.companyAddress,
      companyPhone: config.contact.phone || prev.companyPhone,
      companyEmail: config.contact.email || prev.companyEmail,
      companyRUC: config.legalInfo.ruc || prev.companyRUC,
      timezone: config.regional.timezone || prev.timezone,
      language: config.regional.language || prev.language,
      currency: config.storeSettings.currency || prev.currency,

      // System
      autoBackup: config.systemSettings?.autoBackup ?? prev.autoBackup,
      backupFrequency: config.systemSettings?.backupFrequency ?? prev.backupFrequency,
      maxUsers: config.systemSettings?.maxUsers ?? prev.maxUsers,
      sessionTimeout: config.systemSettings?.sessionTimeout ?? prev.sessionTimeout,
      enableLogging: config.systemSettings?.enableLogging ?? prev.enableLogging,
      logLevel: config.systemSettings?.logLevel ?? prev.logLevel,

      // Security
      requireStrongPasswords: config.systemSettings?.security?.requireStrongPasswords ?? prev.requireStrongPasswords,
      enableTwoFactor: config.systemSettings?.security?.enableTwoFactor ?? prev.enableTwoFactor,
      maxLoginAttempts: config.systemSettings?.security?.maxLoginAttempts ?? prev.maxLoginAttempts,
      lockoutDuration: config.systemSettings?.security?.lockoutDuration ?? prev.lockoutDuration,

      // Email
      smtpHost: config.systemSettings?.email?.smtpHost ?? prev.smtpHost,
      smtpPort: config.systemSettings?.email?.smtpPort ?? prev.smtpPort,
      smtpUser: config.systemSettings?.email?.smtpUser ?? prev.smtpUser,
      smtpPassword: '',
      enableEmailNotifications: config.notifications.emailNotifications ?? prev.enableEmailNotifications,

      // POS
      enableInventoryTracking: config.storeSettings.enableInventoryTracking ?? prev.enableInventoryTracking,
      lowStockThreshold: config.storeSettings.lowStockThreshold ?? prev.lowStockThreshold,
      enableBarcodeScanner: config.storeSettings.enableBarcodeScanner ?? prev.enableBarcodeScanner,
      printReceipts: config.storeSettings.printReceipts ?? prev.printReceipts,
      enableCashDrawer: config.storeSettings.enableCashDrawer ?? prev.enableCashDrawer,
      taxRate: typeof config.storeSettings.taxRate === 'number' ? Math.round(config.storeSettings.taxRate * 100) : prev.taxRate,

      // Appearance
      primaryColor: Object.keys(PRIMARY_HEX_MAP).find(key => PRIMARY_HEX_MAP[key] === config.branding.primaryColor) || 'blue',
    }))
  }, [config])

  const applyParaguayDefaults = () => {
    setSettings(prev => ({
      ...prev,
      timezone: 'America/Asuncion',
      language: 'es-PY',
      currency: 'PYG',
      taxRate: 10,
      companyPhone: prev.companyPhone?.startsWith('+595') ? prev.companyPhone : '+595 991 123 456'
    }))
  }

  const validateField = (key: 'companyEmail' | 'companyPhone' | 'companyRUC', value: string) => {
    let msg = ''
    if (key === 'companyEmail') {
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
      if (!emailRegex.test(value)) msg = 'Email inválido'
    }
    if (key === 'companyPhone') {
      const phoneRegex = /^\+595\s?\d{3}\s?\d{3}\s?\d{3,4}$|^\+595\s?\d{9,10}$/
      if (!phoneRegex.test(value)) msg = 'Teléfono de Paraguay inválido (+595 ...)'
    }
    if (key === 'companyRUC') {
      const rucRegex = /^\d{4,9}-\d$/
      if (value && !rucRegex.test(value)) msg = 'RUC inválido (formato #######-#)'
    }
    setErrors(prev => ({ ...prev, [key]: msg }))
    return !msg
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Validaciones mínimas
      const okEmail = validateField('companyEmail', settings.companyEmail)
      const okPhone = validateField('companyPhone', settings.companyPhone)
      const okRuc = validateField('companyRUC', settings.companyRUC || '')
      if (settings.enableEmailNotifications) {
        const smtpHostOk = !!settings.smtpHost
        const smtpPortOk = typeof settings.smtpPort === 'number' && settings.smtpPort > 0
        const smtpUserOk = !!settings.smtpUser
        const existingPwd = config.systemSettings?.email?.smtpPassword
        const smtpPwdOk = !!settings.smtpPassword || !!existingPwd
        if (!smtpHostOk || !smtpPortOk || !smtpUserOk || !smtpPwdOk) {
          toast({ title: 'Configuración SMTP incompleta', description: 'Completa host, puerto, usuario y contraseña para habilitar notificaciones por email', variant: 'destructive' })
          return
        }
      }
      if (!okEmail || !okPhone || !okRuc) {
        toast({ title: 'Campos inválidos', description: 'Corrige email, teléfono o RUC', variant: 'destructive' })
        return
      }

      const res = await updateConfig({
        businessName: settings.companyName,
        contact: {
          ...config.contact,
          phone: settings.companyPhone,
          email: settings.companyEmail,
        },
        address: {
          ...config.address,
          street: settings.companyAddress,
        },
        legalInfo: {
          ...config.legalInfo,
          ruc: settings.companyRUC || config.legalInfo.ruc,
        },
        regional: {
          ...config.regional,
          timezone: settings.timezone,
          language: settings.language,
          locale: settings.language,
        },
        storeSettings: {
          ...config.storeSettings,
          currency: settings.currency,
          currencySymbol: CURRENCY_SYMBOL_MAP[settings.currency] || config.storeSettings.currencySymbol,
          taxRate: Number(settings.taxRate) / 100,
          enableInventoryTracking: settings.enableInventoryTracking,
          lowStockThreshold: settings.lowStockThreshold,
          enableBarcodeScanner: settings.enableBarcodeScanner,
          printReceipts: settings.printReceipts,
          enableCashDrawer: settings.enableCashDrawer,
        },
        systemSettings: {
          autoBackup: settings.autoBackup,
          backupFrequency: settings.backupFrequency as any,
          maxUsers: settings.maxUsers,
          sessionTimeout: settings.sessionTimeout,
          enableLogging: settings.enableLogging,
          logLevel: settings.logLevel as any,
          security: {
            requireStrongPasswords: settings.requireStrongPasswords,
            enableTwoFactor: settings.enableTwoFactor,
            maxLoginAttempts: settings.maxLoginAttempts,
            lockoutDuration: settings.lockoutDuration,
          },
          email: {
            provider: 'smtp',
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPassword: settings.smtpPassword || config.systemSettings?.email?.smtpPassword,
          }
        },
        notifications: {
          ...config.notifications,
          emailNotifications: settings.enableEmailNotifications,
        },
        branding: {
          ...config.branding,
          primaryColor: PRIMARY_HEX_MAP[settings.primaryColor] || config.branding.primaryColor,
        },
        updatedAt: new Date().toISOString(),
      })

      setSaved(true)
      if (res?.persisted) {
        toast({ title: 'Sincronizado', description: 'Cambios sincronizados con Supabase', })
      } else if (res && 'status' in res && res.status === 'queued') {
        toast({ title: 'Guardado localmente', description: 'Se sincronizará cuando haya conexión/permisos', })
      } else if (res && 'status' in res && res.status === 'error') {
        toast({ title: 'Error al sincronizar', description: (res as any)?.message || 'Revisa conexión o permisos', variant: 'destructive' })
      }
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
      toast({ title: 'Error al guardar', description: (e as any)?.message || 'Corrige los campos inválidos', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Aplicar tema global
  useEffect(() => {
    if (!setTheme) return
    if (settings.theme === 'system') setTheme('system')
    else if (settings.theme === 'dark') setTheme('dark')
    else setTheme('light')
  }, [settings.theme, setTheme])

  // Aplicar color primario a variables CSS
  useEffect(() => {
    const hsl = PRIMARY_HSL_MAP[settings.primaryColor] || PRIMARY_HSL_MAP.blue
    const root = document.documentElement
    root.style.setProperty('--primary', hsl)
    root.style.setProperty('--ring', hsl)
  }, [settings.primaryColor])

  // Toggle global de animaciones
  useEffect(() => {
    const body = document.body
    if (!body) return
    if (settings.enableAnimations) {
      body.classList.remove('no-animations')
    } else {
      body.classList.add('no-animations')
    }
  }, [settings.enableAnimations])

  // Toggle modo compacto global
  useEffect(() => {
    const body = document.body
    if (!body) return
    if (settings.compactMode) {
      body.classList.add('compact')
    } else {
      body.classList.remove('compact')
    }
  }, [settings.compactMode])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Configuración del Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Administra la configuración general del sistema de cosméticos
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-gradient"
        >
          {saving ? (
            <>
              <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Guardando...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Guardado
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="pos">POS</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Información de la Empresa
                </CardTitle>
                <CardDescription>
                  Configuración básica de la empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyAddress">Dirección</Label>
                  <Textarea
                    id="companyAddress"
                    value={settings.companyAddress}
                    onChange={(e) => updateSetting('companyAddress', e.target.value)}
                    rows={3}
                    placeholder="Calle y número, Barrio, Ciudad, Departamento"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyPhone">Teléfono</Label>
                  <Input
                    id="companyPhone"
                    value={settings.companyPhone}
                    onChange={(e) => updateSetting('companyPhone', e.target.value)}
                    onBlur={(e) => validateField('companyPhone', e.target.value)}
                    placeholder="+595 991 123 456"
                  />
                  {errors.companyPhone && (
                    <p className="text-xs text-red-600">{errors.companyPhone}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Formato Paraguay: +595 991 123 456</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => updateSetting('companyEmail', e.target.value)}
                    onBlur={(e) => validateField('companyEmail', e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                  {errors.companyEmail && (
                    <p className="text-xs text-red-600">{errors.companyEmail}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyRUC">RUC</Label>
                  <Input
                    id="companyRUC"
                    value={settings.companyRUC || ''}
                    onChange={(e) => updateSetting('companyRUC', e.target.value)}
                    onBlur={(e) => validateField('companyRUC', e.target.value)}
                    placeholder="1234567-8"
                  />
                  {errors.companyRUC && (
                    <p className="text-xs text-red-600">{errors.companyRUC}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Configuración Regional
                </CardTitle>
                <CardDescription>
                  Zona horaria, idioma y moneda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Paraguay</Label>
                    <p className="text-sm text-muted-foreground">Sincroniza zona horaria, idioma y moneda</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={applyParaguayDefaults}>
                    Sincronizar a Paraguay
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Asuncion">Paraguay (GMT-4)</SelectItem>
                      <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                      <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Los Ángeles (GMT-8)</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es-PY">Español (Paraguay)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PYG">Guaraní Paraguayo (PYG)</SelectItem>
                      <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
                      <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Nota: En Paraguay el IVA es 10% y el PYG no usa decimales.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Respaldos y Mantenimiento
                </CardTitle>
                <CardDescription>
                  Configuración de respaldos automáticos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Respaldo Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Realizar respaldos automáticos de la base de datos
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="backupFrequency">Frecuencia de Respaldo</Label>
                  <Select value={settings.backupFrequency} onValueChange={(value) => updateSetting('backupFrequency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Cada hora</SelectItem>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxUsers">Máximo de Usuarios</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={settings.maxUsers}
                    onChange={(e) => updateSetting('maxUsers', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Logs y Monitoreo
                </CardTitle>
                <CardDescription>
                  Configuración de registros del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Habilitar Logs</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar actividades del sistema
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableLogging}
                    onCheckedChange={(checked) => updateSetting('enableLogging', checked)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="logLevel">Nivel de Log</Label>
                  <Select value={settings.logLevel} onValueChange={(value) => updateSetting('logLevel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Solo Errores</SelectItem>
                      <SelectItem value="warn">Advertencias</SelectItem>
                      <SelectItem value="info">Información</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sessionTimeout">Timeout de Sesión (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Políticas de Contraseñas
                </CardTitle>
                <CardDescription>
                  Configuración de seguridad de contraseñas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Contraseñas Seguras</Label>
                    <p className="text-sm text-muted-foreground">
                      Requerir contraseñas complejas
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireStrongPasswords}
                    onCheckedChange={(checked) => updateSetting('requireStrongPasswords', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticación de Dos Factores</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar 2FA para todos los usuarios
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableTwoFactor}
                    onCheckedChange={(checked) => updateSetting('enableTwoFactor', checked)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxLoginAttempts">Máximo Intentos de Login</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lockoutDuration">Duración de Bloqueo (minutos)</Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    value={settings.lockoutDuration}
                    onChange={(e) => updateSetting('lockoutDuration', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Estado de Seguridad
                </CardTitle>
                <CardDescription>
                  Resumen del estado de seguridad actual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Contraseñas Seguras</span>
                    <Badge variant={settings.requireStrongPasswords ? "default" : "destructive"}>
                      {settings.requireStrongPasswords ? "Habilitado" : "Deshabilitado"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Autenticación 2FA</span>
                    <Badge variant={settings.enableTwoFactor ? "default" : "secondary"}>
                      {settings.enableTwoFactor ? "Habilitado" : "Deshabilitado"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Logs de Seguridad</span>
                    <Badge variant={settings.enableLogging ? "default" : "destructive"}>
                      {settings.enableLogging ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Respaldos Automáticos</span>
                    <Badge variant={settings.autoBackup ? "default" : "destructive"}>
                      {settings.autoBackup ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuración de Email
              </CardTitle>
              <CardDescription>
                Configurar servidor SMTP para notificaciones por email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="smtpHost">Servidor SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={settings.smtpHost}
                    onChange={(e) => updateSetting('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="smtpPort">Puerto</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="smtpUser">Usuario</Label>
                  <Input
                    id="smtpUser"
                    value={settings.smtpUser}
                    onChange={(e) => updateSetting('smtpUser', e.target.value)}
                    placeholder="usuario@gmail.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="smtpPassword">Contraseña</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                    aria-describedby="smtpPasswordHelp"
                  />
                  <p id="smtpPasswordHelp" className="text-sm text-muted-foreground">
                    Deja este campo vacío para mantener la contraseña actual.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar notificaciones importantes por email
                  </p>
                </div>
                <Switch
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) => updateSetting('enableEmailNotifications', checked)}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const hasPwd = !!settings.smtpPassword || !!config.systemSettings?.email?.smtpPassword
                  const ok = !!settings.smtpHost && typeof settings.smtpPort === 'number' && settings.smtpPort > 0 && !!settings.smtpUser && hasPwd
                  if (ok) {
                    toast({ title: 'Configuración válida', description: 'Validación básica OK. Para prueba de envío real se requiere backend.' })
                  } else {
                    toast({ title: 'Configuración incompleta', description: 'Completa host, puerto, usuario y contraseña para probar.', variant: 'destructive' })
                  }
                }}
                disabled={settings.enableEmailNotifications && (
                  !settings.smtpHost || !(typeof settings.smtpPort === 'number' && settings.smtpPort > 0) || !settings.smtpUser || (!settings.smtpPassword && !config.systemSettings?.email?.smtpPassword)
                )}
              >
                <Mail className="w-4 h-4 mr-2" />
                Probar Configuración de Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POS Settings */}
        <TabsContent value="pos">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Configuración de Ventas
                </CardTitle>
                <CardDescription>
                  Configuración del punto de venta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="taxRate">Tasa de Impuesto (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    value={settings.taxRate}
                    onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Control de Inventario</Label>
                    <p className="text-sm text-muted-foreground">
                      Descontar stock automáticamente al vender
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableInventoryTracking}
                    onCheckedChange={(checked) => updateSetting('enableInventoryTracking', checked)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lowStockThreshold">Umbral de Stock Bajo</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    value={settings.lowStockThreshold}
                    onChange={(e) => updateSetting('lowStockThreshold', parseInt(e.target.value))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Imprimir Recibos</Label>
                    <p className="text-sm text-muted-foreground">
                      Imprimir recibo automáticamente al finalizar venta
                    </p>
                  </div>
                  <Switch
                    checked={settings.printReceipts}
                    onCheckedChange={(checked) => updateSetting('printReceipts', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Hardware POS
                </CardTitle>
                <CardDescription>
                  Configuración de dispositivos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lector de Código de Barras</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar entrada por escáner
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableBarcodeScanner}
                    onCheckedChange={(checked) => updateSetting('enableBarcodeScanner', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cajón de Dinero</Label>
                    <p className="text-sm text-muted-foreground">
                      Abrir cajón al finalizar venta en efectivo
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableCashDrawer}
                    onCheckedChange={(checked) => updateSetting('enableCashDrawer', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <div className="grid gap-6">
            {/* Theme Selection */}
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-violet-500" />
                      Tema y Modo de Color
                    </CardTitle>
                    <CardDescription>
                      Selecciona el modo de visualización del sistema
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateSetting('theme', 'system')
                      updateSetting('primaryColor', 'blue')
                      updateSetting('accentColor', 'default')
                      updateSetting('borderRadius', '0.5')
                      updateSetting('fontFamily', 'inter')
                      updateSetting('density', 'normal')
                      updateSetting('enableAnimations', true)
                      updateSetting('enableGlassmorphism', true)
                      updateSetting('enableGradients', true)
                      updateSetting('enableShadows', true)
                    }}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restablecer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Mode */}
                <div className="grid gap-3">
                  <Label className="text-base font-medium">Modo de Tema</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'light', label: 'Claro', icon: Sun, description: 'Fondo claro' },
                      { value: 'dark', label: 'Oscuro', icon: Moon, description: 'Fondo oscuro' },
                      { value: 'system', label: 'Sistema', icon: Monitor, description: 'Automático' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateSetting('theme', option.value)}
                        className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                          settings.theme === option.value
                            ? 'border-primary bg-primary/5 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          settings.theme === option.value
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <option.icon className="h-6 w-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                        {settings.theme === option.value && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Palette */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paintbrush className="h-5 w-5 text-pink-500" />
                  Paleta de Colores
                </CardTitle>
                <CardDescription>
                  Elige los colores principales del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Color */}
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Color Principal</Label>
                    <Badge variant="outline" className="capitalize">
                      {settings.primaryColor}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-9 gap-2">
                    {Object.entries(PRIMARY_HEX_MAP).map(([color, hex]) => (
                      <button
                        key={color}
                        className={`group relative w-full aspect-square rounded-xl transition-all duration-200 hover:scale-110 hover:z-10 ${
                          settings.primaryColor === color 
                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 z-10' 
                            : ''
                        }`}
                        style={{ backgroundColor: hex }}
                        onClick={() => updateSetting('primaryColor', color)}
                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                      >
                        {settings.primaryColor === color && (
                          <CheckCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-lg" />
                        )}
                        <span className="sr-only">{color}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El color principal se aplica a botones, enlaces y elementos destacados.
                  </p>
                </div>

                {/* Accent Color */}
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Color de Acento</Label>
                    <Badge variant="outline" className="capitalize">
                      {settings.accentColor === 'default' ? 'Automático' : settings.accentColor}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(ACCENT_COLORS).map(([color, value]) => (
                      <button
                        key={color}
                        className={`relative w-10 h-10 rounded-lg transition-all duration-200 hover:scale-110 ${
                          settings.accentColor === color 
                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' 
                            : ''
                        } ${color === 'default' ? 'bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500' : ''}`}
                        style={color !== 'default' ? { backgroundColor: value } : {}}
                        onClick={() => updateSetting('accentColor', color)}
                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                      >
                        {settings.accentColor === color && (
                          <CheckCircle className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-lg" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Typography & Layout */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5 text-blue-500" />
                    Tipografía y Layout
                  </CardTitle>
                  <CardDescription>
                    Personaliza fuentes y espaciado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Font Family */}
                  <div className="grid gap-3">
                    <Label className="text-base font-medium">Familia de Fuente</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {FONT_OPTIONS.map((font) => (
                        <button
                          key={font.value}
                          onClick={() => updateSetting('fontFamily', font.value)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            settings.fontFamily === font.value
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <p className={`font-medium ${font.sample}`}>{font.label}</p>
                          <p className={`text-xs text-muted-foreground ${font.sample}`}>Aa Bb Cc 123</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Radius */}
                  <div className="grid gap-3">
                    <Label className="text-base font-medium">Bordes Redondeados</Label>
                    <div className="flex gap-2">
                      {RADIUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateSetting('borderRadius', option.value)}
                          className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                            settings.borderRadius === option.value
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                          style={{ borderRadius: `${parseFloat(option.value) * 8}px` }}
                        >
                          <option.icon className="h-5 w-5 mx-auto text-slate-500" />
                          <p className="text-xs text-center mt-1">{option.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Density */}
                  <div className="grid gap-3">
                    <Label className="text-base font-medium">Densidad de Contenido</Label>
                    <Select value={settings.density} onValueChange={(value) => updateSetting('density', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DENSITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Visual Effects */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Efectos Visuales
                  </CardTitle>
                  <CardDescription>
                    Controla animaciones y efectos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        Animaciones
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Transiciones y efectos de movimiento
                      </p>
                    </div>
                    <Switch
                      checked={settings.enableAnimations}
                      onCheckedChange={(checked) => updateSetting('enableAnimations', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-500" />
                        Glassmorphism
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Efecto de cristal translúcido
                      </p>
                    </div>
                    <Switch
                      checked={settings.enableGlassmorphism}
                      onCheckedChange={(checked) => updateSetting('enableGlassmorphism', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Brush className="h-4 w-4 text-pink-500" />
                        Gradientes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Fondos con degradados de color
                      </p>
                    </div>
                    <Switch
                      checked={settings.enableGradients}
                      onCheckedChange={(checked) => updateSetting('enableGradients', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Contrast className="h-4 w-4 text-slate-500" />
                        Sombras
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Sombras en cards y elementos
                      </p>
                    </div>
                    <Switch
                      checked={settings.enableShadows}
                      onCheckedChange={(checked) => updateSetting('enableShadows', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-t">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4 text-emerald-500" />
                        Modo Compacto
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Reducir espaciado general
                      </p>
                    </div>
                    <Switch
                      checked={settings.compactMode}
                      onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Card */}
            <Card className="card-hover overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-emerald-500" />
                  Vista Previa
                </CardTitle>
                <CardDescription>
                  Así se verán los componentes con tu configuración actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="p-6 rounded-xl border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
                  style={{ borderRadius: `${parseFloat(settings.borderRadius) * 16}px` }}
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Sample Button */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Botones</p>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm"
                          style={{ 
                            backgroundColor: PRIMARY_HEX_MAP[settings.primaryColor],
                            borderRadius: `${parseFloat(settings.borderRadius) * 8}px`
                          }}
                        >
                          Primario
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          style={{ borderRadius: `${parseFloat(settings.borderRadius) * 8}px` }}
                        >
                          Secundario
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          style={{ borderRadius: `${parseFloat(settings.borderRadius) * 8}px` }}
                        >
                          Ghost
                        </Button>
                      </div>
                    </div>

                    {/* Sample Badges */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Badges</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge 
                          style={{ 
                            backgroundColor: PRIMARY_HEX_MAP[settings.primaryColor],
                            borderRadius: `${parseFloat(settings.borderRadius) * 6}px`
                          }}
                        >
                          Activo
                        </Badge>
                        <Badge variant="secondary" style={{ borderRadius: `${parseFloat(settings.borderRadius) * 6}px` }}>
                          Pendiente
                        </Badge>
                        <Badge variant="outline" style={{ borderRadius: `${parseFloat(settings.borderRadius) * 6}px` }}>
                          Nuevo
                        </Badge>
                      </div>
                    </div>

                    {/* Sample Card */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cards</p>
                      <div 
                        className={`p-4 bg-white dark:bg-slate-800 border ${settings.enableShadows ? 'shadow-lg' : ''} ${settings.enableGlassmorphism ? 'backdrop-blur-xl bg-opacity-80' : ''}`}
                        style={{ borderRadius: `${parseFloat(settings.borderRadius) * 12}px` }}
                      >
                        <p className="font-medium text-sm">Ejemplo de Card</p>
                        <p className="text-xs text-muted-foreground mt-1">Con tu estilo personalizado</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
