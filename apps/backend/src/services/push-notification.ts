import webpush from 'web-push';
import { prisma } from '../lib/prisma';
import { logger } from '../middleware/logger';

export class PushNotificationService {
  constructor() {
    this.initialize();
  }

  private initialize() {
    // These should come from environment variables
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      logger.info('Web Push configured successfully');
    } else {
      logger.warn('Web Push configuration incomplete. VAPID keys missing.');
    }
  }

  /**
   * Subscribe a device for push notifications
   */
  async subscribe(
    userId: string,
    organizationId: string | null,
    subscription: webpush.PushSubscription,
    userAgent?: string,
    deviceId?: string
  ) {
    try {
      const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint }
      });

      if (existing) {
        return prisma.pushSubscription.update({
          where: { endpoint: subscription.endpoint },
          data: {
            userId,
            organizationId,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userAgent,
            deviceId,
            lastUsedAt: new Date(),
            isActive: true
          }
        });
      }

      return prisma.pushSubscription.create({
        data: {
          userId,
          organizationId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
          deviceId
        }
      });
    } catch (error) {
      logger.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe a device
   */
  async unsubscribe(endpoint: string) {
    try {
      return await prisma.pushSubscription.delete({
        where: { endpoint }
      });
    } catch (error) {
      logger.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  /**
   * Send a push notification to a specific user
   */
  async sendToUser(userId: string, payload: any) {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId, isActive: true }
      });

      const promises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            JSON.stringify(payload)
          );
          
          // Update last used
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() }
          });
        } catch (error: any) {
          logger.error(`Failed to send push to endpoint ${sub.endpoint}`, error);
          if (error.statusCode === 404 || error.statusCode === 410) {
            // Subscription has expired or is no longer valid
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        }
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      logger.error('Error sending push notification to user:', error);
      return false;
    }
  }

  /**
   * Create an in-app notification and optionally send a push
   */
  async createNotification(data: {
    userId: string;
    organizationId?: string | null;
    type: string;
    priority?: string;
    title: string;
    message: string;
    metadata?: any;
    sendPush?: boolean;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          type: data.type,
          priority: data.priority || 'normal',
          title: data.title,
          message: data.message,
          data: data.metadata || {}
        }
      });

      if (data.sendPush) {
        await this.sendToUser(data.userId, {
          id: notification.id,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          body: notification.message,
          data: notification.data
        });
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
