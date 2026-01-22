import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { QueryMetrics, CacheMetrics } from '@/types/product.unified';

interface PerformanceMonitorProps {
  metrics: QueryMetrics[];
  cacheMetrics: CacheMetrics;
  onRefresh?: () => void;
  onClear?: () => void;
  className?: string;
}

interface MetricSummary {
  totalQueries: number;
  averageDuration: number;
  successRate: number;
  cacheHitRate: number;
  slowQueries: number;
  errorRate: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export function PerformanceMonitor({
  metrics,
  cacheMetrics,
  onRefresh,
  onClear,
  className = ''
}: PerformanceMonitorProps) {
  const [summary, setSummary] = useState<MetricSummary>({
    totalQueries: 0,
    averageDuration: 0,
    successRate: 0,
    cacheHitRate: 0,
    slowQueries: 0,
    errorRate: 0
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('1h');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Calculate summary metrics
  useEffect(() => {
    if (metrics.length === 0) {
      setSummary({
        totalQueries: 0,
        averageDuration: 0,
        successRate: 0,
        cacheHitRate: cacheMetrics.hitRate * 100,
        slowQueries: 0,
        errorRate: 0
      });
      return;
    }

    const totalQueries = metrics.length;
    const successfulQueries = metrics.filter(m => m.success).length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const slowQueries = metrics.filter(m => m.duration > 1000).length;
    const errors = metrics.filter(m => !m.success).length;

    setSummary({
      totalQueries,
      averageDuration: totalDuration / totalQueries,
      successRate: (successfulQueries / totalQueries) * 100,
      cacheHitRate: cacheMetrics.hitRate * 100,
      slowQueries,
      errorRate: (errors / totalQueries) * 100
    });
  }, [metrics, cacheMetrics]);

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      onRefresh?.();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  // Prepare chart data
  const durationData = metrics.slice(-20).map((metric, index) => ({
    name: `Query ${index + 1}`,
    duration: metric.duration,
    success: metric.success ? 1 : 0,
    timestamp: new Date(metric.timestamp).toLocaleTimeString()
  }));

  const queryTypeData = metrics.reduce((acc, metric) => {
    const type = metric.query.split('(')[0] || 'unknown';
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.count += 1;
      existing.avgDuration = (existing.avgDuration + metric.duration) / 2;
    } else {
      acc.push({ name: type, count: 1, avgDuration: metric.duration });
    }
    return acc;
  }, [] as Array<{ name: string; count: number; avgDuration: number }>);

  const statusData = [
    { name: 'Success', value: metrics.filter(m => m.success).length },
    { name: 'Error', value: metrics.filter(m => !m.success).length },
    { name: 'Cached', value: metrics.filter(m => m.cacheHit).length },
    { name: 'Slow', value: metrics.filter(m => m.duration > 1000).length }
  ];

  const getDurationColor = (duration: number) => {
    if (duration < 100) return 'text-green-600';
    if (duration < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
            </CardTitle>
            <CardDescription>
              Real-time system performance and query metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
            >
              <Settings className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queries">Query Details</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Queries</p>
                    <p className="text-2xl font-bold text-blue-900">{summary.totalQueries}</p>
                  </div>
                  <Database className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Success Rate</p>
                    <p className="text-2xl font-bold text-green-900">
                      {summary.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Avg Duration</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {summary.averageDuration.toFixed(0)}ms
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Cache Hit Rate</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {summary.cacheHitRate.toFixed(1)}%
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Slow Queries</p>
                    <p className="text-2xl font-bold text-red-900">{summary.slowQueries}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Error Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.errorRate.toFixed(1)}%
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Status Distribution Chart */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Query Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="queries" className="space-y-4">
            {/* Query Duration Chart */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Query Duration Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Query Types */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Query Types Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={queryTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Count" />
                  <Bar dataKey="avgDuration" fill="#f59e0b" name="Avg Duration (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Queries Table */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Recent Queries</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Query</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cache</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Retries</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.slice(-10).reverse().map((metric, index) => (
                      <tr key={metric.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {metric.query}
                        </td>
                        <td className={`px-4 py-2 text-sm font-medium ${getDurationColor(metric.duration)}`}>
                          {metric.duration}ms
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {metric.success ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {metric.cacheHit ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Hit
                            </Badge>
                          ) : (
                            <Badge variant="outline">Miss</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {metric.retryCount}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cache" className="space-y-4">
            {/* Cache Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Cache Hits</p>
                    <p className="text-2xl font-bold text-blue-900">{cacheMetrics.hits}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Cache Misses</p>
                    <p className="text-2xl font-bold text-red-900">{cacheMetrics.misses}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Cache Size</p>
                    <p className="text-2xl font-bold text-purple-900">{cacheMetrics.size}</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Hit Rate</p>
                    <p className="text-2xl font-bold text-green-900">
                      {(cacheMetrics.hitRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>

            {/* Cache Hit Rate Progress */}
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Cache Hit Rate</h3>
                <Badge variant="secondary">
                  {(cacheMetrics.hitRate * 100).toFixed(1)}%
                </Badge>
              </div>
              <Progress
                value={cacheMetrics.hitRate * 100}
                className="h-3"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {/* Performance Trends */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">Avg Duration</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.averageDuration.toFixed(0)}ms
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    {getTrendIcon(summary.averageDuration, summary.averageDuration * 0.9)}
                    <span>vs previous</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {summary.successRate.toFixed(1)}%
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    {getTrendIcon(summary.successRate, summary.successRate * 0.95)}
                    <span>vs previous</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {summary.cacheHitRate.toFixed(1)}%
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    {getTrendIcon(summary.cacheHitRate, summary.cacheHitRate * 0.95)}
                    <span>vs previous</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Performance Recommendations</h3>
              <div className="space-y-3">
                {summary.cacheHitRate < 70 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Low Cache Hit Rate</p>
                      <p className="text-sm text-yellow-700">
                        Consider increasing cache timeout or optimizing cache key strategy to improve performance.
                      </p>
                    </div>
                  </div>
                )}

                {summary.slowQueries > summary.totalQueries * 0.1 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">High Number of Slow Queries</p>
                      <p className="text-sm text-red-700">
                        Review database indexes and query optimization for queries taking longer than 1 second.
                      </p>
                    </div>
                  </div>
                )}

                {summary.errorRate > 5 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">High Error Rate</p>
                      <p className="text-sm text-red-700">
                        Investigate recent errors and implement proper error handling and retry mechanisms.
                      </p>
                    </div>
                  </div>
                )}

                {summary.successRate >= 95 && summary.cacheHitRate >= 80 && summary.slowQueries <= summary.totalQueries * 0.05 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Excellent Performance</p>
                      <p className="text-sm text-green-700">
                        System is performing optimally with high success rate, good cache utilization, and minimal slow queries.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
