import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requireRole, requireAnyRole } from '../middleware/enhanced-auth';
import { apiRateLimit } from '../middleware/rate-limiter';

const router = Router();

// Validation schemas
const createInvoiceSchema = z.object({
  organizationId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  amount: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  dueDate: z.string().datetime(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    amount: z.number().min(0)
  }))
});

const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']).optional(),
  dueDate: z.string().datetime().optional()
});

// Generate invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

// Get all invoices (SUPER_ADMIN)
router.get('/', requireRole('SUPER_ADMIN'), apiRateLimit, asyncHandler(async (req, res) => {
  const { status, organizationId, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  let whereClause = '';
  const conditions: string[] = [];
  
  if (status) conditions.push(`i.status = '${status}'`);
  if (organizationId) conditions.push(`i.organization_id = '${organizationId}'::uuid`);
  
  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  const invoices = await prisma.$queryRawUnsafe(`
    SELECT 
      i.id,
      i.organization_id as "organizationId",
      i.subscription_id as "subscriptionId",
      i.invoice_number as "invoiceNumber",
      i.amount,
      i.currency,
      i.status,
      i.due_date as "dueDate",
      i.paid_at as "paidAt",
      i.items,
      i.created_at as "createdAt",
      o.name as "organizationName",
      o.slug as "organizationSlug"
    FROM invoices i
    JOIN organizations o ON i.organization_id = o.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ${parseInt(limit as string)} OFFSET ${skip}
  `);

  const total = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
    SELECT COUNT(*)::int as count
    FROM invoices i
    ${whereClause}
  `);

  res.json({
    success: true,
    data: invoices,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total: Number(total[0].count),
      pages: Math.ceil(Number(total[0].count) / parseInt(limit as string))
    }
  });
}));

// Get invoices for organization
router.get('/organization/:organizationId', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const user = (req as EnhancedAuthenticatedRequest).user;

  // Verify access
  if (!user?.roles.some(r => r.name === 'SUPER_ADMIN')) {
    if (user?.organizationId !== organizationId) {
      throw createError('Unauthorized', 403);
    }
  }

  const invoices = await prisma.$queryRaw`
    SELECT 
      id,
      invoice_number as "invoiceNumber",
      amount,
      currency,
      status,
      due_date as "dueDate",
      paid_at as "paidAt",
      items,
      created_at as "createdAt"
    FROM invoices
    WHERE organization_id = ${organizationId}::uuid
    ORDER BY created_at DESC
  `;

  res.json({
    success: true,
    data: invoices
  });
}));

// Get invoice by ID
router.get('/:id', requireAnyRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invoice = await prisma.$queryRaw<any[]>`
    SELECT 
      i.id,
      i.organization_id as "organizationId",
      i.subscription_id as "subscriptionId",
      i.invoice_number as "invoiceNumber",
      i.amount,
      i.currency,
      i.status,
      i.due_date as "dueDate",
      i.paid_at as "paidAt",
      i.items,
      i.metadata,
      i.created_at as "createdAt",
      o.name as "organizationName",
      o.slug as "organizationSlug"
    FROM invoices i
    JOIN organizations o ON i.organization_id = o.id
    WHERE i.id = ${id}::uuid
  `;

  if (!invoice || invoice.length === 0) {
    throw createError('Invoice not found', 404);
  }

  res.json({
    success: true,
    data: invoice[0]
  });
}));

// Create invoice
router.post('/', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const data = createInvoiceSchema.parse(req.body);
  const invoiceNumber = generateInvoiceNumber();

  const invoice = await prisma.$queryRaw`
    INSERT INTO invoices (
      organization_id, subscription_id, invoice_number,
      amount, currency, status, due_date, items
    ) VALUES (
      ${data.organizationId}::uuid,
      ${data.subscriptionId || null}::uuid,
      ${invoiceNumber},
      ${data.amount},
      ${data.currency},
      'open',
      ${data.dueDate}::timestamp,
      ${JSON.stringify(data.items)}::jsonb
    )
    RETURNING *
  `;

  res.status(201).json({
    success: true,
    data: invoice[0]
  });
}));

// Update invoice
router.put('/:id', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateInvoiceSchema.parse(req.body);

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.status) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
    
    if (data.status === 'paid') {
      updates.push(`paid_at = NOW()`);
    }
  }
  
  if (data.dueDate) {
    updates.push(`due_date = $${paramIndex++}::timestamp`);
    values.push(data.dueDate);
  }

  if (updates.length === 0) {
    throw createError('No fields to update', 400);
  }

  values.push(id);
  const query = `
    UPDATE invoices 
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}::uuid
    RETURNING *
  `;

  const result = await prisma.$queryRawUnsafe(query, ...values);

  res.json({
    success: true,
    data: result[0]
  });
}));

// Mark invoice as paid
router.post('/:id/mark-paid', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.$queryRaw`
    UPDATE invoices 
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  res.json({
    success: true,
    message: 'Invoice marked as paid'
  });
}));

// Void invoice
router.post('/:id/void', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.$queryRaw`
    UPDATE invoices 
    SET status = 'void', updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  res.json({
    success: true,
    message: 'Invoice voided'
  });
}));

// Send invoice by email (placeholder)
router.post('/:id/send', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // TODO: Implement email sending
  // For now, just return success
  
  res.json({
    success: true,
    message: 'Invoice sent successfully (email integration pending)'
  });
}));

// Get invoice statistics
router.get('/stats/summary', requireRole('SUPER_ADMIN'), asyncHandler(async (req, res) => {
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int as total_invoices,
      COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open_invoices,
      COUNT(CASE WHEN status = 'paid' THEN 1 END)::int as paid_invoices,
      COUNT(CASE WHEN status = 'past_due' THEN 1 END)::int as overdue_invoices,
      COALESCE(SUM(CASE WHEN status = 'open' THEN amount ELSE 0 END), 0)::float as outstanding_amount,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::float as paid_amount
    FROM invoices
  `;

  res.json({
    success: true,
    data: stats[0]
  });
}));

export default router;
