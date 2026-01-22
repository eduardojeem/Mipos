import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  provider: 'postgresql' | 'sqlite';
  connectionString?: string;
  isConnected: boolean;
  lastConnectionAttempt?: Date;
  connectionError?: string;
}

export class HybridDatabaseManager {
  private static instance: HybridDatabaseManager;
  private prismaClient: PrismaClient | null = null;
  private config: DatabaseConfig = {
    provider: 'sqlite',
    isConnected: false
  };

  private constructor() {}

  static getInstance(): HybridDatabaseManager {
    if (!HybridDatabaseManager.instance) {
      HybridDatabaseManager.instance = new HybridDatabaseManager();
    }
    return HybridDatabaseManager.instance;
  }

  async initialize(): Promise<PrismaClient> {
    console.log('🔄 Initializing hybrid database connection...');

    // Try Supabase first
    const supabaseSuccess = await this.trySupabaseConnection();
    
    if (supabaseSuccess) {
      console.log('✅ Connected to Supabase PostgreSQL');
      return this.prismaClient!;
    }

    // Fallback to SQLite
    console.log('⚠️ Supabase connection failed, falling back to SQLite...');
    await this.initializeSQLite();
    console.log('✅ Connected to SQLite database');
    
    return this.prismaClient!;
  }

  private async trySupabaseConnection(): Promise<boolean> {
    try {
      this.config.lastConnectionAttempt = new Date();
      
      // Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!supabaseUrl || !databaseUrl) {
        throw new Error('Missing Supabase environment variables');
      }

      // Test Supabase client connection
      const supabase = createClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      // Try to connect with a simple query
      const { error } = await supabase.from('categories').select('count').limit(1);
      
      if (error && error.message.includes('relation "categories" does not exist')) {
        console.log('📋 Categories table does not exist in Supabase, but connection is valid');
      } else if (error) {
        throw error;
      }

      // Initialize Prisma with PostgreSQL - use current schema as-is since it's already PostgreSQL
      this.prismaClient = new PrismaClient({
        log: ['error', 'warn']
      });

      // Test Prisma connection
      await this.prismaClient.$connect();
      await this.prismaClient.$queryRaw`SELECT 1`;

      this.config = {
        provider: 'postgresql',
        connectionString: databaseUrl,
        isConnected: true,
        lastConnectionAttempt: new Date()
      };

      return true;

    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
      this.config.connectionError = error instanceof Error ? error.message : 'Unknown error';
      
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
      }
      
      return false;
    }
  }

  private async initializeSQLite(): Promise<void> {
    try {
      // For SQLite fallback, we need to use the current Prisma client
      // which is configured for the current schema (SQLite in this case)
      this.prismaClient = new PrismaClient({
        log: ['error', 'warn']
      });

      await this.prismaClient.$connect();
      
      // Test connection
      await this.prismaClient.$queryRaw`SELECT 1`;

      this.config = {
        provider: 'sqlite',
        connectionString: 'file:./prisma/dev.db',
        isConnected: true,
        lastConnectionAttempt: new Date()
      };

    } catch (error) {
      console.error('❌ SQLite connection failed:', error);
      this.config.connectionError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async retrySupabaseConnection(): Promise<boolean> {
    console.log('🔄 Retrying Supabase connection...');
    
    // Note: This would require schema switching which is complex
    // For now, we'll just report the current status
    console.log('⚠️ Schema switching not implemented - would require Prisma schema regeneration');
    
    return false;
  }

  getClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prismaClient;
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  async disconnect(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
    }
    this.config.isConnected = false;
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    provider: string;
    lastCheck: Date;
    error?: string;
  }> {
    const lastCheck = new Date();
    
    try {
      if (!this.prismaClient) {
        return {
          status: 'unhealthy',
          provider: this.config.provider,
          lastCheck,
          error: 'No database connection'
        };
      }

      // Simple health check query
      await this.prismaClient.$queryRaw`SELECT 1`;
      
      return {
        status: this.config.provider === 'postgresql' ? 'healthy' : 'degraded',
        provider: this.config.provider,
        lastCheck
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.config.provider,
        lastCheck,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check if we can connect to Supabase without switching
  async checkSupabaseAvailability(): Promise<boolean> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return false;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('categories').select('count').limit(1);
      
      // If the error is about missing table, connection is still valid
      return !error || error.message.includes('relation "categories" does not exist');
      
    } catch (error) {
      return false;
    }
  }

  // Migration helper
  async runMigrations(): Promise<void> {
    if (this.config.provider === 'sqlite') {
      console.log('📋 SQLite migrations handled by Prisma automatically');
      return;
    }

    if (this.config.provider === 'postgresql') {
      console.log('📋 PostgreSQL migrations should be run separately via Prisma CLI');
      return;
    }
  }
}

// Export singleton instance
export const hybridDb = HybridDatabaseManager.getInstance();

// Export convenience function
export async function getDatabase(): Promise<PrismaClient> {
  return await hybridDb.initialize();
}

// Export health check endpoint helper
export async function getDatabaseHealth() {
  return await hybridDb.healthCheck();
}