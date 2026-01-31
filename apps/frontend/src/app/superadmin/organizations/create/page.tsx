'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SuperAdminGuard } from '../../components/SuperAdminGuard';
import { toast } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  ArrowLeft,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Globe,
  Calendar,
  Briefcase,
  FileText,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OrganizationFormData {
  // Información básica
  name: string;
  slug: string;
  description: string;
  industry: string;
  
  // Información de contacto
  email: string;
  phone: string;
  website: string;
  
  // Dirección
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  
  // Configuración (sincronizado con DB)
  subscriptionPlan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL';
  maxUsers: number;
  features: string[];
  
  // Configuraciones adicionales (se guardan en settings JSONB)
  settings: {
    taxRate?: number;
    currency?: string;
    timezone?: string;
    language?: string;
  };
  
  // Administrador de la organización
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  
  // Opciones
  isActive: boolean;
  allowTrialPeriod: boolean;
  trialDays: number;
}

const industries = [
  'Retail',
  'Restaurantes',
  'Supermercados',
  'Farmacia',
  'Tecnología',
  'Servicios',
  'Salud',
  'Educación',
  'Otros',
];

const plans = [
  { value: 'FREE', label: 'Gratuito', color: 'from-gray-500 to-slate-500', description: 'Funcionalidades básicas' },
  { value: 'STARTER', label: 'Starter', color: 'from-blue-500 to-indigo-500', description: 'Para pequeños negocios' },
  { value: 'PROFESSIONAL', label: 'Professional', color: 'from-purple-500 to-pink-500', description: 'Para negocios en crecimiento' },
  { value: 'ENTERPRISE', label: 'Enterprise', color: 'from-orange-500 to-red-500', description: 'Solución empresarial completa' },
];

const availableFeatures = [
  { id: 'pos', label: 'Punto de Venta', icon: CreditCard },
  { id: 'inventory', label: 'Inventario', icon: Briefcase },
  { id: 'reports', label: 'Reportes Avanzados', icon: FileText },
  { id: 'multistore', label: 'Multi-tienda', icon: Building2 },
  { id: 'ecommerce', label: 'E-commerce', icon: Globe },
  { id: 'crm', label: 'CRM', icon: User },
];

export default function CreateOrganizationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    slug: '',
    description: '',
    industry: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'Paraguay',
    postalCode: '',
    subscriptionPlan: 'STARTER',
    subscriptionStatus: 'ACTIVE',
    maxUsers: 5,
    features: ['pos', 'inventory'],
    settings: {
      taxRate: 10,
      currency: 'PYG',
      timezone: 'America/Asuncion',
      language: 'es',
    },
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    isActive: true,
    allowTrialPeriod: true,
    trialDays: 30,
  });

  const handleInputChange = (field: keyof OrganizationFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Auto-generar slug desde el nombre
    if (field === 'name' && typeof value === 'string') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const toggleFeature = (featureId: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const createMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: organization, error: orgError } = await (supabase
        .from('organizations') as any)
        .insert({
          name: data.name,
          slug: data.slug,
          subscription_plan: data.subscriptionPlan,
          subscription_status: data.subscriptionStatus,
          settings: {
            contactInfo: {
              email: data.email,
              phone: data.phone,
              website: data.website,
              address: data.address,
              city: data.city,
              state: data.state,
              country: data.country,
              postalCode: data.postalCode,
            },
            taxRate: data.settings.taxRate,
            currency: data.settings.currency,
            timezone: data.settings.timezone,
            language: data.settings.language,
            industry: data.industry,
            description: data.description,
            limits: {
              maxUsers: data.maxUsers,
            },
            features: data.features,
            adminInfo: {
              name: data.adminName,
              email: data.adminEmail,
              phone: data.adminPhone,
            },
            trial: data.allowTrialPeriod ? {
              enabled: true,
              days: data.trialDays,
            } : null,
          },
        })
        .select()
        .single();

      if (orgError) {
        if (orgError.code === '23505') {
          throw new Error('Ya existe una organización con ese slug. Por favor usa uno diferente.');
        }
        throw orgError;
      }

      return organization;
    },
    onSuccess: (newOrg: { name: string }) => {
      toast.success('¡Organización creada!', { 
        description: `La organización "${newOrg?.name || 'Nueva'}" ha sido creada exitosamente.` 
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      setTimeout(() => {
        router.push('/superadmin/organizations');
      }, 500);
    },
    onError: (error) => {
      console.error('Error creating organization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      toast.error('Error al crear organización', { 
        description: errorMessage
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug || !formData.email || !formData.adminName || !formData.adminEmail) {
      toast.error('Error de validación', { 
        description: 'Por favor completa todos los campos obligatorios marcados con *' 
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email) || !emailRegex.test(formData.adminEmail)) {
      toast.error('Email inválido', { 
        description: 'Por favor ingresa direcciones de email válidas' 
      });
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <SuperAdminGuard>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/50 animate-pulse">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                Crear Nueva Organización
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg font-medium">
                Configura una nueva organización en la plataforma SaaS
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-blue-300/50 dark:border-blue-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/50">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                  Información Básica
                </span>
              </CardTitle>
              <CardDescription>
                Detalles principales de la organización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    Nombre de la Organización <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ej: Mi Empresa S.A."
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug" className="flex items-center gap-2">
                    Slug (URL) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="slug"
                    placeholder="mi-empresa"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    URL: /organizations/{formData.slug || 'slug'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industria</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => handleInputChange('industry', value)}
                  >
                    <SelectTrigger className="border-slate-300 dark:border-slate-700">
                      <SelectValue placeholder="Seleccionar industria" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Corporativo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Breve descripción de la organización..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="border-slate-300 dark:border-slate-700 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+595 21 123456"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Sitio Web
                  </Label>
                  <Input
                    id="website"
                    placeholder="https://www.empresa.com"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-green-300/50 dark:border-green-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/50">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
                  Dirección
                </span>
              </CardTitle>
              <CardDescription>
                Ubicación física de la organización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Av. Principal 1234"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    placeholder="Asunción"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Departamento</Label>
                  <Input
                    id="state"
                    placeholder="Central"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    placeholder="Paraguay"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    placeholder="1234"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan y Características */}
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-purple-300/50 dark:border-purple-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                  Plan y Características
                </span>
              </CardTitle>
              <CardDescription>
                Configuración del plan y funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan">Plan de Suscripción</Label>
                  <Select
                    value={formData.subscriptionPlan}
                    onValueChange={(value) => handleInputChange('subscriptionPlan', value)}
                  >
                    <SelectTrigger className="border-slate-300 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full bg-gradient-to-r', plan.color)} />
                              <span className="font-semibold">{plan.label}</span>
                            </div>
                            <span className="text-xs text-slate-500 ml-5">{plan.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Máximo de Usuarios</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={formData.maxUsers}
                    onChange={(e) => handleInputChange('maxUsers', parseInt(e.target.value))}
                    className="border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Características Habilitadas</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecciona las funcionalidades que estarán disponibles para esta organización
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableFeatures.map((feature) => {
                    const Icon = feature.icon;
                    const isEnabled = formData.features.includes(feature.id);
                    return (
                      <div
                        key={feature.id}
                        onClick={() => toggleFeature(feature.id)}
                        className={cn(
                          'p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105',
                          isEnabled
                            ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-400 dark:border-purple-600 shadow-lg shadow-purple-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg',
                            isEnabled
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50'
                              : 'bg-slate-200 dark:bg-slate-700'
                          )}>
                            <Icon className={cn('h-5 w-5', isEnabled ? 'text-white' : 'text-slate-600 dark:text-slate-400')} />
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              'font-semibold text-sm',
                              isEnabled ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'
                            )}>
                              {feature.label}
                            </p>
                          </div>
                          {isEnabled && (
                            <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Configuraciones Adicionales */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Label className="text-base font-semibold">Configuraciones Regionales</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tasa de Impuesto (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.settings.taxRate || 10}
                      onChange={(e) => handleInputChange('settings', {
                        ...formData.settings,
                        taxRate: parseFloat(e.target.value)
                      })}
                      className="border-slate-300 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select
                      value={formData.settings.currency || 'PYG'}
                      onValueChange={(value) => handleInputChange('settings', {
                        ...formData.settings,
                        currency: value
                      })}
                    >
                      <SelectTrigger className="border-slate-300 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PYG">Guaraníes (PYG)</SelectItem>
                        <SelectItem value="USD">Dólares (USD)</SelectItem>
                        <SelectItem value="EUR">Euros (EUR)</SelectItem>
                        <SelectItem value="ARS">Pesos Argentinos (ARS)</SelectItem>
                        <SelectItem value="BRL">Reales (BRL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona Horaria</Label>
                    <Select
                      value={formData.settings.timezone || 'America/Asuncion'}
                      onValueChange={(value) => handleInputChange('settings', {
                        ...formData.settings,
                        timezone: value
                      })}
                    >
                      <SelectTrigger className="border-slate-300 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Asuncion">Asunción (GMT-4)</SelectItem>
                        <SelectItem value="America/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/Santiago">Santiago (GMT-3)</SelectItem>
                        <SelectItem value="America/Lima">Lima (GMT-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select
                      value={formData.settings.language || 'es'}
                      onValueChange={(value) => handleInputChange('settings', {
                        ...formData.settings,
                        language: value
                      })}
                    >
                      <SelectTrigger className="border-slate-300 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="pt">Português</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Administrador */}
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-orange-300/50 dark:border-orange-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/50">
                  <User className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold">
                  Administrador de la Organización
                </span>
              </CardTitle>
              <CardDescription>
                Usuario principal que administrará la organización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName" className="flex items-center gap-2">
                    Nombre Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="adminName"
                    placeholder="Juan Pérez"
                    value={formData.adminName}
                    onChange={(e) => handleInputChange('adminName', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail" className="flex items-center gap-2">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={formData.adminEmail}
                    onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                    className="border-slate-300 dark:border-slate-700"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPhone">Teléfono</Label>
                <Input
                  id="adminPhone"
                  placeholder="+595 981 123456"
                  value={formData.adminPhone}
                  onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                  className="border-slate-300 dark:border-slate-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuración Adicional */}
          <Card className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-indigo-300/50 dark:border-indigo-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/50">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent font-bold">
                  Opciones Adicionales
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1">
                  <Label htmlFor="isActive" className="font-semibold text-base">
                    Organización Activa
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    La organización tendrá acceso inmediato a la plataforma
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1">
                  <Label htmlFor="allowTrialPeriod" className="font-semibold text-base">
                    Período de Prueba
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Permitir acceso gratuito durante un período inicial
                  </p>
                </div>
                <Switch
                  id="allowTrialPeriod"
                  checked={formData.allowTrialPeriod}
                  onCheckedChange={(checked) => handleInputChange('allowTrialPeriod', checked)}
                />
              </div>

              {formData.allowTrialPeriod && (
                <div className="space-y-2 pl-4">
                  <Label htmlFor="trialDays">Días de Prueba</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.trialDays}
                    onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value))}
                    className="border-slate-300 dark:border-slate-700 max-w-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-4 sticky bottom-4 p-6 rounded-2xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={createMutation.isPending}
              className="border-slate-300 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 min-w-[200px]"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Crear Organización
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </SuperAdminGuard>
  );
}
