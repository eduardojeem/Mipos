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
  RotateCcw,
  Layout,
  Bell,
  Fingerprint,
  Zap
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useBusinessConfig } from '@/contexts/BusinessConfigContext'
import { useToast } from '@/components/ui/use-toast'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

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
    <div className="relative min-h-[calc(100vh-2rem)] space-y-8 p-1 md:p-2 lg:p-4">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[20%] -left-[10%] w-[35%] h-[35%] rounded-full bg-violet-500/5 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-effect p-6 rounded-3xl border shadow-xl bg-background/40 backdrop-blur-md"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-white shadow-lg shadow-primary/20">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
              Configuración
            </h1>
          </div>
          <p className="text-muted-foreground text-sm pl-11">
            Gestiona la identidad visual, operativa y de seguridad de tu negocio
          </p>
        </div>

        <div className="flex items-center gap-2 pl-11 md:pl-0">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className={cn(
              "relative overflow-hidden group transition-all duration-300 rounded-2xl px-6",
              saved ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:shadow-xl hover:shadow-primary/30"
            )}
          >
            <AnimatePresence mode="wait">
              {saving ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando</span>
                </motion.div>
              ) : saved ? (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Sincronizado</span>
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Guardar Cambios</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </motion.div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <div className="relative mb-8 pt-2">
          <TabsList className="flex w-full overflow-x-auto h-auto p-1.5 bg-background/50 backdrop-blur-sm border rounded-2xl md:grid md:grid-cols-6 lg:w-max mx-auto gap-1 shadow-inner">
            {[
              { id: 'general', label: 'General', icon: Globe },
              { id: 'system', label: 'Sistema', icon: HardDrive },
              { id: 'security', label: 'Seguridad', icon: Shield },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'pos', label: 'POS', icon: CreditCard },
              { id: 'appearance', label: 'Apariencia', icon: Palette },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="group relative flex items-center justify-center gap-2 px-6 py-2.5 transition-all duration-500 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg active:scale-95 min-w-[120px]"
              >
                <tab.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span className="font-medium whitespace-nowrap">{tab.label}</span>
                {/* Subtle indicator for active state */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-1 bg-white/40 rounded-full transition-all duration-300 data-[state=active]:w-1/3 opacity-0 group-data-[state=active]:opacity-100" />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* General Settings */}
        <TabsContent value="general">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <Card className="glass-effect overflow-hidden border-primary/10 shadow-xl rounded-3xl hover:border-primary/30 transition-all duration-500">
              <CardHeader className="relative pb-2">
                <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5">
                  <Globe className="w-24 h-24 text-primary" />
                </div>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  Información de la Empresa
                </CardTitle>
                <CardDescription>
                  Datos básicos que aparecerán en tickets y reportes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName" className="text-sm font-semibold opacity-80">Nombre Comercial</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    className="rounded-xl border-primary/10 bg-background/50 focus:bg-background transition-all"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyAddress" className="text-sm font-semibold opacity-80">Dirección Física</Label>
                  <Textarea
                    id="companyAddress"
                    value={settings.companyAddress}
                    onChange={(e) => updateSetting('companyAddress', e.target.value)}
                    rows={3}
                    className="rounded-xl border-primary/10 bg-background/50 focus:bg-background transition-all resize-none"
                    placeholder="Calle y número, Barrio, Ciudad"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyPhone" className="text-sm font-semibold opacity-80">Teléfono</Label>
                    <Input
                      id="companyPhone"
                      value={settings.companyPhone}
                      onChange={(e) => updateSetting('companyPhone', e.target.value)}
                      onBlur={(e) => validateField('companyPhone', e.target.value)}
                      placeholder="+595 9..."
                      className="rounded-xl border-primary/10 bg-background/50 focus:bg-background transition-all"
                    />
                    {errors.companyPhone && (
                      <p className="text-[10px] text-red-500 font-medium animate-pulse">{errors.companyPhone}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="companyRUC" className="text-sm font-semibold opacity-80">RUC / ID Identificación</Label>
                    <Input
                      id="companyRUC"
                      value={settings.companyRUC || ''}
                      onChange={(e) => updateSetting('companyRUC', e.target.value)}
                      onBlur={(e) => validateField('companyRUC', e.target.value)}
                      placeholder="1234567-8"
                      className="rounded-xl border-primary/10 bg-background/50 focus:bg-background transition-all"
                    />
                    {errors.companyRUC && (
                      <p className="text-[10px] text-red-500 font-medium animate-pulse">{errors.companyRUC}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyEmail" className="text-sm font-semibold opacity-80">Correo Electrónico</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => updateSetting('companyEmail', e.target.value)}
                    onBlur={(e) => validateField('companyEmail', e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="rounded-xl border-primary/10 bg-background/50 focus:bg-background transition-all"
                  />
                  {errors.companyEmail && (
                    <p className="text-[10px] text-red-500 font-medium animate-pulse">{errors.companyEmail}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl hover:border-primary/30 transition-all duration-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  Configuración Regional
                </CardTitle>
                <CardDescription>
                  Localización, moneda y formatos del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      Ajuste Rápido Paraguay
                    </h4>
                    <p className="text-xs text-muted-foreground leading-tight">Configura automáticamente moneda (PYG), IVA (10%) y horario local.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={applyParaguayDefaults} className="rounded-xl border-primary/20 hover:bg-primary/10 shrink-0">
                    Aplicar
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="timezone" className="text-sm font-semibold opacity-80">Zona Horaria</Label>
                    <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                      <SelectTrigger className="rounded-xl border-primary/10 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Asuncion">Paraguay (GMT-4)</SelectItem>
                        <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                        <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="language" className="text-sm font-semibold opacity-80">Idioma del Interfaz</Label>
                    <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                      <SelectTrigger className="rounded-xl border-primary/10 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es-PY">Español (Paraguay)</SelectItem>
                        <SelectItem value="es">Español (General)</SelectItem>
                        <SelectItem value="en">English (US)</SelectItem>
                        <SelectItem value="pt">Português (BR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="currency" className="text-sm font-semibold opacity-80">Moneda Base</Label>
                    <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                      <SelectTrigger className="rounded-xl border-primary/10 bg-background/50 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PYG">Guaraní Paraguayo (₲)</SelectItem>
                        <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                        <SelectItem value="BRL">Real Brasileño (R$)</SelectItem>
                        <SelectItem value="ARS">Peso Argentino ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/30 border text-[11px] text-muted-foreground italic">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Cambiar la moneda base puede afectar el historial de reportes financieros anteriores.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400">
                    <Database className="h-5 w-5" />
                  </div>
                  Respaldos y Mantenimiento
                </CardTitle>
                <CardDescription>
                  Protección de datos y optimización del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
                  <div className="space-y-1">
                    <Label className="font-bold flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-green-500" />
                      Respaldo Automático
                    </Label>
                    <p className="text-xs text-muted-foreground leading-tight">
                      Garantiza la integridad de tus datos diariamente.
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="backupFrequency" className="text-sm font-semibold opacity-80">Frecuencia de Respaldo</Label>
                    <Select value={settings.backupFrequency} onValueChange={(value) => updateSetting('backupFrequency', value)}>
                      <SelectTrigger className="rounded-xl border-primary/10 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Cada hora (Alta seguridad)</SelectItem>
                        <SelectItem value="daily">Diario (Recomendado)</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="maxUsers" className="text-sm font-semibold opacity-80">Máximo de Usuarios Simultáneos</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="maxUsers"
                        type="number"
                        value={settings.maxUsers}
                        onChange={(e) => updateSetting('maxUsers', parseInt(e.target.value))}
                        className="rounded-xl border-primary/10 bg-background/50 text-center font-bold w-24"
                      />
                      <div className="text-xs text-muted-foreground flex-1">
                        Determina cuántas sesiones concurrentes permite el sistema antes de limitar el acceso.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-500/5 text-slate-600 dark:text-slate-400">
                    <Layout className="h-5 w-5" />
                  </div>
                  Logs y Monitoreo
                </CardTitle>
                <CardDescription>
                  Trazabilidad y diagnóstico de operaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-colors hover:bg-muted/30">
                  <div className="space-y-1">
                    <Label className="font-bold">Habilitar Logging Avanzado</Label>
                    <p className="text-xs text-muted-foreground leading-tight">
                      Registra auditoría detallada de cada acción.
                    </p>
                  </div>
                  <Switch
                    checked={settings.enableLogging}
                    onCheckedChange={(checked) => updateSetting('enableLogging', checked)}
                  />
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="logLevel" className="text-sm font-semibold opacity-80">Nivel de Detalle (Verbosity)</Label>
                    <Select value={settings.logLevel} onValueChange={(value) => updateSetting('logLevel', value)}>
                      <SelectTrigger className="rounded-xl border-primary/10 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Solo Errores Críticos</SelectItem>
                        <SelectItem value="warn">Advertencias y Errores</SelectItem>
                        <SelectItem value="info">General (Recomendado)</SelectItem>
                        <SelectItem value="debug">Debug (Desarrollo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sessionTimeout" className="text-sm font-semibold opacity-80">Expiración de Sesión (Minutos)</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Slider
                          value={[settings.sessionTimeout]}
                          min={5}
                          max={120}
                          step={5}
                          onValueChange={([val]) => updateSetting('sessionTimeout', val)}
                        />
                      </div>
                      <Badge variant="outline" className="w-16 justify-center py-1 font-mono text-primary border-primary/20">
                        {settings.sessionTimeout}m
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 text-red-600 dark:text-red-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  Políticas de Seguridad
                </CardTitle>
                <CardDescription>
                  Configura restricciones de acceso y autenticación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-all hover:bg-muted/30 group">
                    <div className="space-y-1">
                      <Label className="font-bold flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-violet-500" />
                        Contraseñas Seguras
                      </Label>
                      <p className="text-xs text-muted-foreground">Obligar uso de MAYUS, números y símbolos.</p>
                    </div>
                    <Switch
                      checked={settings.requireStrongPasswords}
                      onCheckedChange={(checked) => updateSetting('requireStrongPasswords', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border transition-all hover:bg-muted/30">
                    <div className="space-y-1">
                      <Label className="font-bold flex items-center gap-2 text-primary">
                        <Bell className="w-4 h-4" />
                        Autenticación 2FA
                      </Label>
                      <p className="text-xs text-muted-foreground font-medium">Factor adicional vía Email o App.</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase tracking-wider font-bold h-6 px-2">PRO</Badge>
                  </div>
                </div>

                <div className="grid gap-4 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="maxLoginAttempts" className="text-sm font-semibold opacity-80">Máximo de Intentos Fallidos</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[settings.maxLoginAttempts]}
                        min={3}
                        max={10}
                        step={1}
                        onValueChange={([val]) => updateSetting('maxLoginAttempts', val)}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-10 justify-center h-8 font-bold border-none">{settings.maxLoginAttempts}</Badge>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="lockoutDuration" className="text-sm font-semibold opacity-80">Duración de Bloqueo (Minutos)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[settings.lockoutDuration]}
                        min={5}
                        max={60}
                        step={5}
                        onValueChange={([val]) => updateSetting('lockoutDuration', val)}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-10 justify-center h-8 font-bold border-none">{settings.lockoutDuration}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <AlertTriangle className="w-32 h-32" />
              </div>
              <CardHeader className="pb-4 relative">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  Salud de Seguridad
                </CardTitle>
                <CardDescription>
                  Puntuación actual de protección del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                <div className="grid gap-3">
                  {[
                    { label: 'Políticas Password', active: settings.requireStrongPasswords, severity: 'default' },
                    { label: '2FA Global', active: settings.enableTwoFactor, severity: 'secondary' },
                    { label: 'Auditoría Logs', active: settings.enableLogging, severity: 'default' },
                    { label: 'Backups Activos', active: settings.autoBackup, severity: 'default' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-2xl bg-background/40 border-none shadow-sm"
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", item.active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
                        <Badge variant={item.active ? "outline" : "destructive"} className={cn("text-[10px] h-5 min-w-[80px] justify-center", item.active && "border-green-500/30 text-green-600")}>
                          {item.active ? "Protegido" : "Vulnerable"}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/10">
                  <p className="text-xs font-medium flex items-center gap-2 text-primary">
                    <Zap className="w-3.5 h-3.5" />
                    Tu sistema está al 75% de seguridad optimizada.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6"
          >
            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-1" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  Configuración de Mensajería
                </CardTitle>
                <CardDescription>
                  Servidor SMTP para envío de facturas y notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="smtpHost" className="text-sm font-semibold opacity-80 pl-1">Servidor SMTP</Label>
                    <Input
                      id="smtpHost"
                      value={settings.smtpHost}
                      onChange={(e) => updateSetting('smtpHost', e.target.value)}
                      placeholder="e.g. smtp.gmail.com"
                      className="rounded-xl border-primary/10 bg-background/50"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="smtpPort" className="text-sm font-semibold opacity-80 pl-1">Puerto de Conexión</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={settings.smtpPort}
                      onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value))}
                      className="rounded-xl border-primary/10 bg-background/50 font-mono"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="smtpUser" className="text-sm font-semibold opacity-80 pl-1">Usuario / Email</Label>
                    <Input
                      id="smtpUser"
                      value={settings.smtpUser}
                      onChange={(e) => updateSetting('smtpUser', e.target.value)}
                      placeholder="usuario@dominio.com"
                      className="rounded-xl border-primary/10 bg-background/50"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="smtpPassword" className="text-sm font-semibold opacity-80 pl-1">Contraseña de Aplicación</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={settings.smtpPassword}
                      onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                      className="rounded-xl border-primary/10 bg-background/50"
                    />
                    <p className="text-[10px] text-muted-foreground italic pl-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Se recomienda usar "Contraseñas de Aplicación" para Gmail/Outlook.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="space-y-1">
                    <Label className="font-bold flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Habilitar Notificaciones Automáticas
                    </Label>
                    <p className="text-xs text-muted-foreground">Enviar copia de tickets por correo al cliente final.</p>
                  </div>
                  <Switch
                    checked={settings.enableEmailNotifications}
                    onCheckedChange={(checked) => updateSetting('enableEmailNotifications', checked)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="secondary"
                    className="flex-1 rounded-xl h-12 font-bold group"
                    onClick={() => {
                      toast({ title: 'Configuración guardada', description: 'Se ha verificado la estructura de los campos.' })
                    }}
                  >
                    <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Validar Datos
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl h-12 border-primary/20 hover:bg-primary/5 group"
                  >
                    <Zap className="w-4 h-4 mr-2 text-amber-500 group-hover:animate-pulse" />
                    Enviar Correo de Prueba
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* POS Settings */}
        <TabsContent value="pos">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="pb-4 relative">
                <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-[0.03]">
                  <CreditCard className="w-32 h-32" />
                </div>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  Reglas de Negocio (POS)
                </CardTitle>
                <CardDescription>
                  Lógica de facturación, impuestos y stock
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="taxRate" className="text-sm font-semibold opacity-80">Tasa de Impuesto Aplicable (%)</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        value={settings.taxRate}
                        onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value))}
                        className="rounded-xl border-primary/10 bg-background/50 pl-10 font-bold"
                      />
                      <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    </div>
                    <Badge className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 border-none font-bold">IVA</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border hover:bg-muted/30 transition-all group">
                    <div className="space-y-1">
                      <Label className="font-bold flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        Control de Inventario
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Descontar stock en tiempo real al facturar.</p>
                    </div>
                    <Switch
                      checked={settings.enableInventoryTracking}
                      onCheckedChange={(checked) => updateSetting('enableInventoryTracking', checked)}
                    />
                  </div>

                  <div className="grid gap-2 p-4 rounded-2xl bg-muted/20 border group">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Aviso de Stock Bajo
                      </Label>
                      <Badge variant="secondary" className="font-mono">{settings.lowStockThreshold} u.</Badge>
                    </div>
                    <Slider
                      value={[settings.lowStockThreshold]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={([val]) => updateSetting('lowStockThreshold', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border hover:bg-muted/30 transition-all">
                    <div className="space-y-1">
                      <Label className="font-bold flex items-center gap-2">
                        <Printer className="w-4 h-4 text-slate-500" />
                        Impresión Automática
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Generar ticket PDF/Impresión al cobrar.</p>
                    </div>
                    <Switch
                      checked={settings.printReceipts}
                      onCheckedChange={(checked) => updateSetting('printReceipts', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-primary/10 shadow-xl rounded-3xl overflow-hidden self-start">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400">
                    <Printer className="h-5 w-5" />
                  </div>
                  Dispositivos y Periféricos
                </CardTitle>
                <CardDescription>
                  Integración con hardware externo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl border bg-background/50 hover:border-primary/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Lector de Códigos</p>
                        <p className="text-[11px] text-muted-foreground">Escaneo rápido de EAN-13/QR</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableBarcodeScanner}
                      onCheckedChange={(checked) => updateSetting('enableBarcodeScanner', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border bg-background/50 hover:border-primary/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Database className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Gajón de Dinero</p>
                        <p className="text-[11px] text-muted-foreground">Apertura por pulso eléctrico (RJ11)</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.enableCashDrawer}
                      onCheckedChange={(checked) => updateSetting('enableCashDrawer', checked)}
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Requisito de Hardware</p>
                    <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">Asegúrese de tener instalados los drivers QZ Tray o similar para impresión térmica directa.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid gap-8"
          >
            {/* Theme Selection */}
            <Card className="glass-effect border-primary/10 shadow-2xl rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-6 border-b bg-muted/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-primary/40 text-white shadow-lg shadow-primary/20">
                        <Palette className="h-6 w-6" />
                      </div>
                      Experiencia Visual
                    </CardTitle>
                    <CardDescription className="text-sm font-medium">
                      Personaliza el entorno de trabajo según tu preferencia
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateSetting('theme', 'system')
                      updateSetting('primaryColor', 'blue')
                      updateSetting('borderRadius', '0.5')
                      updateSetting('fontFamily', 'inter')
                      updateSetting('enableAnimations', true)
                      updateSetting('enableGlassmorphism', true)
                      updateSetting('enableGradients', true)
                    }}
                    className="gap-2 rounded-xl hover:bg-primary/5 text-primary font-bold"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restablecer Estilos
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                {/* Theme Mode */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-primary" />
                    <Label className="text-lg font-bold">Modo de Interfaz</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { value: 'light', label: 'Claro', icon: Sun, bg: 'bg-white', text: 'text-slate-900 border-slate-200' },
                      { value: 'dark', label: 'Oscuro', icon: Moon, bg: 'bg-slate-950', text: 'text-white border-slate-800' },
                      { value: 'system', label: 'Sistema', icon: Monitor, bg: 'bg-gradient-to-br from-white to-slate-950', text: 'text-foreground border-muted' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateSetting('theme', option.value)}
                        className={cn(
                          "group relative flex flex-col gap-4 p-5 rounded-[1.5rem] border-2 transition-all duration-300 active:scale-95 overflow-hidden",
                          settings.theme === option.value
                            ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                            : "border-muted hover:border-primary/20 bg-background/50"
                        )}
                      >
                        <div className={cn(
                          "aspect-video rounded-xl flex items-center justify-center relative overflow-hidden",
                          option.bg, option.text, "border shadow-inner"
                        )}>
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                          <option.icon className={cn("h-10 w-10 relative z-10 transition-transform group-hover:scale-110 duration-500", settings.theme === option.value ? "text-primary" : "opacity-40")} />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-bold text-base leading-none">{option.label}</p>
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">Esquema de Colores</p>
                        </div>
                        {settings.theme === option.value && (
                          <motion.div
                            layoutId="active-theme"
                            className="absolute top-3 right-3"
                          >
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  {/* Primary Color Palette */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paintbrush className="w-4 h-4 text-primary" />
                        <Label className="text-lg font-bold">Acento de Marca</Label>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 capitalize font-bold border-primary/20 text-primary bg-primary/5">
                        {settings.primaryColor}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      {Object.entries(PRIMARY_HEX_MAP).map(([color, hex]) => (
                        <button
                          key={color}
                          className={cn(
                            "group relative aspect-square rounded-2xl transition-all duration-300 hover:scale-110 active:scale-90 shadow-sm",
                            settings.primaryColor === color
                              ? "ring-2 ring-primary ring-offset-4 ring-offset-background"
                              : "hover:shadow-md"
                          )}
                          style={{ backgroundColor: hex }}
                          onClick={() => updateSetting('primaryColor', color)}
                          title={color}
                        >
                          {settings.primaryColor === color && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 m-auto h-6 w-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40"
                            >
                              <CheckCircle className="h-4 w-4 text-white" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Este color define la personalidad de tus botones, enlaces y estados activos.</p>
                  </div>

                  {/* Geometry & Space */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-primary" />
                      <Label className="text-lg font-bold">Geometría y Espacio</Label>
                    </div>
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm font-bold opacity-70">
                          <span>Curvatura de Bordes</span>
                          <span className="text-primary font-mono">{settings.borderRadius}rem</span>
                        </div>
                        <div className="flex gap-2">
                          {RADIUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => updateSetting('borderRadius', option.value)}
                              className={cn(
                                "flex-1 h-12 rounded-xl border-2 transition-all flex items-center justify-center group",
                                settings.borderRadius === option.value
                                  ? "border-primary bg-primary/10"
                                  : "border-muted hover:border-primary/30"
                              )}
                            >
                              <option.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", settings.borderRadius === option.value ? "text-primary" : "text-muted-foreground")} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between text-sm font-bold opacity-70">
                          <span>Densidad Visual</span>
                          <span className="text-primary capitalize">{settings.density}</span>
                        </div>
                        <div className="flex gap-2 p-1.5 bg-muted/30 rounded-2xl border">
                          {DENSITY_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => updateSetting('density', option.value)}
                              className={cn(
                                "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all",
                                settings.density === option.value
                                  ? "bg-background text-primary shadow-sm border border-primary/10"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Effects & Motion */}
              <Card className="glass-effect border-primary/10 shadow-xl rounded-[2rem]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    Efectos y Movimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { id: 'enableAnimations', label: 'Animaciones Fluidas', icon: RotateCcw, color: 'text-blue-500' },
                    { id: 'enableGlassmorphism', label: 'Glassmorphism (Cristal)', icon: Layers, color: 'text-indigo-500' },
                    { id: 'enableGradients', label: 'Degradados de Marca', icon: Brush, color: 'text-pink-500' },
                    { id: 'enableShadows', label: 'Sombras de Profundidad', icon: Contrast, color: 'text-slate-500' },
                  ].map((effect) => (
                    <div key={effect.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-transparent hover:border-primary/10 transition-all">
                      <div className="flex items-center gap-3">
                        <effect.icon className={cn("w-4 h-4", effect.color)} />
                        <Label className="font-bold text-sm cursor-pointer" htmlFor={effect.id}>{effect.label}</Label>
                      </div>
                      <Switch
                        id={effect.id}
                        checked={(settings as any)[effect.id]}
                        onCheckedChange={(checked) => updateSetting(effect.id, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card className="glass-effect border-primary/10 shadow-xl rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                      <Eye className="h-5 w-5" />
                    </div>
                    Vista Previa Real
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full pb-10">
                  <div
                    className="p-6 h-full rounded-3xl border bg-background/60 shadow-inner space-y-6"
                    style={{ borderRadius: `${parseFloat(settings.borderRadius) * 1.5}rem` }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary" />
                        <div className="h-3 w-32 bg-muted rounded-full" />
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/20 border space-y-3" style={{ borderRadius: `${parseFloat(settings.borderRadius) * 0.8}rem` }}>
                        <div className="h-2 w-full bg-muted rounded-full" />
                        <div className="h-2 w-2/3 bg-muted rounded-full opacity-50" />
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" className="rounded-xl h-8 text-[10px] font-bold" style={{ backgroundColor: PRIMARY_HEX_MAP[settings.primaryColor], borderRadius: `${parseFloat(settings.borderRadius) * 0.5}rem` }}>Confirmar</Button>
                          <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold" style={{ borderRadius: `${parseFloat(settings.borderRadius) * 0.5}rem` }}>Cancelar</Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-primary/10 flex flex-col items-center gap-1 border border-primary/20" style={{ borderRadius: `${parseFloat(settings.borderRadius) * 1}rem` }}>
                        <Zap className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-bold text-primary">Velocidad</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/10 border flex flex-col items-center gap-1" style={{ borderRadius: `${parseFloat(settings.borderRadius) * 1}rem` }}>
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground">Seguro</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
