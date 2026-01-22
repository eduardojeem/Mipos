'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import api from '@/lib/api';
import { UnifiedStateHandler, useUnifiedState } from '@/components/ui/unified-error-loading';
import { Typography } from '@/components/ui/Typography';
import { Box, Stack, HStack, Container, Section } from '@/components/ui/Spacing';
import { ColorBadge, StatusIndicator } from '@/components/ui/ColorSystem';

interface Product {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  minStock: number;
  category: {
    id: string;
    name: string;
  };
  alertLevel: 'critical' | 'warning' | 'low';
  threshold: number;
  percentage: number;
}

interface StockAlertStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
  lowStockPercentage: number;
}

interface StockAlertsResponse {
  products: Product[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    low: number;
  };
}

export default function StockAlerts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<StockAlertStats | null>(null);
  
  // Usar el nuevo sistema unificado de estados
  const {
    state,
    error,
    executeWithState,
    isLoading
  } = useUnifiedState();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newMinStock, setNewMinStock] = useState<number>(0);
  const [showThresholdDialog, setShowThresholdDialog] = useState(false);

  const fetchStockAlerts = async () => {
    await executeWithState(async () => {
      const [alertsResponse, statsResponse] = await Promise.all([
        api.get<StockAlertsResponse>('/stock-alerts/low-stock'),
        api.get<StockAlertStats>('/stock-alerts/stats')
      ]);

      setProducts(alertsResponse.data.products);
      setStats(statsResponse.data);
    });
  };

  const updateMinStock = async () => {
    if (!selectedProduct) return;

    try {
      await api.patch(`/stock-alerts/${selectedProduct.id}/threshold`, {
        minStock: newMinStock
      });

      toast.success('Umbral de stock mínimo actualizado');
      setShowThresholdDialog(false);
      setSelectedProduct(null);
      fetchStockAlerts();
    } catch (error) {
      console.error('Error updating min stock:', error);
      toast.error('Error al actualizar el umbral de stock');
    }
  };

  const openThresholdDialog = (product: Product) => {
    setSelectedProduct(product);
    setNewMinStock(product.minStock);
    setShowThresholdDialog(true);
  };

  const getAlertBadgeVariant = (alertLevel: string): 'error' | 'warning' | 'info' | 'gray' => {
    switch (alertLevel) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'gray';
    }
  };

  const getAlertIcon = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical':
        return <AlertTriangle className="ds-h-4 ds-w-4 ds-text-error" />;
      case 'warning':
        return <TrendingDown className="ds-h-4 ds-w-4 ds-text-warning" />;
      case 'low':
        return <Package className="ds-h-4 ds-w-4 ds-text-info" />;
      default:
        return <Package className="ds-h-4 ds-w-4" />;
    }
  };

  useEffect(() => {
    fetchStockAlerts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Container className="ds-space-y-6">
      {/* Header Section */}
      <Section>
        <Stack spacing="md">
          <HStack className="ds-justify-between ds-items-center">
            <Stack spacing="xs">
              <Typography variant="h1">Alertas de Stock</Typography>
              <Typography variant="body2" color="muted">
                Monitorea productos con stock bajo y gestiona umbrales
              </Typography>
            </Stack>
            <HStack spacing="sm">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => executeWithState(fetchStockAlerts)}
                disabled={isLoading}
                className="ds-btn ds-btn-outline"
              >
                <RefreshCw className={`ds-h-4 ds-w-4 ds-mr-2 ${isLoading ? 'ds-animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="ds-btn ds-btn-primary">
                    <Settings className="ds-h-4 ds-w-4 ds-mr-2" />
                    Configurar
                  </Button>
                </DialogTrigger>
                <DialogContent className="ds-card" aria-labelledby="stock-alerts-config-title">
                  <DialogHeader>
                    <DialogTitle id="stock-alerts-config-title">Configuración de Alertas</DialogTitle>
                    <Typography variant="body2" color="muted">
                      Ajusta los umbrales de stock para las alertas
                    </Typography>
                  </DialogHeader>
                  {/* Configuration content */}
                </DialogContent>
              </Dialog>
            </HStack>
          </HStack>
        </Stack>
      </Section>

      {/* Stats Cards */}
      <Section>
        <UnifiedStateHandler 
          state={state} 
          error={error ?? undefined}
          loading={{
            variant: 'skeleton',
            size: 'md'
          }}
        >
          {stats && (
            <div className="ds-grid ds-grid-cols-1 md:ds-grid-cols-2 lg:ds-grid-cols-4 ds-gap-4">
              <Card className="ds-card">
                <CardContent className="ds-p-6">
                  <HStack className="ds-items-center ds-space-x-2">
                    <StatusIndicator status="error" size="md" />
                    <Stack spacing="xs">
                      <Typography variant="h3">{stats.outOfStockCount}</Typography>
                      <Typography variant="caption" color="muted">Sin Stock</Typography>
                    </Stack>
                  </HStack>
                </CardContent>
              </Card>

              <Card className="ds-card">
                <CardContent className="ds-p-6">
                  <HStack className="ds-items-center ds-space-x-2">
                    <StatusIndicator status="warning" size="md" />
                    <Stack spacing="xs">
                      <Typography variant="h3">{stats.lowStockCount}</Typography>
                      <Typography variant="caption" color="muted">Stock Bajo</Typography>
                    </Stack>
                  </HStack>
                </CardContent>
              </Card>

              <Card className="ds-card">
                <CardContent className="ds-p-6">
                  <HStack className="ds-items-center ds-space-x-2">
                    <StatusIndicator status="success" size="md" />
                    <Stack spacing="xs">
                      <Typography variant="h3">{stats.healthyStockCount}</Typography>
                      <Typography variant="caption" color="muted">Stock Normal</Typography>
                    </Stack>
                  </HStack>
                </CardContent>
              </Card>

              <Card className="ds-card">
                <CardContent className="ds-p-6">
                  <HStack className="ds-items-center ds-space-x-2">
                    <Package className="ds-h-8 ds-w-8 ds-text-primary" />
                    <Stack spacing="xs">
                      <Typography variant="h3">{stats.totalProducts}</Typography>
                      <Typography variant="caption" color="muted">Total Productos</Typography>
                    </Stack>
                  </HStack>
                </CardContent>
              </Card>
            </div>
          )}
        </UnifiedStateHandler>
      </Section>

      {/* Products List */}
      <Section>
        <Card className="ds-card">
          <CardHeader>
            <Typography variant="h4">Productos con Alertas</Typography>
            <Typography variant="body2" color="muted">
              Lista de productos que requieren atención
            </Typography>
          </CardHeader>
          <CardContent>
            <Stack spacing="md">
              {products.length > 0 ? (
                products.map((product) => (
                  <Box
                    key={product.id}
                    className="ds-flex ds-items-center ds-justify-between ds-p-4 ds-border ds-rounded-lg ds-hover-bg-muted"
                  >
                    <HStack spacing="md" className="ds-items-center">
                      {getAlertIcon(product.alertLevel)}
                      <Stack spacing="xs">
                        <HStack spacing="sm" className="ds-items-center">
                          <Typography variant="body1" className="font-medium">
                            {product.name}
                          </Typography>
                          <ColorBadge 
                            variant={getAlertBadgeVariant(product.alertLevel)}
                          >
                            {product.alertLevel === 'critical' && 'Crítico'}
                            {product.alertLevel === 'warning' && 'Advertencia'}
                            {product.alertLevel === 'low' && 'Bajo'}
                          </ColorBadge>
                        </HStack>
                        <Typography variant="caption" color="muted">
                          SKU: {product.sku} • Categoría: {product.category.name}
                        </Typography>
                        <Typography variant="caption">
                          Stock actual: <Typography variant="caption" className="ds-inline font-medium">{product.stockQuantity}</Typography> • 
                          Mínimo: <Typography variant="caption" className="ds-inline font-medium">{product.minStock}</Typography>
                        </Typography>
                      </Stack>
                    </HStack>
                    <HStack spacing="sm">
                      <Stack spacing="xs" className="ds-text-right">
                        <Typography variant="body2" className="font-bold">
                          {Math.round(product.percentage)}%
                        </Typography>
                        <Typography variant="caption" color="muted">
                          del mínimo
                        </Typography>
                      </Stack>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openThresholdDialog(product)}
                        className="ds-btn ds-btn-outline"
                      >
                        <Settings className="ds-h-4 ds-w-4 ds-mr-2" />
                        Ajustar
                      </Button>
                    </HStack>
                  </Box>
                ))
              ) : (
                <Box className="ds-text-center ds-py-8">
                  <Package className="ds-h-12 ds-w-12 ds-text-muted ds-mx-auto ds-mb-4" />
                  <Typography variant="h4" color="muted">
                    No hay alertas de stock
                  </Typography>
                  <Typography variant="body2" color="muted">
                    Todos los productos tienen stock suficiente
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Section>

      {/* Threshold Dialog */}
      <Dialog open={showThresholdDialog} onOpenChange={setShowThresholdDialog}>
        <DialogContent className="ds-card" aria-labelledby="threshold-title">
          <DialogHeader>
            <DialogTitle id="threshold-title">Ajustar Stock Mínimo</DialogTitle>
            <Typography variant="body2" color="muted">
              {selectedProduct?.name}
            </Typography>
          </DialogHeader>
          <Stack spacing="md" className="ds-py-4">
            <Stack spacing="xs">
              <Label htmlFor="minStock">
                <Typography variant="body2" className="font-medium">Stock Mínimo</Typography>
              </Label>
              <Input
                id="minStock"
                type="number"
                value={newMinStock}
                onChange={(e) => setNewMinStock(parseInt(e.target.value) || 0)}
                className="ds-input"
              />
            </Stack>
            <Typography variant="caption" color="muted">
              Stock actual: {selectedProduct?.stockQuantity} unidades
            </Typography>
          </Stack>
          <DialogFooter>
            <HStack spacing="sm">
              <Button 
                variant="outline" 
                onClick={() => setShowThresholdDialog(false)}
                className="ds-btn ds-btn-outline"
              >
                Cancelar
              </Button>
              <Button 
                onClick={updateMinStock}
                className="ds-btn ds-btn-primary"
              >
                Actualizar
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}