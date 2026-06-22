import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation';
import { notificationService } from '../services/notification';
import { pushNotificationService } from '../services/push-notification';
import { logger } from '../middleware/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Validation schemas
const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  type: z.enum(['html', 'text']).default('html')
});

const testEmailSchema = z.object({
  email: z.string().email()
});

const systemNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'warning', 'error']).default('info'),
  recipients: z.array(z.string().email()).min(1)
});

const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string()
    })
  }),
  userAgent: z.string().optional(),
  deviceId: z.string().optional()
});

/**
 * Send custom email
 * POST /api/notifications/send-email
 */
router.post('/send-email', 
  validate({ body: sendEmailSchema }),
  asyncHandler(async (req, res) => {
    const { to, subject, message, type } = req.body;

    const template = {
      subject,
      html: type === 'html' ? message : `<p>${message}</p>`,
      text: type === 'text' ? message : undefined
    };

    const success = await notificationService.sendEmail({
      to,
      template
    });

    if (success) {
      logger.info('Email sent successfully', { to, subject, userId: req.user?.id });
      res.json({ 
        success: true, 
        message: 'Email sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send email' 
      });
    }
  })
);

/**
 * Test email configuration
 * POST /api/notifications/test-email
 */
router.post('/test-email',
  validate({ body: testEmailSchema }),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Test configuration first
    const configTest = await notificationService.testEmailConfiguration();
    if (!configTest) {
      return res.status(500).json({
        success: false,
        message: 'Email configuration is not properly set up'
      });
    }

    // Send test email
    const template = {
      subject: 'Test Email - Sistema POS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Email Test</h2>
          <p>This is a test email from your POS System.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Timestamp: ${new Date().toLocaleString()}</li>
              <li>Recipient: ${email}</li>
              <li>Status: Email configuration working correctly ✅</li>
            </ul>
          </div>
          <p>If you received this email, your notification system is working properly!</p>
        </div>
      `,
      text: `Test email from POS System. Timestamp: ${new Date().toLocaleString()}`
    };

    const success = await notificationService.sendEmail({
      to: email,
      template
    });

    if (success) {
      logger.info('Test email sent successfully', { email, userId: req.user?.id });
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email'
      });
    }
  })
);

/**
 * Send system notification to administrators
 * POST /api/notifications/system-notification
 */
router.post('/system-notification',
  validate({ body: systemNotificationSchema }),
  asyncHandler(async (req, res) => {
    const { title, message, type, recipients } = req.body;

    const success = await notificationService.sendSystemNotification(
      recipients,
      title,
      message,
      type
    );

    if (success) {
      logger.info('System notification sent', { 
        title, 
        type, 
        recipientCount: recipients.length,
        userId: req.user?.id 
      });
      res.json({
        success: true,
        message: 'System notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send system notification'
      });
    }
  })
);

/**
 * Send welcome email to customer
 * POST /api/notifications/welcome-customer
 */
router.post('/welcome-customer',
  validate({ 
    body: z.object({
      customerEmail: z.string().email(),
      customerName: z.string().min(1)
    })
  }),
  asyncHandler(async (req, res) => {
    const { customerEmail, customerName } = req.body;

    const success = await notificationService.sendWelcomeEmail(
      customerEmail,
      customerName
    );

    if (success) {
      logger.info('Welcome email sent', { 
        customerEmail, 
        customerName,
        userId: req.user?.id 
      });
      res.json({
        success: true,
        message: 'Welcome email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send welcome email'
      });
    }
  })
);

/**
 * Send sale confirmation email
 * POST /api/notifications/sale-confirmation
 */
router.post('/sale-confirmation',
  validate({
    body: z.object({
      customerEmail: z.string().email(),
      saleData: z.object({
        id: z.string(),
        customerName: z.string(),
        total: z.number(),
        paymentMethod: z.string(),
        createdAt: z.string(),
        items: z.array(z.object({
          productName: z.string(),
          quantity: z.number(),
          price: z.number()
        })).optional()
      })
    })
  }),
  asyncHandler(async (req, res) => {
    const { customerEmail, saleData } = req.body;

    const success = await notificationService.sendSaleConfirmation(
      customerEmail,
      saleData
    );

    if (success) {
      logger.info('Sale confirmation email sent', { 
        customerEmail, 
        saleId: saleData.id,
        userId: req.user?.id 
      });
      res.json({
        success: true,
        message: 'Sale confirmation email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send sale confirmation email'
      });
    }
  })
);

/**
 * Send credit reminder email
 * POST /api/notifications/credit-reminder
 */
router.post('/credit-reminder',
  validate({
    body: z.object({
      customerEmail: z.string().email(),
      creditData: z.object({
        id: z.string(),
        customerName: z.string(),
        amount: z.number(),
        dueDate: z.string()
      })
    })
  }),
  asyncHandler(async (req, res) => {
    const { customerEmail, creditData } = req.body;

    const success = await notificationService.sendCreditReminder(
      customerEmail,
      creditData
    );

    if (success) {
      logger.info('Credit reminder email sent', { 
        customerEmail, 
        creditId: creditData.id,
        userId: req.user?.id 
      });
      res.json({
        success: true,
        message: 'Credit reminder email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send credit reminder email'
      });
    }
  })
);

/**
 * Get user notifications
 * GET /api/notifications
 */
router.get('/',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { limit = '50', offset = '0', unreadOnly = 'false' } = req.query;

    const where: any = { userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        unreadCount: await prisma.notification.count({ where: { userId, isRead: false } })
      }
    });
  })
);

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() }
    });

    res.json({ success: true, data: updated });
  })
);

/**
 * Get notification configuration status
 * GET /api/notifications/config-status
 */
router.get('/config-status',
  asyncHandler(async (req, res) => {
    const emailConfigured = await notificationService.testEmailConfiguration();
    
    res.json({
      email: {
        configured: emailConfigured,
        host: process.env.SMTP_HOST ? '***configured***' : 'not configured',
        port: process.env.SMTP_PORT || 'not configured',
        user: process.env.SMTP_USER ? '***configured***' : 'not configured'
      },
      sms: {
        configured: false, // TODO: Implement SMS service
        provider: 'not configured'
      },
      push: {
        configured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
      }
    });
  })
);

/**
 * Subscribe to Push Notifications
 * POST /api/notifications/subscribe
 */
router.post('/subscribe',
  validate({ body: pushSubscriptionSchema }),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const organizationId = req.user?.organizationId || null;
    const { subscription, userAgent, deviceId } = req.body;

    await pushNotificationService.subscribe(userId, organizationId, subscription, userAgent, deviceId);
    
    res.json({ success: true, message: 'Subscribed to push notifications' });
  })
);

/**
 * Unsubscribe from Push Notifications
 * POST /api/notifications/unsubscribe
 */
router.post('/unsubscribe',
  validate({ 
    body: z.object({ endpoint: z.string().url() }) 
  }),
  asyncHandler(async (req, res) => {
    await pushNotificationService.unsubscribe(req.body.endpoint);
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  })
);

export default router;