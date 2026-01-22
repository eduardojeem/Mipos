'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import MLRecommendationEngine, { 
  type Recommendation, 
  type MLInsights, 
  type RecommendationContext 
} from '../services/MLRecommendationEngine';
import type { Product, Category } from '@/types';

interface UseMLRecommendationsOptions {
  products: Product[];
  categories: Category[];
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface MLRecommendationsState {
  recommendations: Recommendation[];
  insights: MLInsights | null;
  isGenerating: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useMLRecommendations({
  products,
  categories,
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000 // 5 minutes
}: UseMLRecommendationsOptions) {
  const [state, setState] = useState<MLRecommendationsState>({
    recommendations: [],
    insights: null,
    isGenerating: false,
    lastUpdated: null,
    error: null
  });

  // Get ML engine instance
  const mlEngine = useMemo(() => MLRecommendationEngine.getInstance(), []);

  // Create recommendation context
  const context = useMemo((): RecommendationContext => {
    const currentDate = new Date();
    const month = currentDate.getMonth();
    
    // Determine seasonality
    let seasonality: 'spring' | 'summer' | 'fall' | 'winter';
    if (month >= 2 && month <= 4) seasonality = 'spring';
    else if (month >= 5 && month <= 7) seasonality = 'summer';
    else if (month >= 8 && month <= 10) seasonality = 'fall';
    else seasonality = 'winter';

    return {
      products,
      categories,
      currentDate,
      seasonality,
      // Mock sales data - in real implementation, this would come from actual sales
      salesData: products.map(p => ({
        productId: p.id,
        unitsSold: Math.floor(Math.random() * 100),
        revenue: (p.sale_price || 0) * Math.floor(Math.random() * 100),
        period: 'last_30_days'
      })),
      // Mock user behavior - in real implementation, this would come from analytics
      userBehavior: {
        topViewedProducts: products.slice(0, 5).map(p => p.id),
        topSearchTerms: ['labial', 'base', 'mascara', 'sombra', 'rubor'],
        averageSessionTime: 8.5,
        bounceRate: 0.25
      }
    };
  }, [products, categories]);

  // Generate recommendations
  const generateRecommendations = useCallback(async () => {
    if (products.length === 0) return;

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate recommendations and insights
      const newRecommendations = mlEngine.generateRecommendations(context);
      const newInsights = mlEngine.generateInsights(context);

      // Clear expired recommendations
      mlEngine.clearExpiredRecommendations();

      setState(prev => ({
        ...prev,
        recommendations: newRecommendations,
        insights: newInsights,
        isGenerating: false,
        lastUpdated: new Date(),
        error: null
      }));

      console.log('ML Recommendations generated:', {
        recommendationsCount: newRecommendations.length,
        insightsGenerated: !!newInsights,
        context: {
          productsCount: context.products.length,
          categoriesCount: context.categories.length,
          seasonality: context.seasonality
        }
      });

    } catch (error) {
      console.error('Error generating ML recommendations:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Error generating recommendations'
      }));
    }
  }, [mlEngine, context, products.length]);

  // Mark recommendation as implemented
  const markAsImplemented = useCallback((recommendationId: string) => {
    mlEngine.markRecommendationImplemented(recommendationId);
    setState(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter(r => r.id !== recommendationId)
    }));
  }, [mlEngine]);

  // Get recommendations by priority
  const getRecommendationsByPriority = useCallback((priority: Recommendation['priority']) => {
    return state.recommendations.filter(r => r.priority === priority);
  }, [state.recommendations]);

  // Get recommendations by type
  const getRecommendationsByType = useCallback((type: Recommendation['type']) => {
    return state.recommendations.filter(r => r.type === type);
  }, [state.recommendations]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return mlEngine.getPerformanceMetrics();
  }, [mlEngine]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || products.length === 0) return;

    // Initial generation
    generateRecommendations();

    // Set up interval for auto-refresh
    const interval = setInterval(generateRecommendations, refreshInterval);

    return () => clearInterval(interval);
  }, [generateRecommendations, autoRefresh, refreshInterval, products.length]);

  // Computed values
  const computed = useMemo(() => {
    const { recommendations, insights } = state;
    
    const criticalRecommendations = recommendations.filter(r => r.priority === 'critical');
    const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high');
    const stockRecommendations = recommendations.filter(r => r.type === 'restock');
    const pricingRecommendations = recommendations.filter(r => r.type === 'price_adjustment');
    
    const totalPotentialRevenue = recommendations.reduce((sum, r) => 
      sum + (r.expectedImpact.revenue || 0), 0
    );

    const averageConfidence = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length 
      : 0;

    return {
      totalRecommendations: recommendations.length,
      criticalCount: criticalRecommendations.length,
      highPriorityCount: highPriorityRecommendations.length,
      stockIssuesCount: stockRecommendations.length,
      pricingOpportunitiesCount: pricingRecommendations.length,
      totalPotentialRevenue,
      averageConfidence,
      hasInsights: !!insights,
      hasCriticalIssues: criticalRecommendations.length > 0,
      needsAttention: criticalRecommendations.length + highPriorityRecommendations.length > 0,
      
      // Insights summary
      fastMovingCount: insights?.trends.fastMoving.length || 0,
      slowMovingCount: insights?.trends.slowMoving.length || 0,
      crossSellOpportunities: insights?.opportunities.crossSell.length || 0,
      upsellOpportunities: insights?.opportunities.upsell.length || 0,
      riskCount: (insights?.risks.overstock.length || 0) + 
                 (insights?.risks.understock.length || 0) + 
                 (insights?.risks.priceCompetition.length || 0)
    };
  }, [state]);

  return {
    // State
    ...state,
    
    // Actions
    generateRecommendations,
    markAsImplemented,
    getRecommendationsByPriority,
    getRecommendationsByType,
    getPerformanceMetrics,
    
    // Computed values
    computed,
    
    // Utilities
    isReady: products.length > 0 && !state.isGenerating,
    hasData: state.recommendations.length > 0 || !!state.insights,
    needsRefresh: !state.lastUpdated || 
                  (Date.now() - state.lastUpdated.getTime()) > refreshInterval
  };
}

export type { MLRecommendationsState, UseMLRecommendationsOptions };