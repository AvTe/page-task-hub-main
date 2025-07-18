import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useCacheMetrics,
  useCacheInsights,
  useCacheHealth,
  useCacheDebug,
  useCacheAlerts,
} from '../hooks/useCacheMonitoring';
import { useBrowserCacheManagement } from '../hooks/useBrowserCache';
import {
  Activity,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  RefreshCw,
  BarChart3,
  Clock,
  Zap,
} from 'lucide-react';

const CacheDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const metrics = useCacheMetrics();
  const insights = useCacheInsights();
  const health = useCacheHealth();
  const alerts = useCacheAlerts();
  const { exportMetrics, resetMetrics, toggleMonitoring, isEnabled } = useCacheDebug();
  const { getCacheStats, clearAllCache, cleanupCache } = useBrowserCacheManagement();

  const [browserStats, setBrowserStats] = useState<any>(null);

  const loadBrowserStats = async () => {
    const stats = await getCacheStats();
    setBrowserStats(stats);
  };

  const handleClearCache = async () => {
    await clearAllCache();
    await loadBrowserStats();
  };

  const handleCleanupCache = async () => {
    await cleanupCache();
    await loadBrowserStats();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'fair': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'poor': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Database className="h-4 w-4 mr-2" />
        Cache Debug
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Cache Debug Panel</h2>
          <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm">
            ×
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {alerts.map((alert, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{alert}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Health</CardTitle>
                {getHealthIcon(health.status)}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getHealthColor(health.status)}`}>
                  {health.score}/100
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {health.status}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.hitRate.toFixed(1)}%</div>
                <Progress value={metrics.hitRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalQueries}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.hits} hits, {metrics.misses} misses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(metrics.cacheSize)}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.staleQueries} stale, {metrics.errorQueries} errors
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="queries">Queries</TabsTrigger>
              <TabsTrigger value="browser">Browser Cache</TabsTrigger>
              <TabsTrigger value="controls">Controls</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {health.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {insights.recentEvents.slice(0, 10).map((event, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="flex items-center">
                            <Badge variant={event.type === 'hit' ? 'default' : 'secondary'} className="mr-2">
                              {event.type}
                            </Badge>
                            {event.queryKey.split(':').pop()}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Top Performing Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insights.topPerforming.map((query, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate">{query.queryKey.split(':').pop()}</span>
                          <Badge variant="default">
                            {((query.hits / (query.hits + query.misses)) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Worst Performing Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insights.worstPerforming.map((query, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate">{query.queryKey.split(':').pop()}</span>
                          <Badge variant="destructive">
                            {((query.hits / (query.hits + query.misses)) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="queries" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Query Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {/* This would show detailed query information */}
                    <p className="text-sm text-muted-foreground">
                      Detailed query information would be displayed here...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="browser" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Browser Cache Statistics</CardTitle>
                  <Button onClick={loadBrowserStats} size="sm" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {browserStats ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Total Entries</p>
                        <p className="text-2xl font-bold">{browserStats.totalEntries}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Size</p>
                        <p className="text-2xl font-bold">{formatBytes(browserStats.totalSize)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Expired Entries</p>
                        <p className="text-2xl font-bold">{browserStats.expiredEntries}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click refresh to load browser cache stats</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="controls" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cache Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={exportMetrics} variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export Metrics
                    </Button>
                    <Button onClick={resetMetrics} variant="outline" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Metrics
                    </Button>
                    <Button onClick={toggleMonitoring} variant="outline" className="w-full">
                      <Activity className="h-4 w-4 mr-2" />
                      {isEnabled ? 'Disable' : 'Enable'} Monitoring
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Browser Cache Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={handleCleanupCache} variant="outline" className="w-full">
                      <Zap className="h-4 w-4 mr-2" />
                      Cleanup Cache
                    </Button>
                    <Button onClick={handleClearCache} variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Cache
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CacheDebugPanel;
