'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

// Mock data for demonstration
const mockTrendsData = [
  { product: 'Base Líquida Premium', trend: 'down', change: -15, daysLeft: 3 },
  { product: 'Máscara de Pestañas', trend: 'down', change: -8, daysLeft: 7 },
  { product: 'Labial Mate', trend: 'stable', change: 0, daysLeft: 12 },
  { product: 'Corrector Facial', trend: 'up', change: 5, daysLeft: 18 },
  { product: 'Polvo Compacto', trend: 'down', change: -12, daysLeft: 5 },
];

export function StockTrendsChart() {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
          <div className="text-lg font-bold text-red-600">3</div>
          <div className="text-xs text-red-600">Críticos</div>
        </div>
        <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
          <div className="text-lg font-bold text-orange-600">2</div>
          <div className="text-xs text-orange-600">Bajos</div>
        </div>
        <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
          <div className="text-lg font-bold text-yellow-600">1</div>
          <div className="text-xs text-yellow-600">Advertencia</div>
        </div>
      </div>

      {/* Trends List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Productos con Mayor Riesgo
        </h4>
        {mockTrendsData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <div className="flex items-center gap-2">
              {getTrendIcon(item.trend)}
              <div>
                <div className="text-sm font-medium truncate max-w-[120px]">
                  {item.product}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.daysLeft}d restantes
                </div>
              </div>
            </div>
            <div className={`text-sm font-medium ${getTrendColor(item.trend)}`}>
              {item.change > 0 ? '+' : ''}{item.change}%
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t">
        <div className="text-xs text-muted-foreground mb-2">Acciones Rápidas</div>
        <div className="space-y-1">
          <button className="w-full text-left text-xs p-2 hover:bg-muted/50 rounded">
            📊 Ver reporte completo
          </button>
          <button className="w-full text-left text-xs p-2 hover:bg-muted/50 rounded">
            🛒 Crear orden masiva
          </button>
          <button className="w-full text-left text-xs p-2 hover:bg-muted/50 rounded">
            ⚙️ Ajustar umbrales
          </button>
        </div>
      </div>
    </div>
  );
}