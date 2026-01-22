import { Request, Response, NextFunction } from 'express';
import { logger, logPerformance } from './logger';
import { getDatabaseHealth } from '../config/database-health';

/**
 * Performance monitoring middleware
 */
export interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  statusCode?: number;
  responseSize?: number;
  userId?: string;
  ip?: string;
}

/**
 * Performance metrics storage
 */
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private slowRequestThreshold: number = 1000; // 1 second
  private memoryLeakThreshold: number = 100 * 1024 * 1024; // 100MB

  /**
   * Start monitoring a request
   */
  startMonitoring(req: Request): string {
    const requestId = (req as any).requestId || Math.random().toString(36).substring(7);
    const startTime = Date.now();
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      requestId,
      method: req.method,
      path: req.path,
      startTime,
      memoryUsage,
      cpuUsage,
      userId: (req as any).user?.id,
      ip: req.ip
    };

    this.metrics.set(requestId, metrics);
    return requestId;
  }

  /**
   * End monitoring a request
   */
  endMonitoring(requestId: string, statusCode: number, responseSize?: number): PerformanceMetrics | null {
    const metrics = this.metrics.get(requestId);
    if (!metrics) return null;

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;
    const endCpuUsage = process.cpuUsage(metrics.cpuUsage);
    const endMemoryUsage = process.memoryUsage();

    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.statusCode = statusCode;
    metrics.responseSize = responseSize;

    // Log performance metrics
    this.logPerformanceMetrics(metrics, endCpuUsage, endMemoryUsage);

    // Clean up
    this.metrics.delete(requestId);

    return metrics;
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(
    metrics: PerformanceMetrics,
    cpuUsage: NodeJS.CpuUsage,
    memoryUsage: NodeJS.MemoryUsage
  ): void {
    const { duration, method, path, statusCode, responseSize, userId, ip } = metrics;

    // Log slow requests
    if (duration && duration > this.slowRequestThreshold) {
      logger.warn('Slow request detected', {
        duration: `${duration}ms`,
        method,
        path,
        statusCode,
        responseSize,
        cpuUsage: {
          user: `${cpuUsage.user / 1000}ms`,
          system: `${cpuUsage.system / 1000}ms`
        },
        memoryUsage: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        }
      }, {
        requestId: metrics.requestId,
        userId,
        ip,
        method,
        path,
        statusCode,
        duration
      });
    }

    // Log memory usage warnings
    if (memoryUsage.heapUsed > this.memoryLeakThreshold) {
      logger.warn('High memory usage detected', {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      }, {
        requestId: metrics.requestId,
        userId,
        ip
      });
    }

    // Log general performance info for debugging
    if (process.env.NODE_ENV === 'development') {
      logPerformance(`${method} ${path}`, duration || 0, {
        statusCode,
        responseSize: responseSize ? `${Math.round(responseSize / 1024)}KB` : undefined,
        memoryUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      });
    }
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): any {
    const activeRequests = this.metrics.size;
    const currentMemory = process.memoryUsage();
    const uptime = process.uptime();

    return {
      activeRequests,
      uptime: `${Math.round(uptime / 60)}m ${Math.round(uptime % 60)}s`,
      memory: {
        rss: `${Math.round(currentMemory.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(currentMemory.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(currentMemory.external / 1024 / 1024)}MB`
      },
      cpu: process.cpuUsage()
    };
  }
}

/**
 * Global performance monitor instance
 */
const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = performanceMonitor.startMonitoring(req);
  (req as any).requestId = requestId;

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  const originalWrite = res.write;
  let responseSize = 0;

  // Track response size
  res.write = function(chunk: any, encoding?: any) {
    if (chunk) {
      responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
    }
    return originalWrite.call(this, chunk, encoding);
  };

  res.end = function(chunk?: any, encoding?: any, cb?: () => void) {
    if (chunk) {
      responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
    }

    // End monitoring
    performanceMonitor.endMonitoring(requestId, res.statusCode, responseSize);

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Database query performance tracker
 */
export class QueryPerformanceTracker {
  private static queries: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  /**
   * Track a database query
   */
  static trackQuery(queryName: string, duration: number): void {
    const existing = this.queries.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.queries.set(queryName, existing);

    // Log slow queries
    if (duration > 1000) { // 1 second
      logger.warn('Slow database query', {
        query: queryName,
        duration: `${duration}ms`,
        avgTime: `${Math.round(existing.avgTime)}ms`,
        count: existing.count
      });
    }
  }

  /**
   * Get query statistics
   */
  static getQueryStats(): any {
    const stats: any = {};
    
    for (const [query, data] of this.queries.entries()) {
      stats[query] = {
        count: data.count,
        totalTime: `${Math.round(data.totalTime)}ms`,
        avgTime: `${Math.round(data.avgTime)}ms`
      };
    }

    return stats;
  }

  /**
   * Reset query statistics
   */
  static resetStats(): void {
    this.queries.clear();
  }
}

/**
 * Database query wrapper with performance tracking
 */
export const trackDatabaseQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    QueryPerformanceTracker.trackQuery(queryName, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Database query failed', {
      query: queryName,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
};

/**
 * Memory usage monitoring
 */
export const memoryMonitor = {
  /**
   * Get current memory usage
   */
  getCurrentUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  },

  /**
   * Check for memory leaks
   */
  checkMemoryLeaks(): boolean {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 200) { // 200MB threshold
      logger.warn('Potential memory leak detected', {
        heapUsed: `${Math.round(heapUsedMB)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
      });
      return true;
    }
    
    return false;
  },

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection forced');
      return true;
    }
    return false;
  }
};

/**
 * Performance metrics endpoint handler
 */
export const performanceMetricsHandler = (req: Request, res: Response): void => {
  try {
    const metrics = {
      system: performanceMonitor.getMetricsSummary(),
      queries: QueryPerformanceTracker.getQueryStats(),
      memory: memoryMonitor.getCurrentUsage(),
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get performance metrics', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
};

/**
 * Health check with performance data
 */
export const healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    // Gather database health, including Supabase status
    const dbHealth = await getDatabaseHealth();

    const overallStatus = dbHealth.overall === 'healthy'
      ? 'healthy'
      : dbHealth.overall === 'degraded'
      ? 'degraded'
      : 'unhealthy';

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
      },
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      database: dbHealth
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
};

export {
  performanceMonitor
};