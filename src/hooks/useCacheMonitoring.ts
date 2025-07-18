import { useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createCacheMonitoringService, getCacheMonitoringService } from '../services/cacheMonitoringService';

// Hook to access cache monitoring service
export const useCacheMonitoring = () => {
  const queryClient = useQueryClient();
  
  const monitoringService = useMemo(() => {
    return createCacheMonitoringService(queryClient);
  }, [queryClient]);

  return monitoringService;
};

// Hook for real-time cache metrics
export const useCacheMetrics = (refreshInterval = 5000) => {
  const monitoringService = useCacheMonitoring();
  const [metrics, setMetrics] = useState(() => monitoringService.getOverallMetrics());

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(monitoringService.getOverallMetrics());
    };

    // Update immediately
    updateMetrics();

    // Set up interval for updates
    const interval = setInterval(updateMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [monitoringService, refreshInterval]);

  return metrics;
};

// Hook for query-specific performance metrics
export const useQueryPerformance = (queryKey?: string) => {
  const monitoringService = useCacheMonitoring();
  const [performance, setPerformance] = useState(() => 
    queryKey ? monitoringService.getQueryMetrics(queryKey) : null
  );

  useEffect(() => {
    if (!queryKey) {
      setPerformance(null);
      return;
    }

    const updatePerformance = () => {
      setPerformance(monitoringService.getQueryMetrics(queryKey));
    };

    // Update immediately
    updatePerformance();

    // Set up interval for updates
    const interval = setInterval(updatePerformance, 2000);

    return () => clearInterval(interval);
  }, [monitoringService, queryKey]);

  return performance;
};

// Hook for cache performance insights
export const useCacheInsights = () => {
  const monitoringService = useCacheMonitoring();
  const [insights, setInsights] = useState(() => ({
    topPerforming: monitoringService.getTopPerformingQueries(5),
    worstPerforming: monitoringService.getWorstPerformingQueries(5),
    recentEvents: monitoringService.getRecentEvents(20),
    performanceOverTime: monitoringService.getPerformanceOverTime(5),
  }));

  useEffect(() => {
    const updateInsights = () => {
      setInsights({
        topPerforming: monitoringService.getTopPerformingQueries(5),
        worstPerforming: monitoringService.getWorstPerformingQueries(5),
        recentEvents: monitoringService.getRecentEvents(20),
        performanceOverTime: monitoringService.getPerformanceOverTime(5),
      });
    };

    // Update immediately
    updateInsights();

    // Set up interval for updates
    const interval = setInterval(updateInsights, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [monitoringService]);

  return insights;
};

// Hook for cache event monitoring
export const useCacheEvents = (eventType?: 'hit' | 'miss' | 'error' | 'invalidation' | 'prefetch') => {
  const monitoringService = useCacheMonitoring();
  const [events, setEvents] = useState(() => 
    eventType 
      ? monitoringService.getEventsByType(eventType, 50)
      : monitoringService.getRecentEvents(50)
  );

  useEffect(() => {
    const updateEvents = () => {
      setEvents(
        eventType 
          ? monitoringService.getEventsByType(eventType, 50)
          : monitoringService.getRecentEvents(50)
      );
    };

    // Update immediately
    updateEvents();

    // Set up interval for updates
    const interval = setInterval(updateEvents, 3000);

    return () => clearInterval(interval);
  }, [monitoringService, eventType]);

  return events;
};

// Hook for cache health monitoring
export const useCacheHealth = () => {
  const metrics = useCacheMetrics(5000);
  
  const health = useMemo(() => {
    const hitRate = metrics.hitRate;
    const errorRate = metrics.totalQueries > 0 ? 
      (metrics.errorQueries / metrics.totalQueries) * 100 : 0;
    const staleRate = metrics.totalQueries > 0 ? 
      (metrics.staleQueries / metrics.totalQueries) * 100 : 0;

    // Determine health status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    let score = 100;

    // Deduct points for low hit rate
    if (hitRate < 50) score -= 30;
    else if (hitRate < 70) score -= 15;
    else if (hitRate < 85) score -= 5;

    // Deduct points for high error rate
    if (errorRate > 10) score -= 25;
    else if (errorRate > 5) score -= 15;
    else if (errorRate > 2) score -= 5;

    // Deduct points for high stale rate
    if (staleRate > 30) score -= 20;
    else if (staleRate > 20) score -= 10;
    else if (staleRate > 10) score -= 5;

    // Determine status based on score
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else status = 'poor';

    return {
      status,
      score,
      hitRate,
      errorRate,
      staleRate,
      recommendations: generateRecommendations(hitRate, errorRate, staleRate),
    };
  }, [metrics]);

  return health;
};

// Generate performance recommendations
const generateRecommendations = (hitRate: number, errorRate: number, staleRate: number): string[] => {
  const recommendations: string[] = [];

  if (hitRate < 70) {
    recommendations.push('Consider increasing cache stale times for frequently accessed data');
    recommendations.push('Implement prefetching for predictable data access patterns');
  }

  if (errorRate > 5) {
    recommendations.push('Review error handling and retry strategies');
    recommendations.push('Check network connectivity and API reliability');
  }

  if (staleRate > 20) {
    recommendations.push('Implement better cache invalidation strategies');
    recommendations.push('Consider using real-time updates for frequently changing data');
  }

  if (hitRate > 90 && errorRate < 2 && staleRate < 10) {
    recommendations.push('Cache performance is excellent! Consider sharing these strategies across the application');
  }

  return recommendations;
};

// Hook for cache debugging
export const useCacheDebug = () => {
  const monitoringService = useCacheMonitoring();

  const exportMetrics = () => {
    const data = monitoringService.exportMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-metrics-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetMetrics = () => {
    monitoringService.resetMetrics();
  };

  const toggleMonitoring = () => {
    const isEnabled = monitoringService.isMonitoringEnabled();
    monitoringService.setEnabled(!isEnabled);
    return !isEnabled;
  };

  return {
    exportMetrics,
    resetMetrics,
    toggleMonitoring,
    isEnabled: monitoringService.isMonitoringEnabled(),
  };
};

// Hook for performance alerts
export const useCacheAlerts = () => {
  const health = useCacheHealth();
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const newAlerts: string[] = [];

    if (health.hitRate < 50) {
      newAlerts.push('Low cache hit rate detected. Consider optimizing cache strategy.');
    }

    if (health.errorRate > 10) {
      newAlerts.push('High error rate detected. Check API connectivity and error handling.');
    }

    if (health.staleRate > 30) {
      newAlerts.push('High stale data rate detected. Review cache invalidation strategy.');
    }

    if (health.score < 60) {
      newAlerts.push('Overall cache performance is poor. Immediate optimization recommended.');
    }

    setAlerts(newAlerts);
  }, [health]);

  return alerts;
};
