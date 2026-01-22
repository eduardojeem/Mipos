'use client';

import { UICustomer } from './customer-service';

// Interfaces para el sistema de comunicación
export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'sms' | 'push';
  category: 'marketing' | 'transactional' | 'reminder' | 'welcome';
  variables: string[]; // Variables disponibles como {customerName}, {totalSpent}, etc.
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationCampaign {
  id: string;
  name: string;
  description: string;
  templateId: string;
  targetSegment: 'all' | 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant';
  targetCustomers?: string[]; // IDs específicos de clientes
  scheduledDate?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  sentCount: number;
  openRate?: number;
  clickRate?: number;
  created_at: string;
  sent_at?: string;
}

export interface CommunicationHistory {
  id: string;
  customerId: string;
  campaignId?: string;
  templateId: string;
  type: 'email' | 'sms' | 'push';
  subject: string;
  content: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  marketingEmails: boolean;
  transactionalEmails: boolean;
  reminderEmails: boolean;
  welcomeEmails: boolean;
}

class CommunicationService {
  private templates: NotificationTemplate[] = [
    {
      id: '1',
      name: 'Bienvenida Nuevo Cliente',
      subject: '¡Bienvenido a nuestra tienda, {customerName}!',
      content: `Hola {customerName},

¡Gracias por unirte a nuestra comunidad! Estamos emocionados de tenerte como cliente.

Como nuevo miembro, tienes acceso a:
- Ofertas exclusivas
- Descuentos especiales
- Atención personalizada

¡Esperamos verte pronto!

Saludos,
El equipo de {storeName}`,
      type: 'email',
      category: 'welcome',
      variables: ['customerName', 'storeName'],
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Cliente en Riesgo',
      subject: 'Te extrañamos, {customerName}',
      content: `Hola {customerName},

Hemos notado que no has visitado nuestra tienda en un tiempo. ¡Te extrañamos!

Como cliente valorado, queremos ofrecerte un descuento especial del 15% en tu próxima compra.

Código: VUELVE15

¡Esperamos verte pronto!

Saludos,
El equipo de {storeName}`,
      type: 'email',
      category: 'marketing',
      variables: ['customerName', 'storeName', 'lastPurchaseDate'],
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Cliente VIP Agradecimiento',
      subject: 'Gracias por ser un cliente VIP, {customerName}',
      content: `Estimado {customerName},

Queremos agradecerte por ser uno de nuestros clientes más valiosos. Has gastado {totalSpent} con nosotros y eso significa mucho.

Como muestra de nuestro agradecimiento, tienes acceso a:
- Descuentos VIP exclusivos
- Acceso anticipado a nuevos productos
- Atención prioritaria

¡Gracias por tu lealtad!

Saludos,
El equipo de {storeName}`,
      type: 'email',
      category: 'marketing',
      variables: ['customerName', 'totalSpent', 'storeName'],
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      name: 'Recordatorio de Cumpleaños',
      subject: '¡Feliz cumpleaños, {customerName}! 🎉',
      content: `¡Feliz cumpleaños, {customerName}!

En tu día especial, queremos celebrar contigo. Disfruta de un descuento del 20% en cualquier producto de la tienda.

Código: CUMPLE20
Válido hasta: {expirationDate}

¡Que tengas un día maravilloso!

Saludos,
El equipo de {storeName}`,
      type: 'email',
      category: 'marketing',
      variables: ['customerName', 'storeName', 'expirationDate'],
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  private campaigns: CommunicationCampaign[] = [];
  private communicationHistory: CommunicationHistory[] = [];
  private settings: NotificationSettings = {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    marketingEmails: true,
    transactionalEmails: true,
    reminderEmails: true,
    welcomeEmails: true
  };

  // Gestión de plantillas
  getTemplates(): NotificationTemplate[] {
    return this.templates;
  }

  getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  createTemplate(template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>): NotificationTemplate {
    const newTemplate: NotificationTemplate = {
      ...template,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.templates.push(newTemplate);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<NotificationTemplate>): NotificationTemplate | null {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.templates[index] = {
      ...this.templates[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.templates[index];
  }

  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.templates.splice(index, 1);
    return true;
  }

  // Gestión de campañas
  getCampaigns(): CommunicationCampaign[] {
    return this.campaigns;
  }

  createCampaign(campaign: Omit<CommunicationCampaign, 'id' | 'created_at' | 'sentCount' | 'status'>): CommunicationCampaign {
    const newCampaign: CommunicationCampaign = {
      ...campaign,
      id: Date.now().toString(),
      status: 'draft',
      sentCount: 0,
      created_at: new Date().toISOString()
    };
    this.campaigns.push(newCampaign);
    return newCampaign;
  }

  updateCampaign(id: string, updates: Partial<CommunicationCampaign>): CommunicationCampaign | null {
    const index = this.campaigns.findIndex(c => c.id === id);
    if (index === -1) return null;

    this.campaigns[index] = { ...this.campaigns[index], ...updates };
    return this.campaigns[index];
  }

  // Envío de comunicaciones
  async sendCampaign(campaignId: string, customers: UICustomer[]): Promise<boolean> {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) return false;

    const template = this.getTemplate(campaign.templateId);
    if (!template) return false;

    try {
      // Simular envío de emails/SMS
      for (const customer of customers) {
        const personalizedContent = this.personalizeContent(template.content, customer);
        const personalizedSubject = this.personalizeContent(template.subject, customer);

        // Crear registro en historial
        const historyRecord: CommunicationHistory = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          customerId: customer.id,
          campaignId: campaign.id,
          templateId: template.id,
          type: template.type,
          subject: personalizedSubject,
          content: personalizedContent,
          status: 'sent',
          sent_at: new Date().toISOString()
        };

        this.communicationHistory.push(historyRecord);

        // Simular entrega exitosa (90% de éxito)
        if (Math.random() > 0.1) {
          setTimeout(() => {
            historyRecord.status = 'delivered';
            historyRecord.delivered_at = new Date().toISOString();

            // Simular apertura (30% de tasa de apertura)
            if (Math.random() < 0.3) {
              setTimeout(() => {
                historyRecord.status = 'opened';
                historyRecord.opened_at = new Date().toISOString();

                // Simular click (10% de tasa de click)
                if (Math.random() < 0.1) {
                  setTimeout(() => {
                    historyRecord.status = 'clicked';
                    historyRecord.clicked_at = new Date().toISOString();
                  }, Math.random() * 3600000); // Hasta 1 hora después
                }
              }, Math.random() * 86400000); // Hasta 24 horas después
            }
          }, Math.random() * 300000); // Hasta 5 minutos después
        }
      }

      // Actualizar campaña
      this.updateCampaign(campaignId, {
        status: 'sent',
        sentCount: customers.length,
        sent_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error sending campaign:', error);
      return false;
    }
  }

  // Personalizar contenido con variables
  private personalizeContent(content: string, customer: UICustomer): string {
    return content
      .replace(/{customerName}/g, customer.name)
      .replace(/{customerEmail}/g, customer.email || '')
      .replace(/{totalSpent}/g, `$${customer.totalSpent.toLocaleString()}`)
      .replace(/{totalOrders}/g, customer.totalOrders.toString())
      .replace(/{lastPurchaseDate}/g, customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : 'N/A')
      .replace(/{storeName}/g, 'Mi Tienda POS')
      .replace(/{expirationDate}/g, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString());
  }

  // Envío automático basado en eventos
  async sendWelcomeEmail(customer: UICustomer): Promise<boolean> {
    if (!this.settings.welcomeEmails) return false;

    const welcomeTemplate = this.templates.find(t => t.category === 'welcome' && t.isActive);
    if (!welcomeTemplate) return false;

    return this.sendSingleCommunication(customer, welcomeTemplate);
  }

  async sendBirthdayEmail(customer: UICustomer): Promise<boolean> {
    if (!this.settings.marketingEmails) return false;

    const birthdayTemplate = this.templates.find(t => t.name.includes('Cumpleaños') && t.isActive);
    if (!birthdayTemplate) return false;

    return this.sendSingleCommunication(customer, birthdayTemplate);
  }

  async sendRiskEmail(customer: UICustomer): Promise<boolean> {
    if (!this.settings.marketingEmails) return false;

    const riskTemplate = this.templates.find(t => t.name.includes('Riesgo') && t.isActive);
    if (!riskTemplate) return false;

    return this.sendSingleCommunication(customer, riskTemplate);
  }

  private async sendSingleCommunication(customer: UICustomer, template: NotificationTemplate): Promise<boolean> {
    try {
      const personalizedContent = this.personalizeContent(template.content, customer);
      const personalizedSubject = this.personalizeContent(template.subject, customer);

      const historyRecord: CommunicationHistory = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        customerId: customer.id,
        templateId: template.id,
        type: template.type,
        subject: personalizedSubject,
        content: personalizedContent,
        status: 'sent',
        sent_at: new Date().toISOString()
      };

      this.communicationHistory.push(historyRecord);
      return true;
    } catch (error) {
      console.error('Error sending single communication:', error);
      return false;
    }
  }

  // Historial y estadísticas
  getCommunicationHistory(customerId?: string): CommunicationHistory[] {
    if (customerId) {
      return this.communicationHistory.filter(h => h.customerId === customerId);
    }
    return this.communicationHistory;
  }

  getCampaignStats(campaignId: string): {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  } {
    const campaignHistory = this.communicationHistory.filter(h => h.campaignId === campaignId);
    
    const sent = campaignHistory.length;
    const delivered = campaignHistory.filter(h => ['delivered', 'opened', 'clicked'].includes(h.status)).length;
    const opened = campaignHistory.filter(h => ['opened', 'clicked'].includes(h.status)).length;
    const clicked = campaignHistory.filter(h => h.status === 'clicked').length;

    return {
      sent,
      delivered,
      opened,
      clicked,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0
    };
  }

  // Configuración
  getSettings(): NotificationSettings {
    return this.settings;
  }

  updateSettings(settings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  // Automatización
  checkAndSendAutomaticCommunications(customers: UICustomer[]): void {
    customers.forEach(customer => {
      // Verificar si es un cliente nuevo (creado en las últimas 24 horas)
      const isNewCustomer = new Date(customer.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
      if (isNewCustomer) {
        this.sendWelcomeEmail(customer);
      }

      // Verificar cumpleaños
      if (customer.birthDate) {
        const today = new Date();
        const birthDate = new Date(customer.birthDate);
        if (today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate()) {
          this.sendBirthdayEmail(customer);
        }
      }

      // Verificar clientes en riesgo (más de 90 días sin comprar)
      if (customer.lastPurchase) {
        const daysSinceLastPurchase = Math.floor((Date.now() - new Date(customer.lastPurchase).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastPurchase === 90) { // Exactamente 90 días
          this.sendRiskEmail(customer);
        }
      }
    });
  }
}

export const communicationService = new CommunicationService();