import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/m2m-auth';
import { prisma } from '../index';

const router = Router();

// Endpoint webhook genérico.
// Requiere cabeceras X-Organization-API-Key y X-Organization-ID
router.post('/saas', requireApiKey, async (req: Request, res: Response) => {
  try {
    const orgId = req.body.organizationId; // Inyectado por el middleware m2m-auth
    const { eventType, payload } = req.body;

    if (!eventType) {
      return res.status(400).json({ success: false, error: 'Missing eventType in payload' });
    }

    console.log(`[Webhook] Received event ${eventType} for organization ${orgId}`);

    switch (eventType) {
      case 'subscription.updated':
        // Lógica para actualizar la suscripción local
        // Por ejemplo, el SaaS informa que el plan ahora es "Pro"
        if (payload.planId) {
            // Ejemplo de actualización de la base de datos (se requiere ajustar a la estructura exacta del payload)
          await prisma.subscription.upsert({
            where: { organizationId: orgId },
            create: {
              organizationId: orgId,
              planId: payload.planId,
              status: payload.status || 'active',
              currentPeriodStart: new Date(payload.currentPeriodStart || Date.now()),
              currentPeriodEnd: new Date(payload.currentPeriodEnd || Date.now() + 30*24*60*60*1000),
            },
            update: {
              planId: payload.planId,
              status: payload.status || 'active',
              currentPeriodEnd: new Date(payload.currentPeriodEnd || Date.now() + 30*24*60*60*1000),
            }
          });
        }
        break;

      case 'plan.changed':
         // El SaaS informa cambios en los límites o características de un plan
         if (payload.planId && payload.features) {
             await prisma.plan.update({
                 where: { id: payload.planId },
                 data: { features: payload.features, limits: payload.limits }
             });
         }
         break;

      case 'tenant.suspended':
        // Marcar la organización como inactiva u operacionalmente limitada
         await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'SUSPENDED' }
         });
         break;

      default:
        console.warn(`[Webhook] Unhandled event type: ${eventType}`);
        // Puede que no queramos devolver error, solo ignorarlo
        break;
    }

    // Acknowledge the webhook fast
    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });

  } catch (error) {
    console.error(`[Webhook] Processing error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing webhook',
    });
  }
});

export default router;
