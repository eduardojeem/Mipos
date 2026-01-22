import { PrismaClient } from '@prisma/client';

// Database configuration with fallback mechanism
export class DatabaseManager {
  private static instance: PrismaClient;
  private static isSupabaseConnected = false;

  static async getInstance(): Promise<PrismaClient> {
    if (!this.instance) {
      await this.initializeDatabase();
    }
    return this.instance;
  }

  private static async initializeDatabase() {
    // Try Supabase first
    try {
      console.log('🔄 Intentando conexión con Supabase...');
      
      const supabasePrisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        },
        log: ['error']
      });

      // Test connection
      await supabasePrisma.$connect();
      await supabasePrisma.$queryRaw`SELECT 1`;
      
      this.instance = supabasePrisma;
      this.isSupabaseConnected = true;
      console.log('✅ Conectado a Supabase exitosamente');
      
    } catch (error) {
      console.warn('⚠️ Fallo en conexión con Supabase, usando SQLite local:', error.message);
      
      // Fallback to SQLite
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: 'file:./prisma/dev.db'
          }
        },
        log: ['error']
      });
      
      this.isSupabaseConnected = false;
      console.log('✅ Conectado a SQLite local');
    }
  }

  static isUsingSupabase(): boolean {
    return this.isSupabaseConnected;
  }

  static async disconnect() {
    if (this.instance) {
      await this.instance.$disconnect();
    }
  }
}

// Export helpers without top-level await to avoid module target issues
export const prismaPromise: Promise<PrismaClient> = DatabaseManager.getInstance();
export async function getPrisma(): Promise<PrismaClient> {
  return DatabaseManager.getInstance();
}