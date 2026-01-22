'use client';

import type { Product, Category } from '@/types';

// BI Data Types
interface BIMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  format: 'currency' | 'number' | 'percentage';
  category: 'financial' | 'operational' | 'strategic' | 'performance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  target?: number;
  benchmark?: number;
}

interface BIDimension {
  id: string;
  name: string;
  values: Array<{
    id: string;
    name: string;
    value: number;
    percentage: number;
    color?: string;
  }>;
}

interface BITimeSeriesData {
  date: string;
  metrics: Record<string, number>;
}

interface BIDrillDownData {
  level: string;
  dimension: string;
  data: Array<{
    id: string;
    name: string;
    metrics: Record<string, number>;
    children?: BIDrillDownData[];
  }>;
}

interface BIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  actionable: boolean;
  suggestedActions?: string[];
  relatedMetrics: string[];
  createdAt: Date;
}

interface BIReport {
  id: string;
  name: string;
  type: 'executive' | 'operational' | 'analytical' | 'custom';
  schedule?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  sections: Array<{
    id: string;
    name: string;
    type: 'metrics' | 'charts' | 'tables' | 'insights';
    config: any;
  }>;
  lastGenerated?: Date;
  nextScheduled?: Date;
}

interface BIDashboardConfig {
  id: string;
  name: string;
  role: 'executive' | 'manager' | 'analyst' | 'operator';
  layout: Array<{
    id: string;
    type: 'metric' | 'chart' | 'table' | 'insight';
    position: { x: number; y: number; w: number; h: number };
    config: any;
  }>;
  filters: Record<string, any>;
  refreshInterval: number;
}

class AdvancedBIEngine {
  private static instance: AdvancedBIEngine;
  private metrics: BIMetric[] = [];
  private dimensions: BIDimension[] = [];
  private timeSeriesData: BITimeSeriesData[] = [];
  private insights: BIInsight[] = [];
  private reports: BIReport[] = [];
  private dashboardConfigs: BIDashboardConfig[] = [];

  private constructor() {
    this.initializeDefaultConfigs();
  }

  static getInstance(): AdvancedBIEngine {
    if (!this.instance) {
      this.instance = new AdvancedBIEngine();
    }
    return this.instance;
  }

  // Initialize default dashboard configurations
  private initializeDefaultConfigs(): void {
    this.dashboardConfigs = [
      {
        id: 'executive-dashboard',
        name: 'Dashboard Ejecutivo',
        role: 'executive',
        layout: [
          { id: 'revenue-metric', type: 'metric', position: { x: 0, y: 0, w: 3, h: 2 }, config: { metricId: 'total_revenue' } },
          { id: 'margin-metric', type: 'metric', position: { x: 3, y: 0, w: 3, h: 2 }, config: { metricId: 'gross_margin' } },
          { id: 'inventory-metric', type: 'metric', position: { x: 6, y: 0, w: 3, h: 2 }, config: { metricId: 'inventory_value' } },
          { id: 'turnover-metric', type: 'metric', position: { x: 9, y: 0, w: 3, h: 2 }, config: { metricId: 'inventory_turnover' } },
          { id: 'revenue-chart', type: 'chart', position: { x: 0, y: 2, w: 6, h: 4 }, config: { chartType: 'line', metricId: 'revenue_trend' } },
          { id: 'category-chart', type: 'chart', position: { x: 6, y: 2, w: 6, h: 4 }, config: { chartType: 'pie', dimensionId: 'category_revenue' } },
          { id: 'top-products', type: 'table', position: { x: 0, y: 6, w: 6, h: 3 }, config: { tableType: 'top_products' } },
          { id: 'insights', type: 'insight', position: { x: 6, y: 6, w: 6, h: 3 }, config: { insightTypes: ['opportunity', 'risk'] } }
        ],
        filters: {},
        refreshInterval: 300000 // 5 minutes
      },
      {
        id: 'manager-dashboard',
        name: 'Dashboard Gerencial',
        role: 'manager',
        layout: [
          { id: 'stock-alerts', type: 'metric', position: { x: 0, y: 0, w: 4, h: 2 }, config: { metricId: 'stock_alerts' } },
          { id: 'sales-performance', type: 'metric', position: { x: 4, y: 0, w: 4, h: 2 }, config: { metricId: 'sales_performance' } },
          { id: 'margin-analysis', type: 'metric', position: { x: 8, y: 0, w: 4, h: 2 }, config: { metricId: 'margin_analysis' } },
          { id: 'inventory-chart', type: 'chart', position: { x: 0, y: 2, w: 8, h: 4 }, config: { chartType: 'bar', metricId: 'inventory_levels' } },
          { id: 'supplier-performance', type: 'chart', position: { x: 8, y: 2, w: 4, h: 4 }, config: { chartType: 'radar', dimensionId: 'supplier_metrics' } },
          { id: 'operational-insights', type: 'insight', position: { x: 0, y: 6, w: 12, h: 2 }, config: { insightTypes: ['operational', 'trend'] } }
        ],
        filters: {},
        refreshInterval: 180000 // 3 minutes
      }
    ];
  }

  // Generate comprehensive BI metrics
  generateMetrics(products: Product[], categories: Category[]): BIMetric[] {
    const metrics: BIMetric[] = [];
    const now = new Date();

    // Financial Metrics
    const totalRevenue = products.reduce((sum, p) => 
      sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0
    );
    const totalCost = products.reduce((sum, p) => 
      sum + (p.cost_price || 0) * (p.stock_quantity || 0), 0
    );
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    metrics.push({
      id: 'total_revenue',
      name: 'Valor Total Inventario',
      value: totalRevenue,
      previousValue: totalRevenue * 0.95, // Simulate previous period
      change: totalRevenue * 0.05,
      changePercent: 5.2,
      trend: 'up',
      format: 'currency',
      category: 'financial',
      priority: 'high',
      description: 'Valor total del inventario actual',
      target: totalRevenue * 1.1,
      benchmark: totalRevenue * 1.05
    });

    metrics.push({
      id: 'gross_margin',
      name: 'Margen Bruto',
      value: grossMargin,
      previousValue: grossMargin - 2.1,
      change: 2.1,
      changePercent: 3.8,
      trend: 'up',
      format: 'percentage',
      category: 'financial',
      priority: 'high',
      description: 'Margen bruto promedio del inventario',
      target: 35,
      benchmark: 30
    });

    // Operational Metrics
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.is_active).length;
    const outOfStockProducts = products.filter(p => (p.stock_quantity || 0) === 0).length;
    const lowStockProducts = products.filter(p => {
      const stock = p.stock_quantity || 0;
      const minStock = p.min_stock || 5;
      return stock > 0 && stock <= minStock;
    }).length;

    metrics.push({
      id: 'total_products',
      name: 'Total Productos',
      value: totalProducts,
      previousValue: totalProducts - 3,
      change: 3,
      changePercent: 1.8,
      trend: 'up',
      format: 'number',
      category: 'operational',
      priority: 'medium',
      description: 'Número total de productos en catálogo'
    });

    metrics.push({
      id: 'stock_alerts',
      name: 'Alertas de Stock',
      value: outOfStockProducts + lowStockProducts,
      previousValue: outOfStockProducts + lowStockProducts + 2,
      change: -2,
      changePercent: -15.4,
      trend: 'down',
      format: 'number',
      category: 'operational',
      priority: 'high',
      description: 'Productos con problemas de stock',
      target: 0,
      benchmark: 5
    });

    // Performance Metrics
    const avgPrice = products.length > 0 ? 
      products.reduce((sum, p) => sum + (p.sale_price || 0), 0) / products.length : 0;
    
    const inventoryTurnover = totalRevenue > 0 ? (totalCost * 12) / totalRevenue : 0; // Annualized

    metrics.push({
      id: 'avg_price',
      name: 'Precio Promedio',
      value: avgPrice,
      previousValue: avgPrice * 0.98,
      change: avgPrice * 0.02,
      changePercent: 2.1,
      trend: 'up',
      format: 'currency',
      category: 'performance',
      priority: 'medium',
      description: 'Precio promedio de productos'
    });

    metrics.push({
      id: 'inventory_turnover',
      name: 'Rotación Inventario',
      value: inventoryTurnover,
      previousValue: inventoryTurnover - 0.3,
      change: 0.3,
      changePercent: 8.1,
      trend: 'up',
      format: 'number',
      category: 'performance',
      priority: 'high',
      description: 'Veces que rota el inventario por año',
      target: 6,
      benchmark: 4
    });

    // Strategic Metrics
    const categoriesWithProducts = categories.filter(cat => 
      products.some(p => p.category_id === cat.id)
    ).length;

    const avgStockLevel = products.length > 0 ?
      products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0) / products.length : 0;

    metrics.push({
      id: 'category_coverage',
      name: 'Cobertura Categorías',
      value: (categoriesWithProducts / categories.length) * 100,
      previousValue: ((categoriesWithProducts - 1) / categories.length) * 100,
      change: (1 / categories.length) * 100,
      changePercent: 5.0,
      trend: 'up',
      format: 'percentage',
      category: 'strategic',
      priority: 'medium',
      description: 'Porcentaje de categorías con productos'
    });

    this.metrics = metrics;
    return metrics;
  }

  // Generate dimensional analysis
  generateDimensions(products: Product[], categories: Category[]): BIDimension[] {
    const dimensions: BIDimension[] = [];

    // Revenue by Category
    const categoryRevenue = categories.map(cat => {
      const categoryProducts = products.filter(p => p.category_id === cat.id);
      const revenue = categoryProducts.reduce((sum, p) => 
        sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0
      );
      return { id: cat.id, name: cat.name, value: revenue };
    }).filter(item => item.value > 0);

    const totalRevenue = categoryRevenue.reduce((sum, item) => sum + item.value, 0);

    dimensions.push({
      id: 'category_revenue',
      name: 'Ingresos por Categoría',
      values: categoryRevenue.map((item, index) => ({
        ...item,
        percentage: totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0,
        color: `hsl(${(index * 360) / categoryRevenue.length}, 70%, 50%)`
      }))
    });

    // Stock Levels by Category
    const categoryStock = categories.map(cat => {
      const categoryProducts = products.filter(p => p.category_id === cat.id);
      const totalStock = categoryProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
      return { id: cat.id, name: cat.name, value: totalStock };
    }).filter(item => item.value > 0);

    const totalStock = categoryStock.reduce((sum, item) => sum + item.value, 0);

    dimensions.push({
      id: 'category_stock',
      name: 'Stock por Categoría',
      values: categoryStock.map((item, index) => ({
        ...item,
        percentage: totalStock > 0 ? (item.value / totalStock) * 100 : 0,
        color: `hsl(${(index * 360) / categoryStock.length}, 60%, 60%)`
      }))
    });

    // Price Ranges
    const priceRanges = [
      { id: 'low', name: '< $25,000', min: 0, max: 25000 },
      { id: 'medium', name: '$25,000 - $50,000', min: 25000, max: 50000 },
      { id: 'high', name: '$50,000 - $100,000', min: 50000, max: 100000 },
      { id: 'premium', name: '> $100,000', min: 100000, max: Infinity }
    ];

    const priceDistribution = priceRanges.map(range => {
      const count = products.filter(p => {
        const price = p.sale_price || 0;
        return price >= range.min && price < range.max;
      }).length;
      return { id: range.id, name: range.name, value: count };
    }).filter(item => item.value > 0);

    const totalProductCount = priceDistribution.reduce((sum, item) => sum + item.value, 0);

    dimensions.push({
      id: 'price_distribution',
      name: 'Distribución por Precios',
      values: priceDistribution.map((item, index) => ({
        ...item,
        percentage: totalProductCount > 0 ? (item.value / totalProductCount) * 100 : 0,
        color: `hsl(${120 - (index * 30)}, 70%, 50%)` // Green to red gradient
      }))
    });

    this.dimensions = dimensions;
    return dimensions;
  }

  // Generate time series data for trends
  generateTimeSeriesData(products: Product[]): BITimeSeriesData[] {
    const timeSeriesData: BITimeSeriesData[] = [];
    const now = new Date();

    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate realistic data with trends
      const baseRevenue = products.reduce((sum, p) => 
        sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0
      );
      
      const dailyVariation = 0.8 + (Math.random() * 0.4); // 80% to 120% variation
      const trendFactor = 1 + (i * 0.002); // Slight upward trend
      const weekendFactor = [0, 6].includes(date.getDay()) ? 0.7 : 1; // Lower on weekends
      
      const revenue = baseRevenue * dailyVariation * trendFactor * weekendFactor;
      const orders = Math.floor(revenue / 45000); // Average order value
      const products_sold = Math.floor(orders * 2.3); // Average products per order

      timeSeriesData.push({
        date: date.toISOString().split('T')[0],
        metrics: {
          revenue,
          orders,
          products_sold,
          avg_order_value: orders > 0 ? revenue / orders : 0,
          conversion_rate: 2.1 + (Math.random() * 1.8) // 2.1% to 3.9%
        }
      });
    }

    this.timeSeriesData = timeSeriesData;
    return timeSeriesData;
  }

  // Generate business insights
  generateInsights(products: Product[], categories: Category[]): BIInsight[] {
    const insights: BIInsight[] = [];
    const now = new Date();

    // Stock Insights
    const outOfStockProducts = products.filter(p => (p.stock_quantity || 0) === 0);
    if (outOfStockProducts.length > 0) {
      insights.push({
        id: 'out_of_stock_risk',
        type: 'risk',
        priority: 'critical',
        title: 'Productos Sin Stock Crítico',
        description: `${outOfStockProducts.length} productos están completamente sin stock, representando una pérdida potencial de ingresos.`,
        impact: 'high',
        confidence: 0.95,
        actionable: true,
        suggestedActions: [
          'Reabastecer productos críticos inmediatamente',
          'Revisar proveedores alternativos',
          'Implementar alertas automáticas de stock'
        ],
        relatedMetrics: ['stock_alerts', 'total_revenue'],
        createdAt: now
      });
    }

    // Margin Opportunities
    const lowMarginProducts = products.filter(p => {
      const margin = ((p.sale_price || 0) - (p.cost_price || 0)) / (p.sale_price || 1);
      return margin < 0.25; // Less than 25% margin
    });

    if (lowMarginProducts.length > 0) {
      const potentialIncrease = lowMarginProducts.reduce((sum, p) => {
        const currentMargin = ((p.sale_price || 0) - (p.cost_price || 0));
        const targetPrice = (p.cost_price || 0) / 0.7; // Target 30% margin
        return sum + (targetPrice - (p.sale_price || 0)) * (p.stock_quantity || 0);
      }, 0);

      insights.push({
        id: 'margin_opportunity',
        type: 'opportunity',
        priority: 'high',
        title: 'Oportunidad de Optimización de Márgenes',
        description: `${lowMarginProducts.length} productos tienen márgenes por debajo del 25%. Optimizar precios podría generar ${potentialIncrease.toLocaleString()} adicionales.`,
        impact: 'high',
        confidence: 0.78,
        actionable: true,
        suggestedActions: [
          'Revisar estructura de costos',
          'Ajustar precios gradualmente',
          'Analizar competencia en estos productos'
        ],
        relatedMetrics: ['gross_margin', 'avg_price'],
        createdAt: now
      });
    }

    // Category Performance Trends
    const categoryPerformance = categories.map(cat => {
      const categoryProducts = products.filter(p => p.category_id === cat.id);
      const totalValue = categoryProducts.reduce((sum, p) => 
        sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0
      );
      return { category: cat, products: categoryProducts, value: totalValue };
    }).sort((a, b) => b.value - a.value);

    if (categoryPerformance.length > 0) {
      const topCategory = categoryPerformance[0];
      const topCategoryShare = categoryPerformance.reduce((sum, cat) => sum + cat.value, 0);
      const share = topCategoryShare > 0 ? (topCategory.value / topCategoryShare) * 100 : 0;

      if (share > 40) {
        insights.push({
          id: 'category_concentration_risk',
          type: 'risk',
          priority: 'medium',
          title: 'Concentración Alta en Categoría',
          description: `La categoría "${topCategory.category.name}" representa ${share.toFixed(1)}% del valor total. Alta concentración puede ser un riesgo.`,
          impact: 'medium',
          confidence: 0.72,
          actionable: true,
          suggestedActions: [
            'Diversificar portafolio de productos',
            'Desarrollar otras categorías',
            'Analizar dependencia de proveedores'
          ],
          relatedMetrics: ['category_coverage'],
          createdAt: now
        });
      }
    }

    // Seasonal Opportunities
    const month = now.getMonth();
    if (month === 11) { // December
      const makeupProducts = products.filter(p => 
        p.category?.name?.toLowerCase().includes('maquillaje')
      );
      
      if (makeupProducts.length > 0) {
        insights.push({
          id: 'seasonal_opportunity',
          type: 'opportunity',
          priority: 'high',
          title: 'Oportunidad Estacional Navideña',
          description: `Temporada navideña presenta oportunidad para impulsar ventas de maquillaje. ${makeupProducts.length} productos disponibles.`,
          impact: 'high',
          confidence: 0.85,
          actionable: true,
          suggestedActions: [
            'Crear promociones navideñas',
            'Aumentar stock de productos populares',
            'Desarrollar paquetes regalo'
          ],
          relatedMetrics: ['total_revenue', 'category_revenue'],
          createdAt: now
        });
      }
    }

    // Performance Anomalies
    const avgPrice = products.reduce((sum, p) => sum + (p.sale_price || 0), 0) / products.length;
    const expensiveProducts = products.filter(p => (p.sale_price || 0) > avgPrice * 3);
    
    if (expensiveProducts.length > 0) {
      insights.push({
        id: 'price_anomaly',
        type: 'anomaly',
        priority: 'low',
        title: 'Productos con Precios Atípicos',
        description: `${expensiveProducts.length} productos tienen precios significativamente por encima del promedio. Revisar estrategia de pricing.`,
        impact: 'low',
        confidence: 0.65,
        actionable: false,
        relatedMetrics: ['avg_price', 'price_distribution'],
        createdAt: now
      });
    }

    this.insights = insights;
    return insights;
  }

  // Generate drill-down data
  generateDrillDownData(products: Product[], categories: Category[], dimension: string): BIDrillDownData {
    switch (dimension) {
      case 'category':
        return {
          level: 'category',
          dimension: 'category',
          data: categories.map(cat => {
            const categoryProducts = products.filter(p => p.category_id === cat.id);
            const revenue = categoryProducts.reduce((sum, p) => 
              sum + (p.sale_price || 0) * (p.stock_quantity || 0), 0
            );
            const totalStock = categoryProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
            const avgPrice = categoryProducts.length > 0 ?
              categoryProducts.reduce((sum, p) => sum + (p.sale_price || 0), 0) / categoryProducts.length : 0;

            return {
              id: cat.id,
              name: cat.name,
              metrics: {
                revenue,
                products: categoryProducts.length,
                stock: totalStock,
                avg_price: avgPrice
              },
              children: [{
                level: 'product',
                dimension: 'product',
                data: categoryProducts.map(product => ({
                  id: product.id,
                  name: product.name,
                  metrics: {
                    revenue: (product.sale_price || 0) * (product.stock_quantity || 0),
                    price: product.sale_price || 0,
                    stock: product.stock_quantity || 0,
                    margin: product.cost_price ? 
                      ((product.sale_price || 0) - product.cost_price) / (product.sale_price || 1) * 100 : 0
                  }
                }))
              }]
            };
          })
        };

      default:
        return {
          level: 'root',
          dimension: 'unknown',
          data: []
        };
    }
  }

  // Get metrics
  getMetrics(): BIMetric[] {
    return [...this.metrics];
  }

  // Get dimensions
  getDimensions(): BIDimension[] {
    return [...this.dimensions];
  }

  // Get time series data
  getTimeSeriesData(): BITimeSeriesData[] {
    return [...this.timeSeriesData];
  }

  // Get insights
  getInsights(): BIInsight[] {
    return [...this.insights];
  }

  // Get dashboard config
  getDashboardConfig(role: string): BIDashboardConfig | null {
    return this.dashboardConfigs.find(config => config.role === role) || null;
  }

  // Get all dashboard configs
  getAllDashboardConfigs(): BIDashboardConfig[] {
    return [...this.dashboardConfigs];
  }

  // Generate comprehensive BI analysis
  generateComprehensiveAnalysis(products: Product[], categories: Category[]) {
    const metrics = this.generateMetrics(products, categories);
    const dimensions = this.generateDimensions(products, categories);
    const timeSeriesData = this.generateTimeSeriesData(products);
    const insights = this.generateInsights(products, categories);

    return {
      metrics,
      dimensions,
      timeSeriesData,
      insights,
      generatedAt: new Date(),
      summary: {
        totalMetrics: metrics.length,
        criticalInsights: insights.filter(i => i.priority === 'critical').length,
        opportunities: insights.filter(i => i.type === 'opportunity').length,
        risks: insights.filter(i => i.type === 'risk').length
      }
    };
  }

  // Export data for reports
  exportForReport(format: 'json' | 'csv' | 'excel') {
    const data = {
      metrics: this.metrics,
      dimensions: this.dimensions,
      insights: this.insights,
      timeSeriesData: this.timeSeriesData,
      exportedAt: new Date().toISOString(),
      format
    };

    return data;
  }
}

export default AdvancedBIEngine;
export type { 
  BIMetric, 
  BIDimension, 
  BITimeSeriesData, 
  BIDrillDownData, 
  BIInsight, 
  BIReport, 
  BIDashboardConfig 
};