'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AdvancedBIEngine, { 
  type BIMetric, 
  type BIDimension, 
  type BITimeSeriesData, 
  type BIInsight, 
  type BIDashboardConfig 
} from '../services/AdvancedBIEngine';
import type { Product, Category } from '@/types';

interface UseAdvancedBIOptions {
  products: Product[];
  categories: Category[];
  role?: 'executive' | 'manager' | 'analyst' | 'operator';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface AdvancedBIState {
  metrics: BIMetric[];
  dimensions: BIDimension[];
  timeSeriesData: BITimeSeriesData[];
  insights: BIInsight[];
  dashboardConfig: BIDashboardConfig | null;
  isGenerating: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useAdvancedBI({
  products,
  categories,
  role = 'manager',
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000 // 5 minutes
}: UseAdvancedBIOptions) {
  const [state, setState] = useState<AdvancedBIState>({
    metrics: [],
    dimensions: [],
    timeSeriesData: [],
    insights: [],
    dashboardConfig: null,
    isGenerating: false,
    lastUpdated: null,
    error: null
  });

  // Get BI engine instance
  const biEngine = useMemo(() => AdvancedBIEngine.getInstance(), []);

  // Generate comprehensive BI analysis
  const generateAnalysis = useCallback(async () => {
    if (products.length === 0) return;

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Generate comprehensive analysis
      const analysis = biEngine.generateComprehensiveAnalysis(products, categories);
      const dashboardConfig = biEngine.getDashboardConfig(role);

      setState(prev => ({
        ...prev,
        metrics: analysis.metrics,
        dimensions: analysis.dimensions,
        timeSeriesData: analysis.timeSeriesData,
        insights: analysis.insights,
        dashboardConfig,
        isGenerating: false,
        lastUpdated: new Date(),
        error: null
      }));

      console.log('Advanced BI Analysis generated:', {
        metricsCount: analysis.metrics.length,
        dimensionsCount: analysis.dimensions.length,
        insightsCount: analysis.insights.length,
        timeSeriesPoints: analysis.timeSeriesData.length,
        role,
        summary: analysis.summary
      });

    } catch (error) {
      console.error('Error generating BI analysis:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Error generating BI analysis'
      }));
    }
  }, [biEngine, products, categories, role]);

  // Get metrics by category
  const getMetricsByCategory = useCallback((category: BIMetric['category']) => {
    return state.metrics.filter(m => m.category === category);
  }, [state.metrics]);

  // Get insights by type
  const getInsightsByType = useCallback((type: BIInsight['type']) => {
    return state.insights.filter(i => i.type === type);
  }, [state.insights]);

  // Get insights by priority
  const getInsightsByPriority = useCallback((priority: BIInsight['priority']) => {
    return state.insights.filter(i => i.priority === priority);
  }, [state.insights]);

  // Get dimension by id
  const getDimensionById = useCallback((id: string) => {
    return state.dimensions.find(d => d.id === id);
  }, [state.dimensions]);

  // Get metric by id
  const getMetricById = useCallback((id: string) => {
    return state.metrics.find(m => m.id === id);
  }, [state.metrics]);

  // Get time series for metric
  const getTimeSeriesForMetric = useCallback((metricId: string) => {
    return state.timeSeriesData.map(point => ({
      date: point.date,
      value: point.metrics[metricId] || 0
    }));
  }, [state.timeSeriesData]);

  // Export data for reports
  const exportData = useCallback((format: 'json' | 'csv' | 'excel') => {
    return biEngine.exportForReport(format);
  }, [biEngine]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || products.length === 0) return;

    // Initial generation
    generateAnalysis();

    // Set up interval for auto-refresh
    const interval = setInterval(generateAnalysis, refreshInterval);

    return () => clearInterval(interval);
  }, [generateAnalysis, autoRefresh, refreshInterval, products.length]);

  // Computed values
  const computed = useMemo(() => {
    const { metrics, insights, dimensions } = state;
    
    // Metrics summary
    const financialMetrics = metrics.filter(m => m.category === 'financial');
    const operationalMetrics = metrics.filter(m => m.category === 'operational');
    const performanceMetrics = metrics.filter(m => m.category === 'performance');
    const strategicMetrics = metrics.filter(m => m.category === 'strategic');

    // Insights summary
    const criticalInsights = insights.filter(i => i.priority === 'critical');
    const highPriorityInsights = insights.filter(i => i.priority === 'high');
    const opportunities = insights.filter(i => i.type === 'opportunity');
    const risks = insights.filter(i => i.type === 'risk');
    const trends = insights.filter(i => i.type === 'trend');
    const anomalies = insights.filter(i => i.type === 'anomaly');

    // Performance indicators
    const metricsWithPositiveTrend = metrics.filter(m => m.trend === 'up').length;
    const metricsWithNegativeTrend = metrics.filter(m => m.trend === 'down').length;
    const metricsAtTarget = metrics.filter(m => 
      m.target && Math.abs(m.value - m.target) / m.target < 0.05
    ).length;

    // Health score calculation
    const totalMetrics = metrics.length;
    const positiveScore = metricsWithPositiveTrend / totalMetrics;
    const targetScore = metricsAtTarget / totalMetrics;
    const riskScore = 1 - (criticalInsights.length / Math.max(insights.length, 1));
    const healthScore = Math.round(((positiveScore + targetScore + riskScore) / 3) * 100);

    return {
      // Metrics breakdown
      totalMetrics: metrics.length,
      financialMetricsCount: financialMetrics.length,
      operationalMetricsCount: operationalMetrics.length,
      performanceMetricsCount: performanceMetrics.length,
      strategicMetricsCount: strategicMetrics.length,

      // Insights breakdown
      totalInsights: insights.length,
      criticalInsightsCount: criticalInsights.length,
      highPriorityInsightsCount: highPriorityInsights.length,
      opportunitiesCount: opportunities.length,
      risksCount: risks.length,
      trendsCount: trends.length,
      anomaliesCount: anomalies.length,

      // Performance indicators
      metricsWithPositiveTrend,
      metricsWithNegativeTrend,
      metricsAtTarget,
      healthScore,

      // Status flags
      hasData: metrics.length > 0 || insights.length > 0,
      hasCriticalIssues: criticalInsights.length > 0,
      hasOpportunities: opportunities.length > 0,
      needsAttention: criticalInsights.length + highPriorityInsights.length > 0,

      // Data quality
      dimensionsCount: dimensions.length,
      timeSeriesPoints: state.timeSeriesData.length,
      dataCompleteness: Math.round((metrics.filter(m => m.value !== null && m.value !== undefined).length / Math.max(metrics.length, 1)) * 100)
    };
  }, [state]);

  return {
    // State
    ...state,
    
    // Actions
    generateAnalysis,
    getMetricsByCategory,
    getInsightsByType,
    getInsightsByPriority,
    getDimensionById,
    getMetricById,
    getTimeSeriesForMetric,
    exportData,
    
    // Computed values
    computed,
    
    // Utilities
    isReady: products.length > 0 && !state.isGenerating,
    hasData: computed.hasData,
    needsRefresh: !state.lastUpdated || 
                  (Date.now() - state.lastUpdated.getTime()) > refreshInterval,
    
    // Role-specific helpers
    isExecutiveView: role === 'executive',
    isManagerView: role === 'manager',
    isAnalystView: role === 'analyst',
    isOperatorView: role === 'operator'
  };
}

export type { AdvancedBIState, UseAdvancedBIOptions };