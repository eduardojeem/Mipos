import express from 'express';
import { apiRateLimit } from './middleware/rate-limiter';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { getSupabaseClient, isSupabaseConfigured } from './config/supabase';
import { SupabasePrismaAdapter } from './config/supabase-prisma';
import productsBarcodeRoutes from './routes/products-barcode';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import supplierRoutes from './routes/suppliers';
import customerRoutes from './routes/customers';
import purchaseRoutes from './routes/purchases';
import salesRoutes from './routes/sales';
import salesStatsRoutes from './routes/sales-stats';
import returnsRoutes from './routes/returns';
import inventoryRoutes from './routes/inventory';
import reportsRoutes from './routes/reports';
import uploadRoutes from './routes/upload';
import stockAlertsRoutes from './routes/stock-alerts';
import dashboardRoutes from './routes/dashboard';
import auditRoutes from './routes/audit';
import adminAuditRoutes from './routes/admin-audit';
import catalogAuditRoutes from './routes/catalog-audit';
import cacheRoutes from './routes/cache-routes';
import creditRoutes from './routes/credit';
import notificationRoutes from './routes/notifications';
import loyaltyRoutes from './routes/loyalty';
import loyaltyPromotionsRoutes from './routes/loyalty-promotions';
import customerHistoryRoutes from './routes/customer-history';
import publicOrdersRoutes from './routes/public-orders';
import couponsRoutes from './routes/coupons';
import pricingRoutes from './routes/pricing';
import promotionsRoutes from './routes/promotions';
import systemRoutes from './routes/system';
import cashRoutes from './routes/cash';
import sessionsRoutes from './routes/sessions';

// Import middleware
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { enhancedAuthMiddleware } from './middleware/enhanced-auth';
import { applySecurityHeaders } from './middleware/security-headers';
import { logger, requestLogger, errorLogger } from './middleware/logger';
import { sanitizeInput, validateContentType } from './middleware/validation';
import { performanceMiddleware, performanceMetricsHandler, healthCheckHandler } from './middleware/performance';

// Load environment variables
dotenv.config();

// Initialize Prisma and Supabase clients
// Use Supabase adapter when configured; otherwise fall back to PrismaClient.
// In development without Supabase, routes may handle mock data to avoid DB queries.
//
// To avoid TypeScript union type issues across routes (e.g., prisma.cashSession),
// we type the exported prisma as a composite that includes custom adapter facades.
type AppPrisma = PrismaClient & {
  cashSession: any;
  cashMovement: any;
  cashCount: any;
  cashDiscrepancy: any;
  inventoryMovement: any;
};
const supabaseEnabled = isSupabaseConfigured();
export const prisma: AppPrisma = supabaseEnabled
  ? (new SupabasePrismaAdapter() as unknown as AppPrisma)
  : (new PrismaClient({ log: ['error'] }) as unknown as AppPrisma);
export const supabase = getSupabaseClient();

const app = express();
// Trust first proxy for correct client IPs when behind load balancers/proxies
app.set('trust proxy', 1);
const DEFAULT_PORT = Number(process.env.PORT) || 3001;
let server: ReturnType<typeof app.listen> | null = null;

// Apply global API rate limiting

// Apply security headers first
app.use(applySecurityHeaders);

// Performance monitoring
app.use(performanceMiddleware);

// Request logging
app.use(requestLogger);

// Global API rate limiting (always active)
app.use(apiRateLimit);

// Input sanitization and validation
app.use(sanitizeInput);
app.use(validateContentType(['application/json', 'multipart/form-data']));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check with performance metrics
app.get('/health', healthCheckHandler);
app.get('/api/metrics', performanceMetricsHandler);

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/system', systemRoutes);

// Public product and category routes (specific endpoints)
app.get('/api/products/public', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, categoryId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { sku: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId as string;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { name: 'asc' },
      skip,
      take: Number(limit)
    }),
    prisma.product.count({ where })
  ]);

  res.json({
    data: products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

app.get('/api/categories/public', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: Number(limit)
    }),
    prisma.category.count({ where })
  ]);

  res.json({
    data: categories,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Public orders route (no authentication required)
app.use('/api/public/orders', publicOrdersRoutes);

// Protected routes with enhanced authentication (loads permissions)
app.use('/api/users', enhancedAuthMiddleware, userRoutes);
app.use('/api/categories', enhancedAuthMiddleware, categoryRoutes);
app.use('/api/products', enhancedAuthMiddleware, productRoutes);
app.use('/api/suppliers', enhancedAuthMiddleware, supplierRoutes);
app.use('/api/customers', enhancedAuthMiddleware, customerRoutes);
app.use('/api/purchases', enhancedAuthMiddleware, purchaseRoutes);
app.use('/api/sales', enhancedAuthMiddleware, salesRoutes);
app.use('/api/sales-stats', enhancedAuthMiddleware, salesStatsRoutes);
app.use('/api/returns', enhancedAuthMiddleware, returnsRoutes);
app.use('/api/inventory', enhancedAuthMiddleware, inventoryRoutes);
app.use('/api/reports', enhancedAuthMiddleware, reportsRoutes);
app.use('/api/stock-alerts', enhancedAuthMiddleware, stockAlertsRoutes);
app.use('/api/dashboard', enhancedAuthMiddleware, dashboardRoutes);
app.use('/api/audit', enhancedAuthMiddleware, auditRoutes);
app.use('/api/admin/audit', enhancedAuthMiddleware, adminAuditRoutes);
app.use('/api/catalog/audit', catalogAuditRoutes); // Public for frontend tracking
app.use('/api/cache', enhancedAuthMiddleware, cacheRoutes);
app.use('/api/credit', enhancedAuthMiddleware, creditRoutes);
app.use('/api/notifications', enhancedAuthMiddleware, notificationRoutes);
app.use('/api/loyalty', enhancedAuthMiddleware, loyaltyRoutes);
app.use('/api/loyalty', enhancedAuthMiddleware, loyaltyPromotionsRoutes);
app.use('/api/customer-history', enhancedAuthMiddleware, customerHistoryRoutes);
app.use('/api/coupons', enhancedAuthMiddleware, couponsRoutes);
app.use('/api/pricing', enhancedAuthMiddleware, pricingRoutes);
app.use('/api/promotions', enhancedAuthMiddleware, promotionsRoutes);
app.use('/api/products/barcode', enhancedAuthMiddleware, productsBarcodeRoutes);
app.use('/api/cash', enhancedAuthMiddleware, cashRoutes);
app.use('/api/sessions', enhancedAuthMiddleware, sessionsRoutes);

// Error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  const requestId = (req as any).requestId;
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    requestId
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  const closeServer = async () => {
    try {
      if (server) {
        await new Promise<void>((resolve) => {
          server!.close(() => resolve());
        });
        logger.info('HTTP server closed.');
      }

      await prisma.$disconnect();
      logger.info('Database connection closed.');
      
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);

  closeServer();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// Start server with port fallback if EADDRINUSE
function startServerWithFallback(port: number, fallbacks: number[] = []) {
  try {
    server = app.listen(port, () => {
      const NODE_ENV = process.env.NODE_ENV || 'development';
      const DATABASE_URL = process.env.DATABASE_URL;
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📊 Environment: ${NODE_ENV}`);
      logger.info(`🔗 Database: ${DATABASE_URL ? 'Connected' : 'Not configured'}`);
      logger.info(`☁️  Supabase: ${SUPABASE_URL ? 'Connected' : 'Not configured'}`);
      logger.info(`📊 Health check: http://localhost:${port}/health`);
    });

    server.on('error', (err: any) => {
      if (err && err.code === 'EADDRINUSE') {
        const nextPort = fallbacks.shift();
        if (typeof nextPort === 'number') {
          logger.warn(`Port ${port} in use. Trying fallback port ${nextPort}...`);
          startServerWithFallback(nextPort, fallbacks);
        } else {
          logger.error(`All fallback ports exhausted. Unable to start server.`);
          process.exit(1);
        }
      } else {
        logger.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Try default port then a small range of fallbacks
startServerWithFallback(DEFAULT_PORT, [DEFAULT_PORT + 1, DEFAULT_PORT + 2, DEFAULT_PORT + 3, DEFAULT_PORT + 4, DEFAULT_PORT + 5]);

export default app;