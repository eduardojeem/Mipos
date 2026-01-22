import nodemailer from 'nodemailer';
import { logger } from '../middleware/logger';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationData {
  to: string | string[];
  template: EmailTemplate;
  data?: Record<string, any>;
}

export interface SMSData {
  to: string;
  message: string;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private isEmailConfigured: boolean = false;

  constructor() {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransport(emailConfig);
        this.isEmailConfigured = true;
        logger.info('Email transporter configured successfully');
      } else {
        logger.warn('Email configuration incomplete. Email notifications disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: NotificationData): Promise<boolean> {
    if (!this.isEmailConfigured) {
      logger.warn('Email not configured. Skipping email notification.');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: Array.isArray(notification.to) ? notification.to.join(', ') : notification.to,
        subject: notification.template.subject,
        html: this.processTemplate(notification.template.html, notification.data),
        text: notification.template.text ? this.processTemplate(notification.template.text, notification.data) : undefined,
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { messageId: result.messageId, to: notification.to });
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Process email template with data
   */
  private processTemplate(template: string, data?: Record<string, any>): string {
    if (!data) return template;

    let processed = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(data[key]));
    });
    return processed;
  }

  /**
   * Send welcome email to new customers
   */
  async sendWelcomeEmail(customerEmail: string, customerName: string): Promise<boolean> {
    const template: EmailTemplate = {
      subject: 'Bienvenido a nuestro sistema POS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">¡Bienvenido {{customerName}}!</h2>
          <p>Gracias por registrarte en nuestro sistema. Estamos emocionados de tenerte como cliente.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>¿Qué puedes hacer ahora?</h3>
            <ul>
              <li>Explorar nuestros productos</li>
              <li>Realizar compras</li>
              <li>Gestionar tu perfil</li>
              <li>Acceder a ofertas exclusivas</li>
            </ul>
          </div>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p style="color: #6b7280;">Saludos,<br>El equipo de {{companyName}}</p>
        </div>
      `,
      text: `¡Bienvenido {{customerName}}! Gracias por registrarte en nuestro sistema.`
    };

    return this.sendEmail({
      to: customerEmail,
      template,
      data: {
        customerName,
        companyName: process.env.COMPANY_NAME || 'Sistema POS'
      }
    });
  }

  /**
   * Send sale confirmation email
   */
  async sendSaleConfirmation(customerEmail: string, saleData: any): Promise<boolean> {
    const template: EmailTemplate = {
      subject: `Confirmación de compra #${saleData.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">¡Compra confirmada!</h2>
          <p>Hola {{customerName}},</p>
          <p>Tu compra ha sido procesada exitosamente.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalles de la compra</h3>
            <p><strong>Número de orden:</strong> #{{saleId}}</p>
            <p><strong>Fecha:</strong> {{saleDate}}</p>
            <p><strong>Total:</strong> \${{total}}</p>
            <p><strong>Método de pago:</strong> {{paymentMethod}}</p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4>Productos comprados:</h4>
            {{productsList}}
          </div>

          <p>Gracias por tu compra. ¡Esperamos verte pronto!</p>
          <p style="color: #6b7280;">Saludos,<br>El equipo de {{companyName}}</p>
        </div>
      `,
      text: `Compra confirmada #{{saleId}}. Total: \${{total}}. Gracias por tu compra.`
    };

    const productsList = saleData.items?.map((item: any) => 
      `<p>• ${item.productName} - Cantidad: ${item.quantity} - $${item.price}</p>`
    ).join('') || '';

    return this.sendEmail({
      to: customerEmail,
      template,
      data: {
        customerName: saleData.customerName,
        saleId: saleData.id,
        saleDate: new Date(saleData.createdAt).toLocaleDateString(),
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        productsList,
        companyName: process.env.COMPANY_NAME || 'Sistema POS'
      }
    });
  }

  /**
   * Send credit reminder email
   */
  async sendCreditReminder(customerEmail: string, creditData: any): Promise<boolean> {
    const template: EmailTemplate = {
      subject: 'Recordatorio de crédito pendiente',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Recordatorio de pago</h2>
          <p>Hola {{customerName}},</p>
          <p>Te recordamos que tienes un crédito pendiente de pago.</p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3>Detalles del crédito</h3>
            <p><strong>Número de crédito:</strong> #{{creditId}}</p>
            <p><strong>Monto pendiente:</strong> \${{amount}}</p>
            <p><strong>Fecha de vencimiento:</strong> {{dueDate}}</p>
            <p><strong>Días vencido:</strong> {{daysOverdue}}</p>
          </div>

          <p>Por favor, realiza el pago lo antes posible para evitar cargos adicionales.</p>
          <p>Si ya realizaste el pago, puedes ignorar este mensaje.</p>
          <p style="color: #6b7280;">Saludos,<br>El equipo de {{companyName}}</p>
        </div>
      `,
      text: `Recordatorio: Tienes un crédito pendiente #{{creditId}} por \${{amount}}. Vence: {{dueDate}}`
    };

    const dueDate = new Date(creditData.dueDate);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    return this.sendEmail({
      to: customerEmail,
      template,
      data: {
        customerName: creditData.customerName,
        creditId: creditData.id,
        amount: creditData.amount,
        dueDate: dueDate.toLocaleDateString(),
        daysOverdue: Math.max(0, daysOverdue),
        companyName: process.env.COMPANY_NAME || 'Sistema POS'
      }
    });
  }

  /**
   * Send low stock alert to administrators
   */
  async sendLowStockAlert(adminEmails: string[], products: any[]): Promise<boolean> {
    const template: EmailTemplate = {
      subject: 'Alerta: Productos con stock bajo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⚠️ Alerta de Stock Bajo</h2>
          <p>Los siguientes productos tienen stock bajo y requieren reposición:</p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            {{productsList}}
          </div>

          <p>Por favor, revisa el inventario y realiza los pedidos necesarios.</p>
          <p style="color: #6b7280;">Sistema POS - {{timestamp}}</p>
        </div>
      `,
      text: `Alerta de stock bajo para {{productCount}} productos. Revisa el inventario.`
    };

    const productsList = products.map(product => 
      `<div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
        <strong>${product.name}</strong> (SKU: ${product.sku})<br>
        Stock actual: ${product.quantity} | Stock mínimo: ${product.minStock}
      </div>`
    ).join('');

    return this.sendEmail({
      to: adminEmails,
      template,
      data: {
        productsList,
        productCount: products.length,
        timestamp: new Date().toLocaleString()
      }
    });
  }

  /**
   * Send system notification to administrators
   */
  async sendSystemNotification(adminEmails: string[], title: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<boolean> {
    const colors = {
      info: '#2563eb',
      warning: '#d97706',
      error: '#dc2626'
    };

    const template: EmailTemplate = {
      subject: `[Sistema POS] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${colors[type]};">{{title}}</h2>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${colors[type]};">
            <p>{{message}}</p>
          </div>
          <p style="color: #6b7280;">Sistema POS - {{timestamp}}</p>
        </div>
      `,
      text: `${title}: ${message}`
    };

    return this.sendEmail({
      to: adminEmails,
      template,
      data: {
        title,
        message,
        timestamp: new Date().toLocaleString()
      }
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.isEmailConfigured) {
      return false;
    }

    try {
      await this.emailTransporter.verify();
      logger.info('Email configuration test successful');
      return true;
    } catch (error) {
      logger.error('Email configuration test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();