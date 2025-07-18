// Cache performance monitoring service
import { QueryClient } from '@tanstack/react-query';

// Performance metrics interface
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalQueries: number;
  averageResponseTime: number;
  cacheSize: number;
  staleQueries: number;
  errorQueries: number;
  timestamp: number;
}

// Query performance data
interface QueryPerformance {
  queryKey: string;
  hits: number;
  misses: number;
  averageTime: number;
  lastAccessed: number;
  errorCount: number;
}

// Cache event types
type CacheEvent = 'hit' | 'miss' | 'error' | 'invalidation' | 'prefetch';

interface CacheEventData {
  type: CacheEvent;
  queryKey: string;
  timestamp: number;
  responseTime?: number;
  error?: string;
  cacheSize?: number;
}

export class CacheMonitoringService {
  private queryClient: QueryClient;
  private metrics: Map<string, QueryPerformance> = new Map();
  private events: CacheEventData[] = [];
  private maxEvents = 1000; // Keep last 1000 events
  private startTime = Date.now();
  private isEnabled = true;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupQueryCacheMonitoring();
  }

  // Setup monitoring for React Query cache
  private setupQueryCacheMonitoring() {
    const cache = this.queryClient.getQueryCache();

    // Subscribe to cache events
    cache.subscribe((event) => {
      if (!this.isEnabled) return;

      const queryKey = this.serializeQueryKey(event.query.queryKey);
      const now = Date.now();

      switch (event.type) {
        case 'updated':
          if (event.query.state.data) {
            // Cache hit
            this.recordEvent({
              type: 'hit',
              queryKey,
              timestamp: now,
              responseTime: event.query.state.dataUpdatedAt ? 
                now - event.query.state.dataUpdatedAt : undefined,
            });
            this.updateQueryMetrics(queryKey, 'hit');
          }
          break;

        case 'observerAdded':
          // Potential cache miss if no data
          if (!event.query.state.data) {
            this.recordEvent({
              type: 'miss',
              queryKey,
              timestamp: now,
            });
            this.updateQueryMetrics(queryKey, 'miss');
          }
          break;

        case 'observerRemoved':
          // Update last accessed time
          this.updateLastAccessed(queryKey, now);
          break;
      }

      // Track errors
      if (event.query.state.status === 'error') {
        this.recordEvent({
          type: 'error',
          queryKey,
          timestamp: now,
          error: event.query.state.error?.message,
        });
        this.updateQueryMetrics(queryKey, 'error');
      }
    });
  }

  // Record cache event
  private recordEvent(event: CacheEventData) {
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  // Update query-specific metrics
  private updateQueryMetrics(queryKey: string, eventType: 'hit' | 'miss' | 'error') {
    const existing = this.metrics.get(queryKey) || {
      queryKey,
      hits: 0,
      misses: 0,
      averageTime: 0,
      lastAccessed: Date.now(),
      errorCount: 0,
    };

    switch (eventType) {
      case 'hit':
        existing.hits++;
        break;
      case 'miss':
        existing.misses++;
        break;
      case 'error':
        existing.errorCount++;
        break;
    }

    existing.lastAccessed = Date.now();
    this.metrics.set(queryKey, existing);
  }

  // Update last accessed time
  private updateLastAccessed(queryKey: string, timestamp: number) {
    const existing = this.metrics.get(queryKey);
    if (existing) {
      existing.lastAccessed = timestamp;
      this.metrics.set(queryKey, existing);
    }
  }

  // Serialize query key for consistent tracking
  private serializeQueryKey(queryKey: any[]): string {
    try {
      return JSON.stringify(queryKey);
    } catch (error) {
      return String(queryKey);
    }
  }

  // Get overall cache metrics
  getOverallMetrics(): CacheMetrics {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    let totalHits = 0;
    let totalMisses = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalSize = 0;

    // Calculate metrics from stored data
    this.metrics.forEach(metric => {
      totalHits += metric.hits;
      totalMisses += metric.misses;
      if (metric.averageTime > 0) {
        totalResponseTime += metric.averageTime;
        responseTimeCount++;
      }
    });

    // Calculate cache size
    queries.forEach(query => {
      if (query.state.data) {
        try {
          totalSize += JSON.stringify(query.state.data).length;
        } catch (e) {
          // Ignore circular references
        }
      }
    });

    const totalQueries = totalHits + totalMisses;
    const hitRate = totalQueries > 0 ? (totalHits / totalQueries) * 100 : 0;
    const averageResponseTime = responseTimeCount > 0 ? 
      totalResponseTime / responseTimeCount : 0;

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate,
      totalQueries,
      averageResponseTime,
      cacheSize: totalSize,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      timestamp: Date.now(),
    };
  }

  // Get metrics for specific query
  getQueryMetrics(queryKey: string): QueryPerformance | null {
    return this.metrics.get(queryKey) || null;
  }

  // Get top performing queries
  getTopPerformingQueries(limit = 10): QueryPerformance[] {
    return Array.from(this.metrics.values())
      .sort((a, b) => {
        const aHitRate = a.hits / (a.hits + a.misses) || 0;
        const bHitRate = b.hits / (b.hits + b.misses) || 0;
        return bHitRate - aHitRate;
      })
      .slice(0, limit);
  }

  // Get worst performing queries
  getWorstPerformingQueries(limit = 10): QueryPerformance[] {
    return Array.from(this.metrics.values())
      .filter(metric => metric.hits + metric.misses > 5) // Only queries with significant usage
      .sort((a, b) => {
        const aHitRate = a.hits / (a.hits + a.misses) || 0;
        const bHitRate = b.hits / (b.hits + b.misses) || 0;
        return aHitRate - bHitRate;
      })
      .slice(0, limit);
  }

  // Get recent cache events
  getRecentEvents(limit = 50): CacheEventData[] {
    return this.events.slice(-limit);
  }

  // Get events by type
  getEventsByType(type: CacheEvent, limit = 50): CacheEventData[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }

  // Get cache performance over time
  getPerformanceOverTime(intervalMinutes = 5): Array<{
    timestamp: number;
    hitRate: number;
    totalQueries: number;
    averageResponseTime: number;
  }> {
    const now = Date.now();
    const intervalMs = intervalMinutes * 60 * 1000;
    const intervals: Map<number, {
      hits: number;
      misses: number;
      responseTimes: number[];
    }> = new Map();

    // Group events by time intervals
    this.events.forEach(event => {
      const intervalStart = Math.floor(event.timestamp / intervalMs) * intervalMs;
      const existing = intervals.get(intervalStart) || {
        hits: 0,
        misses: 0,
        responseTimes: [],
      };

      if (event.type === 'hit') {
        existing.hits++;
        if (event.responseTime) {
          existing.responseTimes.push(event.responseTime);
        }
      } else if (event.type === 'miss') {
        existing.misses++;
      }

      intervals.set(intervalStart, existing);
    });

    // Convert to array and calculate metrics
    return Array.from(intervals.entries())
      .map(([timestamp, data]) => {
        const totalQueries = data.hits + data.misses;
        const hitRate = totalQueries > 0 ? (data.hits / totalQueries) * 100 : 0;
        const averageResponseTime = data.responseTimes.length > 0 ?
          data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length : 0;

        return {
          timestamp,
          hitRate,
          totalQueries,
          averageResponseTime,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Record manual cache operations
  recordCacheOperation(operation: 'invalidation' | 'prefetch', queryKey: string) {
    this.recordEvent({
      type: operation,
      queryKey: this.serializeQueryKey([queryKey]),
      timestamp: Date.now(),
    });
  }

  // Reset metrics
  resetMetrics() {
    this.metrics.clear();
    this.events = [];
    this.startTime = Date.now();
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Get monitoring status
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      overall: this.getOverallMetrics(),
      queryMetrics: Array.from(this.metrics.values()),
      recentEvents: this.getRecentEvents(100),
      performanceOverTime: this.getPerformanceOverTime(),
      topPerforming: this.getTopPerformingQueries(),
      worstPerforming: this.getWorstPerformingQueries(),
      monitoringDuration: Date.now() - this.startTime,
    };
  }
}

// Create singleton instance
let monitoringServiceInstance: CacheMonitoringService | null = null;

export const createCacheMonitoringService = (queryClient: QueryClient): CacheMonitoringService => {
  if (!monitoringServiceInstance) {
    monitoringServiceInstance = new CacheMonitoringService(queryClient);
  }
  return monitoringServiceInstance;
};

export const getCacheMonitoringService = (): CacheMonitoringService => {
  if (!monitoringServiceInstance) {
    throw new Error('Cache monitoring service not initialized. Call createCacheMonitoringService first.');
  }
  return monitoringServiceInstance;
};
