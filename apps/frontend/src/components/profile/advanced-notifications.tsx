'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare,
  Clock,
  Settings,
  Volume2,
  VolumeX,
  Save,
  Edit3,
  X,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Package,
  Users,
  FileText
} from 'lucide-react';
import React from 'react';
import { toast } from '@/lib/toast';

const timeSlotSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
});

const notificationSettingsSchema = z.object({
  channels: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
    inApp: z.boolean(),
  }),
  categories: z.object({
    sales: z.object({
      enabled: z.boolean(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      channels: z.array(z.string()),
    }),
    inventory: z.object({
      enabled: z.boolean(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      channels: z.array(z.string()),
    }),
    customers: z.object({
      enabled: z.boolean(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      channels: z.array(z.string()),
    }),
    system: z.object({
      enabled: z.boolean(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      channels: z.array(z.string()),
    }),
    reports: z.object({
      enabled: z.boolean(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      channels: z.array(z.string()),
    }),
  }),
  schedule: z.object({
    enabled: z.boolean(),
    timezone: z.string(),
    workingHours: timeSlotSchema,
    weekends: z.boolean(),
    holidays: z.boolean(),
  }),
  frequency: z.object({
    digest: z.enum(['never', 'daily', 'weekly', 'monthly']),
    realTime: z.boolean(),
    batchDelay: z.number().min(0).max(60),
  }),
  customRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    condition: z.string(),
    action: z.string(),
    enabled: z.boolean(),
  })),
});

type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

interface AdvancedNotificationsProps {
  initialData?: Partial<NotificationSettings>;
  onUpdate: (data: NotificationSettings) => Promise<boolean>;
  isLoading?: boolean;
}

const defaultSettings: NotificationSettings = {
  channels: {
    email: true,
    push: true,
    sms: false,
    inApp: true,
  },
  categories: {
    sales: {
      enabled: true,
      priority: 'high',
      channels: ['email', 'push', 'inApp'],
    },
    inventory: {
      enabled: true,
      priority: 'medium',
      channels: ['email', 'inApp'],
    },
    customers: {
      enabled: true,
      priority: 'medium',
      channels: ['email', 'push'],
    },
    system: {
      enabled: true,
      priority: 'critical',
      channels: ['email', 'push', 'inApp'],
    },
    reports: {
      enabled: false,
      priority: 'low',
      channels: ['email'],
    },
  },
  schedule: {
    enabled: true,
    timezone: 'America/Mexico_City',
    workingHours: {
      start: '09:00',
      end: '18:00',
    },
    weekends: false,
    holidays: false,
  },
  frequency: {
    digest: 'daily',
    realTime: true,
    batchDelay: 5,
  },
  customRules: [],
};

const channelIcons = {
  email: Mail,
  push: Smartphone,
  sms: MessageSquare,
  inApp: Bell,
};

const channelLabels = {
  email: 'Email',
  push: 'Push',
  sms: 'SMS',
  inApp: 'En App',
};

const categoryLabels = {
  sales: 'Ventas',
  inventory: 'Inventario',
  customers: 'Clientes',
  system: 'Sistema',
  reports: 'Reportes',
};

const categoryIcons = {
  sales: Zap,
  inventory: Package,
  customers: Users,
  system: Settings,
  reports: FileText,
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

const timezones = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
];

export function AdvancedNotifications({ initialData, onUpdate, isLoading = false }: AdvancedNotificationsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    condition: '',
    action: '',
  });

  const form = useForm<NotificationSettings>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: defaultSettings,
  });

  const { watch, setValue, getValues } = form;
  const customRules = watch('customRules') || [];

  useEffect(() => {
    if (initialData) {
      form.reset({ ...defaultSettings, ...initialData });
    }
  }, [initialData, form]);

  const onSubmit = async (data: NotificationSettings) => {
    setIsSaving(true);
    try {
      const success = await onUpdate(data);
      if (success) {
        setIsEditing(false);
        toast.success('Configuración de notificaciones actualizada');
      }
    } catch (error) {
      toast.error('Error al actualizar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const addCustomRule = () => {
    if (newRule.name.trim() && newRule.condition.trim() && newRule.action.trim()) {
      const rule = {
        id: Date.now().toString(),
        name: newRule.name,
        condition: newRule.condition,
        action: newRule.action,
        enabled: true,
      };
      const updatedRules = [...customRules, rule];
      setValue('customRules', updatedRules);
      setNewRule({ name: '', condition: '', action: '' });
    }
  };

  const removeCustomRule = (ruleId: string) => {
    const updatedRules = customRules.filter(rule => rule.id !== ruleId);
    setValue('customRules', updatedRules);
  };

  const toggleRuleEnabled = (ruleId: string) => {
    const updatedRules = customRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    setValue('customRules', updatedRules);
  };

  const updateCategoryChannels = (category: keyof NotificationSettings['categories'], channel: string, enabled: boolean) => {
    const currentChannels = getValues(`categories.${category}.channels`) || [];
    let updatedChannels;
    
    if (enabled) {
      updatedChannels = [...currentChannels, channel];
    } else {
      updatedChannels = currentChannels.filter(c => c !== channel);
    }
    
    setValue(`categories.${category}.channels`, updatedChannels);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Configuración Avanzada de Notificaciones</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Configuración Avanzada de Notificaciones</CardTitle>
              <CardDescription>
                Personaliza cómo y cuándo recibir notificaciones
              </CardDescription>
            </div>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!isEditing ? (
          <Tabs defaultValue="channels" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="channels">Canales</TabsTrigger>
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="schedule">Horarios</TabsTrigger>
              <TabsTrigger value="rules">Reglas</TabsTrigger>
            </TabsList>

            {/* Canales de Notificación */}
            <TabsContent value="channels" className="space-y-4">
              <h3 className="text-lg font-semibold">Canales Habilitados</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(getValues('channels')).map(([channel, enabled]) => {
                  const Icon = channelIcons[channel as keyof typeof channelIcons];
                  return (
                    <Card key={channel} className={enabled ? 'border-primary' : ''}>
                      <CardContent className="pt-6 text-center">
                        <Icon className={`h-8 w-8 mx-auto mb-2 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="font-medium">{channelLabels[channel as keyof typeof channelLabels]}</div>
                        <Badge variant={enabled ? 'default' : 'secondary'} className="mt-2">
                          {enabled ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Categorías */}
            <TabsContent value="categories" className="space-y-4">
              <h3 className="text-lg font-semibold">Configuración por Categoría</h3>
              <div className="space-y-4">
                {Object.entries(getValues('categories')).map(([category, settings]) => (
                  <Card key={category}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{categoryLabels[category as keyof typeof categoryLabels]}</h4>
                          <Badge className={priorityColors[settings.priority]}>
                            {priorityLabels[settings.priority]}
                          </Badge>
                        </div>
                        <Badge variant={settings.enabled ? 'default' : 'secondary'}>
                          {settings.enabled ? 'Habilitado' : 'Deshabilitado'}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {settings.channels.map((channel: string) => {
                          const Icon = channelIcons[channel as keyof typeof channelIcons];
                          return (
                            <div key={channel} className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                              <Icon className="h-3 w-3" />
                              <span className="text-xs">{channelLabels[channel as keyof typeof channelLabels]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Horarios */}
            <TabsContent value="schedule" className="space-y-4">
              <h3 className="text-lg font-semibold">Configuración de Horarios</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Horario de Trabajo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">
                          {getValues('schedule.workingHours.start')} - {getValues('schedule.workingHours.end')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Zona horaria: {timezones.find(tz => tz.value === getValues('schedule.timezone'))?.label}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Configuración Adicional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Fines de semana</span>
                        <Badge variant={getValues('schedule.weekends') ? 'default' : 'secondary'}>
                          {getValues('schedule.weekends') ? 'Sí' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Días festivos</span>
                        <Badge variant={getValues('schedule.holidays') ? 'default' : 'secondary'}>
                          {getValues('schedule.holidays') ? 'Sí' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Frecuencia de Notificaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold capitalize">{getValues('frequency.digest')}</div>
                      <div className="text-xs text-muted-foreground">Resumen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{getValues('frequency.realTime') ? 'Sí' : 'No'}</div>
                      <div className="text-xs text-muted-foreground">Tiempo Real</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{getValues('frequency.batchDelay')} min</div>
                      <div className="text-xs text-muted-foreground">Retraso de Lote</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reglas Personalizadas */}
            <TabsContent value="rules" className="space-y-4">
              <h3 className="text-lg font-semibold">Reglas Personalizadas</h3>
              
              {customRules.length > 0 ? (
                <div className="space-y-3">
                  {customRules.map((rule) => (
                    <Card key={rule.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{rule.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Si: {rule.condition} → Entonces: {rule.action}
                            </p>
                          </div>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No hay reglas personalizadas configuradas</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="channels" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="channels">Canales</TabsTrigger>
                  <TabsTrigger value="categories">Categorías</TabsTrigger>
                  <TabsTrigger value="schedule">Horarios</TabsTrigger>
                  <TabsTrigger value="rules">Reglas</TabsTrigger>
                </TabsList>

                {/* Editar Canales */}
                <TabsContent value="channels" className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurar Canales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(defaultSettings.channels).map((channel) => (
                      <FormField
                        key={channel}
                        control={form.control}
                        name={`channels.${channel}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                {React.createElement(channelIcons[channel as keyof typeof channelIcons], { className: "h-4 w-4" })}
                                {channelLabels[channel as keyof typeof channelLabels]}
                              </FormLabel>
                              <FormDescription>
                                Recibir notificaciones por {channelLabels[channel as keyof typeof channelLabels].toLowerCase()}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </TabsContent>

                {/* Editar Categorías */}
                <TabsContent value="categories" className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurar Categorías</h3>
                  <div className="space-y-6">
                    {Object.keys(defaultSettings.categories).map((category) => (
                      <Card key={category}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {categoryLabels[category as keyof typeof categoryLabels]}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name={`categories.${category}.enabled` as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between">
                                <FormLabel>Habilitar categoría</FormLabel>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`categories.${category}.priority` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prioridad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">Baja</SelectItem>
                                    <SelectItem value="medium">Media</SelectItem>
                                    <SelectItem value="high">Alta</SelectItem>
                                    <SelectItem value="critical">Crítica</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <div>
                            <Label className="text-sm font-medium">Canales</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {Object.keys(defaultSettings.channels).map((channel) => {
                                const channels = getValues(`categories.${category}.channels` as `categories.${keyof NotificationSettings['categories']}.channels`);
                                const isEnabled = Array.isArray(channels) && channels.includes(channel);
                                return (
                                  <div key={channel} className="flex items-center space-x-2">
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={(checked) => 
                                        updateCategoryChannels(category as any, channel, checked)
                                      }
                                    />
                                    <Label className="text-sm">
                                      {channelLabels[channel as keyof typeof channelLabels]}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Editar Horarios */}
                <TabsContent value="schedule" className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurar Horarios</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="schedule.workingHours.start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de inicio</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="schedule.workingHours.end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de fin</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="schedule.timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zona horaria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timezones.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="schedule.weekends"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Fines de semana</FormLabel>
                            <FormDescription>
                              Recibir notificaciones los fines de semana
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="schedule.holidays"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Días festivos</FormLabel>
                            <FormDescription>
                              Recibir notificaciones en días festivos
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Frecuencia</h4>
                    
                    <FormField
                      control={form.control}
                      name="frequency.digest"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resumen de notificaciones</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="never">Nunca</SelectItem>
                              <SelectItem value="daily">Diario</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensual</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="frequency.realTime"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Notificaciones en tiempo real</FormLabel>
                            <FormDescription>
                              Recibir notificaciones inmediatamente
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="frequency.batchDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retraso de lote (minutos)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="60"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Tiempo de espera antes de enviar notificaciones agrupadas
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Editar Reglas */}
                <TabsContent value="rules" className="space-y-4">
                  <h3 className="text-lg font-semibold">Reglas Personalizadas</h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Agregar Nueva Regla</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          placeholder="Nombre de la regla"
                          value={newRule.name}
                          onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Input
                          placeholder="Condición (ej: ventas > 1000)"
                          value={newRule.condition}
                          onChange={(e) => setNewRule(prev => ({ ...prev, condition: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Acción (ej: enviar email)"
                            value={newRule.action}
                            onChange={(e) => setNewRule(prev => ({ ...prev, action: e.target.value }))}
                          />
                          <Button type="button" onClick={addCustomRule} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {customRules.length > 0 && (
                    <div className="space-y-3">
                      {customRules.map((rule) => (
                        <Card key={rule.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{rule.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Si: {rule.condition} → Entonces: {rule.action}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rule.enabled}
                                  onCheckedChange={() => toggleRuleEnabled(rule.id)}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCustomRule(rule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Botones de Acción */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}