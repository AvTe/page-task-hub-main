// Browser storage caching service for offline support and faster initial loads
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      expiresAt: number;
      version: number;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      lastCleanup: number;
      totalSize: number;
      version: number;
    };
  };
}

// Cache entry interface
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  version: number;
}

// Cache configuration
const CACHE_CONFIG = {
  DB_NAME: 'eastask-cache',
  DB_VERSION: 1,
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
  VERSION: 1,
};

// Cache TTL for different data types
const CACHE_TTL = {
  USER_PROFILE: 24 * 60 * 60 * 1000, // 24 hours
  USER_SETTINGS: 24 * 60 * 60 * 1000, // 24 hours
  WORKSPACE: 12 * 60 * 60 * 1000, // 12 hours
  WORKSPACE_MEMBERS: 6 * 60 * 60 * 1000, // 6 hours
  TASKS: 2 * 60 * 60 * 1000, // 2 hours
  PAGES: 4 * 60 * 60 * 1000, // 4 hours
  COMMENTS: 30 * 60 * 1000, // 30 minutes
  STATS: 60 * 60 * 1000, // 1 hour
} as const;

export class BrowserCacheService {
  private db: IDBPDatabase<CacheDB> | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  // Initialize IndexedDB
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<CacheDB>(CACHE_CONFIG.DB_NAME, CACHE_CONFIG.DB_VERSION, {
        upgrade(db) {
          // Create cache store
          if (!db.objectStoreNames.contains('cache')) {
            const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
            cacheStore.createIndex('timestamp', 'timestamp');
            cacheStore.createIndex('expiresAt', 'expiresAt');
          }

          // Create metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        },
      });

      this.isInitialized = true;
      
      // Schedule periodic cleanup
      this.scheduleCleanup();
      
      console.log('Browser cache service initialized');
    } catch (error) {
      console.error('Failed to initialize browser cache:', error);
      // Fallback to localStorage if IndexedDB fails
      this.isInitialized = false;
    }
  }

  // Ensure database is initialized
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  // Generate cache key
  private generateCacheKey(type: string, id: string, userId?: string): string {
    const userPrefix = userId ? `user:${userId}:` : '';
    return `${userPrefix}${type}:${id}`;
  }

  // Get TTL for cache type
  private getTTL(type: string): number {
    const ttlKey = type.toUpperCase() as keyof typeof CACHE_TTL;
    return CACHE_TTL[ttlKey] || CACHE_CONFIG.DEFAULT_TTL;
  }

  // Set cache entry
  async set(type: string, id: string, data: any, userId?: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      // Fallback to localStorage
      return this.setLocalStorage(type, id, data, userId);
    }

    try {
      const key = this.generateCacheKey(type, id, userId);
      const ttl = this.getTTL(type);
      const now = Date.now();

      const entry: CacheEntry = {
        key,
        data,
        timestamp: now,
        expiresAt: now + ttl,
        version: CACHE_CONFIG.VERSION,
      };

      await this.db.put('cache', entry);
      
      // Update metadata
      await this.updateMetadata();
    } catch (error) {
      console.error('Failed to set cache entry:', error);
      // Fallback to localStorage
      this.setLocalStorage(type, id, data, userId);
    }
  }

  // Get cache entry
  async get(type: string, id: string, userId?: string): Promise<any | null> {
    await this.ensureInitialized();

    if (!this.db) {
      // Fallback to localStorage
      return this.getLocalStorage(type, id, userId);
    }

    try {
      const key = this.generateCacheKey(type, id, userId);
      const entry = await this.db.get('cache', key);

      if (!entry) {
        return null;
      }

      // Check if entry is expired
      if (entry.expiresAt < Date.now()) {
        await this.db.delete('cache', key);
        return null;
      }

      // Check version compatibility
      if (entry.version !== CACHE_CONFIG.VERSION) {
        await this.db.delete('cache', key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Failed to get cache entry:', error);
      // Fallback to localStorage
      return this.getLocalStorage(type, id, userId);
    }
  }

  // Delete cache entry
  async delete(type: string, id: string, userId?: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      return this.deleteLocalStorage(type, id, userId);
    }

    try {
      const key = this.generateCacheKey(type, id, userId);
      await this.db.delete('cache', key);
    } catch (error) {
      console.error('Failed to delete cache entry:', error);
      this.deleteLocalStorage(type, id, userId);
    }
  }

  // Clear all cache for a user
  async clearUserCache(userId: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      return this.clearUserCacheLocalStorage(userId);
    }

    try {
      const tx = this.db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const cursor = await store.openCursor();

      while (cursor) {
        if (cursor.value.key.startsWith(`user:${userId}:`)) {
          await cursor.delete();
        }
        await cursor.continue();
      }

      await tx.done;
    } catch (error) {
      console.error('Failed to clear user cache:', error);
      this.clearUserCacheLocalStorage(userId);
    }
  }

  // Clear all cache
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      return this.clearAllLocalStorage();
    }

    try {
      await this.db.clear('cache');
      await this.db.clear('metadata');
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      this.clearAllLocalStorage();
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    await this.ensureInitialized();

    if (!this.db) {
      return this.getStatsLocalStorage();
    }

    try {
      const tx = this.db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      const cursor = await store.openCursor();

      let totalEntries = 0;
      let totalSize = 0;
      let expiredEntries = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;
      const now = Date.now();

      while (cursor) {
        const entry = cursor.value;
        totalEntries++;
        
        try {
          totalSize += JSON.stringify(entry.data).length;
        } catch (e) {
          // Ignore circular references
        }

        if (entry.expiresAt < now) {
          expiredEntries++;
        }

        if (oldestEntry === null || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp;
        }

        if (newestEntry === null || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp;
        }

        await cursor.continue();
      }

      return {
        totalEntries,
        totalSize,
        expiredEntries,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return this.getStatsLocalStorage();
    }
  }

  // Cleanup expired entries
  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    if (!this.db) {
      return this.cleanupLocalStorage();
    }

    try {
      const tx = this.db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const index = store.index('expiresAt');
      const cursor = await index.openCursor(IDBKeyRange.upperBound(Date.now()));

      let deletedCount = 0;
      while (cursor) {
        await cursor.delete();
        deletedCount++;
        await cursor.continue();
      }

      await tx.done;
      
      // Update metadata
      await this.updateMetadata();
      
      console.log(`Cleaned up ${deletedCount} expired cache entries`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
      return this.cleanupLocalStorage();
    }
  }

  // Schedule periodic cleanup
  private scheduleCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  // Update metadata
  private async updateMetadata(): Promise<void> {
    if (!this.db) return;

    try {
      const stats = await this.getStats();
      await this.db.put('metadata', {
        key: 'cache-stats',
        lastCleanup: Date.now(),
        totalSize: stats.totalSize,
        version: CACHE_CONFIG.VERSION,
      });
    } catch (error) {
      console.error('Failed to update metadata:', error);
    }
  }

  // LocalStorage fallback methods
  private setLocalStorage(type: string, id: string, data: any, userId?: string): void {
    try {
      const key = this.generateCacheKey(type, id, userId);
      const ttl = this.getTTL(type);
      const entry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        version: CACHE_CONFIG.VERSION,
      };
      localStorage.setItem(`eastask-cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to set localStorage cache:', error);
    }
  }

  private getLocalStorage(type: string, id: string, userId?: string): any | null {
    try {
      const key = this.generateCacheKey(type, id, userId);
      const item = localStorage.getItem(`eastask-cache:${key}`);
      
      if (!item) return null;
      
      const entry = JSON.parse(item);
      
      if (entry.expiresAt < Date.now() || entry.version !== CACHE_CONFIG.VERSION) {
        localStorage.removeItem(`eastask-cache:${key}`);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.error('Failed to get localStorage cache:', error);
      return null;
    }
  }

  private deleteLocalStorage(type: string, id: string, userId?: string): void {
    try {
      const key = this.generateCacheKey(type, id, userId);
      localStorage.removeItem(`eastask-cache:${key}`);
    } catch (error) {
      console.error('Failed to delete localStorage cache:', error);
    }
  }

  private clearUserCacheLocalStorage(userId: string): void {
    try {
      const prefix = `eastask-cache:user:${userId}:`;
      const keysToDelete: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear user localStorage cache:', error);
    }
  }

  private clearAllLocalStorage(): void {
    try {
      const keysToDelete: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('eastask-cache:')) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear all localStorage cache:', error);
    }
  }

  private getStatsLocalStorage() {
    // Simplified stats for localStorage
    let totalEntries = 0;
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('eastask-cache:')) {
        totalEntries++;
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      }
    }
    
    return {
      totalEntries,
      totalSize,
      expiredEntries: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }

  private cleanupLocalStorage(): number {
    let deletedCount = 0;
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('eastask-cache:')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry = JSON.parse(item);
            if (entry.expiresAt < Date.now() || entry.version !== CACHE_CONFIG.VERSION) {
              keysToDelete.push(key);
            }
          }
        } catch (error) {
          // Invalid entry, delete it
          keysToDelete.push(key);
        }
      }
    }
    
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
      deletedCount++;
    });
    
    return deletedCount;
  }
}

// Create singleton instance
let browserCacheInstance: BrowserCacheService | null = null;

export const getBrowserCache = (): BrowserCacheService => {
  if (!browserCacheInstance) {
    browserCacheInstance = new BrowserCacheService();
  }
  return browserCacheInstance;
};
