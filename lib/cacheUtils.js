// Centralized cache utility for consistent cache management across the application

// Cache duration constants
export const CACHE_DURATIONS = {
  MAIN_PRODUCTS: 5 * 60 * 1000,    // 5 minutes
  TRENDING_PRODUCTS: 10 * 60 * 1000, // 10 minutes  
  SEARCH_PRODUCTS: 5 * 60 * 1000,   // 5 minutes
  CATEGORIES: 15 * 60 * 1000,       // 15 minutes (categories change less frequently)
  SETTINGS: 30 * 60 * 1000,         // 30 minutes (settings change rarely)
};

// Cache utility functions
export const cacheUtils = {
  // Set cache with timestamp
  setCache: (key, data, duration = CACHE_DURATIONS.MAIN_PRODUCTS) => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      sessionStorage.setItem(`${key}Timestamp`, Date.now().toString());
      console.log(`📦 Cached ${key}:`, data?.length || 'data');
    } catch (error) {
      console.warn(`Failed to cache ${key}:`, error);
    }
  },

  // Get cache with expiration check
  getCache: (key, duration = CACHE_DURATIONS.MAIN_PRODUCTS) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cachedData = sessionStorage.getItem(key);
      const cachedTimestamp = sessionStorage.getItem(`${key}Timestamp`);
      
      if (!cachedData || !cachedTimestamp) return null;
      
      const age = Date.now() - parseInt(cachedTimestamp);
      const isExpired = age > duration;
      
      if (isExpired) {
        console.log(`⏰ Cache expired for ${key} (age: ${Math.round(age / 1000)}s)`);
        cacheUtils.clearCache(key);
        return null;
      }
      
      const parsed = JSON.parse(cachedData);
      console.log(`📦 Using cached ${key}:`, parsed?.length || 'data');
      return parsed;
    } catch (error) {
      console.warn(`Failed to get cache ${key}:`, error);
      cacheUtils.clearCache(key);
      return null;
    }
  },

  // Clear specific cache
  clearCache: (key) => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(`${key}Timestamp`);
      console.log(`🗑️ Cleared cache for ${key}`);
    } catch (error) {
      console.warn(`Failed to clear cache ${key}:`, error);
    }
  },

  // Clear all caches
  clearAllCaches: () => {
    if (typeof window === 'undefined') return;
    
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.includes('Products') || key.includes('Timestamp')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('🗑️ Cleared all product caches');
    } catch (error) {
      console.warn('Failed to clear all caches:', error);
    }
  },

  // Check if cache is valid without retrieving data
  isCacheValid: (key, duration = CACHE_DURATIONS.MAIN_PRODUCTS) => {
    if (typeof window === 'undefined') return false;
    
    try {
      const cachedTimestamp = sessionStorage.getItem(`${key}Timestamp`);
      if (!cachedTimestamp) return false;
      
      const age = Date.now() - parseInt(cachedTimestamp);
      return age <= duration;
    } catch (error) {
      return false;
    }
  },

  // Get cache age in seconds
  getCacheAge: (key) => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cachedTimestamp = sessionStorage.getItem(`${key}Timestamp`);
      if (!cachedTimestamp) return null;
      
      const age = Date.now() - parseInt(cachedTimestamp);
      return Math.round(age / 1000);
    } catch (error) {
      return null;
    }
  }
};

// Cache keys constants
export const CACHE_KEYS = {
  MAIN_PRODUCTS: 'mainPageProducts',
  TRENDING_PRODUCTS: 'trendingProducts',
  SEARCH_PRODUCTS: 'searchAllProducts',
  CATEGORIES: 'categories',
  SETTINGS: 'displaySettings',
  RECENTLY_VIEWED: 'recentlyViewed',
  LATEST_PRODUCTS: 'latestProducts'
};
