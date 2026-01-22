'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Mail, 
  MessageSquare, 
  Send, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Target
} from 'lucide-react';
import { 
  communicationService, 
  NotificationTemplate, 
  CommunicationCampaign,
  CommunicationHistory,
  NotificationSettings
} from '@/lib/communication-service';
import { UICustomer } from '@/lib/customer-service';
import { useToast } from '@/components/ui/use-toast';

interface CommunicationCenterProps {
  customers: UICustomer[];
}

export default function CommunicationCenter({ customers }: CommunicationCenterProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<CommunicationCampaign[]>([]);
  const [history, setHistory] = useState<CommunicationHistory[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    marketingEmails: true,
    transactionalEmails: true,
    reminderEmails: true,
    welcomeEmails: true
  });

  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<CommunicationCampaign | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'email' as 'email' | 'sms' | 'push',
    category: 'marketing' as 'marketing' | 'transactional' | 'reminder' | 'welcome',
    isActive: true
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    templateId: '',
    targetSegment: 'all' as 'all' | 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant',
    scheduledDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTemplates(communicationService.getTemplates());
    setCampaigns(communicationService.getCampaigns());
    setHistory(communicationService.getCommunicationHistory());
    setSettings(communicationService.getSettings());
  };

  const handleCreateTemplate = () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.content) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    const variables = extractVariables(templateForm.content + ' ' + templateForm.subject);
    
    if (editingTemplate) {
      communicationService.updateTemplate(editingTemplate.id, {
        ...templateForm,
        variables
      });
      toast({
        title: "Plantilla actualizada",
        description: "La plantilla ha sido actualizada exitosamente"
      });
    } else {
      communicationService.createTemplate({
        ...templateForm,
        variables
      });
      toast({
        title: "Plantilla creada",
        description: "La plantilla ha sido creada exitosamente"
      });
    }

    resetTemplateForm();
    loadData();
  };

  const handleCreateCampaign = () => {
    if (!campaignForm.name || !campaignForm.templateId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    const targetCustomers = getTargetCustomers(campaignForm.targetSegment);
    
    if (editingCampaign) {
      communicationService.updateCampaign(editingCampaign.id, {
        ...campaignForm,
        targetCustomers: targetCustomers.map(c => c.id)
      });
      toast({
        title: "Campaña actualizada",
        description: "La campaña ha sido actualizada exitosamente"
      });
    } else {
      communicationService.createCampaign({
        ...campaignForm,
        targetCustomers: targetCustomers.map(c => c.id)
      });
      toast({
        title: "Campaña creada",
        description: "La campaña ha sido creada exitosamente"
      });
    }

    resetCampaignForm();
    loadData();
  };

  const handleSendCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const targetCustomers = getTargetCustomers(campaign.targetSegment);
    
    const success = await communicationService.sendCampaign(campaignId, targetCustomers);
    
    if (success) {
      toast({
        title: "Campaña enviada",
        description: `Campaña enviada a ${targetCustomers.length} clientes`
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: "No se pudo enviar la campaña",
        variant: "destructive"
      });
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/{([^}]+)}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const getTargetCustomers = (segment: string): UICustomer[] => {
    if (segment === 'all') return customers;
    
    // Aquí implementarías la lógica de segmentación
    // Por ahora, retornamos todos los clientes
    return customers;
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      content: '',
      type: 'email',
      category: 'marketing',
      isActive: true
    });
    setEditingTemplate(null);
    setShowTemplateDialog(false);
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      description: '',
      templateId: '',
      targetSegment: 'all',
      scheduledDate: ''
    });
    setEditingCampaign(null);
    setShowCampaignDialog(false);
  };

  const getCampaignStats = (campaignId: string) => {
    return communicationService.getCampaignStats(campaignId);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-500',
      scheduled: 'bg-blue-500',
      sent: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      draft: Clock,
      scheduled: Calendar,
      sent: CheckCircle,
      cancelled: XCircle
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Centro de Comunicación</h2>
          <p className="text-gray-600">Gestiona plantillas, campañas y comunicación con clientes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" aria-labelledby="template-dialog-title">
              <DialogHeader>
                <DialogTitle id="template-dialog-title">
                  {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Nombre</Label>
                    <Input
                      id="template-name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="Nombre de la plantilla"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-type">Tipo</Label>
                    <Select
                      value={templateForm.type}
                      onValueChange={(value: 'email' | 'sms' | 'push') => 
                        setTemplateForm({ ...templateForm, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="push">Push</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-category">Categoría</Label>
                    <Select
                      value={templateForm.category}
                      onValueChange={(value: 'marketing' | 'transactional' | 'reminder' | 'welcome') => 
                        setTemplateForm({ ...templateForm, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="transactional">Transaccional</SelectItem>
                        <SelectItem value="reminder">Recordatorio</SelectItem>
                        <SelectItem value="welcome">Bienvenida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="template-active"
                      checked={templateForm.isActive}
                      onCheckedChange={(checked) => 
                        setTemplateForm({ ...templateForm, isActive: checked })
                      }
                    />
                    <Label htmlFor="template-active">Activa</Label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="template-subject">Asunto</Label>
                  <Input
                    id="template-subject"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    placeholder="Asunto del mensaje"
                  />
                </div>
                <div>
                  <Label htmlFor="template-content">Contenido</Label>
                  <Textarea
                    id="template-content"
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    placeholder="Contenido del mensaje. Usa {customerName}, {totalSpent}, etc. para personalizar"
                    rows={8}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Variables disponibles:</strong></p>
                  <p>{'{customerName}, {customerEmail}, {totalSpent}, {totalOrders}, {lastPurchaseDate}, {storeName}, {expirationDate}'}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetTemplateForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Nueva Campaña
              </Button>
            </DialogTrigger>
            <DialogContent aria-labelledby="campaign-dialog-title">
              <DialogHeader>
                <DialogTitle id="campaign-dialog-title">
                  {editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Nombre</Label>
                  <Input
                    id="campaign-name"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="Nombre de la campaña"
                  />
                </div>
                <div>
                  <Label htmlFor="campaign-description">Descripción</Label>
                  <Textarea
                    id="campaign-description"
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                    placeholder="Descripción de la campaña"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="campaign-template">Plantilla</Label>
                  <Select
                    value={campaignForm.templateId}
                    onValueChange={(value) => setCampaignForm({ ...campaignForm, templateId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.isActive).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="campaign-segment">Segmento Objetivo</Label>
                  <Select
                    value={campaignForm.targetSegment}
                    onValueChange={(value: any) => setCampaignForm({ ...campaignForm, targetSegment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los clientes</SelectItem>
                      <SelectItem value="new">Clientes nuevos</SelectItem>
                      <SelectItem value="regular">Clientes regulares</SelectItem>
                      <SelectItem value="frequent">Clientes frecuentes</SelectItem>
                      <SelectItem value="vip">Clientes VIP</SelectItem>
                      <SelectItem value="at_risk">Clientes en riesgo</SelectItem>
                      <SelectItem value="dormant">Clientes inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="campaign-date">Fecha programada (opcional)</Label>
                  <Input
                    id="campaign-date"
                    type="datetime-local"
                    value={campaignForm.scheduledDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetCampaignForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCampaign}>
                    {editingCampaign ? 'Actualizar' : 'Crear'} Campaña
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const stats = getCampaignStats(campaign.id);
              const template = templates.find(t => t.id === campaign.templateId);
              
              return (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {campaign.name}
                          <Badge 
                            className={`${getStatusColor(campaign.status)} text-white`}
                          >
                            {getStatusIcon(campaign.status)}
                            <span className="ml-1 capitalize">{campaign.status}</span>
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-gray-600">{campaign.description}</p>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleSendCampaign(campaign.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Enviar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCampaign(campaign);
                            setCampaignForm({
                              name: campaign.name,
                              description: campaign.description,
                              templateId: campaign.templateId,
                              targetSegment: campaign.targetSegment,
                              scheduledDate: campaign.scheduledDate || ''
                            });
                            setShowCampaignDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Plantilla</p>
                        <p className="font-medium">{template?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Segmento</p>
                        <p className="font-medium capitalize">{campaign.targetSegment}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Enviados</p>
                        <p className="font-medium">{campaign.sentCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tasa de apertura</p>
                        <p className="font-medium">{stats.openRate.toFixed(1)}%</p>
                      </div>
                    </div>
                    {campaign.status === 'sent' && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Entregados</span>
                          <span>{stats.deliveryRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.deliveryRate} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span>Abiertos</span>
                          <span>{stats.openRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.openRate} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {campaigns.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Send className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No hay campañas creadas</p>
                  <p className="text-sm text-gray-500">Crea tu primera campaña para comenzar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.name}
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                        <Badge variant="outline">{template.type}</Badge>
                        <Badge variant="outline">{template.category}</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600">{template.subject}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template);
                          setTemplateForm({
                            name: template.name,
                            subject: template.subject,
                            content: template.content,
                            type: template.type,
                            category: template.category,
                            isActive: template.isActive
                          });
                          setShowTemplateDialog(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          communicationService.deleteTemplate(template.id);
                          loadData();
                          toast({
                            title: "Plantilla eliminada",
                            description: "La plantilla ha sido eliminada exitosamente"
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <p className="line-clamp-3">{template.content}</p>
                  </div>
                  {template.variables.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Variables: {template.variables.join(', ')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Comunicaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.slice(0, 10).map((record) => {
                  const customer = customers.find(c => c.id === record.customerId);
                  return (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{record.subject}</p>
                        <p className="text-sm text-gray-600">
                          Para: {customer?.name || 'Cliente desconocido'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.sent_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={record.status === 'sent' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay comunicaciones enviadas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled">Emails habilitados</Label>
                  <p className="text-sm text-gray-600">Permitir envío de emails</p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...settings, emailEnabled: checked };
                    setSettings(newSettings);
                    communicationService.updateSettings(newSettings);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing-emails">Emails de marketing</Label>
                  <p className="text-sm text-gray-600">Promociones y ofertas</p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={settings.marketingEmails}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...settings, marketingEmails: checked };
                    setSettings(newSettings);
                    communicationService.updateSettings(newSettings);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="welcome-emails">Emails de bienvenida</Label>
                  <p className="text-sm text-gray-600">Para nuevos clientes</p>
                </div>
                <Switch
                  id="welcome-emails"
                  checked={settings.welcomeEmails}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...settings, welcomeEmails: checked };
                    setSettings(newSettings);
                    communicationService.updateSettings(newSettings);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reminder-emails">Emails de recordatorio</Label>
                  <p className="text-sm text-gray-600">Recordatorios y seguimientos</p>
                </div>
                <Switch
                  id="reminder-emails"
                  checked={settings.reminderEmails}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...settings, reminderEmails: checked };
                    setSettings(newSettings);
                    communicationService.updateSettings(newSettings);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}