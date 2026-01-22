'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  AlertTriangle,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Printer,
  Eye,
  RefreshCw,
  Search,
  ArrowUpDown,
  Target,
  Activity,
  ShoppingCart,
  Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { useProductsStore } from '@/store/products-store';
import type { Product as StoreProduct, Category as StoreCategory } from '@/types';
import { useSalesReport, useReportExport } from '@/hooks/use-reports';

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  categoryId?: string;
  brand?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

interface InventoryReport {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryBreakdown: {
    category: string;
    count: number;
    value: number;
    percentage: number;
  }[];
  stockAlerts: Product[];
}

interface SalesReport {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  aovGrowth: number;
  topProducts: {
    product: Product;
    quantitySold: number;
    revenue: number;
    profitMargin: number;
  }[];
  categoryPerformance: {
    category: string;
    revenue: number;
    quantity: number;
    growth: number;
  }[];
}

interface PerformanceMetrics {
  fastMoving: Product[];
  slowMoving: Product[];
  profitability: {
    product: Product;
    margin: number;
    revenue: number;
  }[];
  turnoverRate: {
    product: Product;
    rate: number;
    daysToSell: number;
  }[];
}

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy: 'name' | 'stock' | 'value' | 'sales';
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
}

export default function ProductReportsPage() {
  const fmtCurrency = useCurrencyFormatter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    categoryId: 'all',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    searchQuery: ''
  });

  const storeProducts = useProductsStore(s => s.products) as StoreProduct[];
  const storeCategories = useProductsStore(s => s.categories) as StoreCategory[];

  const salesCache = useSalesReport({ startDate: filters.dateFrom, endDate: filters.dateTo }, { enabled: true, initialFetch: true, refreshOnFocus: false });
  const prevRange = useMemo(() => {
    try {
      const from = new Date(filters.dateFrom);
      const to = new Date(filters.dateTo);
      const ms = to.getTime() - from.getTime();
      const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
      const prevFrom = new Date(prevTo.getTime() - ms);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      return { startDate: fmt(prevFrom), endDate: fmt(prevTo) };
    } catch {
      const today = new Date().toISOString().split('T')[0];
      return { startDate: today, endDate: today };
    }
  }, [filters.dateFrom, filters.dateTo]);
  const salesPrevCache = useSalesReport(prevRange, { enabled: true, initialFetch: true, refreshOnFocus: false });
  const { exportReport, isExporting } = useReportExport();

  const products: Product[] = useMemo(() => {
    const mapped = (storeProducts || []).map((p): Product => ({
      id: String((p as any).id),
      name: String((p as any).name ?? ''),
      sku: String((p as any).sku ?? ''),
      price: Number((p as any).sale_price ?? 0),
      cost: Number((p as any).cost_price ?? 0),
      stock: Number((p as any).stock_quantity ?? 0),
      minStock: Number((p as any).min_stock ?? 0),
      category: String((p as any).category?.name ?? ''),
      categoryId: String((p as any).category?.id ?? (p as any).category_id ?? ''),
      brand: (p as any).brand,
      isActive: Boolean((p as any).is_active ?? true),
      createdAt: String((p as any).created_at ?? new Date().toISOString()),
      updatedAt: String((p as any).updated_at ?? new Date().toISOString()),
    }));

    if (mapped.length > 0) return mapped;
    return [
      {
        id: '1',
        name: 'Laptop HP Pavilion',
        sku: 'HP-PAV-001',
        price: 899.99,
        cost: 650.00,
        stock: 15,
        minStock: 5,
        category: 'Electrónicos',
        categoryId: '1',
        brand: 'HP',
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z'
      },
      {
        id: '2',
        name: 'Mouse Inalámbrico Logitech',
        sku: 'LOG-MX-002',
        price: 45.99,
        cost: 25.00,
        stock: 3,
        minStock: 10,
        category: 'Accesorios',
        categoryId: '2',
        brand: 'Logitech',
        isActive: true,
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T16:45:00Z'
      },
      {
        id: '3',
        name: 'Teclado Mecánico RGB',
        sku: 'KEY-RGB-003',
        price: 129.99,
        cost: 80.00,
        stock: 0,
        minStock: 5,
        category: 'Accesorios',
        categoryId: '2',
        brand: 'Corsair',
        isActive: true,
        createdAt: '2024-01-05T11:30:00Z',
        updatedAt: '2024-01-22T13:15:00Z'
      },
      {
        id: '4',
        name: 'Monitor 24" Full HD',
        sku: 'MON-24-004',
        price: 199.99,
        cost: 140.00,
        stock: 25,
        minStock: 8,
        category: 'Electrónicos',
        categoryId: '1',
        brand: 'Samsung',
        isActive: true,
        createdAt: '2024-01-12T14:00:00Z',
        updatedAt: '2024-01-25T10:20:00Z'
      }
    ];
  }, [storeProducts]);

  const categories: Category[] = useMemo(() => {
    const mapped = (storeCategories || []).map(c => ({ id: String((c as any).id), name: String((c as any).name ?? ''), productCount: 0 }));
    if (mapped.length > 0) return mapped;
    return [
      { id: '1', name: 'Electrónicos', productCount: products.filter(p => p.categoryId === '1').length },
      { id: '2', name: 'Accesorios', productCount: products.filter(p => p.categoryId === '2').length }
    ];
  }, [storeCategories, products]);

  useEffect(() => {
    if (storeProducts && storeProducts.length > 0) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [storeProducts]);

  // Calculated reports
  const inventoryReport = useMemo((): InventoryReport => {
    const filteredProducts = products.filter(product => {
      if (filters.categoryId !== 'all' && product.categoryId !== filters.categoryId) {
        return false;
      }
      if (filters.stockStatus !== 'all') {
        if (filters.stockStatus === 'out_of_stock' && product.stock > 0) return false;
        if (filters.stockStatus === 'low_stock' && (product.stock > product.minStock || product.stock === 0)) return false;
        if (filters.stockStatus === 'in_stock' && product.stock <= product.minStock) return false;
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const match = (product.name?.toLowerCase().includes(q) || product.sku?.toLowerCase().includes(q) || (product.brand ? product.brand.toLowerCase().includes(q) : false));
        if (!match) return false;
      }
      return true;
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
      const dir = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'name':
          return (a.name.localeCompare(b.name)) * dir;
        case 'stock':
          return (a.stock - b.stock) * dir;
        case 'value': {
          const va = a.stock * a.cost;
          const vb = b.stock * b.cost;
          return (va - vb) * dir;
        }
        default:
          return 0;
      }
    });

    const totalValue = sortedProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0);
    const lowStockCount = sortedProducts.filter(p => p.stock <= p.minStock && p.stock > 0).length;
    const outOfStockCount = sortedProducts.filter(p => p.stock === 0).length;

    const categoryBreakdown = categories.map(category => {
      const categoryProducts = sortedProducts.filter(p => p.categoryId === category.id);
      const categoryValue = categoryProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0);
      return {
        category: category.name,
        count: categoryProducts.length,
        value: categoryValue,
        percentage: totalValue > 0 ? (categoryValue / totalValue) * 100 : 0
      };
    });

    const stockAlerts = sortedProducts.filter(p => p.stock <= p.minStock);

    return {
      totalProducts: filteredProducts.length,
      totalValue,
      lowStockCount,
      outOfStockCount,
      categoryBreakdown,
      stockAlerts
    };
  }, [products, categories, filters]);

  const salesReport = useMemo((): SalesReport => {
    const summary = salesCache.data?.summary;
    const top = salesCache.data?.topProducts || [];
    const byCategory = salesCache.data?.salesByCategory || [];
    const prevSummary = salesPrevCache.data?.summary;

    const totalRevenue = Number(summary?.totalSales || 0);
    const totalOrders = Number(summary?.totalOrders || 0);
    const averageOrderValue = Number(summary?.averageOrderValue || 0);
    const prevRevenue = Number(prevSummary?.totalSales || 0);
    const prevOrders = Number(prevSummary?.totalOrders || 0);
    const prevAov = Number(prevSummary?.averageOrderValue || 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : (totalRevenue > 0 ? 100 : 0);
    const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : (totalOrders > 0 ? 100 : 0);
    const aovGrowth = prevAov > 0 ? ((averageOrderValue - prevAov) / prevAov) * 100 : (averageOrderValue > 0 ? 100 : 0);

    const topProducts = top.map(tp => {
      const prod = products.find(p => p.id === tp.id) || {
        id: tp.id,
        name: tp.name,
        sku: '',
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 0,
        category: '',
        categoryId: '',
        brand: '',
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } as Product;
      const profitMargin = prod.price > 0 ? ((prod.price - prod.cost) / prod.price) * 100 : 0;
      return {
        product: prod,
        quantitySold: Number(tp.quantity || 0),
        revenue: Number(tp.sales || 0),
        profitMargin
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const prevByCategory = salesPrevCache.data?.salesByCategory || [];
    const prevMap = new Map<string, number>();
    prevByCategory.forEach(pc => { prevMap.set(String(pc.category || ''), Number(pc.sales || 0)); });
    const categoryPerformance = byCategory.map(c => {
      const cur = Number(c.sales || 0);
      const prev = Number(prevMap.get(String(c.category)) || 0);
      const growth = prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
      return {
        category: c.category,
        revenue: cur,
        quantity: Number(c.quantity || 0),
        growth
      };
    });

    return {
      totalRevenue,
      totalSales: totalOrders,
      averageOrderValue,
      revenueGrowth,
      ordersGrowth,
      aovGrowth,
      topProducts,
      categoryPerformance
    };
  }, [salesCache.data, products, categories]);

  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const topByQuantity = (salesReport.topProducts || []).slice().sort((a, b) => b.quantitySold - a.quantitySold);
    const fastMoving = topByQuantity.slice(0, 5).map(t => t.product);
    const slowMoving = [...topByQuantity].reverse().slice(0, 5).map(t => t.product);

    const revenueById = new Map<string, number>();
    (salesReport.topProducts || []).forEach(t => { revenueById.set(t.product.id, t.revenue); });

    const profitability = (salesReport.topProducts || []).map(t => ({
      product: t.product,
      margin: t.product.price > 0 ? ((t.product.price - t.product.cost) / t.product.price) * 100 : 0,
      revenue: Number(revenueById.get(t.product.id) || 0)
    })).sort((a, b) => b.margin - a.margin).slice(0, 5);

    const turnoverRate = (salesReport.topProducts || []).map(t => ({
      product: t.product,
      rate: Number(t.quantitySold || 0),
      daysToSell: 0
    })).sort((a, b) => b.rate - a.rate).slice(0, 5);

    return {
      fastMoving,
      slowMoving,
      profitability,
      turnoverRate
    };
  }, [salesReport]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      if (format === 'csv') {
        const isSales = activeTab === 'sales';
        const headers = isSales
          ? ['Producto','SKU','Categoría','Cantidad','Ingresos','MargenPct']
          : ['Nombre','SKU','Categoría','CategoríaID','Stock','Mínimo','Precio','Costo','ValorInventario','MargenPct'];
        const rows = isSales
          ? salesReport.topProducts.map(t => {
              const margenPct = t.product.price > 0 ? (((t.product.price - t.product.cost) / t.product.price) * 100).toFixed(2) : '0';
              return [
                t.product.name,
                t.product.sku,
                t.product.category || '—',
                String(t.quantitySold),
                String(t.revenue),
                String(margenPct)
              ];
            })
          : products.map(p => {
              const valor = p.stock * p.cost;
              const margenPct = p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(2) : '0';
              return [
                p.name,
                p.sku,
                p.category || '—',
                p.categoryId || '',
                String(p.stock),
                String(p.minStock),
                String(p.price),
                String(p.cost),
                String(valor),
                String(margenPct)
              ];
            });
        const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_productos_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('CSV generado exitosamente');
        return;
      }
      if (format === 'excel' || format === 'pdf') {
        const type = activeTab === 'sales' ? 'sales' : 'inventory';
        await exportReport(type as any, format as any, { startDate: filters.dateFrom, endDate: filters.dateTo });
        toast.success(`Reporte ${format.toUpperCase()} descargado`);
        return;
      }
      toast.warning(`Formato de exportación no soportado: ${String(format).toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };

  const exportSalesCategoryCSV = async () => {
    const headers = ['Categoría','Ingresos','Cantidad','CrecimientoPct'];
    const rows = (salesReport.categoryPerformance || []).map(c => [
      c.category,
      String(c.revenue),
      String(c.quantity),
      String(c.growth.toFixed(2))
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_por_categoria_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV de ventas por categoría generado');
  };

  const getStockStatusColor = (product: Product) => {
    if (product.stock === 0) return 'destructive';
    if (product.stock <= product.minStock) return 'warning';
    return 'success';
  };

  const getStockStatusText = (product: Product) => {
    if (product.stock === 0) return 'Sin stock';
    if (product.stock <= product.minStock) return 'Stock bajo';
    return 'En stock';
  };

  if (isLoading || salesCache.loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes de Productos</h1>
          <p className="text-muted-foreground">
            Análisis completo de inventario, ventas y rendimiento de productos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Fecha desde</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Fecha hasta</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={filters.categoryId} onValueChange={(value) => handleFilterChange('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockStatus">Estado del stock</Label>
              <Select value={filters.stockStatus} onValueChange={(value) => handleFilterChange('stockStatus', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="in_stock">En stock</SelectItem>
                  <SelectItem value="low_stock">Stock bajo</SelectItem>
                  <SelectItem value="out_of_stock">Sin stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortBy">Ordenar por</Label>
              <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar productos..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Rendimiento
          </TabsTrigger>
        </TabsList>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Productos</p>
                    <p className="text-2xl font-bold">{inventoryReport.totalProducts}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">{fmtCurrency(inventoryReport.totalValue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stock Bajo</p>
                    <p className="text-2xl font-bold text-orange-600">{inventoryReport.lowStockCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sin Stock</p>
                    <p className="text-2xl font-bold text-red-600">{inventoryReport.outOfStockCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribución por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inventoryReport.categoryBreakdown.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.category}</span>
                      <span className="text-sm text-muted-foreground">
                        {category.count} productos - {fmtCurrency(category.value)}
                      </span>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {category.percentage.toFixed(1)}% del valor total
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas de Stock
                </CardTitle>
                <CardDescription>
                  Productos que requieren atención inmediata
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inventoryReport.stockAlerts.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStockStatusColor(product) as any}>
                          {getStockStatusText(product)}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {product.stock} / {product.minStock} min
                        </p>
                      </div>
                    </div>
                  ))}
                  {inventoryReport.stockAlerts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay alertas de stock activas</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-6">
          {/* Sales Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      Ingresos Totales
                      <Badge variant={salesReport.revenueGrowth >= 0 ? 'default' : 'destructive'}>
                        {salesReport.revenueGrowth >= 0 ? '+' : ''}{salesReport.revenueGrowth.toFixed(1)}%
                      </Badge>
                    </p>
                    <p className="text-2xl font-bold">{fmtCurrency(salesReport.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      Unidades Vendidas
                      <Badge variant={salesReport.ordersGrowth >= 0 ? 'default' : 'destructive'}>
                        {salesReport.ordersGrowth >= 0 ? '+' : ''}{salesReport.ordersGrowth.toFixed(1)}%
                      </Badge>
                    </p>
                    <p className="text-2xl font-bold">{salesReport.totalSales}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      Valor Promedio
                      <Badge variant={salesReport.aovGrowth >= 0 ? 'default' : 'destructive'}>
                        {salesReport.aovGrowth >= 0 ? '+' : ''}{salesReport.aovGrowth.toFixed(1)}%
                      </Badge>
                    </p>
                    <p className="text-2xl font-bold">{fmtCurrency(salesReport.averageOrderValue)}</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Productos Más Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesReport.topProducts.map((item, index) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{fmtCurrency(item.revenue)}</p>
                        <p className="text-sm text-muted-foreground">{item.quantitySold} unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Rendimiento por Categoría
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportSalesCategoryCSV}>Exportar CSV</Button>
                  <Button variant="outline" size="sm" onClick={async () => { await exportReport('sales' as any, 'excel' as any, { startDate: filters.dateFrom, endDate: filters.dateTo }); toast.success('XLSX de ventas descargado'); }}>Exportar XLSX</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesReport.categoryPerformance.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{fmtCurrency(category.revenue)}</span>
                          <Badge variant={category.growth >= 0 ? 'default' : 'destructive'}>
                            {category.growth >= 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(category.growth).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {category.quantity} unidades vendidas
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Report */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Moving Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Productos de Rotación Rápida
                </CardTitle>
                <CardDescription>
                  Productos con alta demanda y buen stock
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceMetrics.fastMoving.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">Rápida</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Stock: {product.stock}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slow Moving Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  Productos de Rotación Lenta
                </CardTitle>
                <CardDescription>
                  Productos que requieren estrategias de venta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceMetrics.slowMoving.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">Lenta</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Stock: {product.stock}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profitability Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Análisis de Rentabilidad
                </CardTitle>
                <CardDescription>
                  Productos con mayor margen de ganancia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceMetrics.profitability.map((item, index) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{item.margin.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">{fmtCurrency(item.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Turnover Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Tasa de Rotación
                </CardTitle>
                <CardDescription>
                  Velocidad de venta de productos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceMetrics.turnoverRate.map((item, index) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-blue-600">{item.rate.toFixed(1)}x/año</p>
                        <p className="text-sm text-muted-foreground">{item.daysToSell} días</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Opciones de Exportación
          </CardTitle>
          <CardDescription>
            Descarga los reportes en diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
