'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/lib/logger';
const lazyRecharts = (name: string) =>
  dynamic(() => import('recharts').then((m: any) => (props: any) => {
    const C = m[name];
    return <C {...props} />;
  }), { ssr: false });
import { motion } from 'framer-motion';
const Area = lazyRecharts('Area');
const AreaChart = lazyRecharts('AreaChart');
const CartesianGrid = lazyRecharts('CartesianGrid');
const ResponsiveContainer = lazyRecharts('ResponsiveContainer');
const RechartsTooltip = lazyRecharts('Tooltip');
const XAxis = lazyRecharts('XAxis');
const YAxis = lazyRecharts('YAxis');
const BarChart = lazyRecharts('BarChart');
const Bar = lazyRecharts('Bar');
import {
  ArrowLeft,
  Edit,
  Trash2,
  Star,
  StarOff,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Truck,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  Activity,
  Layers
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { LazyImage } from '@/components/ui/optimized-components';
import { toast } from '@/lib/toast';
import { productService } from '@/services/productService';
import { useBusinessConfigData } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import { createClient } from '@/lib/supabase';

// --- Types ---

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  wholesalePrice?: number;
  offerPrice?: number;
  stock: number;
  minStock: number;
  category: string;
  brand?: string;
  sku: string;
  barcode?: string;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  supplier?: string;
  image_url?: string;
}

interface SalesData {
  date: string;
  amount: number;
  quantity: number;
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "primary" }: any) => (
  <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-full bg-${color}/10 text-${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <h2 className="text-2xl font-bold">{value}</h2>
        {trend && (
          <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            {trendValue}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// --- Main Page Component ---

const logger = createLogger('ProductViewPage');

export default function ProductViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const productId = (params?.id ?? '') as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<{ totalSold: number; totalRevenue: number } | null>(null);

  const businessConfig = useBusinessConfigData();
  const supabase = createClient();

  // --- Helpers ---

  const fmtCurrency = (val: number) => {
    try {
      return businessConfig?.config ? formatPrice(val, businessConfig.config) : `Gs ${new Intl.NumberFormat('es-PY').format(val || 0)}`;
    } catch {
      return `Gs ${new Intl.NumberFormat('es-PY').format(val || 0)}`;
    }
  };

  const calculateProfitMargin = (price: number, cost: number) => {
    if (!price || price <= 0) return 0;
    return ((price - cost) / price) * 100;
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { status: 'Sin stock', color: 'destructive', icon: XCircle };
    if (stock <= minStock) return { status: 'Stock bajo', color: 'warning', icon: AlertTriangle };
    return { status: 'En stock', color: 'success', icon: CheckCircle };
  };

  // --- Data Fetching ---

  const fetchProductData = useCallback(async () => {
    if (!productId) return;

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch Product Details (Critical)
      const { data: p, error: err } = await supabase
        .from('products')
        .select(`
          *,
          category:categories!products_category_id_fkey(name),
          supplier:suppliers!products_supplier_id_fkey(name)
        `)
        .eq('id', productId)
        .single();

      if (err) throw err;
      if (!p) throw new Error('Producto no encontrado');

      const mappedProduct: Product = {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.sale_price,
        cost: p.cost_price,
        wholesalePrice: p.wholesale_price,
        offerPrice: p.offer_price,
        stock: p.stock_quantity,
        minStock: p.min_stock,
        category: p.category?.name ?? 'Sin categoría',
        brand: p.brand,
        sku: p.sku,
        barcode: p.barcode,
        isFavorite: false, // Placeholder
        isActive: p.is_active,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        supplier: p.supplier?.name,
        image_url: p.image_url
      };
      setProduct(mappedProduct);

      // 2. Fetch Analytics & Movements (Non-critical, parallel)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [salesResponse, movementsResponse] = await Promise.all([
        supabase
          .from('sale_items')
          .select('quantity, unit_price, created_at')
          .eq('product_id', productId)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: true }),
        supabase
          .from('inventory_movements')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Process Sales Data
      if (salesResponse.data) {
        const rawSales = salesResponse.data;
        const totalSold = rawSales.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);
        const totalRevenue = rawSales.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
        setSalesSummary({ totalSold, totalRevenue });

        // Group by date for chart
        const salesByDate = new Map<string, { amount: number, quantity: number }>();
        rawSales.forEach((item: any) => {
          const date = new Date(item.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
          const current = salesByDate.get(date) || { amount: 0, quantity: 0 };
          salesByDate.set(date, {
            amount: current.amount + (Number(item.quantity) * Number(item.unit_price)),
            quantity: current.quantity + Number(item.quantity)
          });
        });

        setSalesData(Array.from(salesByDate.entries()).map(([date, data]) => ({
          date,
          amount: data.amount,
          quantity: data.quantity
        })));
      }

      // Process Movements
      if (movementsResponse.data) {
        setRecentMovements(movementsResponse.data);
      }

    } catch (err: any) {
      logger.error('Error fetching product data:', err);
      if (typeof err === 'object' && err !== null) {
        logger.error('Full Error Object:', JSON.stringify(err, null, 2));
        logger.error('Error Message:', err.message);
        logger.error('Error Code:', err.code);
        logger.error('Error Details:', err.details);
        logger.error('Error Hint:', err.hint);
      }
      setError(err.message || 'Error al cargar la información del producto');
    } finally {
      setIsLoading(false);
    }
  }, [productId, supabase]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  // --- Actions ---

  const handleToggleFavorite = async () => {
    if (!product) return;
    // Optimistic update
    const newStatus = !product.isFavorite;
    setProduct({ ...product, isFavorite: newStatus });
    toast.success(newStatus ? 'Agregado a favoritos' : 'Removido de favoritos');
    // TODO: Persist to DB
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) return;
    try {
      await productService.deleteProduct(productId);
      toast.success('Producto eliminado');
      router.push('/dashboard/products');
    } catch (error) {
      toast.error('No se pudo eliminar el producto (posiblemente tenga ventas asociadas)');
    }
  };

  // --- Render ---

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <XCircle className="h-16 w-16 text-destructive mb-4 opacity-20" />
        <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
        <p className="text-muted-foreground mb-6">{error || 'No pudimos encontrar el producto'}</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const stockInfo = getStockStatus(product.stock, product.minStock);
  const profitMargin = calculateProfitMargin(product.price, product.cost);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto p-6 space-y-8 max-w-7xl"
    >
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Productos', href: '/dashboard/products' },
            { label: product.name, href: '#', isCurrentPage: true }
          ]}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                {product.name}
                <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-sm font-normal px-3 py-1">
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground mt-1">
                <span className="flex items-center gap-1 text-sm"><Box className="h-3 w-3" /> SKU: {product.sku}</span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1 text-sm"><Layers className="h-3 w-3" /> {product.category}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleToggleFavorite} className="gap-2">
              {product.isFavorite ? <StarOff className="h-4 w-4 text-yellow-500" /> : <Star className="h-4 w-4" />}
              <span className="hidden sm:inline">{product.isFavorite ? 'Quitar Favorito' : 'Favorito'}</span>
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/products/edit/${productId}`)} className="gap-2">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button variant="destructive" onClick={handleDelete} size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Precio de Venta"
          value={fmtCurrency(product.price)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Margen de Ganancia"
          value={`${profitMargin.toFixed(1)}%`}
          icon={TrendingUp}
          color="blue"
          trend={profitMargin > 30 ? 'up' : 'down'}
          trendValue={profitMargin > 30 ? 'Saludable' : 'Bajo'}
        />
        <StatCard
          title="Stock Disponible"
          value={product.stock}
          icon={Package}
          color={stockInfo.color === 'destructive' ? 'red' : 'orange'}
          trend={product.stock <= product.minStock ? 'down' : 'up'}
          trendValue={stockInfo.status}
        />
        <StatCard
          title="Ventas (30d)"
          value={salesSummary?.totalSold || 0}
          icon={Activity}
          color="purple"
          trend="up"
          trendValue={fmtCurrency(salesSummary?.totalRevenue || 0)}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Visión General</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Análisis de Ventas</TabsTrigger>
          <TabsTrigger value="movements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Historial de Movimientos</TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-card/50">
              <CardHeader>
                <CardTitle>Detalles del Producto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted/30 border flex items-center justify-center relative group">
                  <LazyImage
                    src={product.image_url || 'https://via.placeholder.com/800x400?text=Sin+Imagen'}
                    alt={product.name}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm leading-relaxed">{product.description || 'Sin descripción disponible.'}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-dashed">
                      <span className="text-sm text-muted-foreground">Marca</span>
                      <span className="font-medium">{product.brand || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dashed">
                      <span className="text-sm text-muted-foreground">Código de Barras</span>
                      <span className="font-medium font-mono">{product.barcode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-dashed">
                      <span className="text-sm text-muted-foreground">Proveedor</span>
                      <div className="flex items-center gap-2">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{product.supplier || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm bg-card/50">
                <CardHeader>
                  <CardTitle>Información Financiera</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Costo Unitario</span>
                    <span className="font-bold text-muted-foreground">{fmtCurrency(product.cost)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <span className="text-sm font-medium text-primary">Precio Venta</span>
                    <span className="font-bold text-primary">{fmtCurrency(product.price)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Precio Mayorista</span>
                    <span className="font-bold">{product.wholesalePrice && product.wholesalePrice > 0 ? fmtCurrency(product.wholesalePrice) : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Precio Oferta</span>
                    <span className="font-bold">{product.offerPrice && product.offerPrice > 0 ? fmtCurrency(product.offerPrice) : '-'}</span>
                  </div>
                  <div className="pt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Margen</span>
                      <span className={profitMargin > 30 ? 'text-green-600' : 'text-orange-600'}>{profitMargin.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${profitMargin > 30 ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${Math.min(profitMargin, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-card/50">
                <CardHeader>
                  <CardTitle>Fechas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Creado el</p>
                      <p className="text-sm font-medium">{new Date(product.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      <History className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Última actualización</p>
                      <p className="text-sm font-medium">{new Date(product.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Rendimiento de Ventas (Últimos 30 días)</CardTitle>
              <CardDescription>Ingresos y volumen de ventas diario</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number | string) => `Gs ${val}`}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number | string) => [fmtCurrency(Number(value)), 'Ingresos']}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorAmount)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
                  <p>No hay datos de ventas suficientes en este periodo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Movements */}
        <TabsContent value="movements">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Últimos Movimientos</CardTitle>
              <CardDescription>Historial reciente de cambios en el inventario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {recentMovements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No se han registrado movimientos recientes</p>
                  </div>
                ) : (
                  recentMovements.map((move, index) => (
                    <div key={move.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b last:border-0">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${move.quantity > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                          {move.quantity > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {move.movement_type === 'SALE' ? 'Venta' :
                              move.movement_type === 'PURCHASE' ? 'Compra / Entrada' :
                                move.movement_type === 'ADJUSTMENT' ? 'Ajuste de Inventario' :
                                  move.movement_type === 'RETURN' ? 'Devolución' : 'Movimiento'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(move.created_at).toLocaleDateString()} • {new Date(move.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${move.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {move.quantity > 0 ? '+' : ''}{move.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">Stock final: {move.stock_after}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => router.push(`/dashboard/products?tab=inventory`)}>
                  Ver historial completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
