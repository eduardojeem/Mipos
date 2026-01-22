import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';
import { auditLogger } from '../middleware/audit';

const router = express.Router();

// Aplicar middleware de auditoría a todas las rutas
router.use(auditLogger);

// Validation schemas
const historyEventSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  eventType: z.enum(['purchase', 'return', 'payment', 'credit', 'loyalty', 'profile_update', 'note', 'communication']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  amount: z.number().optional(),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const interactionSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  interactionType: z.enum(['call', 'email', 'sms', 'visit', 'complaint', 'inquiry', 'feedback']),
  channel: z.enum(['phone', 'email', 'in_person', 'whatsapp', 'website']),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  content: z.string().max(2000, 'Content too long').optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('completed'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  outcome: z.string().max(500, 'Outcome too long').optional(),
  followUpDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().uuid().optional()
});

const noteSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  noteType: z.enum(['general', 'important', 'warning', 'preference', 'complaint']).default('general'),
  title: z.string().max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
  isPrivate: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  tags: z.array(z.string()).optional()
});

const preferencesSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(true),
    phone: z.boolean().default(true),
    whatsapp: z.boolean().default(false),
    marketing: z.boolean().default(true),
    promotions: z.boolean().default(true),
    reminders: z.boolean().default(true)
  }).optional(),
  purchasePreferences: z.object({
    preferredPaymentMethod: z.string().optional(),
    preferredDeliveryTime: z.string().optional(),
    specialInstructions: z.string().optional(),
    discountPreferences: z.array(z.string()).optional()
  }).optional(),
  servicePreferences: z.object({
    preferredStaff: z.string().optional(),
    serviceLevel: z.string().optional(),
    specialNeeds: z.array(z.string()).optional()
  }).optional(),
  privacySettings: z.object({
    dataSharing: z.boolean().default(false),
    marketingConsent: z.boolean().default(true),
    analyticsTracking: z.boolean().default(true)
  }).optional()
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 20;
    return Math.min(Math.max(parsed, 1), 100);
  }),
  eventType: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(100).optional()
});

// =====================================================
// CUSTOMER HISTORY EVENTS
// =====================================================

// Get customer history timeline
router.get('/:customerId/timeline', 
  validateParams(z.object({ customerId: z.string().uuid() })),
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { page, limit, eventType, category, startDate, endDate, search } = req.query as any;
    const skip = (page - 1) * limit;

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    // Construir filtros
    const where: any = { customerId };
    
    if (eventType) where.eventType = eventType;
    if (category) where.eventCategory = category;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Construir la consulta SQL dinámicamente
    let eventQuery = `
      SELECT 
        'event' as source_type,
        id,
        customer_id,
        event_type as type,
        title,
        description,
        amount,
        reference_id,
        reference_type,
        metadata,
        created_by,
        created_at,
        created_at as updated_at
      FROM customer_history_events
      WHERE customer_id = $1`;
    
    let interactionQuery = `
      SELECT 
        'interaction' as source_type,
        id,
        customer_id,
        interaction_type as type,
        subject as title,
        content as description,
        NULL as amount,
        NULL as reference_id,
        channel as reference_type,
        jsonb_build_object(
          'status', status,
          'priority', priority,
          'outcome', outcome,
          'tags', tags
        ) as metadata,
        created_by,
        created_at,
        updated_at
      FROM customer_interactions
      WHERE customer_id = $1`;
    
    let noteQuery = `
      SELECT 
        'note' as source_type,
        id,
        customer_id,
        note_type as type,
        COALESCE(title, 'Nota') as title,
        content as description,
        NULL as amount,
        NULL as reference_id,
        NULL as reference_type,
        jsonb_build_object(
          'is_private', is_private,
          'is_important', is_important,
          'tags', tags
        ) as metadata,
        created_by,
        created_at,
        updated_at
      FROM customer_notes
      WHERE customer_id = $1`;

    // Agregar filtros condicionales
    let paramIndex = 2;
    const params: any[] = [customerId];
    
    if (eventType) {
      eventQuery += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }
    
    if (category) {
      eventQuery += ` AND event_category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (startDate) {
      eventQuery += ` AND created_at >= $${paramIndex}`;
      interactionQuery += ` AND created_at >= $${paramIndex}`;
      noteQuery += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      eventQuery += ` AND created_at <= $${paramIndex}`;
      interactionQuery += ` AND created_at <= $${paramIndex}`;
      noteQuery += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (search) {
      eventQuery += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      interactionQuery += ` AND (subject ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      noteQuery += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const fullQuery = `
      ${eventQuery}
      UNION ALL
      ${interactionQuery}
      UNION ALL
      ${noteQuery}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, skip);

    // Obtener eventos con paginación
    const [events, total] = await Promise.all([
      prisma.$queryRawUnsafe(fullQuery, ...params),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM (
          SELECT id FROM customer_history_events WHERE customer_id = $1
          UNION ALL
          SELECT id FROM customer_interactions WHERE customer_id = $1
          UNION ALL
          SELECT id FROM customer_notes WHERE customer_id = $1
        ) as total_events
      `, customerId)
    ]);

    res.json({
      customer,
      timeline: events,
      pagination: {
        page,
        limit,
        total: Number((total as any)[0]?.count || 0),
        pages: Math.ceil(Number((total as any)[0]?.count || 0) / limit)
      }
    });
  })
);

// Add history event
router.post('/events', 
  validateBody(historyEventSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId, eventType, title, description, amount, referenceId, referenceType, metadata } = req.body;
    
    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    // Determinar la categoría del evento
    const eventCategory = (() => {
      switch (eventType) {
        case 'purchase':
        case 'return':
        case 'payment':
        case 'credit':
          return 'transaction';
        case 'profile_update':
        case 'note':
          return 'account';
        case 'communication':
          return 'communication';
        case 'loyalty':
          return 'loyalty';
        default:
          return 'account';
      }
    })();

    const event = await prisma.$executeRawUnsafe(`
      INSERT INTO customer_history_events (
        customer_id, event_type, event_category, title, description,
        amount, reference_id, reference_type, metadata, created_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
    `, customerId, eventType, eventCategory, title, description || null,
       amount || null, referenceId || null, referenceType || null, 
       JSON.stringify(metadata || {}), req.user.id);

    res.status(201).json({
      success: true,
      message: 'History event added successfully'
    });
  })
);

// =====================================================
// CUSTOMER INTERACTIONS
// =====================================================

// Get customer interactions
router.get('/:customerId/interactions',
  validateParams(z.object({ customerId: z.string().uuid() })),
  validateQuery(querySchema),
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { page, limit, search } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = { customerId };
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Construir consultas dinámicamente
    let interactionQuery = `
      SELECT * FROM customer_interactions 
      WHERE customer_id = $1`;
    
    let countQuery = `
      SELECT COUNT(*) as count FROM customer_interactions 
      WHERE customer_id = $1`;
    
    const params: any[] = [customerId];
    let paramIndex = 2;
    
    if (search) {
      interactionQuery += ` AND (subject ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      countQuery += ` AND (subject ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    interactionQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, skip);

    const [interactions, total] = await Promise.all([
      prisma.$queryRawUnsafe(interactionQuery, ...params),
      prisma.$queryRawUnsafe(countQuery, customerId, ...(search ? [`%${search}%`] : []))
    ]);

    res.json({
      interactions,
      pagination: {
        page,
        limit,
        total: Number((total as any)[0]?.count || 0),
        pages: Math.ceil(Number((total as any)[0]?.count || 0) / limit)
      }
    });
  })
);

// Add customer interaction
router.post('/interactions',
  validateBody(interactionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { 
      customerId, interactionType, channel, subject, content, 
      status, priority, outcome, followUpDate, tags, assignedTo 
    } = req.body;

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    const interaction = await prisma.$executeRawUnsafe(`
      INSERT INTO customer_interactions (
        customer_id, interaction_type, channel, subject, content,
        status, priority, outcome, follow_up_date, tags, 
        created_by, assigned_to
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, 
        $11, $12
      )
    `, customerId, interactionType, channel, subject, content || null,
       status, priority, outcome || null, followUpDate ? new Date(followUpDate) : null, 
       JSON.stringify(tags || []), req.user.id, assignedTo || null);

    res.status(201).json({
      success: true,
      message: 'Interaction added successfully'
    });
  })
);

// =====================================================
// CUSTOMER NOTES
// =====================================================

// Get customer notes
router.get('/:customerId/notes',
  validateParams(z.object({ customerId: z.string().uuid() })),
  validateQuery(querySchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId } = req.params;
    const { page, limit, search } = req.query as any;
    const skip = (page - 1) * limit;

    // Construir consultas dinámicamente
    let notesQuery = `
      SELECT n.*, u.full_name as created_by_name
      FROM customer_notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.customer_id = $1`;
    
    let countQuery = `
      SELECT COUNT(*) as count FROM customer_notes 
      WHERE customer_id = $1`;
    
    const params: any[] = [customerId];
    let paramIndex = 2;
    
    if (search) {
      notesQuery += ` AND (n.title ILIKE $${paramIndex} OR n.content ILIKE $${paramIndex})`;
      countQuery += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    notesQuery += ` ORDER BY n.is_important DESC, n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, skip);

    const [notes, total] = await Promise.all([
      prisma.$queryRawUnsafe(notesQuery, ...params),
      prisma.$queryRawUnsafe(countQuery, customerId, ...(search ? [`%${search}%`] : []))
    ]);

    res.json({
      notes,
      pagination: {
        page,
        limit,
        total: Number((total as any)[0]?.count || 0),
        pages: Math.ceil(Number((total as any)[0]?.count || 0) / limit)
      }
    });
  })
);

// Add customer note
router.post('/notes',
  validateBody(noteSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { customerId, noteType, title, content, isPrivate, isImportant, tags } = req.body;

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    const note = await prisma.$executeRawUnsafe(`
      INSERT INTO customer_notes (
        customer_id, note_type, title, content, is_private, 
        is_important, tags, created_by
      ) VALUES (
        $1, $2, $3, $4, 
        $5, $6, $7, $8
      )
    `, customerId, noteType, title || null, content, 
       isPrivate, isImportant, JSON.stringify(tags || []), req.user.id);

    res.status(201).json({
      success: true,
      message: 'Note added successfully'
    });
  })
);

// =====================================================
// CUSTOMER PREFERENCES
// =====================================================

// Get customer preferences
router.get('/:customerId/preferences',
  validateParams(z.object({ customerId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    const preferences = await prisma.$queryRawUnsafe(`
      SELECT * FROM customer_preferences WHERE customer_id = $1
    `, customerId);

    if (!preferences || (preferences as any).length === 0) {
      // Crear preferencias por defecto si no existen
      await prisma.$executeRawUnsafe(`
        INSERT INTO customer_preferences (customer_id) VALUES ($1)
      `, customerId);
      
      const defaultPreferences = await prisma.$queryRawUnsafe(`
        SELECT * FROM customer_preferences WHERE customer_id = $1
      `, customerId);
      
      return res.json({ preferences: (defaultPreferences as any)[0] });
    }

    res.json({ preferences: (preferences as any)[0] });
  })
);

// Update customer preferences
router.put('/:customerId/preferences',
  validateParams(z.object({ customerId: z.string().uuid() })),
  validateBody(preferencesSchema),
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { communicationPreferences, purchasePreferences, servicePreferences, privacySettings } = req.body;

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true }
    });

    if (!customer) {
      throw createError('Customer not found', 404);
    }

    // Actualizar preferencias
    const updateFields = [];
    const values = [];

    if (communicationPreferences) {
      updateFields.push('communication_preferences = $' + (values.length + 1));
      values.push(JSON.stringify(communicationPreferences));
    }
    if (purchasePreferences) {
      updateFields.push('purchase_preferences = $' + (values.length + 1));
      values.push(JSON.stringify(purchasePreferences));
    }
    if (servicePreferences) {
      updateFields.push('service_preferences = $' + (values.length + 1));
      values.push(JSON.stringify(servicePreferences));
    }
    if (privacySettings) {
      updateFields.push('privacy_settings = $' + (values.length + 1));
      values.push(JSON.stringify(privacySettings));
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      values.push(customerId);

      await prisma.$executeRawUnsafe(`
        UPDATE customer_preferences 
        SET ${updateFields.join(', ')}
        WHERE customer_id = $${values.length}
      `, ...values);
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });
  })
);

// =====================================================
// ANALYTICS AND REPORTS
// =====================================================

// Get customer history analytics
router.get('/:customerId/analytics',
  validateParams(z.object({ customerId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    const analytics = await prisma.$queryRawUnsafe(`
      SELECT 
        -- Resumen de eventos
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as total_purchases,
        COUNT(CASE WHEN event_type = 'return' THEN 1 END) as total_returns,
        COUNT(CASE WHEN event_type = 'communication' THEN 1 END) as total_communications,
        
        -- Métricas financieras
        SUM(CASE WHEN event_type = 'purchase' THEN amount ELSE 0 END) as total_spent,
        AVG(CASE WHEN event_type = 'purchase' THEN amount ELSE NULL END) as avg_purchase_amount,
        
        -- Fechas importantes
        MIN(created_at) as first_event,
        MAX(created_at) as last_event,
        MAX(CASE WHEN event_type = 'purchase' THEN created_at END) as last_purchase
        
      FROM customer_history_events 
      WHERE customer_id = $1
    `, customerId);

    const interactionStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_interactions,
        COUNT(CASE WHEN priority = 'high' OR priority = 'urgent' THEN 1 END) as high_priority_interactions
      FROM customer_interactions 
      WHERE customer_id = $1
    `, customerId);

    const noteStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*) as total_notes,
        COUNT(CASE WHEN is_important = true THEN 1 END) as important_notes
      FROM customer_notes 
      WHERE customer_id = $1
    `, customerId);

    res.json({
      analytics: (analytics as any)[0],
      interactionStats: (interactionStats as any)[0],
      noteStats: (noteStats as any)[0]
    });
  })
);

export default router;