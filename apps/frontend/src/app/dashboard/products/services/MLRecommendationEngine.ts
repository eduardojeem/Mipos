'use client';

import type { Product, Category } from '@/types';

interface RecommendationRule {
  id: string;
  name: string;
  type: 'stock' | 'pricing' | 'category' | 'seasonal' | 'cross_sell' | 'upsell';
  weight: number;
  condition: (product: Product, context: RecommendationContext) => boolean;
  action: (product: Product, context: RecommendationContext) => Recommendation;
}

interface RecommendationContext {
  products: Product[];
  categories: Category[];
  salesData?: any[];
  seasonality?: 'spring' | 'summer' | 'fall' | 'winter';
  currentDate: Date;
  userBehavior?: any;
}

interface Recommendation {
  id: string;
  productId: string;
  type: 'restock' | 'price_adjustment' | 'promotion' | 'discontinue' | 'cross_sell' | 'upsell' | 'seasonal_boost';
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  title: string;
  description: string;
  suggestedAction: string;
  expectedImpact: {
    revenue?: number;
    margin?: number;
    turnover?: number;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

interface MLInsights {
  trends: {
    fastMoving: Product[];
    slowMoving: Product[];
    seasonal: Product[];
    declining: Product[];
  };
  opportunities: {
    crossSell: Array<{ product: Product; suggestedWith: Product[]; confidence: number }>;
    upsell: Array<{ product: Product; suggestedUpgrade: Product; confidence: number }>;
    bundling: Array<{ products: Product[]; expectedLift: number }>;
  };
  risks: {
    overstock: Product[];
    understock: Product[];
    priceCompetition: Product[];
  };
}

class MLRecommendationEngine {
  private static instance: MLRecommendationEngine;
  private rules: RecommendationRule[] = [];
  private recommendations: Recommendation[] = [];
  private insights: MLInsights | null = null;

  private constructor() {
    this.initializeRules();
  }

  static getInstance(): MLRecommendationEngine {
    if (!this.instance) {
      this.instance = new MLRecommendationEngine();
    }
    return this.instance;
  }

  private initializeRules(): void {
    this.rules = [
      // Stock Management Rules
      {
        id: 'critical_stock',
        name: 'Critical Stock Alert',
        type: 'stock',
        weight: 1.0,
        condition: (product) => (product.stock_quantity || 0) === 0,
        action: (product) => ({
          id: `restock_${product.id}_${Date.now()}`,
          productId: product.id,
          type: 'restock',
          priority: 'critical',
          confidence: 0.95,
          title: 'Stock Crítico',
          description: `${product.name} está sin stock`,
          suggestedAction: 'Reabastecer inmediatamente',
          expectedImpact: {
            revenue: (product.sale_price || 0) * 10 // Estimate 10 units lost sales
          },
          createdAt: new Date()
        })
      },
      {
        id: 'low_stock_warning',
        name: 'Low Stock Warning',
        type: 'stock',
        weight: 0.8,
        condition: (product) => {
          const stock = product.stock_quantity || 0;
          const minStock = product.min_stock || 5;
          return stock > 0 && stock <= minStock;
        },
        action: (product) => ({
          id: `low_stock_${product.id}_${Date.now()}`,
          productId: product.id,
          type: 'restock',
          priority: 'high',
          confidence: 0.85,
          title: 'Stock Bajo',
          description: `${product.name} tiene solo ${product.stock_quantity} unidades`,
          suggestedAction: `Reabastecer hasta ${(product.min_stock || 5) * 3} unidades`,
          expectedImpact: {
            revenue: (product.sale_price || 0) * (product.min_stock || 5) * 2
          },
          createdAt: new Date()
        })
      },

      // Pricing Rules
      {
        id: 'margin_optimization',
        name: 'Margin Optimization',
        type: 'pricing',
        weight: 0.7,
        condition: (product) => {
          const margin = ((product.sale_price || 0) - (product.cost_price || 0)) / (product.sale_price || 1);
          return margin < 0.3; // Less than 30% margin
        },
        action: (product) => {
          const currentMargin = ((product.sale_price || 0) - (product.cost_price || 0)) / (product.sale_price || 1);
          const suggestedPrice = (product.cost_price || 0) / 0.7; // Target 30% margin
          return {
            id: `price_adjust_${product.id}_${Date.now()}`,
            productId: product.id,
            type: 'price_adjustment',
            priority: 'medium',
            confidence: 0.75,
            title: 'Optimización de Margen',
            description: `${product.name} tiene margen bajo (${(currentMargin * 100).toFixed(1)}%)`,
            suggestedAction: `Ajustar precio a $${suggestedPrice.toLocaleString()}`,
            expectedImpact: {
              margin: suggestedPrice - (product.sale_price || 0)
            },
            metadata: {
              currentPrice: product.sale_price,
              suggestedPrice,
              currentMargin,
              targetMargin: 0.3
            },
            createdAt: new Date()
          };
        }
      },

      // Seasonal Rules
      {
        id: 'seasonal_boost',
        name: 'Seasonal Boost Opportunity',
        type: 'seasonal',
        weight: 0.6,
        condition: (product, context) => {
          const month = context.currentDate.getMonth();
          // Example: Boost makeup products in December (holiday season)
          return Boolean(product.category?.name?.toLowerCase().includes('maquillaje') && month === 11);
        },
        action: (product) => ({
          id: `seasonal_${product.id}_${Date.now()}`,
          productId: product.id,
          type: 'seasonal_boost',
          priority: 'medium',
          confidence: 0.70,
          title: 'Oportunidad Estacional',
          description: `${product.name} puede beneficiarse de promoción navideña`,
          suggestedAction: 'Crear promoción especial para temporada navideña',
          expectedImpact: {
            revenue: (product.sale_price || 0) * 5 // Estimate 5 additional units
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        })
      }
    ];
  }

  // Generate recommendations for all products
  generateRecommendations(context: RecommendationContext): Recommendation[] {
    const newRecommendations: Recommendation[] = [];

    context.products.forEach(product => {
      this.rules.forEach(rule => {
        if (rule.condition(product, context)) {
          const recommendation = rule.action(product, context);
          recommendation.confidence *= rule.weight;
          newRecommendations.push(recommendation);
        }
      });
    });

    // Sort by priority and confidence
    newRecommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    // Update stored recommendations
    this.recommendations = newRecommendations;
    return newRecommendations;
  }

  // Generate ML insights
  generateInsights(context: RecommendationContext): MLInsights {
    const { products } = context;
    
    // Simulate ML analysis (in real implementation, this would use actual ML models)
    const insights: MLInsights = {
      trends: {
        fastMoving: this.identifyFastMoving(products),
        slowMoving: this.identifySlowMoving(products),
        seasonal: this.identifySeasonalProducts(products, context),
        declining: this.identifyDecliningProducts(products)
      },
      opportunities: {
        crossSell: this.identifyCrossSellOpportunities(products),
        upsell: this.identifyUpsellOpportunities(products),
        bundling: this.identifyBundlingOpportunities(products)
      },
      risks: {
        overstock: this.identifyOverstockRisks(products),
        understock: this.identifyUnderstockRisks(products),
        priceCompetition: this.identifyPriceCompetitionRisks(products)
      }
    };

    this.insights = insights;
    return insights;
  }

  // ML Analysis Methods (simplified implementations)
  private identifyFastMoving(products: Product[]): Product[] {
    // Simulate: Products with high turnover ratio
    return products
      .filter(p => (p.stock_quantity || 0) > 0)
      .sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0))
      .slice(0, 3);
  }

  private identifySlowMoving(products: Product[]): Product[] {
    // Simulate: Products with high stock relative to sales
    return products
      .filter(p => (p.stock_quantity || 0) > (p.min_stock || 5) * 3)
      .slice(0, 3);
  }

  private identifySeasonalProducts(products: Product[], context: RecommendationContext): Product[] {
    // Simulate: Products that vary by season
    const month = context.currentDate.getMonth();
    if (month >= 10 || month <= 1) { // Winter season
      return products.filter(p => p.category?.name?.toLowerCase().includes('maquillaje'));
    }
    return [];
  }

  private identifyDecliningProducts(products: Product[]): Product[] {
    // Simulate: Products with declining trend
    return products
      .filter(p => (p.stock_quantity || 0) > 0 && (p.discount_percentage || 0) > 0)
      .slice(0, 2);
  }

  private identifyCrossSellOpportunities(products: Product[]): Array<{ product: Product; suggestedWith: Product[]; confidence: number }> {
    // Simulate: Products often bought together
    const opportunities: Array<{ product: Product; suggestedWith: Product[]; confidence: number }> = [];
    
    products.forEach(product => {
      if (product.category?.name?.toLowerCase().includes('maquillaje')) {
        const relatedProducts = products.filter(p => 
          p.id !== product.id && 
          p.category?.name?.toLowerCase().includes('maquillaje')
        ).slice(0, 2);
        
        if (relatedProducts.length > 0) {
          opportunities.push({
            product,
            suggestedWith: relatedProducts,
            confidence: 0.65
          });
        }
      }
    });

    return opportunities.slice(0, 3);
  }

  private identifyUpsellOpportunities(products: Product[]): Array<{ product: Product; suggestedUpgrade: Product; confidence: number }> {
    // Simulate: Lower-priced products with higher-priced alternatives
    const opportunities: Array<{ product: Product; suggestedUpgrade: Product; confidence: number }> = [];
    
    products.forEach(product => {
      const higherPricedAlternatives = products.filter(p => 
        p.id !== product.id &&
        p.category_id === product.category_id &&
        (p.sale_price || 0) > (product.sale_price || 0) * 1.5
      );

      if (higherPricedAlternatives.length > 0) {
        opportunities.push({
          product,
          suggestedUpgrade: higherPricedAlternatives[0],
          confidence: 0.55
        });
      }
    });

    return opportunities.slice(0, 2);
  }

  private identifyBundlingOpportunities(products: Product[]): Array<{ products: Product[]; expectedLift: number }> {
    // Simulate: Products that could be bundled together
    const bundles: Array<{ products: Product[]; expectedLift: number }> = [];
    
    const makeupProducts = products.filter(p => 
      p.category?.name?.toLowerCase().includes('maquillaje')
    );

    if (makeupProducts.length >= 2) {
      bundles.push({
        products: makeupProducts.slice(0, 2),
        expectedLift: 0.15 // 15% increase in sales
      });
    }

    return bundles;
  }

  private identifyOverstockRisks(products: Product[]): Product[] {
    return products.filter(p => 
      (p.stock_quantity || 0) > (p.min_stock || 5) * 5
    ).slice(0, 3);
  }

  private identifyUnderstockRisks(products: Product[]): Product[] {
    return products.filter(p => 
      (p.stock_quantity || 0) <= (p.min_stock || 5)
    ).slice(0, 3);
  }

  private identifyPriceCompetitionRisks(products: Product[]): Product[] {
    // Simulate: Products with low margins that might face price pressure
    return products.filter(p => {
      const margin = ((p.sale_price || 0) - (p.cost_price || 0)) / (p.sale_price || 1);
      return margin < 0.25;
    }).slice(0, 2);
  }

  // Get current recommendations
  getRecommendations(): Recommendation[] {
    return [...this.recommendations];
  }

  // Get current insights
  getInsights(): MLInsights | null {
    return this.insights;
  }

  // Mark recommendation as implemented
  markRecommendationImplemented(recommendationId: string): void {
    this.recommendations = this.recommendations.filter(r => r.id !== recommendationId);
  }

  // Get recommendations by priority
  getRecommendationsByPriority(priority: Recommendation['priority']): Recommendation[] {
    return this.recommendations.filter(r => r.priority === priority);
  }

  // Get recommendations by type
  getRecommendationsByType(type: Recommendation['type']): Recommendation[] {
    return this.recommendations.filter(r => r.type === type);
  }

  // Clear expired recommendations
  clearExpiredRecommendations(): void {
    const now = new Date();
    this.recommendations = this.recommendations.filter(r => 
      !r.expiresAt || r.expiresAt > now
    );
  }

  // Add custom rule
  addCustomRule(rule: RecommendationRule): void {
    this.rules.push(rule);
  }

  // Remove rule
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  // Get performance metrics
  getPerformanceMetrics(): {
    totalRecommendations: number;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    averageConfidence: number;
  } {
    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    this.recommendations.forEach(r => {
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
      totalConfidence += r.confidence;
    });

    return {
      totalRecommendations: this.recommendations.length,
      byPriority,
      byType,
      averageConfidence: this.recommendations.length > 0 ? totalConfidence / this.recommendations.length : 0
    };
  }
}

export default MLRecommendationEngine;
export type { Recommendation, MLInsights, RecommendationContext };