import { PrismaClient } from '@prisma/client';
import { logger } from '../middleware/logger';

export class DatabaseOptimizer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Optimize database queries with proper indexing recommendations
   */
  async optimizeQueries() {
    try {
      logger.info('Starting database optimization checks...');

      // Check for missing indexes on frequently queried columns
      await this.checkIndexOptimization();
      
      // Analyze query performance
      await this.analyzeQueryPerformance();
      
      // Clean up old data
      await this.cleanupOldData();

      logger.info('Database optimization completed successfully');
    } catch (error) {
      logger.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * Check and recommend indexes for better performance
   */
  private async checkIndexOptimization() {
    const recommendations = [
      {
        table: 'Product',
        columns: ['sku', 'categoryId', 'supplierId', 'status'],
        reason: 'Frequently used in searches and filters'
      },
      {
        table: 'Sale',
        columns: ['customerId', 'userId', 'createdAt', 'status'],
        reason: 'Used in sales reports and customer analytics'
      },
      {
        table: 'customers',
        columns: ['email', 'phone', 'is_active', 'created_at'],
        reason: 'Used in customer searches and analytics'
      },
      {
        table: 'audit_logs',
        columns: ['user_id', 'action', 'created_at'],
        reason: 'Used in audit reports and user activity tracking'
      },
      {
        table: 'customer_credits',
        columns: ['customer_id', 'status', 'created_at'],
        reason: 'Used in credit management and overdue reports'
      }
    ];

    logger.info('Database indexing recommendations:', { recommendations });
  }

  /**
   * Analyze and log slow queries
   */
  private async analyzeQueryPerformance() {
    // This would typically involve analyzing query execution plans
    // For now, we'll log common performance patterns
    
    const performanceTips = [
      'Use SELECT with specific columns instead of SELECT *',
      'Implement pagination for large result sets',
      'Use database-level aggregations instead of application-level',
      'Consider using database views for complex joins',
      'Implement proper connection pooling',
      'Use prepared statements to prevent SQL injection'
    ];

    logger.info('Query performance recommendations:', { performanceTips });
  }

  /**
   * Clean up old audit logs and temporary data
   */
  private async cleanupOldData() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean up old audit logs (keep last 30 days)
      const deletedAuditLogs = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          },
          // Keep critical actions
          action: {
            notIn: ['USER_LOGIN', 'USER_LOGOUT', 'SALE_CREATE', 'PRODUCT_CREATE']
          }
        }
      });

      logger.info(`Cleaned up ${deletedAuditLogs.count} old audit log entries`);

      // Clean up expired sessions or temporary data if any
      // This would depend on your specific session management implementation

    } catch (error) {
      logger.error('Error during data cleanup:', error);
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats() {
    try {
      const stats = {
        products: await this.prisma.product.count(),
        customers: await this.prisma.customer.count(),
        sales: await this.prisma.sale.count(),
        users: await this.prisma.user.count(),
        auditLogs: await this.prisma.auditLog.count(),
        credits: await this.prisma.customerCredit.count(),
        inventory: await this.prisma.inventoryMovement.count()
      };

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentActivity = {
        newCustomers: await this.prisma.customer.count({
          where: { createdAt: { gte: yesterday } }
        }),
        newSales: await this.prisma.sale.count({
          where: { createdAt: { gte: yesterday } }
        }),
        newProducts: await this.prisma.product.count({
          where: { createdAt: { gte: yesterday } }
        })
      };

      return { stats, recentActivity };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Optimize specific queries with better patterns
   */
  getOptimizedQueries() {
    return {
      // Optimized product search with proper indexing
      searchProducts: `
        SELECT p.*, c.name as categoryName, s.name as supplierName
        FROM Product p
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN Supplier s ON p.supplierId = s.id
        WHERE p.name ILIKE $1 OR p.sku ILIKE $1
        ORDER BY p.updatedAt DESC
        LIMIT $2 OFFSET $3
      `,

      // Optimized sales report with aggregation
      salesReport: `
        SELECT 
          DATE(s.createdAt) as date,
          COUNT(*) as totalSales,
          SUM(s.total) as totalRevenue,
          AVG(s.total) as averageOrderValue
        FROM Sale s
        WHERE s.createdAt BETWEEN $1 AND $2
        GROUP BY DATE(s.createdAt)
        ORDER BY date DESC
      `,

      // Optimized customer analytics
      customerAnalytics: `
        SELECT 
          c.id,
          c.name,
          c.email,
          COUNT(s.id) as totalOrders,
          SUM(s.total) as totalSpent,
          MAX(s.createdAt) as lastOrderDate
        FROM Customer c
        LEFT JOIN Sale s ON c.id = s.customerId
        WHERE c.createdAt >= $1
        GROUP BY c.id, c.name, c.email
        HAVING COUNT(s.id) > 0
        ORDER BY totalSpent DESC
      `,

      // Optimized inventory alerts
      lowStockAlert: `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.stock_quantity,
          p.min_stock,
          c.name as categoryName
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= p.min_stock
        ORDER BY (p.stock_quantity / NULLIF(p.min_stock, 0)) ASC
      `
    };
  }
}

/**
 * Connection pool optimization for better performance
 */
export const optimizePrismaConnection = () => {
  return {
    // Optimize connection pool
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Enable query logging in development
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
    
    // Connection pool settings
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    
    // Query timeout
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000'),
  };
};

/**
 * Database health check
 */
export const checkDatabaseHealth = async (prisma: PrismaClient) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};