// Hook para calcular métricas reales de inventario desde Supabase
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { isSupabaseActive } from '@/lib/env';
import type { Product } from '@/types';

interface InventoryMetrics {
  inventoryTurnover: number;
  fastMovingProducts: number;
  slowMovingProducts: number;
  fastMovingList: Array<{ productId: string; salesCount: number; productName: string }>;
  slowMovingList: Array<{ productId: string; salesCount: number; productName: string }>;
  averageDaysToSell: number;
  totalSalesLast90Days: number;
}

interface UseInventoryMetricsOptions {
  products: Product[];
  enabled?: boolean;
  periodDays?: number; // Período de análisis (default: 90 días)
}

export function useInventoryMetrics({ 
  products, 
  enabled = true,
  periodDays = 90 
}: UseInventoryMetricsOptions) {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  const calculateMetrics = useCallback(async () => {
    if (!enabled || products.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseActive()) {
        setHasData(false);
        setMetrics(null);
        return;
      }
      const supabase = createClient();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // 1. Obtener ventas del período
      const { data: salesData, error: salesError } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          sale:sales!inner(
            date,
            created_at
          )
        `)
        .gte('sale.created_at', periodStart.toISOString());

      if (salesError) {
        const info = (salesError as any);
        const details = {
          message: info?.message,
          code: info?.code,
          hint: info?.hint,
          details: info?.details
        };
        console.error('Error fetching sales:', details);
        setHasData(false);
        setMetrics(null);
        setLoading(false);
        return;
      }

      // Si no hay datos de ventas, marcar como sin datos
      if (!salesData || salesData.length === 0) {
        setHasData(false);
        setMetrics(null);
        setLoading(false);
        return;
      }

      setHasData(true);

      // 2. Calcular ventas por producto
      const salesByProduct = new Map<string, { count: number; quantity: number; revenue: number }>();
      
      salesData.forEach((item: any) => {
        const existing = salesByProduct.get(item.product_id) || { count: 0, quantity: 0, revenue: 0 };
        salesByProduct.set(item.product_id, {
          count: existing.count + 1,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.quantity * item.unit_price)
        });
      });

      // 3. Calcular rotación de inventario
      // Fórmula: Costo de Ventas / Inventario Promedio
      let totalCostOfGoodsSold = 0;
      let totalInventoryValue = 0;

      products.forEach(product => {
        const sales = salesByProduct.get(product.id);
        if (sales) {
          // Costo de lo vendido = cantidad vendida * costo unitario
          totalCostOfGoodsSold += sales.quantity * (product.cost_price || 0);
        }
        // Valor del inventario actual
        totalInventoryValue += (product.stock_quantity || 0) * (product.cost_price || 0);
      });

      const inventoryTurnover = totalInventoryValue > 0 
        ? (totalCostOfGoodsSold / totalInventoryValue) * (365 / periodDays) // Anualizado
        : 0;

      // 4. Identificar productos de rotación rápida y lenta
      const productsWithSales = products.map(product => {
        const sales = salesByProduct.get(product.id);
        return {
          productId: product.id,
          productName: product.name,
          salesCount: sales?.quantity || 0,
          revenue: sales?.revenue || 0,
          stock: product.stock_quantity || 0
        };
      });

      // Ordenar por cantidad vendida
      const sortedBySales = [...productsWithSales].sort((a, b) => b.salesCount - a.salesCount);

      // Top 20% = rotación rápida
      const fastMovingCount = Math.max(1, Math.ceil(products.length * 0.2));
      const fastMovingList = sortedBySales
        .slice(0, fastMovingCount)
        .filter(p => p.salesCount > 0); // Solo productos con ventas

      // Bottom 30% con stock = rotación lenta
      const slowMovingCount = Math.max(1, Math.ceil(products.length * 0.3));
      const slowMovingList = sortedBySales
        .slice(-slowMovingCount)
        .filter(p => p.stock > 0); // Solo productos con stock

      // 5. Calcular días promedio para vender
      const totalSalesCount = Array.from(salesByProduct.values())
        .reduce((sum, s) => sum + s.quantity, 0);
      
      const averageDaysToSell = totalSalesCount > 0
        ? (totalInventoryValue / totalCostOfGoodsSold) * periodDays
        : 0;

      setMetrics({
        inventoryTurnover: Math.round(inventoryTurnover * 10) / 10, // 1 decimal
        fastMovingProducts: fastMovingList.length,
        slowMovingProducts: slowMovingList.length,
        fastMovingList: fastMovingList.map(p => ({
          productId: p.productId,
          salesCount: p.salesCount,
          productName: p.productName
        })),
        slowMovingList: slowMovingList.map(p => ({
          productId: p.productId,
          salesCount: p.salesCount,
          productName: p.productName
        })),
        averageDaysToSell: Math.round(averageDaysToSell),
        totalSalesLast90Days: totalSalesCount
      });

    } catch (err) {
      console.error('Error calculating inventory metrics:', err);
      setError(err instanceof Error ? err.message : 'Error al calcular métricas');
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, [products, enabled, periodDays]);

  useEffect(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  return {
    metrics,
    loading,
    error,
    hasData,
    refetch: calculateMetrics
  };
}
