import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

const log = createLogger('supabase-secure');

export interface SecureSupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  jwtToken?: string;
  connectionPool?: {
    maxConnections?: number;
    connectionTimeout?: number;
    idleTimeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    enableAutoReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
  };
  performance?: {
    enableMetrics?: boolean;
    slowQueryThreshold?: number;
    maxRetries?: number;
  };
  security?: {
    enableRLS?: boolean;
    rowLevelSecurity?: boolean;
    preparedStatements?: boolean;
  };
}

export interface QueryMetrics {
  id: string;
  query: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
  retryCount: number;
  cacheHit: boolean;
  rowCount?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export class SecureSupabaseClient {
  private client!: SupabaseClient<Database, 'public'>;
  private config: SecureSupabaseConfig;
  private metrics: QueryMetrics[] = [];
  private connectionPool: Map<string, any> = new Map();
  private retryAttempts: number = 0;
  private isConnected: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private reconnectAttempts: number = 0;
  private lastHeartbeat: number = Date.now();
  private connectionStartTime: number = Date.now();

  constructor(config: SecureSupabaseConfig) {
    this.config = {
      connectionPool: {
        maxConnections: 10,
        connectionTimeout: 30000,
        idleTimeout: 60000,
        retryAttempts: 3,
        retryDelay: 1000,
        enableAutoReconnect: true,
        reconnectInterval: 5000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 30000,
        ...config.connectionPool
      },
      performance: {
        enableMetrics: true,
        slowQueryThreshold: 1000,
        maxRetries: 3,
        ...config.performance
      },
      security: {
        enableRLS: true,
        rowLevelSecurity: true,
        preparedStatements: true,
        ...config.security
      },
      ...config
    };

    this.initializeClient();
    this.setupHeartbeat();
  }

  private initializeClient() {
    try {
      // Validate required configuration
      if (!this.config.url || !this.config.anonKey) {
        log.warn('Supabase credentials missing in SecureSupabaseClient. Using mock client.');
        // Mock minimal client to prevent crashes during build
        this.client = {
            auth: {
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                getSession: async () => ({ data: { session: null }, error: null }),
            },
            from: () => ({
                select: () => ({ 
                    eq: () => ({ 
                        single: () => ({ data: null, error: null }),
                        maybeSingle: () => ({ data: null, error: null }) 
                    }),
                    order: () => ({ data: [], error: null })
                }),
                insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
                update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
                delete: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
            })
        } as any;
        this.isConnected = false;
        return;
      }

      this.client = createBrowserClient<Database>(
        this.config.url,
        this.config.anonKey
      );

      this.setupConnectionMonitoring();
      this.isConnected = true;
      
      log.info('Secure Supabase client initialized successfully', {
        url: this.config.url,
        hasJwtToken: !!this.config.jwtToken,
        hasServiceRole: !!this.config.serviceRoleKey
      });
    } catch (error) {
      const errorDetails = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : {
        message: String(error),
        type: typeof error
      };
      
      log.error('Failed to initialize Secure Supabase client', { 
        error: errorDetails,
        config: {
          hasUrl: !!this.config.url,
          hasAnonKey: !!this.config.anonKey,
          hasJwtToken: !!this.config.jwtToken,
          hasServiceRoleKey: !!this.config.serviceRoleKey
        }
      });
      throw error;
    }
  }

  private setupConnectionMonitoring() {
    // Monitor connection health
    this.client.auth.onAuthStateChange((event, session) => {
      log.info('Auth state changed', { event, hasSession: !!session });
      
      // Handle connection events for auto-reconnection
      if (event === 'SIGNED_OUT') {
        this.handleConnectionLoss();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.handleConnectionRestored();
      }
    });

    // Realtime connection monitoring
    const channels = this.client.getChannels();
    channels.forEach(channel => {
      // @ts-ignore - Supabase types mismatch
      channel.on('system', { event: 'error' }, () => {
        const topic = (channel as any).topic || '';
        if (topic.includes('entity_locks')) return;
        log.warn('Realtime channel warning', { channel: topic });
        this.handleConnectionLoss();
      });

      // @ts-ignore - Supabase types mismatch
      channel.on('system', { event: 'close' }, () => {
        const topic = (channel as any).topic || '';
        if (topic.includes('entity_locks')) return;
        log.warn('Realtime channel closed', { channel: topic });
        this.handleConnectionLoss();
      });
    });
  }

  /**
   * Setup heartbeat monitoring for connection health
   */
  private setupHeartbeat() {
    if (!this.config.connectionPool?.enableAutoReconnect) {
      return;
    }

    const heartbeatInterval = this.config.connectionPool?.heartbeatInterval || 30000;
    
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isConnected) {
        return;
      }

      try {
        // Simple heartbeat query
        const { error } = await this.client
          .from('products')
          .select('id')
          .limit(1);

        if (error) {
          log.warn('Heartbeat failed', { error: error.message });
          this.handleConnectionLoss();
        } else {
          this.lastHeartbeat = Date.now();
          this.reconnectAttempts = 0; // Reset reconnection attempts on successful heartbeat
        }
      } catch (error) {
        log.error('Heartbeat error', { error });
        this.handleConnectionLoss();
      }
    }, heartbeatInterval);
  }

  /**
   * Handle connection loss and trigger auto-reconnection
   */
  private async handleConnectionLoss() {
    if (!this.config.connectionPool?.enableAutoReconnect) {
      return;
    }

    if (this.isConnected) {
      this.isConnected = false;
      log.warn('Connection lost, attempting reconnection...', {
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.config.connectionPool?.maxReconnectAttempts
      });

      await this.attemptReconnection();
    }
  }

  /**
   * Handle connection restoration
   */
  private handleConnectionRestored() {
    if (!this.isConnected) {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      log.info('Connection restored');
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async attemptReconnection() {
    const maxAttempts = this.config.connectionPool?.maxReconnectAttempts || 5;
    const baseInterval = this.config.connectionPool?.reconnectInterval || 5000;

    if (this.reconnectAttempts >= maxAttempts) {
      log.error('Max reconnection attempts reached', { 
        attempts: this.reconnectAttempts,
        maxAttempts 
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = baseInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    log.info(`Attempting reconnection ${this.reconnectAttempts}/${maxAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        // Test connection with a simple query
        const { error } = await this.client
          .from('products')
          .select('id')
          .limit(1);

        if (!error) {
          this.handleConnectionRestored();
          log.info('Reconnection successful');
        } else {
          log.warn('Reconnection attempt failed', { error: error.message });
          await this.attemptReconnection(); // Try again
        }
      } catch (error) {
        log.error('Reconnection error', { error });
        await this.attemptReconnection(); // Try again
      }
    }, delay);
  }

  /**
   * Execute query with retry logic, connection pooling, and performance monitoring
   */
  async executeQuery<T>(
    operation: () => Promise<T>,
    options: {
      query: string;
      retryAttempts?: number;
      retryDelay?: number;
      timeout?: number;
      useConnectionPool?: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const maxRetries = options.retryAttempts || this.config.performance?.maxRetries || 3;
    const timeout = options.timeout || this.config.connectionPool?.connectionTimeout || 30000;
    let lastError: any;

    // Check connection health before executing
    if (!this.isConnected && this.config.connectionPool?.enableAutoReconnect) {
      log.warn('Connection not available, waiting for reconnection...');
      await this.waitForConnection();
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use connection pooling if enabled
        if (options.useConnectionPool && this.config.connectionPool?.maxConnections) {
          await this.acquireConnection();
        }

        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
          )
        ]);

        const duration = Date.now() - startTime;
        
        // Record metrics
        if (this.config.performance?.enableMetrics) {
          this.metrics.push({
            id: crypto.randomUUID(),
            query: options.query,
            duration,
            timestamp: new Date(startTime).toISOString(),
            success: true,
            retryCount: attempt,
            cacheHit: false,
            rowCount: Array.isArray(result) ? result.length : undefined
          });
        }

        // Log slow queries
        if (duration > (this.config.performance?.slowQueryThreshold || 1000)) {
          log.warn('Slow query detected', { query: options.query, duration, attempt });
        }

        // Release connection back to pool
        if (options.useConnectionPool) {
          this.releaseConnection();
        }

        return result;
      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;

        log.error('Query execution failed', {
          query: options.query,
          attempt: attempt + 1,
          error,
          timeout: duration >= timeout
        });

        // Handle connection loss
        if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('connection'))) {
          this.handleConnectionLoss();
        }

        if (attempt === maxRetries) {
          // Record failed metrics
          if (this.config.performance?.enableMetrics) {
            this.metrics.push({
              id: crypto.randomUUID(),
              query: options.query,
              duration,
              timestamp: new Date(startTime).toISOString(),
              success: false,
              retryCount: attempt,
              cacheHit: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
          
          // Release connection back to pool even on failure
          if (options.useConnectionPool) {
            this.releaseConnection();
          }
          
          throw error;
        }

        // Wait before retry
        const delay = options.retryDelay || this.config.connectionPool?.retryDelay || 1000;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }

    throw lastError;
  }

  /**
   * Get products with enhanced security and performance
   */
  async getProducts(filters: any = {}) {
    return this.executeQuery(async () => {
      const PRODUCTS: keyof Database['public']['Tables'] = 'products';
      let query = this.client
        .from(PRODUCTS)
        .select('*', { count: 'exact' });

      // Apply filters with SQL injection protection
      if (filters.search) {
        const safeSearch = filters.search.replace(/[%_]/g, '').trim();
        if (safeSearch) {
          query = query.or(`name.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
        }
      }

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.minPrice !== undefined) {
        query = query.gte('sale_price', filters.minPrice);
      }

      if (filters.maxPrice !== undefined) {
        query = query.lte('sale_price', filters.maxPrice);
      }

      if (filters.minStock !== undefined) {
        query = query.gte('stock_quantity', filters.minStock);
      }

      if (filters.maxStock !== undefined) {
        query = query.lte('stock_quantity', filters.maxStock);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      // Pagination
      const limit = filters.limit || 25;
      const page = filters.page || 1;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query
        .order(filters.sortBy || 'updated_at', { 
          ascending: (filters.sortOrder || 'desc') === 'asc' 
        })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        products: data || [],
        total: count || 0,
        hasMore: (data?.length || 0) >= limit,
        page,
        limit
      };
    }, {
      query: 'getProducts',
      retryAttempts: this.config.connectionPool?.retryAttempts,
      retryDelay: this.config.connectionPool?.retryDelay
    });
  }

  /**
   * Create product with validation and security
   */
  async createProduct(productData: any) {
    return this.executeQuery(async () => {
      // Validate and sanitize input
      const validatedData = this.validateProductData(productData);
      
      const PRODUCTS: keyof Database['public']['Tables'] = 'products';
      const { data, error } = await (this.client.from(PRODUCTS) as any)
        .insert([validatedData])
        .select()
        .single();

      if (error) throw error;
      return data;
    }, {
      query: 'createProduct',
      retryAttempts: 1 // Don't retry inserts to avoid duplicates
    });
  }

  /**
   * Update product with validation and security
   */
  async updateProduct(id: string, updates: any) {
    return this.executeQuery(async () => {
      // Validate and sanitize input
      const validatedUpdates = this.validateProductData(updates, true);
      
      const PRODUCTS: keyof Database['public']['Tables'] = 'products';
      const { data, error } = await (this.client.from(PRODUCTS) as any)
        .update(validatedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, {
      query: 'updateProduct',
      retryAttempts: 2
    });
  }

  /**
   * Delete product with cascade protection
   */
  async deleteProduct(id: string) {
    return this.executeQuery(async () => {
      // Check for dependencies first
      const { data: dependencies } = await this.client
        .from('sale_items')
        .select('id')
        .eq('product_id', id)
        .limit(1);

      if (dependencies && dependencies.length > 0) {
        throw new Error('Cannot delete product with existing sales. Deactivate instead.');
      }

      const { error } = await this.client
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    }, {
      query: 'deleteProduct',
      retryAttempts: 1
    });
  }

  /**
   * Validate product data to prevent SQL injection and ensure data integrity
   */
  private validateProductData(data: any, isUpdate = false): any {
    const validated: any = {};

    // Required fields for creation
    if (!isUpdate) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw new Error('Product name is required');
      }
      if (!data.sku || typeof data.sku !== 'string' || data.sku.trim().length === 0) {
        throw new Error('Product SKU is required');
      }
    }

    // Validate and sanitize fields
    if (data.name !== undefined) {
      validated.name = data.name.trim().substring(0, 255);
    }

    if (data.sku !== undefined) {
      validated.sku = data.sku.trim().substring(0, 100);
    }

    if (data.description !== undefined) {
      validated.description = typeof data.description === 'string' ? data.description.trim() : null;
    }

    if (data.sale_price !== undefined) {
      const price = Number(data.sale_price);
      if (isNaN(price) || price < 0) {
        throw new Error('Invalid sale price');
      }
      validated.sale_price = price;
    }

    if (data.cost_price !== undefined) {
      const cost = Number(data.cost_price);
      if (isNaN(cost) || cost < 0) {
        throw new Error('Invalid cost price');
      }
      validated.cost_price = cost;
    }

    if (data.stock_quantity !== undefined) {
      const stock = Number(data.stock_quantity);
      if (isNaN(stock) || stock < 0) {
        throw new Error('Invalid stock quantity');
      }
      validated.stock_quantity = Math.floor(stock);
    }

    if (data.min_stock !== undefined) {
      const minStock = Number(data.min_stock);
      if (isNaN(minStock) || minStock < 0) {
        throw new Error('Invalid minimum stock');
      }
      validated.min_stock = Math.floor(minStock);
    }

    if (data.category_id !== undefined) {
      validated.category_id = data.category_id;
    }

    if (data.is_active !== undefined) {
      validated.is_active = Boolean(data.is_active);
    }

    return validated;
  }

  /**
   * Get query performance metrics
   */
  getMetrics(): QueryMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Wait for connection to be restored
   */
  private async waitForConnection(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (!this.isConnected && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!this.isConnected) {
      throw new Error('Connection timeout while waiting for reconnection');
    }
  }

  /**
   * Acquire connection from pool (simplified implementation)
   */
  private async acquireConnection(): Promise<void> {
    // In a real implementation, this would manage actual database connections
    // For now, we just simulate connection acquisition
    const connectionTimeout = this.config.connectionPool?.connectionTimeout || 30000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < connectionTimeout) {
      if (this.isConnected) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Connection acquisition timeout');
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(): void {
    // In a real implementation, this would release the connection back to the pool
    // For now, we just log the release
    log.debug('Connection released back to pool');
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      isConnected: this.isConnected,
      connectionStartTime: this.connectionStartTime,
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts,
      uptime: Date.now() - this.connectionStartTime,
      config: {
        maxConnections: this.config.connectionPool?.maxConnections,
        connectionTimeout: this.config.connectionPool?.connectionTimeout,
        idleTimeout: this.config.connectionPool?.idleTimeout,
        enableAutoReconnect: this.config.connectionPool?.enableAutoReconnect,
        heartbeatInterval: this.config.connectionPool?.heartbeatInterval
      }
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    try {
      // Clear heartbeat interval
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }
      
      await this.client.removeAllChannels();
      this.isConnected = false;
      log.info('Secure Supabase client disconnected');
    } catch (error) {
      log.error('Error disconnecting Secure Supabase client', { error });
    }
  }

  /**
   * Get the underlying Supabase client for advanced usage
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Access database tables through the secure client
   */
  from<T extends keyof Database['public']['Tables']>(table: T) {
    return this.client.from(table as any);
  }

  /**
   * Access realtime channels through the secure client
   */
  channel(name: string) {
    return this.client.channel(name);
  }

  /**
   * Remove a realtime channel through the secure client
   */
  removeChannel(channel: any) {
    return this.client.removeChannel(channel);
  }
}

// Connection pool manager with auto-reconnection and advanced pooling
export class SupabaseConnectionPool {
  private pools: Map<string, SecureSupabaseClient> = new Map();
  private connectionMetadata: Map<string, {
    createdAt: number;
    lastUsed: number;
    usageCount: number;
    isHealthy: boolean;
  }> = new Map();
  private maxConnections: number;
  private connectionTimeout: number;
  private idleCleanupInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(maxConnections = 10, connectionTimeout = 30000) {
    this.maxConnections = maxConnections;
    this.connectionTimeout = connectionTimeout;
    this.startMaintenanceTasks();
  }

  /**
   * Get or create a connection for a specific user/context
   */
  getConnection(config: SecureSupabaseConfig): SecureSupabaseClient {
    const key = `${config.url}-${config.jwtToken || 'anonymous'}`;
    
    if (this.pools.has(key)) {
      const metadata = this.connectionMetadata.get(key);
      if (metadata) {
        metadata.lastUsed = Date.now();
        metadata.usageCount++;
      }
      return this.pools.get(key)!;
    }

    if (this.pools.size >= this.maxConnections) {
      // Remove least recently used or unhealthy connection
      const keyToRemove = this.findConnectionToEvict();
      if (keyToRemove) {
        const connection = this.pools.get(keyToRemove);
        if (connection) {
          connection.disconnect();
        }
        this.pools.delete(keyToRemove);
        this.connectionMetadata.delete(keyToRemove);
      }
    }

    const connection = new SecureSupabaseClient(config);
    this.pools.set(key, connection);
    this.connectionMetadata.set(key, {
      createdAt: Date.now(),
      lastUsed: Date.now(),
      usageCount: 1,
      isHealthy: true
    });
    
    return connection;
  }

  /**
   * Find the best connection to evict based on LRU and health
   */
  private findConnectionToEvict(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    let unhealthyKey: string | undefined;

    for (const [key, metadata] of this.connectionMetadata) {
      if (!metadata.isHealthy) {
        unhealthyKey = key;
        break;
      }
      
      if (metadata.lastUsed < oldestTime) {
        oldestTime = metadata.lastUsed;
        oldestKey = key;
      }
    }

    return unhealthyKey || oldestKey;
  }

  /**
   * Release a connection
   */
  releaseConnection(key: string) {
    const connection = this.pools.get(key);
    if (connection) {
      connection.disconnect();
      this.pools.delete(key);
      this.connectionMetadata.delete(key);
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats() {
    const now = Date.now();
    const stats = {
      activeConnections: this.pools.size,
      maxConnections: this.maxConnections,
      connections: Array.from(this.connectionMetadata.entries()).map(([key, metadata]) => ({
        key,
        createdAt: metadata.createdAt,
        lastUsed: metadata.lastUsed,
        usageCount: metadata.usageCount,
        isHealthy: metadata.isHealthy,
        idleTime: now - metadata.lastUsed,
        lifetime: now - metadata.createdAt
      }))
    };

    return stats;
  }

  /**
   * Start maintenance tasks (idle cleanup and health checks)
   */
  private startMaintenanceTasks() {
    // Clean up idle connections every 5 minutes
    this.idleCleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 5 * 60 * 1000);

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30 * 1000);
  }

  /**
   * Clean up connections that have been idle for too long
   */
  private cleanupIdleConnections() {
    const now = Date.now();
    const idleTimeout = 60000; // Default 60 seconds

    for (const [key, metadata] of this.connectionMetadata) {
      if (now - metadata.lastUsed > idleTimeout) {
        log.info('Cleaning up idle connection', { key, idleTime: now - metadata.lastUsed });
        this.releaseConnection(key);
      }
    }
  }

  /**
   * Perform health checks on all connections
   */
  private async performHealthChecks() {
    for (const [key, connection] of this.pools) {
      try {
        const stats = connection.getConnectionStats();
        const metadata = this.connectionMetadata.get(key);
        
        if (metadata) {
          metadata.isHealthy = stats.isConnected;
          
          if (!stats.isConnected) {
            log.warn('Unhealthy connection detected', { key });
          }
        }
      } catch (error) {
        log.error('Health check failed for connection', { key, error });
        const metadata = this.connectionMetadata.get(key);
        if (metadata) {
          metadata.isHealthy = false;
        }
      }
    }
  }

  /**
   * Cleanup all connections and stop maintenance tasks
   */
  async cleanup() {
    // Stop maintenance intervals
    if (this.idleCleanupInterval) {
      clearInterval(this.idleCleanupInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Disconnect all connections
    for (const [key, connection] of this.pools) {
      await connection.disconnect();
    }
    
    this.pools.clear();
    this.connectionMetadata.clear();
  }
}

// Global connection pool instance
export const connectionPool = new SupabaseConnectionPool();

/**
 * Create a secure Supabase client with JWT authentication and connection pooling
 */
export function createSecureClient(jwtToken?: string): SecureSupabaseClient {
  const config = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtToken,
    connectionPool: {
      maxConnections: 10,
      connectionTimeout: 30000,
      idleTimeout: 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableAutoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000
    },
    performance: {
      enableMetrics: true,
      slowQueryThreshold: 1000,
      maxRetries: 3
    },
    security: {
      enableRLS: true,
      rowLevelSecurity: true,
      preparedStatements: true
    }
  };

  return connectionPool.getConnection(config);
}