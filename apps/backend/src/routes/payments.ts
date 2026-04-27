import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requireRole, requireAnyRole } from '../middleware/enhanced-auth';
import { apiRateLimit } from '../middleware/rate-limiter';

const router = Router();

// Validation schemas
const createPaymentIntentSchema = z.object({
  organizationId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.enum(['stripe', 'mercadopago', 'manual']).default('stripe'),
  metadata: z.record(z.any()).optional()
});

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  status: z.enum(['succeeded', 'failed']),
  metadata: z.record(z.any()).optional()
});

// Get all payments (SUPER_ADMIN)
router.get('/', requireRole('SUPER_ADMIN'), apiRateLimit, asyncHandler(async (req, res) => {
  const { status, organizationId, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  let whereClause = '';
  const conditions: string[] = [];
  
  if (status) conditions.push(`p.status = '${status}'`);
  if (organizationId) conditions.push(`p.organization_id = '${organizationId}'::uuid`);
  
  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  const payments = await prisma.$queryRawUnsafe(`
    SELECT 
      p.id,
      p.organization_id as "organizationId",
      p.invoice_id as "invoiceId",
      p.amount,
      p.currency,
      p.status,
      p.payment_method as "paymentMethod",
      p.payment_intent_id as "paymentIntentId",
      p.created_at as "createdAt",
      o.name as "organizationName",
      i.invoice_number as "invoiceNumber"
    FROM payments p
    JOIN organizations o ON p.organization_id = o.id
    LEFT JOIN invoices i ON p.invoice_id = i.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ${parseInt(limit as string)} OFFSET ${skip}
  `);

  const total = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
    SELECT COUNT(*)::int as count
    FROM payments p
    ${whereClause}
  `);

  res.json({
    success: true,
    data: payments,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: Number(total[0].count),
      pages: Math.ceil(Number(total[0].count) / parseInt(limit as string))
    }
  });
}));

// Get payments for organization
router.get('/organization/:organizationId', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const user = (req as EnhancedAuthenticatedRequest).user;

  // Verify access
  if (!user?.roles.some(r => r.name === 'SUPER_ADMIN')) {
    if (user?.organizationId !== organizationId) {
      throw createError('Unauthorized', 403);
    }
  }

  const payments = await prisma.$queryRaw`
    SELECT 
      p.id,
      p.invoice_id as "invoiceId",
      p.amount,
      p.currency,
      p.status,
      p.payment_method as "paymentMethod",
      p.created_at as "createdAt",
      i.invoice_number as "invoiceNumber"
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE p.organization_id = ${organizationId}::uuid
    ORDER BY p.created_at DESC
  `;

  res.json({
    success: true,
    data: payments
  });
}));

// Create payment intent
router.post('/create-intent', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const data = createPaymentIntentSchema.parse(req.body);
  const user = (req as EnhancedAuthenticatedRequest).user;

  // Verify access
  if (!user?.roles.some(r => r.name === 'SUPER_ADMIN')) {
    if (user?.organizationId !== data.organizationId) {
      throw createError('Unauthorized', 403);
    }
  }

  // TODO: Integrate with actual payment provider (Stripe/MercadoPago)
  // For now, create a mock payment intent
  const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const payment = await prisma.$queryRaw`
    INSERT INTO payments (
      organization_id, invoice_id, amount, currency,
      status, payment_method, payment_intent_id, metadata
    ) VALUES (
      ${data.organizationId}::uuid,
      ${data.invoiceId || null}::uuid,
      ${data.amount},
      ${data.currency},
      'pending',
      ${data.paymentMethod},
      ${paymentIntentId},
      ${JSON.stringify(data.metadata || {})}::jsonb
    )
    RETURNING *
  `;

  res.status(201).json({
    success: true,
    data: {
      ...payment[0],
      clientSecret: `${paymentIntentId}_secret_mock`, // Mock client secret
      // In production, this would be the actual Stripe/MercadoPago client secret
    }
  });
}));

// Confirm payment
router.post('/confirm', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const data = confirmPaymentSchema.parse(req.body);

  // Find payment by intent ID
  const payment = await prisma.$queryRaw<any[]>`
    SELECT * FROM payments 
    WHERE payment_intent_id = ${data.paymentIntentId}
  `;

  if (!payment || payment.length === 0) {
    throw createError('Payment not found', 404);
  }

  // Update payment status
  await prisma.$queryRaw`
    UPDATE payments 
    SET status = ${data.status}, 
        metadata = ${JSON.stringify(data.metadata || {})}::jsonb,
        updated_at = NOW()
    WHERE payment_intent_id = ${data.paymentIntentId}
  `;

  // If payment succeeded and linked to invoice, mark invoice as paid
  if (data.status === 'succeeded' && payment[0].invoice_id) {
    await prisma.$queryRaw`
      UPDATE invoices 
      SET status = 'paid', paid_at = NOW(), updated_at = NOW()
      WHERE id = ${payment[0].invoice_id}::uuid
    `;
  }

  res.json({
    success: true,
    message: 'Payment confirmed'
  });
}));

// Webhook endpoint for Stripe
router.post('/webhooks/stripe', asyncHandler(async (req, res) => {
  // TODO: Verify Stripe signature
  const event = req.body;

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Handle successful payment
      const paymentIntent = event.data.object;
      await prisma.$queryRaw`
        UPDATE payments 
        SET status = 'succeeded', updated_at = NOW()
        WHERE payment_intent_id = ${paymentIntent.id}
      `;
      break;

    case 'payment_intent.payment_failed':
      // Handle failed payment
      const failedIntent = event.data.object;
      await prisma.$queryRaw`
        UPDATE payments 
        SET status = 'failed', updated_at = NOW()
        WHERE payment_intent_id = ${failedIntent.id}
      `;
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}));

// Webhook endpoint for MercadoPago
router.post('/webhooks/mercadopago', asyncHandler(async (req, res) => {
  // TODO: Verify MercadoPago signature
  const notification = req.body;

  if (notification.type === 'payment') {
    // Fetch payment details from MercadoPago API
    // Update payment status in database
    console.log('MercadoPago payment notification:', notification);
  }

  res.status(200).send();
}));

// Refund payment
router.post('/:id/refund', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  // TODO: Process refund with payment provider
  
  await prisma.$queryRaw`
    UPDATE payments 
    SET status = 'refunded', 
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{refund}',
          ${JSON.stringify({ amount, reason, refundedAt: new Date() })}::jsonb
        ),
        updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  res.json({
    success: true,
    message: 'Payment refunded successfully'
  });
}));

// Get payment statistics
router.get('/stats/summary', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int as total_payments,
      COUNT(CASE WHEN status = 'succeeded' THEN 1 END)::int as successful_payments,
      COUNT(CASE WHEN status = 'failed' THEN 1 END)::int as failed_payments,
      COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_payments,
      COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0)::float as total_revenue,
      COALESCE(AVG(CASE WHEN status = 'succeeded' THEN amount END), 0)::float as avg_payment_amount
    FROM payments
  `;

  res.json({
    success: true,
    data: stats[0]
  });
}));

// Get payment methods for organization
router.get('/methods/:organizationId', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { organizationId } = req.params;

  // TODO: Fetch saved payment methods from Stripe/MercadoPago
  // For now, return empty array
  
  res.json({
    success: true,
    data: []
  });
}));

// Add payment method
router.post('/methods/:organizationId', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const { paymentMethodId, type } = req.body;

  // TODO: Save payment method to Stripe/MercadoPago
  
  res.json({
    success: true,
    message: 'Payment method added successfully'
  });
}));

// Delete payment method
router.delete('/methods/:organizationId/:methodId', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { organizationId, methodId } = req.params;

  // TODO: Delete payment method from Stripe/MercadoPago
  
  res.json({
    success: true,
    message: 'Payment method deleted successfully'
  });
}));

export default router;
