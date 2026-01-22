// Lightweight in-memory lock system to replace Redis dependency
// Reduces bundle size by ~500KB while maintaining lock functionality for development

interface LockEntry {
  expiresAt: number;
  resource: string;
}

class MemoryLock {
  private static locks = new Map<string, LockEntry>();
  
  // Clean expired locks periodically
  private static cleanupInterval: NodeJS.Timeout | null = null;
  
  private static startCleanup(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, lock] of this.locks.entries()) {
        if (lock.expiresAt <= now) {
          this.locks.delete(key);
        }
      }
    }, 30000); // Cleanup every 30 seconds
  }
  
  static async acquire(resource: string, ttlMs = 10000): Promise<boolean> {
    this.startCleanup();
    
    const now = Date.now();
    const existing = this.locks.get(resource);
    
    // Check if lock exists and is still valid
    if (existing && existing.expiresAt > now) {
      return false; // Lock already exists and is active
    }
    
    // Acquire the lock
    this.locks.set(resource, {
      resource,
      expiresAt: now + ttlMs
    });
    
    return true;
  }
  
  static release(resource: string): void {
    this.locks.delete(resource);
  }
  
  static isLocked(resource: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return false;
    
    const now = Date.now();
    if (lock.expiresAt <= now) {
      this.locks.delete(resource);
      return false;
    }
    
    return true;
  }
  
  static async withLock<T>(
    resource: string, 
    fn: () => Promise<T>, 
    ttlMs = 10000
  ): Promise<T> {
    const acquired = await this.acquire(resource, ttlMs);
    
    if (!acquired) {
      throw new Error(`Could not acquire lock for resource: ${resource}`);
    }
    
    try {
      return await fn();
    } finally {
      this.release(resource);
    }
  }
  
  // Get lock status for debugging
  static getStatus(): { resource: string; expiresAt: number; isExpired: boolean }[] {
    const now = Date.now();
    return Array.from(this.locks.values()).map(lock => ({
      resource: lock.resource,
      expiresAt: lock.expiresAt,
      isExpired: lock.expiresAt <= now
    }));
  }
  
  // Clear all locks (useful for testing)
  static clear(): void {
    this.locks.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export { MemoryLock };

// Compatibility layer for existing Redis lock usage
export const createLock = (resource: string, ttlMs = 10000) => ({
  acquire: () => MemoryLock.acquire(resource, ttlMs),
  release: () => MemoryLock.release(resource),
  isLocked: () => MemoryLock.isLocked(resource)
});

// Export default for easy replacement
export default MemoryLock;