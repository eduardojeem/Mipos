'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  minStock: number;
  alertLevel: 'critical' | 'warning' | 'low';
  category: {
    name: string;
  };
}

interface StockAlertsResponse {
  products: LowStockProduct[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    low: number;
  };
}

export default function StockAlertBanner() {
  const [alerts, setAlerts] = useState<LowStockProduct[]>([]);
  const [summary, setSummary] = useState<StockAlertsResponse['summary'] | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchStockAlerts = async () => {
    try {
      const response = await api.get<StockAlertsResponse>('/stock-alerts/low-stock');
      const { products, summary } = response.data;
      
      setAlerts(products);
      setSummary(summary);
      
      // Show banner if there are critical or warning alerts and not dismissed
      setShowBanner((summary.critical > 0 || summary.warning > 0) && !dismissed);
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
    }
  };

  const dismissBanner = () => {
    setDismissed(true);
    setShowBanner(false);
  };

  const getBannerVariant = () => {
    if (!summary) return 'default';
    if (summary.critical > 0) return 'destructive';
    if (summary.warning > 0) return 'warning';
    return 'default';
  };

  const getBannerMessage = () => {
    if (!summary) return '';
    
    if (summary.critical > 0) {
      return `¡${summary.critical} producto${summary.critical > 1 ? 's' : ''} sin stock!`;
    }
    
    if (summary.warning > 0) {
      return `${summary.warning} producto${summary.warning > 1 ? 's' : ''} con stock bajo`;
    }
    
    return '';
  };

  const getAlertBadgeVariant = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  useEffect(() => {
    fetchStockAlerts();
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchStockAlerts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [dismissed]);

  if (!showBanner || !summary) {
    return null;
  }

  return (
    <>
      <Card className={`mb-4 border-l-4 ${
        summary.critical > 0 
          ? 'border-l-red-500 bg-red-50' 
          : 'border-l-yellow-500 bg-yellow-50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`h-5 w-5 ${
                summary.critical > 0 ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <div>
                <p className="font-medium text-sm">
                  {getBannerMessage()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.total} producto{summary.total > 1 ? 's' : ''} requiere{summary.total === 1 ? '' : 'n'} atención
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver detalles
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissBanner}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Alertas de Stock</span>
            </DialogTitle>
            <DialogDescription>
              Productos que requieren reposición de inventario
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
                <div className="text-xs text-red-600">Críticos</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{summary.warning}</div>
                <div className="text-xs text-yellow-600">Advertencias</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.low}</div>
                <div className="text-xs text-blue-600">Bajos</div>
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-3">
              {alerts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{product.name}</span>
                        <Badge variant={getAlertBadgeVariant(product.alertLevel)} className="text-xs">
                          {product.alertLevel === 'critical' && 'Crítico'}
                          {product.alertLevel === 'warning' && 'Advertencia'}
                          {product.alertLevel === 'low' && 'Bajo'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {product.sku} • {product.category.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {product.stockQuantity} / {product.minStock}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      actual / mínimo
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}