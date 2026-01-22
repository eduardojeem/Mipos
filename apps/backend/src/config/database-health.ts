import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export interface DatabaseHealth {
  sqlite: {
    status: 'healthy' | 'unhealthy';
    lastCheck: Date;
    error?: string;
    responseTime?: number;
  };
  supabase: {
    status: 'healthy' | 'unhealthy' | 'not_configured';
    lastCheck: Date;
    error?: string;
    responseTime?: number;
  };
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private prisma: PrismaClient;

  private constructor() {
    // Initialize Prisma client without overriding datasources
    // Let it use the schema.prisma configuration
    this.prisma = new PrismaClient({
      log: ['error', 'warn']
    });
  }

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  async checkSQLiteHealth(): Promise<DatabaseHealth['sqlite']> {
    const startTime = Date.now();
    const lastCheck = new Date();

    try {
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        lastCheck,
        responseTime
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkSupabaseHealth(): Promise<DatabaseHealth['supabase']> {
    const startTime = Date.now();
    const lastCheck = new Date();

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return {
          status: 'not_configured',
          lastCheck,
          error: 'Supabase environment variables not configured'
        };
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try a simple query to test connection
      const { error } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        // If it's just a missing table error, connection is still valid
        if (error.message.includes('relation "categories" does not exist')) {
          return {
            status: 'healthy',
            lastCheck,
            responseTime,
            error: 'Tables not migrated but connection is valid'
          };
        }
        
        throw error;
      }

      return {
        status: 'healthy',
        lastCheck,
        responseTime
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getFullHealthCheck(): Promise<DatabaseHealth> {
    const [sqlite, supabase] = await Promise.all([
      this.checkSQLiteHealth(),
      this.checkSupabaseHealth()
    ]);

    let overall: DatabaseHealth['overall'];

    if (sqlite.status === 'healthy') {
      if (supabase.status === 'healthy') {
        overall = 'healthy';
      } else if (supabase.status === 'not_configured') {
        overall = 'degraded'; // SQLite working, Supabase not configured
      } else {
        overall = 'degraded'; // SQLite working, Supabase failing
      }
    } else {
      overall = 'unhealthy'; // Primary database (SQLite) failing
    }

    return {
      sqlite,
      supabase,
      overall
    };
  }

  async testDatabaseOperations(): Promise<{
    success: boolean;
    operations: {
      connect: boolean;
      read: boolean;
      write: boolean;
      transaction: boolean;
    };
    errors: string[];
  }> {
    const operations = {
      connect: false,
      read: false,
      write: false,
      transaction: false
    };
    const errors: string[] = [];

    try {
      // Test connection
      await this.prisma.$connect();
      operations.connect = true;

      // Test read operation
      const categoryCount = await this.prisma.category.count();
      operations.read = true;

      // Test write operation
      const testCategory = await this.prisma.category.create({
        data: {
          name: `Health Check ${Date.now()}`,
          description: 'Temporary category for health check'
        }
      });
      operations.write = true;

      // Test transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.category.update({
          where: { id: testCategory.id },
          data: { description: 'Updated in transaction' }
        });
      });
      operations.transaction = true;

      // Cleanup
      await this.prisma.category.delete({
        where: { id: testCategory.id }
      });

      return {
        success: true,
        operations,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        success: false,
        operations,
        errors
      };
    }
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const dbHealthMonitor = DatabaseHealthMonitor.getInstance();

// Convenience functions
export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  return await dbHealthMonitor.getFullHealthCheck();
}

export async function testDatabaseOperations() {
  return await dbHealthMonitor.testDatabaseOperations();
}

export function getDatabaseClient(): PrismaClient {
  return dbHealthMonitor.getPrismaClient();
}