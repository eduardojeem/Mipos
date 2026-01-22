'use client';

// Cache configuration type
type CacheConfig = {
  ttl: number;
  refreshInterval: number | undefined;
};

// Cache configuration presets for different data types
export const cachePresets = {
  // Static data that rarely changes
  static: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    refreshInterval: undefined
  },

  // Semi-static data like categories, user profiles
  semiStatic: {
    ttl: 4 * 60 * 60 * 1000, // 4 hours
    refreshInterval: undefined
  },

  // Dynamic data that changes regularly
  dynamic: {
    ttl: 15 * 60 * 1000, // 15 minutes
    refreshInterval: undefined
  },

  // Real-time data that needs frequent updates
  realtime: {
    ttl: 2 * 60 * 1000, // 2 minutes
    refreshInterval: 30 * 1000 // Refresh every 30 seconds
  },

  // Dashboard data
  dashboard: {
    ttl: 10 * 60 * 1000, // 10 minutes
    refreshInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  }
};

// Specific cache configurations for different API endpoints
export const apiCacheConfig: Record<string, CacheConfig> = {
  // Categories - rarely change
  '/api/categories': cachePresets.static,
  
  // User profile - changes infrequently
  '/api/user/profile': cachePresets.semiStatic,
  
  // Products - moderate changes
  '/api/products': cachePresets.dynamic,
  
  // Sales data - changes regularly
  '/api/sales': cachePresets.dynamic,
  '/api/promotions': cachePresets.dynamic,
  
  // Dashboard stats - needs regular updates
  '/api/dashboard/stats': cachePresets.dashboard,
  
  // Customers - moderate changes
  '/api/customers': cachePresets.dynamic,
  
  // Inventory - changes frequently
  '/api/inventory': cachePresets.realtime,

  // Reports types - static list
  '/api/reports/types': cachePresets.static,
  // Reports by type - suitable presets
  '/api/reports?type=sales': cachePresets.dynamic,
  '/api/reports?type=inventory': cachePresets.realtime,
  '/api/reports?type=customers': cachePresets.dynamic,
  '/api/reports?type=financial': cachePresets.dynamic
  ,
  // Comparative reports
  '/api/reports/compare': cachePresets.dynamic
};

// Helper function to get cache config for an API endpoint
export function getCacheConfig(endpoint: string) {
  // Find exact match first
  if (apiCacheConfig[endpoint]) {
    return apiCacheConfig[endpoint];
  }
  
  // Find partial match
  const matchingKey = Object.keys(apiCacheConfig).find(key => 
    endpoint.startsWith(key)
  );
  
  if (matchingKey) {
    return apiCacheConfig[matchingKey];
  }
  
  // Default to dynamic cache
  return cachePresets.dynamic;
}